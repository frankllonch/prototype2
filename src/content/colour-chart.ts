/**
 * The Colour Chart, as the designer's sheet sets it: a price and a way to order
 * in the margin, the chart's own colours in a column beside them, and the text
 * running down the rest of the page.
 *
 * Two of the source paragraphs move out of the prose here, and that is the whole
 * reason this file exists. The WordPress page ends with
 *
 *   cost 60,50€
 *   make your order at: claudia@claudiacolor.com
 *
 * and the new composition says both of those things in the left column instead —
 * the price set large, the address behind a form. Leaving them in the prose
 * would print the price twice and, worse, leave Claudia's address sitting in the
 * markup of a public page for anything that reads HTML to harvest. The price is
 * read out of the first of them so the figure still has exactly one source: when
 * she edits it in WordPress, the column follows.
 */
import { colourChart } from './load.ts';
import type { ProjectImage } from './types.ts';

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

/**
 * The two paragraphs the left column now carries.
 *
 * Matched on how each opens rather than on the whole sentence, so a typo fixed
 * or a price raised in WordPress does not silently put them back into the body.
 * Both are matched against the paragraph's text, with its tags removed, because
 * the source wraps parts of these lines in `<strong>` and `<em>` at will.
 */
const MOVED: readonly RegExp[] = [/^cost\b/i, /^make your order\b/i];

/**
 * And the two the text no longer opens with.
 *
 * The designer's reference starts the column at "Colour has always been my
 * inspiration" — the date range and the byline that stand above it in
 * WordPress are not in it. They are the caption of the object rather than part
 * of the statement, and the new page captions the object in its own heading and
 * margin. Matched the same way as the two above: on how each opens, against the
 * paragraph's text with its tags stripped.
 */
const CAPTIONS: readonly RegExp[] = [/^\d{4}\s*\/\s*\d{4}$/, /^artist colour chart\b/i];

const text = (markup: string): string => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Every `<p>` of the page body, in order, as it appears in the source markup. */
function paragraphs(markup: string): readonly string[] {
  return [...markup.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/g)].map((m) => m[0]);
}

const body: string = (colourChart?.rows ?? [])
  .flatMap((row) => row.columns)
  .map((column) => (column.kind === 'text' ? column.html : ''))
  .join('');

/**
 * The price, exactly as she wrote it — "60,50€", comma and all.
 *
 * Read out of the `cost` paragraph rather than stated here. Absent if that
 * paragraph is ever removed, and the column then simply has no price in it,
 * which is better than a figure this file believes and the page does not.
 */
export const price: string | undefined = (() => {
  const line = paragraphs(body).map(text).find((p) => /^cost\b/i.test(p));
  return line?.match(/[\d][\d.,]*\s*€/)?.[0].replace(/\s+/g, '');
})();

/** The body with those four paragraphs taken out, and nothing else touched. */
export const prose: string = paragraphs(body).reduce((markup, para) => {
  const plain = text(para);
  const withheld = [...MOVED, ...CAPTIONS].some((pattern) => pattern.test(plain));
  return withheld ? markup.replace(para, '') : markup;
}, body);

/**
 * The three photographs of the chart.
 *
 * The composition gives the middle column to the band stack, so they are no
 * longer beside the text — they follow it, at the foot of the column that
 * scrolls. The text ends by crediting each of them by number; dropping them to
 * match the reference, which is a screenshot of the top of the page, would have
 * left those credits pointing at nothing.
 */
export const photographs: readonly ProjectImage[] = colourChart?.images ?? [];
