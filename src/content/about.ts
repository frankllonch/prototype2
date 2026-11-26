import type { ProjectImage } from './types.ts';

/**
 * About, as the designer's sheet sets it: the capitals lead, the studio
 * photographs in a row, the biography, the record of exhibitions and the private
 * collections in five columns, how to reach her, and the line of copyright.
 */

export interface AboutCard {
  readonly name: string;
  readonly city: string;
  readonly year: string;
  readonly emails: readonly string[];
}

/** A link set at the end of a paragraph, after its text. */
export interface AboutLink {
  readonly label: string;
  readonly href: string;
}

/** A paragraph of the biography, or one of the photographs set between them. */
export type AboutBlock =
  | { readonly kind: 'lead'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string; readonly link?: AboutLink }
  | { readonly kind: 'figure'; readonly image: ProjectImage };

/**
 * One entry of the record, as the designer sets it: the date, then the title,
 * then any number of plain lines, then the place in a lighter weight.
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
 * The studio photographs, rendered at up to four widths in `src/assets/about`
 * from the originals in `content/raw/about`, and copied into dist by the build.
 */
function photograph(n: number, alt: string, width: number, height: number): ProjectImage {
  // 400 for the reel, 800 and 1600 for the photograph opened large, and its own width above that.
  const widths = [...new Set([400, 800, 1600, width].filter((w) => w <= width))].sort((x, y) => x - y);
  const variant = (ext: string) => widths.map((w) => ({ width: w, url: `/about/about-${n}-${w}.${ext}` }));
  const largest = `/about/about-${n}-${widths[widths.length - 1]}.jpg`;
  return {
    id: `about-${n}`,
    source: largest,
    alt,
    width,
    height,
    variants: { avif: variant('avif'), webp: variant('webp'), fallback: largest },
  };
}

/** A film portrait, served up to 1600 wide. */
const portrait = (n: number, alt: string) => photograph(n, alt, 1600, 2354);

export const ABOUT_CARD: AboutCard = {
  name: 'Claudia Valsells',
  city: 'Barcelona',
  year: '1969',
  emails: ['editorial@alzuetagallery.com', 'claudia@claudiacolor.com'],
};

export const ABOUT_BLOCKS: readonly AboutBlock[] = [
  {
    kind: 'lead',
    text:
      'Claudia is an artist specialized in color. A multidisciplinary creator, she discovered painting through her own instinct for color. Her formation as a mural painter gave her a professional opportunity, and her passion in color her own artistic language.',
  },
  // The reel, in order.
  { kind: 'figure', image: portrait(1, 'Colour charts pinned to the studio wall above jars of brushes and a broad, paint-spattered brush') },
  { kind: 'figure', image: portrait(2, 'Claudia Valsells in her studio among canvases and pots of paint, seen from above') },
  { kind: 'figure', image: portrait(3, 'Claudia Valsells on a step, reaching up to paint the studio wall, a pot of paint in her hand') },
  { kind: 'figure', image: photograph(4, 'Claudia Valsells, seen from behind, painting fields of colour on a studio wall with a pot of paint in hand', 2692, 1830) },
  { kind: 'figure', image: portrait(5, 'Claudia Valsells standing between two large canvases propped against the studio wall') },
  { kind: 'figure', image: portrait(6, 'Pots of paint and brushes on a trestle in front of a painted canvas') },
  { kind: 'figure', image: portrait(7, 'A hand holding up a pink board with a red square over a pot of paint') },
  { kind: 'figure', image: photograph(8, 'Claudia Valsells painting a large canvas in her studio, pots of colour on the table beside her', 2327, 1830) },
  { kind: 'figure', image: portrait(9, 'Small paintings and patches of colour on a white studio wall') },
  { kind: 'figure', image: portrait(10, 'A hand painting with a round brush on a canvas of green, pink and blue') },
  { kind: 'figure', image: photograph(11, 'Claudia Valsells unrolling a sheet of paper in front of her canvases', 2692, 1830) },
  { kind: 'figure', image: portrait(12, 'Claudia Valsells on a stepladder, putting up small paintings on the studio wall') },
  { kind: 'figure', image: portrait(13, 'A hand setting a small painting on the studio wall beside an easel') },
  { kind: 'figure', image: photograph(14, 'Claudia Valsells at work at the end of her long studio, canvases laid out on the table', 2692, 1795) },
  { kind: 'figure', image: photograph(15, 'A hand painting a deep red canvas with a fine brush', 1600, 2133) },
  { kind: 'figure', image: photograph(16, 'Claudia Valsells reaching up to paint a canvas propped against the studio wall, among other canvases', 845, 550) },
  { kind: 'figure', image: photograph(17, 'Claudia Valsells in profile against a red wall stencilled AC 068', 765, 724) },
  { kind: 'figure', image: photograph(18, 'Claudia Valsells in her studio holding a palette and a brush over pots of paint', 833, 600) },
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
  {
    kind: 'text',
    text:
      'The tireless search for the reason of color and its form has obsessed artists throughout history, from the very creation of pictorial expression. Claudia Valsells knows about this and she aims to portray this into her artwork.',
  },
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
  // The last two paragraphs, and the gallery's name in capitals linking to its site.
  {
    kind: 'text',
    text: 'Currently she combines her activity as an artist with colour prescription in the areas of design and architecture.',
  },
  {
    kind: 'text',
    text: 'Her work is represented, in Spain and abroad, by the Barcelona gallery owner Miquel Alzueta.',
    link: { label: 'ALZUETA GALLERY', href: 'https://alzuetagallery.com' },
  },
];

