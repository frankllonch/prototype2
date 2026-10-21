/**
 * Adds paintings that were never on claudiavalsells.com.
 *
 * Drop the photograph into content/raw/local/<year>/, named with what is known
 * about it — `gouache on paper 95x105.jpg` — and run `npm run add-works`, then
 * `npm run images` and `npm run build`. The year comes from the folder and the
 * size and medium from the name; anything the name does not say is left out
 * rather than guessed, so a file called `3.jpg` becomes an untitled work of
 * that year and nothing more.
 *
 * Files already in the dataset are skipped, so the script can be run again
 * after every drop. Within a year the new works follow the order of their
 * names, after the works that came from the site.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import type { Dataset, Project, ProjectImage } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOCAL = path.join(ROOT, 'content', 'raw', 'local');
const DATASET = path.join(ROOT, 'content', 'projects.json');

/** Same derivation as the extractor's, so a local source gets a stable id too. */
const idOf = (source: string) => createHash('sha1').update(source).digest('hex').slice(0, 16);

/** What a file name says about the medium, in the vocabulary the site already uses. */
function materialsOf(name: string): string | undefined {
  const n = name.toLowerCase();
  if (n.includes('collage') && n.includes('gouache')) return 'Gouache and collage on paper';
  if (n.includes('gouache')) return 'Gouache on paper';
  if (n.includes('acrylic on canvas')) return 'Acrylic on canvas';
  if (n.includes('acrylic')) return 'Acrylic paint';
  if (n.includes('oil')) return 'Oil on canvas';
  return undefined;
}

function dimensionsOf(name: string): { text: string; slug: string } | undefined {
  const m = /(\d+)\s*[x×]\s*(\d+)/i.exec(name);
  if (!m) return undefined;
  return { text: `${m[1]} × ${m[2]} cm`, slug: `${m[1]}x${m[2]}cm` };
}

async function main() {
  const dataset: Dataset = JSON.parse(await readFile(DATASET, 'utf8'));
  const projects = [...dataset.projects];
  const known = new Set(projects.flatMap((p) => p.images.map((i) => i.id)));
  const slugs = new Set(projects.map((p) => p.slug));
  const hashes = new Set<string>();
  let added = 0;

  const years = (await readdir(LOCAL)).filter((d) => /^\d{4}$/.test(d)).sort();
  for (const dir of years) {
    const year = Number(dir);
    const files = (await readdir(path.join(LOCAL, dir)))
      .filter((f) => !f.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    for (const [i, file] of files.entries()) {
      const source = `local/${dir}/${file}`;
      const id = idOf(source);
      if (known.has(id)) continue;
      const abs = path.join(LOCAL, dir, file);
      const bytes = await readFile(abs);
      const hash = createHash('md5').update(bytes).digest('hex');
      if (hashes.has(hash)) { console.log(`  = ${source} is a copy of a file already added`); continue; }
      hashes.add(hash);

      const meta = await sharp(bytes).metadata();
      const upright = (meta.orientation ?? 1) >= 5;
      const width = (upright ? meta.height : meta.width) ?? 0;
      const height = (upright ? meta.width : meta.height) ?? 0;

      const stem = path.parse(file).name;
      const dims = dimensionsOf(stem);
      const materials = materialsOf(stem);
      const base = `untitled-${year}${dims ? `-${dims.slug}` : ''}`;
      let slug = base;
      for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`;
      slugs.add(slug);

      const image: ProjectImage = { id, source, alt: '', width, height };
      const work: Project = {
        slug,
        kind: 'work',
        title: `Untitled ${year}${dims ? `, ${dims.slug.replace(/cm$/, ' cm')}` : ''}`,
        sourceUrl: '',
        rows: [{ columns: [{ kind: 'images', span: 12, images: [image] }] }],
        cover: image,
        images: [image],
        metadata: {
          // The gallery sorts a year newest-first by this date. The works from
          // the site all carry a real publication date, so a time on the first
          // of January puts these after them, in the order of their names.
          date: `${year}-01-01T00:00:${String(59 - i).padStart(2, '0')}+00:00`,
          year,
          categories: ['pinturas-paintings'],
          available: false,
          ...(dims ? { dimensions: dims.text } : {}),
          ...(materials ? { materials } : {}),
        },
      };
      // Keep the paintings together, ahead of the projects and pages.
      let at = projects.length;
      while (at > 0 && projects[at - 1]!.kind !== 'work') at--;
      projects.splice(at, 0, work);
      known.add(id);
      added++;
      console.log(`  + ${year}  ${slug.padEnd(32)} ${(dims?.text ?? '').padEnd(14)} ${materials ?? ''}`);
    }
  }

  await writeFile(DATASET, JSON.stringify({ ...dataset, projects }, null, 2) + '\n');
  console.log(`Added ${added} works.`);
}

await main();
