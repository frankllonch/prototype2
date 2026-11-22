import { phone, reduceMotion } from './env.ts';
import { glide } from './glide.ts';
import { LAYOUTS, WATER, easeOf, pile, scrollSpan, seeded, type Start } from './pile.ts';

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
/*
 * Both now live in client/pile.ts with the rest of the opening's shape —
 * `motion.span` and `motion.power` — where the pile tuner (?pile) can reach
 * them. SCROLL_SPAN is kept as the site's value for anything that reads it once.
 */
export const SCROLL_SPAN = scrollSpan();
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
// FOLLOW is `motion.follow` in client/pile.ts.
/** The frame length FOLLOW was tuned at. */
const FOLLOW_FRAME_MS = 1000 / 120;
const WATCHDOG = 4000;      // ms: if the pile cannot be measured by now, show the grid

// The pile's size, fan and offsets are `effects.pile` in client/pile.ts.

/*
 * WebKit — Safari, and every browser on iOS. The repaint below is a WebKit
 * fix only: in Chrome it forced every painting to be decoded and drawn again
 * the moment the pile began to gather, which was most of the stutter on the
 * way back up.
 */
const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent)
  || /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

interface Target { tx: number; ty: number; w: number; h: number; s: number; ox: number; oy: number; rot: number; op: number; delay: number }
/** Where the water has carried a painting from its starting place, and how fast it is going. */
interface Drift { x: number; y: number; vx: number; vy: number; phase: number }