/**
 * The record, column by column, as the designer's sheet sets it — the same
 * entries, the same lines, the same breaks, the same weights.
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
      { when: '2026', title: 'ART COLOGNE', lines: ['Alzueta Gallery'], places: ['Cologne, Germany'] },
      { when: '2026', title: 'THE ARMORY SHOW', lines: ['Alzueta Gallery'], places: ['New York, USA'] },
      { when: '2026', title: 'ZONA MACO', lines: ['Alzueta Gallery'], places: ['Mexico City, Mexico'] },
      { when: '2025', title: 'ESTAMPA', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2025', title: 'THE ARMORY SHOW', lines: ['Alzueta Gallery'], places: ['New York, USA'] },
      { when: '2024', title: 'LUXEMBOURG ART WEEK', lines: ['Alzueta Gallery'], places: ['Luxembourg, Luxembourg'] },
      { when: '2024', title: 'ZONAMACO', lines: ['Alzueta Gallery'], places: ['Mexico City, Mexico'] },
      { when: '2023', title: 'ART ROTTERDAM', lines: ['Alzueta Gallery'], places: ['Rotterdam, The Netherlands'] },
      { when: '2022', title: 'ART PARIS', lines: ['Alzueta Gallery'], places: ['Paris, France'] },
      { when: '2021', title: 'ESTAMPA ART FAIR', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2021', title: 'ART PARIS', lines: ['Alzueta Gallery'], places: ['Paris, France'] },
      { when: '2021', title: 'ART MADRID', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2019', title: 'ART ÉLYSÉES-ART & DESIGN', lines: ['Alzueta Gallery'], places: ['Paris, France'] },
      { when: '2019', title: 'ART PARIS GRAND PALAIS', lines: ['Alzueta Gallery'], places: ['Paris, France'] },
      { when: '2019', title: 'ALMONEDA', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2019', title: 'ART MADRID', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2018', title: 'THE AFFORDABLE ART FAIR HAMBURG', lines: ['Alzueta Gallery'], places: ['Hamburg, Germany'] },
      { when: '2018', title: 'STOCKHOLM INDEPENDENT ART FAIR', lines: ['Alzueta Gallery'], places: ['Stockholm, Sweden'] },
      { when: '2018', title: 'JUST LX', lines: ['Alzueta Gallery'], places: ['Lisbon, Portugal'] },
      { when: '2018', title: 'ALMONEDA', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2018', title: 'ART FAIR GRAND PALAIS', lines: ['Alzueta Gallery'], places: ['Paris, France'] },
      { when: '2018', title: 'EURANTICA ART FAIR', lines: ['Alzueta Gallery'], places: ['Brussels, Belgium'] },
      { when: '2018', title: 'ART MADRID', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2017', title: 'ART PARIS', lines: ['Alzueta Gallery'], places: ['Paris, France'] },
      { when: '2017', title: 'ART MADRID', lines: ['Alzueta Gallery'], places: ['Madrid, Spain'] },
      { when: '2016', title: 'ANTICA NAMUR', lines: ['Alzueta Gallery'], places: ['Namur, Belgium'] },
      { when: '2016', title: 'SCOPE BASEL', lines: ['Alzueta Gallery'], places: ['Basel, Switzerland'] },
    ],
  },
];

export const ABOUT_COLLECTIONS: readonly AboutCollection[] = [
  { name: 'Fundació Vilacases', place: 'Barcelona, Spain' },
  { name: 'Fundació Banc Sabadell', place: 'Barcelona, Spain' },
  { name: 'Collection Hayot', place: 'France' },
  { name: 'Martinez Collection', place: 'Mexico-US' },
  { name: 'Niederberghaus Collection', place: 'Germany' },
  { name: 'Collection Richard', place: 'France' },
  { name: 'Smith Collection', place: 'Wyoming, USA' },
];

export const ABOUT_COPYRIGHT = '© All Rights Reserved';
