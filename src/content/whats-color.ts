import { exhibitions, commissioned } from './load.ts';

/**
 * What's Color?, read out of the source rather than retyped.
 *
 * The project ran three times and the site already holds all three: editions
 * I and II as exhibitions, III as a project. An earlier pass at this page took
 * the roster off the designer's sheet on the assumption that the names existed
 * nowhere else. They do: editions I and III both carry every participant with
 * their role, the colour their answer was given, and in most cases the answer
 * itself, set as a run of paragraphs on the page. So this reads them.
 *
 * That matters beyond tidiness. The sheet was transcribed from this same page
 * and picked up errors on the way — Emecke for Emcke, Attenborough for the
 * site's Attenborugh, Udy for Judy, and several commas dropped so that two
 * people ran into one. Deriving means a correction Claudia makes in WordPress
 * arrives here, and that this page cannot drift from the page it describes.
 *
 * Edition II is the exception and is honest about it: the source names
 * twenty-nine studios and people in a single thank-you sentence, with no
 * roles, no answers and no colours. That is all there is, so that is all this
 * reports — see `hasAnswers`.
 */

export interface Participant {
  readonly name: string;
  /** What they do, where the source says. */
  readonly role?: string;
  /** The name they publish under, where the source gives one beside their own. */
  readonly alias?: string;
  /** The colour reference, normalised to three digits: AC011, AC002. */
  readonly code?: string;
  /** The colour's name as the source writes it: POWDER RED, AZUL PISCINA. */
  readonly colourName?: string;
  /** Their answer to the question, as HTML. Absent for those who did not give one. */
  readonly answer?: string;
}

export interface Edition {
  readonly numeral: string;
  readonly slug: string;
  /** The title as the source writes it. */
  readonly sourceTitle: string;
  /** The introduction, as HTML. */
  readonly intro: string;
  readonly participants: readonly Participant[];
  /** False for edition II, whose source lists names and nothing else. */
  readonly hasAnswers: boolean;
}

/* ------------------------------------------------------------------ parsing */

/** Top-level `<p>…</p>` chunks. The source nests divs around them but never a p. */
function paragraphs(html: string): string[] {
  return [...html.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)].map((m) => m[0]);
}

const plain = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The text of the `<strong>` runs a block opens with.
 *
 * Which bit of a header is bold is the one reliable signal of where the name
 * ends, and the two editions mark it differently: I bolds the name and leaves
 * the role as plain text beside it, III bolds the whole line. Reading the
 * leading run tells those apart without having to know which edition it is.
 */
