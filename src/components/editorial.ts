import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage, Row } from '../content/types.ts';

export interface EditorialProps {
  readonly title: string;
  readonly year?: number;
  readonly images: readonly ProjectImage[];
  readonly rows: readonly Row[];
  /** An exhibition states where and when, in the same hand as the index. */
  readonly venue?: string;
  readonly from?: string;
  readonly to?: string;
  readonly kind?: string;
}

/**
 * The reading composition: the text runs down one column and the photograph
 * holds the other.
 *
 * In a panel the pictures are turned by hand, with arrows under them. They used
 * to change as you scrolled, which read well while the text was the thing you
 * were following, but it means the reader cannot go back and cannot stay — and
 * looking at the photographs is half of why anyone opens an exhibition. The
 * Color Chart keeps the scrolling version, because it is a page you read
 * through rather than a thing you look at.
 *
 * Either column can take the whole width: the text alone, for reading, or the
 * pictures alone, centred, for looking. One at a time, and never both, so there
 * is always something to come back to.
 *
 * Shared by the exhibition and commissioned panels and by the Color Chart, so
 * everything that is read rather than browsed is read the same way.
 */
export function editorialBody({ title, year, images, rows, venue, from, to, kind }: EditorialProps): Html {
  const text = rows.flatMap((row) => row.columns).filter((column) => column.kind === 'text');
  // An exhibition opens on its own facts, set as the index sets them, so the row
  // you clicked and the page it opens read as the same object.
  const stated = Boolean(venue || from || kind);

  return html`<div class="reader${stated ? ' reader-stated' : ''}" data-reader>
    <span class="reader-mark reader-mark-start" aria-hidden="true"></span>
    <span class="reader-mark reader-mark-end" aria-hidden="true"></span>

    <div class="reader-text">
      <button
        type="button" class="reader-expand" data-expand="text"
        aria-pressed="false" aria-label="Show the text on its own"
      ><span aria-hidden="true"></span></button>
      <header class="reader-head">
        <h2 class="reader-title">${title}</h2>
        ${venue ? html`<p class="reader-venue">${venue}</p>` : ''}
        ${kind ? html`<p class="reader-kind">${kind}</p>` : ''}
        ${stated
          ? html`<p class="reader-when">
              ${from && to
                ? html`<span class="exh-span"><span class="exh-lead">From</span> <em>${from}</em></span>
                  <span class="exh-span"><span class="exh-lead">To</span> <em>${to}</em></span>`
                : from ? html`<em>${from}</em>` : ''}
              ${year ? html`<span class="reader-when-year">${year}</span>` : ''}
            </p>`
          : year ? html`<span class="reader-year">${year}</span>` : ''}
      </header>
      ${join(text.map((c) => html`<div class="prose">${raw(c.kind === 'text' ? c.html : '')}</div>`))}
    </div>

    <div class="reader-figures" data-figures ${images.length > 1 ? 'data-multi' : ''} style="--n:${images.length}">
      ${images.length
        ? html`<button
            type="button" class="reader-expand" data-expand="figures"
            aria-pressed="false" aria-label="Show the images on their own"
          ><span aria-hidden="true"></span></button>`
        : ''}
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
          ? html`<nav class="reader-nav" aria-label="Images">
              <button type="button" class="reader-step" data-figure-step="-1" aria-label="Previous image">
                <span aria-hidden="true">&#8592;</span>
              </button>
              <p class="reader-counter" data-figure-count data-template="{n} / {total}"></p>
              <button type="button" class="reader-step" data-figure-step="1" aria-label="Next image">
                <span aria-hidden="true">&#8594;</span>
              </button>
            </nav>`
          : ''}
      </div>
    </div>
  </div>`;
}
