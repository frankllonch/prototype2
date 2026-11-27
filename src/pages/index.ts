import { html, join, raw, type Html } from '../components/html.ts';
import { layout } from '../components/layout.ts';
import { grid, gridControls, type GridItem } from '../components/gallery.ts';
import { responsiveImage } from '../components/image.ts';
import { panels, panelShell } from '../components/panels.ts';
import { exhibitionList } from '../components/exhibitions.ts';
import { SHOWS, placeOf } from '../content/exhibitions-list.ts';
import { setThanks, splitOpening } from '../content/shows.ts';
import { COMMISSION_LEADS, SHOW_SHEETS, applyEdits, leadWith } from '../content/show-sheets.ts';
import { platesBody } from '../components/plates.ts';
import { commissionedList } from '../components/commissioned.ts';
import { sheetBody } from '../components/sheet.ts';
import { SHEETS } from '../content/commissioned-sheets.ts';
import { groupCommissioned, type GroupedProject } from '../content/groups.ts';
import { yearRail, sideInquiries } from '../components/years.ts';
import { whatsColorOpening, whatsColorEdition, whatsColorFilm } from '../components/whats-color.ts';
import { chartPhotographs, colourChart, inquiries } from '../components/colour-chart.ts';
import { EDITIONS, type Edition } from '../content/whats-color.ts';
import { isPlate, showPhotos, type YearColour } from '../content/load.ts';
import { describeImage } from '../content/describe.ts';
import { workTitle } from '../content/title.ts';
import { captionFacts, collectionOf, referenceOf, sizeOf, techniqueOf } from '../content/caption.ts';
import { withBase } from '../content/paths.ts';
import { REEL_I, REEL_II, type Plate } from '../content/whats-color-sheet.ts';
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
  reference: referenceOf(p),
  name: workTitle(p),
  caption: captionFacts(p),
  available: p.metadata.available,
  plate: isPlate(p.cover),
});

/** The start page. */
export function artworkPage(works: readonly Project[], years: readonly YearColour[]): Html {
  return layout({
    title: 'Artwork',
    description: TAGLINE,
    path: '/artwork/',
    // Inquiries stands over the years and opens the same form the Colour Chart's order does, sent
    // to the gallery.
    rail: html`${sideInquiries()}${yearRail(years)}`,
    overlays: inquiries('gallery'),
    // The pile fills the screen and does not read as the top of a document.
    cue: 'ink',
    controls: gridControls([], true, works.length),
    children: html`
      <h1 class="sr-only">Claudia Valsells — Artwork</h1>
      <div class="hero" data-hero aria-hidden="true"></div>
      ${grid({
        items: works.filter((w) => w.cover).map(workItem),
        basePath: '/artwork',
        /* Tiles go to the painting's own page rather than opening over the gallery. */
        stack: true,
        toScale: true,
      })}
    `,
  });
}

/** A plate as an image, for the What's Color I and II shows, which reuse their editions' reels. */
const plateImage = (plate: Plate): ProjectImage => ({
  id: plate.name,
  source: `/img/${plate.name}.jpg`,
  alt: plate.alt,
  width: plate.w,
  height: plate.h,
  variants: {
    avif: [],
    webp: [{ width: plate.w, url: `/img/${plate.name}.webp` }],
    fallback: `/img/${plate.name}.jpg`,
  },
});
const EDITION_REELS: Readonly<Record<string, readonly ProjectImage[]>> = {
  'what-s-color-i': REEL_I.map(plateImage),
  'what-s-color-ii-for-architects-and-designers': REEL_II.map(plateImage),
};

function showReel(slug: string, derived: Exhibition | undefined): readonly ProjectImage[] {
  const edition = EDITION_REELS[slug];
  if (edition) return edition;
  const own = showPhotos.get(slug)?.images ?? [];
  return leadWith(own.length ? own : derived?.images ?? [], SHOW_SHEETS[slug]?.lead);
}

/** The same for a commissioned project. */
const commissionReel = (p: Project): readonly ProjectImage[] => leadWith(p.images, COMMISSION_LEADS[p.slug]);

