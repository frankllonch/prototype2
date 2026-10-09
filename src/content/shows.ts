/**
 * The two editorial decisions about the exhibitions index.
 *
 * Everything else on that page is read out of the shows' own text. These two
 * are not, so they are written down here with their reasons rather than being
 * folded into the derivation, where they would look like facts.
 */

/**
 * Shows belonging to the What's Color? series, which has a section of its own
 * coming. They are held back from the index rather than deleted anywhere, so
 * when that page lands it has the list already.
 *
 * The same arrangement as the Terranova project in `groups.ts`: named, not
 * removed. A show held here keeps its text, its pictures and its dates; it is
 * only waiting for the page it belongs on.
 */
export const WHATS_COLOR_SHOWS = new Set([
  'what-s-color-i',
  'what-s-color-ii-for-architects-and-designers',
]);

/**
 * How many comma-separated clauses of a venue the index shows.
 *
 * The source gives Míra'm three: the gallery, the house, and a gloss saying
 * what the house is. The third explains the second rather than adding a place,
 * and at the index's type size it pushed the line to three rows where every
 * other show takes two. Cut after Palau de Casavells, as asked.
 *
 * A count rather than replacement text, so what is shown is a prefix of what
 * the source says — it cannot drift from it, and a correction at the source
 * still carries through. `venueFor` proves the prefix before using it.
 */
const VENUE_CLAUSES: Readonly<Record<string, number>> = {
  'mira-m-no-deixis-de-mirar-me': 2,
};

/**
 * The venue as the index shows it: the whole thing, unless this show is one of
 * the few that is cut, and then only if the cut really is a prefix of it.
 *
 * The guard matters because the count is written against the venue as it reads
 * today. If someone reorders that line at the source, a blind cut would quietly
 * show the wrong two places; showing all of it instead is visibly long, which
 * is the failure that gets noticed and fixed.
 */
export function venueFor(slug: string, venue: string | undefined): string | undefined {
  if (!venue) return venue;
  const keep = VENUE_CLAUSES[slug];
  if (!keep) return venue;

  const clauses = venue.split(',');
  if (clauses.length <= keep) return venue;

  const cut = clauses.slice(0, keep).join(',').trim();
  return venue.startsWith(cut) ? cut : venue;
}
