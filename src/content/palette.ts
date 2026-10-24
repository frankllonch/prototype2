/**
 * The site's one list of colours.
 *
 * Everything that answers in colour — a row of the exhibitions or commissioned
 * index under the pointer, the page you are on in the bar — draws from this
 * list, and from nowhere else: the year palette sampled from the paintings
 * (`content/years.json`, by scripts/palette.ts), each brought up to where it
 * reads as a hue on paper. The list is handed to the browser once, as custom
 * properties on the document, and `client/hues.ts` is the one way of choosing
 * from it. Add a colour here and every place that draws gets it.
 */
import { yearColours } from './load.ts';

/**
 * The same colour, brought up to where it reads as one.
 *
 * The year palette is sampled from the paintings and several of them are very
 * dark — a ground, a deep red — which on the archive's rail is right, because
 * each sits in a small swatch beside the others. As a line of type on white,
 * `#2b2d15` is not an olive, it is black, and the row would look as though it
 * had done nothing. Lightness and saturation are moved into a band where a hue
 * is legible as that hue; which painting it came from is kept, since the hue
 * itself is untouched.
 */
export function vivid(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const s = Math.max(0.62, d === 0 ? 0 : (max + min) / 2 > 0.5 ? d / (2 - max - min) : d / (max + min));
  const k = (t: number) => (t + 12) % 12;
  const hh = h * 12;
  const at = (l: number) => {
    const a = s * Math.min(l, 1 - l);
    const f = (t: number) => l - a * Math.max(-1, Math.min(k(t) - 3, Math.min(9 - k(t), 1)));
    return [f(hh), f(hh + 8), f(hh + 4)] as const;
  };

  /*
   * Bright enough to read as a hue, dark enough to read at all.
   *
   * Lifting lightness alone gave a green at 2.6:1 against the paper — the row
   * answered the pointer by becoming harder to read than before it was touched.
   * So lightness comes down from its brightest until the contrast clears 4.5:1,
   * which is the threshold this type size needs. A hue that is already legible is
   * not darkened; the hue itself is never changed.
   */
  const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = ([r2, g2, b2]: readonly number[]) =>
    0.2126 * channel(r2!) + 0.7152 * channel(g2!) + 0.0722 * channel(b2!);

  let best = at(Math.min(0.5, Math.max(0.4, (max + min) / 2)));
  for (let l = 0.5; l >= 0.16; l -= 0.01) {
    best = at(l);
    if (1.05 / (luminance(best) + 0.05) >= 4.5) break;
  }

  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${to(best[0]!)}${to(best[1]!)}${to(best[2]!)}`;
}

/** The hues, in the rail's order, ready to be drawn with. */
export const hues: readonly string[] = yearColours.map((y) => vivid(y.colour));

/**
 * The same colour as the bar has to be told it. The bar is drawn as the
 * difference of whatever passes under it, so over paper a source comes out as
 * its own negative; to arrive at a colour there, its negative is what is set.
 */
export function negative(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${255 - ((n >> 16) & 255)}, ${255 - ((n >> 8) & 255)}, ${255 - (n & 255)})`;
}

/** The list as custom properties for the document: `--hues`, `--hue-N`, `--neg-N`. */
export const hueVars = (): string =>
  [`--hues:${hues.length}`, ...hues.flatMap((h, i) => [`--hue-${i}:${h}`, `--neg-${i}:${negative(h)}`])].join(';');
