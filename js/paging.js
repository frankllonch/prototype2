import { isPlainClick, phone, reduceMotion } from './env.js';
import { OUT_MS } from './transitions.js';
/**
 * Leaving a painting the way you came: a step back, not a fresh gallery.
 *
 * Following the link builds the gallery again from the top and replays the
 * opening, which loses the place the reader had. Stepping back resumes the
 * page they left — their scroll, their chosen year, and no pile — and the
 * browser does all of it.
 *
 * Only when the gallery really is the previous page. Arriving at a painting
 * from somewhere else, or straight from its address, leaves the link as a
 * link, because there would be nothing behind to step back to.
 *
 * Walking from painting to painting keeps that true: the arrows replace this
 * page in the history instead of adding to it (`data-replace`), so the
 * gallery stays one step back. The referrer then names the previous painting
 * rather than the gallery, so the fact is remembered on arrival from the
 * gallery — as the history's length at that moment, which a replacement does
 * not change and a fresh arrival from anywhere else will not match.
 */
const BEHIND = 'cv-gallery-behind';
function galleryIsBehind(back) {
    if (window.history.length <= 1)
        return false;
    const depth = String(window.history.length);
    if (document.referrer) {
        const cameFrom = new URL(document.referrer, window.location.href);
        if (cameFrom.origin === window.location.origin
            && cameFrom.pathname === new URL(back.href).pathname) {
            try {
                sessionStorage.setItem(BEHIND, depth);
            }
            catch { /* private mode: this visit only */ }
            return true;
        }
    }
    try {
        return sessionStorage.getItem(BEHIND) === depth;
    }
    catch {
        return false;
    }
}
function backStepsBack() {
    // The page's two corners at the top — the section's name and Close — both
    // lead back to the gallery.
    const links = [...document.querySelectorAll('.detail-back')];
    if (!links.length || !galleryIsBehind(links[0]))
        return;
    for (const back of links)
        back.addEventListener('click', (event) => {
            if (!isPlainClick(event))
                return;
            event.preventDefault();
            /*
             * Faded on the way out, the same as any other departure. Stepping back is
             * instant — that is the point of it — and arriving instantly is what made
             * it feel abrupt beside the fade going in. The veil covers the change and
             * `pageshow` clears it at the other end, which fires whether the gallery
             * is rebuilt or resumed from the back/forward cache.
             */
            if (reduceMotion.matches) {
                window.history.back();
                return;
            }
            document.documentElement.classList.add('is-leaving');
            window.setTimeout(() => window.history.back(), OUT_MS);
        });
}
/**
 * The left and right keys walk through the paintings.
 *
 * The page already states which works come either side of this one, as links
 * with `rel="prev"` and `rel="next"`. This binds the keys to those, so there
 * is nothing here deciding what the neighbours are — the markup decides, and
 * the keyboard follows the same two links the arrows on the page follow.
 *
 * It does nothing anywhere those links are absent, which is every page but a
 * painting's own.
 */
export function initPaging() {
    backStepsBack();
    const prev = document.querySelector('a[rel="prev"]');
    const next = document.querySelector('a[rel="next"]');
    touchPaging(prev, next);
    if (!prev && !next)
        return;
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
            return;
        // A modified arrow belongs to the browser or the window manager.
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
            return;
        /*
         * Not while something else is listening for the same key. A field, a
         * `contenteditable`, or anything with a role that uses the arrows for its
         * own navigation would otherwise lose them to this.
         */
        const target = event.target;
        // Guarded on Element: when nothing is focused the target can be the
        // document itself, which has no `closest` and would throw here.
        if (target instanceof Element
            && target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'))
            return;
        const link = event.key === 'ArrowLeft' ? prev : next;
        if (!link)
            return;
        event.preventDefault();
        follow(link);
    });
}
/*
 * Clicked rather than followed, so the page's own departure — the fade that
 * holds the navigation — runs exactly as it does for the arrows on the page.
 * Going straight to the address would skip it.
 */
function follow(link) {
    if (!reduceMotion.matches)
        link.click();
    else if (link.hasAttribute('data-replace'))
        window.location.replace(link.href);
    else
        window.location.assign(link.href);
}
/*
 * THE SWIPE — how far a finger has to travel across the painting's page to
 * turn it, in CSS pixels, and how much more across than down the movement
 * has to be (1.5 is about 34 degrees off level). EDGE keeps clear of the
 * strip at each side of the screen where the phone's own back and forward
 * gestures begin.
 */
const SWIPE = 48;
const SWIPE_LEVEL = 1.5;
const EDGE = 24;
/**
 * A painting's page on a phone, where nothing but the painting is drawn.
 *
 * The four corner links are still in the page, out of sight (05-artwork.css),
 * and the hand reaches them another way: a touch on the empty ground is
 * Close, and a swipe across is Previous or Next. Both click the link itself,
 * so closing steps back to the gallery where that is what Close does, and a
 * turn of the page replaces this one in the history, exactly as on a desktop.
 * The phone's own Back needs nothing from here.
 */
function touchPaging(prev, next) {
    const page = document.querySelector('.detail');
    const close = document.querySelector('.detail-close');
    if (!page)
        return;
    page.addEventListener('click', (event) => {
        if (!phone.matches || !close || !isPlainClick(event))
            return;
        // The painting, its small pictures and the words are not the ground:
        // a touch there is looking, choosing a picture or selecting text.
        const target = event.target;
        if (target?.closest('a, button, .detail-plate, .detail-under, .detail-caption'))
            return;
        follow(close);
    });
    let startX = 0, startY = 0, tracking = false;
    page.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        // One finger, away from the edges, on a page at its own size: two are a
        // pinch, the edges are the phone's own, and across a page that has been
        // zoomed into a finger is only moving the picture about.
        tracking = phone.matches && event.touches.length === 1
            && touch.clientX > EDGE && touch.clientX < window.innerWidth - EDGE
            && (window.visualViewport?.scale ?? 1) < 1.05;
        startX = touch.clientX;
        startY = touch.clientY;
    }, { passive: true });
    page.addEventListener('touchend', (event) => {
        if (!tracking)
            return;
        tracking = false;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < SWIPE || Math.abs(dx) < SWIPE_LEVEL * Math.abs(dy))
            return;
        // The page follows the finger: pulled to the left, the next one comes.
        const link = dx < 0 ? next : prev;
        if (link)
            follow(link);
    }, { passive: true });
    page.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
}
