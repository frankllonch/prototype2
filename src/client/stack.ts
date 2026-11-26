import { phone, reduceMotion, targetElement } from './env.ts';
import { glide } from './glide.ts';
import { LAYOUTS, WATER, easeOf, pile, scrollSpan, seeded, type Start } from './pile.ts';

/**
 * The opening: every painting gathered into one pile in the middle of the
 * screen, dispersing into the grid as you scroll — and gathering back into it
 * when you scroll up again.
 */
/* The opening's settings live in client/pile.ts (`motion`, `effects.pile`). */
export const SCROLL_SPAN = scrollSpan();
/** The frame length `motion.follow` was tuned at. */
const FOLLOW_FRAME_MS = 1000 / 120;
const WATCHDOG = 4000;      // ms: if the pile cannot be measured by now, show the grid

/* WebKit — Safari, and every browser on iOS. */
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
  // Nor on a phone: the gallery there is two plain columns, there from the start (05-artwork.css).
  if (!tiles.length || reduceMotion.matches || phone.matches) { hero.remove(); reveal(); return; }

  /* Coming back from a painting is not arriving at the gallery. */
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (entry?.type === 'back_forward') { hero.remove(); reveal(); return; }

  root.classList.add('stack-running');
  // Safari's sharp pile: the paintings' own layers (01-grid.css, .is-webkit).
  if (webkit) grid.classList.add('is-webkit');

  /*
   * Every painting is on the window at once in the opening, so every picture is
   * fetched now rather than as it nears the screen.
   */
  for (const img of grid.querySelectorAll('img')) img.loading = 'eager';

  /*
   * The pile only makes sense from the top of the page, so the browser is told
   * not to restore a scroll on this arrival.
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
      tile.style.transition = '';
    }
    ordered = false;
  };

  /*
   * Each painting is drawn on a layer of its own while it moves, so the move is
   * the compositor's work and nothing is repainted.
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
    // Clear first: a transformed element reports its transformed box, and the whole pile is
    // computed from where the tiles *would* sit without it.
    clearTransforms();

    live = tiles.filter((tile) => !tile.hidden);
    const h = window.innerHeight;
    const scroll = window.scrollY;

    // The pile rises into the page on arrival (THE CONTENT RISING, 00-base.css), which moves the
    // grid itself: measured mid-rise, every tile would be taken that far too low.
    const lift = new DOMMatrixReadOnly(getComputedStyle(grid).transform).m42;

    const vw = window.innerWidth;
    const layout = LAYOUTS[pile.effect] ?? LAYOUTS.pile!;
    const v = pile.effects[pile.effect] ?? {};
    const m = pile.motion;
    const box = grid.getBoundingClientRect();
    const gridBox = { left: box.left, top: box.top - lift + scroll, width: box.width };
    const seed = Number(m.seed) * 7919;
    const rects = live.map((tile) => tile.getBoundingClientRect());

    /* A layout with a `since` only places paintings of that year and later. */
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
     * The stagger: each painting waits its share of the unfold before it moves,
     * in the order chosen.
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

  /* The water: the paintings drift from the pointer (settings: WATER in client/pile.ts). */
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

  /* A painting clicked while they float opens the gallery, as the arrow does. */
  document.addEventListener('click', (event) => {
    if (settled || disabled || !measured || event.defaultPrevented || event.button !== 0) return;
    if (targetElement(event)?.closest('a, button, input, [role="dialog"]')) return;
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
  // A painting that has come in is done with the count.
  grid.addEventListener('animationend', (event) => {
    if (event.animationName === 'count-in') delete (event.target as HTMLElement).dataset.count;
  });

  /*
   * The curve is `motion.curve` in client/pile.ts: in-and-out with a power of 2
   * (gentle leaving the heap, gentle arriving in the grid) is the site's.
   */
  const render = (time: number) => {
    frame = 0;
    if (disabled) return;
    // The first frame after the pile has been at rest counts as one frame's worth — the clock is
    // reset whenever it comes to rest, so a pause in the scrolling is never mistaken for time to
    // catch up.
    const elapsed = drawnAt ? Math.min(time - drawnAt, 100) : FOLLOW_FRAME_MS;
    const FOLLOW = Math.min(1, Math.max(0.005, Number(pile.motion.follow)));
    drawnAt = time;

    // Without a trustworthy measurement there is nothing sensible to draw, so try once more and
    // otherwise sit this frame out — the grid is already in its real positions.
    if (retake && !settled) { retake = false; measure(); }
    if (!measured) { measure(); if (!measured) return; }

    const h = window.innerHeight;
    const wanted = pile.freeze ?? Math.min(1, Math.max(0, window.scrollY / (h * scrollSpan())));
    // Drawn behind the scroll, not at it: close the gap by FOLLOW each frame, snap the last sliver
    // so it does not creep for ever, and keep drawing frames until the pile has caught up.
    shown += (wanted - shown) * (1 - Math.pow(1 - FOLLOW, elapsed / FOLLOW_FRAME_MS));
    if (Math.abs(wanted - shown) < 0.0015) shown = wanted;
    if (shown !== wanted) schedule();
    else drawnAt = 0;
    const p = shown;

    if (p >= 1) {
      // Settled.
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

    // Coming back out of the settled state.
    if (settled) {
      settled = false;
      // Only when something changed: measuring forces a layout of the whole grid in the very frame
      // the pile starts to move.
      if (stale) measure();
      hide();
      /*
       * Safari, and only Safari, leaves the settled grid painted behind the pile
       * as it gathers again.
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
          // From the cursor to the nearest point of the painting: nothing when it is over it, so
          // touching is felt the most.
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
      if (t.op === 0) {
        // One the pile does not show stays wholly unseen until it is in its place: part-faded on
        // the way it stood as a ghost behind the others.
        tile.style.transition = e < 1 ? 'none' : '';
        tile.style.opacity = e < 1 ? '0' : '';
      } else if (t.op !== 1) tile.style.opacity = (t.op + (1 - t.op) * Math.min(1, Math.max(0, e))).toFixed(3);
      else if (tile.style.opacity) tile.style.opacity = '';
      // The order is written once per gathering, not every frame: rewriting 181 z-indexes per
      // frame was a style recalculation for nothing.
      if (!ordered) tile.style.zIndex = String(live.length - i);
    });
    ordered = true;
    // Water never quite stops: the paintings are drawn every frame until the grid has them.
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
    // Settled, the targets are only marked out of date and re-taken when the pile next gathers —
    // measuring would wipe nothing, but would cost a layout.
    if (settled) { stale = true; return; }
    measure();
    schedule();
  };
  /** Density changes animate the tiles' size, so the layout is not final for half a second. */
  const relayoutAfterResize = () => {
    relayout();
    window.setTimeout(relayout, 560);
  };

  const watchdog = window.setTimeout(() => { if (!measured) giveUp(); }, WATCHDOG);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', relayout, { passive: true });
  // The grid can change shape under the pile (density).
  grid.addEventListener('gridchange', relayoutAfterResize);
  window.addEventListener('load', relayout);
  // The pile tuner (client/pile-tuner.ts) changed a setting: take the starting places again and
  // draw.
  document.addEventListener('piletune', () => {
    if (disabled) return;
    stale = true;
    retake = true;
    schedule();
  });
  void document.fonts.ready.then(relayout);

  // A tablet turned upright, or a window drawn in below 900px: the gallery becomes the phone's two
  // columns, which have no pile.
  phone.addEventListener('change', () => {
    if (!phone.matches || disabled) return;
    giveUp();
    hero.remove();
  });

  relayout();
}

/** Show the controls that wait for the pile — the year rail and the density steps. */
let wired = false;
function reveal(): void {
  // Two classes, and the positive one is what the stylesheet reads.
  document.documentElement.classList.remove('stack-running');
  document.documentElement.classList.add('stack-settled');
  // The opening is over, so the browser may have the scroll back: it is what returns the reader to
  // their place when they come back from a painting.
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  if (wired) return;
  wired = true;
  document.dispatchEvent(new CustomEvent('stackdone'));
}

/** The pile is forming again. */
function hide(): void {
  document.documentElement.classList.add('stack-running');
  document.documentElement.classList.remove('stack-settled');
  document.dispatchEvent(new CustomEvent('stackrestart'));
}
