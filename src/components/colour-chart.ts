import { html, join, raw, type Html } from './html.ts';
import { photographs, price, statement } from '../content/colour-chart.ts';
import { panelShell } from './panels.ts';
import { plates } from './plates.ts';
import { ENDPOINT, TURNSTILE_SITE_KEY } from '../content/inquiries.ts';

/**
 * The statement, written by the scroll — and the scroll is the page itself.
 *
 * The page holds still on one screen while it is read: everything the sheet
 * sets, from the statement to the line at the foot, sits in a block stuck to
 * the top of the view, and behind it runs a strip of nothing whose only job
 * is to be scrolled through. Each word has a slice of that run, so the
 * sentence is typed by the reader's own hand, and when the last word lands
 * the run is spent and the page will not go any further. Scrolling back
 * unwrites it: a scroll timeline is a position, not a performance.
 *
 * The timeline is the document's own (`scroll(root block)`) rather than the
 * view timeline the start page's note uses. There the stage travels past a
 * film and the sums have to allow for the screen it enters across; here the
 * page does not move at all, so the only thing to divide is the scroll, and
 * a word's turn is its share of it — nothing to reconcile with a stage height
 * and nothing to drift when one is retuned.
 *
 * `broken()` has already put the designer's line break in, so a paragraph may
 * carry a `<br />`. It is split out and put back between the halves rather
 * than run through the word splitter, which would otherwise wrap a tag.
 */

/**
 * The page writes its own opening, and the opening is the first paragraph.
 *
 * "Color has always been my inspiration: a source of knowledge, a way of
 * life!" — the question and its answer, which is the one part of the
 * statement that does not stand without the other half. Counted off the
 * paragraph rather than stated as a number, so the page goes on stopping at
 * the end of it however Claudia rewrites it.
 *
 * They are not written by a clock and held apart from the rest: they are the
 * first slices of the same run, and the page simply travels to them for the
 * reader (`client/chart.ts`). That is what lets the reader take it back —
 * scrolling up unwrites them like any other word, where a clock would have
 * written them once and for good.
 */

/**
 * The share of the run the statement is written over.
 *
 * The rest of it brings the page in under the sentence — the way to order
 * one, the price, the thanks and the line at the foot — so the scroll is not
 * finished the moment the last word lands. Four fifths to the words, a fifth
 * to the four things they are above.
 */
const WRITTEN_BY = 0.8;

/** The four that arrive after the sentence, in the order they are read. */
const ARRIVING = 4;

/**
 * Where each of them comes in, as a slice of the run.
 *
 * The slices overlap by half: one is still arriving as the next begins, so
 * they read as a page settling rather than as four separate events. The last
 * finishes on the last pixel, with the sentence, so nothing is left to scroll
 * to once the page stands whole.
 */
function arriving(i: number): string {
  const step = (1 - WRITTEN_BY) / (ARRIVING + 1);
  const from = WRITTEN_BY + i * step;
  const to = Math.min(from + step * 2, 1);
  return `animation-range: ${(from * 100).toFixed(2)}% ${(to * 100).toFixed(2)}%`;
}

function written(paragraphs: readonly string[]): { readonly block: Html; readonly reveal: number } {
  const lines = paragraphs.map((p) => p.split(/<br\s*\/?>/));
  const total = lines.flat().join(' ').trim().split(/\s+/).length;
  let n = 0;

  const word = (w: string): Html => {
    const i = n++;
    /*
     * A slice in, not from the edge.
     *
     * The words are shared out over one more slice than there are words, and
     * each takes the one after the first. Starting the first word at nought
     * left it standing before the page had been touched — a stepped animation
     * jumps at the start of its range, so a range beginning at the top of the
     * document is a word that is simply always there. It is typed like every
     * other word now, and the page at rest is blank.
     */
    const from = ((i + 1) / (total + 1)) * WRITTEN_BY;
    /*
     * A word arrives whole, the moment its turn comes — the animation is a
     * single step, so there is never a half-written word ahead of the reader
     * — and the end of its range only has to come after the start. Its own
     * share, which puts the last word's end on the last pixel of the run.
     */
    const to = ((i + 2) / (total + 1)) * WRITTEN_BY;
    const pc = (v: number) => (v * 100).toFixed(2);
    return html`<span
      class="chart-word"
      style="animation-range: ${pc(from)}% ${pc(to)}%"
    >${w}</span>`;
  };

  const block = html`<div class="chart-statement">
    ${join(
      lines.map(
        (halves) => html`<p>${join(
          halves.map((half, h) => html`${h > 0 ? raw('<br />') : ''}${join(
            half.trim().split(/\s+/).map((w, i) => html`${i > 0 ? ' ' : ''}${word(w)}`),
          )}`),
        )}</p>`,
      ),
    )}
  </div>`;

  /*
   * Half a slice short of the sixth word's end, not on it: a word's turn
   * begins where the last one's ends, so travelling to the boundary itself
   * lands on the seventh as readily as the sixth. The middle of the sixth
   * slice is unambiguous.
   */
  const opening = (lines[0] ?? []).join(' ').trim().split(/\s+/).length;
  return { block, reveal: ((opening + 0.5) / (total + 1)) * WRITTEN_BY };
}

