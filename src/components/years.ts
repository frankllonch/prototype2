import { html, join, type Html } from './html.ts';
import type { YearColour } from '../content/load.ts';

/**
 * The year rail: a column of colour swatches down the left edge, one per year,
 * each in a colour sampled from that year's own paintings (see
 * `scripts/palette.ts`). Hovering a swatch widens it and names the year;
 * clicking jumps to that year in the grid.
 *
 * Each link points at the id carried by the first tile of its year, so it works
 * as a plain anchor with scripting off. The rail is hidden while the opening
 * pile is still running and appears once the grid has settled.
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
