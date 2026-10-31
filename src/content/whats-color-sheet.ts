/**
 * Where everything sits on the sheets.
 *
 * All three editions are compositions rather than lists. The designer placed
 * every entry herself — which of the three columns it sits in, how far it is
 * dropped below the one beside it, and how much air each band gets before it —
 * and set Claudia's own words across the full width between them, with plates
 * of the work partway down. None of that can be worked out from the content,
 * so it is written here.
 *
 * Read off the Figma file itself (the three DISSENY frames, drawn at 1920 with
 * a content width of 1824), not off exported pictures of it: every `lead` and
 * `drop` below is a Figma distance divided by 1824. A drop step is 134px of
 * that frame — 7.32% — and a lead is the air between a band and whatever stood
 * above it, which is the one quantity that survives the move from Figma to a
 * browser, where the same text never breaks at quite the same heights.
 *
 * `say` indexes Claudia's paragraphs, which are read from the source in order
 * and never retyped. Everything else is a participant, named as the roster
 * names them, so a name that changes upstream breaks this loudly rather than
 * quietly dropping someone off the page.
 */

/** A photograph on a sheet, with the shape the design crops it to. */
export interface Plate {
  /** Basename of the pair in `src/assets/img`, without extension. */
  readonly name: string;
  readonly w: number;
  readonly h: number;
  readonly alt: string;
  /**
   * Width over height, where the design crops the photograph rather than
   * setting it whole. Left off, the plate keeps the shape of the file.
   */
  readonly aspect?: number;
}

export interface SheetSlot {
  /** A participant, by the name the roster gives them. */
  readonly who?: string;
  /** One of Claudia's paragraphs, by its position in `says`. */
  readonly say?: number;
  /** A photograph. */
  readonly plate?: Plate;
  /** The edition's own title, across the full width. */
  readonly title?: boolean;
  /** The row of photographs of the book, across the full width. */
  readonly strip?: boolean;
  /** Which of the three columns, 1 to 3. Full width when left off. */
  readonly col?: 1 | 2 | 3;
  /** How many steps below the top of its row, each step 7.32% of the width. */
  readonly drop?: 1 | 2 | 3;
  /**
   * The air above this element, as a share of the sheet's width — the Figma
   * gap between it and the band before it. On a participant it starts a band,
   * and the slots that follow without one sit in the same band. Negative pulls
   * an element up beside the band above, which the second edition does once.
   * Left off everywhere only on rows the designer never drew.
   */
  readonly lead?: number;
  /** A hairline up the right edge of this slot's column, drawn once on her second sheet. */
  readonly rule?: boolean;
}

const PLATE_I: Plate = {
  name: 'whats-color-i',
  w: 1000,
  h: 667,
  alt: 'The exhibition at Alzueta Gallery: answers hung in a row along a white wall.',
};

export const SHEET_I: readonly SheetSlot[] = [
  // One block on the sheet, two paragraphs in the source: the second runs
  // straight on from the first, so it gets no air of its own.
  { say: 0, lead: 0 },
  { say: 1, lead: 0 },

  { who: 'Marina Garc\u00e9s', col: 1, lead: 0.0877 },
  { who: 'Olafur Eliasson', col: 2, drop: 1 },
  { who: 'Li Edelkoort', col: 3, drop: 3 },

  { say: 2, lead: 0.0373 },

  { who: 'Rupi Kaur', col: 1, lead: 0.0762 },
  { who: 'Ram\u00f3n Andr\u00e9s', col: 3 },

  { who: 'Victoria Cirlot', col: 2, lead: 0.1447 },
  { who: 'Tortell Poltrona', col: 3 },

  { who: 'Angelica Dass', col: 1, lead: 0.0713 },
  { who: 'Jaume Funes', col: 2 },

  { say: 3, lead: 0.0817 },

  { who: 'Oscar Tusquets', col: 1, lead: 0.0746 },
  { who: 'David Bueno i Torrens', col: 2 },

  { plate: PLATE_I, lead: 0.0707 },

  { who: 'Siri Hustvedt', col: 1, lead: 0.0652 },
  { who: 'Flavia Company', col: 3, drop: 1 },

  { who: 'Henry Giroux', col: 2, lead: 0.0444 },
];

