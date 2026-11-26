/** Content model for the prototype. */

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
  /** For a cropped painting, the photograph it was cut from. */
  readonly original?: {
    readonly width: number;
    readonly height: number;
    readonly variants: NonNullable<ProjectImage['variants']>;
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
 * `work` — a single painting (WordPress `portfolio` post type) `project` — a
 * collaboration / commission (WordPress page under /projects/) `page` — a
 * long-form page (About, Color Chart, Exhibitions)
 */
export type ProjectKind = 'work' | 'project' | 'page' | 'show';

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
