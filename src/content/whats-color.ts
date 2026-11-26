import { exhibitions, commissioned } from './load.ts';
import { EDITION_I, EDITION_III, type DocumentEntry } from './whats-color-document.ts';
import { EDITION_II } from './whats-color-edition-ii.ts';
import { SAYS_III_SHEET } from './whats-color-sheet.ts';
import { FINAL_COLOURS } from './whats-color-colours.ts';
import { hues } from './palette.ts';

/** What's Color?, read out of the source rather than retyped. */

/** The standing note about the project, set above the names. */
export const LEAD =
  'I assign a color to people who inspire me \u2014 philosophers, historians, ' +
  'thinkers, writers, architects and artists \u2014 and ask each of them a ' +
  "simple question: WHAT\u2019S COLOR? It has run three times: Barcelona in " +
  '2020, Madrid in 2021, and Llibreria Terranova in Barcelona in 2024.' +
  // A blank line, then the invitation: its own paragraph on the sheet, set semibold in capitals by
  // the stylesheet.
  '\n\nClick on their names to see what they said.';

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
  /** Their answer to the question. Absent for those who did not give one. */
  readonly answer?: string;
  /** Which edition this record came from: 'I', 'II' or 'III'. */
  readonly edition?: string;
  /** A stable id for linking to this person's entry on an edition page. */
  readonly id?: string;
  /** Answered with pictures rather than words, as four of edition II did. */
  readonly inImages?: boolean;
}

export interface Edition {
  readonly numeral: string;
  readonly slug: string;
  /** The title as the source writes it. */
  readonly sourceTitle: string;
  /** The introduction the opening view shows in that edition's column. */
  readonly intro: string;
  /** The artist's own statement about this edition, for its own page. */
  readonly statement: string;
  readonly participants: readonly Participant[];
  /** False for edition II, whose source lists names and nothing else. */
  readonly hasAnswers: boolean;
  /** Claudia's own paragraphs, kept apart rather than joined. */
  readonly says?: readonly string[];
  /**
   * Everyone the source names for this edition, answered or not — the list the
   * designer sets across the top of its page.
   */
  readonly roster?: readonly Participant[];
  /**
   * The edition's text as the opening view sets it: a heading line, then the
   * writing, shown cut to the sentence her start-page sheet cuts it at until the
   * reader asks for more.
   */
  readonly opening?: {
    readonly heading: string;
    readonly align: 'justify' | 'left';
    readonly teaser: readonly string[];
    readonly full: readonly string[];
  };
}

/* ------------------------------------------------------------------ parsing */

/** Top-level `<p>…</p>` chunks. The source nests divs around them but never a p. */
function paragraphs(html: string): string[] {
  return [...html.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)].map((m) => m[0]);
}

const plain = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** The text of the `<strong>` runs a block opens with. */
function leadingStrong(html: string): string {
  let rest = html.replace(/^<p\b[^>]*>/i, '').replace(/<\/p>$/i, '');
  // Step over whatever inline wrapper the editor opened first.
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

/** One participant out of a header line. */
function looksLikeHeader(block: string): boolean {
  const text = plain(block);
  if (!text) return false;
  if (AC.test(text)) return true;
  // A header with a colour reference this regex cannot read would otherwise vanish and be
  // swallowed as the previous person's answer — silently, and one person short.
  const lead = leadingStrong(block);
  if (!lead || text.length > 180) return false;
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length < 3) return false;
  const upper = letters.replace(/\p{Ll}/gu, '').length / letters.length;
  return upper > 0.6;
}

