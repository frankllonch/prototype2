import { displayTitle } from './title.ts';
import type { Project } from './types.ts';

/**
 * Alt text for an artwork image.
 *
 * The source site carries no alt attribute on any of its 370 images, so rather
 * than shipping an unnamed gallery we describe each work from the metadata it
 * already has. Nothing here is invented: every part is a field the source page
 * supplied. Where a real alt attribute does exist it always wins.
 */
export function describeImage(project: Project, sourceAlt: string): string {
  if (sourceAlt.trim()) return sourceAlt;

  const { year, dimensions, materials } = project.metadata;
  const name = displayTitle(project.title, project.kind);
  const facts = [materials, dimensions, year ? String(year) : undefined].filter(Boolean);

  const by = 'Painting by Claudia Valsells.';
  return facts.length ? `${name} — ${facts.join(', ')}. ${by}` : `${name}. ${by}`;
}
