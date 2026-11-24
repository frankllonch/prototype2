import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import { stepChevron } from './scroll-cue.ts';
import { wide } from './sheet.ts';
import type { ProjectImage } from '../content/types.ts';
import { placeOf, type Show } from '../content/exhibitions-list.ts';

/**
 * The second sheet: a show that is photographs and nothing else.
 *
 * Most of what Claudia sent from the archive is like this — a title, where it
 * was, when, and a handful of pictures, with no press release behind it. The
 * designer draws those differently from the shows that have a text: there is
 * no reading column, the masthead stands alone in the top left, and the
 * photograph takes the middle of the frame rather than the right of it.
 *
 * Measured across all eleven of her sheets for this kind. They agree: the
 * masthead's ink begins 48px from the left and 50 down, and the photograph's
 * box is centred on the frame — 49 to 50 per cent on every one of them —
 * 1087 wide, opening 91 down and closing 93 from the bottom. The tops and
 * bottoms that vary between sheets are the pictures letterboxing inside that
 * one box, not different boxes.
 *
 * The masthead uses the sheet's own type classes, so the two kinds of detail
 * are set identically and only their placing differs.
 *
 * The markup reuses `data-reader`, `data-figures`, `.reader-figure` and
 * `data-figure-step`, which `client/figures.ts` already drives — so the
 * arrows and the arrow keys come from there, as on every other detail.
 *
 * A landscape is marked `is-wide`, by the same test the other sheet makes.
 * Nothing on a desktop reads it: there every photograph is fitted to the one
 * box. On a phone the photographs stand in a column, and a landscape takes
 * its width where a portrait is set narrower (07-sheet.css).
 */
export function platesBody(show: Show, images: readonly ProjectImage[], head: Partial<PlatesHead> = {}): Html {
  // As on the index: the kind of show is the group, not the location.
  const place = placeOf(show.venue);
  const when = [
    show.from && show.to ? `From ${show.from} to ${show.to}` : show.from ?? '',
    String(show.year),
  ].filter(Boolean).join(' ');
  return plates({ title: show.title, place, when, ...head }, images);
}

/**
 * The same sheet, told its masthead instead of working it out from a show.
 *
 * Not everything that is photographs and nothing else is an exhibition: the
 * colour chart's own are of the thing in use, with no venue and no dates, and
 * they are read exactly the way a show's are — one in the middle of the frame,
 * an arrow either side. Everything below the masthead was already indifferent
 * to what it was showing; this is only the two lines above it saying so.
 */
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

