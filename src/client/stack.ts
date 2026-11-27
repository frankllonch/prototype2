import { phone, reduceMotion, targetElement } from './env.ts';
import { glide } from './glide.ts';
import { MOTION, SCATTER, WATER, scrollSpan, seeded } from './pile.ts';

/**
 * The opening: every painting gathered into one pile in the middle of the
 * screen, dispersing into the grid as you scroll — and gathering back into it
 * when you scroll up again.
 */
/* The opening's settings live in client/pile.ts. */
export const SCROLL_SPAN = scrollSpan();
/** Where a glide into the gallery lands: a little past the opening's end, as a whole pixel short of it leaves the grid unsettled. */
export const gridAt = (): number => Math.ceil(window.innerHeight * SCROLL_SPAN) + 8;
const WATCHDOG = 4000;      // ms: if the pile cannot be measured by now, show the grid

/* WebKit — Safari, and every browser on iOS. */
const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent)
  || /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

/** A painting's place in the grid (tx, ty, w, h), and its start: scale, offset from the centre, whether it is shown, its wait. */
interface Target { tx: number; ty: number; w: number; h: number; s: number; ox: number; oy: number; shown: boolean; delay: number }
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

  /*
   * What is moved is the picture inside each tile: writing to the tile itself has the browser
   * restyle its child as well, twice the work per painting per frame.
   */
  const pictureOf = new Map(tiles.map((tile) => [tile, tile.querySelector<HTMLElement>('picture') ?? tile]));
  let targets: Target[] = [];
  let live: HTMLElement[] = [];
  let pictures: HTMLElement[] = [];
  let frame = 0;
  let measured = false;
  /** Set once the pile has been given up on; it never runs again. */
  let disabled = false;
  /** Whether the grid was fully settled on the previous frame. */
  let settled = false;
  /** Whether the tiles carry their pile order; it never changes mid-motion. */
  let ordered = false;
  /** The pending release of the tiles' layers once the grid has come to rest. */
  let unlayer = 0;
  /** Whether the grid may have changed shape since the targets were taken. */
  let stale = true;
  /** What each live tile last had written, so a frame only touches the ones that changed. */
  let drawn: string[] = [];
  let away: boolean[] = [];

  const clearTransforms = () => {
    for (const tile of tiles) {
      pictureOf.get(tile)!.style.transform = '';
      tile.style.zIndex = '';
      tile.classList.remove('is-away');
    }
    drawn = [];
    away = [];
    ordered = false;
  };

  /* Each picture is on a layer of its own while it moves, so the move is the compositor's work. */
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
    clearTransforms();

    live = tiles.filter((tile) => !tile.hidden);
    pictures = live.map((tile) => pictureOf.get(tile)!);
    const h = window.innerHeight;
    const scroll = window.scrollY;

    // The pile rises into the page on arrival (THE CONTENT RISING, 00-base.css), which moves the
    // grid itself: measured mid-rise, every tile would be taken that far too low.
    const lift = new DOMMatrixReadOnly(getComputedStyle(grid).transform).m42;

    const vw = window.innerWidth;
    const seed = MOTION.seed * 7919;
    const wait = seeded(seed + 17);
    const size = h * SCATTER.size;

    targets = live.map((tile, i) => {
      const r = tile.getBoundingClientRect();
      // Paintings from before `since` are not thrown: they wait unseen at the centre.
      const shown = Number(tile.dataset.year) >= SCATTER.since;
      const rand = seeded(seed + i * 101);
      return {
        tx: r.left + r.width / 2,
        ty: r.top - lift + scroll + r.height / 2,
        w: r.width,
        h: r.height,
        s: r.height ? size / r.height : 1,
        ox: shown ? (rand() * 2 - 1) * vw * SCATTER.spreadX / 2 : 0,
        oy: shown ? (rand() * 2 - 1) * h * SCATTER.spreadY / 2 : 0,
        shown,
        // The stagger: each waits its share of the unfold before it moves, in a random order.
        delay: MOTION.stagger * wait(),
      };
    });
    measured = targets.length > 0 && targets.every((t) => t.h > 0);
    stale = !measured;
    if (measured && !counted) count(live.filter((_, i) => targets[i]!.shown));
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
    const hit = live.some((tile, i) => {
      if (away[i] || Number(getComputedStyle(tile).opacity) < 0.5) return false;
      const r = pictures[i]!.getBoundingClientRect();
      return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    });
    if (hit) glide(gridAt());
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

  const render = (time: number) => {
    frame = 0;
    if (disabled) return;

    // Without a trustworthy measurement there is nothing sensible to draw, so try once more and
    // otherwise sit this frame out — the grid is already in its real positions.
    if (!measured) { measure(); if (!measured) return; }

    // Read once, before anything is written: a read after a write is a style pass of its own.
    const h = window.innerHeight;
    const vw = window.innerWidth;
    const scroll = window.scrollY;
    const p = Math.min(1, Math.max(0, scroll / (h * SCROLL_SPAN)));

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
    const cx = vw * MOTION.cx;
    const cy = scroll + h * MOTION.cy;
    const travel = 1 - MOTION.stagger;

    // The water's step: real time, capped so a stalled frame throws nothing.
    const water = WATER.on;
    const dt = floatedAt ? Math.min(time - floatedAt, 50) / 1000 : 0;
    floatedAt = time;
    const reach = WATER.reach * h;
    const tether = Math.max(1, WATER.limit * h);
    const slow = Math.exp(-WATER.thick * dt);
    // A cursor that has stopped is still water: its speed dies away.
    const fade = Math.exp(-6 * dt);
    finger.vx *= fade;
    finger.vy *= fade;
    const force = WATER.push * (WATER.still + (1 - WATER.still) * Math.min(1, Math.hypot(finger.vx, finger.vy) / WATER.fast));
    const sway = (time / 1000) * (2 * Math.PI / WATER.sway);

    for (let i = 0; i < live.length; i++) {
      const tile = live[i]!;
      const t = targets[i]!;
      // Each painting's own share of the unfold, after its wait.
      const e = Math.min(1, Math.max(0, (p - t.delay) / travel));
      // The order is written once per gathering.
      if (!ordered) tile.style.zIndex = String(live.length - i);
      if (!t.shown) {
        // One the pile does not show is not drawn or moved at all until it is in its place.
        const gone = e < 1;
        if (gone !== (away[i] ?? false)) {
          away[i] = gone;
          tile.classList.toggle('is-away', gone);
        }
        continue;
      }
      const s = t.s + (1 - t.s) * e;
      let dx = (cx + t.ox - t.tx) * (1 - e);
      let dy = (cy + t.oy - t.ty) * (1 - e);
      // Only the paintings that are shown float, and less the nearer the grid.
      if (water && e < 1) {
        const d = driftOf(tile);
        const calm = 1 - e;
        if (finger.on && dt) {
          // From the cursor to the nearest point of the painting: nothing when it is over it, so
          // touching is felt the most.
          const X = t.tx + dx + d.x * calm;
          const Y = t.ty + dy + d.y * calm - scroll;
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
        const hy = t.ty + dy - scroll;
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
      // In its place it carries no transform; a value that has not changed is not written again.
      const css = e >= 1 ? '' : `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      if (css !== (drawn[i] ?? '')) {
        drawn[i] = css;
        pictures[i]!.style.transform = css;
      }
    }
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
  // Every time the grid comes to rest, for what reads the element under a still pointer.
  document.dispatchEvent(new CustomEvent('stacksettle'));
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
