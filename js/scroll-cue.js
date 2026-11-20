import { scrollWrites } from './env.js';
import { glide, topOf } from './glide.js';
import { SCROLL_SPAN } from './stack.js';
import { WRITE_MS, writtenPoint } from './write.js';
/**
 * The scroll hint goes once it has been taken.
 *
 * A cue that stays put is no longer a cue — it becomes a fixture, and on
 * these pages it would sit over the paintings and over the names for as long
 * as the reader kept going. So it leaves once its question has been answered
 * and does not come back.
 *
 * On most pages that is the first real movement — a tenth of the screen, so a
 * trackpad's smallest flick or a browser restoring a few pixels does not
 * count. On the opening page the question is longer: the film and then the
 * whole of the written sentence are one continuous "keep going", so there the
 * cue stays until the names have arrived — the write section's end, its
 * pulled-up margin included, measured once and again on resize rather than on
 * every scroll. When the sentence is already folded flat (a link arrival, no
 * scroll-run animations, motion reduced), the page is short again and the
 * ordinary threshold is the right one. A phone held upright has the written
 * sentence too, with no film before it, and the same cue over its blank
 * stage (Frank, 2026-11-15); on its side it has neither (04-whats-color.css).
 *
 * The class goes on the root rather than on the cue, so the stylesheet
 * decides what to do with it, and so a page that restores mid-document never
 * shows the cue at all — the first `update` runs before any scrolling of its
 * own.
 */
/** The tap down the Colour Chart's run: long enough to watch it type. */
const CHART_TYPE_MS = 2600;
export function initScrollCue() {
    const cue = document.querySelector('[data-scroll-cue]');
    if (!cue)
        return;
    const root = document.documentElement;
    let gone = false;
    let threshold = () => window.innerHeight * 0.1;
    // Asked at each scroll rather than once: a phone turned upright mid-page
    // starts writing, and one turned on its side stops.
    const write = document.querySelector('.wc-write');
    if (write) {
        let end = 0;
        const measure = () => {
            const pull = Number.parseFloat(getComputedStyle(write).marginBottom) || 0;
            // Not when the names first peek over the edge but when they have
            // properly risen — half a screen — so a link arrival, which lands with
            // the sentence written and the names just below, still shows the cue.
            end = write.offsetTop + write.offsetHeight + pull - window.innerHeight * 0.5;
        };
        measure();
        window.addEventListener('resize', measure);
        threshold = () => (scrollWrites() ? Math.max(end, window.innerHeight * 0.1) : window.innerHeight * 0.1);
    }
    /*
     * The Colour Chart's opening is typed by the scroll (client/chart.ts), so
     * there the cue asks until the run is spent, and a tap on it carries the
     * page down the run slowly enough to watch the words come.
     */
    const chart = document.querySelector('[data-chart]');
    const chartEnd = () => Number.parseFloat(chart?.dataset.chartEnd ?? '');
    if (chart) {
        threshold = () => {
            const end = chartEnd();
            return Number.isFinite(end) ? Math.max(end - 2, window.innerHeight * 0.1) : window.innerHeight * 0.1;
        };
    }
    /*
     * The gallery's opening is one long "keep going" too (Frank, 2026-11-20):
     * the cue asks until the scroll has laid every painting into the grid, and
     * asks again whenever the reader comes back up and they gather (below).
     * Asked at each scroll, because client/stack.ts takes the hero away on the
     * arrivals that have no opening.
     */
    if (document.querySelector('[data-stack]')) {
        threshold = () => (document.querySelector('[data-hero]')
            ? window.innerHeight * SCROLL_SPAN - 2
            : window.innerHeight * 0.1);
    }
    const update = () => {
        if (gone)
            return;
        if (window.scrollY < threshold())
            return;
        gone = true;
        root.classList.add('is-scrolled');
        window.removeEventListener('scroll', update);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    /*
     * Clicked, the cue goes where it points (Frank, 2026-11-18): on to the next
     * part of the page, by the site's own glide.
     *
     *   The start page: the sentence written first, then the names.
     *   The gallery: the pile spread into the grid.
     *   The Colour Chart: the statement typed to its end.
     *
     * Anywhere else, or past every stop, a screen further down.
     */
    cue.addEventListener('click', () => {
        const y = window.scrollY;
        const h = window.innerHeight;
        const stops = [];
        if (write) {
            const written = writtenPoint();
            if (written !== null)
                stops.push([written, WRITE_MS]);
            const names = document.getElementById('whats-color');
            if (names)
                stops.push([topOf(names)]);
        }
        else if (chart && Number.isFinite(chartEnd())) {
            stops.push([chartEnd(), CHART_TYPE_MS]);
        }
        else if (document.querySelector('[data-hero]')) {
            stops.push([h * SCROLL_SPAN]);
        }
        const next = stops.find(([at]) => at > y + h * 0.05);
        if (next)
            glide(next[0], next[1]);
        else
            glide(y + h * 0.9);
    });
    /*
     * Back on a blank stage — the menu's What's Color? takes the page back to the
     * top of the note to type it again (client/menu.ts) — the cue asks again.
     */
    const again = () => {
        if (!gone)
            return;
        gone = false;
        root.classList.remove('is-scrolled');
        window.addEventListener('scroll', update, { passive: true });
    };
    document.addEventListener('cueagain', again);
    // The gallery's paintings gathering again (client/stack.ts).
    document.addEventListener('stackrestart', again);
}
