/**
 * Crops the gallery photographs down to the paintings.
 *
 * 127 of the 154 covers are installation shots — the canvas on a white wall,
 * floor often visible. This finds the painting in each and cuts it out, so the
 * grid shows artworks rather than photographs of rooms.
 *
 * Method, per image (worked at ~600px wide, then applied to the full file):
 *   1. Sample the wall colour from the top corners.
 *   2. Mask every pixel that is not wall-coloured.
 *   3. Label connected components; drop floor-like ones (bands spanning the
 *      width along the bottom edge) and take the dominant remainder, merging
 *      any sizeable neighbours (a white-ground painting can split into pieces).
 *   4. Validate: the crop's proportions must match the painting's known
 *      dimensions from the metadata within a tolerance. A crop that fails is
 *      thrown away and the original kept — a wrong crop is worse than none.
 *
 * Output: content/raw/crops/<id>.jpg for accepted crops, content/crops.json
 * recording every decision, and content/raw/crops/sheet-NN.jpg contact sheets
 * (original beside crop) for visual review.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Dataset, Project } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, 'content', 'raw', 'media');
/** `CROP_OUT=name` writes to content/raw/<name> and content/<name>.json — for comparing runs. */
const RUN = process.env.CROP_OUT ?? 'crops';
const OUT = path.join(ROOT, 'content', 'raw', RUN);
const REPORT = path.join(ROOT, 'content', `${RUN}.json`);

const WORK_WIDTH = 600;      // analysis resolution
const WALL_TOLERANCE = 34;   // RGB distance from wall colour to count as "object"
const ASPECT_TOLERANCE = 0.06;
const FLAT_TOLERANCE = 0.05; // image already matches the painting: nothing to crop
const MARGIN = 0.003;        // final inset, as a fraction of the crop
const SNAP_REACH = 0.06;     // how far inward (fraction of the box) an edge may snap to the frame
const SNAP_DENSITY = 0.45;   // an edge line is "the frame" once this share of it is object
const FINE_TOLERANCE = 16;   // a finer mask that sees a pale wooden frame against a white wall
const GROW_REACH = 0.32;     // how far outward (fraction of the box) to look for that frame
const GROW_DENSITY = 0.5;

export type CropStatus = 'ok' | 'flat' | 'rejected' | 'no-dimensions' | 'no-image';

export interface CropRecord {
  status: CropStatus;
  reason?: string;
  /** Crop box in full-resolution pixel coordinates. */
  box?: { left: number; top: number; width: number; height: number };
  metaAspect?: number;
  cropAspect?: number;
  imageAspect?: number;
}

/* ------------------------------------------------------------- geometry */

interface Box { x0: number; y0: number; x1: number; y1: number }
const boxW = (b: Box) => b.x1 - b.x0 + 1;
const boxH = (b: Box) => b.y1 - b.y0 + 1;

/** "162 × 130 cm" → width/height as photographed. Orientation is settled later. */
function dimensionsOf(project: Project): [number, number] | null {
  const m = /(\d+(?:[.,]\d+)?)\s*×\s*(\d+(?:[.,]\d+)?)/.exec(project.metadata.dimensions ?? '');
  if (!m) return null;
  const a = Number(m[1]!.replace(',', '.'));
  const b = Number(m[2]!.replace(',', '.'));
  return a > 0 && b > 0 ? [a, b] : null;
}

/** Closest match between an aspect and a painting's dimensions, either way round. */
function aspectError(aspect: number, dims: [number, number]): { error: number; metaAspect: number } {
  const [a, b] = dims;
  const candidates = [a / b, b / a];
  let best = { error: Infinity, metaAspect: candidates[0]! };
  for (const metaAspect of candidates) {
    const error = Math.abs(aspect / metaAspect - 1);
    if (error < best.error) best = { error, metaAspect };
  }
  return best;
}

/* ------------------------------------------------------------- analysis */

