/** Registers the photographs of the colour chart in use. */
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
