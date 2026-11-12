import { html, join, raw, type Html } from './html.ts';
import { LEAD, swatchFor, readable, inkOn, type Edition, type Participant } from '../content/whats-color.ts';
import { withBase } from '../content/paths.ts';
import {
  SHEET_I,
  SHEET_II,
  SHEET_III,
  CHART_II,
  type ChartBar,
  type Plate,
  type SheetSlot,
} from '../content/whats-color-sheet.ts';

/** The editions with a colour chart at their foot, by numeral. */
const CHARTS: Record<string, readonly ChartBar[] | undefined> = {
  II: CHART_II,
};

/** The editions the designer composed by hand, by numeral. */
const SHEETS: Record<string, readonly SheetSlot[] | undefined> = {
  I: SHEET_I,
  II: SHEET_II,
  III: SHEET_III,
};

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
  // On an edition's own page, straight to the answer; on the opening view,
  // to the answer on its edition's page — the address carries the person, so
  // arriving can travel down to them the way an on-page click does.
  const target = (p: Participant) =>
    within && p.id
      ? `#${p.id}`
      : withBase(`/whats-color/${(p.edition ?? 'i').toLowerCase()}/`) + (p.id ? `#${p.id}` : '');
  return html`<p class="wc-names">
    ${join(
      participants.map((p, i) => {
        const sep = i > 0 ? raw('<span class="wc-sep">, </span>') : '';
        const paint = `--swatch: ${swatchFor(p)}; --swatch-ink: var(--${inkOn(swatchFor(p))})`;
        // A name with no answer has no entry to point at, on either view, so
        // it stands in the sentence as a name rather than as a link — set
        // exactly like the others, as the sheets set every name alike.
        if (!p.id) {
          return html`${sep}<span class="wc-name" style="${paint}">${p.name}</span>`;
        }
        return html`${sep}<a class="wc-name" href="${target(p)}" style="${paint}">${p.name}</a>`;
      }),
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
 * start-page sheets set it: each a full-width block — a heading line, a blank
 * line, the text — cut to the sentence the sheet cuts it at, with the rest
 * behind ‘Read more’. Newest first, III to I, in the order of the rosters
 * above, so each edition's writing stands in the same place as its names.
 *
 * Each block is a doorway to its edition as well as a text: the heading is a
 * real link, and the script widens the click to the whole block. Without
 * scripting there is nothing to expand with, so the whole text stands open
 * and the link still works — the stylesheet swaps which half shows by the
 * `js` class, so neither state flashes.
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

/**
 * One edition's people, under its numeral.
 *
 * The opening view used to be a single run of everyone, deduplicated, which
 * read as one long credit roll and said nothing about which edition anyone
 * answered in. Three blocks say it without a word. Newest first, which is the
 * order the editions are built in and the order the reference sets them in —
 * and the opposite of the introductions at the foot, which run forwards
 * because they are chapters rather than a list.
 *
 * No name is in two blocks: nobody has answered in more than one edition.
 * Should that change, they would appear under each, which is the truth.
 */

/**
 * The note, written as you scroll.
 *
 * The section is given more height than it shows; the paragraph rides pinned
 * at the centre of the view while the scroll spends that height, and each
 * word is revealed over its own slice of the passage. The slices live on the
 * timeline that covers the section's whole travel, so the writing can begin
 * before the pin does — the first words appear while the film's last quarter
 * is still leaving the top of the screen, and the sentence is done at 85% of
 * the pinned stretch, with the rest held so it can be read whole.
 *
 * Three decisions ride in the numbers. The question the project is named
 * after is given almost three times any other word's share of the scroll, so
 * the pace falls as it arrives and picks back up after. Every word fades over
 * roughly two slots rather than one, because a mouse wheel moves in coarse
 * steps and overlapping fades keep one step from popping a clutch of words at
 * once. And SCREENS here must agree with --wc-write-length in the stylesheet,
 * because the slices are fractions of that travel, computed at build.
 *
 * Every word occupies its place from the start and only becomes visible, so
 * nothing reflows as the sentence appears. The question is marked and takes a
 * colour from the palette, its punctuation kept inside the mark — a question
 * mark is part of a question in a way a full stop is not part of a sentence —
 * and its words are joined, the space between them inside the colour, so the
 * band runs unbroken across the phrase and the phrase never splits a line.
 *
 * A blank line in the text starts a new paragraph; the last of several is the
 * invitation, which the stylesheet sets semibold in capitals. The schedule
 * runs across all of them as one sentence.
 *
 * Without scroll-driven animations, or with motion reduced, the stylesheet
 * never hides a word and the section is an ordinary paragraph.
 */
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
   * The writing starts the moment the stage pins — never before, so the
   * sentence only ever exists at the fixed centre of the view and no word
   * appears while the paragraph is still travelling. How soon that moment
   * comes while the film is still leaving is the stylesheet's business:
   * --wc-write-early pulls the stage up under the film, and is now the knob
   * for "the words come too soon / too late".
   */
  const START = 1;
  /** And ends at 85% of the pinned stretch; the last 15% is the held beat. */
  const END = 1 + 0.85 * (SCREENS - 1);
  const marked = (w: string) => w.length > 1 && /[A-Z]/.test(w) && w === w.toUpperCase();
  // The question arrives a little slower than any other word — and then the
  // writing stops dead. PAUSE is empty runway after the question's last
  // word: fourteen words' worth of scroll in which nothing new appears, so
  // the reader is genuinely held on the phrase before the rest resumes.
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
                // The last two words are held together, so a paragraph never
                // ends on one word stranded at the left of a justified block;
                // joined words already carry their space inside the colour.
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
  // Everyone the edition names, answered or not — the roster, as each
  // edition's own page sets it — so the opening view shows the same people.
  // The inner wrapper is the thing that fades in once the note stands
  // written: the group itself belongs to the farewell, and an animation's
  // fill would hold its opacity against the farewell's hand.
  return html`<section class="wc-group">
    <div class="wc-rise">
      <p class="wc-numeral" aria-hidden="true">(${edition.numeral})</p>
      <h2 class="sr-only">What&rsquo;s Color? (${edition.numeral})</h2>
      ${whatsColorNames(edition.roster ?? edition.participants)}
    </div>
  </section>`;
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
  const swatch = swatchFor(p);
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
    ${p.answer
      ? html`<div class="wc-answer-text">
          ${join(p.answer.split(/\n\s*\n/).map((para) => html`<p>${para}</p>`))}
        </div>`
      : p.inImages
        ? html`<p class="wc-answer-images">Answered in images</p>`
        : ''}
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
  </div>`;
}

