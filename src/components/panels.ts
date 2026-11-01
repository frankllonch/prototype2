import { html, join, type Html } from './html.ts';
import { editorialBody } from './editorial.ts';
import type { ProjectImage, Row } from '../content/types.ts';

export interface PanelItem {
  readonly slug: string;
  readonly title: string;
  readonly year?: number;
  readonly images: readonly ProjectImage[];
  readonly rows: readonly Row[];
  /** Exhibitions carry where and when; collaborations do not. */
  readonly venue?: string;
  readonly from?: string;
  readonly to?: string;
  readonly kind?: string;
}

/**
 * Detail bodies for exhibitions and commissioned work, rendered once into the page
 * and raised over it on demand. The composition inside is the shared reader
 * (`editorial.ts`), the same one the Color Chart uses.
 *
 * In the markup rather than fetched, so opening one is instant and the text is
 * there for search engines and for readers without scripting, who reach it by
 * the plain `#<kind>-<slug>` anchor and see the figures as an ordinary column.
 */
export function panels(kind: string, items: readonly PanelItem[], extra: Html = html``): Html {
  return html`<div class="panels">
    ${join(items.map((item) => panelShell(kind, item.slug, editorialBody(item))))}
    ${extra}
  </div>`;
}

/**
 * The frame a detail sits in, whatever is inside it.
 *
 * Exhibitions come in two kinds now — the ones with a press release to read,
 * and the ones that are only photographs — and both are raised over the page
 * the same way, close the same way and answer to the same client code. Only
 * the body differs, so only the body is passed in.
 */
export function panelShell(kind: string, slug: string, body: Html): Html {
  return html`<article class="panel" id="${kind}-${slug}" data-panel>
    <a class="panel-close" href="#" data-panel-close>Close</a>
    ${body}
  </article>`;
}
