/** How big each painting really is, and how big to draw it. */

/** Dimensions are written "162 × 130 cm", "110x153cm", "31X25,5CM", "60 X 50". */
const PAIR = /(\d+(?:[.,]\d+)?)\s*[x×X]\s*(\d+(?:[.,]\d+)?)/;

/**
 * The geometric mean of the two sides, in centimetres — the single number that
 * best stands for "how big is it", because it treats a tall work and a wide one
 * of the same area as the same size, which is how a wall reads them.
 */
export function realSize(dimensions: string | undefined): number | undefined {
  const found = dimensions ? PAIR.exec(dimensions) : null;
  if (!found) return undefined;
  const a = Number.parseFloat(found[1]!.replace(',', '.'));
  const b = Number.parseFloat(found[2]!.replace(',', '.'));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return undefined;
  return Math.sqrt(a * b);
}

/** Compression. */
const GAMMA = 0.6;

/** The floor and the ceiling. */
const MIN = 0.55;
const MAX = 1.7;

export interface Scaled {
  /** Tile height as a multiple of the grid unit. Width follows from the aspect. */
  readonly height: number;
}

/** Per-work drawing scale, against the median of the set. */
export function scaleAgainst(
  sizes: ReadonlyArray<number | undefined>,
): (size: number | undefined, aspect: number) => Scaled | undefined {
  const known = sizes.filter((s): s is number => s !== undefined).sort((a, b) => a - b);
  if (!known.length) return () => undefined;
  const median = known[Math.floor(known.length / 2)]!;

  return (size, aspect) => {
    if (size === undefined || !(aspect > 0)) return undefined;
    const raw = Math.pow(size / median, GAMMA);
    const linear = Math.min(MAX, Math.max(MIN, raw));
    // Area goes as `linear²` and the shape is the photograph's, so the height is the linear scale
    // divided by the square root of the aspect.
    return { height: linear / Math.sqrt(aspect) };
  };
}
