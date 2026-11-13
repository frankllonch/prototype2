/**
 * Registers the photographs of the colour chart in use.
 *
 * The chart's own page has the statement and the way to order one; these are
 * the thing itself, out in the world — fanned on a shelf, on a workbench, in a
 * hand, open on a restaurant table. They hang off "Thanks to everyone!", which
 * is who they are of.
 *
 * Unlike `add-shows.ts` this reads no archive: the folder *is* the source.
 * Drop pictures into content/raw/local/chart, run this, and they are in. There
 * is nowhere else they could come from — they were sent rather than published,
 * so there is no URL to fetch them from and the files are the record, kept out
 * of git with the rest of content/raw.
 *
 * They are recorded as a project of kind `page` so that `npm run images` picks
 * them up: the pipeline walks every project in the dataset, and a page is the
 * one kind no index of the site lists. `load.ts` finds pages by slug and
 * nothing asks for this one but the chart.
 *
 * Re-runnable: it rewrites the record from whatever is in the folder, so
 * adding or removing a photograph is adding or removing a file.
 *
 *   npm run add-chart-photos && npm run images && npm run build
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import type { Dataset, Project, ProjectImage } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const FOLDER = path.join(ROOT, 'content', 'raw', 'local', 'chart');
const DATASET = path.join(ROOT, 'content', 'projects.json');
const SLUG = 'chart-photographs';
const PICTURE = /\.(jpe?g|png|webp|tiff?|avif)$/i;

/** The same id the rest of the dataset uses: the source path, hashed. */
const idOf = (source: string) => createHash('sha256').update(source).digest('hex').slice(0, 16);

async function main() {
  if (!existsSync(FOLDER)) {
    console.error(`No ${path.relative(ROOT, FOLDER)} — put the photographs there first.`);
    process.exit(1);
  }

  const files = (await readdir(FOLDER)).filter((f) => PICTURE.test(f) && !f.startsWith('.')).sort();
  if (!files.length) {
    console.error(`${path.relative(ROOT, FOLDER)} is empty.`);
    process.exit(1);
  }

  const images: ProjectImage[] = [];
  for (const file of files) {
    const source = `local/chart/${file}`;
    let width = 0, height = 0;
    try {
      const meta = await sharp(path.join(FOLDER, file)).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
    } catch {
      // An unreadable file is the image pipeline's to report, not this one's.
    }
    images.push({ id: idOf(source), source, alt: 'Claudia Valsells’ artist colour chart in use', width, height });
  }

  const dataset: Dataset = JSON.parse(await readFile(DATASET, 'utf8'));
  const projects = [...dataset.projects];
  const record: Project = {
    slug: SLUG,
    kind: 'page',
    title: 'The colour chart in use',
    sourceUrl: `file:${path.relative(ROOT, FOLDER)}`,
    rows: [],
    cover: images[0]!,
    images,
    metadata: {},
  };
  const at = projects.findIndex((p) => p.slug === SLUG);
  if (at >= 0) projects[at] = record; else projects.push(record);

  await writeFile(DATASET, `${JSON.stringify({ ...dataset, projects }, null, 2)}\n`);
  console.log(`${SLUG}: ${images.length} photograph${images.length === 1 ? '' : 's'}.`);
  console.log('Now run: npm run images');
}

await main();
