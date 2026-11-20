/**
 * THE OPENING'S SHAPE — where each painting starts before the scroll lays it
 * into the grid, and how it travels there.
 *
 * client/stack.ts runs the opening; this file only says what it looks like.
 * Everything here is a setting, and every setting can be tried live on the
 * gallery with the pile tuner (`?pile`, client/pile-tuner.ts), whose "Copy
 * settings" is what gets pasted back to make a choice permanent in SITE below.
 *
 * Each layout places one painting: an offset from the pile's centre, a height
 * on the window, a turn and an opacity. The grid is always where they end.
 */

export type Values = Record<string, number | string | boolean>;

/** One painting's starting state, relative to the pile's centre on the window. */
export interface Start {
  /** Offset from the pile's centre, in px. */
  x: number;
  y: number;
  /** Height the painting is drawn at, in px. */
  h: number;
  /** Turn, in degrees. */
  rot: number;
  /** Opacity, 0 to 1. */
  op: number;
}

/** What a layout knows about the painting it is placing. */
export interface Place {
  /** Position in the pile: 0 is the front. */
  i: number;
  /** How many paintings there are. */
  n: number;
  vw: number;
  vh: number;
  /** The painting's centre and height in the settled grid, in page px. */
  tx: number;
  ty: number;
  th: number;
  /** The grid's box, in page px. */
  grid: { left: number; top: number; width: number };
  /** A random number from 0 to 1, the same for this painting every time (seeded). */
  rand: () => number;
}

/** Small, fixed offsets for the front of the pile — the fanned look in the mockup. */
const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.035, -0.06], [-0.045, -0.02], [0.02, 0.055], [-0.03, 0.06],
  [0.055, 0.015], [-0.055, -0.05], [0.01, -0.075], [-0.015, 0.075], [0.045, -0.035],
  [-0.04, 0.03], [0.03, 0.04],
];

const n_ = (v: Values, k: string) => Number(v[k]);
const deg = Math.PI / 180;
/** A turn either way, up to `max` degrees. */
const turn = (rand: () => number, max: number) => (rand() * 2 - 1) * max;

/**
 * Paintings beyond a layout's `count` are not placed: they wait at the centre,
 * behind the rest, or are not shown at all until they arrive.
 */
function rest(p: Place, v: Values, h: number): Start | null {
  if (p.i < n_(v, 'count')) return null;
  return { x: 0, y: 0, h, rot: 0, op: v.rest === 'invisible' ? 0 : 1 };
}