interface Raster { data: Buffer; width: number; height: number; channels: number }

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Wall colour: median of the two top corners, which are wall in every installation shot. */
function wallColour({ data, width, height, channels }: Raster): [number, number, number] {
  const pw = Math.max(4, Math.floor(width * 0.1));
  const ph = Math.max(4, Math.floor(height * 0.08));
  const r: number[] = [], g: number[] = [], b: number[] = [];
  for (const x0 of [0, width - pw]) {
    for (let y = 0; y < ph; y++) {
      for (let x = x0; x < x0 + pw; x++) {
        const i = (y * width + x) * channels;
        r.push(data[i]!); g.push(data[i + 1]!); b.push(data[i + 2]!);
      }
    }
  }
  return [median(r), median(g), median(b)];
}

function objectMask(raster: Raster, wall: [number, number, number], tolerance = WALL_TOLERANCE): Uint8Array {
  const { data, width, height, channels } = raster;
  const mask = new Uint8Array(width * height);
  const t2 = tolerance * tolerance;
  for (let p = 0; p < width * height; p++) {
    const i = p * channels;
    const dr = data[i]! - wall[0], dg = data[i + 1]! - wall[1], db = data[i + 2]! - wall[2];
    mask[p] = dr * dr + dg * dg + db * db > t2 ? 1 : 0;
  }
  return mask;
}

/** Binary closing with a small square, so thin frames and light passages join up. */
function close(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const dilate = (src: Uint8Array) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let on = 0;
      for (let dy = -radius; dy <= radius && !on; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < height && xx >= 0 && xx < width && src[yy * width + xx]) { on = 1; break; }
      }
      out[y * width + x] = on;
    }
    return out;
  };
  const erode = (src: Uint8Array) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let on = 1;
      for (let dy = -radius; dy <= radius && on; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || yy >= height || xx < 0 || xx >= width || !src[yy * width + xx]) { on = 0; break; }
      }
      out[y * width + x] = on;
    }
    return out;
  };
  return erode(dilate(mask));
}

interface Component { box: Box; area: number }

function components(mask: Uint8Array, width: number, height: number): Component[] {
  const seen = new Uint8Array(mask.length);
  const found: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    seen[start] = 1;
    stack.push(start);
    const box: Box = { x0: width, y0: height, x1: -1, y1: -1 };
    let area = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width, y = (p - x) / width;
      area++;
      if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y;
      for (const q of [p - 1, p + 1, p - width, p + width]) {
        if (q < 0 || q >= mask.length || seen[q] || !mask[q]) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === width - 1)) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    found.push({ box, area });
  }
  return found;
}

/** Floors, skirting and shadows: wide bands sitting on the bottom edge. */
const isFloorLike = (c: Component, width: number, height: number) =>
  c.box.y1 >= height - 2 && boxW(c.box) > width * 0.7 && boxH(c.box) < height * 0.45;

/** Wall-edge artefacts: thin strips along the sides. */
const isEdgeStrip = (c: Component, width: number, height: number) =>
  (c.box.x0 <= 1 || c.box.x1 >= width - 2) && boxW(c.box) < width * 0.08 && boxH(c.box) > height * 0.5;

function paintingBox(mask: Uint8Array, width: number, height: number): Box | null {
  const all = components(mask, width, height)
    .filter((c) => c.area > width * height * 0.002)
    .filter((c) => !isFloorLike(c, width, height) && !isEdgeStrip(c, width, height))
    .sort((a, b) => b.area - a.area);
  const main = all[0];
  if (!main) return null;

  // Merge sizeable pieces that sit within the main box's neighbourhood: a light
  // painting can fragment into its coloured passages and frame.
  const merged: Box = { ...main.box };
  const reach = 0.12;
  for (const c of all.slice(1)) {
    if (c.area < main.area * 0.04) continue;
    const near =
      c.box.x0 >= main.box.x0 - width * reach && c.box.x1 <= main.box.x1 + width * reach &&
      c.box.y0 >= main.box.y0 - height * reach && c.box.y1 <= main.box.y1 + height * reach;
    if (!near) continue;
    merged.x0 = Math.min(merged.x0, c.box.x0); merged.y0 = Math.min(merged.y0, c.box.y0);
    merged.x1 = Math.max(merged.x1, c.box.x1); merged.y1 = Math.max(merged.y1, c.box.y1);
  }
  return merged;
}