/**
 * The Colour Chart, after the designer's sheet.
 *
 * Simplified to five things: what the chart is, in her own words; the way to
 * order one; what it costs; her thanks; and the site's own line at the foot.
 * The record that used to follow — Features, the technical characteristics,
 * About a colour chart — is not on the sheet any more, and neither are the
 * stack of colours, the photographs or the heading, which the bar already
 * carries. `content/colour-chart.ts` still reads every one of those out of
 * WordPress; this page simply no longer sets them.
 *
 * The statement runs the full width of the page, which is the whole of the
 * change: there is no margin column to hold anything still beside it, so
 * nothing here is a composition — it is a page of type.
 */
export function colourChart(): Html {
  const { block, reveal } = written(statement);
  return html`<div class="chart" data-chart-reveal="${reveal.toFixed(4)}" data-chart-written="${WRITTEN_BY}">
  <div class="chart-page">
    <!--
      The bar names the page, so the heading would be the same words twice. It
      is here for the document's structure and for anything reading the page
      rather than looking at it.
    -->
    <h1 class="sr-only">Color Chart</h1>

    ${block}

    <!--
      An anchor rather than a button, and to a real section further down the
      document. With scripting the click opens the form over the page; without
      it the same href simply walks to the form, which is standing open at the
      foot of the page. The site makes this bargain everywhere — About and each
      exhibition are plain anchors too — so nothing here is reachable only by
      way of a script.
    -->
    <a class="chart-order chart-in" style="${arriving(0)}" href="#inquiries" data-inquiries-open>
      Order yours
      <!--
        The arrow is drawn rather than typed. An upward-right arrow is a
        character Switzer may or may not carry, and a missing glyph would be
        answered with whatever fallback face the machine has, at a weight
        nothing here chose. Drawn, it is the designer's arrow at the designer's
        weight — lighter than the stems beside it — everywhere.

        Drawn about its own centre, too, because it turns: the viewBox is
        square and the arrow is set in the middle of it, so a rotation has
        nothing to drift against.
      -->
      <svg class="chart-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2.4 9.6 9.4 2.6M4.3 2.6h5.1v5.1" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </a>

    ${price ? html`<p class="chart-price chart-in" style="${arriving(1)}">Cost: <b>${price}</b></p>` : ''}

    <!--
      Her thanks, and a way of seeing who they are to: the photographs people
      have sent her of the chart in use. An anchor to a real panel, as About
      and every exhibition are, so without scripting it walks to them instead
      of opening them over the page.
    -->
    <p class="chart-thanks chart-in" style="${arriving(2)}">${
      photographs.length
        ? html`<a href="#chart-photographs" data-panel-open="chart-photographs">Thanks to everyone!</a>`
        : 'Thanks to everyone!'
    }</p>

    <!--
      The site's own line, not the chart's: the same one stands at the foot of
      the About sheet. It is here rather than in components/layout.ts because
      this is the only page of the new set that is built; when the others land
      it belongs in the layout, once, for all of them.
    -->
    <footer class="chart-footer chart-in" style="${arriving(3)}"><b>Claudia Valsells</b> &copy; All Rights Reserved</footer>
  </div>

  <!--
    And the run the writing is divided over: a strip of nothing behind the
    page, there to be scrolled through. It carries no text and nothing can be
    done with it, so it is out of the reading order entirely; it is in the
    markup rather than made by script because the page has to be able to be
    read by the scroll on its first paint, before anything has run.
  -->
  <div class="chart-runway" aria-hidden="true"></div>
</div>`;
}

