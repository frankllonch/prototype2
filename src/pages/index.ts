import { html, join, raw, type Html } from '../components/html.ts';
import { layout } from '../components/layout.ts';
import { grid, gridControls, type GridItem } from '../components/gallery.ts';
import { responsiveImage } from '../components/image.ts';
import { panels, panelShell, type PanelItem } from '../components/panels.ts';
import { exhibitionList } from '../components/exhibitions.ts';
import { SHOWS } from '../content/exhibitions-list.ts';
import { platesBody } from '../components/plates.ts';
import { commissionedList } from '../components/commissioned.ts';
import { sheetBody } from '../components/sheet.ts';
import { SHEETS } from '../content/commissioned-sheets.ts';
import { groupCommissioned } from '../content/groups.ts';
import { yearRail } from '../components/years.ts';
import { whatsColorOpening, whatsColorEdition, whatsColorFilm } from '../components/whats-color.ts';
import { colourChart, inquiries } from '../components/colour-chart.ts';
import { EDITIONS, allParticipants, type Edition } from '../content/whats-color.ts';
import { isPlate, showPhotos, type YearColour } from '../content/load.ts';
import { describeImage } from '../content/describe.ts';
import { displayTitle } from '../content/title.ts';
import { withBase } from '../content/paths.ts';
import type { Exhibition } from '../content/sections.ts';
import type { Project, ProjectImage } from '../content/types.ts';

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
    // The pile fills the screen and does not read as the top of a document.
    cue: 'ink',
    controls: gridControls([], true, works.length),
    children: html`
      <h1 class="sr-only">Claudia Valsells — Artwork</h1>
      <div class="hero" data-hero aria-hidden="true"></div>
      ${grid({
        items: works.filter((w) => w.cover).map(workItem),
        basePath: '/artwork',
        /*
         * Tiles go to the painting's own page rather than opening over the
         * gallery. The lightbox intercepted the click and pushed the work's
         * address into the bar without ever loading it, so the gallery led to
         * one thing and that same address, opened or reloaded, led to another.
         * The page is the better of the two and the one that carries the
         * caption, the lean and the way through the collection, so it is what
         * a click gets.
         */
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
export function exhibitionsPage(items: readonly Exhibition[]): Html {
  // The What’s Color? shows are held for their own section, panels and all: a
  // row taken off the index whose panel still answered would be a page nothing
  // links to.
  // Every show Claudia listed is on the page; the few that came from the source
  // page keep their photograph and their panel, matched by slug.
  // Both kinds of show give the index its hover photograph: the ones that came
  // from the site carry a cover of their own, and the ones from the archive
  // lead with their first photograph.
  const covers = new Map([
    ...items.flatMap((e) => (e.cover ? [[e.slug, e.cover] as const] : [])),
    ...[...showPhotos].flatMap(([slug, p]) => (p.cover ? [[slug, p.cover] as const] : [])),
  ]);

  /*
   * Two sheets, as the designer draws two.
   *
   * A show that came from the site has a press release, and takes the sheet
   * the commissioned work uses: masthead at the left, text under it, the
   * photograph holding the right of the screen. A show from the archive has no
   * text at all, and takes the other one: the masthead alone in the top left
   * and the photograph centred on the frame.
   *
   * Which one a show gets is decided by whether it has anything to read, not
   * by a list — so a show that gains a press release later moves across on its
   * own.
   */
  const bySlug = new Map(items.map((e) => [e.slug, e] as const));
  const sheets = SHOWS.flatMap((show) => {
    if (!show.slug) return [];
    const derived = bySlug.get(show.slug);
    const archive = showPhotos.get(show.slug);
    const images = derived?.images.length ? derived.images : archive?.images ?? [];
    if (!images.length) return [];

    const prose = derived
      ? derived.rows.flatMap((r) => r.columns).map((c) => (c.kind === 'text' ? c.html : '')).join('')
      : '';

    if (!prose.trim()) {
      return [panelShell('exhibition', show.slug, platesBody(show, images))];
    }

    const when = [
      show.from && show.to ? `From ${show.from} to ${show.to}` : show.from ?? '',
      String(show.year),
    ].filter(Boolean).join(' ');
    return [panelShell('exhibition', show.slug, sheetBody({
      title: show.title,
      lines: show.venue ? [show.venue] : [],
      when,
      body: raw(prose),
      images,
    }))];
  });

  return layout({
    title: 'Exhibitions',
    path: '/exhibitions/',
    overlays: html`<div class="panels">${join(sheets)}</div>`,
    children: html`
      <h1 class="sr-only">Exhibitions</h1>
      ${exhibitionList(SHOWS, covers)}
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
    // Drawn as the inverse of the film it crosses, as the bar's type is.
    cue: 'negative',
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
      // Everyone who took part — the roster — not only those who answered,
      // which is all `participants` holds on these pages.
      const n = (edition.roster ?? edition.participants).length;
      return answered
        ? `What’s Color? edition ${edition.numeral} — ${n} people, ${answered} of them on what color is.`
        : `What’s Color? edition ${edition.numeral} — the ${n} studios and people who took part.`;
    })(),
    children: whatsColorEdition(edition),
  });
}

