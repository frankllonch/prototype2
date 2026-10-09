/**
 * Derived sections.
 *
 * The source site's Exhibitions page is six exhibitions run together in one
 * body. They are split here — from the extracted content, never by retyping it.
 *
 * (The source About page — biography, collections, CV — is in the dataset too,
 * untouched; the About overlay currently shows the designer's short version.)
 */
import type { Project, ProjectImage, Row } from './types.ts';

export interface Exhibition {
  readonly slug: string;
  readonly title: string;
  readonly year?: number;
  /** Everything belonging to this exhibition, in source order. */
  readonly rows: readonly Row[];
  readonly images: readonly ProjectImage[];
  readonly cover?: ProjectImage;
  /** Plain-text standfirst for the index card. */
  readonly summary: string;
  /** Where it was shown, as the source writes it. */
  readonly venue?: string;
  /** When, as two months or one. */
  readonly from?: string;
  readonly to?: string;
  /** "Solo show" / "Group show", where the source says so. */
  readonly kind?: string;
}

const strip = (html: string): string =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'exhibition';

/**
 * A row starts a new exhibition when its text opens with a `<strong>` title *and*
 * the row carries a year. The first test alone would also catch sub-headings like
 * "COLOR GLOSSARY", which belong to the exhibition above them; requiring a date is
 * what separates an exhibition from a heading inside one.
 */
