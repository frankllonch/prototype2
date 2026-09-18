import { html, type Html } from './html.ts';
import type { ProjectImage } from '../content/types.ts';

interface ImageProps {
  readonly image: ProjectImage;
  /** The `sizes` attribute. Get this right or the browser over-fetches. */
  readonly sizes: string;
  /** Above-the-fold images load eagerly; everything else is lazy. */
  readonly priority?: boolean;
  readonly className?: string;
  /**
   * Overrides the source alt text. Not one image on the current site has an alt
   * attribute, so callers that know the artwork supply a factual description
   * built from its own metadata rather than leaving 370 images unnamed.
   */
  readonly alt?: string;
}

const srcset = (variants: readonly { width: number; url: string }[]) =>
  variants.map((v) => `${v.url} ${v.width}w`).join(', ');

/**
 * Responsive `<picture>` with AVIF → WebP → JPEG fallbacks.
 *
 * `aspect-ratio` is always set from the measured intrinsic size so the grid holds
 * its shape before any bytes arrive: the page never reflows as images load.
 */
export function responsiveImage({ image, sizes, priority = false, className, alt }: ImageProps): Html {
  const ratio = image.width && image.height ? `${image.width} / ${image.height}` : '3 / 4';
  const altText = alt ?? image.alt;

  if (!image.variants) {
    // No rendered variants (the pipeline has not run, or the source 404'd).
    return html`<img
      class="${className ?? ''}" src="${image.source}" alt="${altText}"
      style="aspect-ratio:${ratio}" loading="lazy" decoding="async" />`;
  }

  const { avif, webp, fallback } = image.variants;
  return html`<picture class="${className ?? ''}">
      <source type="image/avif" srcset="${srcset(avif)}" sizes="${sizes}" />
      <source type="image/webp" srcset="${srcset(webp)}" sizes="${sizes}" />
      <img
        src="${fallback}"
        alt="${altText}"
        width="${image.width}"
        height="${image.height}"
        style="aspect-ratio:${ratio}"
        loading="${priority ? 'eager' : 'lazy'}"
        ${priority ? html`fetchpriority="high"` : html`decoding="async"`}
      />
    </picture>`;
}

/** Aspect ratio as a number, used by the gallery's row-packing maths. */
export const aspectOf = (image: ProjectImage): number =>
  image.width && image.height ? image.width / image.height : 0.75;
