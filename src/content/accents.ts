/**
 * The phrases the About page sets in an italic serif, after the designer's sheet.
 *
 * The sheet marks about one phrase a paragraph, and they are not decoration
 * scattered for rhythm — each is the thing its paragraph is actually about.
 * There is one for every paragraph of the biography now, except the fourth,
 * which is long enough to carry two and holds both the studio and the chart;
 * the paragraph about the three solo shows is the one left plain, because what
 * it says is a count and a pair of cities rather than an idea, and setting a
 * fact in italic claims something for it that the others earn.
 *
 * The biography on the site is longer than the one on the sheet, so these are
 * the same kinds of subject located in the longer telling rather than the same
 * words copied across. Guessed, in other words, and worth checking against the
 * designer's intent. A phrase that is not found is skipped in silence, so this
 * can be edited freely and a wrong guess costs nothing but a missing italic.
 *
 * Each is quoted from the source exactly; nothing here is rewritten. Where a
 * phrase occurs twice — 'the reason of color and its form' opens the third
 * paragraph and returns in the eighth — only the first is marked.
 */
const ACCENTS: readonly string[] = [
  'an identifiable language',
  'a natural ability with color',
  'the reason of color and its form',
  'Arts&Claus',
  'a COLOUR CHART, with more than 200 references',
  'a chromatic language of her own',
  'the way colors interact with each other',
  '‘Color glossary’',
  'colour prescription in the areas of design and architecture',
  'Miquel Alzueta',
];

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Marks each phrase where it first appears, without going near the markup.
 *
 * The HTML is cut into tags and the text between them, and only the text is
 * touched: a blind search-and-replace over the whole string would match inside
 * an attribute — an `alt`, a `href` — and write an `<em>` into it, which does
 * not show up as a broken tag until something tries to parse it.
 *
 * A phrase split across a tag boundary simply is not found. That is the right
 * failure: wrapping half of one would leave the emphasis opening in one element
 * and closing in another.
 */
export function markAccents(html: string): string {
  const pending = new Set(ACCENTS);

  return html
    .split(/(<[^>]*>)/)
    .map((segment) => {
      if (segment.startsWith('<')) return segment;
      let text = segment;
      for (const phrase of [...pending]) {
        const at = text.indexOf(phrase);
        if (at === -1) continue;
        pending.delete(phrase);
        text = text.replace(new RegExp(escapeRe(phrase)), `<em class="ink-accent">${phrase}</em>`);
      }
      return text;
    })
    .join('');
}
