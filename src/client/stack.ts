import { reduceMotion } from './env.ts';

/**
 * The opening: every painting gathered into one pile in the middle of the
 * screen, dispersing into the grid as you scroll — and gathering back into it
 * when you scroll up again.
 *
 * The grid is the real layout; the pile is a transform on each tile. Nothing is
 * laid out twice, and the effect is a pure function of the scroll position, so
 * it runs in both directions with no state to get out of step.
 *
 * Three rules keep it from breaking:
 *
 * 1. **Measure untransformed.** `getBoundingClientRect()` returns the
 *    *transformed* box, so measuring mid-animation would read a tile's pile
 *    position and compute nonsense from it. Every measure clears the transforms
 *    first. This was what made changing the year mid-animation go haywire.
 * 2. **Always start at the top.** Browsers restore the scroll position on
 *    reload; landing mid-animation with a half-built grid is what left the
 *    paintings invisible. The page takes scroll restoration into its own hands.
 * 3. **Never leave a tile hidden.** Any failure path — zero-height tiles, a
 *    measure that never happened, the watchdog — disables the pile for good and
 *    ends with the transforms cleared and the grid interactive.
 */
/*
 * THE OPENING — the two numbers that decide how the pile unfolds.
 *
 * The pile is a pure function of the scroll position: nothing is animated on a
 * clock, the paintings are simply where the scroll says they are. So there is
 * no duration to lengthen, and these two are the only speed there is.
 *
 *   SCROLL_SPAN  how much scrolling, in screen heights, it takes for the pile
 *                to disperse completely. Larger means the same wheel travel
 *                produces less unfolding, which reads as slower. It was 0.85.
 *   EASE_IN      how gently it leaves the heap. 1 is a straight line; higher
 *                holds the paintings together for the first part of the scroll
 *                and lets them go faster later. The old curve was an ease-OUT —
 *                most of the motion in the first few pixels — which is exactly
 *                what felt like a jolt.
 *
 * SCROLL_SPAN is exported because the year rail has to know where the pile
 * lets go: scrolling to a year above that point would gather the paintings
 * back up under the reader.
 */
export const SCROLL_SPAN = 1.3;
const EASE_IN = 2;
/*
 *   FOLLOW       how closely the pile keeps up with the scroll. The paintings
 *                ease towards where the scroll says they should be rather than
 *                snapping there, by this fraction of the remaining distance
 *                each frame. 1 is glued to the wheel — the old behaviour, where
 *                a fast flick unfolded everything in an instant. Smaller lags
 *                more: 0.14 settles in about half a second after the wheel
 *                stops, and a flick still unfolds fluidly instead of at once.
 *                This is the only way to make the opening feel slower without
 *                taking the wheel away from the reader.
 *
 *                The fraction is per frame *at 120fps* — the pace it was
 *                approved at, in a Chromium browser on a 120Hz display — and
 *                applied by elapsed time rather than per frame drawn. It used
 *                to be per frame, so the opening ran at the screen's pace:
 *                Safari draws pages at 60 whatever the display, so there it
 *                caught up half as fast and lingered in the half-dispersed
 *                state, where the grid shows as a shrunken copy of itself.
 */
const FOLLOW = 0.14;
/** The frame length FOLLOW was tuned at. */
const FOLLOW_FRAME_MS = 1000 / 120;
const FRONT = 0.38;         // height of the front painting, as a fraction of the viewport
const VISIBLE = 12;         // tiles given their own offset in the pile; the rest sit behind
const WATCHDOG = 4000;      // ms: if the pile cannot be measured by now, show the grid

/** Small, fixed offsets for the front of the pile — the fanned look in the mockup. */
const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.035, -0.06], [-0.045, -0.02], [0.02, 0.055], [-0.03, 0.06],
  [0.055, 0.015], [-0.055, -0.05], [0.01, -0.075], [-0.015, 0.075], [0.045, -0.035],
  [-0.04, 0.03], [0.03, 0.04],
];

interface Target { tx: number; ty: number; s: number; ox: number; oy: number }

