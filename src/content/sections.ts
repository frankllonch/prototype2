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

    exhibitions.push({
      slug: slugify(title),
      title,
      ...(year ? { year: Number(year) } : {}),
      rows,
      images,
      ...(images[0] ? { cover: images[0] } : {}),
      summary: body.slice(0, 260),
    });
  });

  return exhibitions;
}
