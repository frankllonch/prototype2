
import type { Project, ProjectKind } from './types.ts';
import { referenceOf, sizeOf } from './caption.ts';

/** Presentation titles. */

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
    title = title.replace(/[,\s]+(?:19|20)\d{2}$/, '');
  }

  title = title.replace(/^[\s'"·/,;]+|[\s'"·/,;]+$/g, '').trim();

  if (isShouting(title)) {
    title = title.split(/\s+/).map(titleCaseWord).join(' ');
  }

  return title || 'Untitled';
}

/**
 * A painting's name on the site: its reference — Claudia's own inventory number,
 * "L569" — when it has one, since that is what she calls it.
 */
export function workTitle(work: Project): string {
  const reference = referenceOf(work);
  if (reference) return reference;
  const name = displayTitle(work.title, 'work');
  // Some of the old pages are named by what they are made of ("Gouache on paper 65x55cm (4)",
  // "Recent Works 2017"), which is no more a name than "Untitled" is: those go the same way.
  if (!/^(?:untitled$|acrylic|gouache|goauche|collage|mixed|oil\b|(?:recent )?works\b)/i.test(name)) return name;
  return sizeOf(work) || name;
}
