import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import { BANDS, photographs, price, prose } from '../content/colour-chart.ts';
import { ENDPOINT, TURNSTILE_SITE_KEY } from '../content/inquiries.ts';

/**
 * The Colour Chart, after the designer's sheet.
 *
 * Three columns across one screen. The margin states what the chart costs and
 * how to get one; the chart's own colours stand in the next column as a single
 * stack of bands; the text has the rest of the page. Nothing moves except the
 * text — the page itself is exactly the height of the window and does not
 * scroll, so the price and the way to order are never scrolled off the thing
 * they are about. That is the whole argument of the layout: the facts stay put,
 * and the reading passes them.
 *
 * The band column lines up with the second column of the bar — where What's
 * Color? sits — because the sheet puts them on the same line and because the
 * bar is the only other thing on the page that divides the width.
 */
export function colourChart(): Html {
  return html`<div class="chart">
    <h1 class="chart-title">Color Chart</h1>

    <div class="chart-aside">
      ${price ? html`<p class="chart-price">Cost: <b>${price}</b></p>` : ''}
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
          The arrow is drawn rather than typed. ↗ is a character Switzer may or
          may not carry, and a missing glyph would be answered with whatever
          fallback face the machine has, at a weight nothing here chose. Drawn,
          it is the designer's arrow at the designer's weight — lighter than the
          stems beside it — on every machine.
        -->
        <svg class="chart-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2.4 9.6 9.4 2.6M4.3 2.6h5.1v5.1" fill="none" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </a>
    </div>

    <!--
      The chart itself, as colour and nothing else.

      One labelled image rather than twenty-three elements a screen reader
      would read as twenty-three nothings: what is here is a picture of the
      chart, made of divs because the chart is flat colour and a photograph of
      flat colour is a worse picture of it than the colour.
    -->
    <div class="chart-bands" role="img" aria-label="The colour chart: ${BANDS.length} of its colours, stacked">
      ${join(BANDS.map((colour) => html`<span class="chart-band" style="--band: ${colour}"></span>`))}
    </div>

    <!--
      The one thing that scrolls. It is given a tabindex because a region that
      scrolls has to be reachable by keyboard — otherwise the arrow keys have
      nothing to act on and the text below the fold is simply unreadable without
      a pointer.
    -->
    <div class="chart-text" tabindex="0">
      <div class="prose">${raw(prose)}</div>
      ${photographs.length
        ? html`<div class="chart-plates">
            ${join(
              photographs.map(
                (image) => html`<figure class="chart-plate">
                  ${responsiveImage({ image, sizes: '(max-width: 899px) 92vw, 46vw' })}
                  ${image.caption ? html`<figcaption>${image.caption}</figcaption>` : ''}
                </figure>`,
              ),
            )}
          </div>`
        : ''}
    </div>
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
