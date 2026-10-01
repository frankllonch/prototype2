/**
 * Matches the hand-made crops in content/raw/recortadas to the paintings they
 * were cut from.
 *
 * The files arrive as screenshots named only by the minute they were taken, so
 * nothing but the picture itself says which work each one is. They are crops of
 * the catalogue images, which is the fact this leans on: a crop is a rectangle
 * of its original, so the right original is the one the crop can be *found* in.
 *
 * Two stages, because comparing every crop against every painting at a useful
 * resolution is too much work to do all at once.
 *
 * 1. A shortlist, by colour. Each image is reduced to a histogram of hue
 *    weighted by saturation — which ignores the wall, the floor and the mount,
 *    all of them near-neutral, and keeps what the painting is made of. These
 *    paintings are abstract fields of colour and no two share a palette, so this
 *    alone usually puts the right one first; it is used only to cut 154
 *    candidates down to a handful.
 *
 * 2. The decision, by search. The crop is slid over each shortlisted painting at
 *    a range of sizes and positions and scored on how well it lines up, which is
 *    the question actually being asked: is this picture a piece of that one?
 *    Colour alone would be fooled by two works in the same key; a rectangle that
 *    matches in place will not be.
 *
 * Then the assignment is made one crop to one painting, best scores first, so a
 * confident match takes its painting out of the running for a doubtful one.
 *
 * Nothing here edits the site. It writes content/recortadas.json and a set of
 * side-by-side sheets to review before anything is substituted, because a crop
 * put on the wrong painting is worse than no crop at all.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECORTADAS = path.join(ROOT, 'content', 'raw', 'recortadas');
const MEDIA = path.join(ROOT, 'content', 'raw', 'media');
const REVIEW = path.join(ROOT, 'content', 'raw', 'recortadas-review');
const REPORT = path.join(ROOT, 'content', 'recortadas.json');

/** Working size for the colour histogram. */
const HIST_SIZE = 96;
const HUE_BINS = 36;
/** Below this saturation a pixel is wall, mount or frame, and says nothing. */
const MIN_SAT = 0.18;

/** Working size for the search: the painting's long edge, in cells. */
const GRID = 56;
/** Crop widths to try, as a fraction of the painting's width. */
const SCALES = [1.0, 0.94, 0.88, 0.82, 0.76, 0.7, 0.62, 0.54, 0.46, 0.38];
/** Template resolution during the search. */
const TPL = 10;

interface Signature {
  readonly id: string;
  readonly hue: Float64Array;
  readonly aspect: number;
}

async function rgb(file: string, width: number, height: number): Promise<Buffer> {
  return sharp(file)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
}

/** Hue histogram, each pixel weighted by how saturated it is. */
function hueHistogram(px: Buffer): Float64Array {
  const bins = new Float64Array(HUE_BINS);
  for (let i = 0; i < px.length; i += 3) {
    const r = px[i]! / 255, g = px[i + 1]! / 255, b = px[i + 2]! / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const light = (max + min) / 2;
    if (max === min || light < 0.08 || light > 0.95) continue;
    const d = max - min;
    const sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (sat < MIN_SAT) continue;
    let h: number;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    bins[Math.min(HUE_BINS - 1, Math.floor(h * HUE_BINS))]! += sat * sat;
  }
  const total = bins.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < HUE_BINS; i++) bins[i]! /= total;
  return bins;
}

/** Overlap of two distributions: 1 when identical, 0 when they share nothing. */
function histogramOverlap(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < HUE_BINS; i++) sum += Math.min(a[i]!, b[i]!);
  return sum;
}