/**
 * Snap each side of the box inward to the first line that is mostly object.
 * The component's bounding box is set by its outermost pixels, which can be a
 * shadow, a nail or a stray highlight a few percent outside the frame; the frame
 * itself is a dense straight line. Walking inward until a line is at least
 * SNAP_DENSITY object finds it.
 */
function snapToFrame(mask: Uint8Array, width: number, box: Box): Box {
  const w = boxW(box), h = boxH(box);
  const reachX = Math.floor(w * SNAP_REACH), reachY = Math.floor(h * SNAP_REACH);

  const colDensity = (x: number) => {
    let on = 0;
    for (let y = box.y0; y <= box.y1; y++) on += mask[y * width + x]!;
    return on / h;
  };
  const rowDensity = (y: number) => {
    let on = 0;
    for (let x = box.x0; x <= box.x1; x++) on += mask[y * width + x]!;
    return on / w;
  };

  const out = { ...box };
  for (let i = 0; i < reachX && colDensity(out.x0) < SNAP_DENSITY; i++) out.x0++;
  for (let i = 0; i < reachX && colDensity(out.x1) < SNAP_DENSITY; i++) out.x1--;
  for (let i = 0; i < reachY && rowDensity(out.y0) < SNAP_DENSITY; i++) out.y0++;
  for (let i = 0; i < reachY && rowDensity(out.y1) < SNAP_DENSITY; i++) out.y1--;
  return out;
}

/**
 * Grow each side outward to a frame the coarse mask could not see.
 *
 * A work on paper is often matted white inside a pale wooden frame. To the
 * coarse mask the mat is wall, so the component is only the coloured passage
 * in the middle — a crop that would cut into the piece. On a finer mask the
 * frame shows as a dense straight line with sparse wall beyond it; if such a
 * line exists within reach, the box grows out to it. The dimension check still
 * decides whether the grown box is the painting.
 */
function growToFrame(fine: Uint8Array, width: number, height: number, box: Box): Box {
  const w = boxW(box), h = boxH(box);
  const reachX = Math.floor(w * GROW_REACH), reachY = Math.floor(h * GROW_REACH);
  const out = { ...box };

  const colDensity = (x: number) => {
    let on = 0;
    for (let y = box.y0; y <= box.y1; y++) on += fine[y * width + x]!;
    return on / h;
  };
  const rowDensity = (y: number) => {
    let on = 0;
    for (let x = box.x0; x <= box.x1; x++) on += fine[y * width + x]!;
    return on / w;
  };
  /** Outermost dense line within reach that has sparse wall just beyond it. */
  const seek = (from: number, step: number, limit: number, density: (i: number) => number, bound: number) => {
    let hit = from;
    for (let d = 1; d <= limit; d++) {
      const i = from + d * step;
      if (i < 0 || i >= bound) break;
      const beyond = i + 2 * step;
      if (density(i) >= GROW_DENSITY && (beyond < 0 || beyond >= bound || density(beyond) < 0.15)) hit = i;
    }
    return hit;
  };
  out.x0 = seek(box.x0, -1, reachX, colDensity, width);
  out.x1 = seek(box.x1, +1, reachX, colDensity, width);
  out.y0 = seek(box.y0, -1, reachY, rowDensity, height);
  out.y1 = seek(box.y1, +1, reachY, rowDensity, height);
  return out;
}

/* --------------------------------------------------------------- driver */

