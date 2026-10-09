/**
 * How big each painting really is, and how big to draw it.
 *
 * The grid can show the works at one height, which is a contact sheet and good
 * for comparing colour, or at their relative sizes, which is a wall. This works
 * out the second.
 *
 * Only one number per work is needed. The tile's *shape* already comes from the
 * photograph (`--a`), so all the catalogue has to supply is a size — and that
 * makes the measurements usable as they stand. They are written inconsistently,
 * 124 of them height by width and 15 the other way round, which would matter if
 * we were orienting anything; for an area it does not, because w × h is the same
 * either way.
 */

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

/**
 * Compression. The archive runs from 28 cm to 244 cm, which is 8.7 to one, and
 * at true scale the smallest works are thumbnails beside the largest. Raising
 * the ratio to a power short of 1 keeps the order and most of the feeling while
 * pulling the ends in: at 0.75 the span becomes about five to one, so a 260 cm
 * canvas still reads as five times the little oil panel rather than nine.
 */
const GAMMA = 0.75;

/**
 * The floor and the ceiling.
 *
 * The ceiling is a rail only: the largest work lands at 2.12 on its own, so it
 * never bites, and it is here in case one mistyped dimension — a work entered in
 * millimetres, a stray zero — would otherwise blow the grid apart.
 *
 * The floor does bite, by a little, and on purpose. The smallest panels come out
 * at 0.42, and at the densest setting that is a 37-pixel tile, which is below
 * the size at which there is any painting left to see. Lifting the floor to 0.45
 * costs the small works a fraction of their true difference and buys them back
 * enough tile to be a picture.
 */
const MIN = 0.45;
const MAX = 2.2;

export interface Scaled {
  /** Tile height as a multiple of the grid unit. Width follows from the aspect. */
  readonly height: number;
}

/**
 * Per-work drawing scale, against the median of the set.
 *
 * The median rather than the mean: the archive leans heavily to recent years and
 * to one or two sizes, and a mean would be dragged about by whichever size
 * happens to be commonest. The median keeps the typical work at the unit size,
 * so switching to scale leaves the middle of the grid where it was and moves
 * only what is genuinely larger or smaller.
 *
 * Returns nothing for a work whose dimensions could not be read; those stay at
 * the unit size, which is the honest answer to "we do not know how big it is".
 */
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
    // Area goes as `linear²` and the shape is the photograph's, so the height is
    // the linear scale divided by the square root of the aspect.
    return { height: linear / Math.sqrt(aspect) };
  };
}
