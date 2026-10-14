import { html, join, raw, type Html } from '../components/html.ts';
import { layout } from '../components/layout.ts';
import { grid, gridControls, type GridItem } from '../components/gallery.ts';
import { responsiveImage } from '../components/image.ts';
import { panels, type PanelItem } from '../components/panels.ts';
import { exhibitionList } from '../components/exhibitions.ts';
import { WHATS_COLOR_SHOWS, venueFor } from '../content/shows.ts';
import { commissionedList } from '../components/commissioned.ts';
import { groupCommissioned } from '../content/groups.ts';
import { editorialBody } from '../components/editorial.ts';
import { yearRail } from '../components/years.ts';
import { whatsColorOpening, whatsColorEdition, whatsColorFilm } from '../components/whats-color.ts';
import { EDITIONS, allParticipants, type Edition } from '../content/whats-color.ts';
import { isPlate, type YearColour } from '../content/load.ts';
import { describeImage } from '../content/describe.ts';
import { displayTitle } from '../content/title.ts';
import { withBase } from '../content/paths.ts';
import type { Exhibition } from '../content/sections.ts';
import type { Project } from '../content/types.ts';

const TAGLINE = 'Claudia Valsells — an artist working with colour as material, language and subject.';

const workItem = (p: Project): GridItem => ({
  slug: p.slug,
  title: p.title,
  image: p.cover!,
  year: p.metadata.year,
  dimensions: p.metadata.dimensions,
  materials: p.metadata.materials,
  reference: p.metadata.reference,
  available: p.metadata.available,
  plate: isPlate(p.cover),
});

/**
 * The start page. The wordmark, then every painting gathered into one stack;
 * scrolling disperses the stack into the grid, which is where the tiles live.
 */
export function artworkPage(works: readonly Project[], years: readonly YearColour[]): Html {
  return layout({
    title: 'Artwork',
    description: TAGLINE,
    path: '/artwork/',
    rail: yearRail(years),
    controls: gridControls([], true),
    children: html`
      <h1 class="sr-only">Claudia Valsells — Artwork</h1>
      <div class="hero" data-hero aria-hidden="true"></div>
      ${grid({
        items: works.filter((w) => w.cover).map(workItem),
        basePath: '/artwork',
        lightbox: true,
        stack: true,
        toScale: true,
      })}
    `,
  });
}

/**
 * Exhibitions and collaborations: a grid of projects, each tile opening a panel.
 *
 * The two differ in composition. Exhibitions are installation views — rooms,
 * mostly, of varying shape — and read better in the two staggered columns after
 * nachoalegre.com. Commissioned work is a set of objects, and reads better justified
 * into rows, where they line up and can be compared.
 */
export function panelGridPage(opts: {
  readonly title: string;
  readonly path: string;
  readonly kind: string;
  readonly items: readonly PanelItem[];
  readonly composition: 'feed' | 'justified';
}): Html {
  const gridItems: GridItem[] = opts.items
    .filter((i) => i.images[0])
    .map((i) => ({ slug: i.slug, title: i.title, image: i.images[0]!, year: i.year }));

  return layout({
    title: opts.title,
    path: opts.path,
    overlays: panels(opts.kind, opts.items),
    children: html`
      <h1 class="sr-only">${opts.title}</h1>
      ${grid({
        items: gridItems,
        basePath: opts.path.replace(/\/$/, ''),
        panels: opts.kind,
        feed: opts.composition === 'feed',
        justified: opts.composition === 'justified',
        eagerCount: gridItems.length,
      })}
    `,
  });
}

export const exhibitionItem = (e: Exhibition): PanelItem => ({
  slug: e.slug,
  title: e.title,
  images: e.images,
  rows: e.rows,
  ...(e.year !== undefined ? { year: e.year } : {}),
  ...(e.venue !== undefined ? { venue: e.venue } : {}),
  ...(e.from !== undefined ? { from: e.from } : {}),
  ...(e.to !== undefined ? { to: e.to } : {}),
  ...(e.kind !== undefined ? { kind: e.kind } : {}),
});

/**
 * Exhibitions: a list rather than a gallery, after the designer's layout. The
 * name and place at the left, the run of dates and the year at the right, a rule
 * between each — and the photograph only when you reach for a row.
 */
export function exhibitionsPage(items: readonly Exhibition[], hues: readonly YearColour[]): Html {
  // The What’s Color? shows are held for their own section, panels and all: a
  // row taken off the index whose panel still answered would be a page nothing
  // links to.
  const shown = items.filter((e) => !WHATS_COLOR_SHOWS.has(e.slug));
  return layout({
    title: 'Exhibitions',
    path: '/exhibitions/',
    overlays: panels('exhibition', shown.map(exhibitionItem)),
    children: html`
      <h1 class="sr-only">Exhibitions</h1>
      ${exhibitionList(
        shown.map((e) => ({
          slug: e.slug,
          title: e.title,
          ...(e.year !== undefined ? { year: e.year } : {}),
          ...(venueFor(e.slug, e.venue) !== undefined ? { venue: venueFor(e.slug, e.venue)! } : {}),
          ...(e.from !== undefined ? { from: e.from } : {}),
          ...(e.to !== undefined ? { to: e.to } : {}),
          ...(e.cover !== undefined ? { cover: e.cover } : {}),
        })),
        hues,
      )}
    `,
  });
}

/**
 * What's Color?, and the first thing the site shows.
 *
 * It takes the place the gallery used to hold. The project is the one piece of
 * Claudia's work that is about other people — she gives each of them a colour
 * and asks them what colour is — so the page opens on the names and nothing
 * else, and the three editions introduce themselves underneath.
 *
 * Everything here is read out of the source: the rosters, the roles, the
 * colour references and the introductions all come off the pages the site
 * already has for the two exhibitions and the Terranova project.
 */
