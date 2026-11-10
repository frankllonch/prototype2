/**
 * The Colour Chart, as the designer sets it.
 *
 * This file exists because her page is hand-set and the source is not. WordPress
 * holds one run of twenty-nine paragraphs; the sheet makes four things of them —
 * a statement at the top, broken into lines by hand, beside the chart's own
 * colours; Features; six technical notes across a grid; and About a colour
 * chart — with a price in the margin and the same price again at the foot.
 *
 * Everything below is that setting, written down. It is deliberately matched on
 * how each paragraph opens rather than on its whole text: Claudia goes on
 * editing this page in WordPress, and a comma moved should cost the page a line
 * break, not a section. Where a rule stops matching, the paragraph simply falls
 * back to being an ordinary paragraph in the section it is already in — the
 * page gets plainer, never broken.
 *
 * The one thing taken rather than arranged is the price: it is read out of the
 * `cost` paragraph, so the figure still has exactly one source. When she raises
 * it, the margin and the foot both follow.
 */
import { colourChart } from './load.ts';

/**
 * The chart's colours, measured off the designer's reference at the 1520 it was
 * drawn at — twenty-three bands, read top to bottom, including the near-white
 * fourth, which is a colour in the chart and not a gap in the stack. The sample
 * is the average of the middle of each band rather than a single pixel, so an
 * antialiased boundary cannot stand in for the colour.
 *
 * Not the 142 of the fan deck, and not sampled from the photographs of it: this
 * is the run the designer chose to stand for the chart on the page. Taken as
 * given, in her order.
 */
export const BANDS: readonly string[] = [
  '#b15f60', '#fbc644', '#f1d8ae', '#fafafa', '#3b5741', '#8d2530',
  '#e83a41', '#e4630e', '#5aba9f', '#b73933', '#b7b39e', '#fbbe41',
  '#cb6c42', '#eb5d41', '#a8a595', '#254e9d', '#006780', '#6d69a4',
  '#d69a2a', '#ec692b', '#85709d', '#5c7e52', '#a9a2a1',
];

/* ------------------------------------------------------------ the setting */

/**
 * What the page says somewhere other than in the body.
 *
 * `cost 60,50€` and `make your order at: claudia@claudiacolor.com` are the
 * margin and the foot now — the price set large beside the chart and again
 * under the last line, the address behind a form. Leaving them in the body
 * would print the price three times and, worse, leave Claudia's address in the
 * markup of a public page for anything that reads HTML to harvest.
 */
const MOVED: readonly RegExp[] = [/^cost\b/i, /^make your order\b/i];

/**
 * What the page does not say at all.
 *
 * The date range and the byline stand above the text in WordPress and the sheet
 * opens at the statement instead; the three photographs and their credits are
 * not on the sheet either, and the credits go with the photographs rather than
 * being left pointing at nothing.
 */
const WITHHELD: readonly RegExp[] = [
  /^\d{4}\s*\/\s*\d{4}$/,
  /^artist colour chart\b/i,
  /^images:/i,
  /^#\d/,
];

/** The three headings, which are where the page divides. */
const HEADINGS: readonly { readonly match: RegExp; readonly title: string }[] = [
  { match: /^features\b/i, title: 'Features' },
  { match: /^technical characteristics\b/i, title: 'Technical characteristics' },
  { match: /^about a colour chart\b/i, title: 'About a colour chart' },
];

/**
 * Paragraphs the sheet runs on from the one before — a new line, not a new
 * paragraph.
 *
 * Three places, and each is a sentence finishing a thought rather than opening
 * one: the chart's two decades after what it is, its timelessness after how it
 * sold, its use in industrial design after what it was designed for. In
 * WordPress they are separate paragraphs because that is how the editor works.
 */
const RUN_ON: readonly RegExp[] = [
  /^this chart is the fruit\b/i,
  /^this reissue confirms\b/i,
  /^it can also be used\b/i,
];

/**
 * Where the statement breaks.
 *
 * One break, after the colon, and the rest of the statement wraps as the
 * column gives it. The sheet before this one set all three paragraphs in
 * clauses, a line to a thought; the simplified page keeps only the one that
 * does not survive wrapping — "a source of knowledge, a way of life!" is the
 * answer to the colon and belongs under it, and at this measure it would
 * otherwise be dragged up and left with "life!" on a line of its own.
 *
 * The paragraph carries no markup, so inserting into it cannot land inside a
 * tag. The guard in `broken()` holds that true rather than trusting it.
 */
const LINES: readonly RegExp[] = [
  /\s+(?=a source of knowledge)/i,
];

/* -------------------------------------------------------------- the parse */

const strip = (markup: string): string =>
  markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** The inner markup of every `<p>` of the page body, in document order. */
const paragraphs: readonly string[] = (() => {
  const body = (colourChart?.rows ?? [])
    .flatMap((row) => row.columns)
    .map((column) => (column.kind === 'text' ? column.html : ''))
    .join('');
  return [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => (m[1] ?? '').trim());
})();

/**
 * The price, exactly as she wrote it — "60,50€", comma and all. Absent if the
 * `cost` paragraph is ever removed, and the page then simply has no price on
 * it, which is better than a figure this file believes and the page does not.
 */
export const price: string | undefined = (() => {
  const line = paragraphs.map(strip).find((p) => /^cost\b/i.test(p));
  return line?.match(/[\d][\d.,]*\s*€/)?.[0].replace(/\s+/g, '');
})();

/** The designer's line breaks, put in. Markup in the paragraph vetoes them. */
function broken(markup: string): string {
  if (markup.includes('<')) return markup;
  return LINES.reduce((line, at) => line.replace(at, '<br />'), markup);
}

/** A section of the page: a heading and the blocks under it. */
export interface ChartSection {
  readonly title: string;
  /** `notes` is the grid of short technical facts; everything else reads down. */
  readonly kind: 'prose' | 'notes';
  /** One `<p>` each, already carrying any run-on line. */
  readonly blocks: readonly string[];
}

/** Paragraphs run together where the sheet runs them together. */
function joined(items: readonly string[]): readonly string[] {
  return items.reduce<string[]>((blocks, para) => {
    const runsOn = blocks.length > 0 && RUN_ON.some((pattern) => pattern.test(strip(para)));
    if (runsOn) blocks[blocks.length - 1] += `<br />${para}`;
    else blocks.push(para);
    return blocks;
  }, []);
}

/**
 * The page, divided.
 *
 * One pass down the paragraphs: anything withheld or moved is dropped, a
 * heading starts a new section, and everything else joins whichever section is
 * open. What falls before the first heading is the statement.
 */
const divided = (() => {
  const statement: string[] = [];
  const sections: { title: string; kind: 'prose' | 'notes'; items: string[] }[] = [];

  for (const para of paragraphs) {
    const plain = strip(para);
    if (!plain) continue;
    if ([...MOVED, ...WITHHELD].some((pattern) => pattern.test(plain))) continue;

    const heading = HEADINGS.find((h) => h.match.test(plain));
    if (heading) {
      sections.push({
        title: heading.title,
        kind: /^technical/i.test(heading.title) ? 'notes' : 'prose',
        items: [],
      });
      continue;
    }
    if (sections.length) sections[sections.length - 1]!.items.push(para);
    else statement.push(para);
  }
  return { statement, sections };
})();

/** The three opening paragraphs, set in the designer's lines. */
export const statement: readonly string[] = divided.statement.map(broken);

/** Features, the technical notes, and About a colour chart. */
export const sections: readonly ChartSection[] = divided.sections.map((s) => ({
  title: s.title,
  kind: s.kind,
  blocks: joined(s.items),
}));