export function initStack(): void {
  const grid = document.querySelector<HTMLElement>('[data-stack]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const root = document.documentElement;

  // Pages without a pile (exhibitions, commissioned) must not wait for one.
  if (!grid || !hero) { reveal(); return; }

  const tiles = [...grid.querySelectorAll<HTMLElement>('.tile')];
  // Nor on a phone: the gallery there is two plain columns, there from the
  // start (05-artwork.css). The hero goes as it does for reduced motion — the
  // year rail reads its absence as "no pile to stay clear of".
  if (!tiles.length || reduceMotion.matches || phone.matches) { hero.remove(); reveal(); return; }

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
  // Safari's sharp pile: the paintings' own layers (01-grid.css, .is-webkit).
  if (webkit) grid.classList.add('is-webkit');

  /*
   * Every painting is on the window at once in the opening, so every picture
   * is fetched now rather than as it nears the screen. Left lazy, the ones
   * thrown past the window's edge were never fetched at all, and the rest of
   * the grid arrived a row at a time behind the scroll. Only here, where the
   * opening runs: a phone keeps loading them as they come.
   */
  for (const img of grid.querySelectorAll('img')) img.loading = 'eager';

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
  /** Whether the tiles carry their pile order; it never changes mid-motion. */
  let ordered = false;
  /** The pending release of the tiles' layers once the grid has come to rest. */
  let unlayer = 0;
  /** Whether the grid may have changed shape since the targets were taken. */
  let stale = true;
  /** The pile tuner changed a setting: take the starting places again on the next frame. */
  let retake = false;

  const clearTransforms = () => {
    for (const tile of tiles) {
      tile.style.transform = '';
      tile.style.zIndex = '';
      tile.style.opacity = '';
    }
    ordered = false;
  };

  /*
   * Each painting is drawn on a layer of its own while it moves, so the move
   * is the compositor's work and nothing is repainted. Taking all 181 layers
   * away again means repainting the whole grid in one frame — which, done the
   * moment the pile let go, was the hitch at the end of the unfold. So the
   * layers stay until the grid has been still for a moment and the browser is
   * idle, where the repaint is never seen.
   */
  const layer = () => {
    window.clearTimeout(unlayer);
    unlayer = 0;
    grid.classList.add('is-layered');
  };
  const releaseLayers = () => {
    window.clearTimeout(unlayer);
    unlayer = window.setTimeout(() => {
      const go = () => { if (settled) grid.classList.remove('is-layered'); };
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 });
      else go();
    }, 700);
  };

  const measure = () => {
    if (disabled) return;
    // Clear first: a transformed element reports its transformed box, and the
    // whole pile is computed from where the tiles *would* sit without it.
    clearTransforms();

    live = tiles.filter((tile) => !tile.hidden);
    const h = window.innerHeight;
    const scroll = window.scrollY;

    // The pile rises into the page on arrival (THE CONTENT RISING,
    // 00-base.css), which moves the grid itself: measured mid-rise, every
    // tile would be taken that far too low. Taken back out here.
    const lift = new DOMMatrixReadOnly(getComputedStyle(grid).transform).m42;

    const vw = window.innerWidth;
    const layout = LAYOUTS[pile.effect] ?? LAYOUTS.pile!;
    const v = pile.effects[pile.effect] ?? {};
    const m = pile.motion;
    const box = grid.getBoundingClientRect();
    const gridBox = { left: box.left, top: box.top - lift + scroll, width: box.width };
    const seed = Number(m.seed) * 7919;
    const rects = live.map((tile) => tile.getBoundingClientRect());

    /*
     * A layout with a `since` only places paintings of that year and later.
     * They take the front places in the pile, in page order, and the older
     * ones the places behind them, past the layout's `count` — which is cut
     * down to however many there are, so "all of them" is counted here, on
     * the page, and a painting added tomorrow is in the opening tomorrow.
     */
    const since = Number(v.since) || 0;
    const recent = live.map((tile) => !since || Number(tile.dataset.year) >= since);
    const placed = recent.filter(Boolean).length;
    let front = 0;
    let back = placed;
    const slots = recent.map((is) => (is ? front++ : back++));
    const shape = since ? { ...v, count: Math.min(Number(v.count) || placed, placed) } : v;

    const starts: Start[] = rects.map((r, i) => layout({
      i: slots[i]!, n: live.length, vw, vh: h,
      tx: r.left + r.width / 2, ty: r.top - lift + scroll + r.height / 2, th: r.height,
      grid: gridBox, rand: seeded(seed + i * 101),
    }, shape));

    /*
     * The stagger: each painting waits its share of the unfold before it
     * moves, in the order chosen. `rank` runs from 0 (first away) to 1.
     */
    const order = String(m.order);
    const order_ = seeded(seed + 17);
    const n = Math.max(1, live.length - 1);
    const far = Math.max(1, ...starts.map((s) => Math.hypot(s.x, s.y)));
    const tops = rects.map((r) => r.top);
    const lo = Math.min(...tops);
    const hi = Math.max(lo + 1, ...tops);
    const rank = (i: number): number => {
      switch (order) {
        case 'random': return order_();
        case 'centre first': return Math.hypot(starts[i]!.x, starts[i]!.y) / far;
        case 'edges first': return 1 - Math.hypot(starts[i]!.x, starts[i]!.y) / far;
        case 'top rows first': return (tops[i]! - lo) / (hi - lo);
        case 'bottom rows first': return 1 - (tops[i]! - lo) / (hi - lo);
        case 'back of pile first': return 1 - i / n;
        default: return i / n;
      }
    };
    const fade = Number(m.fade);

    targets = rects.map((r, i) => {
      const st = starts[i]!;
      return {
        tx: r.left + r.width / 2,
        ty: r.top - lift + scroll + r.height / 2,
        w: r.width,
        h: r.height,
        s: r.height ? st.h / r.height : 1,
        ox: st.x,
        oy: st.y,
        rot: st.rot,
        op: st.op * fade,
        delay: Number(m.stagger) * rank(i),
      };
    });
    measured = live.length > 0 && live.every((tile) => tile.getBoundingClientRect().height > 0);
    stale = !measured;
    if (measured && since && !counted) {
      count(live.filter((_, i) => slots[i]! < Number(shape.count) && starts[i]!.op > 0));
    }
  };

  /*
   * THE COUNT — on arrival the scatter is not simply there: it fills, from no
   * paintings to all of them, one after another.
   *
   * Once per arrival, and on a clock rather than the scroll. The timing is
   * the stylesheet's (THE COUNT, 00-base.css): this only gives each painting
   * its place in the queue, `--count-at` from 0 (first) to 1 (last), and lets
   * it in once its picture has arrived, so nothing is counted in as an empty
   * box. A picture that arrives after its turn comes in at once: `--count-late`
   * is how long the count had already been running.
   */
  /*
   * THE WATER (the knobs and what they mean: WATER, client/pile.ts). The
   * cursor, in window px, and how fast it is moving; and each painting's drift.
   */
  const finger = { x: 0, y: 0, vx: 0, vy: 0, at: 0, on: false };
  const drifts = new Map<HTMLElement, Drift>();
  let floatedAt = 0;
  const driftOf = (tile: HTMLElement): Drift => {
    let d = drifts.get(tile);
    if (!d) { d = { x: 0, y: 0, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 }; drifts.set(tile, d); }
    return d;
  };
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || settled || disabled) return;
    const dt = (event.timeStamp - finger.at) / 1000;
    if (finger.on && dt > 0 && dt < 0.2) {
      // Smoothed: single events are jumpy, and a jolt would fling a painting.
      finger.vx += ((event.clientX - finger.x) / dt - finger.vx) * 0.4;
      finger.vy += ((event.clientY - finger.y) / dt - finger.vy) * 0.4;
    }
    finger.x = event.clientX;
    finger.y = event.clientY;
    finger.at = event.timeStamp;
    finger.on = true;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { finger.on = false; });

  /*
   * A painting clicked while they float opens the gallery, as the arrow does
   * (Frank, 2026-11-21). The grid takes no pointer while the opening runs
   * (01-grid.css), so the click lands on the page and is matched here to
   * the paintings as they are drawn.
   */
  document.addEventListener('click', (event) => {
    if (settled || disabled || !measured || event.defaultPrevented || event.button !== 0) return;
    if ((event.target as Element | null)?.closest('a, button, input, [role="dialog"]')) return;
    const hit = live.some((tile) => {
      if (Number(getComputedStyle(tile).opacity) < 0.5) return false;
      const r = tile.getBoundingClientRect();
      return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    });
    if (hit) glide(window.innerHeight * scrollSpan());
  });

  let counted = false;
  const count = (members: HTMLElement[]) => {
    counted = true;
    const began = performance.now();
    members.forEach((tile, k) => {
      tile.style.setProperty('--count-at', (k / Math.max(1, members.length - 1)).toFixed(4));
      tile.dataset.count = 'wait';
      const enter = () => {
        if (tile.dataset.count !== 'wait') return;
        tile.style.setProperty('--count-late', `${((performance.now() - began) / 1000).toFixed(2)}s`);
        tile.dataset.count = 'in';
      };
      const img = tile.querySelector('img');
      if (!img || img.complete) enter();
      else {
        img.addEventListener('load', enter, { once: true });
        img.addEventListener('error', enter, { once: true });
      }
    });
  };
  /** Nothing is left waiting for the count: rule 3, never leave a tile hidden. */
  const endCount = () => {
    for (const tile of tiles) if (tile.dataset.count === 'wait') delete tile.dataset.count;
  };
  // A painting that has come in is done with the count. Left marked, it would
  // be counted in again every time a year filter hid it and showed it.
  grid.addEventListener('animationend', (event) => {
    if (event.animationName === 'count-in') delete (event.target as HTMLElement).dataset.count;
  });

  /*
   * The curve is `motion.curve` in client/pile.ts: in-and-out with a power of
   * 2 (gentle leaving the heap, gentle arriving in the grid) is the site's.
   */
  const render = (time: number) => {
    frame = 0;
    if (disabled) return;
    // The first frame after the pile has been at rest counts as one frame's
    // worth — the clock is reset whenever it comes to rest, so a pause in the
    // scrolling is never mistaken for time to catch up. Otherwise the real
    // interval, capped so one long stall cannot throw it all the way.
    const elapsed = drawnAt ? Math.min(time - drawnAt, 100) : FOLLOW_FRAME_MS;
    const FOLLOW = Math.min(1, Math.max(0.005, Number(pile.motion.follow)));
    drawnAt = time;

    // Without a trustworthy measurement there is nothing sensible to draw, so
    // try once more and otherwise sit this frame out — the grid is already in
    // its real positions. Only the watchdog gives up for good; abandoning the
    // pile on a single early frame would lose it to nothing worse than a slow
    // first layout.
    if (retake && !settled) { retake = false; measure(); }
    if (!measured) { measure(); if (!measured) return; }

    const h = window.innerHeight;
    const wanted = pile.freeze ?? Math.min(1, Math.max(0, window.scrollY / (h * scrollSpan())));
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
        endCount();
        reveal();
      }
      // Still scrolling in the settled grid pushes the release on.
      releaseLayers();
      return;
    }

    // Coming back out of the settled state. The grid may have changed shape
    // while it was settled — a different density, whose size transition has
    // since finished — so the targets are re-taken before a single frame is
    // drawn from them. Skipping this is what sent the paintings flying after a
    // density change.
    if (settled) {
      settled = false;
      // Only when something changed: measuring forces a layout of the whole
      // grid in the very frame the pile starts to move.
      if (stale) measure();
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
      if (webkit) {
        grid.style.visibility = 'hidden';
        void grid.offsetHeight;
        grid.style.visibility = '';
      }
    }

    grid.classList.add('is-stacked');
    layer();
    const ease = easeOf(pile.motion);
    const cx = window.innerWidth * Number(pile.motion.cx);
    const cy = window.scrollY + h * Number(pile.motion.cy);
    const stagger = Math.min(0.95, Math.max(0, Number(pile.motion.stagger)));

    // The water's step: real time, capped so a stalled frame throws nothing.
    const water = WATER.on;
    const dt = floatedAt ? Math.min(time - floatedAt, 50) / 1000 : 0;
    floatedAt = time;
    const reach = WATER.reach * h;
    const tether = Math.max(1, WATER.limit * h);
    const vw = window.innerWidth;
    const slow = Math.exp(-WATER.thick * dt);
    // A cursor that has stopped is still water: its speed dies away.
    const fade = Math.exp(-6 * dt);
    finger.vx *= fade;
    finger.vy *= fade;
    const force = WATER.push * (WATER.still + (1 - WATER.still) * Math.min(1, Math.hypot(finger.vx, finger.vy) / WATER.fast));
    const sway = (time / 1000) * (2 * Math.PI / WATER.sway);

    live.forEach((tile, i) => {
      const t = targets[i]!;
      // Each painting's own share of the unfold, after its wait.
      const q = stagger ? Math.min(1, Math.max(0, (p - t.delay) / (1 - stagger))) : p;
      const e = ease(q);
      const s = t.s + (1 - t.s) * e;
      let dx = (cx + t.ox - t.tx) * (1 - e);
      let dy = (cy + t.oy - t.ty) * (1 - e);
      // Only the paintings that are shown float, and less the nearer the grid.
      if (water && t.op > 0 && e < 1) {
        const d = driftOf(tile);
        const calm = 1 - e;
        if (finger.on && dt) {
          // From the cursor to the nearest point of the painting: nothing when
          // it is over it, so touching is felt the most.
          const X = t.tx + dx + d.x * calm;
          const Y = t.ty + dy + d.y * calm - window.scrollY;
          const hw = (t.w * s) / 2;
          const hh = (t.h * s) / 2;
          const gap = Math.hypot(
            finger.x - Math.min(X + hw, Math.max(X - hw, finger.x)),
            finger.y - Math.min(Y + hh, Math.max(Y - hh, finger.y)),
          );
          const feel = Math.exp(-((gap / reach) ** 2)) * calm;
          const away = Math.hypot(X - finger.x, Y - finger.y) || 1;
          d.vx += ((finger.vx - d.vx) * WATER.drag + ((X - finger.x) / away) * force) * feel * dt;
          d.vy += ((finger.vy - d.vy) * WATER.drag + ((Y - finger.y) / away) * force) * feel * dt;
        }
        // The window's edge: past it, pressed back in, harder the further out.
        // The painting's own starting place counts as inside, wherever it is.
        const hx = t.tx + dx;
        const hy = t.ty + dy - window.scrollY;
        const outX = Math.max(0, hx + d.x - Math.max(vw, hx)) + Math.min(0, hx + d.x - Math.min(0, hx));
        const outY = Math.max(0, hy + d.y - Math.max(h, hy)) + Math.min(0, hy + d.y - Math.min(0, hy));
        d.vx = (d.vx - (d.x * WATER.home + outX * WATER.wall) * dt) * slow;
        d.vy = (d.vy - (d.y * WATER.home + outY * WATER.wall) * dt) * slow;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        // The mooring's length. At its end the painting stops going outward.
        const far = Math.hypot(d.x, d.y);
        if (far > tether) {
          d.x *= tether / far;
          d.y *= tether / far;
          const out = (d.vx * d.x + d.vy * d.y) / tether;
          if (out > 0) { d.vx -= (d.x / tether) * out; d.vy -= (d.y / tether) * out; }
        }
        dx += (d.x + WATER.bob * Math.sin(sway + d.phase)) * calm;
        dy += (d.y + WATER.bob * Math.cos(sway * 0.83 + d.phase * 1.7)) * calm;
      }
      const r = t.rot * (1 - e);
      tile.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)${r ? ` rotate(${r.toFixed(2)}deg)` : ''} scale(${s.toFixed(4)})`;
      if (t.op !== 1) tile.style.opacity = (t.op + (1 - t.op) * Math.min(1, Math.max(0, e))).toFixed(3);
      else if (tile.style.opacity) tile.style.opacity = '';
      // The order is written once per gathering, not every frame: rewriting
      // 181 z-indexes per frame was a style recalculation for nothing.
      if (!ordered) tile.style.zIndex = String(live.length - i);
    });
    ordered = true;
    // Water never quite stops: the paintings are drawn every frame until the
    // grid has them.
    if (water) schedule();
  };

  /** The pile cannot be drawn: stop trying, and leave the grid usable. */
  function giveUp() {
    if (disabled) return;
    disabled = true;
    settled = true;
    clearTransforms();
    endCount();
    grid!.classList.remove('is-stacked', 'is-layered');
    window.clearTimeout(watchdog);
    reveal();
  }

  const schedule = () => { if (!frame && !disabled) frame = requestAnimationFrame(render); };
  const relayout = () => {
    if (disabled) return;
    // Settled, the targets are only marked out of date and re-taken when the
    // pile next gathers — measuring would wipe nothing, but would cost a layout.
    if (settled) { stale = true; return; }
    measure();
    schedule();
  };
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
  // The pile tuner (client/pile-tuner.ts) changed a setting: take the
  // starting places again and draw.
  // Many arrive while a slider is dragged; they are gathered into the next
  // frame and measured once there, never once per event.
  document.addEventListener('piletune', () => {
    if (disabled) return;
    stale = true;
    retake = true;
    schedule();
  });
  void document.fonts.ready.then(relayout);

  // A tablet turned upright, or a window drawn in below 900px: the gallery
  // becomes the phone's two columns, which have no pile. It is given up for
  // good, hero and all, as if the page had been opened that narrow.
  phone.addEventListener('change', () => {
    if (!phone.matches || disabled) return;
    giveUp();
    hero.remove();
  });

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
