import type { Project } from './types.ts';

/**
 * A painting's caption as Claudia wrote it on her own site, line for line and
 * in her order — "L569, 205X160cm" then "Acrylic on canvas", or "Mixed media
 * on canvas, 73X63 cm" then "M499, 2022". The order she gives the facts in is
 * hers to keep (Frank, 2026-11-16), so nothing here reorders or reformats:
 * the first text block of the work's page, a line per paragraph or break.
 * Empty when the page had no words.
 */
export function captionLines(work: Project): string[] {
  for (const row of work.rows) {
    for (const column of row.columns) {
      if (column.kind !== 'text' || !column.html) continue;
      const lines = column.html
        .split(/<\/p>|<br\s*\/?>/i)
        .map((part) =>
          part
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&#8217;/g, '’')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .filter(Boolean);
      if (lines.length) return lines;
    }
  }
  return [];
}

/**
 * A painting's reference. The extractor reads it in capitals ("L569"); a few
 * of Claudia's captions type it in lower case ("l581, CV 2026, …"), so a
 * caption that opens on one is read too, and set in capitals.
 */
export function referenceOf(work: Project): string | undefined {
  if (work.metadata.reference) return work.metadata.reference;
  const first = captionLines(work)[0] ?? '';
  return /^([a-z]{1,3}\d{2,4})\b/i.exec(first)?.[1]?.toUpperCase();
}