/**
 * The second edition's sheet.
 *
 * Four photographs: two set across the full width, two side by side in the
 * outer columns. The design crops the wide pair to a band roughly twice as
 * wide as it is tall, which is why they carry an aspect — the files themselves
 * are nothing like that shape.
 *
 * Every entry on her sheet carries the same colour, AC320 ARENA, which is
 * placeholder text — Marc G\u00f3mez del Moral's real colour, repeated — so the
 * colours here come from the book's printed index instead, through the
 * answers document.
 *
 * The last four — Hanghar, Montse Vicens, Escobedo Soliz and Marc Morro —
 * answered but were never placed on the sheet (Hanghar was parked below its
 * frame). They are set after the writing rather than dropped, because nothing
 * in the source says to leave them out; their rows take a default lead.
 */
export const SHEET_II: readonly SheetSlot[] = [
  { title: true, lead: 0 },
  { say: 0, lead: 0.0696 },

  { who: 'Plantea Estudio', col: 2, lead: 0.0992 },
  { who: 'Stefano Colli', col: 3 },

  { say: 1, lead: 0.0833 },

  { who: 'Elii', col: 1, lead: 0.1299, rule: true },
  { who: 'Isabel Francoy', col: 3 },

  {
    plate: {
      name: 'whats-color-ii-1',
      w: 1024,
      h: 843,
      alt: 'Paint pots, mixing dishes and swatch cards laid out on a worktable under a row of colour samples.',
      aspect: 2.294,
    },
    lead: 0.0625,
  },

  { say: 2, lead: 0.0789 },

  { who: 'Tom\u00e1s L\u00f3pez Amat', col: 1, lead: 0.1146 },
  { who: 'ContiCert', col: 2 },
  { who: 'Un parell d\u2019arquitectes', col: 3, drop: 2 },

  { who: 'Isla arquitectos', col: 2, lead: 0.0532 },

  {
    plate: {
      name: 'whats-color-ii-2',
      w: 683,
      h: 1024,
      alt: 'A visitor walking past one of Claudia Valsells\u2019 paintings in a white gallery.',
    },
    col: 1,
    lead: 0.0526,
  },
  {
    plate: {
      name: 'whats-color-ii-3',
      w: 800,
      h: 1200,
      alt: 'Painted timber battens in many colours, leaning against a wall.',
    },
    col: 3,
  },

  { say: 3, lead: 0.0636 },

  { who: 'Antoni Arola', col: 1, lead: 0.0822 },
  { who: 'Laura Castanya', col: 2, drop: 2 },
  { who: 'Isabel Sendra', col: 3, drop: 1 },

  { who: 'Kal-a', col: 1, lead: 0.0088 },
  { who: 'AMOO', col: 3 },

  { say: 4, lead: 0.0702 },

  {
    plate: {
      name: 'whats-color-ii-4',
      w: 482,
      h: 994,
      alt: 'Fan decks, colour guides and sample books spread out together.',
      aspect: 2.063,
    },
    lead: 0.0477,
  },

  { who: 'Oscar Tusquets', col: 1, lead: 0.1036 },
  { who: 'Gema Sach', col: 2 },
  { who: 'Barbara Aurell', col: 3, drop: 2 },

  // Her sheet sets Anna beside that row, three drop-steps below its top — the
  // one place a column flows on while its neighbour still runs. A row of her
  // own, pulled up into the band above; the pull is tuned against our own
  // rendering rather than copied off the sheet, because it reaches past text
  // whose height is the browser's to decide, and it holds across widths
  // because everything on the sheet scales with the same width.
  { who: 'Anna Vidal', col: 1, lead: -0.0867 },

  { say: 5, lead: 0.0757 },

  { who: 'Mariona Espinet', col: 1, lead: 0.0921 },
  { who: 'Loca Studio', col: 2, drop: 1 },
  { who: 'Auxi G\u00e1lvez', col: 3 },

  { who: 'HANGHAR', col: 1, lead: 0.1815 },
  { who: 'Montse Vicens', col: 2 },
  { who: 'Escobedo Soliz', col: 3 },

  { who: 'Marc Morro', col: 1, lead: 0.09 },
];

/**
 * The photographs of the book, in the order the third edition's sheet runs
 * them along its top. Each one is a spread, photographed on the studio's pink
 * ground, and the first doubles as the plate the sheet sets large further
 * down. Matched to the sheet by colour rather than by eye: each thumbnail on
 * it was compared against each photograph, and every match was unambiguous.
 */