/**
 * The edition's colour chart, at the very foot of its page: a bar of each
 * person's colour, standing on one line, the name upright above it. A bar
 * leads to that person's answer the way their name in the roster does —
 * travelling down to it and bringing it forward — and someone who never
 * answered has a bar that is only a bar.
 */
function chart(edition: Edition): Html {
  const bars = CHARTS[edition.numeral];
  if (!bars) return html``;
  const people = new Map((edition.roster ?? edition.participants).map((p) => [p.name, p]));
  return html`<section class="wc-chart" aria-label="Their colours">
    ${join(
      bars.map((bar) => {
        const person = people.get(bar.who);
        const paint = typeof bar.colour === 'string'
          ? bar.colour
          : `linear-gradient(90deg, ${bar.colour[0]} 50%, ${bar.colour[1]} 50%)`;
        const style = `--bar-h: ${String(bar.h)}; --bar-c: ${paint}`;
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
 *
 * Muted, looping and `playsinline`, which is what every browser requires before
 * it will start a video by itself. The poster is the film's own first frame, so
 * the still that shows while it loads is the one the film opens on and there is
 * no jump when it starts.
 *
 * `preload="metadata"` rather than `auto`: the file streams as it plays, so the
 * page does not wait on three minutes of video to become usable. With scripting
 * or autoplay refused, the poster stands in its place and the page below is
 * unaffected — nothing here is load-bearing.
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
      poster="${poster}"
    >
      <source src="${withBase('/video/whats-color.mp4')}" type="video/mp4" />
    </video>
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

/**
 * The first edition's sheet.
 *
 * A composition rather than a list: a reel of photographs, then three
 * columns, with each entry placed in one of them by the designer and
 * Claudia's own paragraphs set across the full width between them. The
 * placement is in `whats-color-sheet.ts`, because none of it follows from the
 * content.
 *
 * Entries are looked up by name. One that does not match simply does not
 * appear, which is the failure that gets noticed — a page short of a person is
 * visible in a way that a silently mis-placed one is not.
 */
function sheet(edition: Edition, table: readonly SheetSlot[]): Html {
  const byName = new Map(edition.participants.map((p) => [p.name, p]));
  /*
   * A band's lead is written once, on its first slot, and carried to the rest
   * of its row here: grid items sit at the top of their row, so a band only
   * moves as one if every slot in it wears the same margin. Anything spanning
   * the full width ends the band.
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
 * An edition's reel: a row of its photographs under the roster, all one
 * height, each whole at the shape of its file. Each one is a real link to the
 * photograph, so without scripting a click still shows the picture; with it,
 * the script opens the same picture over the page instead.
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
 * blurred behind it, closed by a click anywhere or Escape. Empty and hidden
 * until the script fills it; without scripting it never shows and the links
 * above stand on their own.
 */
function bookView(): Html {
  return html`<div class="wc-book-view" data-book-view hidden>
    <figure class="wc-book-plate" data-book-plate></figure>
  </div>`;
}

/**
 * The edition's own title, where its sheet carries one: the project and the
 * numeral set bold, and whatever the source title says after that beside it in
 * the ordinary weight. Split rather than retyped, so the words stay the ones
 * WordPress holds.
 *
 * Hidden from the reading order because the page already opens with the same
 * heading; this is the designer's printed restatement of it.
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
      ${p.code
        ? html`<span class="wc-cell-code">${p.code}${p.colourName ? ` ${p.colourName}` : ''}</span>`
        : ''}
    </p>
    ${p.answer
      ? html`<div class="wc-cell-text">
          ${join(p.answer.split(/\n\s*\n/).map((para) => html`<p>${para}</p>`))}
        </div>`
      : ''}
  </article>`;
}

/**
 * The role as the sheet sets it: what they do, then the same in the other
 * language beneath it. The roster keeps the pair in one string separated by a
 * slash, which is how the source writes it; a role with no translation simply
 * has no second line.
 */
function splitRole(role: string | undefined): [string, string] {
  if (!role) return ['', ''];
  const at = role.indexOf(' / ');
  return at < 0 ? [role, ''] : [role.slice(0, at), role.slice(at + 3)];
}
