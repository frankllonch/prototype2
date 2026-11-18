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

/**
 * Breaks the opening paragraph after a title and its translation.
 *
 * Mira'm opens on its own name and then an English gloss of it, and only then
 * says what the show is: the source runs all three together in one paragraph,
 * so the page read as an unbroken wall where the sheet sets the name apart and
 * leaves an empty line under it.
 *
 * The split is found rather than written: the paragraph has to open on a
 * quotation mark and carry a bracketed gloss near the front, and the break
 * goes after the closing bracket. Nothing is reworded and nothing is moved —
 * one paragraph becomes two at a point the source already marks.
 *
 * A paragraph that does not have that shape is returned untouched, so this
 * costs nothing on the shows that open plainly.
 */
export function splitOpening(html: string): string {
  const first = /^(\s*<p>)([\s\S]*?)(<\/p>)/.exec(html);
  if (!first) return html;

  const body = first[2]!;
  // Only an opening that is a quoted name: the gloss belongs to a title, and
  // a bracket anywhere else in a paragraph is an aside, not a heading.
  if (!/^\s*(<[^>]+>\s*)*[“"']/.test(body)) return html;

  const close = body.indexOf(']');
  if (close < 0 || close > 220) return html;

  // The brackets did the job of setting the translation apart; the break now
  // does it, and her sheet shows the gloss without them. The quotation marks
  // inside are the source's own and stay.
  //
  // The opening bracket is optional because the source has lost it — what is
  // in the dataset today is a closing bracket with nothing to close. Requiring
  // the pair left that stray mark on the page, so either form is accepted.
  const head = body.slice(0, close + 1).replace(/\[?([^[\]]*)\]\s*$/, '$1');
  const rest = body.slice(close + 1).replace(/^[\s,;:]+/, '');
  if (!rest) return html;

  // One paragraph still, not two: on the sheet the whole opening is the lede —
  // the name, the gloss and what follows are all set in the same capitals —
  // and a second paragraph would fall out of that and be set as body text.
  // The break is a block inside it instead, which leaves the empty line
  // without changing what the paragraph is.
  return `${first[1]}<span class="lede-open">${head}</span>${rest}${first[3]}${html.slice(first[0].length)}`;
}

/**
 * The credit and thank-you list at the foot of What's Color? (II), set as one
 * block at 20.
 *
 * The source has them as a stray "photos ©" paragraph and a "THANKS TO:" list
 * three empty <div>s deep. Frank gave the text to use (2026-11-18), so the
 * block is replaced by his wording rather than restyled in place, and wrapped
 * in `is-style-thanks` (07-sheet.css), which sets all of it at 20.
 *
 * Found by the two phrases rather than by position, and only on this show; if
 * the source stops saying them the prose is returned untouched.
 */
const THANKS: Readonly<Record<string, { readonly credit: string; readonly heading: string; readonly names: string }>> = {
  'what-s-color-ii-for-architects-and-designers': {
    credit: 'photos © Julia Ruiz-Cabello and Gonzalo de Benito',
    heading: 'THANKS TO:',
    names:
      'Plantea Estudi, Kal-a, Elii, HANGHAR, Nomos arquitectos, Montse Vicens (Int-sight), Isabel Francoy, ' +
      'Tomás López Design, Stefano Colli, Conti.Cert, Un parell d’arquitectes, Naso ++, Isla, Auxi Gálvez (PSAAP), ' +
      'Escobedo Soliz, Antoni Arola, Barbara Aurell, Laura Castanya, Andrea Batlló y Adrià Escolano, Marc Morro, ' +
      'Anna Vidal (Vis arquitectes), Gema Sach, Oscar Tusquets, Mariona Espinet, Isabel Sendra, AMOO, Loca Studio, ' +
      'Paula Arroyo, Cierto Estudio.',
  },
};

export function setThanks(slug: string, html: string): string {
  const thanks = THANKS[slug];
  if (!thanks) return html;

  // From the paragraph that opens on "photos" …
  const start = /<p>\s*(?:<span>\s*)?photos\b/i.exec(html);
  if (!start) return html;
  // … through the paragraph after "THANKS TO:", and the wrappers it sits in.
  const after = html.slice(start.index);
  const heading = /<p>\s*THANKS TO:\s*<\/p>\s*<p>[\s\S]*?<\/p>/i.exec(after);
  if (!heading) return html;
  const between = after.slice(0, heading.index);
  const opened = (between.match(/<div\b[^>]*>/gi) ?? []).length - (between.match(/<\/div>/gi) ?? []).length;
  let end = start.index + heading.index + heading[0].length;
  for (let i = 0; i < opened; i++) {
    const close = /^\s*<\/div>/.exec(html.slice(end));
    if (!close) return html;
    end += close[0].length;
  }

  const block =
    `<div class="is-style-thanks"><p>${thanks.credit}</p><p>${thanks.heading}</p><p>${thanks.names}</p></div>`;
  return html.slice(0, start.index) + block + html.slice(end);
}
