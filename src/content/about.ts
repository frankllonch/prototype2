import type { ProjectImage } from './types.ts';

/**
 * About, as the designer's sheet sets it: a red card with her name, her city and
 * year and how to reach her; the biography beneath, with two studio photographs
 * set into it; the record of exhibitions in three columns; the private
 * collections; and the line of copyright.
 *
 * Typed here rather than read from WordPress. The source About page was one run
 * of nested HTML that had to be cut apart by guesswork to lay out at all, and
 * the sheet's lists — a date, a title, a place, set in columns — are not a
 * structure that page ever had. A record this short is better written down
 * than parsed.
 */

export interface AboutCard {
  readonly name: string;
  readonly city: string;
  readonly year: string;
  readonly phone: string;
  readonly emails: readonly string[];
}

/** A paragraph of the biography, or one of the photographs set between them. */
export type AboutBlock =
  | { readonly kind: 'lead'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'figure'; readonly image: ProjectImage };

/**
 * One entry of the record, as the designer sets it: the date, then the title,
 * then any number of plain lines, then the place in a lighter weight.
 *
 * A line break inside a string (`\n`) is a break inside that line, set at the
 * tighter 20-over-20 the sheet uses within a title, where separate lines sit
 * 22.75 apart. The sheet breaks a long title that way rather than letting it
 * wrap, and holds a few two-line places and details together the same way.
 */
export interface AboutShow {
  readonly when: string;
  readonly title: string;
  /** Regular weight: what kind of show, and with whom. */
  readonly lines: readonly string[];
  /** Light weight: where. */
  readonly places?: readonly string[];
}

export interface AboutShows {
  readonly heading: string;
  readonly shows: readonly AboutShow[];
  /** The art fairs run to twice the length of the others and take two columns. */
  readonly wide?: boolean;
}

export interface AboutCollection {
  readonly name: string;
  readonly place: string;
}

/**
 * The two studio photographs, rendered at three widths in `src/assets/about`
 * from the originals in `content/raw/about`, and copied into dist by the build.
 * Shaped as a `ProjectImage` so the same `<picture>` component serves them.
 */
function photograph(n: number, alt: string): ProjectImage {
  const widths = [800, 1600, 2692] as const;
  const variant = (ext: string) => widths.map((width) => ({ width, url: `/about/about-${n}-${width}.${ext}` }));
  return {
    id: `about-${n}`,
    source: `/about/about-${n}-2692.jpg`,
    alt,
    width: 2692,
    height: 1830,
    variants: { avif: variant('avif'), webp: variant('webp'), fallback: `/about/about-${n}-2692.jpg` },
  };
}

export const ABOUT_CARD: AboutCard = {
  name: 'Claudia Valsells',
  city: 'Barcelona',
  year: '1969',
  phone: '+34 609 76 91 86',
  emails: ['editorial@alzuetagallery.com', 'claudia@claudiacolor.com'],
};

export const ABOUT_BLOCKS: readonly AboutBlock[] = [
  {
    kind: 'lead',
    text:
      'Claudia is an artist specialized in color. A multidisciplinary creator, she discovered painting through her own instinct for color. Her formation as a mural painter gave her a professional opportunity, and her passion in color her own artistic language.',
  },
  {
    kind: 'text',
    text:
      'Based on her reflections as an artist, her experience in color prediction and mural painting, brings to all her work, with color as a primary tool, an identifiable language.',
  },
  {
    kind: 'text',
    text:
      'She began her artistic career painting and soon realized that she had a natural ability with color. In her own words, ‘All I have done throughout my career has been to cultivate this natural gift. First as a mural painter, then designing color charts and prescribing color and finally as an artist’.',
  },
  { kind: 'figure', image: photograph(1, 'Claudia Valsells, seen from behind, painting fields of colour on a studio wall with a pot of paint in hand') },
  {
    kind: 'text',
    text:
      'The tireless search for the reason of color and its form has obsessed artists throughout history, from the very creation of pictorial expression. Claudia Valsells knows about this and she aims to portray this into her artwork.',
  },
  { kind: 'figure', image: photograph(2, 'Claudia Valsells painting a large canvas in her studio, pots of colour on the table beside her') },
  {
    kind: 'text',
    text:
      'In her beginnings as a colorist she worked on commissions, for architects, and on projects of different scales advising and prescribing color. Soon she founded her own Studio, under the name of ‘Arts&Claus’, in allegory to the ‘Arts&Craft’ movement where she always found a lot of inspiration. She specialized in mural painting, color applied to architecture, and interior design for 20 years on projects in Spain and abroad. Her role was to convey the value of color and its texture in the decoration of interior spaces working closely with professionals in the fields of art, design, and architecture. It was in this context, working close with architects and designers, that she found out the communication between professionals was based by the painting companies, relegated the work of the colorist to the background due to ignorance or fear clients to make a mistake or be branded as eccentric. It was then when Claudia Valsells created a specific chromatic selection, a COLOUR CHART, with more than 200 references, which have been used as color communication tools by Spain’s best architects.',
  },
  {
    kind: 'text',
    text:
      'Her work has two very defined characteristics: on the one hand her chromatic instinct, a gift of colors and on the other her ability to select, group and interact colors creating a chromatic language of her own.',
  },
];

