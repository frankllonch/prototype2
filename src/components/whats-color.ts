import { html, join, raw, type Html } from './html.ts';
import { stepChevron } from './scroll-cue.ts';
import { LEAD, swatchFor, inkOn, type Edition, type Participant } from '../content/whats-color.ts';
import { withBase } from '../content/paths.ts';
import { ABOUT_CARD, ABOUT_COPYRIGHT } from '../content/about.ts';
import {
  SHEET_I,
  SHEET_II,
  SHEET_III,
  type ChartBar,
  type Plate,
  type SheetSlot,
} from '../content/whats-color-sheet.ts';

/** The editions with a colour chart at their foot, by numeral. */
const CHARTS: Record<string, readonly ChartBar[] | undefined> = {};

/** The editions the designer composed by hand, by numeral. */
const SHEETS: Record<string, readonly SheetSlot[] | undefined> = {
  I: SHEET_I,
  II: SHEET_II,
  III: SHEET_III,
};

/**
 * The opening view of What's Color?: everyone who has answered, in one run, and
 * the three editions introduced beneath.
 */
export function whatsColorNames(
  participants: readonly Participant[],
  within?: string,
): Html {
  // On an edition's own page a name goes to that person's answer further down it; on the opening
  // view it goes to the edition they answered in.
  const target = (p: Participant) =>
    within && p.id
      ? `#${p.id}`
      : withBase(`/whats-color/${(p.edition ?? 'i').toLowerCase()}/`) + (p.id ? `#${p.id}` : '');
  return html`<p class="wc-names">
    ${join(
      participants.map((p, i) => {
        const sep = i > 0 ? raw('<span class="wc-sep">, </span>') : '';
        const paint = `--swatch: ${swatchFor(p)}; --swatch-ink: var(--${inkOn(swatchFor(p))})`;
        // A name with no answer has no entry to point at.
        if (within && !p.id) {
          return html`${sep}<span class="wc-name" style="${paint}">${p.name}</span>`;
        }
        return html`${sep}<a class="wc-name" href="${target(p)}" style="${paint}">${p.name}</a>`;
      }),
    )}
  </p>`;
}
/** The opening view entire. */
export function whatsColorOpening(editions: readonly Edition[]): Html {
  return html`<div class="wc" id="whats-color">
    <!--
      The title the film gives way to. Decorative and hidden from the reading
      order: the page already has its heading, and announcing the same words
      twice would only make a screen reader say them twice.
    -->
    <!--
      The whole opening — the name of the project and the note under it —
      rides up from behind the film as one. Only the title is kept out of the
      reading order: the page already carries its heading, and the note is
      real text that has to be read.
    -->
    ${writeOn(LEAD)}
    ${join(editions.map(namesOfEdition))}
    ${whatsColorTexts(editions)}
  </div>`;
}

/**
 * The three editions' writing, at the foot of the opening view, the way the
 * start-page sheets set it: each a full-width block.
 */
function whatsColorTexts(editions: readonly Edition[]): Html {
  return html`<section class="wc-texts" aria-label="About the three editions">
    ${join(editions.map(openingText))}
  </section>`;
}

function openingText(edition: Edition): Html {
  const opening = edition.opening;
  if (!opening) return html``;
  const href = withBase(`/whats-color/${edition.numeral.toLowerCase()}/`);
  const head = html`<p class="wc-text-head"><a href="${href}">${opening.heading}</a></p>`;
  const teaser = opening.teaser.map(
    (para, i) =>
      html`<p>
        ${para}${i === opening.teaser.length - 1
          ? html` <button type="button" class="wc-more" aria-expanded="false">
              Read more...
            </button>`
          : ''}
      </p>`,
  );
  return html`<div
    class="wc-text"
    data-edition="${edition.numeral.toLowerCase()}"
    style="--wc-text-align: ${opening.align}"
  >
    <div class="wc-text-closed">${head}${join(teaser)}</div>
    <div class="wc-text-open">
      ${head}${join(
        opening.full.map(
          (para, i) =>
            html`<p>
              ${para}${i === opening.full.length - 1
                ? html` <button type="button" class="wc-less">Read less</button>`
                : ''}
            </p>`,
        ),
      )}
    </div>
  </div>`;
}