export const LAYOUTS: Record<string, (p: Place, v: Values) => Start> = {
  /* The site's own: a heap in the middle, its front dozen fanned. */
  pile: (p, v) => {
    const fanned = Math.max(1, n_(v, 'count'));
    const depth = Math.min(p.i, fanned);
    const h = p.vh * (p.i === 0 ? n_(v, 'size') : Math.max(0.02, n_(v, 'size') - 0.02 - depth * n_(v, 'depth')));
    if (p.i >= fanned) return { x: 0, y: 0, h, rot: 0, op: v.rest === 'invisible' ? 0 : 1 };
    // The first dozen keep the mockup's offsets; past them, new ones in the same range.
    const off = OFFSETS[p.i] ?? [(p.rand() * 2 - 1) * 0.055, (p.rand() * 2 - 1) * 0.075];
    const r1 = p.rand();
    return {
      x: off[0] * p.vw * n_(v, 'spreadX'),
      y: off[1] * p.vh * n_(v, 'spreadY'),
      h,
      rot: p.i === 0 && !v.turnFront ? 0 : (r1 * 2 - 1) * n_(v, 'rot'),
      op: 1,
    };
  },

  /* Thrown across the window — and past it, the further they are spread. */
  scatter: (p, v) => {
    const h0 = p.vh * n_(v, 'size');
    const r = rest(p, v, h0 * (1 - n_(v, 'jitter')));
    if (r) return r;
    let x = 0;
    let y = 0;
    const hole = n_(v, 'hole');
    for (let tries = 0; tries < 12; tries++) {
      if (v.shape === 'cloud') {
        // Gaussian: thick in the middle, thinning out.
        const a = Math.max(1e-6, p.rand());
        const b = p.rand();
        const m = Math.sqrt(-2 * Math.log(a)) * 0.45;
        x = m * Math.cos(2 * Math.PI * b);
        y = m * Math.sin(2 * Math.PI * b);
      } else if (v.shape === 'ellipse') {
        const a = Math.sqrt(p.rand());
        const b = p.rand() * 2 * Math.PI;
        x = a * Math.cos(b);
        y = a * Math.sin(b);
      } else {
        x = p.rand() * 2 - 1;
        y = p.rand() * 2 - 1;
      }
      if (Math.hypot(x, y) >= hole) break;
    }
    const h = h0 * (1 - n_(v, 'jitter') * p.rand());
    return {
      x: x * p.vw * n_(v, 'spreadX') / 2,
      y: y * p.vh * n_(v, 'spreadY') / 2,
      h,
      rot: turn(p.rand, n_(v, 'rot')),
      op: 1,
    };
  },

  /* A sunflower: each painting a golden turn from the last, further out. */
  spiral: (p, v) => {
    const h0 = p.vh * n_(v, 'size');
    const r = rest(p, v, h0 * 0.5);
    if (r) return r;
    const k = Math.sqrt(p.i) * n_(v, 'gap') * p.vh;
    const a = p.i * n_(v, 'twist') * deg;
    const out = Math.min(1, Math.sqrt(p.i / Math.max(1, n_(v, 'count'))));
    return {
      x: Math.cos(a) * k * n_(v, 'stretch'),
      y: Math.sin(a) * k,
      h: h0 * (1 - n_(v, 'shrink') * out),
      rot: v.align ? a / deg + 90 : turn(p.rand, n_(v, 'rot')),
      op: 1,
    };
  },

  /* Rings around the middle, the empty centre left for the wordmark. */
  ring: (p, v) => {
    const h0 = p.vh * n_(v, 'size');
    const r = rest(p, v, h0 * 0.7);
    if (r) return r;
    const count = Math.max(1, n_(v, 'count'));
    const rings = Math.max(1, Math.round(n_(v, 'rings')));
    const per = Math.ceil(count / rings);
    const ring = Math.floor(p.i / per);
    const slot = p.i % per;
    const grow = 1 + ring * n_(v, 'ringGap');
    const a = (slot / per) * 2 * Math.PI + n_(v, 'spin') * deg + ring * (Math.PI / per);
    return {
      x: Math.cos(a) * p.vw * n_(v, 'radiusX') * grow,
      y: Math.sin(a) * p.vh * n_(v, 'radiusY') * grow,
      h: h0 * Math.pow(n_(v, 'ringShrink'), ring),
      rot: v.tangent ? a / deg + 90 : turn(p.rand, n_(v, 'rot')),
      op: 1,
    };
  },

  /* A hand of cards, fanned in a curve across the window. */
  deck: (p, v) => {
    const h0 = p.vh * n_(v, 'size');
    const r = rest(p, v, h0);
    if (r) return r;
    const count = Math.max(1, Math.min(n_(v, 'count'), p.n));
    const u = count === 1 ? 0 : (p.i / (count - 1)) * 2 - 1; // −1 … 1 across
    // Front of the pile in the middle of the hand, the rest dealt either side.
    const side = p.i % 2 ? -1 : 1;
    const spot = v.order === 'from the middle'
      ? side * Math.ceil(p.i / 2) / Math.max(1, Math.ceil((count - 1) / 2))
      : u;
    return {
      x: spot * p.vw * n_(v, 'spread') / 2,
      y: spot * spot * p.vh * n_(v, 'arc') + n_(v, 'lift') * p.vh,
      h: h0,
      rot: spot * n_(v, 'tilt'),
      op: 1,
    };
  },

  /* The grid itself, shrunk into the window, opening out to full size. */
  miniature: (p, v) => {
    const zoom = n_(v, 'zoom');
    const spread = n_(v, 'spread');
    const gx = p.tx - (p.grid.left + p.grid.width / 2);
    const gy = p.ty - p.grid.top;
    return {
      x: gx * zoom * spread,
      y: gy * zoom * spread - p.vh * n_(v, 'top'),
      h: p.th * zoom,
      rot: turn(p.rand, n_(v, 'rot')),
      op: 1,
    };
  },

  /*
   * Each painting starts on the line from the middle of the window to where it
   * will sit once the opening is over, pushed further out along it.
   */
  burst: (p, v) => {
    const m = pile.motion;
    // Its place on the window the moment the grid settles, from the pile's centre.
    const ex = p.tx - p.vw * Number(m.cx);
    const ey = p.ty - p.vh * Number(m.span) - p.vh * Number(m.cy);
    const len = Math.hypot(ex, ey) || 1;
    const push = n_(v, 'distance') * Math.max(p.vw, p.vh) * (1 + turn(p.rand, n_(v, 'jitter')));
    const pull = n_(v, 'pull');
    return {
      x: ex * pull + (ex / len) * push,
      y: ey * pull + (ey / len) * push,
      h: p.th * n_(v, 'scale'),
      rot: turn(p.rand, n_(v, 'rot')),
      op: n_(v, 'opacity'),
    };
  },
};

