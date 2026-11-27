import { html, join, raw, type Html } from './html.ts';
import { scrollCue, stepChevron } from './scroll-cue.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';
import { withBase } from '../content/paths.ts';
import { ABOUT_BLOCKS, ABOUT_CARD, ABOUT_COLLECTIONS, ABOUT_COPYRIGHT, ABOUT_SHOWS, rowOf, type AboutShow, type AboutShows } from '../content/about.ts';
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
  /** A class on <body>, for a page that needs the chrome to behave differently. */
  readonly bodyClass?: string;
  /** Content that must sit above the page: the detail panels. */
  readonly overlays?: Html;
  /** The hint that there is more below, on the pages that open on a full screen of something. */
  readonly cue?: 'ink' | 'negative';
  /** The contact footer at the foot of the page. */
  readonly foot?: boolean;
  readonly children: Html;
}

/** The menu, in document order. `phone` is the item's place on the phone's menu screen (CSS `order`). */
const MENU = [
  { label: 'Exhibitions', href: '/exhibitions/', phone: 1 },
  { label: 'Commissioned', href: '/commissioned/', phone: 2 },
  { label: 'Artwork', href: '/artwork/', phone: 3 },
  { label: 'Color Chart', href: '/color-chart/', phone: 4 },
  { label: 'About', href: '/#about', panel: 'about', phone: 5 },
] as const;

/** Which hover the bar's words wear: the sweep is in styles/08-hover.css and client/sweep.ts. */
const HOVER: 'roll' | 'scramble' | 'sweep' = 'sweep';

/*
 * The button is the phone's whole bar: three bars at the top right, drawn by the
 * stylesheet, which raise the header below as a screen of its own
 * (`client/menu.ts`).
 */
function topBar(path: string): Html {
  return html`<button type="button" class="menu-toggle" data-menu-toggle aria-label="Menu" aria-expanded="false" aria-controls="site-menu"><span class="menu-line"></span><span class="menu-line"></span><span class="menu-line"></span></button>
  <header class="top" id="site-menu">
    <a class="wordmark" href="${withBase('/')}" data-roll>${rolled('CLAUDIA VALSELLS')}</a>
    <a class="top-soon" href="${withBase('/#whats-color')}" ${path === '/' || path.startsWith('/whats-color/') ? raw('aria-current="page"') : ''} data-roll>${rolled('What\u2019s Color?')}</a>
    <nav class="menu" aria-label="Primary">
      ${join(
        MENU.map(
          (item) => html`<a
            href="${withBase(item.href)}"
            ${'panel' in item ? raw(`data-panel-open="${item.panel}"`) : ''}
            ${item.href === path ? raw('aria-current="page"') : ''}
            style="--menu-phone: ${item.phone}"
            data-roll
          >${rolled(item.label)}</a>`,
        ),
      )}
    </nav>
  </header>`;
}

/** A word in the bar, already cut into the roll's letters. */
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
function rolled(text: string): Html {
  let i = 0;
  const cell = HOVER === 'roll' ? 'roll' : 'scram';
  const letters = [...segmenter.segment(text)].map(({ segment }) =>
    segment.trim() ? html`<span class="${cell}" data-ch="${segment}" style="--i: ${i++}">${segment}</span>` : html`${segment}`);
  return html`<span class="roll-word" aria-hidden="true" style="--n: ${i}">${join(letters)}</span><span class="roll-text">${text}</span>`;
}

/**
 * About opens over whatever page you are on, which stays faintly visible and
 * blurred behind it, and tells itself in four parts as you scroll
 * (`client/about.ts`): the capitals lead writes itself, the reel of photographs
 * slides in and stops where the designer's sheet sets it, then moves on with the
 * scroll as the rest of the biography writes itself, and the record, the
 * collections and how to reach her come in last.
 */
