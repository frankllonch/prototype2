/**
 * The exhibitions, as Claudia listed them.
 *
 * This is the one list on the site that is not read out of WordPress. The
 * source page carries six shows; the record goes back to 2000, and the rest of
 * it only exists because she wrote it out. So it is kept here, verbatim —
 * including the spellings and the casing she used, which the stylesheet
 * uppercases rather than this file correcting.
 *
 * `slug` names the derived exhibition a row belongs to, where there is one.
 * Those rows open a panel and carry a photograph. The rest have neither yet,
 * and are rendered as plain rows that still answer to the pointer, so the list
 * reads as one thing whether or not a show has a page behind it.
 *
 * `to` is set only where a run crosses months, and `yearEnd` only where it
 * crosses a year — which happens once, in Color Dialogues.
 */
export interface Show {
  readonly title: string;
  readonly venue?: string;
  readonly from?: string;
  readonly to?: string;
  readonly year: number;
  readonly yearEnd?: number;
  /** The derived exhibition this row opens, where one exists. */
  readonly slug?: string;
  /** Said about the show on the list itself, not in any source page. */
  readonly note?: string;
}

export const SHOWS: readonly Show[] = [
  { title: 'Moll de l’Ós', venue: '8 rue des Beaux-Arts, Paris', from: 'May 27', to: 'June 26', year: 2026, slug: 'moll-de-l-os' },
  { title: 'Mira’m no deixis de mirar-me', venue: 'Solo show, Palau de Casavells', from: 'April', to: 'June', year: 2025, slug: 'mira-m-no-deixis-de-mirar-me' },
  { title: 'Transitions', venue: 'Alzueta Gallery, Barcelona', from: 'September', year: 2025, slug: 'transitions' },
  { title: 'Color Glossary', venue: 'Alzueta Gallery, Madrid', from: 'December', year: 2023 },
  { title: 'What’s Color (II)', venue: 'Solo show, Espacio Pavilon, Madrid', from: 'December', year: 2021, slug: 'what-s-color-ii-for-architects-and-designers' },
  { title: 'What’s Color (I)', venue: 'Solo show, Alzueta Gallery, Barcelona', from: 'December', year: 2020, slug: 'what-s-color-i' },
  { title: 'Color Dialogues', venue: 'Alzueta Gallery, Madrid', from: 'December', to: 'January', year: 2022, yearEnd: 2021, slug: 'color-dialogues' },
  { title: '‘Shift Towards Coincidence’', venue: 'Group show, New York', from: 'July', year: 2026 },
  { title: '‘Abstract Paintings’', venue: 'Group exhibition', from: 'June', year: 2026 },
  { title: 'Zona Maco CDMX', venue: 'With Alzueta Gallery, Mexico', from: 'February', year: 2026 },
  { title: 'Estampa Contemporary Art Fair', venue: 'With Alzueta Gallery, Madrid', from: 'October', year: 2025 },
  { title: 'Marco, Límite y Lugar', venue: 'Group exhibition, Alzueta Gallery Madrid', from: 'March', year: 2025 },
  { title: 'Luxemburg Art Week', venue: 'With Alzueta Gallery', from: 'November', year: 2024 },
  { title: 'Painting as a Gift of Color', venue: 'Solo show at Gallery_BR, Tetbury, UK', from: 'July', year: 2024 },
  { title: 'Zona Maco', venue: 'With Alzueta Gallery, Madrid', from: 'February', year: 2024 },
  { title: 'What Abstract Art Means to Me?', venue: 'Group exhibition, Alzueta Gallery Séneca', from: 'January', year: 2024 },
  { title: 'La Terre est Bleu comme un Organge', venue: 'Group exhibition, Alzueta Gallery, Madrid', from: 'November', year: 2023 },
  { title: 'Contemporary Art Fair', venue: 'Art Rotterdam', from: 'February', year: 2023 },
  { title: 'Estampa Contemporary Art Fair', venue: 'Alzueta Gallery, Madrid', from: 'October', year: 2021 },
  { title: 'Art Paris Fair', venue: 'Alzueta Gallery, Paris', from: 'September', year: 2021 },
  { title: 'Art Madrid Feria', venue: 'Alzueta Gallery, Madrid', from: 'June', year: 2021 },
  { title: 'Aoo&Claudia Valsells ‘Silla8’ show', venue: 'Alzueta Gallery, Barcelona', from: 'February', year: 2020 },
  { title: 'Almost perfect,', venue: 'Solo exhibition, Tokyo, Japan', from: 'November', year: 2019 },
  { title: 'Art Élysées-Art & Design', venue: 'Paris', from: 'October', year: 2019 },
  { title: 'Art Paris Grand Palais,', venue: 'París', from: 'April', year: 2019 },
  { title: 'Almoneda, Ifema feria de Madrid', venue: 'Palau de Casavells, Madrid', from: 'April', year: 2019 },
  { title: 'AFF Art Fair', venue: 'Brussels', from: 'March', year: 2019 },
  { title: 'Art Madrid', venue: 'Madrid', from: 'March', year: 2019 },
  { title: 'T10', venue: 'At Alzueta Gallery, Barcelona', from: 'November', year: 2018 },
  { title: 'Solo exhibition', venue: 'Palau de Casavells, Barcelona', from: 'November', year: 2018 },
  { title: 'Art Fair Hamburg,', venue: 'Hamburg', year: 2018 },
  { title: 'Art Elysées,', venue: 'Paris', year: 2018 },
  { title: 'Art Fair Stockholm', venue: 'Stockholm, Sweeden', year: 2018 },
  { title: 'Contemporary Art Fair Just LX', venue: 'Portugal', year: 2018 },
  { title: 'Almoneda Antik Passion,', venue: 'Madrid', year: 2018 },
  { title: 'Art Fair Grand Palais', venue: 'Paris', year: 2018 },
  { title: 'Eurantica Art Fair,', venue: 'Brussels', year: 2018 },
  { title: 'Art Madrid', venue: 'Madrid', year: 2018 },
  { title: 'Üterque Art Essays AW2017', from: 'July', year: 2017 },
  { title: 'Art Paris, international art fair', venue: 'Paris', from: 'March', year: 2017 },
  { title: 'Color y forma', venue: 'Solo exhibition, Alzueta Gallery, Barcelona', from: 'February', year: 2017 },
  { title: 'Art Madrid', venue: 'Madrid', from: 'February', year: 2017 },
  { title: 'Galeria Axel Pairon', venue: 'Group exhibition', from: 'December', year: 2016 },
  { title: 'Antica Namur', venue: 'Belgium', from: 'November', year: 2016 },
  { title: 'Art Elysées', venue: 'International art fair, Paris', from: 'October', year: 2016 },
  { title: 'Scope Basel, Basel art gair', from: 'June', year: 2016 },
  { title: 'Solo exhibition', venue: 'Palau de Casavells, Baix Empordà', from: 'May', year: 2007 },
  { title: '‘Expresions de mur’ abstract in formalism paintings', venue: 'Solo exhibition, Galeria Miquel Alzueta, Barcelona', from: 'March', year: 2005 },
  {
    title: '‘El color no existe, existe la luz’ / ‘The color doesn’t exist, just the light’',
    venue: 'Solo exhibition, Sala Vinçon, Barcelona',
    from: 'April',
    year: 2000,
    note: 'Individual exhibition where the interaction of the public with the installation was essential. I tried to demonstrate through personal experimentation that color only exists if there is light.',
  },
];