function readHeader(block: string): Participant | null {
  const text = plain(block);
  if (!looksLikeHeader(block)) return null;
  const code = AC.exec(text);

  let before = code ? text.slice(0, code.index) : text;
  let after = code ? text.slice(code.index + code[0].length) : '';

  // JULIA RUIZ CABELLO and CRISTINA STOLHE are written `… OCRE ROJIZO AC075`, with the colour
  // before the code.
  let colourName = after.replace(/^[\s/,.-]+/, '').trim();
  // JULIA RUIZ CABELLO's entry ends in a stray diaeresis after the code.
  if (!/\p{L}/u.test(colourName)) colourName = '';
  if (!colourName) {
    const tail = /[/,]\s*([^/,]+)$/.exec(before);
    if (tail) { colourName = tail[1]!.trim(); before = before.slice(0, tail.index); }
  }

  before = before.replace(/[\s/,]+$/, '').trim();

  const lead = leadingStrong(block);
  // Edition I bolds the name alone, so the bold run is shorter than the head and is the better
  // boundary.
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

  // An alias is a lowercase or mixed-case run sitting between the name and the role: `JOSE JAVIER
  // SERRANO, Yosigo, FOTÓGRAFO`.
  let alias: string | undefined;
  const bits = role.split(/\s*,\s*/).filter(Boolean);
  if (bits.length > 1 && bits[0] && bits[0] !== bits[0].toLocaleUpperCase()) alias = bits[0];

  const roleOut = alias ? bits.slice(1).join(', ') : role;

  return {
    name: titleCase(name),
    ...(roleOut ? { role: sentenceCase(roleOut) } : {}),
    ...(alias ? { alias } : {}),
    ...(code ? { code: `AC${code[1]!.padStart(3, '0')}` } : {}),
    ...(colourName ? { colourName: sentenceCase(colourName) } : {}),
  };
}

/** Names the source runs into the next word for want of a comma. */
const NAME_FIX: Readonly<Record<string, { name: string; rest: string[] }>> = {
  'LUCIA BONED LIBRERA': { name: 'LUCIA BONED', rest: ['LIBRERA'] },
  'HENRY GIROUX WRITER AND CULTURAL CRITIC': {
    name: 'HENRY GIROUX', rest: ['WRITER AND CULTURAL CRITIC'],
  },
};

/** The source shouts; the page does not. */
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

/** Participants out of a column that alternates header, answer, header, answer. */
function readRoster(html: string): Participant[] {
  const out: Participant[] = [];
  const answers: string[][] = [];
  for (const block of paragraphs(html)) {
    if (readHeader(block)) { out.push(readHeader(block)!); answers.push([]); continue; }
    const body = plain(block);
    // Luís Cerveró answers in two paragraphs; taking only the first dropped seven hundred
    // characters of him without saying so.
    if (!out.length || !body) continue;
    answers[answers.length - 1]!.push(body);
  }
  return out.map((p, i) => {
    const parts = answers[i] ?? [];
    return parts.length ? { ...p, answer: parts.join('\n\n') } : p;
  });
}

/** The thank-you sentence edition II has instead of a roster. */
function readThanks(html: string): Participant[] {
  const m = /thanks\s*to\s*:?\s*([^<]+)/i.exec(plain(html));
  if (!m) return [];
  return m[1]!
    .split(/\s*,\s*/)
    .map((s) => s.replace(/[.\s]+$/, '').trim())
    .filter((s) => s.length > 1)
    .map((name) => ({ name }));
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

/** The column holding the roster, found by what is in it rather than by where it sits. */
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
    // The curators' byline opens edition II's essay; the designer's layout starts at the writing
    // itself.
    if (/^exhibition curators\s*:/i.test(text)) continue;
    kept.push(block);
    if (kept.length >= take) break;
  }
  return kept.join('\n');
}

/*
 * Names compared without their accents, case or punctuation, because the two
 * sources spell the same person three ways between them.
 */
const nameKey = (name: string) =>
  name.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