function aboutOverlay(): Html {
  const lead = ABOUT_BLOCKS.find((b) => b.kind === 'lead');
  const images = ABOUT_BLOCKS.flatMap((b) => (b.kind === 'figure' ? [b.image] : []));
  const text = ABOUT_BLOCKS.flatMap((b) => (b.kind === 'text' ? [b] : []));
  return html`<section class="about" id="about" data-panel aria-label="About">
    <div class="about-sheet">
      <div class="about-text">
        <div class="about-opening" data-about-opening>
          <div class="about-stage" data-about-stage>
            ${lead ? html`<p class="about-lead">${lead.text}</p>` : ''}
            ${images.length ? aboutReel(images) : ''}
          </div>
        </div>
        ${join(
          text.map(
            (t) =>
              html`<p>${t.text}${t.link
                ? html` <a class="about-link hrow" href="${t.link.href}" target="_blank" rel="noopener">${t.link.label}</a>`
                : ''}</p>`,
          ),
        )}
      </div>
      <div class="about-record">
        ${join(ABOUT_SHOWS.map(aboutShows))}
        <section class="about-collections">
          <h3 class="about-label">Private collections</h3>
          <ul class="about-collection-list">
            ${join(
              ABOUT_COLLECTIONS.map(
                (c) => html`<li class="about-collection">
                  ${located(html`<span class="about-collection-name">${c.name}</span>
                  <span class="about-collection-place">${c.place}</span>`, rowOf(c.name))}
                </li>`,
              ),
            )}
          </ul>
        </section>
      </div>
      ${siteFoot('about-site-foot')}
    </div>
    ${images.length ? aboutViewer() : ''}
  </section>
  <a class="about-close" href="#" data-panel-close="about">Close</a>
  ${aboutCue()}
  ${images.length > 1 ? aboutSteps() : ''}`;
}

/** The photographs in a reel, each a button that opens it large (`client/about.ts`). */
function aboutReel(images: readonly ProjectImage[]): Html {
  return html`<div class="about-reel" data-about-reel>
    <div class="about-reel-track" data-about-track>
      ${join(
        images.map(
          (image) => html`<button type="button" class="about-reel-item">
            ${responsiveImage({ image, sizes: reelSizes(image) })}
          </button>`,
        ),
      )}
    </div>
    ${images.length > 1 ? aboutReelSteps() : ''}
  </div>`;
}

/**
 * How wide a photograph stands in the reel: 210 frame pixels tall, so 10.94vw of
 * height above 1097px wide and 7.5rem below it, times its own proportion.
 */
function reelSizes(image: ProjectImage): string {
  const ratio = image.width / image.height;
  return `(max-width: 1097px) ${Math.round(120 * ratio)}px, ${(10.9375 * ratio).toFixed(1)}vw`;
}

/** The reel's own chevrons: back round the loop, and on. */
function aboutReelSteps(): Html {
  return html`<button type="button" class="about-reel-step is-prev" data-about-reel-step="-1" aria-label="Earlier photographs" hidden>
      ${stepChevron(-1)}
    </button>
    <button type="button" class="about-reel-step is-next" data-about-reel-step="1" aria-label="More photographs" hidden>
      ${stepChevron(1)}
    </button>`;
}

/** The start page's chevron, for About's own scroll. */
function aboutCue(): Html {
  return html`<button type="button" class="about-cue" data-about-cue aria-label="Scroll down">
    <svg viewBox="0 0 28 16" aria-hidden="true" focusable="false">
      <path d="M1.5 1.5 L14 13 L26.5 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
    </svg>
  </button>`;
}

/** One photograph large over the page. */
function aboutViewer(): Html {
  return html`<div class="about-viewer" data-about-viewer hidden>
    <figure class="about-viewer-plate" data-about-plate></figure>
    <p class="sr-only" data-about-count data-template="Photograph {n} of {total}" aria-live="polite"></p>
  </div>`;
}

/** The exhibitions' chevrons, to step through the photographs while one is up. */
function aboutSteps(): Html {
  return html`<button type="button" class="about-viewer-step is-prev" data-about-step="-1" aria-label="Previous photograph">
      ${stepChevron(-1)}
    </button>
    <button type="button" class="about-viewer-step is-next" data-about-step="1" aria-label="Next photograph">
      ${stepChevron(1)}
    </button>`;
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
  const inner = html`<span class="about-show-when">${show.when}</span>
    <span class="about-show-title">${broken(show.title)}</span>
    ${join(show.lines.map((line) => html`<span class="about-show-line">${broken(line)}</span>`))}
    ${join((show.places ?? []).map((place) => html`<span class="about-show-place">${broken(place)}</span>`))}`;
  return html`<li class="about-show">${located(inner, rowOf(show.title, show.when, show.at))}</li>`;
}

/** An entry of the record, as a link to its row in the Exhibitions list (`client/locate.ts`). */
function located(inner: Html, row: string | undefined): Html {
  return row
    ? html`<a class="about-go hrow" href="${withBase('/exhibitions/')}#${row}" data-locate="${row}">${inner}</a>`
    : inner;
}

/** How many of a two-column list stand in its first column. */
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

/**
 * The contact footer, after the designer's HOME sheet: who to write to, the
 * copyright line About closes on, and the credit, centred at the foot of the
 * page, About included.
 */
