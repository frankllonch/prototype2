import { html, raw, type Html } from './html.ts';

/**
 * The hint that there is more below, on the two pages that open on a full screen
 * of something before the page proper begins.
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
 * Next: the same drawing, the same size and the same weight as the scroll cue,
 * so every arrow on the site is one arrow.
 */
export function stepChevron(by: -1 | 1): Html {
  const d = by < 0 ? 'M14.5 1.5 L3 14 L14.5 26.5' : 'M1.5 1.5 L13 14 L1.5 26.5';
  return raw(
    `<svg class="step-chevron" viewBox="0 0 16 28" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`,
  );
}