/** One edition's people, under its numeral. */

/** The note, written as you scroll. */
function writeOn(text: string): Html {
  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim().split(/\s+/));
  const words = paragraphs.flat();
  /** Screens of height the section spends; one is shown, the rest written. */
  const SCREENS = 2.4;
  /** The cover timeline's whole travel, in screens of scroll. */
  const COVER = SCREENS + 1;
  /**
   * The writing starts the moment the stage pins — never before, so the sentence
   * only ever exists at the fixed centre of the view and no word appears while
   * the paragraph is still travelling.
   */
  const START = 1;
  /** And ends at 85% of the pinned stretch; the last 15% is the held beat. */
  const END = 1 + 0.85 * (SCREENS - 1);
  const marked = (w: string) => w.length > 1 && /[A-Z]/.test(w) && w === w.toUpperCase();
  // The question arrives a little slower than any other word — and then the writing stops dead.
  const weights: number[] = words.map((w) => (marked(w) ? 3 : 1));
  const ask = words.findIndex(marked);
  if (ask > 0) weights[ask - 1] = 2;
  const lastAsk = words.map(marked).lastIndexOf(true);
  const PAUSE = 14;
  const total = weights.reduce((a, b) => a + b, 0) + (lastAsk >= 0 ? PAUSE : 0);
  let at = 0;
  let i = 0;
  const word = (w: string, last: boolean): Html => {
    const n = i++;
    const from = START + (at / total) * (END - START);
    at += weights[n] ?? 1;
    if (n === lastAsk) at += PAUSE;
    const width = ((weights[n] ?? 1) / total) * (END - START) * 2.3;
    const to = Math.min(from + width, END + 0.04);
    const joined = marked(w) && !last && marked(words[n + 1] ?? '');
    const parts = marked(w) ? /^(.*?)([.,:;]*)$/.exec(w) : null;
    const mark = parts
      ? html`<mark
          class="wc-ask${n === 0 || !marked(words[n - 1] ?? '') ? ' wc-ask-start' : ''}${joined ? '' : ' wc-ask-end'}"
        >${parts[1] ?? ''}${joined ? '\u00a0' : ''}</mark>${parts[2] ?? ''}`
      : w;
    return html`<span
      class="wc-word"
      style="animation-range: cover ${((from / COVER) * 100).toFixed(2)}% cover ${((to / COVER) * 100).toFixed(2)}%"
    >${mark}</span>`;
  };
  return html`<section class="wc-write">
    <div class="wc-write-pin">
      <div class="wc-lead-block">
        ${join(
          paragraphs.map(
            (ws, p) => html`<p class="wc-lead${p > 0 && p === paragraphs.length - 1 ? ' wc-lead-call' : ''}">${join(
              ws.map((w, k) => {
                const last = k === ws.length - 1;
                const joinedOn = marked(w) && !last && marked(ws[k + 1] ?? '');
                // The last two words are held together, so a paragraph never ends on one word
                // stranded at the left of a justified block; joined words already carry their
                // space inside the colour.
                const gap = last || joinedOn ? '' : k === ws.length - 2 ? raw('&nbsp;') : ' ';
                return html`${word(w, last)}${gap}`;
              }),
            )}</p>`,
          ),
        )}
      </div>
    </div>
  </section>`;
}