/**
 * The record, column by column, as the designer's sheet sets it — the same
 * entries, the same lines, the same breaks, the same weights.
 *
 * Kept from the sheet as it is, punctuation and all, with three exceptions:
 * the misspellings 'Coincidnce', 'Clauida' and 'fromcolor' are corrected, and
 * the Catalan title is written as the language writes it (‘Mira’m…’, opened
 * and closed). The sheet's dates are in its own order, which is not strictly
 * by date in the fourth column; that order is kept too.
 */
export const ABOUT_SHOWS: readonly AboutShows[] = [
  {
    heading: 'Solo exhibitions',
    shows: [
      { when: '2026 May - June', title: '‘Moll de l’os’ peintures 2026', lines: ['Alzueta Gallery'] },
      { when: '2025 April', title: '‘Mira’m no deixis de mirar-me’', lines: ['Solo show with Alzueta Gallery'], places: ['at Palau de Casavells'] },
      { when: '2024 July', title: 'Painting as a gift from color', lines: ['Solo show'], places: ['Gallery_br, Tetbury, UK'] },
      { when: '2023 September', title: 'Transitions', lines: ['Solo show'], places: ['Alzueta Gallery Turó'] },
      { when: '2021 December', title: 'Color Dialogues', lines: ['Solo exhibition'], places: ['Alzueta Gallery Madrid'] },
      { when: '2021 December', title: 'What’s color?', lines: ['2n edition'], places: ['Espacio Pavillion, Madrid,'] },
      { when: '2020 December', title: 'What’s color?', lines: ['Solo Exhibition'], places: ['Alzueta Gallery, Barcelona,'] },
      { when: '2020 February', title: 'Aoo&Claudia Valsells\nSilla8 show', lines: [], places: ['Alzueta Gallery, Barcelona'] },
      { when: '2019 November', title: 'Almost Perfect', lines: ['Solo Exhibition'], places: ['Tokyo, Japan'] },
      { when: '2019 October', title: 'Art Élysées-Art & Design', lines: ['Solo Exhibition'] },
      { when: '2018 November', title: 'solo exhibition', lines: [], places: ['Palau de Casavells,', 'Girona, Spain'] },
      { when: '2017 February', title: 'Color y forma', lines: ['solo exhibition\nAlzueta Gallery'] },
      { when: '2007 May', title: 'Solo Exhibition', lines: [], places: ['Palau de Casavells,\nBaix Empordà'] },
      { when: '2005 March', title: 'Expresions de mur.\nAbstract Informalism Paintings.', lines: ['Solo exhibition,'], places: ['Galeria Miquel Alzueta, Barcelona'] },
      { when: '2000 April', title: 'El color no existe, existe la luz\nThe color doesn’t exist, just the light', lines: [] },
    ],
  },
  {
    heading: 'Group exhibitions',
    shows: [
      { when: '2026 June - July', title: '‘Shift Towards Coincidence’,', lines: ['Group exhibition'], places: ['Palau de Casavells'] },
      { when: '2026 June - July', title: 'Abstract Paintings', lines: ['Group Exhibition'], places: ['Scroll Ny, New York'] },
      { when: '2025 March', title: '‘Marco, límite y lugar’,', lines: ['Group Exhibition,\nwith Alzueta Gallery'], places: ['Madrid'] },
      { when: '2024 January', title: 'What abstract art means to me?', lines: ['Group exhibition'], places: ['Alzueta Gallery, Séneca'] },
      { when: '2023 November', title: 'La terre est bleu comme\nune orange', lines: ['Group exhibition'], places: ['Alzueta Gallery Madrid.'] },
      { when: '2018 November', title: 'T10 at Alzueta Gallery,', lines: [], places: ['Barcelona'] },
      { when: '2016 December', title: 'Exposición colectiva', lines: [], places: ['Galeria Axel Pairon'] },
    ],
  },
  {
    heading: 'Art fairs',
    wide: true,
    shows: [
      { when: '2026 February', title: 'Zona Maco CDMX', lines: ['with Alzueta Gallery'], places: ['Mexico'] },
      { when: '2025 October', title: 'Estampa contemporary\nart fair,', lines: ['with Alzueta Gallery'], places: ['Madrid'] },
      { when: '2024 February', title: 'ZONA MACO', lines: ['with Alzueta Gallery'] },
      { when: '2024 November', title: 'Luxemburg art week', lines: ['with Alzueta Gallery'], places: ['Luxemburg'] },
      { when: '2023 February', title: 'Contemporary Art Fair', lines: ['Art Rotterdam'], places: ['Rotterdam'] },
      { when: '2021 October', title: 'Estampa Contemporary Art Fair', lines: [], places: ['Alzueta Gallery, Madrid'] },
      { when: '2021 September', title: 'Art Paris Fair', lines: [], places: ['Alzueta Gallery, Paris'] },
      { when: '2021 June', title: 'Art Madrid Feria', lines: [], places: ['Alzueta Gallery, Madrid'] },
      { when: '2019 March', title: 'AFF Art Fair', lines: [], places: ['Brussels'] },
      { when: '2019 March', title: 'Art Madrid', lines: [], places: ['Madrid'] },
      { when: '2018', title: 'Art fair', lines: [], places: ['Hamburg'] },
      { when: '2018', title: 'Art Elysees', lines: [], places: ['París'] },
      { when: '2018', title: 'Art Fair', lines: [], places: ['Stockholm'] },
      { when: '2018', title: 'Contemporary Art Fair\nJust LX,', lines: [], places: ['Portugal'] },
      { when: '2018', title: 'Almoneda Antik Passion', lines: [], places: ['Madrid'] },
      { when: '2019 April', title: 'Almoneda, Ifema feria de Madrid', lines: [], places: ['Palau de Casavells, Madrid.'] },
      { when: '2018', title: 'Art Fair Grand Palais', lines: [], places: ['Paris'] },
      { when: '2018', title: 'Eurantica Art Fair', lines: [], places: ['Brussels'] },
      { when: '2019 April', title: 'Art Paris Grand Palais', lines: [], places: ['París'] },
      { when: '2018', title: 'Art Madrid,', lines: [], places: ['Madrid'] },
      { when: '2017 July', title: 'Uterqüe Art Essays', lines: ['AW\u200a2017'] },
      { when: '2017 March', title: 'International Art Fair, Art Paris', lines: [], places: ['París'] },
      { when: '2017 February', title: 'Art Madrid', lines: [], places: ['Madrid'] },
      { when: '2016 November', title: 'Antica Namur,', lines: [], places: ['Belgium'] },
      { when: '2016 October', title: 'Art Élysées,\nInternational Art Fair,', lines: [], places: ['París'] },
      { when: '2016 June', title: 'Scope Basel,', lines: [], places: ['Basel art fair'] },
    ],
  },
];

export const ABOUT_COLLECTIONS: readonly AboutCollection[] = [
  { name: 'Fundació Vilacases', place: 'Barcelona' },
  { name: 'Fundació Banc Sabadell', place: 'Barcelona' },
  { name: 'Collection Hayot', place: 'France' },
  { name: 'Niederberghaus Collection', place: 'Mexico - US' },
  { name: 'Collection Richard', place: 'France' },
  { name: 'Smith Collection', place: 'Wyoming' },
];

export const ABOUT_COPYRIGHT = '© All Rights Reserved';