/** The motion every layout shares, and the grid the paintings land in. */
export interface Pile {
  effect: string;
  effects: Record<string, Values>;
  motion: Values;
  grid: Values;
  /** Held at this point of the unfold (0 to 1) instead of following the scroll. */
  freeze: number | null;
}

/*
 * THE SITE'S SETTINGS. What everyone sees. Change these to make a tuner
 * choice permanent.
 */
export const SITE: Pile = {
  effect: 'scatter',
  effects: {
    pile: { size: 0.38, depth: 0.006, spreadX: 1, spreadY: 1, count: 12, rot: 0, turnFront: false, rest: 'behind' },
    /*
     * The site's opening. `since` keeps the scatter to paintings of that year
     * and later (older ones wait unseen and arrive with the scroll); `count`
     * is a ceiling on how many of those are thrown, and 9999 means all of
     * them, however many there are by now. Nothing here is a number of
     * paintings: client/stack.ts counts them on the page.
     */
    scatter: { spreadX: 1.2, spreadY: 0.95, shape: 'box', hole: 0, size: 0.24, jitter: 0, rot: 0, count: 9999, rest: 'invisible', since: 2021 },
    spiral: { gap: 0.075, stretch: 1.5, twist: 137.5, size: 0.22, shrink: 0.4, rot: 0, align: false, count: 70, rest: 'behind' },
    ring: { radiusX: 0.34, radiusY: 0.3, rings: 2, ringGap: 0.45, ringShrink: 0.85, spin: -90, size: 0.2, rot: 0, tangent: false, count: 36, rest: 'behind' },
    deck: { spread: 0.8, arc: 0.12, lift: 0, tilt: 18, size: 0.32, count: 25, order: 'from the middle', rest: 'behind' },
    miniature: { zoom: 0.18, spread: 1, top: 0.35, rot: 0 },
    burst: { distance: 0.2, pull: 1, jitter: 0.3, scale: 0.8, opacity: 0.2, rot: 10 },
  },
  motion: {
    span: 1.45, follow: 1, curve: 'in', power: 1, overshoot: 0,
    stagger: 0.26, order: 'random', fade: 1, cx: 0.5, cy: 0.5, seed: 38,
  },
  grid: { gapX: 2.6, gapY: 1.45, start: 70 },
  freeze: null,
};

