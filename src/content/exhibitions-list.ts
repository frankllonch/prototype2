/** The exhibitions, as the designer's final sheet classifies them. */
export type ShowGroup = 'Solo shows' | 'Group shows' | 'Art fairs' | 'Private collections';

/** The sheet's order, which is not alphabetical and not by size. */
export const SHOW_GROUPS: readonly ShowGroup[] = ['Solo shows', 'Group shows', 'Art fairs', 'Private collections'];

export interface Show {
  readonly group: ShowGroup;
  readonly title: string;
  /** The line under the title: what kind of show, and where. */
  readonly venue?: string;
  readonly from?: string;
  readonly to?: string;
  /** A private collection is a place, not an event, and states no year. */
  readonly year?: number;
  readonly yearEnd?: number;
  readonly slug?: string;
  /** The slug of the commissioned project whose sheet this row opens. */
  readonly commission?: string;
  readonly note?: string;
}

export const SHOWS: readonly Show[] = [
  // ---------------------------------------------------------- solo shows
  { group: 'Solo shows', title: 'Moll de l’Ós', venue: '8 rue des Beaux-Arts, Paris', from: 'May 27', to: 'June 26', year: 2026, slug: 'moll-de-l-os' },
  { group: 'Solo shows', title: 'Mira’m no deixis de mirar-me', venue: 'Solo show, Palau de Casavells', from: 'April', to: 'June', year: 2025, slug: 'mira-m-no-deixis-de-mirar-me' },
  { group: 'Solo shows', title: 'Painting as a gift from color', venue: 'Solo show at Gallery_BR, Tetbury, UK', from: 'May', year: 2024, slug: 'painting-as-a-gift-of-color' },
  { group: 'Solo shows', title: 'What’s color (III)', venue: 'Solo show, Terranova Bookstore, Barcelona', from: 'April', year: 2024, slug: 'whats-color-iii' },
  { group: 'Solo shows', title: 'Transitions', venue: 'Solo show, Alzueta Gallery, Barcelona', from: 'September', year: 2023, slug: 'transitions' },
  { group: 'Solo shows', title: 'Color dialogues', venue: 'Solo show, Alzueta Gallery, Madrid', from: 'December', to: 'January', year: 2021, slug: 'color-dialogues' },
  { group: 'Solo shows', title: 'What’s color (II)', venue: 'Solo show, Espacio Pavilon, Madrid', from: 'December', year: 2021, slug: 'what-s-color-ii-for-architects-and-designers' },
  { group: 'Solo shows', title: 'What’s color (I)', venue: 'Solo show, Alzueta Gallery, Barcelona', from: 'December', year: 2020, slug: 'what-s-color-i' },
  { group: 'Solo shows', title: 'T10', venue: 'Solo show, at Alzueta Gallery, Barcelona', from: 'November', year: 2020, slug: 't10' },
  { group: 'Solo shows', title: 'Aoo&Claudia Valsells ‘Silla8’ show', venue: 'Solo show, Alzueta Gallery, Barcelona', from: 'February', year: 2020, commission: 'silla-8-aoo-2019-2020' },
  { group: 'Solo shows', title: 'Almost perfect,', venue: 'Solo exhibition, Tokyo, Japan', from: 'November', year: 2019 },
  { group: 'Solo shows', title: 'Solo exhibition', venue: 'Palau de Casavells, Barcelona', from: 'November', year: 2018 },
  { group: 'Solo shows', title: 'Color y forma', venue: 'Solo exhibition, Alzueta Gallery, Barcelona', from: 'February', year: 2017, slug: 'color-y-forma' },
  { group: 'Solo shows', title: 'Solo exhibition', venue: 'Palau de Casavells,', from: 'May', year: 2007 },
  { group: 'Solo shows', title: '‘Expresions de mur’ abstract in formalism paintings', venue: 'Solo exhibition, Galeria Miquel Alzueta, Barcelona', from: 'March', year: 2005 },
  {
    group: 'Solo shows',
    title: '‘El color no existe, existe la luz’ / ‘The color doesn’t exist, just the light’',
    venue: 'Solo exhibition, Sala Vinçon, Barcelona',
    from: 'April',
    year: 2000,
    slug: 'el-color-no-existe',
    note: 'Individual exhibition where the interaction of the public with the installation was essential.',
  },

  // --------------------------------------------------------- group shows
  { group: 'Group shows', title: 'Notas al pie', venue: 'Group exhibition, Barcelona', from: 'December', year: 2026, slug: 'notas-al-pie' },
  { group: 'Group shows', title: '‘Shift towards coincidence’', venue: 'Group show, Palau de Casavells', from: 'June', to: 'July', year: 2026, slug: 'shift-towards-coincidence' },
  { group: 'Group shows', title: '‘Abstract paintings’', venue: 'Group exhibition, Scroll New York', from: 'June', year: 2026, slug: 'abstract-paintings' },
  { group: 'Group shows', title: 'Marco, Límite y Lugar', venue: 'Group exhibition, Alzueta Gallery Madrid', from: 'March', year: 2026, slug: 'marco-limite-y-lugar' },
  { group: 'Group shows', title: 'What abstract art means to me?', venue: 'Group exhibition, Alzueta Gallery Séneca', from: 'January', year: 2024, slug: 'what-abstract-art-means-to-me' },
  { group: 'Group shows', title: 'La terre est bleu comme un orange', venue: 'Group exhibition, Alzueta Gallery, Madrid', from: 'November', year: 2023, slug: 'la-terre-est-bleu' },
  { group: 'Group shows', title: 'Galeria Axel Pairon', venue: 'Group exhibition', from: 'December', year: 2016, slug: 'galeria-axel-pairon' },

  // ----------------------------------------------------------- art fairs
  { group: 'Art fairs', title: 'ART COLOGNE', venue: 'Alzueta Gallery, Cologne, Germany', year: 2026 },
  { group: 'Art fairs', title: 'THE ARMORY SHOW', venue: 'Alzueta Gallery, New York, USA', year: 2026 },
  { group: 'Art fairs', title: 'ZONA MACO', venue: 'Alzueta Gallery, Mexico City, Mexico', year: 2026 },
  { group: 'Art fairs', title: 'ESTAMPA', venue: 'Alzueta Gallery, Madrid, Spain', year: 2025 },
  { group: 'Art fairs', title: 'THE ARMORY SHOW', venue: 'Alzueta Gallery, New York, USA', year: 2025 },
  { group: 'Art fairs', title: 'LUXEMBOURG ART WEEK', venue: 'Alzueta Gallery, Luxembourg, Luxembourg', year: 2024 },
  { group: 'Art fairs', title: 'ZONAMACO', venue: 'Alzueta Gallery, Mexico City, Mexico', year: 2024 },
  { group: 'Art fairs', title: 'ART ROTTERDAM', venue: 'Alzueta Gallery, Rotterdam, The Netherlands', year: 2023 },
  { group: 'Art fairs', title: 'ART PARIS', venue: 'Alzueta Gallery, Paris, France', year: 2022 },
  { group: 'Art fairs', title: 'ESTAMPA ART FAIR', venue: 'Alzueta Gallery, Madrid, Spain', year: 2021 },
  { group: 'Art fairs', title: 'ART PARIS', venue: 'Alzueta Gallery, Paris, France', year: 2021 },
  { group: 'Art fairs', title: 'ART MADRID', venue: 'Alzueta Gallery, Madrid, Spain', year: 2021 },
  { group: 'Art fairs', title: 'ART ÉLYSÉES-ART & DESIGN', venue: 'Alzueta Gallery, Paris, France', year: 2019 },
  { group: 'Art fairs', title: 'ART PARIS GRAND PALAIS', venue: 'Alzueta Gallery, Paris, France', year: 2019 },
  { group: 'Art fairs', title: 'ALMONEDA', venue: 'Alzueta Gallery, Madrid, Spain', year: 2019 },
  { group: 'Art fairs', title: 'ART MADRID', venue: 'Alzueta Gallery, Madrid, Spain', year: 2019 },
  { group: 'Art fairs', title: 'THE AFFORDABLE ART FAIR HAMBURG', venue: 'Alzueta Gallery, Hamburg, Germany', year: 2018 },
  { group: 'Art fairs', title: 'STOCKHOLM INDEPENDENT ART FAIR', venue: 'Alzueta Gallery, Stockholm, Sweden', year: 2018 },
  { group: 'Art fairs', title: 'JUST LX', venue: 'Alzueta Gallery, Lisbon, Portugal', year: 2018 },
  { group: 'Art fairs', title: 'ALMONEDA', venue: 'Alzueta Gallery, Madrid, Spain', year: 2018 },
  { group: 'Art fairs', title: 'ART FAIR GRAND PALAIS', venue: 'Alzueta Gallery, Paris, France', year: 2018 },
  { group: 'Art fairs', title: 'EURANTICA ART FAIR', venue: 'Alzueta Gallery, Brussels, Belgium', year: 2018 },
  { group: 'Art fairs', title: 'ART MADRID', venue: 'Alzueta Gallery, Madrid, Spain', year: 2018 },
  { group: 'Art fairs', title: 'ART PARIS', venue: 'Alzueta Gallery, Paris, France', year: 2017 },
  { group: 'Art fairs', title: 'ART MADRID', venue: 'Alzueta Gallery, Madrid, Spain', year: 2017 },
  { group: 'Art fairs', title: 'ANTICA NAMUR', venue: 'Alzueta Gallery, Namur, Belgium', year: 2016 },
  { group: 'Art fairs', title: 'SCOPE BASEL', venue: 'Alzueta Gallery, Basel, Switzerland', year: 2016 },

  // -------------------------------------------------- private collections
  { group: 'Private collections', title: 'Fundació Vilacases', venue: 'Barcelona, Spain' },
  { group: 'Private collections', title: 'Fundació Banc Sabadell', venue: 'Barcelona, Spain' },
  { group: 'Private collections', title: 'Collection Hayot', venue: 'France' },
  { group: 'Private collections', title: 'Martinez Collection', venue: 'Mexico-US' },
  { group: 'Private collections', title: 'Niederberghaus Collection', venue: 'Germany' },
  { group: 'Private collections', title: 'Collection Richard', venue: 'France' },
  { group: 'Private collections', title: 'Smith Collection', venue: 'Wyoming, USA' },
];

