import { displayTitle, workTitle } from './title.ts';
import type { Project } from './types.ts';

/** Alt text for an artwork image. */
export function describeImage(project: Project, sourceAlt: string): string {
  if (sourceAlt.trim()) return sourceAlt;

  const { year, dimensions, materials } = project.metadata;
  const name = project.kind === 'work' ? workTitle(project) : displayTitle(project.title, project.kind);
  const facts = [materials, dimensions, year ? String(year) : undefined].filter(Boolean);

  const by = 'Painting by Claudia Valsells.';
  return facts.length ? `${name} — ${facts.join(', ')}. ${by}` : `${name}. ${by}`;
}