function namesOfEdition(edition: Edition): Html {
  // Everyone the edition names, answered or not — the roster, as each edition's own page sets it —
  // so the opening view shows the same people.
  return html`<section class="wc-group">
    <div class="wc-rise">
      <!-- The numeral is a doorway to its edition, dressed as a name: the
           same band on hover, the same farewell when clicked. -->
      <p class="wc-numeral">
        <a
          class="wc-name wc-numeral-link"
          href="${withBase(`/whats-color/${edition.numeral.toLowerCase()}/`)}"
          aria-label="What&rsquo;s Color? (${edition.numeral})"
          >(${edition.numeral})</a
        >
      </p>
      <h2 class="sr-only">What&rsquo;s Color? (${edition.numeral})</h2>
      ${whatsColorNames(edition.roster ?? edition.participants)}
    </div>
  </section>`;
}

/** "AC071 Pompeian red", or just the name where there is no code (edition II). */
const colourLine = (p: Participant): string => [p.code, p.colourName].filter(Boolean).join(' ');

/**
 * One participant's answer, as the sheet sets it: the name large, what they do
 * ranged right beside it, the colour their answer was given underneath that, and
 * the answer itself below.
 */
function answer(p: Participant): Html {
  const swatch = swatchFor(p);
  return html`<article class="wc-answer" id="${p.id ?? ''}">
    <h2 class="wc-answer-name">${p.name}${p.alias ? html`<span class="wc-answer-alias">${p.alias}</span>` : ''}</h2>
    <p class="wc-answer-meta">
      ${p.role ? html`<span class="wc-answer-role">${p.role}</span>` : ''}
      ${p.code || p.colourName
        ? html`<span class="wc-answer-code" style="--swatch: ${swatch}; --swatch-ink: var(--${inkOn(swatch)})"><span class="wc-code-band">${colourLine(p)}</span></span>`
        : ''}
    </p>
    ${p.answer
      ? html`<div class="wc-answer-text">
          ${join(p.answer.split(/\n\s*\n/).map((para) => html`<p>${para}</p>`))}
        </div>`
      : p.inImages
        ? html`<p class="wc-answer-images">Answered in images</p>`
        : ''}
  </article>`;
}

/** One edition: its numeral, its own names, and its answers. */
export function whatsColorEdition(edition: Edition): Html {
  const table = SHEETS[edition.numeral];
  return html`<div class="wc wc-edition wc-edition-${edition.numeral.toLowerCase()}${table ? ' wc-sheet-page' : ''}">
    <p class="wc-numeral" aria-hidden="true">(${edition.numeral})</p>
    <h1 class="sr-only">What&rsquo;s Color? (${edition.numeral})</h1>
    ${whatsColorNames(edition.roster ?? edition.participants, edition.numeral)}

    ${table ? sheet(edition, table) : editionList(edition)}

    <!--
      The names, not the film. The root of this page is the opening film, and
      someone at the foot of an edition asking for all of What's Color? means
      the roster, so this points past the film the way the bar's own heading
      does.
    -->
    <p class="wc-back"><a href="${withBase('/#whats-color')}">All of What&rsquo;s Color?</a></p>
    ${chart(edition)}
    <!--
      The line the phone sheets close an edition on, under the link above.
      Shown on a phone only; the words are About's own.
    -->
    <p class="wc-foot"><b>${ABOUT_CARD.name}</b> ${ABOUT_COPYRIGHT}</p>
  </div>`;
}

/**
 * The edition's colour chart, at the very foot of its page: a bar of each
 * person's colour, standing on one line, the name upright above it.
 */
function chart(edition: Edition): Html {
  const bars = CHARTS[edition.numeral];
  if (!bars) return html``;
  const people = new Map((edition.roster ?? edition.participants).map((p) => [p.name, p]));
  return html`<section class="wc-chart" aria-label="Their colours">
    ${join(
      bars.map((bar) => {
        const person = people.get(bar.who);
        const style = `--bar-h: ${String(bar.h)}; --bar-c: ${person ? swatchFor(person) : 'var(--ink)'}`;
        const inner = html`<span class="wc-bar-name">${bar.label ?? bar.who}</span><span class="wc-bar-fill"></span>`;
        return person?.id
          ? html`<a class="wc-bar" href="#${person.id}" style="${style}">${inner}</a>`
          : html`<span class="wc-bar" style="${style}">${inner}</span>`;
      }),
    )}
  </section>`;
}

