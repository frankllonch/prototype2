import { html, join, raw, type Html } from './html.ts';
import { scrollCue } from './scroll-cue.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import { withBase } from '../content/paths.ts';
import { ABOUT_BLOCKS, ABOUT_CARD, ABOUT_COLLECTIONS, ABOUT_COPYRIGHT, ABOUT_SHOWS, type AboutShow, type AboutShows } from '../content/about.ts';
import { hueVars } from '../content/palette.ts';

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
  /**
   * A class on <body>, for a page that needs the chrome to behave differently.
   * The opening film is the only user: it makes the bar sticky rather than
   * fixed so it can begin in the middle of the film and rise to the top.
   */
  readonly bodyClass?: string;
  readonly overlays?: Html;
  /**
   * The hint that there is more below, on the pages that open on a full screen
   * of something. `negative` draws it as the inverse of the film behind it,
   * `ink` in the ink. It belongs at body level for the same reason the bar
   * does: a blend reaches the film only from outside `main`, which the pile
   * gives a stacking context of its own.
   */
  readonly cue?: 'ink' | 'negative';
  readonly children: Html;
}

/** Order and wording of the menu, after the designer's mockup. */
const MENU = [
  { label: 'Color Chart', href: '/color-chart/' },
  { label: 'Exhibitions', href: '/exhibitions/' },
  { label: 'Commissioned', href: '/commissioned/' },
  { label: 'Artwork', href: '/artwork/' },
  { label: 'About', href: '/#about', panel: 'about' },
] as const;

/** Client modules, in boot order. Preloaded so the first interaction is instant. */
/*
 * Which hover the bar's words wear. The one knob for it.
 *
 *   'roll'     — each letter turns over like a split-flap board
 *   'scramble' — the word churns through nonsense and settles back
 *
 * Only one is ever wired up: the choice is written onto the document and the
 * boot reads it, so the other costs nothing but the file it sits in.
 */
const HOVER: 'roll' | 'scramble' = 'scramble';

const CLIENT_MODULES = [
  'env', 'text-roll', 'transitions', 'controls', 'stack', 'years', 'hover-list', 'panels',
  'figures', 'lightbox', 'cursor', 'film', 'tilt', 'paging', 'views',
  'scroll-cue', 'about', 'inquiries', 'book', 'focus', 'hues', 'current', 'scrollbar', 'scramble', 'index',
] as const;

/** The loading screen's five lines, set in blue on peach. */
const LOADER_LINES = ['CLAUDIA VALSELLS', '1969', 'Alzueta Gallery', 'Barcelona, Spain', '© All Rights Reserved'];

/**
 * The opening screen, shown once a session while the site loads: five lines,
 * throbbing through the palette.
 *
 * Rendered on every page but hidden by the head script on all but the first, so
 * the decision is made before anything is painted rather than as a flash that is
 * then taken back.
 */
function loadingScreen(): Html {
  return html`<div class="loader" data-loader aria-hidden="true">
    ${join(LOADER_LINES.map((line) => html`<p>${line}</p>`))}
  </div>`;
}

