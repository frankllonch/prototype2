/**
 * One quotation mark across the site: a single ‘ to open and ’ to close.
 *
 * The designer's notes (2026-11-26) ask for every « », “ ” and " in the text
 * to become a single mark, and point out closing marks the source set the
 * wrong way round (‘gozo. ‘). The texts come from many places — the
 * WordPress extract, the sheets transcribed here, the What's Color documents —
 * so the rule is applied once, to every page as it is written, rather than
 * by hand in each source: a text added later is set the same way.
 *
 * Only text is touched, never markup: tags, comments, scripts and styles pass
 * through as they are. Inch marks on artwork sizes (27,5" x 23,6") are not
 * quotes and are left alone, as are apostrophes (What’s, Mira’m).
 */

const INLINE = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp',
  'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'picture', 'img', 'source', 'svg',
]);

const ENTITIES: Record<string, string> = {
  '&quot;': '"', '&#34;': '"', '&#x22;': '"', '&#39;': "'", '&#x27;': "'", '&apos;': "'",
  '&laquo;': '«', '&raquo;': '»', '&ldquo;': '“', '&rdquo;': '”', '&lsquo;': '‘', '&rsquo;': '’',
  '&#171;': '«', '&#187;': '»', '&#8216;': '‘', '&#8217;': '’', '&#8220;': '“', '&#8221;': '”',
};
const ENTITY = new RegExp(Object.keys(ENTITIES).join('|'), 'gi');

/** Marks that open or close a quotation (or, for ’ and ', an apostrophe). */
const MARK = /[«»“”"‘’'`]/;
const OPENING = new Set(['«', '“', '‘', '`']);
const SPACE = /[\s ]/;
const BEFORE_OPEN = /[\s ([{–—/-]/;
const AFTER_CLOSE = /[\s .,;:!?)\]}…-]/;
const WORD = /[\p{L}\p{N}]/u;
/** What follows an inch mark: the "x" of a size, "inches", or the end of it. */
const AFTER_INCH = /^[\s ]?(?:x\b|×|X\b|inch|in\b|[.,;:)]|$)/i;

type Token = { kind: 'text'; value: string } | { kind: 'tag'; value: string; name: string; closing: boolean };

function tokenize(page: string): Token[] {
  const out: Token[] = [];
  const re = /<!--[\s\S]*?-->|<(script|style|textarea)\b[\s\S]*?<\/\1\s*>|<\/?([a-zA-Z][\w-]*)[^>]*>/g;
  let at = 0;
  for (let m = re.exec(page); m; m = re.exec(page)) {
    if (m.index > at) out.push({ kind: 'text', value: page.slice(at, m.index) });
    const name = (m[2] ?? m[1] ?? '!').toLowerCase();
    out.push({ kind: 'tag', value: m[0], name: m[1] ? `raw:${name}` : name, closing: m[0].startsWith('</') });
    at = re.lastIndex;
  }
  if (at < page.length) out.push({ kind: 'text', value: page.slice(at) });
  return out;
}

/** Whether a tag ends the run of text a quotation can span. */
const breaks = (t: Token) => t.kind === 'tag' && !INLINE.has(t.name);

export function singleQuotes(page: string): string {
  const tokens = tokenize(page);
  let open = false;
  // The character before the next one read, across inline tags.
  let prev = '';

  // The text after position `i` of token `k`, up to the next block boundary
  // (a little of it: enough to look ahead a few characters).
  const ahead = (k: number, text: string, i: number): string => {
    let rest = text.slice(i + 1);
    for (let j = k + 1; j < tokens.length && rest.length < 12; j++) {
      const t = tokens[j]!;
      if (t.kind === 'text') rest += decode(t.value);
      else if (breaks(t)) return `${rest} `;
    }
    return rest;
  };

  for (let k = 0; k < tokens.length; k++) {
    const token = tokens[k]!;
    if (token.kind === 'tag') {
      if (breaks(token)) {
        prev = ' ';
        // A line break inside a quotation does not end it; anything else does.
        if (token.name !== 'br') open = false;
      }
      continue;
    }
    if (!MARK.test(token.value) && !/&[#\w]+;/.test(token.value)) {
      if (token.value) prev = token.value.at(-1)!;
      continue;
    }
    const text = decode(token.value);
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const c = text[i]!;
      if (!MARK.test(c)) {
        out += c;
        prev = c;
        continue;
      }
      // A doubled single mark (‘’La luz, ’’) stands for one double mark.
      let width = 1;
      if (/[‘’'`]/.test(c) && /[‘’'`]/.test(text[i + 1] ?? '')) width = 2;
      const rest = ahead(k, text, i + width - 1);
      const next = rest[0] ?? ' ';
      const before = out.replace(/[\s ]+$/, '');
      const lastSeen = before.at(-1) ?? (SPACE.test(prev) ? '' : prev);

      // Inch marks: a double mark (or ″, or two singles) right after a number
      // and followed by the rest of a size. Kept exactly as written.
      if ((c === '"' || width === 2) && /\d/.test(lastSeen) && /^[\s ]?$/.test(out.slice(before.length)) && AFTER_INCH.test(rest)) {
        out += text.slice(i, i + width);
        prev = text[i + width - 1]!;
        i += width - 1;
        continue;
      }

      // An apostrophe: between two letters (What’s, l’os).
      if (width === 1 && (c === '’' || c === "'") && WORD.test(prev) && WORD.test(next)) {
        out += '’';
        prev = '’';
        continue;
      }

      const spaceBefore = prev === '' || BEFORE_OPEN.test(prev) || OPENING.has(prev);
      const spaceAfter = AFTER_CLOSE.test(next);
      let opens: boolean;
      if (spaceBefore && !spaceAfter) opens = true;
      else if (!spaceBefore && spaceAfter) opens = false;
      else if (!spaceBefore && !spaceAfter) opens = !open && OPENING.has(c) && !/[.,;:!?]/.test(prev);
      // Loose on both sides (‘ Colour…, …gozo. ‘): it closes the quotation
      // that is open, or opens one; either way it is set tight to its words.
      else opens = !open;

      if (opens) {
        out += '‘';
        prev = '‘';
        open = true;
        // Tight to the words it opens.
        if (spaceBefore && SPACE.test(next) && /\S/.test(rest)) {
          while (SPACE.test(text[i + width] ?? '')) i++;
        }
      } else {
        if (SPACE.test(prev) && open && before.length) out = before;
        out += '’';
        prev = '’';
        open = false;
      }
      i += width - 1;
    }
    token.value = out;
  }
  return tokens.map((t) => t.value).join('');
}

function decode(text: string): string {
  return text.replace(ENTITY, (e) => ENTITIES[e.toLowerCase()] ?? e);
}