/**
 * The photographs of the chart in use, as a panel over the page.
 *
 * The same sheet an exhibition that is photographs and nothing else gets
 * (`components/plates.ts`): the masthead top left, one picture in the middle
 * of the frame, an arrow either side. It is raised and put away by
 * `client/panels.ts` and stepped through by `client/figures.ts`, both of which
 * already drive every other detail on the site — there is no new mechanism
 * here, which is the point of it reading the same.
 */
export function chartPhotographs(): Html {
  if (!photographs.length) return html``;
  return html`<div class="panels">
    ${panelShell('chart', 'photographs', plates({ title: 'Thanks to everyone!' }, photographs))}
  </div>`;
}

/**
 * The order form, over the page.
 *
 * Every field is here in the markup and the form has a real `action` and
 * `method`, so it is a working form before a line of script runs: without
 * scripting it is a section at the foot of the page that posts to the handler
 * and gets a plain page back. The script's job is to raise it over the page,
 * hold the keyboard inside it, and post it without leaving the page.
 *
 * Three things in this markup are defences rather than design, and all three
 * are only the first word on the subject — the handler repeats every one of
 * them, because anything decided in a page can be edited by whoever is looking
 * at it:
 *
 *   `website`   a field no person can see and no person can tab to. Anything
 *               that fills it filled it by reading the markup, which is what
 *               most form spam is.
 *   `started`   when the form was opened, written by the script. A submission
 *               three seconds after the form appeared was not typed.
 *   Turnstile   Cloudflare's check, when a site key is configured. It asks
 *               nothing of a person and is the only one of the three that a
 *               determined sender cannot simply read and work around.
 *
 * The address it sends to is not here. It is in the handler's environment, so
 * the page that offers to write to Claudia never says where to.
 */
export function inquiries(): Html {
  const field = (
    id: string,
    label: string,
    input: Html,
  ) => html`<div class="inq-field inq-${id}">
    <label class="inq-label" for="inq-${id}">${label}</label>
    ${input}
  </div>`;

  return html`<section class="inq" id="inquiries" data-inquiries aria-labelledby="inq-title">
    <a class="inq-close" href="#" data-inquiries-close>Close</a>

    <form
      class="inq-form"
      method="post"
      action="${ENDPOINT}"
      data-inquiries-form
      ${TURNSTILE_SITE_KEY ? raw(`data-turnstile-key="${TURNSTILE_SITE_KEY}"`) : ''}
      novalidate
    >
      <h2 class="inq-title" id="inq-title">Inquiries</h2>

      ${field('name', 'Contact name:', html`<input
        class="inq-input" id="inq-name" name="name" type="text"
        required maxlength="120" autocomplete="name" enterkeyhint="next"
      />`)}
      ${field('country', 'Country:', html`<input
        class="inq-input" id="inq-country" name="country" type="text"
        maxlength="80" autocomplete="country-name" enterkeyhint="next"
      />`)}
      ${field('email', 'Your email:', html`<input
        class="inq-input" id="inq-email" name="email" type="email"
        required maxlength="160" autocomplete="email" spellcheck="false" enterkeyhint="next"
      />`)}
      ${field('subject', 'Subject:', html`<input
        class="inq-input" id="inq-subject" name="subject" type="text"
        maxlength="160" enterkeyhint="next"
      />`)}
      <!--
        One line to look at and many to write in: the field grows with what is
        typed (client/inquiries.ts), so the rule under it is a rule until
        there is a reason for it to be a box.
      -->
      ${field('message', 'Your message:', html`<textarea
        class="inq-input inq-area" id="inq-message" name="message"
        required maxlength="4000" rows="1"
      ></textarea>`)}

      <!--
        Out of sight, out of the tab order, and out of the accessibility tree:
        three separate statements that no person is meant to reach this. Not
        a hidden input, which is the one kind of field a form robot knows to
        leave alone.
      -->
      <div class="inq-trap" aria-hidden="true">
        <label for="inq-website">Website</label>
        <input id="inq-website" name="website" type="text" tabindex="-1" autocomplete="off" />
      </div>
      <input type="hidden" name="started" value="" data-inquiries-started />

      <!-- Cloudflare's widget is rendered in here, and only if a key is set. -->
      <div class="inq-check" data-inquiries-check></div>

      <div class="inq-send">
        <p class="inq-status" data-inquiries-status role="status" aria-live="polite"></p>
        <button type="submit" class="inq-button" data-inquiries-submit>Send</button>
      </div>
    </form>
  </section>`;
}
