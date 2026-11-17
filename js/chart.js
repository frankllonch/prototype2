import { chartUpright, chartWrites, phone } from './env.js';
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
/** Order yours, the cost, the thanks: a beat apart, as About's are. */
const STAGGER_MS = 260;
export function initChart() {
    const chart = document.querySelector('[data-chart-reveal]');
    if (!chart)
        return;
    // What comes under the statement on a phone: set up whatever the screen is
    // now, since it can be turned into the scene or out of it at any time.
    const runway = chart.querySelector('.chart-runway');
    if (runway)
        arrivals(chart, runway);
    // No run to travel: the page is the static one the stylesheet falls back to,
    // and every word is already standing. On a phone that is a phone on its side
    // or a screen too squat for it (`chartWrites`, client/env.ts); held upright
    // it has a run of its own.
    if (!chartWrites())
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
        if (!chartWrites() || window.scrollY > 2)
            return;
        // A phone's run is a length of its own rather than the whole document,
        // which there carries the page's foot too (06-colour-chart.css). Its
        // runway is the words' share of the run, so the run is that over the share.
        const written = Number.parseFloat(chart.dataset.chartWritten ?? '') || 0.8;
        const max = phone.matches && runway
            ? runway.offsetHeight / written
            : document.documentElement.scrollHeight - window.innerHeight;
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
/**
 * What comes after the statement, on a phone held upright (Frank,
 * 2026-11-15): Order yours, the cost and the thanks pop in once the last word
 * stands, as they reach the screen, and go again when the reader scrolls back
 * into the writing — as the desktop's do, though not over a slice of the run.
 * client/reveal.ts leaves them to this, and they use its look (`.phone-pop`).
 *
 * If the phone is turned on its side the writing stops and the words simply
 * stand, so these do too, for good.
 */
function arrivals(chart, runway) {
    const items = [...chart.querySelectorAll('.chart-order, .chart-price, .chart-thanks')];
    // Hidden from the first frame, not faded out under the reader's eye.
    items.forEach((el, i) => {
        el.style.transition = 'none';
        el.classList.add('phone-pop');
        el.style.setProperty('--pop-delay', `${i * STAGGER_MS}ms`);
    });
    let queued = false;
    const update = () => {
        queued = false;
        // Out of the scene — a computer, a phone on its side, a squat screen —
        // they simply stand (and on a computer the class does nothing).
        if (!phone.matches || !chartWrites()) {
            for (const el of items)
                el.classList.add('is-in');
            return;
        }
        // The pin lets go as the last word stands: the runway is the words' share.
        const done = window.scrollY >= runway.offsetHeight - 1;
        for (const el of items) {
            if (!done)
                el.classList.remove('is-in');
            else if (el.getBoundingClientRect().top < window.innerHeight * 0.92)
                el.classList.add('is-in');
        }
    };
    const schedule = () => {
        if (queued)
            return;
        queued = true;
        requestAnimationFrame(update);
    };
    update();
    void chart.offsetWidth;
    for (const el of items)
        el.style.transition = '';
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    phone.addEventListener('change', schedule);
    chartUpright.addEventListener('change', schedule);
}
