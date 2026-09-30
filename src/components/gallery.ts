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
  /**
   * Fill the width in justified rows instead of the fixed-height contact sheet.
   * Used where there are a handful of items rather than 154, and where the size
   * is not the reader's to choose.
   */
  readonly justified?: boolean;
  /**
   * Two staggered columns at their natural proportions, after nachoalegre.com.
   * For the sections that are a handful of projects rather than an archive: the
   * pictures get to be different shapes and sizes instead of being cut to one
   * row height, which is the whole point of the composition.
   */
  readonly feed?: boolean;
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

function tile(
  item: GridItem, basePath: string, index: number, priority: boolean, panels?: string, anchor?: number,
): Html {
  const name = displayTitle(item.title, 'work');
  // A tile that raises a panel points at the panel's own anchor — there is no
  // page behind it — so the link is real with or without scripting.
  const href = panels ? `#${panels}-${item.slug}` : withBase(`${basePath}/${item.slug}/`);
  return html`<a
    class="tile"
    href="${href}"
    ${anchor ? html`id="year-${anchor}"` : ''}
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
  items, basePath, lightbox = false, panels, stack = false, justified = false, feed = false, eagerCount = 14,
}: GridProps): Html {
  // The first tile of each year carries that year's anchor, so the rail can be
  // plain links and still work with scripting off.
  const seen = new Set<number>();

  /*
   * The feed is two columns of whole items rather than one wrapping run, so the
   * items are dealt out alternately here rather than left to CSS columns: those
   * would break a tile across a column boundary, and the order has to stay the
   * reading order for the keyboard.
   */
  if (feed) {
    const tiles = items.map((item, i) => tile(item, basePath, i, i < eagerCount, panels));
    const columns = [tiles.filter((_, i) => i % 2 === 0), tiles.filter((_, i) => i % 2 === 1)];
    return html`<div class="grid grid-feed" data-grid ${lightbox ? html`data-lightbox-source` : ''}>${join(
      columns.map((column) => html`<div class="feed-column">${join(column)}</div>`),
    )}</div>`;
  }

  return html`<div
    class="grid${justified ? ' grid-justified' : ''}"
    data-grid
    ${lightbox ? html`data-lightbox-source` : ''}
    ${stack ? html`data-stack` : ''}
    style="--unit:${DENSITIES[DEFAULT_DENSITY]!.unit}px"
  >${join(
    items.map((item, i) => {
      const first = item.year !== undefined && !seen.has(item.year);
      if (first) seen.add(item.year!);
      return tile(item, basePath, i, i < eagerCount, panels, first ? item.year : undefined);
    }),
  )}</div>`;
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
