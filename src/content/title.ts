
import type { ProjectKind } from './types.ts';

/**
 * Presentation titles.
 *
 * The source site stores painting titles as shouty strings with the metadata
 * baked in — `UNTITLED 2026, 162X130CM` — because the WordPress theme had
 * nowhere else to put dimensions. Here the year, dimensions and medium have
 * their own typed fields, so the title can go back to being just a title.
 *
 * This only re-cases and trims what is already there; the untouched original
 * stays on `project.title` for provenance and is what the extractor writes.
 *
 *   UNTITLED 2026, 162X130CM      -> Untitled / Sense títol
 *   COLOR DIALGOGUES IV, 2021     -> Color Dialgogues IV   (sic — see DISCOVERY.md)
 *   ‘’Terra Rossa’’ 2024          -> Terra Rossa
 *   Mira’m, no deixis de mirar-me -> Mira’m, no deixis de mirar-me
 */

/** Words that stay lowercase inside a title, and initialisms that stay upper. */
const MINOR = new Set(['a', 'an', 'and', 'de', 'del', 'for', 'in', 'la', 'of', 'on', 'or', 'the', 'to']);
const KEEP_UPPER = /^(?:[IVXLC]+|RBTA|AOO|[A-Z]{1,3}\d+)$/;

const titleCaseWord = (word: string, index: number): string => {
  if (KEEP_UPPER.test(word)) return word;
  const lower = word.toLowerCase();
  if (index > 0 && MINOR.has(lower)) return lower;
  return lower.replace(/^\p{L}/u, (c) => c.toUpperCase());
};

/** True when a string carries no lowercase letters, i.e. it was typed in caps. */
const isShouting = (value: string): boolean => value === value.toUpperCase() && /\p{Lu}/u.test(value);

export function displayTitle(
  rawTitle: string,
  kind: ProjectKind,
): string {
  let title = rawTitle.replace(/[‘’'"“”]{2}/g, '').trim();

  if (kind === 'work') {
    // Dimensions live in metadata now; strip them from the title.
    title = title.replace(/[,\s]*\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\.?$/i, '');
  }

  if (kind !== 'page') {
    // A lone trailing year is shown in its own column everywhere it matters.
    // A range ("2019-2020", "2023-on going") is part of the title and stays.
    title = title.replace(/[,\s]+(?:19|20)\d{2}$/, '');
  }

  title = title.replace(/^[\s'"·/,;]+|[\s'"·/,;]+$/g, '').trim();

  if (isShouting(title)) {
    title = title.split(/\s+/).map(titleCaseWord).join(' ');
  }

  return title || 'Untitled';
}