/** Exhibitions: a list rather than a gallery, after the designer's layout. */
export function exhibitionsPage(items: readonly Exhibition[], commissioned: readonly Project[] = []): Html {
  // The What’s Color?
  const bySlug = new Map(items.map((e) => [e.slug, e] as const));
  const reels = new Map(SHOWS.flatMap(({ slug }) => (slug ? [[slug, showReel(slug, bySlug.get(slug))] as const] : [])));
  const covers = new Map([...reels].flatMap(([slug, reel]) => (reel[0] ? [[slug, reel[0]] as const] : [])));

  // A show that was also a commission opens the commissioned work's own sheet, the same one the
  // Commissioned page opens, and leads with its photograph.
  const commissions = new Map(
    groupCommissioned(commissioned).flatMap((g) => g.items).map((item) => [item.slug, item] as const),
  );
  const shared = SHOWS.flatMap((show) => {
    const item = show.commission ? commissions.get(show.commission) : undefined;
    return item ? [item] : [];
  });
  for (const item of shared) {
    const first = commissionReel(item.project)[0];
    if (first && !covers.has(item.slug)) covers.set(item.slug, first);
  }

  const sheets = SHOWS.flatMap((show) => {
    if (!show.slug) return [];
    const derived = bySlug.get(show.slug);
    // The designer's sheet for this show, where there is one: its masthead, the photograph it
    // opens on, and its text.
    const design = SHOW_SHEETS[show.slug] ?? {};
    const images = reels.get(show.slug) ?? [];
    if (!images.length) return [];

    const text = design.text ?? (derived
      ? applyEdits(setThanks(show.slug, splitOpening(derived.rows.flatMap((r) => r.columns).map((c) => (c.kind === 'text' ? c.html : '')).join(''))), design)
      : '');
    // What's Color sheets end on a link to that edition's answers.
    const prose = text.trim() && design.answers
      ? `${text}<p class="sheet-answers"><a href="${withBase(`/whats-color/${design.answers.toLowerCase()}/`)}">See answers What’s Color ${design.answers}</a></p>`
      : text;

    const title = design.title ?? show.title;
    if (!prose.trim()) {
      return [panelShell('exhibition', show.slug, platesBody(show, images, {
        title,
        ...(design.lines ? { lines: design.lines } : {}),
        ...(design.when ? { when: design.when } : {}),
        ...(design.note ? { note: design.note } : {}),
      }))];
    }

    const when = design.when ?? [
      show.from && show.to ? `From ${show.from} to ${show.to}` : show.from ?? '',
      String(show.year),
    ].filter(Boolean).join(' ');
    return [panelShell('exhibition', show.slug, sheetBody({
      title: title.replace(/\n/g, ' '),
      lines: design.lines ?? (placeOf(show.venue) ? [placeOf(show.venue)!] : []),
      when,
      body: raw(prose),
      images,
      kind: 'show',
      ...(design.artists ? { artists: design.artists } : {}),
    }))];
  });

  return layout({
    title: 'Exhibitions',
    path: '/exhibitions/',
    overlays: html`<div class="panels">${join([...sheets, ...shared.map(commissionedSheet)])}</div>`,
    children: html`
      <h1 class="sr-only">Exhibitions</h1>
      ${exhibitionList(SHOWS, covers)}
    `,
  });
}

