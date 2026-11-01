import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import type { Show } from '../content/exhibitions-list.ts';

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
 */
export function platesBody(show: Show, images: readonly ProjectImage[]): Html {
  const when = [
    show.from && show.to ? `From ${show.from} to ${show.to}` : show.from ?? '',
    String(show.year),
  ].filter(Boolean).join(' ');

  return html`<div class="plates" data-reader>
    <header class="plates-head">
      <h2 class="sheet-title">${show.title}</h2>
      ${show.venue ? html`<p class="sheet-lines">${show.venue}</p>` : ''}
      <p class="sheet-when">${when}</p>
    </header>

    <div class="plates-stage" data-figures>
      <div class="plates-frame">
        ${join(
          images.map(
            (image, i) => html`<figure class="reader-figure plates-figure${i === 0 ? ' is-current' : ''}">
              ${responsiveImage({ image, sizes: '(max-width: 899px) 92vw, 57vw', priority: i === 0 })}
            </figure>`,
          ),
        )}
      </div>
    </div>

    ${images.length > 1
      ? html`<button type="button" class="plates-step plates-prev" data-figure-step="-1" aria-label="Previous photograph">
          ${chevron('M8 1 1 8l7 7')}
        </button>
        <button type="button" class="plates-step plates-next" data-figure-step="1" aria-label="Next photograph">
          ${chevron('m1 1 7 7-7 7')}
        </button>
        <p class="sr-only" data-figure-count data-template="Photograph {n} of {total}" aria-live="polite"></p>`
      : ''}
  </div>`;
}

/** The same mark the read-and-looked-at sheet uses, so the two agree. */
function chevron(d: string): Html {
  return raw(
    `<svg viewBox="0 0 9 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  );
}
