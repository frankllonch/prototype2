/** Puts the official photographs on the exhibition sheets. */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import type { Dataset, Project, ProjectImage } from '../src/content/types.ts';
import { SHOWS } from '../src/content/exhibitions-list.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const FOLDER = path.join(ROOT, 'content', 'raw', 'local', 'exhibitions');
const DATASET = path.join(ROOT, 'content', 'projects.json');
const PICTURE = /\.(jpe?g|png|webp|tiff?|avif)$/i;

/** The same id the rest of the dataset uses: the source path, hashed. */
const idOf = (source: string) => createHash('sha1').update(source).digest('hex').slice(0, 16);

async function main() {
  if (!existsSync(FOLDER)) {
    console.error(`No ${path.relative(ROOT, FOLDER)} — put the photographs there first.`);
    process.exit(1);
  }

  const dataset: Dataset = JSON.parse(await readFile(DATASET, 'utf8'));
  const projects = [...dataset.projects];
  const slugs = (await readdir(FOLDER, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();

  for (const slug of slugs) {
    const show = SHOWS.find((s) => s.slug === slug);
    if (!show) {
      console.warn(`  ! ${slug}: no exhibition by that slug — left alone.`);
      continue;
    }
    const files = (await readdir(path.join(FOLDER, slug))).filter((f) => PICTURE.test(f) && !f.startsWith('.')).sort();
    if (!files.length) continue;

    const images: ProjectImage[] = [];
    for (const file of files) {
      const source = `local/exhibitions/${slug}/${file}`;
      let width = 0, height = 0;
      try {
        const meta = await sharp(path.join(FOLDER, slug, file)).metadata();
        width = meta.width ?? 0;
        height = meta.height ?? 0;
      } catch {
        // An unreadable file is the image pipeline's to report, not this one's.
      }
      images.push({ id: idOf(source), source, alt: '', width, height });
    }
    const at = projects.findIndex((p) => p.slug === slug && p.kind === 'show');
    const record: Project = at >= 0
      ? { ...projects[at]!, cover: images[0]!, images }
      : { slug, kind: 'show', title: show.title, sourceUrl: `official:${slug}`, rows: [], cover: images[0]!, images, metadata: {} };
    if (at >= 0) projects[at] = record; else projects.push(record);
    console.log(`${slug}: ${images.length} photograph${images.length === 1 ? '' : 's'}.`);
  }

  await writeFile(DATASET, `${JSON.stringify({ ...dataset, projects }, null, 2)}\n`);
  console.log('Now run: npm run images');
}

await main();