async function analyse(file: string, project: Project): Promise<CropRecord> {
  const dims = dimensionsOf(project);
  if (!dims) return { status: 'no-dimensions' };

  const source = sharp(file, { failOn: 'none' }).rotate();
  const meta = await source.metadata();
  if (!meta.width || !meta.height) return { status: 'no-image' };
  const imageAspect = meta.width / meta.height;

  const flat = aspectError(imageAspect, dims);
  if (flat.error <= FLAT_TOLERANCE) {
    return { status: 'flat', imageAspect, metaAspect: flat.metaAspect };
  }

  const scale = WORK_WIDTH / meta.width;
  const { data, info } = await source.clone()
    .resize({ width: WORK_WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raster: Raster = { data, width: info.width, height: info.height, channels: info.channels };

  const wall = wallColour(raster);
  const raw = objectMask(raster, wall);
  const fine = objectMask(raster, wall, FINE_TOLERANCE);
  const mask = close(raw, info.width, info.height, 2);
  const found = paintingBox(mask, info.width, info.height);
  if (!found) return { status: 'rejected', reason: 'no painting found', imageAspect };
  // Candidates in order of preference. Snapping runs on the raw mask: closing
  // thickens edges and would pull a snap outward.
  const grown = growToFrame(fine, info.width, info.height, found);
  const candidates: ReadonlyArray<readonly [Box, string]> = [
    [snapToFrame(raw, info.width, grown), 'grown+snapped'],
    [grown, 'grown'],
    [snapToFrame(raw, info.width, found), 'snapped'],
    [found, 'plain'],
  ];

  const coverage = (boxW(found) * boxH(found)) / (info.width * info.height);
  if (coverage > 0.96) return { status: 'rejected', reason: 'crop is the whole image', imageAspect };
  if (coverage < 0.06) return { status: 'rejected', reason: 'crop too small', imageAspect };

  /** Back to full resolution, shaving a hair off each edge. */
  const toFull = (b: Box) => {
    const fx0 = b.x0 / scale, fy0 = b.y0 / scale;
    const fw = boxW(b) / scale, fh = boxH(b) / scale;
    const left = Math.round(fx0 + fw * MARGIN);
    const top = Math.round(fy0 + fh * MARGIN);
    const width = Math.round(fw * (1 - 2 * MARGIN));
    const height = Math.round(fh * (1 - 2 * MARGIN));
    return { left, top, width: Math.min(width, meta.width - left), height: Math.min(height, meta.height - top) };
  };

  // First candidate that matches the painting's dimensions wins; otherwise the
  // closest miss is kept for review.
  let best: { full: ReturnType<typeof toFull>; check: ReturnType<typeof aspectError>; how: string } | null = null;
  for (const [candidate, how] of candidates) {
    const full = toFull(candidate);
    const check = aspectError(full.width / full.height, dims);
    if (!best || check.error < best.check.error) best = { full, check, how };
    if (check.error <= ASPECT_TOLERANCE) { best = { full, check, how }; break; }
  }
  const { full, check, how } = best!;
  const cropAspect = full.width / full.height;

  if (check.error > ASPECT_TOLERANCE) {
    // The box is kept: a near miss may still be a clean crop of a framed canvas
    // whose listed dimensions are the canvas alone. A reviewer decides.
    return {
      status: 'rejected',
      reason: `aspect ${cropAspect.toFixed(3)} vs painting ${check.metaAspect.toFixed(3)} (${(check.error * 100).toFixed(1)}% off)`,
      box: full, imageAspect, cropAspect, metaAspect: check.metaAspect,
    };
  }

  return { status: 'ok', box: full, imageAspect, cropAspect, metaAspect: check.metaAspect, reason: how };
}

async function contactSheets(items: Array<{ id: string; file: string; box: CropRecord['box'] }>, prefix: string) {
  const PER = 12, H = 200, GAP = 16, LABEL = 22;
  for (let s = 0; s * PER < items.length; s++) {
    const batch = items.slice(s * PER, (s + 1) * PER);
    const rows: Array<{ input: Buffer; top: number; left: number }> = [];
    let y = 0, maxW = 0;
    for (const [n, item] of batch.entries()) {
      const original = await sharp(item.file, { failOn: 'none' }).rotate().resize({ height: H }).jpeg().toBuffer();
      const cropped = await sharp(item.file, { failOn: 'none' }).rotate().extract(item.box!).resize({ height: H }).jpeg().toBuffer();
      const ow = (await sharp(original).metadata()).width ?? 0;
      const cw = (await sharp(cropped).metadata()).width ?? 0;
      const label = Buffer.from(
        `<svg width="700" height="${LABEL}"><text x="0" y="16" font-family="Helvetica, Arial" font-size="15" fill="#000">#${s * PER + n + 1}  ${item.id}</text></svg>`,
      );
      rows.push({ input: label, top: y, left: 0 });
      rows.push({ input: original, top: y + LABEL, left: 0 });
      rows.push({ input: cropped, top: y + LABEL, left: ow + GAP });
      maxW = Math.max(maxW, ow + GAP + cw);
      y += LABEL + H + GAP;
    }
    await sharp({ create: { width: Math.max(maxW, 700), height: y, channels: 3, background: '#ffffff' } })
      .composite(rows)
      .jpeg({ quality: 85 })
      .toFile(path.join(OUT, `${prefix}-${String(s + 1).padStart(2, '0')}.jpg`));
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const dataset: Dataset = JSON.parse(await readFile(path.join(ROOT, 'content', 'projects.json'), 'utf8'));
  const works = dataset.projects.filter((p) => p.kind === 'work' && p.cover);

  const report: Record<string, CropRecord> = {};
  const accepted: Array<{ id: string; file: string; box: CropRecord['box'] }> = [];
  const candidates: Array<{ id: string; file: string; box: CropRecord['box'] }> = [];
  const tally: Record<string, number> = {};
  await mkdir(path.join(OUT, 'candidates'), { recursive: true });

  for (const work of works) {
    const cover = work.cover!;
    const ext = path.extname(new URL(cover.source).pathname) || '.jpg';
    const file = path.join(CACHE, `${cover.id}${ext}`);
    const record = existsSync(file) ? await analyse(file, work) : { status: 'no-image' as const };
    report[cover.id] = record;
    tally[record.status] = (tally[record.status] ?? 0) + 1;
    if (record.status === 'ok') {
      await sharp(file, { failOn: 'none' }).rotate().extract(record.box!)
        .jpeg({ quality: 92, mozjpeg: true })
        .toFile(path.join(OUT, `${cover.id}.jpg`));
      accepted.push({ id: cover.id, file, box: record.box });
    } else if (record.status === 'rejected' && record.box) {
      await sharp(file, { failOn: 'none' }).rotate().extract(record.box)
        .jpeg({ quality: 92, mozjpeg: true })
        .toFile(path.join(OUT, 'candidates', `${cover.id}.jpg`));
      candidates.push({ id: cover.id, file, box: record.box });
    }
  }

  await writeFile(REPORT, JSON.stringify(report, null, 2));
  await contactSheets(accepted, 'sheet');
  await contactSheets(candidates, 'review');

  console.log(`Analysed ${works.length} covers: ${JSON.stringify(tally)}`);
  const rejected = Object.entries(report).filter(([, r]) => r.status === 'rejected');
  for (const [id, r] of rejected) console.log(`  rejected ${id}: ${r.reason}`);
  console.log(`Contact sheets: ${Math.ceil(accepted.length / 12)} accepted (sheet-NN), ${Math.ceil(candidates.length / 12)} to review (review-NN) in ${path.relative(ROOT, OUT)}`);
}

await main();
