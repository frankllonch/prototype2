import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import type { Show } from '../content/exhibitions-list.ts';

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
    <div class="xrows">
      ${join(shows.map((s) => row(s, s.slug ? covers.get(s.slug) : undefined)))}
    </div>
  </div>`;
}

/**
 * A row names the show and where it was, then when, then the year.
 *
 * Only a few of them have a page behind them yet. Those are links and open a
 * panel; the rest are plain elements that still answer to the pointer, so the
 * list reads as one thing rather than as two kinds of row. A link to nothing
 * would be a broken link, and making every row a link to keep them looking
 * alike is the same mistake in a nicer coat.
 *
 * No `aria-label`. One was here once and it quietly dropped the dates: a label
 * replaces the whole subtree, so what a sighted reader sees in its own column
 * was never announced.
 */
function row(s: Show, cover?: ProjectImage): Html {
  const inner = html`<span class="exh-name">
      <span class="exh-title">${s.title}</span>
      ${s.venue ? html`<span class="exh-venue">${s.venue}</span>` : ''}
    </span>
    <span class="exh-plate" aria-hidden="true">
      ${cover ? responsiveImage({ image: cover, sizes: '(max-width: 899px) 30vw, 13vw', alt: '' }) : ''}
    </span>
    <span class="exh-when">
      ${s.from ? html`<span>${s.to ? `From ${s.from}` : s.from}</span>` : ''}
      ${s.to ? html`<span>To ${s.to}</span>` : ''}
    </span>
    <span class="exh-year">
      <span>${s.year}</span>
      ${s.yearEnd !== undefined ? html`<span>${s.yearEnd}</span>` : ''}
    </span>`;

  return s.slug
    ? html`<a class="xrow hrow" href="#exhibition-${s.slug}" data-panel-open="exhibition-${s.slug}">${inner}</a>`
    : html`<div class="xrow hrow">${inner}</div>`;
}
