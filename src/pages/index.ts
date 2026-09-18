import { html, join, raw, type Html } from '../components/html.ts';
import { layout } from '../components/layout.ts';
import { grid, gridControls, type GridItem } from '../components/gallery.ts';
import { responsiveImage } from '../components/image.ts';
import { panels, type PanelItem } from '../components/panels.ts';
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
});

/**
 * The start page. The wordmark, then every painting gathered into one stack;
 * scrolling disperses the stack into the grid, which is where the tiles live.
 */
export function artworkPage(works: readonly Project[], years: readonly number[]): Html {
  return layout({
    title: 'Claudia Valsells',
    description: TAGLINE,
    path: '/',
    controls: gridControls(years),
    children: html`
      <div class="hero" data-hero aria-hidden="true"></div>
      ${grid({ items: works.filter((w) => w.cover).map(workItem), basePath: '/artwork', lightbox: true, stack: true })}
    `,
  });
}

/** Exhibitions and collaborations: the same grid, each tile opening a panel. */
export function panelGridPage(opts: {
  readonly title: string;
  readonly path: string;
  readonly kind: string;
  readonly items: readonly PanelItem[];
}): Html {
  const gridItems: GridItem[] = opts.items
    .filter((i) => i.images[0])
    .map((i) => ({ slug: i.slug, title: i.title, image: i.images[0]!, year: i.year }));

  return layout({
    title: opts.title,
    path: opts.path,
    controls: gridControls(),
    children: html`
      <h1 class="page-title" data-roll>${opts.title}</h1>
      ${grid({ items: gridItems, basePath: opts.path.replace(/\/$/, ''), panels: opts.kind, eagerCount: gridItems.length })}
      ${panels(opts.kind, opts.items)}
    `,
  });
}

export const exhibitionItem = (e: Exhibition): PanelItem =>
  ({ slug: e.slug, title: e.title, year: e.year, images: e.images, rows: e.rows });

export const collaborationItem = (p: Project): PanelItem => ({
  slug: p.slug,
  title: displayTitle(p.title, 'project'),
  year: p.metadata.year,
  images: p.images,
  rows: p.rows,
});

/** Colour Chart, on its own page: the three photographs, then the text. */
export function colourChartPage(page: Project): Html {
  const text = page.rows.flatMap((r) => r.columns).filter((c) => c.kind === 'text');
  return layout({
    title: 'Colour Chart',
    path: '/colour-chart/',
    children: html`
      <h1 class="page-title" data-roll>Colour Chart</h1>
      <div class="chart-plates">
        ${join(page.images.slice(0, 3).map((image) => html`<figure class="chart-plate">
          ${responsiveImage({ image, sizes: '(max-width: 700px) 92vw, 30vw' })}
        </figure>`))}
      </div>
      <div class="chart-text">
        ${join(text.map((c) => html`<div class="prose">${raw(c.kind === 'text' ? c.html : '')}</div>`))}
      </div>
    `,
  });
}

/**
 * A painting on its own page — what a shared link opens. From the grid, the
 * same work opens in the lightbox instead; this is the same composition.
 */
export function artworkDetailPage(work: Project, previous?: Project, next?: Project): Html {
  const name = displayTitle(work.title, 'work');
  const { year, dimensions, materials, reference, available } = work.metadata;
  const facts = [dimensions, materials, year ? String(year) : undefined, reference, available ? 'Available' : undefined]
    .filter((f): f is string => Boolean(f));
  const link = (p: Project | undefined, label: string, rel: string) =>
    p ? html`<a href="${withBase(`/artwork/${p.slug}/`)}" rel="${rel}">${label}</a>` : html`<span></span>`;

  return layout({
    title: name,
    path: '/',
    description: work.description ?? '',
    children: html`<article class="detail">
      <a class="detail-back" href="${withBase('/')}">← Artwork</a>
      ${work.cover
        ? html`<figure class="detail-plate">
            ${responsiveImage({ image: work.cover, sizes: '(max-width: 900px) 92vw, 46vw', priority: true, alt: describeImage(work, work.cover.alt) })}
          </figure>`
        : ''}
      <div class="detail-caption">
        <h1 class="detail-title">${name}</h1>
        ${join(facts.map((f) => html`<p>${f}</p>`))}
      </div>
      <nav class="detail-pager" aria-label="Between works">
        ${link(previous, '← Previous', 'prev')}
        ${link(next, 'Next →', 'next')}
      </nav>
    </article>`,
  });
}
