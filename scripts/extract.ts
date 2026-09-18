/**
 * Crawls claudiavalsells.com and writes a structured dataset to content/projects.json.
 *
 * Discovery is sitemap-driven (the site publishes wp-sitemap.xml), so we get the
 * canonical URL list from WordPress itself instead of guessing or scraping links.
 *
 * Raw HTML is cached under content/raw/ so re-runs are offline and instant; delete
 * that directory to force a refetch.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import type {
  Column, ColumnSpan, Dataset, Project, ProjectImage, ProjectKind, ProjectMetadata, Row,
} from '../src/content/types.ts';

const SITE = 'https://www.claudiavalsells.com';
const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'content', 'raw');
const OUT = path.join(ROOT, 'content', 'projects.json');
const CONCURRENCY = 8;

// ---------------------------------------------------------------- fetching

const cacheKey = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 16);

async function fetchCached(url: string): Promise<string> {
  const file = path.join(RAW, `${cacheKey(url)}.html`);
  if (existsSync(file)) return readFile(file, 'utf8');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; portfolio-migration/1.0)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await writeFile(file, html);
      return html;
    } catch (err) {
      if (attempt === 3) throw new Error(`fetch failed ${url}: ${String(err)}`);
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw new Error('unreachable');
}

/** Runs `worker` over `items` with a bounded number of in-flight promises. */
async function pool<T, R>(items: readonly T[], limit: number, worker: (item: T, i: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await worker(items[i]!, i);
      }
    }),
  );
  return results;
}

// ---------------------------------------------------------------- discovery

async function sitemapUrls(name: string): Promise<string[]> {
  const xml = await fetchCached(`${SITE}/${name}`);
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
}

// ---------------------------------------------------------------- parsing

const clean = (s: string) =>
  s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Decodes the entities WordPress emits. Numeric references are handled generically
 * rather than one at a time — the source uses at least &#215; (×) and &#8243; (″),
 * and listing them individually is how the first two got missed.
 */
const decode = (s: string) =>
  s.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
   .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
   .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   // Ampersand last, so a decoded &amp;#215; cannot be re-decoded into a character.
   .replace(/&amp;/g, '&');

function spanOf(el: HTMLElement): ColumnSpan {
  const m = /\bspan(\d{1,2})\b/.exec(el.getAttribute('class') ?? '');
  const n = m ? Number(m[1]) : 12;
  return (n >= 1 && n <= 12 ? n : 12) as ColumnSpan;
}

function imageFrom(holder: HTMLElement): ProjectImage | null {
  const img = holder.querySelector('img');
  if (!img) return null;
  const src = img.getAttribute('src');
  if (!src || !src.includes('/wp-content/uploads/')) return null;

  const anchor = holder.querySelector('a[href*="/wp-content/uploads/"]');
  // The anchor points at WordPress's ~1024px derivative; <img src> is the full asset.
  const source = src;
  const width = Number(img.getAttribute('width') ?? 0);
  const height = Number(img.getAttribute('height') ?? 0);
  const caption =
    clean(decode(holder.querySelector('figcaption')?.text ?? anchor?.getAttribute('title') ?? img.getAttribute('title') ?? ''));

  return {
    id: cacheKey(source),
    source,
    alt: clean(decode(img.getAttribute('alt') ?? '')),
    ...(caption ? { caption } : {}),
    width: width || 0,
    height: height || 0,
  };
}

