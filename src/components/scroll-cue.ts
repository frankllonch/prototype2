import { html, raw, type Html } from './html.ts';

/**
 * The hint that there is more below, on the two pages that open on a full
 * screen of something before the page proper begins.
 *
 * Both of them need it for the same reason: the film and the pile each fill the
 * screen and neither looks like the top of a document, so nothing on the first
 * view says that scrolling is what happens next.
 *
 * A chevron and nothing else, and a button: clicked, it takes the reader on to
 * the next part of the page (Frank, 2026-11-18; client/scroll-cue.ts). Only
 * the chevron itself takes the pointer, so the film and the tiles around it
 * stay clickable, and once the cue has gone it takes nothing at all.
 *
 * `negative` is for the start page, where it crosses the film and is drawn as
 * the inverse of whatever frame is behind it, exactly as the bar's type is.
 * `ink` is the gallery's, where there is nothing behind it but paper.
 */
export function scrollCue(mode: 'ink' | 'negative'): Html {
  return html`<button type="button" class="scroll-cue scroll-cue-${mode}" data-scroll-cue aria-label="Scroll down">
    <svg viewBox="0 0 28 16" aria-hidden="true" focusable="false">
      <path
        d="M1.5 1.5 L14 13 L26.5 1.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="square"
      />
    </svg>
  </button>`;
}

/**
 * The start page's chevron turned on its side, for every viewer's Previous and
 * Next: the same drawing, the same size and the same weight as the scroll cue
 * (Frank, 2026-11-18), so every arrow on the site is one arrow.
 *
 * The cue is 28 across and 16 deep; turned, this is 16 across and 28 tall,
 * with the same three points. Its size and weight are the cue's knobs,
 * `--cue-size` and `--cue-stroke` (00-base.css), applied by `.step-chevron`.
 */
export function stepChevron(by: -1 | 1): Html {
  const d = by < 0 ? 'M14.5 1.5 L3 14 L14.5 26.5' : 'M1.5 1.5 L13 14 L1.5 26.5';
  return raw(
    `<svg class="step-chevron" viewBox="0 0 16 28" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`,
  );
}