/** The document decides who is on the page; the site supplies what it already knows about them. */
function fromDocument(doc: readonly DocumentEntry[], derived: readonly Participant[]): Participant[] {
  const known = new Map<string, Participant>();
  for (const person of derived) known.set(nameKey(person.name), person);

  return doc.map((entry) => {
    const site =
      known.get(nameKey(entry.name)) ??
      entry.aka?.map((spelling) => known.get(nameKey(spelling))).find(Boolean);

    const code = entry.code ? AC.exec(entry.code) : null;
    const answer = entry.answer ?? site?.answer;
    const role = entry.role ?? site?.role;
    const colourName = entry.colourName ?? site?.colourName;

    return {
      name: entry.name,
      ...(role ? { role } : {}),
      ...(entry.alias ? { alias: entry.alias } : site?.alias ? { alias: site.alias } : {}),
      ...(code ? { code: `AC${code[1]!.padStart(3, '0')}` } : site?.code ? { code: site.code } : {}),
      ...(colourName ? { colourName } : {}),
      ...(answer ? { answer } : {}),
      ...(entry.inImages ? { inImages: true } : {}),
    };
  });
}

/** The paragraphs up to and including the sentence the start-page sheet cuts at, as plain text. */
function cutAt(paras: readonly string[], sentinel: string): string[] {
  const out: string[] = [];
  for (const para of paras) {
    const at = para.indexOf(sentinel);
    if (at < 0) {
      out.push(para);
      continue;
    }
    out.push(para.slice(0, at + sentinel.length));
    return out;
  }
  return out;
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
      // Block 0 is the masthead — title, bookshop, dates — which the page sets elsewhere; block 1
      // is the writing.
      intro: intro(column, 1, 1),
      statement: intro(column, 1, 1),
      participants: fromDocument(EDITION_III, readRoster(column)),
      // The first of the five is the artist's own paragraph, read from the source; the sheet's
      // other four exist nowhere else and come transcribed with their provenance stated beside
      // them.
      says: [
        ...paragraphs(column)
          .slice(1, 2)
          .map((p) => p.replace(/^<p\b[^>]*>/i, '').replace(/<\/p>$/i, '').trim())
          // The project's name, as the source sets it: in italics, with a stray asterisk and its
          // closing quote bold on its own.
          .map((p) =>
            p.replace(
              /(?:<\/?(?:em|strong)>)*‘\*?(WHAT.S COLOR\?)\s*(?:<\/?(?:em|strong)>)*‘(?:<\/?(?:em|strong)>)*/,
              '<strong class="wc-say-ask">‘$1’</strong>',
            ),
          ),
        ...SAYS_III_SHEET,
      ],
      opening: (() => {
        // Without the source's stray asterisk: ‘*WHAT’S COLOR? ‘.
        const full = paragraphs(column).slice(1, 2).map(plain).map((t) => t.replace('‘*', '‘'));
        return {
          heading: 'WHAT\u2019S COLOR (III)',
          align: 'left' as const,
          teaser: cutAt(full, 'personal relationship with color.'),
          full,
        };
      })(),
      hasAnswers: true,
    });
  }

  if (two) {
    const columns = textColumns(two.rows);
    const essay = columns[0] ?? '';
    const note = columns[1] ?? '';
    out.push({
      numeral: 'II', slug: two.slug, sourceTitle: two.title,
      // The sheet opens this column with the curators' essay, so that is what the opening view
      // shows; Claudia's own note is kept for the edition's own page rather than left unused.
      intro: intro(essay, 1),
      statement: intro(note, 1),
      participants: fromDocument(EDITION_II, readThanks(columns.join('\n'))),
      opening: (() => {
        const full = paragraphs(essay).slice(1, 8).map(plain);
        return {
          heading: 'WHAT\u2019S COLOR (II)',
          align: 'left' as const,
          teaser: cutAt(full, 'cannot be repeated today."'),
          full,
        };
      })(),
      // The six her sheet sets between the entries.
      says: [1, 3, 4, 5, 6, 7].map((i) =>
        (paragraphs(essay)[i] ?? '')
          .replace(/^<p\b[^>]*>/i, '')
          .replace(/<\/p>$/i, '')
          .trim(),
      ),
      hasAnswers: true,
    });
  }

  if (one) {
    out.push({
      numeral: 'I', slug: one.slug, sourceTitle: one.title,
      // Three paragraphs, not one: the opening sentence alone reads as a statement that was cut
      // off, and the paragraph that actually says what the project is comes third.
      intro: intro(textColumns(one.rows)[0] ?? '', 3),
      statement: intro(textColumns(one.rows)[0] ?? '', 3),
      // The glossary column, which opens with Claudia's own note before the first name;
      // `readRoster` ignores anything before a header anyway.
      participants: fromDocument(EDITION_I, readRoster(rosterColumn(one.rows))),
      // The four her sheet sets between the entries, in source order.
      says: paragraphs(textColumns(one.rows)[0] ?? '')
        .slice(0, 4)
        .map((p) => p.replace(/^<p\b[^>]*>/i, '').replace(/<\/p>$/i, '').trim()),
      opening: (() => {
        const full = paragraphs(textColumns(one.rows)[0] ?? '').slice(0, 4).map(plain);
        return {
          heading: 'WHAT\u2019S COLOR (I)',
          align: 'justify' as const,
          teaser: cutAt(full, 'but also to better understand the world.'),
          full,
        };
      })(),
      hasAnswers: true,
    });
  }

  return out;
}