function topBar(path: string): Html {
  return html`<header class="top">
    <a class="wordmark" href="${withBase('/')}" data-roll>CLAUDIA VALSELLS</a>
    <a class="top-soon" href="${withBase('/#whats-color')}" ${path === '/' ? raw('aria-current="page"') : ''} data-roll>What&rsquo;s Color?</a>
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
 * About opens over whatever page you are on, which stays faintly visible and
 * blurred behind it. The first screen is the designer's card: red, her name
 * at the top, her city and year beneath it, how to reach her at the foot.
 * Scrolling brings the biography up under the card in the card's own column,
 * with the two studio photographs set into it, then the record of exhibitions
 * in columns, the private collections, and the line of copyright.
 */
function aboutOverlay(): Html {
  const lead = ABOUT_BLOCKS.find((b) => b.kind === 'lead');
  const images = ABOUT_BLOCKS.flatMap((b) => (b.kind === 'figure' ? [b.image] : []));
  const text = ABOUT_BLOCKS.flatMap((b) => (b.kind === 'text' ? [b.text] : []));
  return html`<section class="about" id="about" data-panel aria-label="About">
    <a class="about-close" href="#" data-panel-close>Close</a>
    <div class="about-sheet">
      <div class="about-text">
        <div class="about-opening" data-about-opening>
          <div class="about-stage" data-about-stage>
            ${lead ? html`<p class="about-lead">${lead.text}</p>` : ''}
            ${images.length ? aboutReel(images) : ''}
          </div>
        </div>
        ${join(text.map((t) => html`<p>${t}</p>`))}
      </div>
      <div class="about-record">
        ${join(ABOUT_SHOWS.map(aboutShows))}
        <section class="about-collections">
          <h3 class="about-label">Private collections</h3>
          <ul class="about-collection-list">
            ${join(
              ABOUT_COLLECTIONS.map(
                (c) => html`<li class="about-collection">
                  <span class="about-collection-name">${c.name}</span>
                  <span class="about-collection-place">${c.place}</span>
                </li>`,
              ),
            )}
          </ul>
        </section>
      </div>
      <address class="about-contact">
        <a href="tel:${ABOUT_CARD.phone.replace(/\s+/g, '')}">${ABOUT_CARD.phone}</a>
        ${join(ABOUT_CARD.emails.map((email) => html`<a href="mailto:${email}">${email}</a>`))}
      </address>
      <p class="about-foot"><b>${ABOUT_CARD.name}</b> ${ABOUT_COPYRIGHT}</p>
    </div>
    ${aboutCue()}
    ${images.length ? aboutViewer() : ''}
  </section>`;
}

/**
 * The photographs in a row, each a button that opens it large
 * (`client/about.ts`). Buttons rather than links: there is nowhere to go, and
 * a link to the file would be followed by the page transitions and differ
 * between the static site and WordPress for no reason.
 */
function aboutReel(images: readonly ProjectImage[]): Html {
  return html`<div class="about-reel" data-about-reel>
    <div class="about-reel-track" data-about-track>
      ${join(
        images.map(
          (image) => html`<button type="button" class="about-reel-item">
            ${responsiveImage({ image, sizes: '(max-width: 899px) 45vw, 20vw' })}
          </button>`,
        ),
      )}
    </div>
  </div>`;
}

/** The start page's chevron, for About's own scroll. */
function aboutCue(): Html {
  return html`<div class="about-cue" data-about-cue aria-hidden="true">
    <svg viewBox="0 0 28 16" focusable="false">
      <path d="M1.5 1.5 L14 13 L26.5 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
    </svg>
  </div>`;
}

/** One photograph large over the page, with the exhibitions' chevrons to step. */
function aboutViewer(): Html {
  return html`<div class="about-viewer" data-about-viewer hidden>
    <figure class="about-viewer-plate" data-about-plate></figure>
    <button type="button" class="about-viewer-step is-prev" data-about-step="-1" aria-label="Previous photograph">
      <svg viewBox="0 0 9 16" aria-hidden="true" focusable="false"><path d="M8 1 1 8l7 7" /></svg>
    </button>
    <button type="button" class="about-viewer-step is-next" data-about-step="1" aria-label="Next photograph">
      <svg viewBox="0 0 9 16" aria-hidden="true" focusable="false"><path d="m1 1 7 7-7 7" /></svg>
    </button>
    <p class="sr-only" data-about-count data-template="Photograph {n} of {total}" aria-live="polite"></p>
  </div>`;
}

function aboutShows(group: AboutShows): Html {
  const list = (shows: readonly AboutShow[]) => html`<ul class="about-show-list">${join(shows.map(aboutShow))}</ul>`;
  if (!group.wide) {
    return html`<section class="about-shows">
      <h3 class="about-label">${group.heading}</h3>
      ${list(group.shows)}
    </section>`;
  }
  const others = ABOUT_SHOWS.filter((g) => !g.wide).map((g) => g.shows);
  const n = firstColumn(group.shows, others);
  return html`<section class="about-shows is-wide">
    <h3 class="about-label">${group.heading}</h3>
    <div class="about-show-columns">
      ${list(group.shows.slice(0, n))}
      ${n < group.shows.length ? list(group.shows.slice(n)) : ''}
    </div>
  </section>`;
}

function aboutShow(show: AboutShow): Html {
  return html`<li class="about-show">
    <span class="about-show-when">${show.when}</span>
    <span class="about-show-title">${broken(show.title)}</span>
    ${join(show.lines.map((line) => html`<span class="about-show-line">${broken(line)}</span>`))}
    ${join((show.places ?? []).map((place) => html`<span class="about-show-place">${broken(place)}</span>`))}
  </li>`;
}

/**
 * How many of a two-column list stand in its first column. The sheet fills
 * the fairs' first column until it is level with the longest of the others —
 * sixteen, just past the end of the solo shows — and carries the rest to the
 * top of the next; and never fewer than would leave the second column the
 * taller of the two.
 *
 * Measured as the sheet sets it: a line is 20, a separate line under it 22.75
 * further, a line broken in two (`\n`) 20 further, and 65.5 between entries.
 * The WordPress theme uses the same arithmetic (`cv_about_first_column`).
 */
function firstColumn(shows: readonly AboutShow[], others: readonly (readonly AboutShow[])[]): number {
  const entry = (s: AboutShow) =>
    [s.when, s.title, ...s.lines, ...(s.places ?? [])].reduce(
      (h, part, i) => h + (i ? 22.75 : 20) + (part.split('\n').length - 1) * 20,
      0,
    );
  const column = (list: readonly AboutShow[]) => list.reduce((h, s, i) => h + entry(s) + (i ? 65.5 : 0), 0);
  const level = Math.max(0, ...others.map(column));
  let height = 0;
  for (let i = 0; i < shows.length; i++) {
    height += entry(shows[i]!) + (i ? 65.5 : 0);
    if (height >= level && height >= column(shows.slice(i + 1))) return i + 1;
  }
  return shows.length;
}

/** A line the sheet breaks in two (`\n`), held together at the tighter pitch. */
function broken(text: string): Html {
  return join(text.split('\n').map((part, i) => (i ? html`<br />${part}` : html`${part}`)));
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

export function layout({ title, description, path, rail, controls, overlays, cue, bodyClass, children }: LayoutProps): Html {
  const fullTitle = title === 'Claudia Valsells' ? title : `${title} — Claudia Valsells`;
  const modules = CLIENT_MODULES.map((m) => withBase(`/js/${m}.js`));
  return raw(`<!doctype html>
<html lang="en" data-hover="${HOVER}" style="${hueVars()}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${fullTitle}</title>
${description ? `<meta name="description" content="${description.replace(/"/g, '&quot;').slice(0, 300)}" />` : ''}
<link rel="preload" href="${withBase('/fonts/Switzer-Variable.woff2')}" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${withBase('/site.css')}" />
${modules.map((m) => `<link rel="modulepreload" href="${m}" />`).join('\n')}
<script>document.documentElement.classList.add('js');
// The loading screen belongs to arriving at the site, not to each page of it.
// Decided here, before the first paint, so pages after the first never show it
// even for a frame.
try { if (sessionStorage.getItem('cv-seen')) document.documentElement.classList.add('loaded') } catch (e) {}
// Arriving at What's Color by its link, the page is laid out at the top and
// moved down to the written sentence by script — so it is kept covered until
// it has been, and no frame is ever painted in the wrong place. The script
// uncovers it as soon as it lands (client/write.ts); this timer is the net if
// it never runs.
// Only where that landing is made at all — the same tests client/write.ts
// makes — so a browser that keeps the plain anchor jump never waits for it.
try { var nav = performance.getEntriesByType('navigation')[0];
  if (location.hash === '#whats-color' && (!nav || nav.type === 'navigate')
    && CSS.supports('animation-timeline: view()')
    && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('wc-arriving', 'wc-swatch-drop');
    setTimeout(function () { document.documentElement.classList.remove('wc-arriving') }, 1500);
    setTimeout(function () { document.documentElement.classList.remove('wc-swatch-drop') }, 700);
  } } catch (e) {}</script>
</head>
<body${bodyClass ? ' class="' + bodyClass + '"' : ''}>
${loadingScreen().__html}
<div class="page-veil" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to content</a>
${topBar(path).__html}
${rail ? rail.__html : ''}
<main id="main">${children.__html}</main>
${overlays ? overlays.__html : ''}
${controls ? controls.__html : ''}
${cue ? scrollCue(cue).__html : ''}
<div class="cursor" data-cursor aria-hidden="true"><span class="cursor-label"></span></div>
<div class="panel-veil" data-panel-veil></div>
${aboutOverlay().__html}
${lightbox().__html}
<script type="module" src="${withBase('/js/index.js')}"></script>
</body>
</html>`);
}
