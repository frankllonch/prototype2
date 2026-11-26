import { html, join, type Html } from './html.ts';
import { aspectOf, responsiveImage } from './image.ts';
import { displayTitle } from '../content/title.ts';
import { realSize, scaleAgainst, type Scaled } from '../content/size.ts';
import { withBase } from '../content/paths.ts';
import type { ProjectImage } from '../content/types.ts';

/** One item on a grid. */
export interface GridItem {
  readonly slug: string;
  readonly title: string;
  readonly image: ProjectImage;
  readonly year?: number;
  readonly dimensions?: string;
  readonly materials?: string;
  readonly reference?: string;
  /** What the tile is called, when the caller has decided (a painting's reference). */
  readonly name?: string;
  /** The pointer's label, a line each: reference, size, technique. */
  readonly caption?: readonly string[];
  readonly available?: boolean;
  /** The image shows the work alone, rather than hanging in a room. */
  readonly plate?: boolean;
}

interface GridProps {
  readonly items: readonly GridItem[];
  /** Root-relative path the tiles link to, e.g. `/artwork`. */
  readonly basePath: string;
  /** Tiles open in the lightbox (single works) … */
  readonly lightbox?: boolean;
  /** … or as a panel `#<kind>-<slug>` over the page (exhibitions, commissioned). */
  readonly panels?: string;
  /** Animate the grid out of a stack on the first scroll. */
  readonly stack?: boolean;
  /** Fill the width in justified rows instead of the fixed-height contact sheet. */
  readonly justified?: boolean;
  /** Two staggered columns at their natural proportions, after nachoalegre.com. */
  readonly feed?: boolean;
  /**
   * Carry each work's real size, so the reader can switch the grid from one
   * height to relative scale.
   */
  readonly toScale?: boolean;
  /** Leading tiles to load eagerly — the ones visible in the stack. */
  readonly eagerCount?: number;
}

/** Density levels, after tylermitchell.co's 50 / 200 / 500. */
export const DENSITIES = [
  // Labelled 25 / 50 / 100; the row heights are unchanged.
  { unit: '14.51vw', label: 25 },
  { unit: '9.07vw', label: 50 },
  { unit: '7.26vw', label: 100 },
] as const;
// The Artwork page opens at 25.
export const DEFAULT_DENSITY = 0;

function tile(
  item: GridItem, basePath: string, index: number, priority: boolean,
  panels?: string, anchor?: number, scaled?: Scaled, pileFront = false,
): Html {
  const name = item.name ?? displayTitle(item.title, 'work');
  // A tile that raises a panel points at the panel's own anchor — there is no page behind it — so
  // the link is real with or without scripting.
  const href = panels ? `#${panels}-${item.slug}` : withBase(`${basePath}/${item.slug}/`);
  return html`<a
    class="tile"
    href="${href}"
    ${anchor ? html`id="year-${anchor}"` : ''}
    style="--a:${aspectOf(item.image).toFixed(4)}${scaled ? `;--sh:${scaled.height.toFixed(4)}` : ''}"
    ${panels ? html`data-panel-open="${panels}-${item.slug}"` : ''}
    data-title="${name}"
    data-year="${item.year ?? ''}"
    data-dimensions="${item.dimensions ?? ''}"
    data-materials="${item.materials ?? ''}"
    data-reference="${item.reference ?? ''}"
    data-caption="${(item.caption ?? []).join('\n')}"
    data-available="${item.available ? 'true' : 'false'}"
    data-index="${index}"
    aria-label="${name}${item.year ? `, ${item.year}` : ''}"
  >${responsiveImage({
    image: item.image,
    /*
     * The paintings at the front of the opening pile are shown far bigger than
     * their tile, so they ask for a file big enough for that rather than for the
     * tile, or the heap is the tile's picture blown up.
     */
    sizes: pileFront
      ? `(max-width: 899px) 43vw, max(260px, calc(38vh * ${aspectOf(item.image).toFixed(3)}))`
      : '(max-width: 899px) 43vw, 260px',
    priority,
    className: 'tile-image',
  })}</a>`;
}

/**
 * Rows of one height, widths following the pictures, left-aligned with wide
 * gutters — the grid in the designer's mockup.
 */
export function grid({
  items, basePath, lightbox = false, panels, stack = false, justified = false, feed = false,
  toScale = false, eagerCount = 14,
}: GridProps): Html {
  // The first tile of each year carries that year's anchor, so the rail can be plain links and
  // still work with scripting off.
  const seen = new Set<number>();

  /*
   * Every tile carries the size it would be drawn at on a wall, whether or not
   * the reader ever asks for it: the switch is then a class on the grid rather
   * than a re-render, and works without anything being recomputed.
   */
  const sizes = items.map((item) => realSize(item.dimensions));
  const scale = scaleAgainst(sizes);
  /* A size is claimed only for works photographed alone. */
  const scaleOf = (item: GridItem, i: number) =>
    (toScale && item.plate ? scale(sizes[i], aspectOf(item.image)) : undefined);

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
    class="grid${justified ? ' grid-justified' : ''}${toScale ? ' grid-scaled' : ''}"
    data-grid
    ${lightbox ? html`data-lightbox-source` : ''}
    ${stack ? html`data-stack` : ''}
    ${toScale ? html`data-scalable` : ''}
    style="--unit:${DENSITIES[DEFAULT_DENSITY]!.unit}"
  >${join(
    items.map((item, i) => {
      const first = item.year !== undefined && !seen.has(item.year);
      if (first) seen.add(item.year!);
      return tile(item, basePath, i, i < eagerCount, panels, first ? item.year : undefined, scaleOf(item, i), stack && i < eagerCount);
    }),
  )}</div>`;
}

/**
 * Density steps and, where the works are catalogued with their measurements, a
 * switch between showing them all at one height and showing them at their
 * relative sizes.
 */
export function gridControls(years: readonly number[] = [], scalable = false, total?: number): Html {
  // The steps read 25 / 50 / 100.
  void total;
  const label = (i: number) => DENSITIES[i]!.label;
  return html`<div class="controls" data-controls>
    <div class="control-group" role="group" aria-label="Grid size">
      ${join(
        DENSITIES.map(
          (d, i) => html`<button type="button" class="control${i === DEFAULT_DENSITY ? ' is-active' : ''}"
            data-density="${d.unit}" aria-pressed="${i === DEFAULT_DENSITY ? 'true' : 'false'}">${label(i)}</button>`,
        ),
      )}
    </div>
    ${scalable
      ? html`<div class="control-group" role="group" aria-label="Sizing">
          <button type="button" class="control" data-scale="equal" aria-pressed="false">Equal</button>
          <button type="button" class="control is-active" data-scale="real" aria-pressed="true">To scale</button>
        </div>`
      : ''}
    ${years.length
      ? html`<div class="control-group" role="group" aria-label="Year">
          <button type="button" class="control is-active" data-year-filter="all" aria-pressed="true">All</button>
          ${join(years.map((y) => html`<button type="button" class="control" data-year-filter="${y}" aria-pressed="false">${y}</button>`))}
        </div>`
      : ''}
  </div>`;
}
