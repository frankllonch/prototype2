import { html, join, raw, type Html } from './html.ts';
import { LEAD, swatchFor, readable, inkOn, type Edition, type Participant } from '../content/whats-color.ts';
import { withBase } from '../content/paths.ts';
import {
  SHEET_I,
  SHEET_II,
  SHEET_III,
  BOOKS_III,
  type Plate,
  type SheetSlot,
} from '../content/whats-color-sheet.ts';

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
 * mark is part of a question in a way a full stop is not part of a sentence.
 *
 * Without scroll-driven animations, or with motion reduced, the stylesheet
 * never hides a word and the section is an ordinary paragraph.
 */
function writeOn(text: string): Html {
  const words = text.split(/\s+/);
  /** Screens of height the section spends; one is shown, the rest written. */
  const SCREENS = 2.4;
  /** The cover timeline's whole travel, in screens of scroll. */
  const COVER = SCREENS + 1;
  /**
   * Where the writing starts, as a fraction of the section's approach — THE
   * knob for "the words come too soon / too late". At 0.7 the first words
   * appear while the film's last tenth is leaving the top of the screen;
   * lower is sooner (more film still showing), higher is later, 1 is the
   * moment the pin engages.
   */
  const START = 0.7;
  /** And ends at 85% of the pinned stretch; the last 15% is the held beat. */
  const END = 1 + 0.85 * (SCREENS - 1);
  const marked = (w: string) => w.length > 1 && /[A-Z]/.test(w) && w === w.toUpperCase();
  // The question takes six times any other word's share of the scroll, and
  // the word before it half a ramp, so the pace audibly drops as it arrives
  // and picks back up after.
  const weights: number[] = words.map((w) => (marked(w) ? 6 : 1));
  const ask = words.findIndex(marked);
  if (ask > 0) weights[ask - 1] = 2.5;
  const total = weights.reduce((a, b) => a + b, 0);
  let at = 0;
  return html`<section class="wc-write">
    <div class="wc-write-pin">
      <p class="wc-lead">
        ${join(
          words.map((word, i) => {
            const from = START + (at / total) * (END - START);
            at += weights[i] ?? 1;
            const width = ((weights[i] ?? 1) / total) * (END - START) * 2.3;
            const to = Math.min(from + width, END + 0.04);
            const parts = marked(word) ? /^(.*?)([.,:;]*)$/.exec(word) : null;
            return html`<span
              class="wc-word"
              style="animation-range: cover ${((from / COVER) * 100).toFixed(2)}% cover ${((to / COVER) * 100).toFixed(2)}%"
            >${parts ? html`<mark class="wc-ask">${parts[1] ?? ''}</mark>${parts[2] ?? ''}` : word}</span> `;
          }),
        )}
      </p>
    </div>
  </section>`;
}

function namesOfEdition(edition: Edition): Html {
  return html`<section class="wc-group">
    <p class="wc-numeral" aria-hidden="true">(${edition.numeral})</p>
    <h2 class="sr-only">What&rsquo;s Color? (${edition.numeral})</h2>
    ${whatsColorNames(edition.participants)}
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
    ${whatsColorNames(edition.participants, edition.numeral)}

    ${table ? sheet(edition, table) : editionList(edition)}

    <!--
      The names, not the film. The root of this page is the opening film, and
      someone at the foot of an edition asking for all of What's Color? means
      the roster, so this points past the film the way the bar's own heading
      does.
    -->
    <p class="wc-back"><a href="${withBase('/#whats-color')}">All of What&rsquo;s Color?</a></p>
  </div>`;
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
 * A composition rather than a list: three columns, with each entry placed in
 * one of them by the designer, Claudia's own paragraphs set across the full
 * width between them, and a plate of the work partway down. The placement is
 * in `whats-color-sheet.ts`, because none of it follows from the content.
 *
 * Entries are looked up by name. One that does not match simply does not
 * appear, which is the failure that gets noticed — a page short of a person is
 * visible in a way that a silently mis-placed one is not.
 */
function sheet(edition: Edition, table: readonly SheetSlot[]): Html {
  const byName = new Map(edition.participants.map((p) => [p.name, p]));
  return html`<div class="wc-sheet">
    ${join(
      table.map((slot) => {
        if (slot.title) return sheetTitle(edition);
        if (slot.strip) return strip();
        if (slot.say !== undefined) {
          return html`<p class="wc-say">${raw(edition.says?.[slot.say] ?? '')}</p>`;
        }
        if (slot.plate) return plate(slot.plate, slot);
        const person = slot.who ? byName.get(slot.who) : undefined;
        if (!person) return html``;
        return html`<div
          class="wc-slot"
          style="--col: ${String(slot.col ?? 1)}; --drop: ${String(slot.drop ?? 0)}"
        >${sheetEntry(person)}</div>`;
      }),
    )}
  </div>
  ${table.some((slot) => slot.strip) ? bookView() : ''}`;
}

/**
 * The row of photographs of the book, along the top of the third edition's
 * sheet. Each one is a real link to the photograph, so without scripting a
 * click still shows the picture; with it, the script opens the same picture
 * over the page instead.
 */
function strip(): Html {
  return html`<div class="wc-strip">
    ${join(
      BOOKS_III.map(
        (book) => html`<a class="wc-book" href="${withBase(`/img/${book.name}.jpg`)}" data-book>
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
function sheetTitle(edition: Edition): Html {
  const tail = edition.sourceTitle
    .replace(/^\s*what.s\s+colou?r\s*\??\s*/i, '')
    .replace(/^\(?\s*(i{1,3})\s*\)?\s*/i, '')
    .trim();
  return html`<p class="wc-say wc-sheet-title" aria-hidden="true">
    <strong>What&rsquo;s Color? (${edition.numeral})</strong>${tail ? ` ${tail}` : ''}
  </p>`;
}

/**
 * A photograph on the sheet: across all three columns, or in one of them where
 * the design sets a pair side by side.
 *
 * Where the design crops the picture to a band, the shape it crops to rides on
 * the element and the file is covered into it. Without that the plate keeps the
 * shape of the file, which is what the first edition's does.
 */
function plate(p: Plate, slot: SheetSlot): Html {
  // Always stated, never left to `auto`: these load lazily, and an `auto`
  // ratio gives a lazy image no height until it arrives, which collapses the
  // row and shifts the page under the reader when it does.
  const shape = `--plate-aspect: ${String(p.aspect ?? p.w / p.h)}`;
  const column = slot.col ? `--col: ${String(slot.col)}; --drop: ${String(slot.drop ?? 0)}` : '';
  return html`<figure
    class="wc-plate${slot.col ? ' wc-plate-col' : ''}"
    style="${[shape, column].filter(Boolean).join('; ')}"
  >
    <picture>
      <source srcset="${withBase(`/img/${p.name}.webp`)}" type="image/webp" />
      <img
        src="${withBase(`/img/${p.name}.jpg`)}"
        alt="${p.alt}"
        width="${String(p.w)}"
        height="${String(p.h)}"
        loading="lazy"
        decoding="async"
      />
    </picture>
  </figure>`;
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
