/**
 * The exhibitions, as the designer's final sheet classifies them.
 *
 * This is the one list on the site that is not read out of WordPress. The
 * source page carries six shows; the record goes back to 2000, and the rest of
 * it only exists because Claudia wrote it out and the designer set it. So it
 * is kept here, verbatim — including the spellings the sheet uses, which the
 * stylesheet uppercases rather than this file correcting.
 *
 * Four groups, in the sheet's order. The grouping is the sheet's and is not
 * derivable from anything else here: nothing in a title says whether a show
 * was solo, collective or a fair.
 *
 * `slug` names the derived exhibition a row opens, where there is one. Those
 * rows open a panel and carry a photograph; the rest have neither yet and are
 * rendered as plain rows that still answer to the pointer.
 *
 * `from` and `to` are the months, which the detail's masthead states and the
 * index does not — the sheet gives the index years alone. `yearEnd` is for the
 * one run that crosses a year, and `note` for the one show the sheet describes
 * on the list itself.
 */
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
  readonly note?: string;
}

export const SHOWS: readonly Show[] = [
  // ---------------------------------------------------------- solo shows
  { group: 'Solo shows', title: 'Moll de l’Ós', venue: 'Solo show, 8 rue des Beaux-Arts, Paris', from: 'May 27', to: 'June 26', year: 2026, slug: 'moll-de-l-os' },
  { group: 'Solo shows', title: 'Transitions', venue: 'Solo show, Alzueta Gallery, Barcelona', from: 'September', year: 2025, slug: 'transitions' },
  { group: 'Solo shows', title: 'Mira’m no deixis de mirar-me', venue: 'Solo show, Palau de Casavells', from: 'April', to: 'June', year: 2025, slug: 'mira-m-no-deixis-de-mirar-me' },
  { group: 'Solo shows', title: 'Painting as a gift of color', venue: 'Solo show at Gallery_BR, Tetbury, UK', from: 'May', year: 2024, slug: 'painting-as-a-gift-of-color' },
  { group: 'Solo shows', title: 'Color glossary', venue: 'Solow show, Alzueta Gallery, Madrid', from: 'December', year: 2023 },
  { group: 'Solo shows', title: 'Color dialogues', venue: 'Solo show, Alzueta Gallery, Madrid', from: 'December', to: 'January', year: 2022, yearEnd: 2021, slug: 'color-dialogues' },
  { group: 'Solo shows', title: 'What’s color (II)', venue: 'Solo show, Espacio Pavilon, Madrid', from: 'December', year: 2021, slug: 'what-s-color-ii-for-architects-and-designers' },
  { group: 'Solo shows', title: 'What’s color (I)', venue: 'Solo show, Alzueta Gallery, Barcelona', from: 'December', year: 2020, slug: 'what-s-color-i' },
  { group: 'Solo shows', title: 'Aoo&Claudia Valsells ‘Silla8’ show', venue: 'Solo show, Alzueta Gallery, Barcelona', from: 'February', year: 2020 },
  { group: 'Solo shows', title: 'Almost perfect,', venue: 'Solo exhibition, Tokyo, Japan', from: 'November', year: 2019 },
  { group: 'Solo shows', title: 'T10', venue: 'Solo show, at Alzueta Gallery, Barcelona', from: 'November', year: 2018, slug: 't10' },
  { group: 'Solo shows', title: 'Solo exhibition', venue: 'Palau de Casavells, Barcelona', from: 'November', year: 2018 },
  { group: 'Solo shows', title: 'Color y forma', venue: 'Solo exhibition, Alzueta Gallery, Barcelona', from: 'February', year: 2017, slug: 'color-y-forma' },
  { group: 'Solo shows', title: 'Galeria Axel Pairon', venue: 'Group exhibition', from: 'December', year: 2016, slug: 'galeria-axel-pairon' },
  { group: 'Solo shows', title: 'Solo exhibition', venue: 'Palau de Casavells,', from: 'May', year: 2007 },
  { group: 'Solo shows', title: '‘Expresions de mur’ abstract in formalism paintings', venue: 'Solo exhibition, Galeria Miquel Alzueta, Barcelona', from: 'March', year: 2005 },
  {
    group: 'Solo shows',
    title: '‘El color no existe, existe la luz’ / ‘The color doesn’t exist, just the light’',
    venue: 'Solo exhibition, Sala Vinçon, Barcelona',
    from: 'April',
    year: 2000,
    slug: 'el-color-no-existe',
    note: 'Individual exhibition where the interaction of the public with the installation was essential. I tried to demonstrate through personal experimentation that color only exists if there is light.',
  },

  // --------------------------------------------------------- group shows
  { group: 'Group shows', title: '‘Shift towards coincidence’', venue: 'Group show, Palau de Casavells', from: 'June', to: 'July', year: 2026, slug: 'shift-towards-coincidence' },
  { group: 'Group shows', title: '‘Abstract paintings’', venue: 'Group exhibition, Scroll New York', from: 'June', year: 2026, slug: 'abstract-paintings' },
  { group: 'Group shows', title: 'Marco, Límite y Lugar', venue: 'Group exhibition, Alzueta Gallery Madrid', from: 'March', year: 2025, slug: 'marco-limite-y-lugar' },
  { group: 'Group shows', title: 'What abstract art means to me?', venue: 'Group exhibition, Alzueta Gallery Séneca', from: 'January', year: 2024, slug: 'what-abstract-art-means-to-me' },
  { group: 'Group shows', title: 'La terre est bleu comme un organge', venue: 'Group exhibition, Alzueta Gallery, Madrid', from: 'November', year: 2023, slug: 'la-terre-est-bleu' },
  { group: 'Group shows', title: 'Galeria Axel Pairon', venue: 'Group exhibition', from: 'December', year: 2016 },

  // ----------------------------------------------------------- art fairs
  { group: 'Art fairs', title: 'Zona Maco CDMX', venue: 'With Alzueta Gallery, Mexico', from: 'February', year: 2026 },
  { group: 'Art fairs', title: 'Estampa contemporary art fair', venue: 'With Alzueta Gallery, Madrid', from: 'October', year: 2025 },
  { group: 'Art fairs', title: 'Zona Maco', venue: 'With Alzueta Gallery, Madrid', from: 'February', year: 2024 },
  { group: 'Art fairs', title: 'Luxemburg art week', venue: 'With Alzueta Gallery', from: 'November', year: 2024 },
  { group: 'Art fairs', title: 'Contemporary art fair', venue: 'Art Rotterdam', from: 'February', year: 2023 },
  { group: 'Art fairs', title: 'Estampa contemporary art fair', venue: 'Alzueta Gallery, Madrid', from: 'October', year: 2021 },
  { group: 'Art fairs', title: 'Art Paris fair', venue: 'Alzueta Gallery, Paris', from: 'September', year: 2021 },
  { group: 'Art fairs', title: 'Art Madrid feria', venue: 'Alzueta Gallery, Madrid', from: 'June', year: 2021 },
  { group: 'Art fairs', title: 'Art Élysées-Art & Design', venue: 'Paris', from: 'October', year: 2019 },
  { group: 'Art fairs', title: 'AFF art fair', venue: 'Brussels', from: 'March', year: 2019 },
  { group: 'Art fairs', title: 'Almoneda, Ifema feria de Madrid', venue: 'Palau de Casavells, Madrid', from: 'April', year: 2019 },
  { group: 'Art fairs', title: 'Art Madrid', venue: 'Madrid', from: 'March', year: 2019 },
  { group: 'Art fairs', title: 'Art Paris Grand Palais,', venue: 'Paris', from: 'April', year: 2019 },
  { group: 'Art fairs', title: 'Eurantica art fair,', venue: 'Brussels', year: 2018 },
  { group: 'Art fairs', title: 'Art Madrid', venue: 'Madrid', year: 2018 },
  { group: 'Art fairs', title: 'Art fair Hamburg,', venue: 'Hamburg', year: 2018 },
  { group: 'Art fairs', title: 'Art Elysées,', venue: 'Paris', year: 2018 },
  { group: 'Art fairs', title: 'Art fair Stockholm', venue: 'Stockholm, Sweeden', year: 2018 },
  { group: 'Art fairs', title: 'Contemporary art fair Just LX', venue: 'Portugal', year: 2018 },
  { group: 'Art fairs', title: 'Almoneda Antik Passion,', venue: 'Madrid', year: 2018 },
  { group: 'Art fairs', title: 'Art fair Grand Palais', venue: 'Paris', year: 2018 },
  { group: 'Art fairs', title: 'Art Madrid', venue: 'Madrid', from: 'February', year: 2017 },
  { group: 'Art fairs', title: 'Art Paris, international art fair', venue: 'Paris', from: 'March', year: 2017 },
  { group: 'Art fairs', title: 'Antica Namur', venue: 'Belgium', from: 'November', year: 2016 },
  { group: 'Art fairs', title: 'Art Elysées', venue: 'International art fair, Paris', from: 'October', year: 2016 },
  { group: 'Art fairs', title: 'Scope Basel, Basel art gair', from: 'June', year: 2016 },

  // -------------------------------------------------- private collections
  { group: 'Private collections', title: 'Fundació Vilacases', venue: 'Barcelona' },
  { group: 'Private collections', title: 'Fundació Banc Sabadell', venue: 'Barcelona' },
  { group: 'Private collections', title: 'Collection Hayot', venue: 'France' },
  { group: 'Private collections', title: 'Niederberghaus Collection', venue: 'Mexico - US' },
  { group: 'Private collections', title: 'Collection Richard', venue: 'France' },
  { group: 'Private collections', title: 'Smith Collection', venue: 'Wyoming' },
];