export function whatsColorPage(): Html {
  return layout({
    title: 'Claudia Valsells',
    description:
      'What’s Color? — Claudia Valsells assigns a colour to people she admires and asks them what colour means to them.',
    path: '/',
    /*
     * The film changes how the chrome behaves: the bar begins across the middle
     * of it and rises to the top as you scroll, rather than being fixed there
     * from the start. That is a page-level decision, so it travels on the body.
     */
    bodyClass: 'has-film',
    children: html`
      <h1 class="sr-only">What’s Color?</h1>
      ${whatsColorFilm()}
      ${whatsColorOpening(EDITIONS)}
    `,
  });
}

/** One edition of What's Color?, with its own names and the answers beneath. */
export function whatsColorEditionPage(edition: Edition): Html {
  return layout({
    title: `What’s Color? (${edition.numeral})`,
    path: `/whats-color/${edition.numeral.toLowerCase()}/`,
    description: (() => {
      const answered = edition.participants.filter((p) => p.answer).length;
      const n = edition.participants.length;
      return answered
        ? `What’s Color? edition ${edition.numeral} — ${n} people, ${answered} of them on what color is.`
        : `What’s Color? edition ${edition.numeral} — the ${n} studios and people who took part.`;
    })(),
    children: whatsColorEdition(edition),
  });
}

export const commissionedItem = (p: Project): PanelItem => ({
  slug: p.slug,
  title: displayTitle(p.title, 'project'),
  year: p.metadata.year,
  images: p.images,
  rows: p.rows,
});

/** The Color Chart, read the same way as an exhibition. */
export function colourChartPage(page: Project): Html {
  return layout({
    title: 'Color Chart',
    path: '/color-chart/',
    children: html`
      <h1 class="sr-only">Color Chart</h1>
      <div class="reader-page">
        ${editorialBody({ title: 'Color Chart', images: page.images, rows: page.rows })}
      </div>
    `,
  });
}

/**
 * A painting on its own page — what a shared link opens. From the grid, the
 * same work opens in the lightbox instead; this is the same composition.
 */
/**
 * The wall the painting hangs on: the rest of the collection, faint.
 *
 * Spread across the whole set rather than taken from the front, so the wall
 * reads as the body of work and not as whichever paintings happen to sort
 * first. The current one is left out — it is the thing on the wall.
 *
 * These are the same files the gallery serves at the same size, so arriving
 * here from the grid costs nothing: the browser already holds them. They are
 * lazy and `aria-hidden`, being a texture rather than a picture of anything.
 */
function plateWall(all: readonly Project[], current: string): Html {
  const others = all.filter((w) => w.slug !== current && w.cover);
  const step = Math.max(1, Math.floor(others.length / 30));
  const chosen = others.filter((_, i) => i % step === 0).slice(0, 30);
  return html`<div class="plate-wall" aria-hidden="true">
    ${join(chosen.map((w) => html`<span class="plate-wall-tile">
      ${responsiveImage({ image: w.cover!, sizes: '140px', alt: '' })}
    </span>`))}
  </div>`;
}

export function artworkDetailPage(
  work: Project,
  previous?: Project,
  next?: Project,
  index = 0,
  all: readonly Project[] = [],
): Html {
  const name = displayTitle(work.title, 'work');
  const { year, dimensions, materials, available } = work.metadata;
  const link = (p: Project | undefined, label: string, rel: string) =>
    p ? html`<a href="${withBase(`/artwork/${p.slug}/`)}" rel="${rel}">${label}</a>` : html`<span></span>`;

  return layout({
    title: name,
    path: '/artwork/',
    description: work.description ?? '',
    children: html`<article class="plate">
      ${all.length ? plateWall(all, work.slug) : ''}
      <a class="detail-back" href="${withBase('/artwork/')}">← Artwork</a>

      ${work.cover
        ? html`<figure class="plate-art" data-tilt>
            <span class="plate-art-inner">
              ${responsiveImage({ image: work.cover, sizes: '(max-width: 900px) 86vw, 44vw', priority: true, alt: describeImage(work, work.cover.alt) })}
            </span>
          </figure>`
        : ''}

      <div class="plate-facts">
        <h1 class="plate-name">${name}</h1>
        ${materials ? html`<p class="plate-medium">${materials}</p>` : ''}
        ${year || dimensions
          ? html`<p class="plate-spec">
              ${year ? html`<span class="plate-strong">${String(year)}</span>` : ''}
              ${year && dimensions ? raw('<br />') : ''}
              ${dimensions ?? ''}
            </p>`
          : ''}
        ${all.length
          ? html`<p class="plate-count"><span class="plate-strong">${String(index + 1)}</span> of ${String(all.length)}</p>`
          : ''}
        ${available ? html`<p class="plate-available">Available</p>` : ''}
      </div>

      <nav class="detail-pager" aria-label="Between works">
        ${link(previous, '← Previous', 'prev')}
        ${link(next, 'Next →', 'next')}
      </nav>
    </article>`,
  });
}


/**
 * Commissioned work: grouped by the kind of job rather than shown as a grid,
 * after the designer's layout. Same index behaviour as the exhibitions page —
 * the row answers in a colour and brings up its photograph.
 */
export function commissionedPage(items: readonly Project[], hues: readonly YearColour[]): Html {
  return layout({
    title: 'Commissioned',
    path: '/commissioned/',
    overlays: panels('commissioned', items.map(commissionedItem)),
    children: html`
      <h1 class="sr-only">Commissioned</h1>
      ${commissionedList(groupCommissioned(items), hues)}
    `,
  });
}