export function initStack(): void {
  const grid = document.querySelector<HTMLElement>('[data-stack]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const root = document.documentElement;

  // Pages without a pile (exhibitions, commissioned) must not wait for one.
  if (!grid || !hero) { reveal(); return; }

  const tiles = [...grid.querySelectorAll<HTMLElement>('.tile')];
  if (!tiles.length || reduceMotion.matches) { hero.remove(); reveal(); return; }

  /*
   * Coming back from a painting is not arriving at the gallery.
   *
   * The pile is an opening, and an opening should happen once. On the way back
   * it would throw the reader to the top of a page they were half way down and
   * make them watch it again to get their place back, which is the opposite of
   * what the back button is for. So on a back or forward step the grid is
   * simply there, settled, and the browser puts the scroll where it was.
   */
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (entry?.type === 'back_forward') { hero.remove(); reveal(); return; }

  root.classList.add('stack-running');

  /*
   * The pile only makes sense from the top of the page, so the browser is told
   * not to restore a scroll on this arrival. It is handed back once the tiles
   * have settled — `scrollRestoration` belongs to this history entry, and
   * left on manual it would still be manual when the reader returns to it,
   * which is exactly the position we want the browser to restore.
   */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  let targets: Target[] = [];
  let live: HTMLElement[] = [];
  let frame = 0;
  let measured = false;
  /** Set once the pile has been given up on; it never runs again. */
  let disabled = false;
  /** Whether the grid was fully settled on the previous frame. */
  let settled = false;
  /** How far the pile is drawn unfolded, 0 to 1 — behind the scroll by FOLLOW. */
  let shown = 0;
  /** When the last frame was drawn, so the follow can be applied by time. */
  let drawnAt = 0;

  const clearTransforms = () => {
    for (const tile of tiles) {
      tile.style.transform = '';
      tile.style.zIndex = '';
    }
  };

  const measure = () => {
    if (disabled) return;
    // Clear first: a transformed element reports its transformed box, and the
    // whole pile is computed from where the tiles *would* sit without it.
    clearTransforms();

    live = tiles.filter((tile) => !tile.hidden);
    const h = window.innerHeight;
    const scroll = window.scrollY;

    targets = live.map((tile, i) => {
      const r = tile.getBoundingClientRect();
      const pileHeight = h * (i === 0 ? FRONT : FRONT - 0.02 - Math.min(i, VISIBLE) * 0.006);
      const off = i < VISIBLE ? OFFSETS[i]! : [0, 0];
      return {
        tx: r.left + r.width / 2,
        ty: r.top + scroll + r.height / 2,
        s: r.height ? pileHeight / r.height : 1,
        ox: off[0]! * window.innerWidth,
        oy: off[1]! * h,
      };
    });
    measured = live.length > 0 && live.every((tile) => tile.getBoundingClientRect().height > 0);
  };

  /*
   * In-and-out: gentle leaving the heap, gentle arriving in the grid. The
   * power is EASE_IN on the way in and mirrored on the way out, so 2 is the
   * familiar smooth step and 1 is no easing at all.
   */
  const ease = (p: number) => (p < 0.5
    ? Math.pow(2 * p, EASE_IN) / 2
    : 1 - Math.pow(2 * (1 - p), EASE_IN) / 2);

  const render = (time: number) => {
    frame = 0;
    if (disabled) return;
    // The first frame after the pile has been at rest counts as one frame's
    // worth — the clock is reset whenever it comes to rest, so a pause in the
    // scrolling is never mistaken for time to catch up. Otherwise the real
    // interval, capped so one long stall cannot throw it all the way.
    const elapsed = drawnAt ? Math.min(time - drawnAt, 100) : FOLLOW_FRAME_MS;
    drawnAt = time;

    // Without a trustworthy measurement there is nothing sensible to draw, so
    // try once more and otherwise sit this frame out — the grid is already in
    // its real positions. Only the watchdog gives up for good; abandoning the
    // pile on a single early frame would lose it to nothing worse than a slow
    // first layout.
    if (!measured) { measure(); if (!measured) return; }

    const h = window.innerHeight;
    const wanted = Math.min(1, Math.max(0, window.scrollY / (h * SCROLL_SPAN)));
    // Drawn behind the scroll, not at it: close the gap by FOLLOW each frame,
    // snap the last sliver so it does not creep for ever, and keep drawing
    // frames until the pile has caught up — the scroll may have stopped.
    shown += (wanted - shown) * (1 - Math.pow(1 - FOLLOW, elapsed / FOLLOW_FRAME_MS));
    if (Math.abs(wanted - shown) < 0.0015) shown = wanted;
    if (shown !== wanted) schedule();
    else drawnAt = 0;
    const p = shown;

    if (p >= 1) {
      // Settled. Clear the transforms, but stay listening — scrolling back up
      // gathers the pile again.
      if (!settled) {
        settled = true;
        grid.classList.remove('is-stacked');
        clearTransforms();
        reveal();
      }
      return;
    }

    // Coming back out of the settled state. The grid may have changed shape
    // while it was settled — a different density, whose size transition has
    // since finished — so the targets are re-taken before a single frame is
    // drawn from them. Skipping this is what sent the paintings flying after a
    // density change.
    if (settled) {
      settled = false;
      measure();
      hide();
      /*
       * Safari, and only Safari, leaves the settled grid painted behind the
       * pile as it gathers again. Settled, the paintings are drawn into the
       * page itself; gathering, each becomes a layer of its own — and WebKit
       * does not erase what it drew of them in the page, so every painting
       * showed twice, once moving and once frozen where it had settled. The
       * first unfold never shows it because the paintings start out as
       * layers. Hiding and showing the grid in the same frame is never drawn
       * — nothing flickers — but it makes WebKit repaint the grid's area,
       * which is the erasing it skipped. Found and checked in Safari 26.3
       * over repeated unfolds, mid-motion.
       */
      grid.style.visibility = 'hidden';
      void grid.offsetHeight;
      grid.style.visibility = '';
    }

    grid.classList.add('is-stacked');
    const e = ease(p);
    const cx = window.innerWidth / 2;
    const cy = window.scrollY + h * 0.54;

    live.forEach((tile, i) => {
      const t = targets[i]!;
      const dx = (cx + t.ox - t.tx) * (1 - e);
      const dy = (cy + t.oy - t.ty) * (1 - e);
      const s = t.s + (1 - t.s) * e;
      tile.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
      tile.style.zIndex = String(live.length - i);
    });
  };

  /** The pile cannot be drawn: stop trying, and leave the grid usable. */
  function giveUp() {
    if (disabled) return;
    disabled = true;
    settled = true;
    clearTransforms();
    grid!.classList.remove('is-stacked');
    window.clearTimeout(watchdog);
    reveal();
  }

  const schedule = () => { if (!frame && !disabled) frame = requestAnimationFrame(render); };
  const relayout = () => { if (disabled) return; measure(); schedule(); };
  /**
   * Density changes animate the tiles' size, so the layout is not final for
   * half a second. Measure now for a first approximation and again once the
   * transition has run out.
   */
  const relayoutAfterResize = () => {
    relayout();
    window.setTimeout(relayout, 560);
  };

  const watchdog = window.setTimeout(() => { if (!measured) giveUp(); }, WATCHDOG);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', relayout, { passive: true });
  // The grid can change shape under the pile (density). Re-measure, never reuse
  // stale targets.
  grid.addEventListener('gridchange', relayoutAfterResize);
  window.addEventListener('load', relayout);
  void document.fonts.ready.then(relayout);

  relayout();
}

/**
 * Show the controls that wait for the pile — the year rail and the density
 * steps. Called on every path, including the ones where no pile ever runs, so
 * nothing can be left hidden behind an animation that did not happen.
 *
 * `stackdone` fires only the first time: it is what listeners wire themselves
 * up on, and they should not be wired twice.
 */
let wired = false;
function reveal(): void {
  // Two classes, and the positive one is what the stylesheet reads. The rail is
  // drawn hidden, so it needs something to say the wait is over; removing a
  // class could never do that for the first paint, when no class is set yet.
  document.documentElement.classList.remove('stack-running');
  document.documentElement.classList.add('stack-settled');
  // The opening is over, so the browser may have the scroll back: it is what
  // returns the reader to their place when they come back from a painting.
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  if (wired) return;
  wired = true;
  document.dispatchEvent(new CustomEvent('stackdone'));
}

/**
 * The pile is forming again. The controls go away with it, and anything keyed
 * to the settled grid — a chosen year, say — is dropped.
 */
function hide(): void {
  document.documentElement.classList.add('stack-running');
  document.documentElement.classList.remove('stack-settled');
  document.dispatchEvent(new CustomEvent('stackrestart'));
}
