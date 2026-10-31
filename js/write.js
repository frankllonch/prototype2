import { reduceMotion } from './env.js';
/**
 * Matches `writeOn()` in components/whats-color.ts: the words' slots end at
 * 85% of the pinned stretch, but the last word's own fade is allowed to run
 * 0.04 screens past its slot — (END + 0.04 - START) / (SCREENS - START) is
 * 0.8786 — so landing at 85% left the final words a breath short of solid.
 * This stands just past the last fade: the sentence whole, the held beat
 * still ahead, the names still to come.
 */
const WRITTEN = 0.885;
/**
 * The scroll offset at which the note stands fully written and the names have
 * yet to rise — the scene a link into the page should open on. Null when
 * there is no scene: no write section on this page, no scroll-run animations
 * in this engine, or motion reduced, in all of which the note is an ordinary
 * paragraph and the top of the roster is the place to land.
 */
export function writtenPoint() {
    const section = document.querySelector('.wc-write');
    if (!section)
        return null;
    if (!CSS.supports('animation-timeline: view()') || reduceMotion.matches)
        return null;
    const top = section.getBoundingClientRect().top + window.scrollY;
    return top + (section.offsetHeight - window.innerHeight) * WRITTEN;
}
/**
 * Arriving with the roster named in the address picks the story up mid-scene:
 * the sentence written, the names not yet risen, the cue still asking for the
 * scroll that brings them. Nothing is folded or skipped — this is the same
 * page at the same point, and scrolling in either direction behaves exactly
 * as it does for someone who read their way down.
 *
 * Only on an arrival: a reload or a back-navigation restores the reader's own
 * position, and correcting that would be taking the page out of their hands.
 */
export function initWrite() {
    if (location.hash !== '#whats-color')
        return;
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type !== 'navigate')
        return;
    const to = writtenPoint();
    if (to === null)
        return;
    window.scrollTo(0, to);
    /*
     * The browser scrolls to the anchor itself once loading settles, which
     * would land at the empty start of the scene; said again, after it.
     */
    window.addEventListener('load', () => {
        const again = writtenPoint();
        if (again !== null)
            window.scrollTo(0, again);
    }, { once: true });
}
