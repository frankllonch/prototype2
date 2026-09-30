import { html, join, type Html } from './html.ts';
import { editorialBody } from './editorial.ts';
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
 * and raised over it on demand. The composition inside is the shared reader
 * (`editorial.ts`), the same one the Colour Chart uses.
 *
 * In the markup rather than fetched, so opening one is instant and the text is
 * there for search engines and for readers without scripting, who reach it by
 * the plain `#<kind>-<slug>` anchor and see the figures as an ordinary column.
 */
export function panels(kind: string, items: readonly PanelItem[]): Html {
  return html`<div class="panels">
    ${join(
      items.map(
        (item) => html`<article class="panel" id="${kind}-${item.slug}" data-panel>
          <a class="panel-close" href="#" data-panel-close>Close</a>
          ${editorialBody(item)}
        </article>`,
      ),
    )}
  </div>`;
}
