/**
 * Writes everything the WordPress import needs into wordpress/import/.
 *
 * The static site is a pure function of the dataset; so is this. Every record the
 * pages are built from — the works in their order, the commissioned work in its
 * groups, the exhibitions as Claudia listed them, the three editions of What's
 * Color? with everyone who took part, About, the Colour Chart — is written out as
 * one manifest, and every picture those records use is copied beside it, so the
 * importer (wordpress/plugins/claudiavalsells-content/import.php) has nothing to
 * derive and nothing to fetch.
 *
 *   npm run wp:export
 *
 * A cut-out painting is exported twice: the photograph it was cut from, under its
 * original filename so the old image addresses keep resolving once the uploads
 * folder is on the new site, and the cut-out itself as a flat JPEG on the paper's
 * white, named after the photograph with `-painting` added. The import makes the
 * cut-out the work's main image and keeps the photograph beside it.
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parse, type HTMLElement, type Node } from 'node-html-parser';
import { works, commissioned, exhibitions, colourChart, yearColours, isPlate, showPhotos } from '../src/content/load.ts';
import { groupCommissioned } from '../src/content/groups.ts';
import { SHEETS } from '../src/content/commissioned-sheets.ts';
import { SHOWS } from '../src/content/exhibitions-list.ts';
import { EDITIONS_ALL, LEAD } from '../src/content/whats-color.ts';
import { ABOUT_BLOCKS, ABOUT_CARD, ABOUT_COLLECTIONS, ABOUT_COPYRIGHT, ABOUT_SHOWS } from '../src/content/about.ts';
import { BANDS, price, sections, statement } from '../src/content/colour-chart.ts';
import { displayTitle } from '../src/content/title.ts';
import { describeImage } from '../src/content/describe.ts';
import type { Project, ProjectImage, Row } from '../src/content/types.ts';
import { localFile, sourceExt } from './sources.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'wordpress', 'import');
const FILES = path.join(OUT, 'files');
const MEDIA = path.join(ROOT, 'content', 'raw', 'media');
const CROPS = path.join(ROOT, 'content', 'raw', 'crops');
const PAPER = '#ffffff';

/* ------------------------------------------------------------------ pictures */

interface ImageRef {
  readonly id: string;
  /** Path under the import folder. */
  readonly src: string;
  /** The filename the attachment is given. */
  readonly name: string;
  /** The uploads folder, `YYYY/MM`, so an old address keeps resolving. */
  readonly folder: string;
  readonly alt: string;
  readonly caption?: string;
  readonly width: number;
  readonly height: number;
}

const exported = new Map<string, ImageRef>();
const exportedCrops = new Map<string, ImageRef>();
let missing = 0;

