import { html, join, raw, type Html } from './html.ts';
import { photographs, price, sections, statement, type ChartSection } from '../content/colour-chart.ts';
import { panelShell } from './panels.ts';
import { plates } from './plates.ts';
import { ENDPOINT, TURNSTILE_SITE_KEY } from '../content/inquiries.ts';
import { responsiveImage } from './image.ts';
import { stepChevron } from './scroll-cue.ts';
import type { ProjectImage } from '../content/types.ts';

/**
 * The Colour Chart, after the designer's third sheet (COLOR CHART DISSENY III,
 * Frank, 2026-11-19).
 *
 * An ordinary page that scrolls, as About does: no pinned screen and no run
 * behind it. The title and the statement are typed in on arrival
 * (`client/chart.ts`): the title and the first paragraph by themselves, the
 * rest by the reader's scroll, forwards only; everything under them — Order yours, the cost, the two
 * sections in three columns, the thanks and the line at the foot — comes in
 * out of a blur as it reaches the screen.
 *
 * The markup is the finished page. The words are split into spans by the
 * script, and nothing is hidden unless the script is there to bring it back.
 */

/** The page's title (Frank, 2026-11-18), semibold 45 in capitals. */
const TITLE = 'Artist colour chart for architects and designers';

/** The sections the sheet sets, in three columns; About a colour chart is not on it. */
const SET = ['Features', 'Technical characteristics'];

/**
 * A section's blocks dealt into three columns, left to right and then down
 * again, as the sheet deals them: the six technical notes are 1 and 4, 2 and
 * 5, 3 and 6. Each column runs down on its own, not in rows across, so a short
 * note does not leave a gap beside a long one. `--n` is the block's place in
 * the text, which is the order a phone reads them in (06-colour-chart.css).
 */
function columns(section: ChartSection): Html {
  const cols = [0, 1, 2].map((c) => section.blocks.map((b, n) => ({ b, n })).filter(({ n }) => n % 3 === c));
  return html`<section class="chart-section">
    <h2 class="chart-section-title chart-in">${section.title}</h2>
    <div class="chart-cols">
      ${join(
        cols.map(
          (col) => html`<div class="chart-col">${join(
            col.map(({ b, n }) => html`<p class="chart-in" style="--n:${n}">${raw(b)}</p>`),
          )}</div>`,
        ),
      )}
    </div>
  </section>`;
}

export function colourChart(): Html {
  const set = SET.map((t) => sections.find((s) => s.title === t)).filter((s): s is ChartSection => !!s);
  return html`<div class="chart" data-chart>
  <div class="chart-page">
    <!--
      The opening: the title and the statement, held in place while the
      reader scrolls the rest of it into being (client/chart.ts adds the run
      of scroll behind it). Without the script it is simply the top of the page.
    -->
    <div class="chart-opening" data-chart-opening>
      <div class="chart-stage" data-chart-stage>
        <div class="chart-statement" data-chart-type>
          <h1 class="chart-title">${TITLE}</h1>
          ${join(statement.map((p, i) => html`<p${i === 0 ? raw(' data-chart-auto') : ''}>${raw(p)}</p>`))}
        </div>
      </div>
    </div>

    ${photographs.length ? chartReel(photographs) : ''}

    <!--
      An anchor rather than a button, and to a real section further down the
      document. With scripting the click opens the form over the page; without
      it the same href simply walks to the form, which is standing open at the
      foot of the page.
    -->
    <a class="chart-order chart-in" href="#inquiries" data-inquiries-open>
      Order yours
      <!--
        The arrow is drawn rather than typed, about its own centre, because it
        turns on hover.
      -->
      <svg class="chart-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2.4 9.6 9.4 2.6M4.3 2.6h5.1v5.1" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>
      <!-- The phone sheet's own arrow; the stylesheet shows one or the other. -->
      <svg class="chart-arrow-phone" viewBox="0 0 22.5 22" aria-hidden="true" focusable="false">
        <path d="M1.5 1.5H21V22M1.2 20.97 20.6 1.57" fill="none" stroke="currentColor" stroke-width="3" />
      </svg>
    </a>

    ${price ? html`<p class="chart-price chart-in">Cost: <b>${price}</b></p>` : ''}

    ${join(set.map(columns))}

    <!--
      Her thanks. Not a link any more (Frank, 2026-11-22): the photographs
      are on the page now, in the reel under the statement, and the line only
      answers the pointer in a colour, as the index rows do.
    -->
    <p class="chart-thanks chart-in"><span class="hrow">Thanks to everyone!</span></p>

    <footer class="chart-footer chart-in"><b>Claudia Valsells</b> &copy; All Rights Reserved</footer>
  </div>
</div>`;
}

/**
 * The photographs of the chart in use, in a reel between the statement and
 * Order yours (Frank, 2026-11-22): About's reel, the same loop and the same
 * big chevrons in the margins, driven in from the right by the scroll once the
 * statement is typed and carried along as the page goes on
 * (`client/chart.ts`, which borrows About's loop from `client/about.ts`).
 *
 * Each photograph is a link to the panel below, which shows it large; without
 * scripting the row scrolls sideways and the link walks to the panel.
 */
function chartReel(images: readonly ProjectImage[]): Html {
  return html`<div class="chart-reel about-reel chart-in" data-about-reel data-chart-reel>
    <div class="about-reel-track" data-about-track>
      ${join(
        images.map(
          (image, i) => html`<a class="about-reel-item" href="#chart-photographs" data-panel-open="chart-photographs" data-chart-photo="${String(i)}" aria-label="Photograph ${String(i + 1)} of ${String(images.length)}">
            ${responsiveImage({ image, sizes: reelSizes(image) })}
          </a>`,
        ),
      )}
    </div>
    ${images.length > 1
      ? html`<button type="button" class="about-reel-step is-prev" data-about-reel-step="-1" aria-label="Earlier photographs" hidden>
          ${stepChevron(-1)}
        </button>
        <button type="button" class="about-reel-step is-next" data-about-reel-step="1" aria-label="More photographs" hidden>
          ${stepChevron(1)}
        </button>`
      : ''}
  </div>`;
}

/** As About's reel: 210 frame pixels tall, so 10.94vw, and 7.5rem below 1097 wide. */
function reelSizes(image: ProjectImage): string {
  const ratio = image.width / image.height;
  return `(max-width: 1097px) ${Math.round(120 * ratio)}px, ${(10.9375 * ratio).toFixed(1)}vw`;
}

/**
 * The photographs of the chart in use, as a panel over the page, opened at
 * the photograph tapped in the reel.
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
 *
 * `desk` says which form this is, and so where the handler sends it: the
 * Colour Chart's orders go to Claudia, the Gallery's inquiries to the Alzueta
 * gallery (Frank, 2026-11-18). Both addresses are the handler's alone.
 */
export type InquiryDesk = 'chart' | 'gallery';

export function inquiries(desk: InquiryDesk = 'chart'): Html {
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
      <input type="hidden" name="desk" value="${desk}" />

      <!-- Cloudflare's widget is rendered in here, and only if a key is set. -->
      <div class="inq-check" data-inquiries-check></div>

      <div class="inq-send">
        <p class="inq-status" data-inquiries-status role="status" aria-live="polite"></p>
        <button type="submit" class="inq-button" data-inquiries-submit>Send</button>
      </div>
    </form>
  </section>`;
}
