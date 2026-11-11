/**
 * Where everything sits on the sheets.
 *
 * All three editions are compositions rather than lists. The designer placed
 * every entry herself — which of the three columns it sits in, how far it is
 * dropped below the one beside it, and how much air each band gets before it —
 * and set Claudia's own words across the full width between them, under a
 * reel of photographs of the edition. None of that can be worked out from the
 * content, so it is written here.
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

/** A photograph in a reel, set whole at the shape of its file. */
export interface Plate {
  /** Basename of the pair in `src/assets/img`, without extension. */
  readonly name: string;
  readonly w: number;
  readonly h: number;
  readonly alt: string;
  /**
   * Width over height of the cell, where the sheet frames the photograph a
   * shade tighter than its file and crops the difference. Left off, the cell
   * is the file's own shape.
   */
  readonly cell?: number;
}

export interface SheetSlot {
  /** A participant, by the name the roster gives them. */
  readonly who?: string;
  /** One of Claudia's paragraphs, by its position in `says`. */
  readonly say?: number;
  /** The edition's own title, across the full width. */
  readonly title?: boolean;
  /** A reel of photographs across the full width, in the order it runs. */
  readonly strip?: readonly Plate[];
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

/**
 * The reels: a row of photographs under each edition's roster, every picture
 * whole at its own shape, all one height, centred. Their order is the sheets'.
 *
 * The designer's folders for the first two editions arrived with their names
 * swapped — the one named for the first held the Madrid photographs, which
 * show the second's own title on the wall — so each picture was matched to
 * its cell on the sheets by colour, not by folder. Every match was
 * unambiguous. The second edition's frames run a shade wider than its
 * photographs, so its cells carry the sheet's own shape and crop the sliver.
 * Where the live site holds the original, the reel uses it;
 * otherwise the designer's export, which is all there is — and for two of the
 * first edition's, whose exports came clipped to their top third, the cell
 * cut out of her sheet itself, the one place they appear whole.
 */
export const REEL_I: readonly Plate[] = [
  { name: 'whats-color-i-reel-1', w: 1000, h: 667, alt: 'A painting of tall bands of colour on the white wall of Alzueta Gallery.' },
  { name: 'whats-color-i-reel-2', w: 1000, h: 667, alt: 'Painted battens standing in a row in the white gallery, a painting beyond.' },
  { name: 'whats-color-i-reel-3', w: 577, h: 383, alt: 'Two paintings on the white walls of the gallery.' },
  { name: 'whats-color-i-reel-4', w: 577, h: 383, alt: 'The gallery from its far end: paintings on two walls under the lighting rig.' },
];

export const REEL_II: readonly Plate[] = [
  { name: 'whats-color-ii-reel-1', w: 890, h: 1200, alt: 'Painted battens of many colours leaning against a wall.', cell: 0.7565 },
  { name: 'whats-color-ii-reel-2', w: 900, h: 1200, alt: 'The way in, with the exhibition\u2019s title on the wall.', cell: 0.7565 },
  { name: 'whats-color-ii-reel-3', w: 276, h: 368, alt: 'A page projected above a table laid with colour swatches.', cell: 0.7565 },
  { name: 'whats-color-ii-reel-4', w: 274, h: 362, alt: 'Painted battens standing on a white plinth.', cell: 0.7565 },
  { name: 'whats-color-ii-reel-5', w: 274, h: 366, alt: 'A projection on the wall above long tables of samples.', cell: 0.7565 },
  { name: 'whats-color-ii-reel-6', w: 488, h: 366, alt: 'Painted battens leaning either side of a cast-iron column.', cell: 1.349 },
  { name: 'whats-color-ii-reel-7', w: 272, h: 366, alt: 'A grid of colour fields projected above the tables.', cell: 0.7565 },
];

export const SHEET_I: readonly SheetSlot[] = [
  { strip: REEL_I, lead: 0 },

  // One block on the sheet, two paragraphs in the source: the second runs
  // straight on from the first, so it gets no air of its own.
  { say: 0, lead: 0.0439 },
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

  { who: 'Siri Hustvedt', col: 1, lead: 0.0791 },
  { who: 'Flavia Company', col: 3, drop: 1 },

  { who: 'Henry Giroux', col: 2, lead: 0.0444 },
];

/**
 * The second edition's sheet.
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
  { strip: REEL_II, lead: 0 },
  { title: true, lead: 0.039 },
  { say: 0, lead: 0.0696 },

  { who: 'Plantea Estudio', col: 2, lead: 0.0992 },
  { who: 'Stefano Colli', col: 3 },

  { say: 1, lead: 0.0833 },

  { who: 'Elii', col: 1, lead: 0.1299, rule: true },
  { who: 'Isabel Francoy', col: 3 },

  { say: 2, lead: 0.0696 },

  { who: 'Tom\u00e1s L\u00f3pez Amat', col: 1, lead: 0.1146 },
  { who: 'ContiCert', col: 2 },
  { who: 'Un parell d\u2019arquitectes', col: 3, drop: 2 },

  { who: 'Isla arquitectos', col: 2, lead: 0.0532 },

  { say: 3, lead: 0.0513 },

  { who: 'Antoni Arola', col: 1, lead: 0.0822 },
  { who: 'Laura Castanya', col: 2, drop: 2 },
  { who: 'Isabel Sendra', col: 3, drop: 1 },

  { who: 'Kal-a', col: 1, lead: 0.0088 },
  { who: 'AMOO', col: 3 },

  { say: 4, lead: 0.0702 },

  { who: 'Oscar Tusquets', col: 1, lead: 0.049 },
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
 * ground. Matched to the sheet by colour rather than by eye: each thumbnail on
 * it was compared against each photograph, and every match was unambiguous.
 */
export const REEL_III: readonly Plate[] = [
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
 * its drops — single entries fall as far as three steps.
 *
 * Two colour references on her sheet are typos — Marta D. Riezu and Juan
 * Diego Valera both carry a neighbour's colour there — and the entries here
 * follow Claudia's document instead, which the book's own printed index
 * agrees with.
 */
export const SHEET_III: readonly SheetSlot[] = [
  { strip: REEL_III, lead: 0 },
  { say: 0, lead: 0.1199 },

  { who: 'Marc G\u00f3mez del Moral', col: 1, lead: 0.0614 },
  { who: 'Jose Javier Serrano', col: 2 },
  { who: 'Lucia Boned', col: 3, drop: 2 },

  { say: 1, lead: 0.0044 },

  { who: 'Albert Riera Galcer\u00e1n', col: 2, lead: 0.0329 },
  { who: 'Mar\u00eda Medem', col: 3 },

  { who: 'Isabel Martinez', col: 1, drop: 1, lead: 0.0384 },
  { who: 'Ana Cuba', col: 2 },

  { say: 2, lead: 0.0404 },

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

/** One bar of the second edition's colour chart. */
export interface ChartBar {
  /** The person, by the name the roster gives them. */
  readonly who: string;
  /** What the bar says, where the sheet names them otherwise. Left off, the name. */
  readonly label?: string;
  /** The bar's colour, or the two halves of a bar she split down the middle. */
  readonly colour: string | readonly [string, string];
  /** The bar's height, as a share of the sheet's width. */
  readonly h: number;
}

/**
 * The second edition's colour chart, at the foot of its page: one bar for
 * each person, in her order, left to right, every bar standing on one line
 * with the name set upright above it. Each bar's height is her own choice,
 * not something that follows from the name — the space between a name and
 * its bar runs from 46 to 162 of her 1824 — so the heights are written here,
 * measured off the sheet like everything else, and so are the colours,
 * sampled from the middle of each bar. Isabel Sendra's bar is two colours,
 * split down its length, as drawn.
 *
 * The labels are the site's own names, so a bar says what the entry it leads
 * to says; two keep the sheet's shorter word, the studio rather than the
 * person, because the full name would run into her bar.
 */
export const CHART_II: readonly ChartBar[] = [
  { who: 'Gema Sach', colour: '#b18d87', h: 0.5255 },
  { who: 'Oscar Tusquets', colour: '#a4402c', h: 0.4241 },
  { who: 'Marc Morro', colour: '#854531', h: 0.4953 },
  { who: 'Andrea Batlló y Adrià Escolano', colour: '#b18d87', h: 0.2892 },
  { who: 'Escobedo Soliz', colour: '#345571', h: 0.4953 },
  { who: 'Montse Vicens', label: 'Intsight', colour: '#e1a586', h: 0.5694 },
  { who: 'Nomos arquitectos', label: 'Nomos', colour: '#391f19', h: 0.5907 },
  { who: 'Kal-a', colour: '#4d4f5a', h: 0.6187 },
  { who: 'AMOO', colour: '#4f2727', h: 0.6061 },
  { who: 'Isabel Sendra', colour: ['#c2b67a', '#ceb3ac'], h: 0.5085 },
  { who: 'Laura Castanya', colour: '#c69244', h: 0.4937 },
  { who: 'Antoni Arola', colour: '#925222', h: 0.52 },
  { who: 'Isla arquitectos', colour: '#9b675a', h: 0.4449 },
  { who: 'Un parell d’arquitectes', colour: '#8899a3', h: 0.3999 },
  { who: 'Isabel Francoy', colour: '#495a71', h: 0.497 },
  { who: 'Tomás López Amat', colour: '#3c2325', h: 0.4531 },
  { who: 'ContiCert', colour: '#67342c', h: 0.548 },
  { who: 'Elii', colour: '#ac7f33', h: 0.634 },
  { who: 'Stefano Colli', colour: '#1c272d', h: 0.5134 },
  { who: 'Plantea Estudio', colour: '#7e4d3e', h: 0.497 },
];
