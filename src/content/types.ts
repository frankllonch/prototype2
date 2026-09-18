/**
 * Content model for the prototype.
 *
 * It is deliberately shaped around what claudiavalsells.com *actually* holds, not
 * around an idealised portfolio schema. The live site is WordPress running the
 * "Koncept" theme, whose editor stores a page body as a stack of rows, each row
 * split into 12-column-grid containers holding either images or rich text.
 * We preserve that structure verbatim so Claudia's own layout decisions
 * (three images side by side, then a full-width text block) survive the redesign.
 *
 * Every field beyond `slug`/`title`/`kind` is optional: if the source page does
 * not carry a piece of metadata, it is absent here rather than invented.
 */

/** Width of a column on the source site's 12-column grid. */
export type ColumnSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** One rendered size of an image, produced by the build-time image pipeline. */
interface ImageVariant {
  readonly width: number;
  readonly url: string;
}

export interface ProjectImage {
  /** Stable id derived from the source URL; also the on-disk basename. */
  readonly id: string;
  /** Original remote URL, kept for provenance and re-fetching. */
  readonly source: string;
  readonly alt: string;
  readonly caption?: string;
  readonly width: number;
  readonly height: number;
  /** Populated by `scripts/images.ts`. Absent until the pipeline has run. */
  readonly variants?: {
    readonly avif: readonly ImageVariant[];
    readonly webp: readonly ImageVariant[];
    /** Largest JPEG, used as the <img src> fallback. */
    readonly fallback: string;
  };
}

/** A column within a row: either rich text or a run of images, never both. */
export type Column =
  | { readonly kind: 'text'; readonly span: ColumnSpan; readonly html: string }
  | { readonly kind: 'images'; readonly span: ColumnSpan; readonly images: readonly ProjectImage[] };

export interface Row {
  readonly columns: readonly Column[];
}

export interface ProjectMetadata {
  /** ISO date of publication on the source site. */
  readonly date?: string;
  readonly year?: number;
  /** Claudia's own inventory reference, e.g. "L585" (L/M/S = large/medium/small). */
  readonly reference?: string;
  readonly dimensions?: string;
  readonly materials?: string;
  readonly location?: string;
  readonly client?: string;
  readonly credits?: readonly string[];
  readonly categories?: readonly string[];
  readonly available?: boolean;
}

/**
 * `work`    — a single painting (WordPress `portfolio` post type)
 * `project` — a collaboration / commission (WordPress page under /projects/)
 * `page`    — a long-form page (About, Colour Chart, Exhibitions)
 */
export type ProjectKind = 'work' | 'project' | 'page';

export interface Project {
  readonly slug: string;
  readonly kind: ProjectKind;
  readonly title: string;
  /** URL this record was extracted from. */
  readonly sourceUrl: string;
  /** Plain-text lede, taken from the first text block. Not always present. */
  readonly description?: string;
  /** Full body, preserving the source site's row/column composition. */
  readonly rows: readonly Row[];
  /** First image of the body, used as the gallery thumbnail. */
  readonly cover?: ProjectImage;
  /** Every image in the body, in document order, de-duplicated. */
  readonly images: readonly ProjectImage[];
  readonly metadata: ProjectMetadata;
}

export interface Dataset {
  readonly extractedAt: string;
  readonly sourceSite: string;
  readonly projects: readonly Project[];
}
