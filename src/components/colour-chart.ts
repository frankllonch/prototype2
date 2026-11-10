import { html, join, raw, type Html } from './html.ts';
import { price, statement } from '../content/colour-chart.ts';
import { ENDPOINT, TURNSTILE_SITE_KEY } from '../content/inquiries.ts';

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
  return html`<div class="chart">
    <!--
      The bar names the page, so the heading would be the same words twice. It
      is here for the document's structure and for anything reading the page
      rather than looking at it.
    -->
    <h1 class="sr-only">Color Chart</h1>

    <div class="chart-statement">
      ${join(statement.map((block) => html`<p>${raw(block)}</p>`))}
    </div>

    <!--
      An anchor rather than a button, and to a real section further down the
      document. With scripting the click opens the form over the page; without
      it the same href simply walks to the form, which is standing open at the
      foot of the page. The site makes this bargain everywhere — About and each
      exhibition are plain anchors too — so nothing here is reachable only by
      way of a script.
    -->
    <a class="chart-order" href="#inquiries" data-inquiries-open>
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

    ${price ? html`<p class="chart-price">Cost: <b>${price}</b></p>` : ''}

    <p class="chart-thanks">Thanks to everyone!</p>

    <!--
      The site's own line, not the chart's: the same one stands at the foot of
      the About sheet. It is here rather than in components/layout.ts because
      this is the only page of the new set that is built; when the others land
      it belongs in the layout, once, for all of them.
    -->
    <footer class="chart-footer"><b>Claudia Valsells</b> &copy; All Rights Reserved</footer>
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
