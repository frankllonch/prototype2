import { displayTitle } from './title.ts';
import type { Project } from './types.ts';

/**
 * How the commissioned work is grouped, and when each piece ran.
 *
 * The grouping is the one place on the site that is not derived. Nothing in the
 * source says that the dadàbarcelona workshops are teaching and Kamanar is a
 * charitable project — that is a reading of the work, and the designer supplied
 * it, so it is written down here rather than inferred from something it does not
 * follow from.
 *
 * Anything not named falls into the first group rather than disappearing. A new
 * project added in WordPress should turn up on the page in the wrong section,
 * where it will be noticed and moved; the alternative is that it is silently
 * absent and nobody finds out.
 */
const GROUPS: ReadonlyArray<{ name: string; slugs: readonly string[] }> = [
  {
    name: 'Commissioned',
    slugs: [
      'terra-rossa-milan-design-week-2024',
      'color-chart-el-taller-de-arquitectura-rbta',
      'santa-cole-color-palette-2023',
      'artist-residence-2022',
      'tones-collection-2022',
      'dada-workshops-2017-2',          // Color Atlas for Muralla Roja — the slug is the source's
      'silla-8-aoo-2019-2020',
      'edges-collection-for-within-reach',
      'uterque-art-essays',
    ],
  },
  {
    name: 'Education',
    slugs: ['trainings_silences', 'dada-workshops-2018', 'dada-workshops-2017'],
  },
  {
    name: 'Solidary',
    slugs: ['kamanar-10-chairs-10-artists-2022', 'solidary-fulard'],
  },
];

/**
 * Projects belonging to the What's Color? series, which is to become a section
 * of its own. Until it does they stay in the list, because a project that is
 * on the site today should not vanish while the page that will hold it is still
 * being drawn.
 */
const WHATS_COLOR = new Set(['whats-color-3rd-edition-llibreria-terranova-abril-2024']);

export interface GroupedProject {
  readonly slug: string;
  readonly title: string;
  readonly when: string;
  readonly project: Project;
  /** Belongs to a section not yet built; shown here meanwhile. */
  readonly pending: boolean;
}

export interface ProjectGroup {
  readonly name: string;
  readonly items: readonly GroupedProject[];
}

/**
 * The run of a project, as its own title states it.
 *
 * The titles carry the dates and the metadata carries only the opening year, so
 * a project that ran across several is read from the title or it is not read at
 * all — "2016-2020" and "2023-on going" are both there, and both say more than
 * "2016" and "2023" do.
 */
function whenOf(project: Project): string {
  const title = project.title;
  const year = project.metadata.year;

  const ongoing = /\b((?:19|20)\d{2})\s*[-–—]\s*(?:on\s*going|ongoing|current(?:ly)?|present)\b/i.exec(title);
  if (ongoing) return `${ongoing[1]} – Currently`;

  const range = /\b((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2})\b/.exec(title);
  if (range && range[1] !== range[2]) return `${range[1]} – ${range[2]}`;

  return year ? String(year) : '';
}

/** The title with its dates and stray punctuation taken off, since the date is set beside it. */
function nameOf(project: Project): string {
  return displayTitle(project.title, 'project')
    .replace(/\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|on\s*going|ongoing|current(?:ly)?)\b/gi, '')
    .replace(/[_]+/g, ' ')
    .replace(/[\s,;/]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function groupCommissioned(projects: readonly Project[]): readonly ProjectGroup[] {
  const placed = new Map<string, string>();
  for (const group of GROUPS) for (const slug of group.slugs) placed.set(slug, group.name);

  const fallback = GROUPS[0]!.name;
  const buckets = new Map<string, GroupedProject[]>(GROUPS.map((g) => [g.name, []]));

  for (const project of projects) {
    const name = placed.get(project.slug) ?? fallback;
    buckets.get(name)!.push({
      slug: project.slug,
      title: nameOf(project),
      when: whenOf(project),
      project,
      pending: WHATS_COLOR.has(project.slug),
    });
  }

  // Newest first inside each group, as the source already orders them.
  return GROUPS
    .map((group) => ({ name: group.name, items: buckets.get(group.name)! }))
    .filter((group) => group.items.length > 0);
}
