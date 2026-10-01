/**
 * Side-by-side proof for every match `match-crops.ts` made: the hand-made crop
 * on the left, the catalogue image it was matched to on the right.
 *
 * Scoring says two pictures are alike; only looking says they are the same work.
 * One file per pair so a reviewer can be given a batch, and contact sheets for
 * reading the whole set quickly.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECORTADAS = path.join(ROOT, 'content', 'raw', 'recortadas');
const MEDIA = path.join(ROOT, 'content', 'raw', 'media');
const OUT = path.join(ROOT, 'content', 'raw', 'recortadas-review');

const CELL = 420;
const LABEL = 54;

async function findMedia(id: string): Promise<string | null> {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = path.join(MEDIA, id + ext);
    try { await readFile(p); return p; } catch { /* next */ }
  }
  return null;
}

function caption(text: string, width: number): Buffer {
  const safe = text.replace(/[<&>]/g, '').slice(0, 96);
  return Buffer.from(
    `<svg width="${width}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fff"/>
      <text x="10" y="21" font-family="monospace" font-size="15" fill="#000">${safe}</text>
    </svg>`,
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = JSON.parse(await readFile(path.join(ROOT, 'content', 'recortadas.json'), 'utf8'));
  const crops = report.crops.filter((c: any) => c.id);

  // Weakest first: the ones most worth a reviewer's attention come first in the
  // numbering, so a partial review is still the useful part of one.
  const ordered = [...crops].sort((a: any, b: any) => a.score - b.score);

  const thumbs: Buffer[] = [];
  for (const [i, c] of ordered.entries()) {
    const src = await findMedia(c.id);
    if (!src) continue;
    const left = await sharp(path.join(RECORTADAS, c.file))
      .resize(CELL, CELL, { fit: 'contain', background: '#ffffff' }).toBuffer();
    const right = await sharp(src)
      .resize(CELL, CELL, { fit: 'contain', background: '#ffffff' }).toBuffer();

    const pair = await sharp({ create: { width: CELL * 2, height: CELL + LABEL, channels: 3, background: '#ffffff' } })
      .composite([
        { input: left, left: 0, top: LABEL },
        { input: right, left: CELL, top: LABEL },
        {
          input: caption(
            `${String(i).padStart(3, '0')}  score ${c.score.toFixed(2)} margin ${(c.margin ?? 0).toFixed(2)}  |  ${c.title ?? ''}`,
            CELL * 2,
          ),
          left: 0, top: 0,
        },
      ])
      .jpeg({ quality: 78 })
      .toBuffer();

    await writeFile(path.join(OUT, `pair-${String(i).padStart(3, '0')}.jpg`), pair);
    thumbs.push(await sharp(pair).resize(620, null).toBuffer());
  }

  // Contact sheets, four pairs each.
  const PER = 4;
  for (let s = 0; s * PER < thumbs.length; s++) {
    const batch = thumbs.slice(s * PER, s * PER + PER);
    const meta = await sharp(batch[0]!).metadata();
    const h = meta.height ?? 300;
    const sheet = await sharp({ create: { width: 620, height: h * batch.length, channels: 3, background: '#ffffff' } })
      .composite(batch.map((b, i) => ({ input: b, left: 0, top: i * h })))
      .jpeg({ quality: 76 })
      .toBuffer();
    await writeFile(path.join(OUT, `sheet-${String(s).padStart(2, '0')}.jpg`), sheet);
  }

  console.log(`${thumbs.length} pairs and ${Math.ceil(thumbs.length / PER)} sheets in ${path.relative(ROOT, OUT)}`);
  console.log('ordered weakest match first');
}

await main();