/** Strips theme chrome from a text column, keeping only the writing's own markup. */
function textHtml(container: HTMLElement): string {
  const clone = parse(container.innerHTML);
  for (const el of clone.querySelectorAll('.krown-image-holder, script, style, noscript')) el.remove();
  for (const a of clone.querySelectorAll('a')) {
    const href = a.getAttribute('href') ?? '';
    // Keep outbound references, drop internal theme links that will not exist here.
    if (!/^https?:\/\//.test(href)) a.replaceWith(parse(a.innerHTML));
  }
  for (const el of clone.querySelectorAll('*')) {
    for (const attr of Object.keys(el.attributes)) {
      if (!['href', 'target', 'rel'].includes(attr)) el.removeAttribute(attr);
    }
  }
  const html = decode(clone.innerHTML).replace(/<p>\s*<\/p>/g, '').trim();
  return clean(html.replace(/\s*\n\s*/g, ' '));
}

function rowsFrom(article: HTMLElement): Row[] {
  const rows: Row[] = [];
  for (const rowEl of article.querySelectorAll('.krown-column-row')) {
    const columns: Column[] = [];
    for (const colEl of rowEl.querySelectorAll('.krown-column-container')) {
      const span = spanOf(colEl);
      const images = colEl.querySelectorAll('.krown-image-holder')
        .map(imageFrom)
        .filter((i): i is ProjectImage => i !== null);
      if (images.length) columns.push({ kind: 'images', span, images });

      const html = textHtml(colEl);
      if (html) columns.push({ kind: 'text', span, html });
    }
    if (columns.length) rows.push({ columns });
  }
  return rows;
}

const stripTags = (html: string) => clean(decode(html.replace(/<[^>]+>/g, ' ')));

function metadataFrom(postEl: HTMLElement | null, rows: readonly Row[], title: string, html: string): ProjectMetadata {
  const meta: Record<string, unknown> = {};

  const published = /"datePublished":"([^"]+)"/.exec(html)?.[1];
  if (published) {
    meta.date = published;
    meta.year = new Date(published).getUTCFullYear();
  }

  const categories = (postEl?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter((c) => c.startsWith('portfolio_category-'))
    .map((c) => c.replace('portfolio_category-', ''));
  if (categories.length) {
    meta.categories = categories;
    meta.available = categories.includes('available');
  }

  // The body text of a painting page is Claudia's own inventory line,
  // e.g. "L585, Cv2026, 162x130cm" followed by "Acrylic on canvas".
  const body = rows.flatMap((r) => r.columns).filter((c) => c.kind === 'text').map((c) => stripTags(c.html)).join(' · ');
  const haystack = `${title} · ${body}`;

  const reference = /\b([A-Z]{1,3}\d{2,4})\b/.exec(body)?.[1];
  if (reference) meta.reference = reference;

  // Prefer an explicit "cv2026"-style stamp over the publication date.
  const stamped = /\bcv\s?((?:19|20)\d{2})\b/i.exec(body)?.[1];
  const titleYear = /\b((?:19|20)\d{2})\b/.exec(title)?.[1];
  const year = stamped ?? titleYear;
  if (year) meta.year = Number(year);

  // Case-insensitive: the source writes both "162x130cm" and "162X130CM".
  const dimensions = /(\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m\b)?)/i.exec(haystack)?.[1];
  if (dimensions) {
    meta.dimensions = clean(dimensions).toLowerCase()
      .replace(/\s*[x×]\s*/i, ' × ')
      .replace(/(\d)\s*(cm|mm|m)$/, '$1 $2');
  }

  // Stop before any digit: the source often runs the medium straight into the
  // dimensions ("Acrylic on canvas 70x60cm"), which belong in their own field.
  const materials = /\b((?:acrylic|oil|gouache|watercolou?r|pigment|ink|tempera)\b[^.,;·\n\d]*)/i.exec(body)?.[1];
  if (materials) {
    meta.materials = clean(materials)
      .toLowerCase()
      .replace(/[\s(\[–-]+$/, '')
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  return meta as ProjectMetadata;
}

function slugFrom(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'index';
}

async function extractOne(url: string, kind: ProjectKind): Promise<Project | null> {
  const html = await fetchCached(url);
  const doc = parse(html);
  const article = doc.querySelector('#article');
  if (!article) return null;

  const title = clean(decode(doc.querySelector('h1.title')?.text ?? '')) ||
    clean(decode(doc.querySelector('title')?.text.split(' - ')[0] ?? ''));
  if (!title) return null;

  const rows = rowsFrom(article);
  const postEl = doc.querySelector('[id^="post-"]');
  const metadata = metadataFrom(postEl, rows, title, html);

  // De-duplicate images while preserving document order.
  const seen = new Set<string>();
  const images: ProjectImage[] = [];
  for (const row of rows) {
    for (const col of row.columns) {
      if (col.kind !== 'images') continue;
      for (const img of col.images) {
        if (seen.has(img.id)) continue;
        seen.add(img.id);
        images.push(img);
      }
    }
  }

  // Two painting pages have a dead placehold.it image in the body but a real
  // featured image, which WordPress only exposes through og:image. Recover it.
  if (images.length === 0) {
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
    if (og?.includes('/wp-content/uploads/')) {
      images.push({
        id: cacheKey(og),
        source: og,
        alt: '',
        width: Number(/<meta property="og:image:width" content="(\d+)"/.exec(html)?.[1] ?? 0),
        height: Number(/<meta property="og:image:height" content="(\d+)"/.exec(html)?.[1] ?? 0),
      });
      rows.unshift({ columns: [{ kind: 'images', span: 12, images: [images[0]!] }] });
    }
  }

  const firstText = rows.flatMap((r) => r.columns).find((c) => c.kind === 'text');
  const description = firstText ? stripTags(firstText.html).slice(0, 400) : undefined;

  return {
    slug: slugFrom(url),
    kind,
    title,
    sourceUrl: url,
    ...(description ? { description } : {}),
    rows,
    ...(images[0] ? { cover: images[0] } : {}),
    images,
    metadata,
  };
}

// ---------------------------------------------------------------- main

/** Long-form pages, as opposed to the collaboration pages under /projects/. */
const LONGFORM = new Set(['about', 'colour-chart', 'whats-color-exhibitions']);
/** Pages that are theme plumbing or commerce, not content. */
const SKIP = new Set(['index', 'carrito', 'finalizar-compra', 'contacto', 'artwork', 'projects', '4824-2', 'available-works', 'claudiavalsells.com']);

async function main() {
  await mkdir(RAW, { recursive: true });

  const [portfolio, pages] = await Promise.all([
    sitemapUrls('portfolio-sitemap.xml'),
    sitemapUrls('page-sitemap.xml'),
  ]);

  const targets: Array<{ url: string; kind: ProjectKind }> = [
    ...portfolio.map((url) => ({ url, kind: 'work' as const })),
    ...pages
      .filter((url) => !SKIP.has(slugFrom(url)))
      .map((url) => ({
        url,
        kind: (LONGFORM.has(slugFrom(url)) ? 'page' : 'project') as ProjectKind,
      })),
  ];

  console.log(`Discovered ${portfolio.length} works and ${targets.length - portfolio.length} pages.`);

  let done = 0;
  const settled = await pool(targets, CONCURRENCY, async ({ url, kind }) => {
    try {
      const project = await extractOne(url, kind);
      process.stdout.write(`\r  extracted ${++done}/${targets.length}`);
      return project;
    } catch (err) {
      console.warn(`\n  ! ${url}: ${String(err)}`);
      return null;
    }
  });

  const projects = settled.filter((p): p is Project => p !== null);
  const dataset: Dataset = {
    extractedAt: new Date().toISOString(),
    sourceSite: SITE,
    projects,
  };
  await writeFile(OUT, JSON.stringify(dataset, null, 2));

  const counts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, {});
  const imageCount = new Set(projects.flatMap((p) => p.images.map((i) => i.id))).size;
  console.log(`\nWrote ${projects.length} records (${JSON.stringify(counts)}), ${imageCount} unique images.`);
  const missing = targets.length - projects.length;
  if (missing > 0) console.log(`${missing} URL(s) produced no record — see warnings above.`);
}

await main();
