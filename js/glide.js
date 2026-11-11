import { reduceMotion } from './env.js';
/*
 * HOW FAST THE SITE SCROLLS ITSELF — the numbers to change are here.
 *
 * Every journey the site makes on the reader's behalf runs through this one
 * function: the menu down to the names, a name down to its answer, a year on
 * the gallery's rail, a folded text coming back into view. The browser's own
 * smooth scroll is not used anywhere, because its pace cannot be set — and
 * Safari's in particular is a snap rather than a glide.
 *
 *   BASE_MS     the time any journey takes before distance is counted.
 *   PER_PX_MS   added per pixel travelled, so a long trip is slower than a
 *               short one without ever becoming a crawl.
 *   MAX_MS      the ceiling, however far the trip.
 *
 * All three were set half again as long as the timings they replaced, at the
 * client's request: one and a half times the old journey, everywhere.
 */
const BASE_MS = 1050;
const PER_PX_MS = 0.33;
const MAX_MS = 2400;
/** In and out on a cubic: leaves slower and arrives softer than a quadratic. */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let journey = 0;
const abandon = () => {
    journey = 0;
    window.removeEventListener('wheel', holdMomentum);
};
for (const kind of ['touchmove', 'keydown']) {
    window.addEventListener(kind, abandon, { passive: true });
}
/*
 * The wheel is read more carefully than a touch or a key, because a trackpad
 * goes on sending wheel events for a second or so after the fingers lift —
 * the momentum of the last flick — and a click on a year very often lands in
 * the middle of that tail. Taken as the reader's hand, it cancelled the
 * journey the moment it began, and the click seemed to do nothing; let
 * through, it scrolled against the journey and made it judder.
 *
 * So a wheel event is a hand only if it starts something: it follows a pause,
 * or it pushes harder than the one before it. One in a steady, fading stream
 * is momentum. Momentum is swallowed while a journey runs — by a listener that
 * exists only then, since a wheel listener that can cancel slows every scroll
 * on the page for as long as it is attached.
 */
let lastWheel = 0;
let lastSpeed = 0;
let fresh = true;
window.addEventListener('wheel', (event) => {
    // When the event was made, not when it is handled: the click that starts a
    // journey keeps the page busy for a moment, and the momentum queued behind
    // it would otherwise arrive looking like a pause.
    const now = event.timeStamp;
    const gap = now - lastWheel;
    // Measured as speed, not as the size of one event: while the page is busy
    // the browser merges the queued events into one, twice the push over twice
    // the time, which by size alone read as a fresh, harder push.
    const speed = (Math.abs(event.deltaY) + Math.abs(event.deltaX)) / Math.max(16, gap);
    fresh = gap > 120 || speed > lastSpeed * 1.3 + 0.15;
    lastWheel = now;
    lastSpeed = speed;
    if (journey && fresh)
        abandon();
}, { passive: true });
function holdMomentum(event) {
    if (journey && !fresh)
        event.preventDefault();
}
/**
 * Take the page to a scroll position, gently. One journey at a time — a new
 * one cancels the last — and a new wheel, touch or key from the reader cancels
 * it too, so the page never pulls against a hand (a trackpad's leftover
 * momentum does not count; see above). With motion reduced it is a
 * jump. `duration` overrides the distance-based timing.
 */
export function glide(to, duration) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(to, max));
    if (reduceMotion.matches) {
        window.scrollTo({ top: target, behavior: 'auto' });
        return;
    }
    const from = window.scrollY;
    const distance = Math.abs(target - from);
    if (distance < 1)
        return;
    const ms = duration ?? Math.min(MAX_MS, BASE_MS + distance * PER_PX_MS);
    const id = ++journey;
    const t0 = performance.now();
    window.addEventListener('wheel', holdMomentum, { passive: false });
    const arrive = () => { journey = 0; window.removeEventListener('wheel', holdMomentum); };
    // Timed by the same clock throughout, never by the frame's own timestamp:
    // one clock cannot disagree with itself, and a frame stamp from another
    // origin would make the first step read as the last and jump to the end.
    const step = () => {
        if (journey !== id)
            return;
        const t = Math.min(1, (performance.now() - t0) / ms);
        window.scrollTo({ top: from + (target - from) * ease(t), behavior: 'auto' });
        if (t < 1)
            requestAnimationFrame(step);
        else
            arrive();
    };
    requestAnimationFrame(step);
    // A tab that is not being painted is granted no frames, and a journey begun
    // there would never arrive. If this one is still under way well after its
    // time, it is finished in one step: the reader sees the page where it was
    // asked to go, rather than where it was left.
    window.setTimeout(() => {
        if (journey !== id)
            return;
        arrive();
        window.scrollTo({ top: target, behavior: 'auto' });
    }, ms + 400);
}
/** Where to glide so an element stands at the top, clear of its scroll margin. */
export function topOf(el) {
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return el.getBoundingClientRect().top + window.scrollY - margin;
}
/**
 * Links into the same page glide rather than jump. The browser would scroll to
 * the anchor itself — instantly, or at its own uncontrollable smooth pace — so
 * the click is taken over: the address takes the anchor as a real step in the
 * history, exactly as the browser would have written it, and the page glides.
 */
export function initGlide() {
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0)
            return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
        const link = event.target.closest('a[href*="#"]');
        if (!link || link.target)
            return;
        const url = new URL(link.href, location.href);
        if (url.pathname !== location.pathname || url.search !== location.search || !url.hash)
            return;
        const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!el)
            return;
        event.preventDefault();
        if (location.hash !== url.hash)
            history.pushState(null, '', url.hash);
        glide(topOf(el));
    });
}
