/**
 * Where everything sits on the sheets.
 *
 * Editions I and II are compositions rather than lists. The designer placed
 * every entry herself — which of the three columns it sits in, how far it is
 * dropped below the one beside it — and set Claudia's own words across the full
 * width between them, with plates of the work partway down. None of that can be
 * worked out from the content, so it is written here.
 *
 * Measured off her sheets at the 860px they were drawn at: three columns of 265
 * with an 8px gutter inside a content width of 822, and entries at x 24, 297
 * and 571. The drops are 60px, which is 7.3% of that width.
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
  /** How many steps below the top of its row, each step 7.3% of the width. */
  readonly drop?: 1 | 2 | 3;
}

const PLATE_I: Plate = {
  name: 'whats-color-i',
  w: 1000,
  h: 667,
  alt: 'The exhibition at Alzueta Gallery: answers hung in a row along a white wall.',
};

export const SHEET_I: readonly SheetSlot[] = [
  { say: 0 },
  { say: 1 },

  { who: 'Marina Garcés', col: 1 },
  { who: 'Olafur Eliasson', col: 2, drop: 1 },
  { who: 'Li Edelkoort', col: 3, drop: 2 },

  { say: 2 },

  { who: 'Rupi Kaur', col: 1 },
  { who: 'Ramón Andrés', col: 3 },

  { who: 'Victoria Cirlot', col: 2 },
  { who: 'Tortell Poltrona', col: 3 },

  { who: 'Angelica Dass', col: 1 },
  { who: 'Jaume Funes', col: 2 },

  { say: 3 },

  { who: 'Oscar Tusquets', col: 1 },
  { who: 'David Bueno i Torrens', col: 2 },

  { plate: PLATE_I },

  { who: 'Siri Hustvedt', col: 1 },
  { who: 'Flavia Company', col: 3, drop: 1 },

  { who: 'Henry Giroux', col: 2 },
];

/**
 * The second edition's sheet.
 *
 * Four photographs: two set across the full width, two side by side in the
 * outer columns. The design crops the wide pair to a band roughly twice as
 * wide as it is tall, which is why they carry an aspect — the files themselves
 * are nothing like that shape.
 *
 * Two readings of her sheet are deliberately not followed, both because the
 * sheet is a mock-up rather than a source. Every entry on it carries the same
 * colour, `AC320 ARENA`, which is placeholder text: Claudia's document gives no
 * colours at all for this edition, so the entries here are set without one.
 * And an entry for Oscar Tusquets repeats Anna Vidal's answer word for word;
 * he answered in edition I and is not in this edition's roster, so Anna Vidal
 * takes the column he was drawn in.
 *
 * The last four — Hanghar, Montse Vicens, Escobedo Soliz and Marc Morro —
 * answered but were never placed on the sheet. They are set after the writing
 * rather than dropped, because nothing in the source says to leave them out.
 */