/**
 * The Color Chart, on the designer's own composition: the price and the way to
 * order held still in the margin, the chart's colours beside them, and only the
 * text moving.
 *
 * The order form goes in `overlays` rather than in the page, for the reason that
 * prop exists: `main` is its own stacking context, and anything that has to rise
 * above the veil has to be outside it.
 */
export function colourChartPage(): Html {
  return layout({
    title: 'Color Chart',
    path: '/color-chart/',
    description:
      'Claudia Valsells\u2019 artist colour chart for architects and designers \u2014 a fan deck of 142 colours in real paint.',
    children: colourChart(),
    overlays: inquiries(),
  });
}

/**
 * A painting on its own page — what a shared link opens. From the grid, the
 * same work opens in the lightbox instead; this is the same composition.
 */
/**
 * Every picture there is of a work, the cut-out first.
 *
 * The cut-out is the work and takes the plate. Behind it, when the painting was
 * cropped, is the photograph it was cut from — the frame, the wall, the light —
 * and after that any further views the source carries. Each gets a small
 * picture under the plate; choosing one puts it on the plate, lean and all,
 * since there is only ever one plate.
 *
 * Nothing is listed twice: the cover is the first image, so the rest begin
 * after it. A work with one picture gets no row of small ones at all.
 */
/** The first year whose cut-outs lean towards the pointer; earlier ones lie flat. */
const TILT_FROM = 2021;

function plateStage(work: Project, name: string, under: Html = html``): Html {
  const cover = work.cover;
  if (!cover) return html``;

  // Only a cut-out leans — a photograph is a flat record of a room, and a room
  // tipping towards the pointer reads as a card, not a painting — and only
  // from TILT_FROM on. Before that the cut-out is for the gallery alone: the
  // page shows the photograph it was taken from, and lies flat.
  const plate = isPlate(cover) && (work.metadata.year ?? 0) >= TILT_FROM;
  const photo = cover.original
    ? { image: { ...cover, width: cover.original.width, height: cover.original.height, variants: cover.original.variants },
        alt: `Photograph of ${name}, uncropped` }
    : null;

  const views: { image: ProjectImage; alt: string }[] = [];
  if (plate) views.push({ image: cover, alt: describeImage(work, cover.alt) });
  if (photo) views.push(photo);
  else if (!plate) views.push({ image: cover, alt: describeImage(work, cover.alt) });
  for (const image of work.images.filter((i) => i.id !== cover.id)) {
    views.push({ image, alt: image.alt || `${name}, another view` });
  }
  return html`<div class="detail-stage">
    <figure class="detail-plate" data-tilt>
      <span class="detail-plate-inner${plate ? '' : ' is-photo'}">
        ${join(views.map((v, i) => html`<span class="detail-view${i === 0 ? ' is-shown' : ''}" data-view="${String(i)}"${plate && i === 0 ? ' data-plate' : ''}>
          ${responsiveImage({ image: v.image, sizes: '(max-width: 900px) 92vw, 54vw', priority: i === 0, alt: v.alt })}
        </span>`))}
      </span>
    </figure>
    <div class="detail-under">
      ${views.length > 1
        ? html`<div class="detail-thumbs" role="group" aria-label="Pictures of this work">
            ${join(views.map((v, i) => html`<button
              type="button"
              class="detail-thumb${i === 0 ? ' is-shown' : ''}"
              data-show="${String(i)}"
              aria-pressed="${i === 0 ? 'true' : 'false'}"
              aria-label="${v.alt}"
            >${responsiveImage({ image: v.image, sizes: '(max-width: 899px) 5rem, 6vw', priority: true, alt: '' })}</button>`))}
          </div>`
        : ''}
      ${under}
    </div>
  </div>`;
}