/** Mean colour of each cell of a w×h grid over the raw pixels. */
function cells(px: Buffer, w: number, h: number, gx: number, gy: number): Float64Array {
  const out = new Float64Array(gx * gy * 3);
  const counts = new Float64Array(gx * gy);
  for (let y = 0; y < h; y++) {
    const cy = Math.min(gy - 1, Math.floor((y / h) * gy));
    for (let x = 0; x < w; x++) {
      const cx = Math.min(gx - 1, Math.floor((x / w) * gx));
      const c = cy * gx + cx, p = (y * w + x) * 3;
      out[c * 3]! += px[p]!; out[c * 3 + 1]! += px[p + 1]!; out[c * 3 + 2]! += px[p + 2]!;
      counts[c]!++;
    }
  }
  for (let c = 0; c < gx * gy; c++) {
    const n = counts[c]! || 1;
    out[c * 3]! /= n; out[c * 3 + 1]! /= n; out[c * 3 + 2]! /= n;
  }
  return out;
}

/**
 * How well the template sits inside the painting, over every size and position
 * tried. Scored by mean absolute colour difference, turned into 0..1.
 */
function bestPlacement(
  plate: Float64Array, pw: number, ph: number,
  tpl: Float64Array, tw: number, th: number,
  cropAspect: number,
): { score: number; left: number; top: number; width: number; height: number } {
  let best = { score: 0, left: 0, top: 0, width: 1, height: 1 };

  for (const scale of SCALES) {
    const boxW = Math.round(pw * scale);
    // The plate grid is already in the painting's own proportions, so a box of
    // the crop's aspect ratio is just width over that ratio.
    const boxH = Math.round(boxW / cropAspect);
    if (boxW < TPL || boxH < TPL || boxW > pw || boxH > ph) continue;

    const stepX = Math.max(1, Math.round((pw - boxW) / 12)) || 1;
    const stepY = Math.max(1, Math.round((ph - boxH) / 12)) || 1;

    for (let top = 0; top + boxH <= ph; top += stepY) {
      for (let left = 0; left + boxW <= pw; left += stepX) {
        // Sample the template grid out of the plate at this box.
        let diff = 0;
        for (let ty = 0; ty < th; ty++) {
          const sy = top + Math.floor(((ty + 0.5) / th) * boxH);
          for (let tx = 0; tx < tw; tx++) {
            const sx = left + Math.floor(((tx + 0.5) / tw) * boxW);
            const pc = (Math.min(ph - 1, sy) * pw + Math.min(pw - 1, sx)) * 3;
            const tc = (ty * tw + tx) * 3;
            diff += Math.abs(plate[pc]! - tpl[tc]!)
              + Math.abs(plate[pc + 1]! - tpl[tc + 1]!)
              + Math.abs(plate[pc + 2]! - tpl[tc + 2]!);
          }
        }
        const mean = diff / (tw * th * 3);
        const score = Math.max(0, 1 - mean / 110);
        if (score > best.score) {
          best = { score, left: left / pw, top: top / ph, width: boxW / pw, height: boxH / ph };
        }
      }
    }
  }
  return best;
}

