import { html, type Html } from './html.ts';

/**
 * The hint that there is more below, on the two pages that open on a full
 * screen of something before the page proper begins.
 *
 * Both of them need it for the same reason: the film and the pile each fill the
 * screen and neither looks like the top of a document, so nothing on the first
 * view says that scrolling is what happens next.
 *
 * A chevron and nothing else. It is decorative and `aria-hidden` — a reader
 * that is not looking at the screen is told the page's length by the page, and
 * the cue would only be a stray graphic in the middle of it. It is not a button
 * either: it reports where to go rather than going there, so it takes no
 * pointer events and leaves the film and the tiles beneath it clickable.
 *
 * `negative` is for the start page, where it crosses the film and is drawn as
 * the inverse of whatever frame is behind it, exactly as the bar's type is.
 * `ink` is the gallery's, where there is nothing behind it but paper.
 */
export function scrollCue(mode: 'ink' | 'negative'): Html {
  return html`<div class="scroll-cue scroll-cue-${mode}" data-scroll-cue aria-hidden="true">
    <svg viewBox="0 0 28 16" focusable="false">
      <path
        d="M1.5 1.5 L14 13 L26.5 1.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="square"
      />
    </svg>
  </div>`;
}
