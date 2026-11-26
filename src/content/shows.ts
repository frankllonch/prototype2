/** The two editorial decisions about the exhibitions index. */

/** Shows belonging to the What's Color? */
export const WHATS_COLOR_SHOWS = new Set([
  'what-s-color-i',
  'what-s-color-ii-for-architects-and-designers',
]);

/** How many comma-separated clauses of a venue the index shows. */
const VENUE_CLAUSES: Readonly<Record<string, number>> = {
  'mira-m-no-deixis-de-mirar-me': 2,
};

/**
 * The venue as the index shows it: the whole thing, unless this show is one of
 * the few that is cut, and then only if the cut really is a prefix of it.
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

/** Breaks the opening paragraph after a title and its translation. */
export function splitOpening(html: string): string {
  const first = /^(\s*<p>)([\s\S]*?)(<\/p>)/.exec(html);
  if (!first) return html;

  const body = first[2]!;
  // Only an opening that is a quoted name: the gloss belongs to a title, and a bracket anywhere
  // else in a paragraph is an aside, not a heading.
  if (!/^\s*(<[^>]+>\s*)*[“"']/.test(body)) return html;

  const close = body.indexOf(']');
  if (close < 0 || close > 220) return html;

  // The brackets did the job of setting the translation apart; the break now does it, and her
  // sheet shows the gloss without them.
  const head = body.slice(0, close + 1).replace(/\[?([^[\]]*)\]\s*$/, '$1');
  const rest = body.slice(close + 1).replace(/^[\s,;:]+/, '');
  if (!rest) return html;

  // One paragraph still, not two: on the sheet the whole opening is the lede.
  return `${first[1]}<span class="lede-open">${head}</span>${rest}${first[3]}${html.slice(first[0].length)}`;
}

/** The credit and thank-you list at the foot of What's Color? */
const THANKS: Readonly<Record<string, { readonly credit: string; readonly heading: string; readonly names: string }>> = {
  'what-s-color-ii-for-architects-and-designers': {
    credit: 'Photos © Julia Ruiz-Cabello and Gonzalo de Benito',
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