/**
 * The opening film: the documentation of edition I, full screen, with the bar
 * sitting across the middle of it.
 */
export function whatsColorFilm(): Html {
  const poster = withBase('/video/whats-color-poster.jpg');
  return html`<section
    class="wc-film"
    style="--film-poster: url('${poster}')"
    aria-label="What’s Color? (I), Alzueta Gallery, December 2020"
  >
    <video
      class="wc-film-video"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      data-poster="${poster}"
    >
      <source src="${withBase('/video/whats-color.mp4')}" type="video/mp4" media="(min-width: 900px)" />
    </video>
    <script>(function (v) { if (!matchMedia('(max-width: 899px)').matches) v.poster = v.dataset.poster; if (matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.preload = 'none' } })(document.currentScript.previousElementSibling)</script>
    <!--
      Sound on and off, in the film's top left corner (Frank, 2026-11-19): the
      scroll cue's size and weight, and like it the negative of the frame
      behind it. The film starts silent, which is the only way a browser will
      start one by itself; client/film.ts shows this and wires it up.
    -->
    <button type="button" class="wc-film-sound" aria-pressed="false" aria-label="Sound on" hidden>
      <svg viewBox="0 0 28 22" aria-hidden="true" focusable="false">
        <path d="M1.5 7.5 H6.5 L13 2 V20 L6.5 14.5 H1.5 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>
        <path class="wc-sound-off" d="M18 7.5 L25 14.5 M25 7.5 L18 14.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>
        <path class="wc-sound-on" d="M17 7.5 Q19.5 11 17 14.5 M20.5 3.5 Q26 11 20.5 18.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>
      </svg>
    </button>
    <noscript><style>.wc-film-video::-webkit-media-controls { display: none !important; }</style></noscript>
  </section>`;
}

/** Editions II and III: the statement as one block, then the answers under it. */
function editionList(edition: Edition): Html {
  return html`<div class="wc-edition-intro">${raw(edition.statement)}</div>

    ${edition.participants.some((p) => p.answer)
      ? html`<div class="wc-answers">${join(edition.participants.map(answer))}</div>`
      : html`<p class="wc-answers-none">
          The source for this edition names everyone who took part but keeps no
          record of what they answered.
        </p>`}`;
}

/** The first edition's sheet. */
function sheet(edition: Edition, table: readonly SheetSlot[]): Html {
  const byName = new Map(edition.participants.map((p) => [p.name, p]));
  /*
   * A band's lead is written once, on its first slot, and carried to the rest of
   * its row here: grid items sit at the top of their row, so a band only moves
   * as one if every slot in it wears the same margin.
   */
  let band: number | undefined;
  const air = (lead: number | undefined) =>
    lead === undefined ? '' : `--lead: ${String(lead)}`;
  return html`<div class="wc-sheet">
    ${join(
      table.map((slot) => {
        if (slot.title) {
          band = undefined;
          return sheetTitle(edition, slot.lead);
        }
        if (slot.strip) {
          band = undefined;
          return strip(slot.strip, slot.lead);
        }
        if (slot.say !== undefined) {
          band = undefined;
          return html`<p class="wc-say" style="${air(slot.lead)}">${raw(
            edition.says?.[slot.say] ?? '',
          )}</p>`;
        }
        const person = slot.who ? byName.get(slot.who) : undefined;
        if (slot.lead !== undefined) band = slot.lead;
        if (!person) return html``;
        return html`<div
          class="wc-slot"
          style="--col: ${String(slot.col ?? 1)}; --drop: ${String(slot.drop ?? 0)}; ${air(band)}"
        >${sheetEntry(person)}</div>`;
      }),
    )}
  </div>
  ${table.some((slot) => slot.strip) ? bookView() : ''}`;
}