export const BOOKS_III: readonly Plate[] = [
  { name: 'whats-color-iii-1', w: 750, h: 1000, alt: 'The book open at Tom\u00e1s L\u00f3pez Amat\u2019s and Rupi Kaur\u2019s colours.' },
  { name: 'whats-color-iii-2', w: 750, h: 1000, alt: 'The book open at Sofia Romero y Miguel Sotos\u2019 and Luis Cerver\u00f3\u2019s colours.' },
  { name: 'whats-color-iii-3', w: 750, h: 1000, alt: 'The book open at Carlota Guerrero\u2019s and Escobedo Soliz\u2019s colours.' },
  { name: 'whats-color-iii-4', w: 750, h: 1000, alt: 'The book open at Ana Vidal\u2019s and Tortell Poltrona\u2019s colours.' },
  { name: 'whats-color-iii-5', w: 750, h: 1000, alt: 'The book open at Plantea Estudio\u2019s and Hanghar\u2019s colours.' },
  { name: 'whats-color-iii-6', w: 747, h: 995, alt: 'The book open at Carlota Casanova\u2019s and Albert Riera Galcer\u00e1n\u2019s colours.' },
  { name: 'whats-color-iii-7', w: 768, h: 1024, alt: 'The book open at its index: every name with its colour reference.' },
  { name: 'whats-color-iii-8', w: 768, h: 1024, alt: 'The book\u2019s cover sheet, printed with rows of painted frames.' },
];

/**
 * Four of the third edition's five statements exist in no extracted source:
 * the WordPress page carries only the first, and the others appear on the
 * designer's sheet alone, so they are transcribed from it here the way the
 * second edition's answers were transcribed from Claudia's document — written
 * down once, with their provenance stated, rather than invented. The fifth
 * statement of the page is the first, and it is read from the source.
 */
export const SAYS_III_SHEET: readonly string[] = [
  'During the past months I have invited them to consider and answer the question: \u2018What does color mean to you?\u2019',
  'First of all, to open up a dialogue, to grasp new ways of seeing colors, other perspectives, but also to better understand the world. I wanted to think of color in a broader context, outside of the artistic view, and to discover the notion of color as it is thought of by others.',
  'Now, this whole journey has become a process of identifying and synthesizing knowledge, when possible, into color, with the wish to create and share a \u2018color glossary\u2019 where color meets perception. For what purpose?',
  'Because to me, color is a universal visual emotion, capable of reaching and inspiring every human being.',
];

/**
 * The third edition's sheet. The same system as the others and the loosest in
 * its drops — single entries fall as far as three steps — with the row of
 * book photographs standing where the other editions open with words.
 *
 * Two colour references on her sheet are typos — Marta D. Riezu and Juan
 * Diego Valera both carry a neighbour's colour there — and the entries here
 * follow Claudia's document instead, which the book's own printed index
 * agrees with.
 */
export const SHEET_III: readonly SheetSlot[] = [
  { strip: true, lead: 0 },
  { say: 0, lead: 0.119 },

  { who: 'Marc G\u00f3mez del Moral', col: 1, lead: 0.0614 },
  { who: 'Jose Javier Serrano', col: 2 },
  { who: 'Lucia Boned', col: 3, drop: 2 },

  { say: 1, lead: 0.0044 },

  { who: 'Albert Riera Galcer\u00e1n', col: 2, lead: 0.0329 },
  { who: 'Mar\u00eda Medem', col: 3 },

  { who: 'Isabel Martinez', col: 1, drop: 1, lead: 0.0384 },
  { who: 'Ana Cuba', col: 2 },

  {
    plate: {
      name: 'whats-color-iii-1',
      w: 750,
      h: 1000,
      alt: 'The book open at Tom\u00e1s L\u00f3pez Amat\u2019s and Rupi Kaur\u2019s colours, set large across the sheet.',
      aspect: 1.139,
    },
    lead: 0.1047,
  },

  { say: 2, lead: 0.0817 },

  { who: 'Julia Ruiz Cabello', col: 1, lead: 0.0619 },
  { who: 'Raquel Quevedo', col: 2, drop: 2 },
  { who: 'Jos\u00e9 Quintanar', col: 3, drop: 3 },

  { say: 3, lead: 0.1157 },

  { who: 'Lu\u00eds Cerver\u00f3', col: 1, lead: 0.0839 },
  { who: 'Marta D. Riezu', col: 2, drop: 1 },

  { who: 'Bel\u00e9n Gay\u00e1n', col: 2, lead: 0.0428 },
  { who: 'Cristina Stolhe', col: 3, drop: 1 },

  { say: 4, lead: 0.0532 },

  { who: 'Juan Diego Valera', col: 1, lead: 0.0932 },
  { who: '\u00c1lvaro Galm\u00e9s', col: 2, drop: 3 },
  { who: 'Arnau Blanch', col: 3, drop: 1 },
];