function leadingStrong(html: string): string {
  let rest = html.replace(/^<p\b[^>]*>/i, '').replace(/<\/p>$/i, '');
  // Step over whatever inline wrapper the editor opened first. Half of edition
  // I's headers are `<span><strong>NAME</strong>ROLE …</span>` and half are the
  // same without the span; without this the wrapped ones lose the boundary and
  // the role is read as part of the name.
  rest = rest.replace(/^(?:\s*<(?:span|em|i|b)\b[^>]*>)+/i, '');
  let out = '';
  for (;;) {
    const m = /^\s*<strong\b[^>]*>([\s\S]*?)<\/strong>/i.exec(rest);
    if (!m) break;
    out += `${plain(m[1]!)} `;
    rest = rest.slice(m[0].length);
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** AC011, AC 002, AC16, AC39 — all the same thing, written four ways. */
const AC = /\bAC\s*0*(\d{1,3})\b/i;

/**
 * One participant out of a header line.
 *
 * The shape is `NAME, ROLE / ACnnn COLOUR`, with every part of it optional
 * somewhere in the source. The code is found first because it is the one
 * unambiguous landmark: everything before it is the person, everything after
 * it is the colour's name — except for the two entries that put the code after
 * the colour instead, which is why both sides are tried.
 */
function readHeader(block: string): Participant | null {
  const text = plain(block);
  const code = AC.exec(text);
  if (!code) return null;

  let before = text.slice(0, code.index);
  let after = text.slice(code.index + code[0].length);

  // JULIA RUIZ CABELLO and CRISTINA STOLHE are written `… OCRE ROJIZO AC075`,
  // with the colour before the code. Nothing follows the code there, so when
  // the tail is empty the colour is the last words of the head instead.
  let colourName = after.replace(/^[\s/,.-]+/, '').trim();
  // JULIA RUIZ CABELLO's entry ends in a stray diaeresis after the code. A
  // "colour" with no letters in it is not one, and treating it as one left the
  // real colour stranded in the role.
  if (!/\p{L}/u.test(colourName)) colourName = '';
  if (!colourName) {
    const tail = /[/,]\s*([^/,]+)$/.exec(before);
    if (tail) { colourName = tail[1]!.trim(); before = before.slice(0, tail.index); }
  }

  before = before.replace(/[\s/,]+$/, '').trim();

  const lead = leadingStrong(block);
  // Edition I bolds the name alone, so the bold run is shorter than the head
  // and is the better boundary. Edition III bolds the lot, so it is not.
  const head = lead && lead.length < before.length ? lead : before;

  const parts = head.split(',').map((s) => s.trim()).filter(Boolean);
  let name = parts[0] ?? head;
  let rest = parts.slice(1);

  // Where the source forgot the comma between a name and what follows it.
  const fix = NAME_FIX[name.toUpperCase()];
  if (fix) { rest = [...fix.rest, ...rest]; name = fix.name; }

  const roleFromHead = rest.join(', ');
  const roleFromTail = head === before ? '' : before.slice(head.length).replace(/^[\s/,]+/, '');
  const role = [roleFromHead, roleFromTail]
    .filter(Boolean).join(' / ')
    .replace(/\s*\/\s*\/+\s*/g, ' / ')
    .replace(/[\s/]+$/, '');

  // An alias is a lowercase or mixed-case run sitting between the name and the
  // role: `JOSE JAVIER SERRANO, Yosigo, FOTÓGRAFO`.
  let alias: string | undefined;
  const bits = role.split(/\s*,\s*/).filter(Boolean);
  if (bits.length > 1 && bits[0] && bits[0] !== bits[0].toLocaleUpperCase()) alias = bits[0];

  const roleOut = alias ? bits.slice(1).join(', ') : role;

  return {
    name: titleCase(name),
    ...(roleOut ? { role: sentenceCase(roleOut) } : {}),
    ...(alias ? { alias } : {}),
    code: `AC${code[1]!.padStart(3, '0')}`,
    ...(colourName ? { colourName: sentenceCase(colourName) } : {}),
  };
}

/**
 * Names the source runs into the next word for want of a comma.
 *
 * Two of them, both in edition III, and both only resolvable by knowing that
 * the trailing words are a job: LUCIA BONED's `LIBRERA` sits in the role
 * column of the designer's own sheet, and MARC GÓMEZ del MORAL is a name in
 * full. Written down because they are readings of the source, not the source.
 */
const NAME_FIX: Readonly<Record<string, { name: string; rest: string[] }>> = {
  'LUCIA BONED LIBRERA': { name: 'LUCIA BONED', rest: ['LIBRERA'] },
  'HENRY GIROUX WRITER AND CULTURAL CRITIC': {
    name: 'HENRY GIROUX', rest: ['WRITER AND CULTURAL CRITIC'],
  },
};

/**
 * The source shouts; the page does not.
 *
 * Only words the source set entirely in capitals are lowered. A studio that
 * writes itself Int-sight or Conti.Cert already chose its own casing and
 * keeps it — the thank-you list in edition II is written normally, while the
 * rosters in I and III are in full caps throughout.
 */
function titleCase(s: string): string {
  const small = new Set(['de', 'del', 'la', 'y', 'i', 'van', 'von', 'des']);
  return s.split(/\s+/).map((w, i) => {
    if (/\p{Ll}/u.test(w)) return w;
    const lower = w.toLocaleLowerCase();
    if (i > 0 && small.has(lower)) return lower;
    return lower.replace(/(^|[(\u2019'.-])(\p{L})/gu, (_, lead: string, c: string) => lead + c.toLocaleUpperCase());
  }).join(' ');
}

function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.toLocaleLowerCase().replace(/^[\p{L}]/u, (c) => c.toLocaleUpperCase());
}

/**
 * Participants out of a column that alternates header, answer, header, answer.
 *
 * An answer is whatever non-header paragraph follows a header, so somebody who
 * gave none simply has nothing between them and the next name — which is how
 * fourteen of edition I's twenty-eight sit in the source, and the page says so
 * rather than inventing them a sentence.
 */
function readRoster(html: string): Participant[] {
  const out: Participant[] = [];
  for (const block of paragraphs(html)) {
    const header = readHeader(block);
    if (header) { out.push(header); continue; }
    const last = out[out.length - 1];
    const body = plain(block);
    if (!last || last.answer || !body) continue;
    out[out.length - 1] = { ...last, answer: body };
  }
  return out;
}

/**
 * The thank-you sentence edition II has instead of a roster.
 *
 * Read off the whole column rather than paragraph by paragraph: in the source
 * it is not a paragraph of its own but the tail of the artist's note, after
 * the photo credit. Several entries carry a studio in brackets — "Montse
 * Vicens (Int-sight)" — and those brackets are kept, because that is how the
 * page names them and it is not this module's place to decide otherwise.
 */
function readThanks(html: string): Participant[] {
  const m = /thanks\s*to\s*:?\s*([^<]+)/i.exec(plain(html));
  if (!m) return [];
  return m[1]!
    .split(/\s*,\s*/)
    .map((s) => s.replace(/[.\s]+$/, '').trim())
    .filter((s) => s.length > 1)
    .map((name) => ({ name: titleCase(name) }));
}

interface RowLike { readonly columns: readonly { readonly kind: string; readonly html?: string }[] }

/** Text columns with something in them. The source is full of empty spacer divs. */
function textColumns(rows: readonly RowLike[]): string[] {
  return rows
    .flatMap((r) => r.columns)
    .filter((c) => c.kind === 'text')
    .map((c) => c.html ?? '')
    .filter((html) => plain(html).length > 40);
}

/**
 * The column holding the roster, found by what is in it rather than by where
 * it sits.
 *
 * Counting positions would work today and break the first time Claudia adds a
 * paragraph in WordPress. The roster is the one column full of colour
 * references, so that is the test.
 */
function rosterColumn(rows: readonly RowLike[]): string {
  let best = '';
  let most = 0;
  for (const html of textColumns(rows)) {
    const n = (plain(html).match(/\bAC\s*0*\d{1,3}\b/gi) ?? []).length;
    if (n > most) { most = n; best = html; }
  }
  return best;
}

/** The opening paragraphs of a column, skipping any that only credit someone. */
function intro(html: string, take: number, skip = 0): string {
  const blocks = paragraphs(html).slice(skip);
  const kept: string[] = [];
  for (const block of blocks) {
    const text = plain(block);
    if (!text) continue;
    // The curators' byline opens edition II's essay; the designer's layout
    // starts at the writing itself.
    if (/^exhibition curators\s*:/i.test(text)) continue;
    kept.push(block);
    if (kept.length >= take) break;
  }
  return kept.join('\n');
}

function build(): readonly Edition[] {
  const one = exhibitions.find((e) => e.slug === 'what-s-color-i');
  const two = exhibitions.find((e) => e.slug === 'what-s-color-ii-for-architects-and-designers');
  const three = commissioned.find(
    (p) => p.slug === 'whats-color-3rd-edition-llibreria-terranova-abril-2024',
  );

  const out: Edition[] = [];

  if (three) {
    const column = rosterColumn(three.rows);
    out.push({
      numeral: 'III', slug: three.slug, sourceTitle: three.title,
      // Block 0 is the masthead — title, bookshop, dates — which the page sets
      // elsewhere; block 1 is the writing.
      intro: intro(column, 1, 1),
      participants: readRoster(column),
      hasAnswers: true,
    });
  }

  if (two) {
    const columns = textColumns(two.rows);
    const essay = columns[0] ?? '';
    out.push({
      numeral: 'II', slug: two.slug, sourceTitle: two.title,
      intro: intro(essay, 1),
      participants: readThanks(columns.join('\n')),
      hasAnswers: false,
    });
  }

  if (one) {
    out.push({
      numeral: 'I', slug: one.slug, sourceTitle: one.title,
      intro: intro(textColumns(one.rows)[0] ?? '', 1),
      // The glossary column, which opens with Claudia's own note before the
      // first name; `readRoster` ignores anything before a header anyway.
      participants: readRoster(rosterColumn(one.rows)),
      hasAnswers: true,
    });
  }

  return out;
}

/**
 * A stand-in colour for a participant's swatch.
 *
 * The source names a colour for everyone in editions I and III — POWDER RED,
 * AZUL PISCINA, DARK GREEN — but nowhere in the dataset is there a value for
 * any of them: the AC numbers index Claudia's own chart, and that chart is on
 * paper. So these are read off the names, in the two languages the source
 * writes them in, and they are approximations of a word rather than the
 * colour itself. Claudia has the real mapping and it replaces this wholesale.
 *
 * Reading the name beats a random palette for one practical reason: a wrong
 * green sitting behind DARK GREEN looks like a tuning problem, while a random
 * pink behind it looks like the page is broken, and only one of those is the
 * truth of where this stands.
 */
const WORDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/off\s*white|blanco|white|crudo/i, '#efebe3'],
  [/powder\s*red|rosa|pink/i, '#d98f93'],
  [/pompeian|rojizo|rouge|rojo|\bred\b/i, '#b23a2e'],
  [/burdeos|granate|wine/i, '#7d2a35'],
  [/naranja|orange|teja/i, '#d2762f'],
  [/ocre|ocher|ochre|mostaza|amarillo|yellow/i, '#e3b23c'],
  [/arena|sand|beige|nude|crema/i, '#dcc9a8'],
  [/marr[oó]n|brown|tierra/i, '#8a5a3b'],
  [/verde\s*oscuro|dark\s*green/i, '#2f4b35'],
  [/verde|green/i, '#5f7f4f'],
  [/azul\s*celeste|celeste|sky/i, '#8fb3cc'],
  [/azul\s*piscina|turquesa|turquoise|cyan/i, '#3f9aa6'],
  [/azul\s*oscuro|navy|marino/i, '#2b3a58'],
  [/azul|blue/i, '#4a6b96'],
  [/violeta|morado|purple|lila/i, '#6b4a78'],
  [/gris|grey|gray/i, '#8d8d87'],
  [/negro|black/i, '#2b2b2b'],
  [/fresa|strawberry/i, '#c4455c'],
];

/** When the source names no colour, a steady sweep so neighbours differ. */
const SWEEP = ['#c96a3f', '#4a6b96', '#5f7f4f', '#b23a2e', '#8d8d87', '#e3b23c', '#6b4a78', '#3f9aa6'];

export function swatchFor(p: Participant, index: number): string {
  if (p.colourName) {
    for (const [pattern, hex] of WORDS) if (pattern.test(p.colourName)) return hex;
  }
  return SWEEP[index % SWEEP.length]!;
}

export const EDITIONS: readonly Edition[] = build();

/**
 * Everyone, once, in the order the editions run.
 *
 * The opening view is one continuous run of names, so a person who answered
 * more than once appears a single time — reading the same name twice in one
 * sentence looks like a fault in the page whatever the truth behind it. The
 * per-edition views still show them under each.
 */
export function allParticipants(): readonly Participant[] {
  const seen = new Set<string>();
  const out: Participant[] = [];
  for (const edition of EDITIONS) {
    for (const p of edition.participants) {
      const key = p.name.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
