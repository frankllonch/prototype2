/**
 * Puts the hand-made crops in content/raw/recortadas into the site, in place of
 * the ones the cropping script worked out for itself.
 *
 * It changes nothing about how images are built. `images.ts` already prefers
 * content/raw/crops/<id>.jpg over the catalogue photograph whenever that id is
 * listed in crops.final.json, so a hand-made crop only has to be written where a
 * generated one would have gone. Everything downstream — sizes, formats, the
 * `c` suffix that keeps cropped and uncropped variants apart — carries on
 * unchanged.
 *
 * Anything it replaces is kept in content/raw/crops-generated/, so this is
 * reversible. Reads content/recortadas.json for the matches; pass --exclude with
 * a comma-separated list of indices to leave particular ones alone.
 */
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECORTADAS = path.join(ROOT, 'content', 'raw', 'recortadas');
const CROPS = path.join(ROOT, 'content', 'raw', 'crops');
const KEEP = path.join(ROOT, 'content', 'raw', 'crops-generated');
const REPORT = path.join(ROOT, 'content', 'recortadas.json');
const CROP_LIST = path.join(ROOT, 'content', 'crops.final.json');

/** Matches below this are not written without being named explicitly. */
const MIN_SCORE = 0.55;

async function main() {
  const args = process.argv.slice(2);
  const excludeArg = args.find((a) => a.startsWith('--exclude='));
  const excluded = new Set(
    (excludeArg?.split('=')[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  const dryRun = args.includes('--dry-run');

  const report = JSON.parse(await readFile(REPORT, 'utf8'));
  // The review sheets are numbered by ascending score, so an exclusion given as
  // a sheet index means the same crop here.
  const byScore = [...report.crops].filter((c: any) => c.id).sort((a: any, b: any) => a.score - b.score);

  await mkdir(KEEP, { recursive: true });
  await mkdir(CROPS, { recursive: true });

  const list: string[] = JSON.parse(await readFile(CROP_LIST, 'utf8'));
  const final = new Set<string>(list);

  let written = 0, kept = 0, skipped = 0, added = 0;
  const skippedRows: string[] = [];

  for (const [index, crop] of byScore.entries()) {
    if (excluded.has(String(index))) {
      skipped++; skippedRows.push(`${index} ${crop.title ?? crop.id} — excluded`);
      continue;
    }
    if (crop.score < MIN_SCORE) {
      skipped++; skippedRows.push(`${index} ${crop.title ?? crop.id} — score ${crop.score.toFixed(2)}`);
      continue;
    }

    const source = path.join(RECORTADAS, crop.file);
    const target = path.join(CROPS, `${crop.id}.jpg`);

    if (!dryRun) {
      // Keep whatever was there, once: a second run must not overwrite the
      // original backup with a hand-made crop written by the first.
      const backup = path.join(KEEP, `${crop.id}.jpg`);
      if (existsSync(target) && !existsSync(backup)) { await copyFile(target, backup); kept++; }

      // Written as JPEG on white, which is what the rest of the pipeline expects;
      // the screenshots carry an alpha channel that would otherwise go black.
      await sharp(source).flatten({ background: '#ffffff' }).jpeg({ quality: 94 }).toFile(target);
    }
    written++;
    if (!final.has(crop.id)) { final.add(crop.id); added++; }
  }

  if (!dryRun) {
    await writeFile(CROP_LIST, JSON.stringify([...final].sort(), null, 2));
  }

  const available = (await readdir(RECORTADAS)).filter((f) => f.toLowerCase().endsWith('.png')).length;
  console.log(`${dryRun ? '[dry run] ' : ''}${written} of ${available} hand-made crops in place`);
  console.log(`  ${added} paintings newly cropped, ${written - added} replacing a generated crop`);
  console.log(`  ${kept} generated crops kept in ${path.relative(ROOT, KEEP)}`);
  console.log(`  ${final.size} paintings now served from a crop`);
  if (skippedRows.length) {
    console.log(`\n  ${skipped} left alone:`);
    for (const row of skippedRows) console.log(`    ${row}`);
  }
  if (!dryRun) console.log('\nRun `npm run images` then `npm run build`.');
}

await main();
