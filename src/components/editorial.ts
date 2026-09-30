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
 * (`client/panel-scroll.ts`), so the picture stays put while the words move past
 * it. The figure column is given a little height of its own — enough that a
 * short text still has somewhere to move through its photographs — but the text
 * governs whenever it is the longer of the two, so the two columns run out
 * together rather than the images outlasting the words.
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
        ${images.length > 1
          ? html`<p class="reader-counter" data-figure-count data-template="{n} / {total}"></p>`
          : ''}
      </header>
      ${join(text.map((c) => html`<div class="prose">${raw(c.kind === 'text' ? c.html : '')}</div>`))}
    </div>

    <div class="reader-figures" data-figures style="--n:${images.length}">
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
      </div>
    </div>
  </div>`;
}