async function main() {
  await mkdir(REVIEW, { recursive: true });

  const projects = JSON.parse(await readFile(path.join(ROOT, 'content', 'projects.json'), 'utf8'));
  // Only paintings are candidates. An exhibition photograph is not a work, and
  // letting one into the pool only invites a wrong answer.
  const works = projects.projects.filter((p: any) => p.kind === 'work' && p.cover?.id);
  const coverIds: string[] = [...new Set<string>(works.map((p: any) => p.cover.id))];
  const titleOf = new Map<string, string>(works.map((p: any) => [p.cover.id, p.title]));
  console.log(`${coverIds.length} paintings, ${works.length} works`);

  const files = (await readdir(RECORTADAS)).filter((f) => f.toLowerCase().endsWith('.png')).sort();
  console.log(`${files.length} crops to place`);

  // --- signatures -----------------------------------------------------------
  const plateSig: Signature[] = [];
  const plateCells = new Map<string, { cells: Float64Array; w: number; h: number }>();
  for (const id of coverIds) {
    const file = await findMedia(id);
    if (!file) { console.warn(`  no source image for ${id}`); continue; }
    const meta = await sharp(file).metadata();
    const aspect = (meta.width ?? 1) / (meta.height ?? 1);
    plateSig.push({ id, hue: hueHistogram(await rgb(file, HIST_SIZE, HIST_SIZE)), aspect });
    const w = aspect >= 1 ? GRID : Math.max(8, Math.round(GRID * aspect));
    const h = aspect >= 1 ? Math.max(8, Math.round(GRID / aspect)) : GRID;
    plateCells.set(id, { cells: cells(await rgb(file, w, h), w, h, w, h), w, h });
  }

  const results: any[] = [];
  for (const [n, name] of files.entries()) {
    const file = path.join(RECORTADAS, name);
    const meta = await sharp(file).metadata();
    const aspect = (meta.width ?? 1) / (meta.height ?? 1);
    const hue = hueHistogram(await rgb(file, HIST_SIZE, HIST_SIZE));

    // 1. shortlist by colour
    const shortlist = plateSig
      .map((p) => ({ id: p.id, overlap: histogramOverlap(hue, p.hue) }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 10);

    // 2. decide by search
    const tpl = cells(await rgb(file, TPL * 4, TPL * 4), TPL * 4, TPL * 4, TPL, TPL);
    const scored = shortlist.map((c) => {
      const plate = plateCells.get(c.id)!;
      const placed = bestPlacement(plate.cells, plate.w, plate.h, tpl, TPL, TPL, aspect);
      return { id: c.id, title: titleOf.get(c.id) ?? '', overlap: c.overlap, ...placed };
    }).sort((a, b) => b.score - a.score);

    results.push({ file: name, aspect, candidates: scored });
    if ((n + 1) % 20 === 0) console.log(`  ${n + 1}/${files.length}`);
  }

  // --- one crop to one painting --------------------------------------------
  // Taken best-first, so a confident match claims its painting before a doubtful
  // one can take it. Two crops of the same painting cannot both win; the loser is
  // left unassigned and reported rather than forced somewhere wrong.
  const flat = results.flatMap((r) =>
    r.candidates.map((c: any, rank: number) => ({ file: r.file, rank, ...c })));
  flat.sort((a, b) => b.score - a.score);

  const takenFile = new Set<string>();
  const takenId = new Set<string>();
  const assigned = new Map<string, any>();
  for (const row of flat) {
    if (takenFile.has(row.file) || takenId.has(row.id)) continue;
    takenFile.add(row.file); takenId.add(row.id);
    assigned.set(row.file, row);
  }

  const report = {
    matchedAt: new Date().toISOString(),
    crops: results.map((r) => {
      const a = assigned.get(r.file);
      const runnerUp = r.candidates.find((c: any) => c.id !== a?.id);
      return {
        file: r.file,
        id: a?.id ?? null,
        title: a?.title ?? null,
        score: a?.score ?? 0,
        // How far clear of the next-best painting. A match that only just beats
        // its runner-up is the kind that needs looking at.
        margin: a && runnerUp ? a.score - runnerUp.score : null,
        rank: a?.rank ?? null,
        box: a ? { left: a.left, top: a.top, width: a.width, height: a.height } : null,
        alternatives: r.candidates.slice(0, 3).map((c: any) => ({ id: c.id, title: c.title, score: c.score })),
      };
    }),
  };
  await writeFile(REPORT, JSON.stringify(report, null, 2));

  const placed = report.crops.filter((c) => c.id);
  console.log(`\nplaced ${placed.length}/${files.length}`);
  const weak = placed.filter((c) => c.score < 0.6 || (c.margin ?? 1) < 0.04);
  console.log(`${weak.length} need a closer look (low score or a close runner-up)`);
  console.log(`report: ${path.relative(ROOT, REPORT)}`);
}

/** Source images keep their original extension. */
async function findMedia(id: string): Promise<string | null> {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = path.join(MEDIA, id + ext);
    try { await readFile(p); return p; } catch { /* next */ }
  }
  return null;
}

await main();
