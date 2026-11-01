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
 * Projects belonging to the What's Color? series, which has a section of its own
 * coming. They are held out of this index rather than filed under a heading they
 * do not belong to; the section being built is where they will be shown.
 *
 * Named here rather than deleted anywhere, so when that page lands it has the
 * list already and nothing has to be remembered.
 */
export const WHATS_COLOR = new Set(['whats-color-3rd-edition-llibreria-terranova-abril-2024']);

/**
 * Titles as the designer set them for the index.
 *
 * The derived titles are accurate but inherit the catalogue's unevenness — a
 * client's name missing from one, a bracketed abbreviation left in another. An
 * index is read down a column at a glance, so the wording is worth settling.
 * One of the designer's has been corrected where it is plainly a slip: the
 * index says "Kanamar", and the school, the source and the designer's own
 * detail for it all say Kamanar. The heading over the list is spelt
 * Commissioned for the same reason, where the sheet has "Comissioned".
 *
 * Nothing else is overridden. Anything absent falls back to the derived title,
 * so a project added later is named from the source rather than going untitled.
 */
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

/**
 * The run of each project as the designer's index states it, spacing and all —
 * "2016-2020" closed up, "2017 - 2026" and "2023 - Currently" spaced. Three of
 * these say something the source does not (Silla 8 is 2020 rather than
 * 2019–2020, Kamanar 2024 rather than 2022), and the index is the designer's
 * reading of the work, so it wins; anything not named here is still read off
 * the source by `whenOf`.
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
  readonly when: string;
  readonly project: Project;
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

export function groupCommissioned(projects: readonly Project[]): readonly ProjectGroup[] {
  const placed = new Map<string, string>();
  for (const group of GROUPS) for (const slug of group.slugs) placed.set(slug, group.name);

  const fallback = GROUPS[0]!.name;
  const buckets = new Map<string, GroupedProject[]>(GROUPS.map((g) => [g.name, []]));

  for (const project of projects) {
    if (WHATS_COLOR.has(project.slug)) continue;
    const name = placed.get(project.slug) ?? fallback;
    buckets.get(name)!.push({
      slug: project.slug,
      title: nameOf(project),
      when: WHEN[project.slug] ?? whenOf(project),
      project,
    });
  }

  // In the order the designer listed them; anything unlisted goes last, in the
  // source's own order, where it will be noticed.
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
