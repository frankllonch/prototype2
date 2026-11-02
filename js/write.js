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
 *
 * The browser makes its own jump to the anchor, and when it makes it is its
 * own business: Chromium before `load`, Safari some while after — which, with
 * one correction at `load`, left Safari readers at the top of the section with
 * the sentence not yet begun. So the landing is held rather than made once:
 * for a short while after arrival, wherever the page has been put, it is put
 * back on the written point — at `load`, when the fonts have settled the
 * layout, on a few beats after, and on any scroll that the reader did not
 * make. The reader's first wheel, touch, key or press ends the hold, so it
 * never pulls against a hand.
 */
const HOLD_MS = 1800;
export function initWrite() {
    // Whatever happens below, the page is uncovered once this has run: the head
    // holds it under the veil only until the landing has been made (00-base.css).
    const uncover = () => document.documentElement.classList.remove('wc-arriving');
    if (location.hash !== '#whats-color')
        return uncover();
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type !== 'navigate')
        return uncover();
    if (writtenPoint() === null)
        return uncover();
    let held = true;
    const release = () => {
        held = false;
        window.removeEventListener('scroll', land);
    };
    const land = () => {
        if (!held)
            return;
        const to = writtenPoint();
        if (to !== null && Math.abs(window.scrollY - to) > 1)
            window.scrollTo(0, to);
    };
    for (const kind of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
        window.addEventListener(kind, release, { passive: true, once: true });
    }
    window.addEventListener('scroll', land, { passive: true });
    land();
    // The bar's place depends on the film's state, which the film module reads
    // off the scroll — but the scroll event for this move only arrives with the
    // next frame. Said now, so the bar is already in its settled state when the
    // arrival hold lifts, and never steps back to the film's middle line.
    window.dispatchEvent(new Event('scroll'));
    uncover();
    void document.fonts?.ready.then(land);
    const settle = () => {
        land();
        for (const ms of [60, 180, 400, 800, 1300])
            window.setTimeout(land, ms);
        window.setTimeout(release, HOLD_MS);
    };
    if (document.readyState === 'complete')
        settle();
    else
        window.addEventListener('load', settle, { once: true });
}
