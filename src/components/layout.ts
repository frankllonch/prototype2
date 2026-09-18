import { html, join, raw, type Html } from './html.ts';
import { withBase } from '../content/paths.ts';

interface LayoutProps {
  readonly title: string;
  readonly description?: string;
  /** Root-relative path of this page, for the active menu item. */
  readonly path: string;
  /** Controls set into the top bar (grid density, year filter). */
  readonly controls?: Html;
  readonly children: Html;
}

/** Order and wording of the menu. About is an overlay, not a page. */
const MENU = [
  { label: 'Artwork', href: '/' },
  { label: 'Exhibitions', href: '/exhibitions/' },
  { label: 'Collaborations', href: '/collaborations/' },
  { label: 'Colour Chart', href: '/colour-chart/' },
  { label: 'About', href: '/#about', panel: 'about' },
] as const;

/** Client modules, in boot order. Preloaded so the first interaction is instant. */
const CLIENT_MODULES = ['env', 'text-roll', 'controls', 'stack', 'slider', 'panels', 'lightbox', 'index'] as const;

/** The designer's About: five lines, set in blue on peach over the blurred page. */
const ABOUT_LINES = ['CLAUDIA VALSELLS', '1969', 'Alzueta Gallery', 'Barcelona, Spain', '© All Rights Reserved'];

function topBar(path: string, controls?: Html): Html {
  return html`<header class="top">
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
    <a class="wordmark" href="${withBase('/')}" data-roll>CLAUDIA VALSELLS</a>
    <div class="top-end">${controls ?? ''}</div>
  </header>`;
}

function aboutOverlay(): Html {
  return html`<section class="about" id="about" data-panel aria-label="About">
    <a class="about-close" href="#" data-panel-close>Close</a>
    <div class="about-lines">
      ${join(ABOUT_LINES.map((line) => html`<p>${line}</p>`))}
    </div>
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

export function layout({ title, description, path, controls, children }: LayoutProps): Html {
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
${topBar(path, controls).__html}
<main id="main">${children.__html}</main>
<div class="panel-veil" data-panel-veil></div>
${aboutOverlay().__html}
${lightbox().__html}
<script type="module" src="${withBase('/js/index.js')}"></script>
</body>
</html>`);
}
