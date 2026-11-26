import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import { stepChevron } from './scroll-cue.ts';
import type { ProjectImage } from '../content/types.ts';

export interface SheetProps {
  readonly title: string;
  /** What qualifies the title — who it was for, where — one entry per line. */
  readonly lines: readonly string[];
  readonly when: string;
  /** The text, already marked up. */
  readonly body: Html;
  readonly images: readonly ProjectImage[];
  /** A group show's artists, set where the lede would be (show-sheets.ts). */
  readonly artists?: string;
  /** Marks the sheet as an exhibition's, for the placing only shows use. */
  readonly kind?: 'show';
}

/**
 * A detail that is read and looked at, on the designer's sheet: the masthead at
 * the top left, the text under it, the photograph holding the right of the
 * screen with an arrow either side.
 */
export function sheetBody({ title, lines, when, body, images, artists, kind }: SheetProps): Html {
  return html`<div class="sheet${kind ? ` is-${kind}` : ''}" data-reader data-sheet>
    <header class="sheet-head">
      <h2 class="sheet-title">${title}</h2>
      ${lines.length
        ? html`<p class="sheet-lines">${join(lines.map((line, i) => (i ? html` <br class="sheet-br" />${line}` : html`${line}`)))}</p>`
        : ''}
      ${when ? html`<p class="sheet-when">${when}</p>` : ''}
    </header>

    <div class="sheet-text" data-sheet-text tabindex="-1">
      <div class="sheet-prose${artists ? ' has-artists' : ''}">${artists ? html`<p class="sheet-artists">${artists}</p>` : ''}${body}</div>
    </div>

    <button
      type="button" class="sheet-more" data-expand="text"
      aria-pressed="false" aria-label="Read the whole text"
    ><svg viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="16.75" />
        <circle class="sheet-dot" cx="11.5" cy="18" r="2" />
        <circle class="sheet-dot" cx="18" cy="18" r="2" />
        <circle class="sheet-dot" cx="24.5" cy="18" r="2" />
      </svg></button>

    ${images.length
      ? html`<div class="sheet-stage" data-figures>
          <div class="sheet-frame">
            ${join(
              images.map(
                (image, i) => html`<figure class="reader-figure sheet-figure${wide(image) ? ' is-wide' : ''}${i === 0 ? ' is-current' : ''}">
                  ${responsiveImage({ image, sizes: '(max-width: 899px) 92vw, 40vw', priority: i === 0 })}
                </figure>`,
              ),
            )}
          </div>
          ${images.length > 1
            ? html`<button type="button" class="sheet-step sheet-prev" data-figure-step="-1" aria-label="Previous photograph">
                ${stepChevron(-1)}
              </button>
              <button type="button" class="sheet-step sheet-next" data-figure-step="1" aria-label="Next photograph">
                ${stepChevron(1)}
              </button>
              <p class="sr-only" data-figure-count data-template="Photograph {n} of {total}" aria-live="polite"></p>`
            : ''}
        </div>`
      : ''}
  </div>`;
}

/** A photograph clearly wider than it is tall. */
export const wide = (image: ProjectImage): boolean => image.width > image.height * 1.1;