/*
 * THE WATER — how the paintings float while they wait at the top of the
 * gallery, before the scroll takes them to the grid (client/stack.ts).
 *
 * They lie on water and the cursor is a finger in it: moving it drags the
 * water, and the paintings near it, along; it nudges them aside as it comes;
 * and one it rests on slips slowly out from under it. They keep whatever
 * place they are pushed to, drifting home only very slowly, and the scroll
 * gathers them from wherever they are.
 *
 *   reach   how far from the cursor the water is felt, in screen heights.
 *   drag    how firmly a moving cursor carries the paintings with it.
 *   push    how hard it parts them, in px/s² at the cursor.
 *   still   how much of that push a cursor at rest still has (0 to 1): what
 *           makes a painting slide away from under a cursor that only hovers.
 *   fast    the cursor speed, px/s, at which the push is at its full.
 *   thick   how thick the water is: higher stops a pushed painting sooner.
 *   home    how strongly each is drawn back to its own place. 0 leaves them
 *           wherever they were pushed; 1 brings them back within seconds.
 *   bob     how far each sways on its own, in px, and `sway` how slowly
 *           (seconds for one sway). bob 0 holds them still until touched.
 */
export const WATER = {
  on: true,
  reach: 0.16,
  drag: 2.2,
  push: 700,
  still: 0.2,
  fast: 900,
  thick: 3,
  home: 0.12,
  bob: 5,
  sway: 7,
};

export const ON = 'cv-pile-on';
export const STORE = 'cv-pile';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** The settings in use: the site's, or this browser's own while the tuner is on. */
export const pile: Pile = clone(SITE);

function tunerOn(): boolean {
  try {
    const asked = new URLSearchParams(location.search).get('pile');
    if (asked === 'off' || asked === '0') return false;
    return asked !== null || localStorage.getItem(ON) === '1';
  } catch { return false; }
}

if (tunerOn()) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Pile> | null;
    if (saved) {
      if (saved.effect && saved.effect in LAYOUTS) pile.effect = saved.effect;
      for (const id of Object.keys(pile.effects)) Object.assign(pile.effects[id]!, saved.effects?.[id] ?? {});
      Object.assign(pile.motion, saved.motion ?? {});
      Object.assign(pile.grid, saved.grid ?? {});
    }
  } catch { /* private window */ }
}

/** How much scrolling, in screen heights, the opening takes. */
export const scrollSpan = (): number => Number(pile.motion.span);

/** A small seeded generator, so a layout looks the same every time. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The curve from 0 to 1 the paintings travel along. */
export function easeOf(m: Values): (p: number) => number {
  const k = Math.max(0.1, Number(m.power));
  const o = Number(m.overshoot);
  switch (m.curve) {
    case 'linear': return (p) => p;
    case 'in': return (p) => Math.pow(p, k);
    case 'out': return (p) => 1 - Math.pow(1 - p, k);
    case 'back out': return (p) => 1 + (o + 1) * Math.pow(p - 1, 3) + o * Math.pow(p - 1, 2);
    case 'expo out': return (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * k / 2 * p));
    case 'sine in-out': return (p) => -(Math.cos(Math.PI * p) - 1) / 2;
    default: return (p) => (p < 0.5 ? Math.pow(2 * p, k) / 2 : 1 - Math.pow(2 * (1 - p), k) / 2);
  }
}

/**
 * The grid's own spacing and where it starts, written over the stylesheet —
 * only what differs from the site's, so the stylesheet's clamps stay in force
 * otherwise. `--side-top` follows the scroll span, as 00-base.css explains.
 */
export function gridCss(p: Pile): string {
  const g = p.grid;
  const d = SITE.grid;
  const rules: string[] = [];
  if (g.gapX !== d.gapX) rules.push(`--grid-gap-x: ${g.gapX}vw;`);
  if (g.gapY !== d.gapY) rules.push(`--grid-gap-y: ${g.gapY}vw;`);
  if (g.start !== d.start) rules.push(`--grid-start: ${g.start}vh;`);
  if (p.motion.span !== SITE.motion.span || g.start !== d.start) {
    rules.push(`--side-top: calc(var(--grid-start) - ${((Number(p.motion.span) - 1) * 100).toFixed(1)}vh);`);
  }
  return rules.length ? `@media (min-width: 900px) { :root { ${rules.join(' ')} } }` : '';
}

if (tunerOn()) {
  const css = gridCss(pile);
  if (css) {
    const style = document.createElement('style');
    style.id = 'pile-live';
    style.textContent = css;
    document.head.append(style);
  }
}