/**
 * After the designer's sheet of 11 November: the painting and the caption
 * side by side and centred on the page together, the caption centred on the
 * painting's middle — the title and the medium, then the size and the year —
 * and under the painting its other pictures and the work's place in the
 * archive. The arrangement itself is in the stylesheet (01-grid.css, THE
 * DETAIL PAGE); client/views.ts only sizes the painting by its painted part.
 */
export function artworkDetailPage(
  work: Project, previous?: Project, next?: Project, place?: { index: number; total: number },
): Html {
  const name = displayTitle(work.title, 'work');
  const { year, dimensions, materials } = work.metadata;
  const link = (p: Project | undefined, label: string, rel: string) =>
    p ? html`<a href="${withBase(`/artwork/${p.slug}/`)}" rel="${rel}" data-replace>${label}</a>` : html`<span></span>`;

  return layout({
    title: name,
    path: '/artwork/',
    description: work.description ?? '',
    // No menu over a painting: its corners say where to go instead.
    bodyClass: 'is-detail',
    children: html`<article class="detail">
      <a class="detail-back detail-section" href="${withBase('/artwork/')}">Artwork</a>
      <a class="detail-back detail-close" href="${withBase('/artwork/')}" aria-label="Close, back to the gallery">Close</a>
      ${plateStage(work, name, place ? html`<p class="detail-index"><b>${String(place.index)}</b> of ${String(place.total)}</p>` : html``)}
      <div class="detail-caption">
        <div class="detail-head">
          <h1 class="detail-title">${name}</h1>
          ${materials ? html`<p class="detail-medium">${materials}</p>` : ''}
        </div>
        <div class="detail-facts">
          ${dimensions ? html`<p class="detail-size">${dimensions}</p>` : ''}
          ${year ? html`<p class="detail-year">${String(year)}</p>` : ''}
        </div>
      </div>
      <nav class="detail-pager" aria-label="Between works">
        ${link(previous, 'Previous', 'prev')}
        ${link(next, 'Next', 'next')}
      </nav>
    </article>`,
  });
}

/**
 * Commissioned work: grouped by the kind of job rather than shown as a grid,
 * after the designer's layout. Same index behaviour as the exhibitions page —
 * the row answers in a colour and brings up its photograph.
 */
export function commissionedPage(items: readonly Project[]): Html {
  const groups = groupCommissioned(items);
  // Every project on the index opens on the designer's sheet. One drawn by the
  // designer carries the designer's masthead and text; one added later, with
  // no sheet yet, is set the same way from what it has — its name on the
  // index, its dates, its own text — which is what the WordPress theme does
  // with an entry whose sheet fields are empty. Nothing off the index gets a
  // panel: one nothing links to would only be found by its address.
  const sheets = groups.flatMap((group) => group.items).map((item) => {
    const p = item.project;
    const drawn = SHEETS[p.slug];
    const own = p.rows.flatMap((row) => row.columns).map((c) => (c.kind === 'text' ? c.html : '')).join('');
    return panelShell('commissioned', p.slug, sheetBody({
      title: drawn?.title ?? item.title,
      lines: drawn?.lines ?? [],
      when: drawn?.when ?? item.when,
      body: raw(drawn?.body ?? own),
      images: p.images,
    }));
  });
  return layout({
    title: 'Commissioned',
    path: '/commissioned/',
    overlays: panels('commissioned', [], join(sheets)),
    children: html`
      <h1 class="sr-only">Commissioned</h1>
      ${commissionedList(groups)}
    `,
  });
}
