import { reduceMotion } from './env.ts';
import { glide } from './glide.ts';

/**
 * The Colour Chart writes its first line for you.
 *
 * The page is written by its own scroll (`components/colour-chart.ts`): it
 * stands still and a run of empty height behind it is what the reader
 * travels, a word to each slice of it. Which leaves the arrival blank, and a
 * page whose first screen says nothing until you touch it reads as a page
 * that has failed to load.
 *
 * So the page travels the first paragraph's worth of slices itself — "Color
 * has always been my inspiration: a source of knowledge, a way of life!" —
 * and stops there, with the chevron still asking for the rest.
 *
 * Nothing is written by a clock and nothing is held: the words land because
 * the scroll reached them, so the reader can take the page straight back up
 * and unwrite them, which is the whole point of writing by position rather
 * than by performance.
 *
 * `glide` gives up the moment the reader's own hand arrives — a wheel, a
 * touch, a key — so this never fights anyone for the page.
 */

/** After the page's own entrance, so the words are not written behind a veil. */
const WAIT_MS = 350;

/**
 * And fast enough that it is an opening rather than a wait. The whole first
 * paragraph over this — fourteen words, so about twelve a second — which is
 * quick enough to read as typing and slow enough to see it happen. The knob
 * if the line arrives too fast or too slowly.
 */
const TRAVEL_MS = 1200;

export function initChart(): void {
  const chart = document.querySelector<HTMLElement>('[data-chart-reveal]');
  if (!chart) return;

  // No run to travel: the page is the static one the stylesheet falls back to,
  // and every word is already standing.
  if (reduceMotion.matches || !CSS.supports('animation-timeline: scroll()')) return;

  const reveal = Number.parseFloat(chart.dataset.chartReveal ?? '');
  if (!Number.isFinite(reveal) || reveal <= 0) return;

  /*
   * Only from the top. A reload or a back-navigation restores the reader's
   * own position — with the sentence part-written, where they left it — and
   * dragging that back to the first line would be taking the page out of
   * their hands.
   */
  if (window.scrollY > 2) return;

  /*
   * On `load` rather than at once: the fonts settle the layout, and with them
   * the height of the run, so the six slices are only worth measuring after
   * the page has stopped changing shape.
   */
  const start = () => {
    if (window.scrollY > 2) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    glide(max * reveal, TRAVEL_MS);
  };

  const begin = () => window.setTimeout(start, WAIT_MS);
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
}
