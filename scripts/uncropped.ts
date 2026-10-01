/**
 * Collects the paintings still shown as photographs rather than as plates, so
 * they can be cropped by hand.
 *
 * Writes content/raw/uncropped/, one file per painting at full resolution, named
 * with its number, its title and its id. The id is what matters: keep it in the
 * filename and `apply-crops.ts --from-uncropped` can place the crop without
 * having to work out which painting it is. Rename them freely otherwise — if the
 * id is gone, `match-crops.ts` will find the painting by eye instead.
 *
 * A contact sheet comes with them, for seeing the whole job at once.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const MEDIA = path.join(ROOT, 'content', 'raw', 'media');
const OUT = path.join(ROOT, 'content', 'raw', 'uncropped');

async function findMedia(id: string): Promise<string | null> {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = path.join(MEDIA, id + ext);
    try { await readFile(p); return p; } catch { /* next */ }
  }
  return null;
}

/** Safe for a filename, and still readable at a glance in Finder. */
function slug(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

async function main() {
  const projects = JSON.parse(await readFile(path.join(ROOT, 'content', 'projects.json'), 'utf8'));
  const cropped = new Set<string>(JSON.parse(await readFile(path.join(ROOT, 'content', 'crops.final.json'), 'utf8')));

  const works = projects.projects.filter((p: any) => p.kind === 'work' && p.cover?.id);
  const seen = new Set<string>();
  const todo = works.filter((p: any) => {
    const id = p.cover.id;
    if (cropped.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // Rebuilt each time, so a crop done since the last run stops reappearing.
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const thumbs: Buffer[] = [];
  const manifest: any[] = [];
  for (const [i, work] of todo.entries()) {
    const id = work.cover.id;
    const src = await findMedia(id);
    if (!src) { console.warn(`  no source image for ${id} (${work.title})`); continue; }

    const n = String(i + 1).padStart(2, '0');
    const name = `${n} ${slug(work.title)} [${id}].jpg`;
    await sharp(src).jpeg({ quality: 95 }).toFile(path.join(OUT, name));

    manifest.push({ n: i + 1, id, title: work.title, slug: work.slug, file: name });
    thumbs.push(
      await sharp({ create: { width: 260, height: 290, channels: 3, background: '#ffffff' } })
        .composite([
          { input: await sharp(src).resize(250, 250, { fit: 'contain', background: '#ffffff' }).toBuffer(), left: 5, top: 32 },
          {
            input: Buffer.from(
              `<svg width="260" height="28" xmlns="http://www.w3.org/2000/svg">
                 <text x="4" y="19" font-family="monospace" font-size="13">${n} ${slug(work.title).replace(/[<&>]/g, '').slice(0, 30)}</text>
               </svg>`,
            ),
            left: 0, top: 0,
          },
        ])
        .jpeg().toBuffer(),
    );
  }

  const cols = 5;
  const rows = Math.ceil(thumbs.length / cols);
  await sharp({ create: { width: 260 * cols, height: 290 * rows, channels: 3, background: '#ffffff' } })
    .composite(thumbs.map((b, i) => ({ input: b, left: (i % cols) * 260, top: Math.floor(i / cols) * 290 })))
    .jpeg({ quality: 82 })
    .toFile(path.join(OUT, '_all.jpg'));

  await writeFile(path.join(OUT, '_list.json'), JSON.stringify(manifest, null, 2));

  console.log(`${manifest.length} paintings still to crop → ${path.relative(ROOT, OUT)}`);
  console.log('  _all.jpg is the contact sheet, _list.json the index');
  console.log('  keep the [id] in the filename and apply-crops can place them directly');
}

await main();
