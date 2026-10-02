import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import type { YearColour } from '../content/load.ts';

export interface ExhibitionRow {
  readonly slug: string;
  readonly title: string;
  readonly year?: number;
  readonly venue?: string;
  readonly from?: string;
  readonly to?: string;
  readonly cover?: ProjectImage;
}

/**
 * The exhibitions index, after the designer's layout: one line per show — what it
 * was called and where, when it ran, and the year at the right margin — with a
 * rule between them and nothing else. A list, not a gallery.
 *
 * The photograph lives in the gap between the name and the dates and is only
 * shown on hover, so the page reads as a table until you reach for something.
 *
 * Every date and place here is derived from the exhibition's own text
 * (`content/sections.ts`), never retyped, so a correction at the source carries
 * through. A show whose dates could not be read simply shows none; a wrong date
 * on a gallery's page is worse than an absent one.
 */
export function exhibitionList(items: readonly ExhibitionRow[], hues: readonly YearColour[]): Html {
  // The hover colours are the ones sampled from the paintings for the year rail,
  // handed to the client as custom properties so the palette stays in the
  // stylesheet's world and only the choosing is scripted.
  const palette = hues.map((h, i) => `--hue-${i}:${vivid(h.colour)}`).join(';');

  return html`<div class="exh-list" data-exhibitions data-hues="${hues.length}" style="${palette}">
    ${join(items.map(row))}
  </div>`;
}

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
function vivid(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const l = Math.min(0.5, Math.max(0.4, (max + min) / 2));
  const s = Math.max(0.62, d === 0 ? 0 : (max + min) / 2 > 0.5 ? d / (2 - max - min) : d / (max + min));

  const k = (t: number) => (t + 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (t: number) => l - a * Math.max(-1, Math.min(k(t) - 3, Math.min(9 - k(t), 1)));
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  const hh = h * 12;
  return `#${to(f(hh))}${to(f(hh + 8))}${to(f(hh + 4))}`;
}

function row(item: ExhibitionRow): Html {
  const when = dates(item);
  return html`<a
    class="exh"
    href="#exhibition-${item.slug}"
    data-panel-open="exhibition-${item.slug}"
    aria-label="${item.title}${item.venue ? `, ${item.venue}` : ''}${item.year ? `, ${item.year}` : ''}"
  >
    <span class="exh-name">
      <span class="exh-title">${item.title}</span>
      ${item.venue ? html`<span class="exh-venue">${item.venue}</span>` : ''}
    </span>

    <span class="exh-plate" aria-hidden="true">
      ${item.cover
        ? responsiveImage({ image: item.cover, sizes: '(max-width: 899px) 30vw, 14vw', alt: '' })
        : ''}
    </span>

    <span class="exh-when">${when}</span>
    <span class="exh-year">${item.year ?? ''}</span>
  </a>`;
}

/**
 * "From May to June" where both are known, a single month where only one is, and
 * nothing at all where neither could be read. `From` and `To` stay upright while
 * the months lean, as in the designer's layout.
 */
function dates(item: ExhibitionRow): Html {
  if (!item.from) return html``;
  if (!item.to) return html`<em>${item.from}</em>`;
  return html`<span class="exh-span"><span class="exh-lead">From</span> <em>${item.from}</em></span>
    <span class="exh-span"><span class="exh-lead">To</span> <em>${item.to}</em></span>`;
}
