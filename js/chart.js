import { phone, reduceMotion } from './env.js';
import { glide } from './glide.js';
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
export function initChart() {
    const chart = document.querySelector('[data-chart-reveal]');
    if (!chart)
        return;
    // No run to travel: the page is the static one the stylesheet falls back to,
    // and every word is already standing. On a phone it always is — the sheet
    // there is a page taller than the screen, and travelling a share of *that*
    // would be scrolling the reader down a page they have not begun.
    const written = () => !phone.matches && !reduceMotion.matches && CSS.supports('animation-timeline: scroll()');
    if (!written())
        return;
    const reveal = Number.parseFloat(chart.dataset.chartReveal ?? '');
    if (!Number.isFinite(reveal) || reveal <= 0)
        return;
    /*
     * Only from the top. A reload or a back-navigation restores the reader's
     * own position — with the sentence part-written, where they left it — and
     * dragging that back to the first line would be taking the page out of
     * their hands.
     */
    if (window.scrollY > 2)
        return;
    /*
     * On `load` rather than at once: the fonts settle the layout, and with them
     * the height of the run, so the six slices are only worth measuring after
     * the page has stopped changing shape.
     */
    const start = () => {
        // Asked again: this runs after `load`, and a window can have been made
        // narrow, or a phone turned, in between.
        if (!written() || window.scrollY > 2)
            return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max <= 0)
            return;
        glide(max * reveal, TRAVEL_MS);
    };
    const begin = () => window.setTimeout(start, WAIT_MS);
    if (document.readyState === 'complete')
        begin();
    else
        window.addEventListener('load', begin, { once: true });
}
