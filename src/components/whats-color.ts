import { html, join, raw, type Html } from './html.ts';
import { swatchFor, type Edition, type Participant } from '../content/whats-color.ts';

/**
 * The opening view of What's Color?: everyone who has answered, in one run,
 * and the three editions introduced beneath.
 *
 * The names are set as a paragraph because that is what they are — a sentence
 * of people, read across rather than down. They are links all the same, so a
 * keyboard reaches every one in reading order, but they are not a list: a
 * screen reader announcing seventy-three list items would be describing a
 * structure the page does not have.
 *
 * Hovering a name brings up the colour that person's answer was given. The
 * colour rides on the element as a custom property so the stylesheet owns how
 * it is used, and the hover is pure CSS — deliberately not the `hover-list`
 * mechanism the two indexes share, which assigns a rotating colour on
 * pointerenter and would overwrite a fixed one.
 */
export function whatsColorNames(participants: readonly Participant[]): Html {
  return html`<p class="wc-names">
    ${join(
      participants.map(
        (p, i) => html`${i > 0 ? raw('<span class="wc-sep">, </span>') : ''}<a
          class="wc-name"
          href="#whats-color"
          style="--swatch: ${swatchFor(p, i)}"
        >${p.name}</a>`,
      ),
    )}
  </p>`;
}

/**
 * The three introductions, across the foot of the view.
 *
 * Ordered I, II, III left to right, which is the designer's order here and the
 * opposite of the newest-first the rest of the site keeps: these are chapters
 * of one project rather than a list of work, and chapters are read forwards.
 *
 * Each column is the handle for its edition — clicking one narrows the names
 * above to that edition's and brings up the answers — so the whole column is
 * the control rather than a link tacked under it. What you are pointing at
 * when you decide to read one is the writing itself.
 */
export function whatsColorIntros(editions: readonly Edition[]): Html {
  const forwards = [...editions].reverse();
  return html`<div class="wc-intros">
    ${join(
      forwards.map(
        (edition) => html`<a
          class="wc-intro"
          href="/whats-color/${edition.numeral.toLowerCase()}/"
          data-edition="${edition.numeral}"
        >
          <h2 class="wc-intro-title">What&rsquo;s Color? <sup>(${edition.numeral})</sup></h2>
          <div class="wc-intro-text">${raw(edition.intro)}</div>
        </a>`,
      ),
    )}
  </div>`;
}

/** The opening view entire. */
export function whatsColorOpening(
  participants: readonly Participant[],
  editions: readonly Edition[],
): Html {
  return html`<div class="wc">
    ${whatsColorNames(participants)}
    ${whatsColorIntros(editions)}
  </div>`;
}
