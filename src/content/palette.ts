/** The site's one list of colours: the ones given in What's Color?, all three editions. */
import { FINAL_COLOURS } from './whats-color-colours.ts';

/** Every colour given, once each, in the editions' order. */
export const given: readonly string[] = [...new Set(FINAL_COLOURS.map((c) => c.hex.toLowerCase()))];

const channels = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Contrast with the paper, as WCAG counts it. */
function contrast(rgb: readonly number[]): number {
  const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 1.05 / (0.2126 * c(rgb[0]!) + 0.7152 * c(rgb[1]!) + 0.0722 * c(rgb[2]!) + 0.05);
}

/** The greys and the black are the page's own, and are no highlight on it. */
const SATURATION_MIN = 0.12;
/** Light enough to read as a colour, dark enough to read as type. */
const CONTRAST_MIN = 3;
const CONTRAST_MAX = 7;

/** The same hue at the same strength, lightened or darkened only as far as type on white needs; null for a grey. */
export function legible(hex: string): string | null {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let l = (max + min) / 2;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (s < SATURATION_MIN) return null;

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 2;
  else if (max === g) h = ((b - r) / d + 2) * 2;
  else h = ((r - g) / d + 4) * 2;
  const at = (light: number): [number, number, number] => {
    const a = s * Math.min(light, 1 - light);
    const f = (t: number) => light - a * Math.max(-1, Math.min(((t + h) % 12) - 3, Math.min(9 - ((t + h) % 12), 1)));
    return [f(0), f(8), f(4)];
  };

  let rgb: [number, number, number] = [r, g, b];
  while (contrast(rgb) < CONTRAST_MIN && l > 0) rgb = at((l -= 0.005));
  while (contrast(rgb) > CONTRAST_MAX && l < 1) rgb = at((l += 0.005));

  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}

/** The hues every highlight is drawn from. */
export const hues: readonly string[] = given.map(legible).filter((h): h is string => h !== null);

/** The same colour as the bar has to be told it. */
export function negative(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${255 - ((n >> 16) & 255)}, ${255 - ((n >> 8) & 255)}, ${255 - (n & 255)})`;
}

/** The list as custom properties for the document: `--hues`, `--hue-N`, `--neg-N`. */
export const hueVars = (): string =>
  [`--hues:${hues.length}`, ...hues.flatMap((h, i) => [`--hue-${i}:${h}`, `--neg-${i}:${negative(h)}`])].join(';');