/** The anchor of a show's row in the list, which About's record points at. */
export function rowId(show: Show): string {
  const named = show.slug ?? show.commission;
  if (named) return `row-${named}`;
  const plain = `${show.title} ${show.year ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return `row-${plain.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

/**
 * The opening phrase of a location: the kind of show, its comma if it has one,
 * and an "at" if one follows.
 */
const KIND = /^\s*((?:solo|solow|group)\s*(?:show|exhibition)s?\b,?)[\s,]*(at\s+)?/i;

/** The place a show was, with the kind of show taken off the front. */
export function placeOf(venue: string | undefined): string | undefined {
  if (!venue) return venue;
  const place = venue.replace(KIND, '').trim();
  return place || undefined;
}

/** What `placeOf` takes off, for the one layout that shows it. */
export function kindOf(venue: string | undefined): { readonly kind: string; readonly at: boolean } | undefined {
  const lead = venue ? KIND.exec(venue) : null;
  return lead ? { kind: lead[1]!, at: Boolean(lead[2]) } : undefined;
}

/** The groups the phone sheet runs together, in the order they take within a year. */
export const PHONE_MERGED: readonly ShowGroup[] = ['Solo shows', 'Group shows'];

/** Where each show stands on the phone, counted from 1. */
export function phoneOrder(shows: readonly Show[]): ReadonlyMap<Show, number> {
  const merged = (s: Show) => PHONE_MERGED.indexOf(s.group);
  const run = shows
    .filter((s) => merged(s) >= 0)
    .map((show, index) => ({ show, index }))
    .sort((a, b) => (b.show.year ?? 0) - (a.show.year ?? 0) || merged(a.show) - merged(b.show) || a.index - b.index)
    .map((entry) => entry.show);
  const rest = SHOW_GROUPS
    .filter((name) => !PHONE_MERGED.includes(name))
    .flatMap((name) => shows.filter((s) => s.group === name));
  return new Map([...run, ...rest].map((show, i) => [show, i + 1]));
}
