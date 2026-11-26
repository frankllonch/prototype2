import { displayTitle } from './title.ts';
import type { Project } from './types.ts';

/** How the commissioned work is grouped, and when each piece ran. */
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

/** Projects belonging to the What's Color? */
export const WHATS_COLOR = new Set(['whats-color-3rd-edition-llibreria-terranova-abril-2024']);

/** Titles as the designer set them for the index. */
const NAMES: Readonly<Record<string, string>> = {
  'terra-rossa-milan-design-week-2024': 'Terra Rossa',
  'color-chart-el-taller-de-arquitectura-rbta': 'Color Chart T Bofill, Taller d’Arquitectura',
  'santa-cole-color-palette-2023': 'Color Palette Santa & Cole',
  'artist-residence-2022': 'Artist Residence',
  'tones-collection-2022': 'Tones Collection of Nani Marquina',
  'dada-workshops-2017-2': 'Color Atlas for La Muralla Roja',
  'silla-8-aoo-2019-2020': 'Silla 8 AOO',
  'edges-collection-for-within-reach': 'Edges Collection',
  'uterque-art-essays': 'Uterqüe Arts Essays',
  'trainings_silences': 'Training Silences',
  'dada-workshops-2018': 'Dadà Barcelona',
  'dada-workshops-2017': 'Dadà Barcelona',
  'kamanar-10-chairs-10-artists-2022': 'Kamanar',
  'solidary-fulard': 'Solidary Fulard Design',
};

/** Where the phone sheet turns a name onto its second line by hand. */
const BREAK_AFTER: Readonly<Record<string, string>> = {
  'santa-cole-color-palette-2023': 'Color Palette',
};

/**
 * The run of each project as the designer's index states it, spacing and all —
 * "2016-2020" closed up, "2017 - 2026" and "2023 - Currently" spaced.
 */
const WHEN: Readonly<Record<string, string>> = {
  'terra-rossa-milan-design-week-2024': '2024',
  'color-chart-el-taller-de-arquitectura-rbta': '2024',
  'santa-cole-color-palette-2023': '2023 - Currently',
  'artist-residence-2022': '2022',
  'tones-collection-2022': '2022',
  'dada-workshops-2017-2': '2016-2020',
  'silla-8-aoo-2019-2020': '2020',
  'edges-collection-for-within-reach': '2019',
  'uterque-art-essays': '2017',
  'trainings_silences': '2021',
  'dada-workshops-2018': '2018',
  'dada-workshops-2017': '2017',
  'kamanar-10-chairs-10-artists-2022': '2024',
  'solidary-fulard': '2017 - 2026',
};

export interface GroupedProject {
  readonly slug: string;
  readonly title: string;
  /** The opening words the phone breaks the title after, where the sheet does (`BREAK_AFTER`). */
  readonly breakAfter?: string;
  readonly when: string;
  readonly project: Project;
}

export interface ProjectGroup {
  readonly name: string;
  readonly items: readonly GroupedProject[];
}

/** The run of a project, as its own title states it. */
function whenOf(project: Project): string {
  const title = project.title;
  const year = project.metadata.year;

  const ongoing = /\b((?:19|20)\d{2})\s*[-–—]\s*(?:on\s*going|ongoing|current(?:ly)?|present)\b/i.exec(title);
  if (ongoing) return `${ongoing[1]} – Currently`;

  const range = /\b((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2})\b/.exec(title);
  if (range && range[1] !== range[2]) return `${range[1]} – ${range[2]}`;

  return year ? String(year) : '';
}

/** The designer's wording where there is one, else the title with its dates taken off. */
function nameOf(project: Project): string {
  const given = NAMES[project.slug];
  if (given) return given;
  return displayTitle(project.title, 'project')
    .replace(/\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|on\s*going|ongoing|current(?:ly)?)\b/gi, '')
    .replace(/[_]+/g, ' ')
    .replace(/[\s,;/]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * The recorded break for a project, only while its title still opens with those
 * words and goes on.
 */
function breakOf(slug: string, title: string): string | undefined {
  const lead = BREAK_AFTER[slug];
  return lead && title.startsWith(`${lead} `) && title.length > lead.length + 1 ? lead : undefined;
}

export function groupCommissioned(projects: readonly Project[]): readonly ProjectGroup[] {
  const placed = new Map<string, string>();
  for (const group of GROUPS) for (const slug of group.slugs) placed.set(slug, group.name);

  const fallback = GROUPS[0]!.name;
  const buckets = new Map<string, GroupedProject[]>(GROUPS.map((g) => [g.name, []]));

  for (const project of projects) {
    if (WHATS_COLOR.has(project.slug)) continue;
    const name = placed.get(project.slug) ?? fallback;
    const title = nameOf(project);
    const breakAfter = breakOf(project.slug, title);
    buckets.get(name)!.push({
      slug: project.slug,
      title,
      ...(breakAfter ? { breakAfter } : {}),
      when: WHEN[project.slug] ?? whenOf(project),
      project,
    });
  }

  // In the order the designer listed them; anything unlisted goes last, in the source's own order,
  // where it will be noticed.
  const rank = (slug: string) => {
    for (const group of GROUPS) {
      const i = group.slugs.indexOf(slug);
      if (i >= 0) return i;
    }
    return Infinity;
  };
  return GROUPS
    .map((group) => ({
      name: group.name,
      items: buckets.get(group.name)!.slice().sort((a, b) => rank(a.slug) - rank(b.slug)),
    }))
    .filter((group) => group.items.length > 0);
}
