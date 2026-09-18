import { html, join, type Html } from './html.ts';
import { aspectOf, responsiveImage } from './image.ts';
import { displayTitle } from '../content/title.ts';
import { withBase } from '../content/paths.ts';
import type { ProjectImage } from '../content/types.ts';

/**
 * One item on a grid. Everything the lightbox caption needs is carried on the
 * tile as data attributes, so opening a work reads straight from the DOM — no
 * second copy of the records is shipped alongside the markup that holds them.
 */
export interface GridItem {
  readonly slug: string;
  readonly title: string;
  readonly image: ProjectImage;
  readonly year?: number;
  readonly dimensions?: string;
  readonly materials?: string;
  readonly reference?: string;
  readonly available?: boolean;
}

interface GridProps {
  readonly items: readonly GridItem[];
  /** Root-relative path the tiles link to, e.g. `/artwork`. */
  readonly basePath: string;
  /** Tiles open in the lightbox (single works) … */
  readonly lightbox?: boolean;
  /** … or as a panel `#<kind>-<slug>` over the page (exhibitions, collaborations). */
  readonly panels?: string;
  /** Animate the grid out of a stack on the first scroll. */
  readonly stack?: boolean;
  /** Leading tiles to load eagerly — the ones visible in the stack. */
  readonly eagerCount?: number;
}

/**
 * Density levels, after tylermitchell.co's 50 / 200 / 500. `unit` is the row
 * height in px; the label is roughly how many of the 154 works fit on a screen
 * at that size, so the control reads as a count rather than a pixel value.
 */
export const DENSITIES = [
  { unit: 240, label: 24 },
  { unit: 150, label: 60 },
  { unit: 96, label: 154 },
] as const;
export const DEFAULT_DENSITY = 2;

function tile(item: GridItem, basePath: string, index: number, priority: boolean, panels?: string): Html {
  const name = displayTitle(item.title, 'work');
  return html`<a
    class="tile"
    href="${withBase(`${basePath}/${item.slug}/`)}"
    style="--a:${aspectOf(item.image).toFixed(4)}"
    ${panels ? html`data-panel-open="${panels}-${item.slug}"` : ''}
    data-title="${name}"
    data-year="${item.year ?? ''}"
    data-dimensions="${item.dimensions ?? ''}"
    data-materials="${item.materials ?? ''}"
    data-reference="${item.reference ?? ''}"
    data-available="${item.available ? 'true' : 'false'}"
    data-index="${index}"
    aria-label="${name}${item.year ? `, ${item.year}` : ''}"
  >${responsiveImage({
    image: item.image,
    sizes: '(max-width: 599px) 40vw, 260px',
    priority,
    className: 'tile-image',
  })}</a>`;
}

/**
 * Rows of one height, widths following the pictures, left-aligned with wide
 * gutters — the grid in the designer's mockup. `--unit` (the row height) is the
 * only thing the density control changes; every tile's width is `--unit × --a`.
 */
export function grid({
  items, basePath, lightbox = false, panels, stack = false, eagerCount = 14,
}: GridProps): Html {
  return html`<div
    class="grid"
    data-grid
    ${lightbox ? html`data-lightbox-source` : ''}
    ${stack ? html`data-stack` : ''}
    style="--unit:${DENSITIES[DEFAULT_DENSITY]!.unit}px"
  >${join(items.map((item, i) => tile(item, basePath, i, i < eagerCount, panels)))}</div>`;
}

/** Density steps and, optionally, a year filter — set in small caps above the grid. */
export function gridControls(years: readonly number[] = []): Html {
  return html`<div class="controls" data-controls>
    <div class="control-group" role="group" aria-label="Grid size">
      ${join(
        DENSITIES.map(
          (d, i) => html`<button type="button" class="control${i === DEFAULT_DENSITY ? ' is-active' : ''}"
            data-density="${d.unit}" aria-pressed="${i === DEFAULT_DENSITY ? 'true' : 'false'}">${d.label}</button>`,
        ),
      )}
    </div>
    ${years.length
      ? html`<div class="control-group" role="group" aria-label="Year">
          <button type="button" class="control is-active" data-year-filter="all" aria-pressed="true">All</button>
          ${join(years.map((y) => html`<button type="button" class="control" data-year-filter="${y}" aria-pressed="false">${y}</button>`))}
        </div>`
      : ''}
  </div>`;
}
