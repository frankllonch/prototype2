/**
 * Reads the extracted dataset, merges in the rendered image variants, and exposes
 * the collections the pages need. The only module that touches disk, so every
 * component stays a pure function of its props.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { splitExhibitions, type Exhibition } from './sections.ts';
import type { Dataset, Project, ProjectImage, Row } from './types.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

interface ManifestEntry {
  avif: { width: number; url: string }[];
  webp: { width: number; url: string }[];
  fallback: string;
  width: number;
  height: number;
}

const readJson = <T,>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8')) as T;

function withVariants(image: ProjectImage, manifest: Record<string, ManifestEntry>): ProjectImage {
  const entry = manifest[image.id];
  if (!entry) return image;
  // The pipeline's measured size wins: it is the size of what is actually served,
  // which for a cropped painting is the canvas, not the photograph.
  return {
    ...image,
    width: entry.width,
    height: entry.height,
    variants: { avif: entry.avif, webp: entry.webp, fallback: entry.fallback },
  };
}

function hydrate(project: Project, manifest: Record<string, ManifestEntry>): Project {
  const map = (image: ProjectImage) => withVariants(image, manifest);
  const rows: Row[] = project.rows.map((row) => ({
    columns: row.columns.map((column) =>
      column.kind === 'images' ? { ...column, images: column.images.map(map) } : column,
    ),
  }));
  const images = project.images.map(map);
  return { ...project, rows, images, ...(images[0] ? { cover: images[0] } : {}) };
}

const dataset = readJson<Dataset>('content/projects.json');
const manifest = readJson<Record<string, ManifestEntry>>('content/images.json');

const projects: readonly Project[] = dataset.projects.map((p) => hydrate(p, manifest));
const by = (kind: Project['kind']) => projects.filter((p) => p.kind === kind);

/** Paintings, newest first; ties broken by publication date so the order is stable. */
export const works: readonly Project[] = [...by('work')].sort((a, b) => {
  const year = (b.metadata.year ?? 0) - (a.metadata.year ?? 0);
  return year !== 0 ? year : (b.metadata.date ?? '').localeCompare(a.metadata.date ?? '');
});

/** Collaborations and commissions, newest first. */
export const collaborations: readonly Project[] = [...by('project')].sort(
  (a, b) => (b.metadata.year ?? 0) - (a.metadata.year ?? 0),
);

const longform = (slug: string) => by('page').find((p) => p.slug === slug);

export const exhibitions: readonly Exhibition[] = splitExhibitions(longform('whats-color-exhibitions'));
export const colourChart: Project | undefined = longform('colour-chart');

/** Distinct years across the paintings, newest first — drives the year filter. */
export const workYears: readonly number[] = [
  ...new Set(works.map((w) => w.metadata.year).filter((y): y is number => typeof y === 'number')),
].sort((a, b) => b - a);
