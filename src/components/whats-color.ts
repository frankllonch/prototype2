import { html, join, raw, type Html } from './html.ts';
import { swatchFor, readable, inkOn, type Edition, type Participant } from '../content/whats-color.ts';
import { withBase } from '../content/paths.ts';

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
export function whatsColorNames(
  participants: readonly Participant[],
  within?: string,
): Html {
  // On an edition's own page a name goes to that person's answer further down
  // it; on the opening view it goes to the edition they answered in. Every one
  // of them used to point at `#whats-color`, an id nothing on the site has.
  const target = (p: Participant) =>
    within && p.id
      ? `#${p.id}`
      : withBase(`/whats-color/${(p.edition ?? 'i').toLowerCase()}/`);
  return html`<p class="wc-names">
    ${join(
      participants.map(
        (p, i) => html`${i > 0 ? raw('<span class="wc-sep">, </span>') : ''}<a
          class="wc-name"
          href="${target(p)}"
          style="--swatch: ${swatchFor(p, i)}; --swatch-ink: var(--${inkOn(swatchFor(p, i))})"
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
          href="${withBase(`/whats-color/${edition.numeral.toLowerCase()}/`)}"
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

/**
 * One participant's answer, as the sheet sets it: the name large, what they do
 * ranged right beside it, the colour their answer was given underneath that,
 * and the answer itself below.
 *
 * The colour reference is set in the colour it names — "AC 002 RED BROWN" in a
 * red brown — which is the one place on the site where the swatch is the type
 * rather than behind it. Where the source gives no answer, and for fourteen of
 * edition I's twenty-eight it gives none, the entry is the name and the colour
 * and nothing else. That is what the page has to say.
 */
function answer(p: Participant, index: number): Html {
  const swatch = swatchFor(p, index);
  return html`<article class="wc-answer" id="${p.id ?? ''}">
    <h2 class="wc-answer-name">${p.name}${p.alias ? html`<span class="wc-answer-alias">${p.alias}</span>` : ''}</h2>
    <p class="wc-answer-meta">
      ${p.role ? html`<span class="wc-answer-role">${p.role}</span>` : ''}
      ${p.code
        ? html`<span class="wc-answer-code" style="--swatch: ${readable(swatch)}">
            ${p.code}${p.colourName ? ` ${p.colourName}` : ''}
          </span>`
        : ''}
    </p>
    ${p.answer ? html`<div class="wc-answer-text"><p>${p.answer}</p></div>` : ''}
  </article>`;
}

/**
 * One edition: its numeral, its own names, and its answers.
 *
 * The names run across the top exactly as they do on the opening view, only
 * narrowed to this edition — the same object, filtered, so moving between the
 * two reads as the list closing in rather than as a different page.
 *
 * The answers flow down three columns independently rather than sitting in a
 * row-aligned grid, which is how the sheet lays them out: entries in adjacent
 * columns begin at unrelated heights there, which only happens when each
 * column is filled in turn.
 */
export function whatsColorEdition(edition: Edition): Html {
  return html`<div class="wc wc-edition">
    <p class="wc-numeral" aria-hidden="true">(${edition.numeral})</p>
    <h1 class="sr-only">What&rsquo;s Color? (${edition.numeral})</h1>
    ${whatsColorNames(edition.participants, edition.numeral)}

    <div class="wc-edition-intro">${raw(edition.statement)}</div>

    ${edition.participants.some((p) => p.answer)
      ? html`<div class="wc-answers">${join(edition.participants.map(answer))}</div>`
      : html`<p class="wc-answers-none">
          The source for this edition names everyone who took part but keeps no
          record of what they answered.
        </p>`}

    <p class="wc-back"><a href="${withBase('/')}">All of What&rsquo;s Color?</a></p>
  </div>`;
}
