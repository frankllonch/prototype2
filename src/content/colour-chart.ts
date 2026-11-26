/** The Colour Chart, as the designer sets it. */
import { chartPhotographs, colourChart } from './load.ts';
import type { ProjectImage } from './types.ts';

/** The chart's colours, measured off the designer's reference at the 1520 it was drawn at. */
export const BANDS: readonly string[] = [
  '#b15f60', '#fbc644', '#f1d8ae', '#fafafa', '#3b5741', '#8d2530',
  '#e83a41', '#e4630e', '#5aba9f', '#b73933', '#b7b39e', '#fbbe41',
  '#cb6c42', '#eb5d41', '#a8a595', '#254e9d', '#006780', '#6d69a4',
  '#d69a2a', '#ec692b', '#85709d', '#5c7e52', '#a9a2a1',
];

/* ------------------------------------------------------------ the setting */

/** What the page says somewhere other than in the body. */
const MOVED: readonly RegExp[] = [/^cost\b/i, /^make your order\b/i];

/** What the page does not say at all. */
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

/** Paragraphs the sheet runs on from the one before — a new line, not a new paragraph. */
const RUN_ON: readonly RegExp[] = [
  /^this chart is the fruit\b/i,
  /^this reissue confirms\b/i,
  /^it can also be used\b/i,
];

/** Where the statement breaks. */
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

/** The price, exactly as she wrote it — "60,50€", comma and all. */
export const price: string | undefined = (() => {
  const line = paragraphs.map(strip).find((p) => /^cost\b/i.test(p));
  return line?.match(/[\d][\d.,]*\s*€/)?.[0].replace(/\s+/g, '');
})();

/** "Color", not "colour". */
const spelled = (markup: string): string =>
  markup.replace(/Colour/g, 'Color').replace(/colour/g, 'color');

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

/** The page, divided. */
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
export const statement: readonly string[] = divided.statement.map((p) => spelled(broken(p)));

/** Features, the technical notes, and About a colour chart. */
export const sections: readonly ChartSection[] = divided.sections.map((s) => ({
  title: s.title,
  kind: s.kind,
  blocks: joined(s.items),
}));

/** The chart out in the world. */
export const photographs: readonly ProjectImage[] = chartPhotographs?.images ?? [];