export const SHEET_II: readonly SheetSlot[] = [
  { title: true },
  { say: 0 },

  { who: 'Plantea Estudio', col: 2 },
  { who: 'Stefano Colli', col: 3 },

  { say: 1 },

  { who: 'Elii', col: 1 },
  { who: 'Isabel Francoy', col: 3 },

  {
    plate: {
      name: 'whats-color-ii-1',
      w: 1024,
      h: 843,
      alt: 'Paint pots, mixing dishes and swatch cards laid out on a worktable under a row of colour samples.',
      aspect: 2.3,
    },
  },

  { say: 2 },

  { who: 'Tomás López Amat', col: 1 },
  { who: 'ContiCert', col: 2 },
  { who: "Un parell d’arquitectes", col: 3, drop: 2 },

  { who: 'Isla arquitectos', col: 2 },

  {
    plate: {
      name: 'whats-color-ii-2',
      w: 683,
      h: 1024,
      alt: 'A visitor walking past one of Claudia Valsells’ paintings in a white gallery.',
    },
    col: 1,
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

  { say: 3 },

  { who: 'Antoni Arola', col: 1 },
  { who: 'Laura Castanya', col: 2, drop: 2 },
  { who: 'Isabel Sendra', col: 3, drop: 1 },

  { who: 'Kal-a', col: 1 },
  { who: 'AMOO', col: 3 },

  { say: 4 },

  {
    plate: {
      name: 'whats-color-ii-4',
      w: 482,
      h: 994,
      alt: 'Fan decks, colour guides and sample books spread out together.',
      aspect: 2.1,
    },
  },

  { who: 'Anna Vidal', col: 1 },
  { who: 'Gema Sach', col: 2 },
  { who: 'Barbara Aurell', col: 3, drop: 1 },

  { say: 5 },

  { who: 'Mariona Espinet', col: 1 },
  { who: 'Loca Studio', col: 2, drop: 1 },
  { who: 'Auxi Gálvez', col: 3 },

  { who: 'HANGHAR', col: 1 },
  { who: 'Montse Vicens', col: 2 },
  { who: 'Escobedo Soliz', col: 3 },

  { who: 'Marc Morro', col: 1 },
];

/**
 * The photographs of the book, in the order the third edition's sheet runs
 * them along its top. Each one is a spread, photographed on the studio's pink
 * ground, and the first doubles as the plate the sheet sets large further
 * down. Matched to the sheet by colour rather than by eye: each thumbnail on
 * it was compared against each photograph, and every match was unambiguous.
 */
export const BOOKS_III: readonly Plate[] = [
  { name: 'whats-color-iii-1', w: 750, h: 1000, alt: 'The book open at Tomás López Amat’s and Rupi Kaur’s colours.' },
  { name: 'whats-color-iii-2', w: 750, h: 1000, alt: 'The book open at Sofia Romero y Miguel Sotos’ and Luis Cerveró’s colours.' },
  { name: 'whats-color-iii-3', w: 750, h: 1000, alt: 'The book open at Carlota Guerrero’s and Escobedo Soliz’s colours.' },
  { name: 'whats-color-iii-4', w: 750, h: 1000, alt: 'The book open at Ana Vidal’s and Tortell Poltrona’s colours.' },
  { name: 'whats-color-iii-5', w: 750, h: 1000, alt: 'The book open at Plantea Estudio’s and Hanghar’s colours.' },
  { name: 'whats-color-iii-6', w: 747, h: 995, alt: 'The book open at Carlota Casanova’s and Albert Riera Galcerán’s colours.' },
  { name: 'whats-color-iii-7', w: 768, h: 1024, alt: 'The book open at its index: every name with its colour reference.' },
  { name: 'whats-color-iii-8', w: 768, h: 1024, alt: 'The book’s cover sheet, printed with rows of painted frames.' },
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
  'During the past months I have invited them to consider and answer the question: ‘What does color mean to you?’',
  'First of all, to open up a dialogue, to grasp new ways of seeing colors, other perspectives, but also to better understand the world. I wanted to think of color in a broader context, outside of the artistic view, and to discover the notion of color as it is thought of by others.',
  'Now, this whole journey has become a process of identifying and synthesizing knowledge, when possible, into color, with the wish to create and share a ‘color glossary’ where color meets perception. For what purpose?',
  'Because to me, color is a universal visual emotion, capable of reaching and inspiring every human being.',
];

/**
 * The third edition's sheet. The same system as the first two and the loosest
 * rhythm of the three: single entries drop as far as three steps, and the row
 * of book photographs stands where the other editions open with words.
 *
 * Two colour references on her sheet are typos — Marta D. Riezu and Juan
 * Diego Valera both carry a neighbour's colour there — and the entries here
 * follow Claudia's document instead, which the book's own printed index
 * agrees with.
 */
export const SHEET_III: readonly SheetSlot[] = [
  { strip: true },
  { say: 0 },

  { who: 'Marc Gómez del Moral', col: 1 },
  { who: 'Jose Javier Serrano', col: 2 },
  { who: 'Lucia Boned', col: 3, drop: 2 },

  { say: 1 },

  { who: 'Albert Riera Galcerán', col: 2 },
  { who: 'María Medem', col: 3 },

  { who: 'Isabel Martinez', col: 1, drop: 1 },
  { who: 'Ana Cuba', col: 2 },

  {
    plate: {
      name: 'whats-color-iii-1',
      w: 750,
      h: 1000,
      alt: 'The book open at Tomás López Amat’s and Rupi Kaur’s colours, set large across the sheet.',
      aspect: 1.13,
    },
  },

  { say: 2 },

  { who: 'Julia Ruiz Cabello', col: 1 },
  { who: 'Raquel Quevedo', col: 2, drop: 2 },
  { who: 'José Quintanar', col: 3, drop: 3 },

  { say: 3 },

  { who: 'Luís Cerveró', col: 1 },
  { who: 'Marta D. Riezu', col: 2, drop: 1 },

  { who: 'Belén Gayán', col: 2 },
  { who: 'Cristina Stolhe', col: 3, drop: 1 },

  { say: 4 },

  { who: 'Juan Diego Valera', col: 1 },
  { who: 'Álvaro Galmés', col: 2, drop: 3 },
  { who: 'Arnau Blanch', col: 3, drop: 1 },
];
