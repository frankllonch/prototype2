import type { Project } from './types.ts';

/**
 * A painting's caption as Claudia wrote it on her own site, line for line —
 * the first text block of the work's page, a line per paragraph or break.
 * Empty when the page had no words. Some carry more than the facts (a show it
 * hung in, a note on the exhibition), so it is read for them by
 * `captionFacts` rather than shown as it stands.
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

/**
 * The collection code Claudia gives some works, "CV2024" — the catalogue the
 * piece belongs to. Typed every way in her captions ("CV 2024", "cv2026",
 * "Cv 2026"); set here one way.
 */
export function collectionOf(work: Project): string | undefined {
  const year = /\bcv\s?((?:19|20)\d{2})\b/i.exec(captionLines(work).join(' '))?.[1];
  return year ? `CV${year}` : undefined;
}

/** The technique as she names it in English ("Mixed media on canvas"). */
const TECHNIQUE = /\b(mixed media|mix media|mixed technique|acrylic paint|acrylic|oil|collage and gouache|gouache and collage|goauche and collage|gouache|goauche)\s+on\s+(canvas|linen|paper)\b/i;

export function techniqueOf(work: Project): string | undefined {
  const found = TECHNIQUE.exec(captionLines(work).join('\n'));
  if (found) {
    const said = `${found[1]} on ${found[2]}`.toLowerCase()
      .replace(/^mix media/, 'mixed media')
      .replace(/goauche/, 'gouache');
    return said[0]!.toUpperCase() + said.slice(1);
  }
  // Without one in the caption, the extractor's reading — unless it caught
  // a Spanish sentence ("Gouache sobre papel la componen").
  const materials = work.metadata.materials;
  return materials && !/\bsobre\b/i.test(materials) ? materials : undefined;
}

/** Its size, always with its unit: a few were read as "100 × 80". */
export function sizeOf(work: Project): string | undefined {
  const size = work.metadata.dimensions;
  return size && /\d$/.test(size) ? `${size} cm` : size;
}

/**
 * What a painting's label says (Frank, 2026-11-17): its reference, with the
 * collection code when it has one, then its size, then its technique — and
 * nothing else, whatever else the caption on her page goes on to say.
 */
export function captionFacts(work: Project): string[] {
  const head = [referenceOf(work), collectionOf(work)].filter(Boolean).join(', ');
  return [head, sizeOf(work) ?? '', techniqueOf(work) ?? ''].filter(Boolean);
}
