/**
 * THE OPENING'S SHAPE — where each painting starts before the scroll lays it
 * into the grid, and how it travels there (client/stack.ts runs it).
 */

/* The paintings thrown across the window: how far, in windows; their height, in window heights; the first year shown. */
export const SCATTER = { spreadX: 1.2, spreadY: 0.95, size: 0.24, since: 2021 };

/* The travel: the scroll it takes, in screen heights; each painting's wait, as a share of it; the centre on the window. */
export const MOTION = { span: 1.45, stagger: 0.26, cx: 0.5, cy: 0.5, seed: 38 };

/*
 * THE WATER — how the paintings float while they wait at the top of the gallery,
 * before the scroll takes them to the grid.
 */
export const WATER = {
  on: true,
  reach: 0.16,
  drag: 2.2,
  push: 700,
  still: 0.2,
  fast: 900,
  thick: 3,
  home: 1,
  limit: 0.2,
  wall: 60,
  bob: 5,
  sway: 7,
};

/** How much scrolling, in screen heights, the opening takes. */
export const scrollSpan = (): number => MOTION.span;

/** A small seeded generator, so the opening looks the same every time. */
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