/** The colour behind a participant's name, when it is hovered. */
const PAINTED: Readonly<Record<string, string>> = {
  AC001: '#dfcb6c', // Carlota Guerrero
  AC009: '#642625', // Tortell Poltrona
  AC016: '#af8385', // Albert Riera Galcerán's page; María Medem shares the code
  AC032: '#051352', // Anna Vidal
  AC035: '#183b81', // Escobedo Soliz
  AC071: '#2b0803', // Tomás López Amat and Plantea Estudio, averaged
  AC206: '#c0aa8b', // Rupi Kaur
  AC219: '#66605a', // Hanghar
  AC250: '#11151f', // Luís Cerveró
};

/** By colour name, lower-cased and without accents. */
const NAMED: Readonly<Record<string, string>> = {
  // first edition
  'powder red': '#c4706a',
  yellow: '#e6c33f',
  'natural off white': '#ece5d3',
  'soft nude': '#c0aa8b',
  'dark green': '#2f4b35',
  rouge: '#8e2a33',
  red: '#b5302a',
  'beautiful sand': '#d8c3a0',
  'green blue': '#2f7a74',
  'pompeian red': '#2b0803',
  'grey green': '#8a9a85',
  'ocher green': '#8f8a3c',
  'dark orange': '#c4581f',
  'warm red': '#c8402e',
  'deep blue': '#1f3466',
  lilac: '#b7a3c9',
  'ocher red': '#b5562f',
  orange: '#e07a2b',
  green: '#5f8a4f',
  gris: '#8d8d87',
  'blue to green': '#2f7f86',
  'ice blue': '#c9dde6',
  'deep green': '#1f4a35',
  'sand colour': '#d6c29c',
  // third edition
  'ocre amarillo': '#d1a03a',
  verde: '#5f8a4f',
  negre: '#1e1e1e',
  vainilla: '#dfcb6c',
  'azul celeste oscuro': '#5f8fb3',
  'rosa intens': '#af8385',
  azul: '#2f5ea8',
  'verde oscuro casi negro': '#1d2a20',
  amarillo: '#e6c33f',
  'azul profundo': '#11151f',
  'rosa salmon': '#e8a08a',
  fresa: '#c4455c',
  terracota: '#b5582f',
  arena: '#d6c4a3',
  'azul piscina': '#3fa3b5',
  'gris perla': '#c4c4be',
  'gris pols': '#a39f98',
  'azul plomo': '#4f6070',
  'lila magenta': '#b0577f',
  mandarina: '#e8823a',
  'blau casi verd': '#2f7a7c',
  'verde gris': '#7f9284',
  'ocre rojizo': '#b8693a',
};

/** "AC 16", "AC016" and "ac16" are one code. */
const codeKey = (code: string | undefined): string => {
  const m = code ? AC.exec(code) : null;
  return m ? `AC${m[1]!.padStart(3, '0')}` : '';
};

