import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';

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
export function exhibitionList(items: readonly ExhibitionRow[]): Html {
  return html`<div class="xlist">
    <section class="xgroup">
      <h2 class="xgroup-name">Exhibitions</h2>
      <div class="xrows">
        ${join(items.map(row))}
      </div>
    </section>
  </div>`;
}


function row(item: ExhibitionRow): Html {
  /*
   * No `aria-label`. One was here and it quietly dropped the dates: a label
   * replaces the whole subtree, so what a sighted reader sees in its own column
   * was never announced. Letting the name compute from the visible text says
   * everything the row says, and cannot drift away from it later. The
   * photograph is `aria-hidden`, so it adds nothing to that name.
   */
  return html`<a
    class="xrow hrow"
    href="#exhibition-${item.slug}"
    data-panel-open="exhibition-${item.slug}"
  >
    <span class="xrow-title">${item.title}</span>
    <span class="exh-plate" aria-hidden="true">
      ${item.cover
        ? responsiveImage({ image: item.cover, sizes: '(max-width: 899px) 30vw, 13vw', alt: '' })
        : ''}
    </span>
    <span class="xrow-when">${item.year ?? ''}</span>
  </a>`;
}