function siteFoot(className = ''): Html {
  const [inquiries, other] = ABOUT_CARD.emails;
  return html`<footer class="site-foot${className ? ` ${className}` : ''}">
    <p>
      Artwork inquiries: <a href="mailto:${inquiries}">${inquiries}</a><br />
      Others: <a href="mailto:${other}">${other}</a>
    </p>
    <p><b>${ABOUT_CARD.name}</b> ${ABOUT_COPYRIGHT}</p>
    <p>Web design by Frank Llonch &amp; Laia Puig</p>
  </footer>`;
}

/** Runs in the head, before the first paint. Comment lines are dropped from the page. */
const HEAD_SCRIPT = String.raw`document.documentElement.classList.add('js');
// Arriving at /#whats-color: the page stays covered until client/write.ts has moved it to the
// written sentence; the timers uncover it if that never runs.
try { var nav = performance.getEntriesByType('navigation')[0];
  if (location.hash === '#whats-color' && (!nav || nav.type === 'navigate')
    && !matchMedia('(prefers-reduced-motion: reduce)').matches
    && !matchMedia('(max-width: 899px)').matches) {
    document.documentElement.classList.add('wc-arriving', 'wc-swatch-drop');
    setTimeout(function () { document.documentElement.classList.remove('wc-arriving') }, 1500);
    setTimeout(function () { document.documentElement.classList.remove('wc-swatch-drop') }, 700);
  } } catch (e) {}
// Arriving on one answer of What's Color (/whats-color/ii/#wc-…): covered until client/focus.ts
// has put the page on it; the timer uncovers it if that never runs.
try { if (/^#wc-/.test(location.hash)) {
    document.documentElement.classList.add('wc-landing');
    setTimeout(function () { document.documentElement.classList.remove('wc-landing') }, 1200);
  } } catch (e) {}
// ?film=wipe|fade|cut|blur tries a way out of the start page for the visit; ?film=off resets.
try { var film = new URLSearchParams(location.search).get('film');
  if (film === 'off') sessionStorage.removeItem('cv-film');
  else if (film && /^(fade|cut|wipe|blur)$/.test(film)) sessionStorage.setItem('cv-film', film);
  film = sessionStorage.getItem('cv-film');
  if (film) document.documentElement.style.setProperty('--start-film-style', 'film-' + film); } catch (e) {}
// The page's colour, chosen before the first paint so the bar's block never changes colour.
(function () { try { var root = document.documentElement, hues = Number(root.style.getPropertyValue('--hues')) || 0;
  if (!hues) return; var hue = Math.floor(Math.random() * hues);
  // A colour or a start-page arrival handed over by the previous page (client/transitions.ts).
  try { var held = JSON.parse(sessionStorage.getItem('cv-held') || 'null'); sessionStorage.removeItem('cv-held');
    if (held && held.path === location.pathname && Date.now() - held.at < 5000) {
      if (held.start) root.classList.add('arrive-start');
      else if (held.hue >= 0 && held.hue < hues) { hue = held.hue; root.classList.add('arrive-held'); } } } catch (e) {}
  root.dataset.hue = String(hue);
  root.style.setProperty('--bar-swatch', 'var(--neg-' + hue + ')');
  root.style.setProperty('--wc-ask', 'var(--hue-' + hue + ')'); } catch (e) {} })();
// On a phone the start page opens on the menu (client/menu.ts).
try { if (document.documentElement.hasAttribute('data-start')
  && matchMedia('(max-width: 899px)').matches
  && (location.hash === '' || location.hash === '#about'))
  document.documentElement.classList.add('is-start') } catch (e) {}
// If client/menu.ts has not started after four seconds, fall back to the page without scripts.
setTimeout(function () { var root = document.documentElement;
  if (!root.hasAttribute('data-menu')) root.classList.remove('js', 'is-start') }, 4000);`.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');

export function layout({ title, description, path, rail, controls, overlays, cue, bodyClass, foot = true, children }: LayoutProps): Html {
  const fullTitle = title === 'Claudia Valsells' ? title : `${title} — Claudia Valsells`;
  return raw(`<!doctype html>
<html lang="en" data-hover="${HOVER}"${bodyClass === 'has-film' ? ' data-start' : ''} style="${hueVars()}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${fullTitle}</title>
${description ? `<meta name="description" content="${description.replace(/"/g, '&quot;').slice(0, 300)}" />` : ''}
<link rel="preload" href="${withBase('/fonts/Switzer-Variable.woff2')}" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${withBase('/site.css')}" />
<link rel="modulepreload" href="${withBase('/js/index.js')}" />
<script>${HEAD_SCRIPT}</script>
</head>
<body${bodyClass ? ' class="' + bodyClass + '"' : ''}>
<div class="page-veil" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to content</a>
${topBar(path).__html}
${rail ? rail.__html : ''}
<main id="main">${children.__html}</main>
${foot ? siteFoot().__html : ''}
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