const colourKey = (name: string): string =>
  name.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

/** A number from a name, the same in PHP: the URL-safe id, character by character. */
const seed = (id: string): number => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return h;
};

/* ---------------------------------------------------- making a colour legible */

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toRgb = (hex: string) => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
};
const luminance = (rgb: readonly number[]) =>
  0.2126 * channel(rgb[0]!) + 0.7152 * channel(rgb[1]!) + 0.0722 * channel(rgb[2]!);
const hex2 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');

/** Which of ink or paper to set on top of a swatch. */
export function inkOn(hex: string): 'paper' | 'ink' {
  return luminance(toRgb(hex)) > 0.42 ? 'ink' : 'paper';
}

/** The same colour, dark enough to read as type on white. */
export function readable(hex: string, ratio = 4.5): string {
  const rgb = toRgb(hex);
  const max = Math.max(...rgb), min = Math.min(...rgb);
  if (1.05 / (luminance(rgb) + 0.05) >= ratio) return hex;
  for (let k = 0.95; k > 0; k -= 0.02) {
    const scaled = rgb.map((v) => v * k);
    if (1.05 / (luminance(scaled) + 0.05) >= ratio) {
      return `#${scaled.map(hex2).join('')}`;
    }
  }
  void max; void min;
  return '#242528';
}

/** The colour Claudia signed off for this person, where she has (see `whats-color-colours.ts`). */
export function finalColourFor(name: string): string | undefined {
  return FINAL.get(idFor(name));
}

export function swatchFor(p: Participant): string {
  const final = finalColourFor(p.name);
  if (final) return final;
  const painted = PAINTED[codeKey(p.code)];
  if (painted) return painted;
  const named = p.colourName ? NAMED[colourKey(p.colourName)] : undefined;
  if (named) return named;
  return hues[seed(idFor(p.name)) % hues.length] ?? '#8d8d87';
}

/** A name reduced to something that can live in a URL fragment. */
export const idFor = (name: string) =>
  `wc-${name.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

const FINAL: ReadonlyMap<string, string> = new Map(FINAL_COLOURS.map((c) => [idFor(c.name), c.hex]));

const built = build();

/** The editions entire: everyone the document names, answer or no answer. */
export const EDITIONS_ALL: readonly Edition[] = built.map((edition) => ({
  ...edition,
  participants: edition.participants.map((p) => ({ ...p, edition: edition.numeral, id: idFor(p.name) })),
}));

/**
 * Each participant stamped with the edition they came from, for linking — and
 * only those with something to read.
 */
const onPage = (p: Participant): boolean => Boolean(p.answer);

export const EDITIONS: readonly Edition[] = built.map((edition) => ({
  ...edition,
  // The roster is everyone; only those on the page get an id, because only they have an entry for
  // a name to point at.
  roster: edition.participants.map((p) =>
    onPage(p)
      ? { ...p, edition: edition.numeral, id: idFor(p.name) }
      : { ...p, edition: edition.numeral },
  ),
  participants: edition.participants
    .filter((p) => onPage(p))
    .map((p) => ({ ...p, edition: edition.numeral, id: idFor(p.name) })),
}));

/** Everyone, once, in the order the editions run. */
export function allParticipants(): readonly Participant[] {
  // Keep the fuller record where somebody answered twice: Oscar Tusquets is a bare name in edition
  // II and a colour and an answer in edition I, and it was the bare one that survived, so he
  // hovered a colour that is not his.
  const rank = (p: Participant) => (p.answer ? 2 : 0) + (p.code ? 1 : 0);
  const best = new Map<string, Participant>();
  const order: string[] = [];
  for (const edition of EDITIONS) {
    for (const p of edition.participants) {
      const key = p.name.toLocaleLowerCase();
      const held = best.get(key);
      if (!held) { order.push(key); best.set(key, p); continue; }
      if (rank(p) > rank(held)) best.set(key, p);
    }
  }
  return order.map((k) => best.get(k)!);
}
