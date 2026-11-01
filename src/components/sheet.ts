import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';

export interface SheetProps {
  readonly title: string;
  /** What qualifies the title — who it was for, where — one entry per line. */
  readonly lines: readonly string[];
  readonly when: string;
  /** The text, already marked up. */
  readonly body: Html;
  readonly images: readonly ProjectImage[];
}

/**
 * A detail that is read and looked at, on the designer's sheet: the masthead
 * at the top left, the text under it, the photograph holding the right of the
 * screen with an arrow either side.
 *
 * It is the same sheet as the exhibitions that have a text to read — Moll de
 * l’Ós is drawn exactly so — and is written to serve both: nothing in here
 * knows what kind of thing it is showing.
 *
 * Nothing on it scrolls but the text. The panel is the window's height, the
 * masthead and the photograph are held where they are, and the text runs in
 * its own column underneath; a wheel turned anywhere on the sheet moves the
 * text (`client/sheets.ts`), since that is the only thing there is to move.
 *
 * The round button beside the text gives it the whole sheet: the masthead
 * folds into one line across the top and the photograph is put away until the
 * button is pressed again.
 *
 * The markup reuses `data-reader`, `data-figures`, `.reader-figure`,
 * `data-figure-step` and `data-expand`, which is what `client/figures.ts`
 * already drives — the arrows, the arrow keys and the widening all come from
 * there, the same as on every other detail.
 */
export function sheetBody({ title, lines, when, body, images }: SheetProps): Html {
  return html`<div class="sheet" data-reader data-sheet>
    <header class="sheet-head">
      <h2 class="sheet-title">${title}</h2>
      ${lines.length
        ? html`<p class="sheet-lines">${join(lines.map((line, i) => (i ? html`<br />${line}` : html`${line}`)))}</p>`
        : ''}
      ${when ? html`<p class="sheet-when">${when}</p>` : ''}
    </header>

    <div class="sheet-text" data-sheet-text tabindex="-1">
      <div class="sheet-prose">${body}</div>
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
                ${chevron('M8 1 1 8l7 7')}
              </button>
              <button type="button" class="sheet-step sheet-next" data-figure-step="1" aria-label="Next photograph">
                ${chevron('m1 1 7 7-7 7')}
              </button>
              <p class="sr-only" data-figure-count data-template="Photograph {n} of {total}" aria-live="polite"></p>`
            : ''}
        </div>`
      : ''}
  </div>`;
}

/**
 * A photograph clearly wider than it is tall. The sheets hang those from the
 * line the text starts on, at a reading size, rather than filling the frame;
 * portraits and squares fill it. Decided here from the picture's own size, so
 * WordPress (sheet.php) decides it the same way from the same picture.
 */
export const wide = (image: ProjectImage): boolean => image.width > image.height * 1.1;

/** The sheet's arrow: a hairline chevron, eight wide and fifteen tall at 1920. */
function chevron(d: string): Html {
  return raw(
    `<svg viewBox="0 0 9 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  );
}
