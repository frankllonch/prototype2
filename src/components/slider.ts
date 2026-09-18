import { html, join, type Html } from './html.ts';
import { responsiveImage } from './image.ts';
import type { ProjectImage } from '../content/types.ts';

interface SliderProps {
  readonly images: readonly ProjectImage[];
  /** Counter template, e.g. "{n} of {total}". */
  readonly counter: string;
  readonly previous: string;
  readonly next: string;
}

/**
 * A horizontal slide-through of photographs. One row, every image at the same
 * height so widths follow the pictures, each snapping to the centre of the
 * viewport. Wheel, drag, arrow keys and the buttons all move it; without
 * scripting it is an ordinary horizontally scrollable row.
 */
export function slider({ images, counter, previous, next }: SliderProps): Html {
  if (!images.length) return html``;
  return html`<div class="slider" data-slider>
    <div class="slider-track" data-slider-track tabindex="0" aria-label="${images.length} photographs">
      ${join(
        images.map(
          (image, i) => html`<figure class="slide" data-slide>
            ${responsiveImage({ image, sizes: '(max-width: 900px) 90vw, 60vh', priority: i < 2 })}
            ${image.caption ? html`<figcaption>${image.caption}</figcaption>` : ''}
          </figure>`,
        ),
      )}
    </div>
    <div class="slider-bar">
      <button type="button" class="slider-nav" data-slider-prev aria-label="${previous}">←</button>
      <span class="slider-count" data-slider-count data-template="${counter}"></span>
      <button type="button" class="slider-nav" data-slider-next aria-label="${next}">→</button>
    </div>
  </div>`;
}
