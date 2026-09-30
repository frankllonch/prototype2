import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage, Row } from '../content/types.ts';

export interface PanelItem {
  readonly slug: string;
  readonly title: string;
  readonly year?: number;
  readonly images: readonly ProjectImage[];
  readonly rows: readonly Row[];
}

/**
 * Detail bodies for exhibitions and collaborations, rendered once into the page
 * and raised over it on demand.
 *
 * The composition is after bofill.com: the text runs down one column and the
 * photograph holds the other. Only one figure shows at a time, and which one
 * follows the reader's progress (`client/panel-scroll.ts`) — so the picture
 * stays put while the words move past it.
 *
 * The figure column is deliberately tall (a slot per photograph) and the stage
 * inside it is sticky. That is where the scroll length comes from: a project
 * whose text is three paragraphs long would otherwise have no runway to move
 * through ten photographs.
 *
 * In the markup rather than fetched, so opening one is instant and the text is
 * there for search engines and for readers without scripting, who reach it by
 * the plain `#<kind>-<slug>` anchor and see the figures as an ordinary column.
 */
export function panels(kind: string, items: readonly PanelItem[]): Html {
  return html`<div class="panels">
    ${join(
      items.map((item) => {
        const text = item.rows.flatMap((row) => row.columns).filter((column) => column.kind === 'text');
        return html`<article class="panel" id="${kind}-${item.slug}" data-panel>
          <a class="panel-close" href="#" data-panel-close>Close</a>
          <div class="panel-inner">
            <div class="panel-text">
              <header class="panel-head">
                <h2 class="panel-title">${item.title}</h2>
                ${item.year ? html`<span class="panel-year">${item.year}</span>` : ''}
                ${item.images.length > 1
                  ? html`<p class="panel-counter" data-figure-count data-template="{n} / {total}"></p>`
                  : ''}
              </header>
              ${join(text.map((c) => html`<div class="prose">${raw(c.kind === 'text' ? c.html : '')}</div>`))}
            </div>

            <div class="panel-figures" data-figures style="--n:${item.images.length}">
              <div class="panel-sticky">
                <div class="panel-stage">
                  ${join(
                    item.images.map(
                      (image, i) => html`<figure class="panel-figure${i === 0 ? ' is-current' : ''}">
                        ${responsiveImage({ image, sizes: '(max-width: 899px) 92vw, 46vw', priority: i === 0 })}
                        ${image.caption ? html`<figcaption>${image.caption}</figcaption>` : ''}
                      </figure>`,
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>`;
      }),
    )}
  </div>`;
}
