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
 * Detail bodies for exhibitions and commissioned work, rendered once into the
 * page and raised over it on demand.
 */
export function panels(kind: string, items: readonly PanelItem[], extra: Html = html``): Html {
  return html`<div class="panels">
    ${join(items.map((item) => panelShell(kind, item.slug, editorialBody(item))))}
    ${extra}
  </div>`;
}

/** The frame a detail sits in, whatever is inside it. */
export function panelShell(kind: string, slug: string, body: Html): Html {
  return html`<article class="panel" id="${kind}-${slug}" data-panel>
    <a class="panel-close" href="#" data-panel-close>Close</a>
    ${body}
  </article>`;
}
