import { html, join, raw, type Html } from './html.ts';
import { slider } from './slider.ts';
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
 * and raised over it on demand: the photographs in a slide-through, the text
 * beneath. In the markup rather than fetched, so opening one is instant and the
 * text is present for search engines and for readers without scripting, who
 * reach it through the plain `#<kind>-<slug>` anchor.
 */
export function panels(kind: string, items: readonly PanelItem[]): Html {
  return html`<div class="panels">
    ${join(
      items.map((item) => {
        const text = item.rows.flatMap((row) => row.columns).filter((column) => column.kind === 'text');
        return html`<article class="panel" id="${kind}-${item.slug}" data-panel>
          <header class="panel-head">
            <h2 class="panel-title">${item.title}</h2>
            ${item.year ? html`<span class="panel-year">${item.year}</span>` : ''}
            <a class="panel-close" href="#" data-panel-close>Close</a>
          </header>
          ${slider({ images: item.images, counter: '{n} of {total}', previous: 'Previous', next: 'Next' })}
          <div class="panel-text">
            ${join(text.map((column) => html`<div class="prose">${raw(column.kind === 'text' ? column.html : '')}</div>`))}
          </div>
        </article>`;
      }),
    )}
  </div>`;
}
