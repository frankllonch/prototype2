import { isPlainClick, reduceMotion } from './env.js';
/**
 * Moving between pages, and the loading screen that precedes the first one.
 *
 * Arriving is handled in CSS — a sheet of paper over the page, fading off — so it
 * needs nothing from here and cannot be broken by this file failing to load.
 * Leaving is the part that needs script: a browser navigates the instant a link
 * is clicked, so the only way to fade the old page out is to hold the navigation
 * back for the length of the fade and then go.
 *
 * This replaced `@view-transition`, which never ran. Cross-document view
 * transitions are skipped silently wherever they are unimplemented and cannot be
 * feature-detected, so there was no way to tell the difference between a browser
 * that did not support them and a site that had them wrong.
 */
const OUT_MS = 420;
/** Never hold a navigation longer than this, whatever the timer does. */
const LEAVE_GUARD = 700;
/** If the navigation has not happened by now, assume it never will. */
const ABANDONED = 6000;
/**
 * When to stop trusting the entrance animations and simply show the page.
 *
 * Comfortably past the longest of them (0.1 + 0.9), so in the ordinary case the
 * animations have finished and this changes nothing visible. It exists for the
 * case where they never advance at all — a document whose animation timeline has
 * not started, which is what a tab loaded in the background is — where without it
 * a perfectly loaded page sits behind an opaque sheet with its content at zero
 * opacity, looking for all the world as though it failed to load.
 */
const REVEAL_GUARD = 1600;
export function initTransitions() {
    loader();
    const root = document.documentElement;
    /**
     * One departure at a time, held here rather than per click.
     *
     * Clicking a second link during the fade has to change where we are going, not
     * queue a second navigation behind the first: the first one's timer fires
     * earlier, the document unloads, and the later click is discarded without
     * trace. Changing the destination instead means the last thing you clicked is
     * the one you get.
     */
    let target = '';
    let gone = false;
    const go = () => { if (!gone && target) {
        gone = true;
        location.href = target;
    } };
    /**
     * Back-button navigations restore the page from the back/forward cache exactly
     * as it was left — including, on the page we faded out to leave, the class
     * that faded it and the departure that was in flight. Without this, going back
     * lands under an opaque sheet with every link already spoken for.
     */
    const arrive = () => { root.classList.remove('is-leaving'); target = ''; gone = false; };
    window.addEventListener('pageshow', arrive);
    window.addEventListener('popstate', arrive);
    arrive();
    // Armed before anything else can fail: whatever happens below, the page shows.
    window.setTimeout(() => root.classList.add('is-revealed'), REVEAL_GUARD);
    if (reduceMotion.matches)
        return;
    document.addEventListener('click', (event) => {
        // Anything already handled — a tile opening the lightbox, a link raising a
        // panel — has called preventDefault by the time this reaches the document,
        // and is not a navigation at all.
        if (event.defaultPrevented || !isPlainClick(event))
            return;
        const link = event.target?.closest('a[href]');
        if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self'))
            return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin)
            return;
        // A link to somewhere on this same page is a jump, not a departure.
        if (url.pathname === location.pathname && url.search === location.search)
            return;
        event.preventDefault();
        const first = !target;
        target = url.href;
        root.classList.add('is-leaving');
        if (!first)
            return; // already counting down; only the destination changed
        window.setTimeout(go, OUT_MS);
        // A tab backgrounded mid-fade may never run the first timer; the guard is
        // what stops a click from being swallowed entirely.
        window.setTimeout(go, LEAVE_GUARD);
        /*
         * And if the navigation never commits at all — the load is stopped, or the
         * URL turns out to be something the browser downloads rather than opens —
         * this document stays, and must not stay behind an opaque sheet. Taking the
         * class off runs the veil's entrance again, so the page fades back rather
         * than snapping.
         */
        window.setTimeout(() => { if (!document.hidden)
            arrive(); }, ABANDONED);
    });
}
/**
 * The loading screen goes as soon as the page has loaded — but not before it has
 * been on screen long enough to be seen. A static site on a warm cache loads in
 * a few hundred milliseconds, which would show the colour turning perhaps once
 * and read as a flash of the wrong page rather than as an opening.
 *
 * If this never runs, the stylesheet takes the screen away on a delay anyway.
 */
const MIN_DWELL = 1600;
function loader() {
    const el = document.querySelector('[data-loader]');
    if (!el)
        return;
    // One per session: it belongs to arriving at the site, not to every page of it.
    // The reading is done by the inline script in the head, which has to decide
    // before anything is painted.
    try {
        sessionStorage.setItem('cv-seen', '1');
    }
    catch { /* private mode: shown again, which is harmless */ }
    const start = performance.now();
    const done = () => {
        const waited = performance.now() - start;
        window.setTimeout(() => el.classList.add('is-done'), Math.max(0, MIN_DWELL - waited));
    };
    if (document.readyState === 'complete')
        done();
    else
        window.addEventListener('load', done, { once: true });
}
