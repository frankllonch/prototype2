import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import { SHOW_GROUPS, placeOf, type Show, type ShowGroup } from '../content/exhibitions-list.ts';

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
export function exhibitionList(shows: readonly Show[], covers: ReadonlyMap<string, ProjectImage>): Html {
  return html`<div class="xlist exh-list">
    <h2 class="sr-only">Exhibitions</h2>
    ${join(SHOW_GROUPS.map((name) => group(name, shows.filter((s) => s.group === name), covers)))}
  </div>`;
}

/**
 * A group of the sheet's four, named once at the left with its shows beside
 * it — the same plate the commissioned index uses. A group with nothing in it
 * renders nothing rather than an empty heading.
 */
function group(name: ShowGroup, shows: readonly Show[], covers: ReadonlyMap<string, ProjectImage>): Html {
  if (!shows.length) return html``;
  return html`<section class="xgroup" data-group="${name}">
    <h2 class="xgroup-name">${name}</h2>
    <div class="xrows">
      ${join(shows.map((s) => row(s, s.slug ? covers.get(s.slug) : undefined)))}
    </div>
  </section>`;
}

/**
 * A row: the show's name, what kind it was and where, and the year at the
 * margin. The sheet gives the index years alone — the months belong to the
 * detail's masthead — and a run that crosses a year states both, stacked.
 *
 * Only some have a page behind them. Those are links and open a panel; the
 * rest are plain elements that still answer to the pointer, so the list reads
 * as one thing rather than as two kinds of row. A link to nothing would be a
 * broken link, and making every row a link to keep them looking alike is the
 * same mistake in a nicer coat.
 *
 * No `aria-label`. One was here once and it quietly dropped the dates: a
 * label replaces the whole subtree, so what a sighted reader sees in its own
 * column was never announced.
 */
function row(s: Show, cover?: ProjectImage): Html {
  // The group above already says what kind of show it was.
  const place = placeOf(s.venue);
  const inner = html`<span class="exh-name">
      <span class="exh-title">${s.title}</span>
      ${s.note ? html`<span class="exh-note">${s.note}</span>` : ''}
      ${place ? html`<span class="exh-venue">${place}</span>` : ''}
    </span>
    <span class="exh-plate" aria-hidden="true">
      ${cover ? responsiveImage({ image: cover, sizes: '(max-width: 899px) 30vw, 13vw', alt: '' }) : ''}
    </span>
    <span class="exh-year">
      ${s.year !== undefined ? html`<span>${s.year}</span>` : ''}
      ${s.yearEnd !== undefined ? html`<span>${s.yearEnd}</span>` : ''}
    </span>`;

  return s.slug
    ? html`<a class="xrow hrow" href="#exhibition-${s.slug}" data-panel-open="exhibition-${s.slug}">${inner}</a>`
    : html`<div class="xrow hrow">${inner}</div>`;
}
