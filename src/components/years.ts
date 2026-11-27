import { html, join, type Html } from './html.ts';
import type { YearColour } from '../content/load.ts';

/**
 * The year rail: a column of colour swatches down the left edge, one per year,
 * each in a colour sampled from that year's own paintings (see
 * `scripts/palette.ts`).
 */
export function yearRail(years: readonly YearColour[]): Html {
  if (!years.length) return html``;
  return html`<nav class="years" data-years aria-label="Jump to year">
    ${join(
      years.map(
        (y) => html`<a class="year" href="#year-${y.year}" data-year="${y.year}" style="--c:${y.colour}">
          <span class="year-swatch" aria-hidden="true"></span>
          <span class="year-label">${y.year}</span>
        </a>`,
      ),
    )}
  </nav>`;
}

/** "Inquiries" in the Artwork row, lit on hover like the Exhibitions and Commissioned rows (`.hrow`). */
export function sideInquiries(): Html {
  return html`<a class="side-inquiries hrow" href="#inquiries" data-inquiries-open>Inquiries</a>`;
}
