/**
 * One colour per year, sampled from that year's paintings.
 *
 * The year rail in the design is a column of colour swatches. Rather than
 * inventing them, each is taken from the work itself.
 *
 * Every painting is read at thumbnail size and only actual paint is kept — the
 * wall, the glass and the cream ground are filtered out by saturation and
 * lightness. The remaining pixels go into hue buckets, weighted by how vivid
 * they are.
 *
 * A year's colour is then its *distinctive* hue, not its commonest one: the
 * bucket most over-represented in that year compared with the archive as a
 * whole. Claudia paints a consistent palette, so the commonest hue is nearly
 * the same ochre every year; what separates 2024 from 2021 is which hue each
 * one leans on more than usual. That is what the rail should show.
 *
 * Output: content/years.json — [{ year, colour, count }], newest first.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Dataset } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const MEDIA = path.join(ROOT, 'content', 'raw', 'media');
const CROPS = path.join(ROOT, 'content', 'raw', 'crops');
const OUT = path.join(ROOT, 'content', 'years.json');

const SAMPLE = 64;      // px: each painting is read at this size
const HUES = 24;        // hue buckets
const MIN_SAT = 0.34;   // below this it is ground, glass or wall
const MIN_LIGHT = 0.12; // drop near-black
const MAX_LIGHT = 0.74; // drop the cream canvas
const MIN_SHARE = 0.03; // a hue needs this share of the year before it can represent it

export interface YearColour {
  readonly year: number;
  readonly colour: string;
  /** Paintings that contributed. */
  readonly count: number;
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Saturation and lightness, 0–1, from 0–255 RGB. */
function sl(r: number, g: number, b: number): { s: number; l: number; h: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { s: 0, l, h: 0 };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
  else if (max === G) h = ((B - R) / d + 2) / 6;
  else h = ((R - G) / d + 4) / 6;
  return { s, l, h };
}

async function main() {
  const dataset: Dataset = JSON.parse(await readFile(path.join(ROOT, 'content', 'projects.json'), 'utf8'));
  const cropped = new Set<string>(
    existsSync(path.join(ROOT, 'content', 'crops.final.json'))
      ? JSON.parse(await readFile(path.join(ROOT, 'content', 'crops.final.json'), 'utf8'))
      : [],
  );

  const byYear = new Map<number, string[]>();
  for (const project of dataset.projects) {
    const year = project.metadata.year;
    const cover = project.cover;
    if (project.kind !== 'work' || !year || !cover) continue;

    const crop = path.join(CROPS, `${cover.id}.jpg`);
    let file = cropped.has(cover.id) && existsSync(crop) ? crop : '';
    if (!file) {
      const ext = path.extname(new URL(cover.source).pathname) || '.jpg';
      const original = path.join(MEDIA, `${cover.id}${ext}`);
      if (existsSync(original)) file = original;
    }
    if (!file) continue;
    byYear.set(year, [...(byYear.get(year) ?? []), file]);
  }

  // Pass one: hue histograms per year, weighted by vividness.
  type Rgb = [number, number, number];
  interface Bins { count: number[]; sum: Rgb[]; total: number }
  const bins = new Map<number, Bins>();

  for (const [year, files] of byYear) {
    const b: Bins = {
      count: new Array<number>(HUES).fill(0),
      sum: Array.from({ length: HUES }, (): Rgb => [0, 0, 0]),
      total: 0,
    };

    for (const file of files) {
      const { data, info } = await sharp(file, { failOn: 'none' })
        .resize({ width: SAMPLE, height: SAMPLE, fit: 'inside' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i]!, g = data[i + 1]!, b2 = data[i + 2]!;
        const { s: sat, l, h } = sl(r, g, b2);
        if (sat < MIN_SAT || l > MAX_LIGHT || l < MIN_LIGHT) continue;
        // Weight by saturation squared, so a vivid passage counts for more than
        // a washed one and the average lands on real colour.
        const w = sat * sat;
        const bucket = Math.min(HUES - 1, Math.floor(h * HUES));
        b.count[bucket]! += w;
        b.total += w;
        const sum = b.sum[bucket]!;
        sum[0] += r * w; sum[1] += g * w; sum[2] += b2 * w;
      }
    }
    if (b.total > 0) bins.set(year, b);
  }

  // Pass two: the archive-wide distribution, to measure what is distinctive.
  const globalCount = new Array<number>(HUES).fill(0);
  let globalTotal = 0;
  for (const b of bins.values()) {
    for (let i = 0; i < HUES; i++) globalCount[i]! += b.count[i]!;
    globalTotal += b.total;
  }

  const years: YearColour[] = [];
  const taken = new Set<number>();

  for (const [year, b] of [...bins.entries()].sort((a, c) => c[0] - a[0])) {
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < HUES; i++) {
      const share = b.count[i]! / b.total;
      if (share < MIN_SHARE) continue;
      const baseline = globalCount[i]! / globalTotal;
      let score = baseline > 0 ? share / baseline : share;
      // Nudge away from a hue already spoken for, so the rail reads as a range
      // rather than three years of the same red.
      if (taken.has(i)) score *= 0.45;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) continue;
    taken.add(best);

    const n = b.count[best]!;
    const sum = b.sum[best]!;
    years.push({
      year,
      colour: hex(sum[0]! / n, sum[1]! / n, sum[2]! / n),
      count: (byYear.get(year) ?? []).length,
    });
  }

  await writeFile(OUT, JSON.stringify(years, null, 2));
  console.log(`Sampled ${years.length} years:`);
  for (const y of years) console.log(`  ${y.year}  ${y.colour}  (${y.count} works)`);
}

await main();
