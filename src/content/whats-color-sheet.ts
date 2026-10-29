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
  /** Which of the three columns, 1 to 3. Full width when left off. */
  readonly col?: 1 | 2 | 3;
  /** How many steps below the top of its row, each step 7.3% of the width. */
  readonly drop?: 1 | 2;
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
  { who: 'Isabel Sendra', col: 3, drop: 1 },
  { who: 'Laura Castanya', col: 2, drop: 2 },

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
  { who: 'Auxi Gálvez', col: 3 },
  { who: 'Loca Studio', col: 2, drop: 1 },

  { who: 'HANGHAR', col: 1 },
  { who: 'Montse Vicens', col: 2 },
  { who: 'Escobedo Soliz', col: 3 },

  { who: 'Marc Morro', col: 1 },
];
