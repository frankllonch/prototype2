/** The site's one list of colours. */
import { yearColours } from './load.ts';

/** The same colour, brought up to where it reads as one. */
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

  /* Bright enough to read as a hue, dark enough to read at all. */
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

/** The same colour as the bar has to be told it. */
export function negative(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${255 - ((n >> 16) & 255)}, ${255 - ((n >> 8) & 255)}, ${255 - (n & 255)})`;
}

/** The list as custom properties for the document: `--hues`, `--hue-N`, `--neg-N`. */
export const hueVars = (): string =>
  [`--hues:${hues.length}`, ...hues.flatMap((h, i) => [`--hue-${i}:${h}`, `--neg-${i}:${negative(h)}`])].join(';');
