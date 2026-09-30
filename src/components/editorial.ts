import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage, Row } from '../content/types.ts';

export interface EditorialProps {
  readonly title: string;
  readonly year?: number;
  readonly images: readonly ProjectImage[];
  readonly rows: readonly Row[];
}

/**
 * The reading composition, after bofill.com: the text runs down one column and
 * the photograph holds the other.
 *
 * Only one figure shows at a time and which one follows the reader's progress
 * (`client/panel-scroll.ts`), so the picture holds its place on the screen while
 * the words travel past it. `data-multi` marks the case where that is worth
 * arranging: with two or more photographs the figure column claims enough scroll
 * of its own to pin itself (see `.reader-figures` in the stylesheet), and with
 * one there is nothing to move through, so the text governs.
 *
 * The count of photographs sits in the figure column rather than under the
 * title: it belongs to the pictures, and that column is the one that holds still,
 * so it stays in view for as long as it is telling you something.
 *
 * Shared by the exhibition and collaboration panels and by the Colour Chart, so
 * everything that is read rather than browsed is read the same way.
 */
export function editorialBody({ title, year, images, rows }: EditorialProps): Html {
  const text = rows.flatMap((row) => row.columns).filter((column) => column.kind === 'text');

  return html`<div class="reader">
    <div class="reader-text">
      <header class="reader-head">
        <h2 class="reader-title">${title}</h2>
        ${year ? html`<span class="reader-year">${year}</span>` : ''}
      </header>
      ${join(text.map((c) => html`<div class="prose">${raw(c.kind === 'text' ? c.html : '')}</div>`))}
    </div>

    <div class="reader-figures" data-figures ${images.length > 1 ? 'data-multi' : ''} style="--n:${images.length}">
      <div class="reader-sticky">
        <div class="reader-stage">
          ${join(
            images.map(
              (image, i) => html`<figure class="reader-figure${i === 0 ? ' is-current' : ''}">
                ${responsiveImage({ image, sizes: '(max-width: 899px) 92vw, 52vw', priority: i === 0 })}
                ${image.caption ? html`<figcaption>${image.caption}</figcaption>` : ''}
              </figure>`,
            ),
          )}
        </div>
        ${images.length > 1
          ? html`<p class="reader-counter" data-figure-count data-template="{n} / {total}"></p>`
          : ''}
      </div>
    </div>
  </div>`;
}