/** What's Color?, and the first thing the site shows. */
export function whatsColorPage(): Html {
  return layout({
    title: 'Claudia Valsells',
    description:
      'What’s Color? — Claudia Valsells assigns a colour to people she admires and asks them what colour means to them.',
    path: '/',
    /*
     * The film changes how the chrome behaves: the bar begins across the middle
     * of it and rises to the top as you scroll, rather than being fixed there
     * from the start.
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
    foot: false,
    description: (() => {
      const answered = edition.participants.filter((p) => p.answer).length;
      // Everyone who took part — the roster — not only those who answered, which is all
      // `participants` holds on these pages.
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
 */
export function colourChartPage(): Html {
  return layout({
    title: 'Color Chart',
    path: '/color-chart/',
    description:
      'Claudia Valsells\u2019 artist colour chart for architects and designers \u2014 a fan deck of 142 colours in real paint.',
    /*
     * The page is longer than a screen, and the first one is the statement, so
     * the chevron says there is more under it; it goes at the first scroll.
     */
    cue: 'ink',
    bodyClass: 'chart-body',
    children: colourChart(),
    overlays: html`${chartPhotographs()}${inquiries()}`,
  });
}

/** The first year whose cut-outs lean towards the pointer; earlier ones lie flat. */
const TILT_FROM = 2021;

function plateStage(work: Project, name: string, under: Html = html``): Html {
  const cover = work.cover;
  if (!cover) return html``;

  // The cut-out always comes first, whatever the year.
  const plate = isPlate(cover);
  const tilt = plate && (work.metadata.year ?? 0) >= TILT_FROM;
  const photo = cover.original
    ? { image: { ...cover, width: cover.original.width, height: cover.original.height, variants: cover.original.variants },
        alt: `Photograph of ${name}, uncropped` }
    : null;

  const views: { image: ProjectImage; alt: string }[] = [];
  views.push({ image: cover, alt: describeImage(work, cover.alt) });
  if (plate && photo) views.push(photo);
  for (const image of work.images.filter((i) => i.id !== cover.id)) {
    views.push({ image, alt: image.alt || `${name}, another view` });
  }
  return html`<div class="detail-stage">
    <figure class="detail-plate" data-tilt>
      <span class="detail-plate-inner${tilt ? '' : ' is-photo'}">
        ${join(views.map((v, i) => html`<span class="detail-view${i === 0 ? ' is-shown' : ''}" data-view="${String(i)}"${plate && i === 0 ? ' data-plate' : ''}${plate && i === 0 && !tilt ? ' data-flat' : ''}>
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
 * After the designer's sheet of 11 November: the painting and the caption side
 * by side and centred on the page together, the caption centred on the
 * painting's middle.
 */
export function artworkDetailPage(
  work: Project, previous?: Project, next?: Project, place?: { index: number; total: number },
  around: readonly Project[] = [],
): Html {
  const name = workTitle(work);
  const dimensions = sizeOf(work);
  const materials = techniqueOf(work);
  const collection = collectionOf(work);
  const link = (p: Project | undefined, label: string, rel: string) =>
    p ? html`<a href="${withBase(`/artwork/${p.slug}/`)}" rel="${rel}" data-replace>${label}</a>` : html`<span></span>`;

  return layout({
    title: name,
    path: '/artwork/',
    description: work.description ?? '',
    // No menu over a painting: its corners say where to go instead.
    bodyClass: 'is-detail',
    foot: false,
    children: html`<article class="detail">
      ${around.length
        ? html`<div class="detail-ghost" aria-hidden="true">${join(around.map((w) =>
            w.cover ? responsiveImage({ image: w.cover, sizes: '43vw', alt: '' }) : html``))}</div>`
        : ''}
      <a class="detail-back detail-section" href="${withBase('/artwork/')}">Artwork</a>
      <a class="detail-back detail-close" href="${withBase('/artwork/')}" aria-label="Close, back to the gallery">Close</a>
      ${plateStage(work, name, place ? html`<p class="detail-index"><b>${String(place.index)}</b> of ${String(place.total)}</p>` : html``)}
      <div class="detail-caption">
        <div class="detail-head">
          <h1 class="detail-title">${name}${collection ? `, ${collection}` : ''}</h1>
          ${materials ? html`<p class="detail-medium">${materials}</p>` : ''}
        </div>
        <div class="detail-facts">
          ${dimensions && dimensions !== name ? html`<p class="detail-size">${dimensions}</p>` : ''}
        </div>
      </div>
      <nav class="detail-pager" aria-label="Between works">
        ${link(previous, 'Previous', 'prev')}
        ${link(next, 'Next', 'next')}
      </nav>
    </article>`,
  });
}

/** A commissioned project's sheet, as the Commissioned page opens it. */
function commissionedSheet(item: GroupedProject): Html {
  const p = item.project;
  const drawn = SHEETS[p.slug];
  const own = p.rows.flatMap((row) => row.columns).map((c) => (c.kind === 'text' ? c.html : '')).join('');
  return panelShell('commissioned', p.slug, sheetBody({
    title: drawn?.title ?? item.title,
    lines: drawn?.lines ?? [],
    when: drawn?.when ?? item.when,
    body: raw(drawn?.body ?? own),
    images: commissionReel(p),
  }));
}

/**
 * Commissioned work: grouped by the kind of job rather than shown as a grid,
 * after the designer's layout.
 */
export function commissionedPage(items: readonly Project[]): Html {
  const groups = groupCommissioned(items);
  // Every project on the index opens on the designer's sheet.
  const sheets = groups.flatMap((group) => group.items).map(commissionedSheet);
  return layout({
    title: 'Commissioned',
    path: '/commissioned/',
    overlays: panels('commissioned', [], join(sheets)),
    children: html`
      <h1 class="sr-only">Commissioned</h1>
      ${commissionedList(groups, commissionReel)}
    `,
  });
}
