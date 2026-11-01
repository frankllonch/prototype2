/**
 * Brings the exhibition photographs in from Claudia's archive.
 *
 * The archive is a folder per show, named the way she names them — a year, a
 * title, sometimes a place, sometimes a stray apostrophe. Those names are no
 * use as identifiers, so the mapping to a slug is written down here rather
 * than guessed from the folder: a guess that goes wrong files a show's
 * pictures under another show, which is the one mistake that is hard to see.
 *
 * Each photograph is copied to content/raw/local/shows/<slug>/ and recorded as
 * a project of kind `show`. That is only so the existing pipeline picks them
 * up: `npm run images` walks every project in the dataset, so these get the
 * same AVIF and WebP treatment as everything else without the pipeline needing
 * to know exhibitions exist. `load.ts` keeps them out of the works and the
 * commissioned indexes by filtering on kind.
 *
 * Re-runnable. A photograph already imported is left alone, so the script can
 * be run again after Claudia adds to the archive.
 *
 *   npm run add-shows && npm run images && npm run build
 */
import { readFile, writeFile, readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import type { Dataset, Project, ProjectImage } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARCHIVE = '/Users/nemo/Desktop/designs exhibitons/Archivo';
const SHOWS_RAW = path.join(ROOT, 'content', 'raw', 'local', 'shows');
const DATASET = path.join(ROOT, 'content', 'projects.json');

/** Archive folder -> the slug the exhibitions list uses. Written, not derived. */
const FOLDERS: ReadonlyArray<readonly [string, string, string]> = [
  ['2026 Shift towards coinidence Colectiva', 'shift-towards-coincidence', '‘Shift Towards Coincidence’'],
  ['2026 Abstract Paintings SCROLL NY 2026', 'abstract-paintings', '‘Abstract Paintings’'],
  ["2025 ep titol 'notas al pie'  COLECTIVA paper DESEMBRE", 'notas-al-pie', 'Notas al Pie'],
  ['2024 colectiva MARCO LIMITE y lugar , Madrid', 'marco-limite-y-lugar', 'Marco, Límite y Lugar'],
  ["2024 'Painting as a gift from color' Tetbury England", 'painting-as-a-gift-of-color', 'Painting as a Gift of Color'],
  ["2024 Colectiva 'what abstract art means to me ?'", 'what-abstract-art-means-to-me', 'What Abstract Art Means to Me?'],
  ['2023 COLECTIVA La terre est blue comen un orange', 'la-terre-est-bleu', 'La Terre est Bleu comme un Organge'],
  ['2020 T10 project', 't10', 'T10'],
  ['2017 Color y forma', 'color-y-forma', 'Color y forma'],
  ['2016 colectiva Axel Pairon Gallery Antwerp, Belgium', 'galeria-axel-pairon', 'Galeria Axel Pairon'],
  ['2000 el color no existe existe la luz Sala VInçon Barcelona', 'el-color-no-existe', '‘El color no existe, existe la luz’'],
];

const PICTURE = /\.(jpe?g|png|webp|tiff?|heic)$/i;
/** Same derivation as the extractor's, so a local source gets a stable id too. */
const idOf = (source: string) => createHash('sha1').update(source).digest('hex').slice(0, 16);

/** The archive folder, whose name may carry a trailing space the listing hides. */
async function resolveFolder(name: string): Promise<string | null> {
  for (const candidate of [name, `${name} `, name.trim()]) {
    const full = path.join(ARCHIVE, candidate);
    if (existsSync(full)) return full;
  }
  const entries = await readdir(ARCHIVE);
  const hit = entries.find((e) => e.trim() === name.trim());
  return hit ? path.join(ARCHIVE, hit) : null;
}

async function main(): Promise<void> {
  const dataset: Dataset = JSON.parse(await readFile(DATASET, 'utf8'));
  const projects = [...dataset.projects];
  let added = 0, kept = 0, missing: string[] = [];

  for (const [folder, slug, title] of FOLDERS) {
    const dir = await resolveFolder(folder);
    if (!dir) { missing.push(folder); continue; }

    const files = (await readdir(dir)).filter((f) => PICTURE.test(f) && !f.startsWith('.')).sort();
    const outDir = path.join(SHOWS_RAW, slug);
    await mkdir(outDir, { recursive: true });

    const images: ProjectImage[] = [];
    for (const [i, file] of files.entries()) {
      // Numbered on the way in: the archive's own names carry spaces, accents
      // and the odd apostrophe, none of which belong in a URL.
      const ext = path.extname(file).toLowerCase() === '.jpeg' ? '.jpg' : path.extname(file).toLowerCase();
      const name = `${String(i + 1).padStart(2, '0')}${ext}`;
      const dest = path.join(outDir, name);
      if (!existsSync(dest)) { await copyFile(path.join(dir, file), dest); added++; } else kept++;

      const source = `local/shows/${slug}/${name}`;
      let width = 0, height = 0;
      try {
        const meta = await sharp(dest).metadata();
        width = meta.width ?? 0; height = meta.height ?? 0;
      } catch { /* an unreadable file is reported by the image pipeline, not here */ }

      images.push({ id: idOf(source), source, alt: '', width, height });
    }

    if (!images.length) continue;
    const record: Project = {
      slug, kind: 'show', title,
      sourceUrl: `archive:${folder}`,
      rows: [],
      cover: images[0]!,
      images,
      metadata: {},
    };
    const at = projects.findIndex((p) => p.slug === slug && p.kind === 'show');
    if (at >= 0) projects[at] = record; else projects.push(record);
    console.log(`  ${slug}: ${images.length} photograph${images.length === 1 ? '' : 's'}`);
  }

  await writeFile(DATASET, `${JSON.stringify({ ...dataset, projects }, null, 2)}\n`);
  console.log(`\n${added} copied in, ${kept} already there.`);
  if (missing.length) console.log(`NOT FOUND: ${missing.join(' | ')}`);
}

await main();