function exhibitionTitleOf(row: Row): string | null {
  const text = row.columns.find((c) => c.kind === 'text');
  if (!text || text.kind !== 'text') return null;

  const opening = /^\s*<(?:p|div)[^>]*>\s*(?:<(?:span|em|i)[^>]*>\s*)*['’‘"]?\s*<strong[^>]*>(.*?)<\/strong>/is.exec(text.html);
  if (!opening) return null;
  if (!/\b(?:19|20)\d{2}\b/.test(strip(text.html))) return null;

  // Order matters: strip the full stop before the closing quote, or the quote is
  // no longer at the end and survives.
  const title = strip(opening[1]!)
    // A couple of titles type the apostrophe as a combining acute: "What ́s".
    .replace(/\s*\u0301\s*/g, '’')
    .replace(/[.,;]+\s*$/, '')
    .replace(/^['’‘"]+|['’‘"]+$/g, '')
    // "What’s color?’ ( I )" — a stray closing quote before the edition number.
    .replace(/['’‘"]\s*(?=\()/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return title || null;
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;
/** Written as "sept" and "dec" as often as in full. */
const MONTH_RE = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

/** "sept" → "September"; a bare number from "12/2021" → "December". */
function monthName(raw: string): string | undefined {
  const digits = /^\d{1,2}$/.exec(raw.trim());
  if (digits) return MONTHS[Number(raw) - 1] ? titleCase(MONTHS[Number(raw) - 1]!) : undefined;
  const found = MONTHS.find((m) => m.startsWith(raw.trim().slice(0, 3).toLowerCase()));
  return found ? titleCase(found) : undefined;
}

/**
 * When and where, read out of the exhibition's own opening lines.
 *
 * Every one of the six writes this differently — "from May 27 to June 20, 2026",
 * "APRIL to JUNE 2025", "Solo show at Alzueta Gallery, Barcelona, sept 2023",
 * "Solo show december 2020 at ALZUETA GALLERY / BARCELONA", "12/2021 to 01/2022"
 * — so this reads the patterns rather than assuming one. Anything it cannot read
 * is left undefined and simply not shown, which is the right failure: a date
 * guessed wrong is worse on a gallery's page than a date absent.
 *
 * Derived, never retyped. If the source is corrected, so is this.
 */
function datesOf(body: string): { from?: string; to?: string } {
  const text = body.replace(/\s+/g, ' ');

  /*
   * `(?!\d)` after the day is what keeps a year from being read as one. "APRIL to
   * JUNE 2025" would otherwise give "June 20", because two digits of 2025 match a
   * day perfectly well — a show would be given a date it never had.
   */
  const day = '(?:(\\d{1,2})(?!\\d))?';
  const range = new RegExp(
    `\\b(?:from\\s+)?(${MONTH_RE})\\s*${day}\\s*(?:to|–|—|-)\\s*(${MONTH_RE})\\s*${day}`, 'i',
  ).exec(text);
  if (range) {
    const a = monthName(range[1]!), b = monthName(range[3]!);
    if (a && b) {
      const from = range[2] ? `${a} ${range[2]}` : a;
      const to = range[4] ? `${b} ${range[4]}` : b;
      return from === to ? { from } : { from, to };
    }
  }

  /*
   * "12/2021 to 01/2022". Both years are kept, because this is the one run of the
   * six that crosses a new year: months alone render as "December to January"
   * under a single year in the margin, which reads backwards and states a date the
   * source does not.
   */
  const numeric = /\b(\d{1,2})\/((?:19|20)\d{2})\s*(?:to|–|—|-)\s*(\d{1,2})\/((?:19|20)\d{2})/.exec(text);
  if (numeric) {
    const a = monthName(numeric[1]!), b = monthName(numeric[3]!);
    if (a && b) {
      return numeric[2] === numeric[4]
        ? { from: a, to: b }
        : { from: `${a} ${numeric[2]}`, to: `${b} ${numeric[4]}` };
    }
  }

  const single = new RegExp(`\\b(${MONTH_RE})\\b`, 'i').exec(text);
  const only = single ? monthName(single[1]!) : undefined;
  return only ? { from: only } : {};
}

/** "Solo show", "Group show" — stated by five of the six, and worth keeping. */
function kindOf(body: string): string | undefined {
  const found = /\b(solo|group)\s+show\b/i.exec(body);
  return found ? `${titleCase(found[1]!)} show` : undefined;
}

/**
 * The place, taken from the line that names it. "Solo show at X", "at X", or a
 * street address — trimmed at the first full stop or date so a whole press
 * release does not end up in the index.
 */
function venueOf(body: string, title: string): string | undefined {
  const text = body.replace(/\s+/g, ' ').replace(title, ' ').replace(/\s+/g, ' ').trim();

  /**
   * A place is a short list of short names. Keeping the pieces and dropping the
   * rest is what separates "Alzueta Gallery, Palau de Casavells" from the clause
   * that follows it in the same sentence — "Alzueta Gallery's countryside space"
   * — without needing to know anything about either.
   */
  const tidy = (raw: string): string | undefined => {
    const parts: string[] = [];
    for (const piece of raw.split(/\s*[,/]\s*/)) {
      const part = piece.replace(/\s+/g, ' ').trim().replace(/^[-–—]+|[-–—]+$/g, '');
      if (!part || part.length > 40 || !/[a-z]/i.test(part)) continue;
      // "Alzueta Gallery Madrid, MADRID" says Madrid twice.
      if (parts.some((p) => p.toLowerCase().includes(part.toLowerCase()))) continue;
      parts.push(part);
      if (parts.length === 3) break;
    }
    const venue = parts.join(', ');
    return venue.length >= 4 ? venue : undefined;
  };

  // A street address first: the generic "at …" would otherwise catch the second,
  // looser mention later in the same press release.
  const street = /\b(\d+\s+(?:rue|carrer|calle|c\/|via|street)[^,.]*),\s*([A-ZÀ-Þ][a-zà-ÿ'’-]+)/i.exec(text);
  if (street) return tidy(`${street[1]}, ${street[2]}`);

  const stop = `(?:\\bfrom\\b|\\bin the\\b|\\b${MONTH_RE}\\b|\\b(?:19|20)\\d{2}\\b|\\.|$)`;
  for (const pattern of [
    new RegExp(`\\b(?:solo|group)\\s+show\\s+(?:at\\s+)?([^.]*?)(?=\\s*${stop})`, 'i'),
    new RegExp(`\\bat\\s+([^.]*?)(?=\\s*${stop})`, 'i'),
  ]) {
    const found = pattern.exec(text)?.[1];
    const venue = found && tidy(found);
    if (venue) return venue;
  }
  return undefined;
}

/**
 * The first top-level element of a fragment, and what follows it.
 *
 * Counts its own opening and closing tags rather than matching to the first
 * `</p>`: the source nests divs, and a non-greedy match closes at the wrong one
 * and leaves unbalanced markup that swallows the next sibling whole. That is
 * exactly how the About page lost its photographs once already.
 */
export function firstBlock(html: string): { block: string; rest: string } | null {
  const open = /^\s*<([a-z][\w-]*)\b[^>]*>/i.exec(html);
  if (!open) return null;
  const name = open[1]!.toLowerCase();
  if (!['p', 'div', 'h1', 'h2', 'h3', 'h4'].includes(name)) return null;

  const tag = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi');
  tag.lastIndex = open.index + open[0].length;
  let depth = 1;
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) {
      const end = m.index + m[0].length;
      return { block: html.slice(0, end), rest: html.slice(end) };
    }
  }
  return null;
}

/** Words that carry no fact, so their absence from the restatement proves nothing. */
const FILLER = new Set([
  'a', 'an', 'and', 'at', 'by', 'de', 'des', 'el', 'en', 'for', 'from', 'in', 'is', 'la', 'of',
  'on', 'or', 'the', 'to', 'with', 's',
]);

/**
 * Every fact a block states, as bare tokens.
 *
 * Numeric months are written out first, so "12/2021" and "December 2021" are
 * recognised as the same statement, and abbreviations are expanded for the same
 * reason — "sept" is September.
 */
function facts(value: string): string[] {
  const expanded = strip(value)
    .replace(/\b(\d{1,2})\/((?:19|20)\d{2})\b/g, (_, m: string, y: string) => `${monthName(m) ?? m} ${y}`)
    .replace(new RegExp(`\\b(${MONTH_RE})\\b`, 'gi'), (m) => monthName(m) ?? m);
  return [...new Set(
    expanded.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
      .filter((word) => word && !FILLER.has(word)),
  )];
}

/**
 * Drops the masthead the source repeats at the top of each exhibition — its
 * title, its address, its dates — now that the panel states those itself.
 *
 * It must *prove* that before removing anything. A block goes only when every
 * fact in it is still said somewhere the reader can see: by the panel's own
 * header, or by the prose that remains. Anything else stays, and the page says it
 * twice.
 *
 * This is the rule, not a precaution. Deciding by shape instead — short block,
 * looks like a date — is what quietly took "May 27 to June 20" off Moll de l'os
 * and left "December to January 2021" standing for a show that ran into 2022.
 * Saying something twice is untidy; dropping it is wrong, and tidiness is not
 * worth a date this gallery never gave.
 */
function stripMasthead(html: string, restated: string): string {
  let rest = html;

  for (let dropped = 0; dropped < 4; dropped++) {
    const split = firstBlock(rest);
    if (!split) break;

    const stated = split.block.replace(/<[^>]+>/g, ' ').trim();
    if (!stated) { rest = split.rest; continue; }   // an empty wrapper

    const kept = new Set([...facts(restated), ...facts(split.rest)]);
    if (!facts(split.block).every((fact) => kept.has(fact))) break;
    rest = split.rest;
  }

  return rest.trim() ? rest : html;
}

export function splitExhibitions(page: Project | undefined): readonly Exhibition[] {
  if (!page) return [];

  // Group as: every row up to and including the next title row belongs together —
  // the source puts an exhibition's photographs *before* the text describing them.
  const starts: number[] = [];
  page.rows.forEach((row, i) => {
    if (exhibitionTitleOf(row)) starts.push(i);
  });
  if (!starts.length) return [];

  const isImageRow = (row: Row) => row.columns.every((c) => c.kind === 'images');

  const exhibitions: Exhibition[] = [];
  let from = 0;

  starts.forEach((titleIndex, n) => {
    const nextTitle = starts[n + 1];
    /*
     * An exhibition ends *before* the run of photographs that introduces the next
     * one. Cutting at the next title instead would hand every exhibition's lead
     * images to the exhibition above it — the source lays each one out as
     * photographs first, then the text describing them.
     */
    let end = page.rows.length - 1;
    if (nextTitle !== undefined) {
      let j = nextTitle - 1;
      while (j > titleIndex && isImageRow(page.rows[j]!)) j--;
      end = j;
    }
    const rows = page.rows.slice(from, end + 1);
    from = end + 1;

    const title = exhibitionTitleOf(page.rows[titleIndex]!)!;
    const text = rows.flatMap((r) => r.columns).filter((c) => c.kind === 'text');
    const body = text.map((c) => strip(c.html)).join(' ');
    const year = /\b((?:19|20)\d{2})\b/.exec(body)?.[1];
    const images = rows.flatMap((r) =>
      r.columns.flatMap((c) => (c.kind === 'images' ? [...c.images] : [])),
    );
    const venue = venueOf(body.slice(0, 300), title);
    const when = datesOf(body.slice(0, 300));
    const kind = kindOf(body.slice(0, 300));

    // Everything the panel will state in its own hand. The masthead may only be
    // taken off the prose where it says nothing this does not.
    const restated = [title, venue, kind, when.from, when.to, year].filter(Boolean).join(' ');

    let mastheadGone = false;
    const prose: Row[] = rows.map((r) => ({
      ...r,
      columns: r.columns.map((c) => {
        if (c.kind !== 'text' || mastheadGone) return c;
        mastheadGone = true;
        return { ...c, html: stripMasthead(c.html, restated) };
      }),
    }));

    exhibitions.push({
      slug: slugify(title),
      title,
      ...(year ? { year: Number(year) } : {}),
      rows: prose,
      images,
      ...(images[0] ? { cover: images[0] } : {}),
      summary: body.slice(0, 260),
      // Read from the opening of the text, where every one of them states it.
      ...when,
      ...(venue ? { venue } : {}),
      ...(kind ? { kind } : {}),
    });
  });

  return exhibitions;
}
