import { html, join, raw, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import { withBase } from '../content/paths.ts';
import { aboutPage } from '../content/load.ts';

interface LayoutProps {
  readonly title: string;
  readonly description?: string;
  /** Root-relative path of this page, for the active menu item. */
  readonly path: string;
  /** The year rail, on the pages that have one. */
  readonly rail?: Html;
  /** Grid density control. */
  readonly controls?: Html;
  /**
   * Content that must sit above the page: the detail panels. `main` is its own
   * stacking context — the opening pile gives its tiles a z-index, which would
   * otherwise compete with the overlays — so anything meant to rise above the
   * veil has to live outside it.
   */
  readonly overlays?: Html;
  readonly children: Html;
}

/** Order and wording of the menu, after the designer's mockup. */
const MENU = [
  { label: 'About', href: '/#about', panel: 'about' },
  { label: 'Artwork', href: '/' },
  { label: 'Collaborations', href: '/collaborations/' },
  { label: 'Exhibitions', href: '/exhibitions/' },
  { label: 'Colour Chart', href: '/colour-chart/' },
] as const;

/** Client modules, in boot order. Preloaded so the first interaction is instant. */
const CLIENT_MODULES = [
  'env', 'text-roll', 'controls', 'stack', 'years', 'panels', 'panel-scroll', 'lightbox', 'cursor', 'index',
] as const;

/** The designer's About: five lines, set in blue on peach. */
const ABOUT_LINES = ['CLAUDIA VALSELLS', '1969', 'Alzueta Gallery', 'Barcelona, Spain', '© All Rights Reserved'];

function topBar(path: string): Html {
  return html`<header class="top">
    <a class="wordmark" href="${withBase('/')}" data-roll>CLAUDIA VALSELLS</a>
    <nav class="menu" aria-label="Primary">
      ${join(
        MENU.map(
          (item) => html`<a
            href="${withBase(item.href)}"
            ${'panel' in item ? raw(`data-panel-open="${item.panel}"`) : ''}
            ${item.href === path ? raw('aria-current="page"') : ''}
            data-roll
          >${item.label}</a>`,
        ),
      )}
    </nav>
  </header>`;
}

/**
 * The biography from the source About page, as one block of rich text.
 *
 * Taken whole rather than split into paragraphs: the source nests divs, and a
 * non-greedy block regex closes them at the wrong place, leaving unbalanced
 * markup that swallowed whatever followed it. The extractor has already
 * sanitised this HTML, so the browser can parse it as it stands.
 */
function aboutText(): string {
  if (!aboutPage) return '';
  return aboutPage.rows
    .flatMap((row) => row.columns)
    .filter((column) => column.kind === 'text')
    .map((column) => (column.kind === 'text' ? column.html : ''))
    .join('');
}

/**
 * About opens over whatever page you are on. The first screen is the designer's
 * five lines on peach; scrolling on reveals the biography the source site
 * carries — text in one column, the studio photographs flowing down the other.
 * The same two-column idea as a detail panel, but the pictures move with the
 * words here instead of holding still.
 */
function aboutOverlay(): Html {
  const bio = aboutText();
  const images = aboutPage?.images ?? [];

  return html`<section class="about" id="about" data-panel aria-label="About">
    <a class="about-close" href="#" data-panel-close>Close</a>

    <div class="about-lines">
      ${join(ABOUT_LINES.map((line) => html`<p>${line}</p>`))}
      ${bio ? html`<span class="about-more" aria-hidden="true">Scroll</span>` : ''}
    </div>

    ${bio ? html`<div class="about-fade" aria-hidden="true"></div>` : ''}

    ${bio
      ? html`<div class="about-body">
          <div class="about-text">${raw(bio)}</div>
          <div class="about-figures">
            ${join(
              images.slice(0, 2).map(
                (image) => html`<figure class="about-figure">
                  ${responsiveImage({ image, sizes: '(max-width: 899px) 88vw, 30vw' })}
                </figure>`,
              ),
            )}
          </div>
        </div>`
      : ''}
  </section>`;
}

function lightbox(): Html {
  return html`<div class="lightbox" data-lightbox data-available-label="Available" hidden>
    <div class="lightbox-veil" data-lightbox-veil></div>
    <button type="button" class="lightbox-close" data-lightbox-close>Close</button>
    <button type="button" class="lightbox-nav lightbox-prev" data-lightbox-prev aria-label="Previous">←</button>
    <div class="lightbox-plate" data-lightbox-plate></div>
    <div class="lightbox-caption">
      <h2 class="lightbox-title" data-lightbox-title></h2>
      <p class="lightbox-meta" data-lightbox-meta></p>
      <p class="lightbox-count" data-lightbox-count data-template="{n} of {total}"></p>
    </div>
    <button type="button" class="lightbox-nav lightbox-next" data-lightbox-next aria-label="Next">→</button>
  </div>`;
}

export function layout({ title, description, path, rail, controls, overlays, children }: LayoutProps): Html {
  const fullTitle = title === 'Claudia Valsells' ? title : `${title} — Claudia Valsells`;
  const modules = CLIENT_MODULES.map((m) => withBase(`/js/${m}.js`));
  return raw(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${fullTitle}</title>
${description ? `<meta name="description" content="${description.replace(/"/g, '&quot;').slice(0, 300)}" />` : ''}
<link rel="preload" href="${withBase('/fonts/inter-normal.woff2')}" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${withBase('/site.css')}" />
${modules.map((m) => `<link rel="modulepreload" href="${m}" />`).join('\n')}
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${topBar(path).__html}
${rail ? rail.__html : ''}
<main id="main">${children.__html}</main>
${overlays ? overlays.__html : ''}
${controls ? controls.__html : ''}
<div class="cursor" data-cursor aria-hidden="true"><span class="cursor-label"></span></div>
<div class="panel-veil" data-panel-veil></div>
${aboutOverlay().__html}
${lightbox().__html}
<script type="module" src="${withBase('/js/index.js')}"></script>
</body>
</html>`);
}