const folderOf = (image: ProjectImage, fallbackDate?: string): string => {
  const m = /\/wp-content\/uploads\/(\d{4})\/(\d{2})\//.exec(image.source);
  if (m) return `${m[1]}/${m[2]}`;
  const d = fallbackDate ? new Date(fallbackDate) : null;
  return d && !Number.isNaN(d.getTime())
    ? `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    : '2026/10';
};

/**
 * A picture's filename as the old site served it. Only what no filesystem
 * should hold is replaced — path separators, control characters, a leading
 * dot — so a © or a double hyphen stays, and the old address keeps working.
 */
const basenameOf = (image: ProjectImage): string => {
  const file = localFile(image.source) ? path.basename(image.source) : decodeURIComponent(path.basename(new URL(image.source).pathname));
  return file.replace(/[\/\\\u0000-\u001f\u007f:*?"<>|]+/g, '-').replace(/\s+/g, '-').replace(/^\.+/, '');
};

async function measure(file: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(file, { failOn: 'none' }).rotate().metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

/**
 * WordPress's own ceiling for an uploaded photograph's long side: anything
 * larger it scales down on upload and keeps as "-scaled". The old site's
 * pictures were all through that already; the archive's were not, and some
 * are 8256 pixels across — on a shared host, resizing one of those can run
 * out of memory mid-import.
 */
const LONG_EDGE = 2560;

/**
 * A photograph as the site served it, copied byte for byte — or, for the
 * archive's (`scale`), brought down to WordPress's ceiling first.
 */
async function exportImage(image: ProjectImage, alt: string, fallbackDate?: string, name?: string, scale = false): Promise<ImageRef | null> {
  const held = exported.get(image.id);
  if (held) return held;

  const file = localFile(image.source) ?? path.join(MEDIA, `${image.id}${sourceExt(image.source)}`);
  if (!existsSync(file)) { missing++; console.warn(`  ! missing ${image.source}`); return null; }

  const original = await measure(file);
  const scaling = scale && Math.max(original.width, original.height) > LONG_EDGE;
  // Scaled, the picture is written as a JPEG, so it is named as one.
  const ext = scaling ? '.jpg' : path.extname(file).toLowerCase() || '.jpg';
  const src = `files/${image.id}${ext}`;
  if (scaling) {
    // Scaled the way WordPress would, turned upright first, and saved without
    // the camera's metadata — one archive photograph's is malformed enough
    // that WordPress warns on reading it.
    await sharp(file, { failOn: 'none' }).rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toFile(path.join(OUT, src));
  } else {
    await copyFile(file, path.join(OUT, src));
  }
  const size = await measure(path.join(OUT, src));
  const ref: ImageRef = {
    id: image.id, src, name: (name ?? basenameOf(image)).replace(/\.[^.]+$/, '') + (scaling ? '.jpg' : path.extname(name ?? basenameOf(image)) || ext), folder: folderOf(image, fallbackDate),
    alt, ...(image.caption ? { caption: image.caption } : {}), ...size,
  };
  exported.set(image.id, ref);
  return ref;
}

/** The cut-out, flattened onto the paper so it is a JPEG the media library can resize. */
async function exportCrop(image: ProjectImage, alt: string, folder: string): Promise<ImageRef | null> {
  const held = exportedCrops.get(image.id);
  if (held) return held;
  const png = path.join(CROPS, `${image.id}.png`);
  const jpg = path.join(CROPS, `${image.id}.jpg`);
  const crop = existsSync(png) ? png : existsSync(jpg) ? jpg : null;
  if (!crop) return null;

  // A cut-out with transparency stays a PNG, so the painting sits on the page
  // with nothing around it, as the static site's AVIF and WebP serve it; the
  // Modern Image Formats plugin writes a WebP beside it that keeps the
  // transparency too. The few cut-outs that are JPEG have none to keep.
  // A new id for the PNG (p rather than c), so a run after the flattened JPEG
  // was imported brings the PNG in rather than reusing the old picture.
  const base = basenameOf(image).replace(/\.[^.]+$/, '');
  const alpha = crop === png;
  const src = alpha ? `files/${image.id}p.png` : `files/${image.id}c.jpg`;
  const pipe = sharp(crop, { failOn: 'none' }).rotate();
  await (alpha
    ? pipe.png({ compressionLevel: 9, adaptiveFiltering: true })
    : pipe.flatten({ background: PAPER }).jpeg({ quality: 90, progressive: true, mozjpeg: true })
  ).toFile(path.join(OUT, src));
  const size = await measure(path.join(OUT, src));
  const ref: ImageRef = alpha
    ? { id: `${image.id}p`, src, name: `${base}-painting.png`, folder, alt, ...size }
    : { id: `${image.id}c`, src, name: `${base}-painting.jpg`, folder, alt, ...size };
  exportedCrops.set(image.id, ref);
  return ref;
}

/* -------------------------------------------------------------------- blocks */

type Block =
  | { readonly type: 'paragraph'; readonly html: string; readonly className?: string }
  | { readonly type: 'heading'; readonly level: number; readonly html: string }
  | { readonly type: 'html'; readonly html: string }
  | { readonly type: 'image'; readonly image: ImageRef; readonly className?: string };

const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
// A bare ampersand in the source's text — Arts&Claus — is written as the
// entity the editor itself would save, so the page it renders is valid.
const entities = (html: string) => html.replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
const tidy = (html: string) =>
  entities(html)
    .replace(/<span>\s*<\/span>/g, '')
    .replace(/<(strong|em|b|i)>\s*<\/\1>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'figure', 'table']);

/**
 * Editor blocks out of a column of the source's HTML. Paragraphs and headings
 * become their own kind of block, so Claudia edits them as text; anything the
 * editor has no block for is kept whole as HTML, where she can still reach it.
 */
/** What makes an element a film or an embed rather than text. */
const EMBED = /<(video|audio|iframe|object|embed)\b/i;

function textBlocks(html: string | undefined): Block[] {
  if (!html || html.trim() === 'null' || !plain(html)) return [];
  const out: Block[] = [];
  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.nodeType === 3) {
        const text = node.text.replace(/\s+/g, ' ').trim();
        if (text) out.push({ type: 'paragraph', html: text });
        continue;
      }
      const el = node as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      if (!tag) continue;
      if (EMBED.test(el.innerHTML)) {
        // A film or an embed, with or without a line of fallback text inside:
        // an HTML block of its own, as the page sets it, not a paragraph that
        // wraps it.
        out.push({ type: 'html', html: tidy(el.innerHTML) });
      } else if (tag === 'p') {
        const inner = tidy(el.innerHTML);
        if (plain(inner)) out.push({ type: 'paragraph', html: inner });
      } else if (/^h[1-6]$/.test(tag)) {
        const inner = tidy(el.innerHTML);
        if (plain(inner)) out.push({ type: 'heading', level: Math.max(2, Number(tag[1])), html: inner });
      } else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span') {
        const children = el.childNodes;
        const hasBlocks = children.some((c) => c.nodeType === 1 && BLOCK_TAGS.has((c as HTMLElement).tagName.toLowerCase()));
        if (hasBlocks) walk(children);
        else {
          const inner = tidy(el.innerHTML);
          if (plain(inner)) out.push({ type: 'paragraph', html: inner });
        }
      } else if (tag === 'br') {
        continue;
      } else {
        out.push({ type: 'html', html: el.outerHTML.trim() });
      }
    }
  };
  walk(parse(html).childNodes);
  return out;
}

/** The rows of a source page, in order, as blocks: text as text, each picture as an image. */
async function rowBlocks(rows: readonly Row[], alt: (image: ProjectImage) => string, date?: string): Promise<Block[]> {
  const out: Block[] = [];
  for (const row of rows) {
    for (const column of row.columns) {
      if (column.kind === 'text') out.push(...textBlocks(column.html));
      else for (const image of column.images) {
        const ref = await exportImage(image, alt(image), date);
        if (ref) out.push({ type: 'image', image: ref });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- the record */

async function exportWorks() {
  const out = [];
  for (const work of works) {
    // A work whose picture is missing here is still written out, with no
    // picture: left out of the manifest, the importer would take it for a work
    // taken off the site and move it to the bin. The importer keeps the
    // picture it already has, or files a new work as a draft until it has one.
    const cover = work.cover;
    const name = displayTitle(work.title, 'work');
    const alt = cover ? describeImage(work, cover.alt) : name;
    const photo = cover ? await exportImage(cover, alt, work.metadata.date) : null;
    if (!cover) { missing++; console.warn(`  ! no picture for ${work.slug}`); }
    const plate = cover ? isPlate(cover) : false;
    const crop = cover && photo && plate ? await exportCrop(cover, alt, photo.folder) : null;

    const views = [];
    for (const image of work.images.filter((i) => i.id !== cover?.id)) {
      const ref = await exportImage(image, image.alt || `${name}, another view`, work.metadata.date);
      if (ref) views.push(ref);
    }
    const text = work.rows.flatMap((r) => r.columns).filter((c) => c.kind === 'text')
      .flatMap((c) => textBlocks(c.kind === 'text' ? c.html : ''));

    out.push({
      slug: work.slug,
      title: name,
      sourceTitle: work.title,
      sourceUrl: work.sourceUrl,
      date: work.metadata.date ?? null,
      year: work.metadata.year ?? null,
      dimensions: work.metadata.dimensions ?? '',
      materials: work.metadata.materials ?? '',
      reference: work.metadata.reference ?? '',
      available: Boolean(work.metadata.available),
      // The main image is the cut-out where there is one; the photograph it was
      // cut from stays beside it. Without a cut-out the photograph is the image.
      cover: crop ?? photo,
      photo: crop ? photo : null,
      plate: Boolean(crop) || plate,
      views,
      text,
    });
  }
  return out;
}

/**
 * A sheet's text as paragraph blocks, one per paragraph, each keeping its
 * class — the paragraph style it was set in (is-style-lead and the rest) and
 * any extra class such as `apart` — so the entry renders to the same markup.
 */
function sheetBlocks(body: string): Block[] {
  // Split rather than parsed: a parser writes the markup back out its own way
  // (<br> for <br />, its own entities), and the point is the same bytes.
  return [...body.matchAll(/<p(?: class="([^"]*)")?>([\s\S]*?)<\/p>/g)].map(([, className, inner]) => ({
    type: 'paragraph' as const,
    html: inner!.replace(/\s+/g, ' ').trim(),
    ...(className ? { className } : {}),
  }));
}

async function exportCommissioned() {
  const out = [];
  for (const group of groupCommissioned(commissioned)) {
    for (const [i, item] of group.items.entries()) {
      const p = item.project;
      const alt = (image: ProjectImage) => image.alt || `${item.title} — ${image.caption ?? 'commissioned work by Claudia Valsells'}`;
      // A project the designer drew is carried over as drawn: the sheet's text,
      // then its photographs in their order. The rest keep the source's own.
      const sheet = SHEETS[p.slug];
      const blocks: Block[] = sheet ? sheetBlocks(sheet.body) : await rowBlocks(p.rows, alt, p.metadata.date);
      if (sheet) {
        for (const image of p.images) {
          const ref = await exportImage(image, alt(image), p.metadata.date);
          if (ref) blocks.push({ type: 'image', image: ref });
        }
      }
      const cover = p.cover ? await exportImage(p.cover, alt(p.cover), p.metadata.date) : null;
      out.push({
        slug: p.slug,
        title: item.title,
        sourceTitle: p.title,
        sourceUrl: p.sourceUrl,
        date: p.metadata.date ?? null,
        year: p.metadata.year ?? null,
        when: item.when,
        heading: sheet?.title ?? '',
        lines: sheet?.lines.join('\n') ?? '',
        pageWhen: sheet?.when ?? '',
        group: group.name,
        order: i + 1,
        cover,
        blocks,
      });
    }
  }
  return out;
}

const normalise = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Which column of the About record a show belongs in — solo, group or fair —
 * read off the designer's record where the show is in it, and off the show's
 * own wording where it is not.
 */
function kindOf(title: string, venue: string | undefined, year: number): 'solo' | 'group' | 'fair' | '' {
  const mine = normalise(title);
  const key = mine.slice(0, 18);
  const kind = (heading: string) =>
    heading.startsWith('Solo') ? 'solo' : heading.startsWith('Group') ? 'group' : 'fair';
  const within = (show: { when: string }, years: number) => {
    const theirs = Number(show.when.slice(0, 4));
    return theirs > 0 && Math.abs(theirs - year) <= years;
  };
  // The same title first, within a few years: the two lists disagree on a
  // year here and there — Transitions is 2023 on one and 2025 on the other.
  for (const column of ABOUT_SHOWS) {
    for (const show of column.shows) {
      if (within(show, 3) && normalise(show.title) === mine) return kind(column.heading);
    }
  }
  // A fair by its wording next, before a title that merely begins the same
  // way can claim it: the 2018 Art Élysées fair starts like the 2019 solo show.
  const text = `${title} ${venue ?? ''}`;
  if (/\b(fair|feria|zona maco|almoneda|estampa|antica|scope|eurantica|art paris|art madrid|art elys|art week|aff|just lx)\b/i.test(text)) return 'fair';
  for (const column of ABOUT_SHOWS) {
    for (const show of column.shows) {
      const theirs = normalise(show.title);
      if (within(show, 1) && key && (theirs.startsWith(key) || mine.startsWith(theirs.slice(0, 18)))) {
        return kind(column.heading);
      }
    }
  }
  if (/\bgroup\b/i.test(text)) return 'group';
  if (/\bsolo\b/i.test(text)) return 'solo';
  return '';
}

async function exportExhibitions() {
  const out = [];
  for (const [i, show] of SHOWS.entries()) {
    const derived = show.slug ? exhibitions.find((e) => e.slug === show.slug) : undefined;
    const alt = (image: ProjectImage) => image.alt || `${show.title}${show.venue ? `, ${show.venue}` : ''} — installation view`;
    const blocks = derived ? await rowBlocks(derived.rows, alt) : [];
    // A show from Claudia's archive has photographs and nothing to read: they
    // come in as the entry's pictures, under names that say whose they are
    // (the archive numbers them 01, 02… in every folder), filed in the year
    // of the show.
    const archive = show.slug && !derived?.images.length ? showPhotos.get(show.slug) : undefined;
    const photos: Block[] = [];
    for (const [n, image] of (archive?.images ?? []).entries()) {
      const ext = path.extname(image.source).toLowerCase() || '.jpg';
      const name = `claudia-valsells-${show.slug}-${String(n + 1).padStart(2, '0')}${ext}`;
      const ref = await exportImage(image, alt(image), `${show.year}-06-01`, name, true);
      if (ref) photos.push({ type: 'image', image: ref });
    }
    blocks.push(...photos);
    const coverImage = derived?.cover ?? archive?.cover;
    const cover = coverImage ? await exportImage(coverImage, alt(coverImage)) : null;
    out.push({
      // Cut the way WordPress would cut it, or a hyphen left at the end would
      // be trimmed on save and the entry never found again.
      slug: show.slug ?? normalise(`${show.title} ${show.year}`).replace(/\s+/g, '-').slice(0, 60).replace(/-+$/, ''),
      title: show.title,
      venue: show.venue ?? '',
      from: show.from ?? '',
      to: show.to ?? '',
      year: show.year,
      yearEnd: show.yearEnd ?? null,
      kind: kindOf(show.title, show.venue, show.year),
      note: show.note ?? '',
      order: i + 1,
      cover,
      blocks,
    });
  }
  return out;
}

/**
 * The words the opening view's teaser ends on, for an editor to read and
 * change: the last few words of its last paragraph, which the theme finds
 * again in the full text and cuts after. Nothing when the teaser is the
 * whole text.
 */
function cutWords(teaser: readonly string[], full: readonly string[]): string {
  const last = teaser[teaser.length - 1];
  if (!last || (teaser.length === full.length && last === full[full.length - 1])) return '';
  const words = last.trim().split(/\s+/);
  return words.slice(-Math.min(6, words.length)).join(' ');
}

function exportEditions() {
  return EDITIONS_ALL.map((edition) => ({
    numeral: edition.numeral,
    slug: edition.numeral.toLowerCase(),
    title: `What’s Color? (${edition.numeral})`,
    sourceTitle: edition.sourceTitle,
    sourceSlug: edition.slug,
    // The text the opening view sets for the edition, in full, plain; the
    // theme shows it cut after `openingCut` until the reader asks for more.
    intro: edition.opening
      ? edition.opening.full.map((para) => ({ type: 'paragraph' as const, html: entities(para.replace(/</g, '&lt;')) }))
      : textBlocks(edition.intro),
    openingCut: edition.opening ? cutWords(edition.opening.teaser, edition.opening.full) : '',
    openingAlign: edition.opening?.align ?? 'left',
    // The edition's own text is what its page sets between the entries: on
    // the composed sheets (I and II) that is Claudia's paragraphs one at a
    // time, in the designer's order, which is more than the statement the
    // opening view shows run together. The theme reads the sheet's paragraphs
    // back out of this by position, so the order here is the order there.
    statement: textBlocks(
      edition.says ? edition.says.map((s) => `<p>${s}</p>`).join('') : edition.statement,
    ),
    participants: edition.participants.map((p, i) => ({
      name: p.name,
      role: p.role ?? '',
      alias: p.alias ?? '',
      code: p.code ?? '',
      colourName: p.colourName ?? '',
      answer: p.answer ?? '',
      inImages: Boolean(p.inImages),
      order: i + 1,
    })),
  }));
}

async function exportAbout() {
  const blocks: Block[] = [];
  for (const block of ABOUT_BLOCKS) {
    if (block.kind === 'figure') {
      const n = block.image.id.replace('about-', '');
      const file = path.join(ROOT, 'content', 'raw', 'about', `about-${n}.jpg`);
      if (!existsSync(file)) { missing++; console.warn(`  ! missing ${file}`); continue; }
      const src = `files/about-${n}.jpg`;
      await copyFile(file, path.join(OUT, src));
      const size = await measure(file);
      blocks.push({
        type: 'image', className: 'about-figure',
        image: { id: `about-${n}`, src, name: `claudia-valsells-studio-${n}.jpg`, folder: '2026/10', alt: block.image.alt, ...size },
      });
    } else {
      blocks.push({ type: 'paragraph', html: entities(block.text), ...(block.kind === 'lead' ? { className: 'about-lead' } : {}) });
    }
  }
  return {
    card: ABOUT_CARD,
    blocks,
    collections: ABOUT_COLLECTIONS,
    copyright: ABOUT_COPYRIGHT,
  };
}

/**
 * The Colour Chart.
 *
 * The page is hand-set — a statement in clauses, then Features, six technical
 * notes and About a colour chart — and `content/colour-chart.ts` is where that
 * setting lives. It is flattened back into one run of blocks here because that
 * is what goes into `post_content`, and `post_content` is what Claudia edits:
 * she should find her own paragraphs under her own headings in the editor, not
 * a structure this build invented.
 *
 * The three photographs are not on the sheet and their credits went with them,
 * so there are none to export.
 */
async function exportChart() {
  const body = [
    ...statement.map((block) => `<p>${block}</p>`),
    ...sections.flatMap((s) => [
      `<h2>${s.title}</h2>`,
      ...s.blocks.map((block) => `<p>${block}</p>`),
    ]),
  ].join('');

  return {
    price: price ?? '',
    bands: BANDS,
    prose: textBlocks(body),
    photographs: [],
    /*
     * The same content, still in its sections, for the theme's own component
     * to lay out. The theme renders `post_content` today and so gets `prose`;
     * this is here for the port that gives it the sheet's composition.
     */
    statement,
    sections,
    sourceTitle: colourChart?.title ?? 'Colour Chart',
  };
}

async function main() {
  // A clean folder each time, so the bundle holds exactly what the manifest
  // names — a picture replaced since the last export (a flattened cut-out by
  // its transparent one, say) would otherwise ride along to the server.
  await rm(FILES, { recursive: true, force: true });
  await rm(path.join(OUT, 'manifest.json'), { force: true });
  await mkdir(FILES, { recursive: true });
  // The bundle is meant for the importer, not for visitors: on Apache this
  // keeps its folder from being served while it sits in wp-content/import.
  await writeFile(path.join(OUT, '.htaccess'), 'Require all denied\n');
  console.log('Exporting for WordPress…');

  const manifest = {
    generatedAt: new Date().toISOString(),
    yearColours,
    lead: LEAD,
    works: await exportWorks(),
    commissioned: await exportCommissioned(),
    exhibitions: await exportExhibitions(),
    editions: exportEditions(),
    about: await exportAbout(),
    chart: await exportChart(),
  };

  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

  const answers = manifest.editions.reduce((n, e) => n + e.participants.length, 0);
  console.log(
    `Wrote ${manifest.works.length} works, ${manifest.commissioned.length} commissioned, ` +
    `${manifest.exhibitions.length} exhibitions (${manifest.exhibitions.filter((e) => e.blocks.length).length} with pages), ` +
    `${manifest.editions.length} editions with ${answers} people, About, the Colour Chart; ` +
    `${exported.size} photographs and ${exportedCrops.size} cut-outs` +
    (missing ? `; ${missing} files missing` : '') + '.',
  );
  // A bundle with holes in it is still written, so it can be looked at, but
  // the run fails: nothing chained after it (`&& npm run wp:import`, a
  // package) goes ahead on pictures that are not there.
  if (missing) {
    console.warn('The bundle is incomplete: find the missing files above before importing it.');
    process.exitCode = 1;
  }
}

await main();
