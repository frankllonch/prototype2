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
/**
 * Fraction of a viewport height over which the pile disperses. Exported because
 * the year rail has to know where the pile lets go: scrolling to a year above
 * that point would gather the paintings back up under the reader.
 */
export const SCROLL_SPAN = 0.85;
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

  // Pages without a pile (exhibitions, collaborations) must not wait for one.
  if (!grid || !hero) { reveal(); return; }

  const tiles = [...grid.querySelectorAll<HTMLElement>('.tile')];
  if (!tiles.length || reduceMotion.matches) { hero.remove(); reveal(); return; }

  root.classList.add('stack-running');

  // The pile only makes sense from the top of the page.
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

  const ease = (p: number) => 1 - Math.pow(1 - p, 3);

  const render = () => {
    frame = 0;
    if (disabled) return;

    // Without a trustworthy measurement there is nothing sensible to draw, so
    // try once more and otherwise sit this frame out — the grid is already in
    // its real positions. Only the watchdog gives up for good; abandoning the
    // pile on a single early frame would lose it to nothing worse than a slow
    // first layout.
    if (!measured) { measure(); if (!measured) return; }

    const h = window.innerHeight;
    const p = Math.min(1, Math.max(0, window.scrollY / (h * SCROLL_SPAN)));

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
  document.documentElement.classList.remove('stack-running');
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
  document.dispatchEvent(new CustomEvent('stackrestart'));
}
