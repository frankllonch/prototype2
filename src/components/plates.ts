import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import type { Show } from '../content/exhibitions-list.ts';

/**
 * The detail for a show that has photographs and no words.
 *
 * Most of the record Claudia sent is like this: a title, where it was, when,
 * and a handful of pictures. There is no press release to read, so there is no
 * reading column — the masthead stands at the left and the photograph holds the
 * middle of the screen, one at a time, turned by the arrows beside it.
 *
 * Nothing here scrolls. The panel is sized to the window and the picture is
 * fitted inside what is left after the masthead, so a show is looked at rather
 * than read down. The other kind of detail — the ones that came from the site,
 * with a press release — keeps its scrolling text column.
 *
 * The markup deliberately reuses `data-reader`, `data-figures` and
 * `data-figure-step`, which is what `client/figures.ts` already drives. A
 * second mechanism for turning pictures would be a second thing to keep in
 * step with the first.
 */
export function platesBody(show: Show, images: readonly ProjectImage[]): Html {
  const when = [
    show.from && show.to ? `From ${show.from} to ${show.to}` : show.from ?? '',
    String(show.year),
  ].filter(Boolean).join(' ');

  return html`<div class="plates" data-reader>
    <header class="reader-head plates-head">
      <h2 class="reader-title">${show.title}</h2>
      ${show.venue ? html`<p class="reader-venue">${show.venue}</p>` : ''}
      <p class="reader-when plates-when">${when}</p>
    </header>

    <div class="plates-stage" data-figures>
      <div class="plates-frame">
        ${join(
          images.map(
            (image, i) => html`<figure class="reader-figure plates-figure${i === 0 ? ' is-current' : ''}">
              ${responsiveImage({ image, sizes: '(max-width: 899px) 92vw, 56vw', priority: i === 0 })}
            </figure>`,
          ),
        )}
      </div>

      ${images.length > 1
        ? html`<button type="button" class="plates-step plates-prev" data-figure-step="-1" aria-label="Previous photograph">
            <span aria-hidden="true">&lsaquo;</span>
          </button>
          <button type="button" class="plates-step plates-next" data-figure-step="1" aria-label="Next photograph">
            <span aria-hidden="true">&rsaquo;</span>
          </button>
          <p class="plates-count" data-figure-count data-template="{n} / {total}"></p>`
        : ''}
    </div>
  </div>`;
}
