import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import { PHONE_MERGED, SHOW_GROUPS, kindOf, phoneOrder, placeOf, rowId, type Show, type ShowGroup } from '../content/exhibitions-list.ts';

/**
 * The exhibitions index, after the designer's layout: one line per show — what
 * it was called and where, when it ran, and the year at the right margin — with
 * a rule between them and nothing else.
 */
export function exhibitionList(shows: readonly Show[], covers: ReadonlyMap<string, ProjectImage>): Html {
  const order = phoneOrder(shows);
  return html`<div class="xlist exh-list">
    <h2 class="sr-only">Exhibitions</h2>
    ${join(SHOW_GROUPS.map((name) => group(name, shows.filter((s) => s.group === name), covers, order)))}
  </div>`;
}

/**
 * A group of the sheet's four, named once at the left with its shows beside it —
 * the same plate the commissioned index uses.
 */
function group(
  name: ShowGroup,
  shows: readonly Show[],
  covers: ReadonlyMap<string, ProjectImage>,
  order: ReadonlyMap<Show, number>,
): Html {
  if (!shows.length) return html``;
  const merged = PHONE_MERGED.includes(name);
  const first = Math.min(...shows.map((s) => order.get(s) ?? 0));
  return html`<section class="xgroup" data-group="${name}"${merged ? raw(' data-phone="merged"') : ''}>
    <h2 class="xgroup-name"${merged ? '' : raw(` style="--phone-order:${first}"`)}>${name}</h2>
    <div class="xrows">
      ${join(shows.map((s) => row(s, order.get(s) ?? 0, covers.get(s.commission ?? s.slug ?? ''))))}
    </div>
  </section>`;
}

/** A row: the show's name, what kind it was and where, and the year at the margin. */
function row(s: Show, order: number, cover?: ProjectImage): Html {
  // The group above already says what kind of show it was — on the desktop.
  const place = placeOf(s.venue);
  const lead = kindOf(s.venue);
  const inner = html`<span class="exh-name">
      <span class="exh-title">${s.title}</span>
      ${s.note ? html`<span class="exh-note">${s.note}</span>` : ''}
      ${lead ? html`<span class="exh-kind">${lead.kind}</span>` : ''}
      ${place ? html`<span class="exh-venue">${lead?.at ? html`<span class="exh-at">at </span>` : ''}${place}</span>` : ''}
    </span>
    <span class="exh-plate" aria-hidden="true">
      ${cover ? responsiveImage({ image: cover, sizes: '(max-width: 899px) 30vw, 13vw', alt: '' }) : ''}
    </span>
    <span class="exh-year">
      ${s.year !== undefined ? html`<span>${s.year}</span>` : ''}
      ${s.yearEnd !== undefined ? html`<span>${s.yearEnd}</span>` : ''}
    </span>`;

  const panel = s.commission ? `commissioned-${s.commission}` : s.slug ? `exhibition-${s.slug}` : undefined;
  return panel
    ? html`<a class="xrow hrow" id="${rowId(s)}" href="#${panel}" data-panel-open="${panel}" style="--phone-order:${order}">${inner}</a>`
    : html`<div class="xrow hrow" id="${rowId(s)}" style="--phone-order:${order}">${inner}</div>`;
}
