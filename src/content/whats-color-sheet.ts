/**
 * Where everything sits on the first edition's sheet.
 *
 * The other two editions are lists: one column or three, filled in order, and
 * the page decides where each entry lands. This one is a composition. The
 * designer placed every entry herself — which of the three columns it sits in,
 * how far it is dropped below the one beside it — and set Claudia's own words
 * across the full width between them, with a plate of the work partway down.
 * None of that can be worked out from the content, so it is written here.
 *
 * Measured off her sheet at the 860px it was drawn at: three columns of 265
 * with an 8px gutter inside a content width of 822, and entries at x 24, 297
 * and 571. The drops are 60px, which is 7.3% of that width, and only two
 * places use them — the opening three, which descend one after another, and
 * Flavia against Siri near the foot.
 *
 * `say` indexes Claudia's paragraphs, which are read from the source in order
 * and never retyped. `plate` is the artwork. Everything else is a participant,
 * named as the roster names them, so a name that changes upstream breaks this
 * loudly rather than quietly dropping someone off the page.
 */

export interface SheetSlot {
  /** A participant, by the name the roster gives them. */
  readonly who?: string;
  /** One of Claudia's paragraphs, by its position in the source. */
  readonly say?: number;
  /** The artwork, full width. */
  readonly plate?: boolean;
  /** Which of the three columns, 1 to 3. */
  readonly col?: 1 | 2 | 3;
  /** How many steps below the top of its row, each step 7.3% of the width. */
  readonly drop?: 1 | 2;
}

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

  { plate: true },

  { who: 'Siri Hustvedt', col: 1 },
  { who: 'Flavia Company', col: 3, drop: 1 },

  { who: 'Henry Giroux', col: 2 },
];
