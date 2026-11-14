import { phone } from './env.js';
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
 * ordinary threshold is the right one. A phone has no written sentence at
 * all, and no cue on that page either (04-whats-color.css).
 *
 * The class goes on the root rather than on the cue, so the stylesheet
 * decides what to do with it, and so a page that restores mid-document never
 * shows the cue at all — the first `update` runs before any scrolling of its
 * own.
 */
export function initScrollCue() {
    if (!document.querySelector('[data-scroll-cue]'))
        return;
    const root = document.documentElement;
    let gone = false;
    let threshold = () => window.innerHeight * 0.1;
    /*
     * The Colour Chart's whole page is written by the document's own scroll, so
     * the question the cue asks is answered only when the sentence stands: the
     * share of the scroll the words are spread over, which the page states.
     * It is also the moment before the line at the foot arrives, so the cue is
     * gone by the time anything else wants the bottom of the screen.
     */
    const chart = document.querySelector('[data-chart-written]');
    if (chart) {
        const written = Number.parseFloat(chart.dataset.chartWritten ?? '');
        if (Number.isFinite(written) && written > 0) {
            threshold = () => Math.max((document.documentElement.scrollHeight - window.innerHeight) * written, window.innerHeight * 0.1);
        }
    }
    const write = document.querySelector('.wc-write');
    const writing = write &&
        !phone.matches &&
        CSS.supports('animation-timeline: view()') &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (writing && write) {
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
        threshold = () => Math.max(end, window.innerHeight * 0.1);
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
}