/**
 * An edition's reel: a row of its photographs under the roster, all one height,
 * each whole at the shape of its file.
 */
function strip(plates: readonly Plate[], lead?: number): Html {
  return html`<div class="wc-strip" style="${lead === undefined ? '' : `--lead: ${String(lead)}`}">
    ${join(
      plates.map(
        (book) => html`<a
          class="wc-book"
          href="${withBase(`/img/${book.name}.jpg`)}"
          style="aspect-ratio: ${book.cell === undefined ? `${String(book.w)} / ${String(book.h)}` : String(book.cell)}"
          data-book
        >
          <picture>
            <source srcset="${withBase(`/img/${book.name}.webp`)}" type="image/webp" />
            <img
              src="${withBase(`/img/${book.name}.jpg`)}"
              alt="${book.alt}"
              width="${String(book.w)}"
              height="${String(book.h)}"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </a>`,
      ),
    )}
  </div>`;
}

/**
 * Where a clicked photograph opens: the picture large over the page, the page
 * blurred behind it, closed by Close (the sheets' own), a click anywhere or
 * Escape.
 */
function bookView(): Html {
  return html`<div class="wc-book-view" data-book-view hidden>
    <button type="button" class="panel-close">Close</button>
    <figure class="wc-book-plate" data-book-plate></figure>
  </div>
  <button type="button" class="wc-book-step is-prev" data-book-step="-1" aria-label="Previous photograph">${stepChevron(-1)}</button>
  <button type="button" class="wc-book-step is-next" data-book-step="1" aria-label="Next photograph">${stepChevron(1)}</button>`;
}

/**
 * The edition's own title, where its sheet carries one: the project and the
 * numeral set semibold, and whatever the source title says after that beside it
 * in the ordinary weight.
 */
function sheetTitle(edition: Edition, lead?: number): Html {
  const tail = edition.sourceTitle
    .replace(/^\s*what.s\s+colou?r\s*\??\s*/i, '')
    .replace(/^\(?\s*(i{1,3})\s*\)?\s*/i, '')
    .trim();
  return html`<p
    class="wc-say wc-sheet-title"
    aria-hidden="true"
    style="${lead === undefined ? '' : `--lead: ${String(lead)}`}"
  >
    <strong>What&rsquo;s Color? (${edition.numeral})</strong>${tail ? ` ${tail}` : ''}
  </p>`;
}

/**
 * One entry on the sheet: the name, the role and its translation ranged right
 * against the column, the colour under them, and the answer below.
 */
function sheetEntry(p: Participant): Html {
  const [role, translated] = splitRole(p.role);
  return html`<article class="wc-cell" id="${p.id ?? ''}">
    <h2 class="wc-cell-name">${p.name}${p.alias ? html`<span class="wc-cell-alias">${p.alias}</span>` : ''}</h2>
    <p class="wc-cell-meta">
      ${role ? html`<span class="wc-cell-role">${role}</span>` : ''}
      ${translated ? html`<span class="wc-cell-role wc-cell-also">${translated}</span>` : ''}
      ${p.code || p.colourName
        ? html`<span class="wc-cell-code" style="--swatch: ${swatchFor(p)}; --swatch-ink: var(--${inkOn(swatchFor(p))})"><span class="wc-code-band">${colourLine(p)}</span></span>`
        : ''}
    </p>
    ${p.answer
      ? html`<div class="wc-cell-text">
          ${join(p.answer.split(/\n\s*\n/).map((para) => html`<p>${para}</p>`))}
        </div>`
      : ''}
  </article>`;
}

/** The role as the sheet sets it: what they do, then the same in the other language beneath it. */
function splitRole(role: string | undefined): [string, string] {
  if (!role) return ['', ''];
  const at = role.indexOf(' / ');
  return at < 0 ? [role, ''] : [role.slice(0, at), role.slice(at + 3)];
}
