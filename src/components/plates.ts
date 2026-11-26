import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import { stepChevron } from './scroll-cue.ts';
import { wide } from './sheet.ts';
import type { ProjectImage } from '../content/types.ts';
import { placeOf, type Show } from '../content/exhibitions-list.ts';

/** The second sheet: a show that is photographs and nothing else. */
export function platesBody(show: Show, images: readonly ProjectImage[], head: Partial<PlatesHead> = {}): Html {
  // As on the index: the kind of show is the group, not the location.
  const place = placeOf(show.venue);
  const when = [
    show.from && show.to ? `From ${show.from} to ${show.to}` : show.from ?? '',
    String(show.year),
  ].filter(Boolean).join(' ');
  return plates({ title: show.title, place, when, ...head }, images);
}

/** The same sheet, told its masthead instead of working it out from a show. */
export interface PlatesHead {
  readonly title: string;
  /** Where it was, or who it is of. Left out when there is nothing to say. */
  readonly place?: string;
  /** The same, as the sheet breaks it into lines; wins over `place`. */
  readonly lines?: readonly string[];
  /** A short caption under the date (El color no existe). */
  readonly note?: string;
  /** When. Likewise. */
  readonly when?: string;
}

export function plates({ title, place, lines, when, note }: PlatesHead, images: readonly ProjectImage[]): Html {
  const rows = lines?.length ? lines : place ? [place] : [];
  return html`<div class="plates" data-reader>
    <header class="plates-head">
      <h2 class="sheet-title">${join(title.split('\n').map((t, i) => (i ? html`<br />${t}` : html`${t}`)))}</h2>
      ${rows.length ? html`<p class="sheet-lines">${join(rows.map((line, i) => (i ? html`<br />${line}` : html`${line}`)))}</p>` : ''}
      ${when ? html`<p class="sheet-when">${when}</p>` : ''}
      ${note ? html`<p class="plates-note">${note}</p>` : ''}
    </header>

    <div class="plates-stage" data-figures>
      <div class="plates-frame">
        ${join(
          images.map(
            (image, i) => html`<figure class="reader-figure plates-figure${wide(image) ? ' is-wide' : ''}${i === 0 ? ' is-current' : ''}">
              ${responsiveImage({ image, sizes: '(max-width: 899px) 92vw, 57vw', priority: i === 0 })}
            </figure>`,
          ),
        )}
      </div>
    </div>

    ${images.length > 1
      ? html`<button type="button" class="plates-step plates-prev" data-figure-step="-1" aria-label="Previous photograph">
          ${stepChevron(-1)}
        </button>
        <button type="button" class="plates-step plates-next" data-figure-step="1" aria-label="Next photograph">
          ${stepChevron(1)}
        </button>
        <p class="sr-only" data-figure-count data-template="Photograph {n} of {total}" aria-live="polite"></p>`
      : ''}
  </div>`;
}

