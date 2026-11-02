import { isPlainClick, reduceMotion } from './env.js';
import { glide, topOf } from './glide.js';
import { ABANDONED } from './transitions.js';
/**
 * A clicked name brings its answer forward.
 *
 * On an edition's page the anchor itself already travels — the page scrolls
 * smoothly by stylesheet — so this only marks what was chosen: the page gets
 * `wc-focus`, the entry gets `wc-focused`, and the stylesheet blurs everything
 * else. The reader's next own movement — a wheel, a touch, a click outside the
 * entry, Escape — clears it, and the programmatic travel does not count as
 * movement, which is why this listens to inputs rather than to the scroll they
 * cause. Arriving with an answer's id in the address focuses it the same way,
 * so a shared link lands the way a click does.
 *
 * On the opening view a clicked name is a departure instead, and the view sees
 * it off the same way: the chosen name holds while the rest of the page falls
 * back, until the new page takes the screen.
 */
export function initWcFocus() {
    sheetFocus();
    openingFocus();
}
function sheetFocus() {
    const page = document.querySelector('.wc-sheet-page');
    if (!page)
        return;
    const clear = () => {
        if (!page.classList.contains('wc-focus'))
            return;
        page.classList.remove('wc-focus');
        for (const el of page.querySelectorAll('.wc-focused'))
            el.classList.remove('wc-focused');
    };
    const focus = (id) => {
        const cell = document.getElementById(id);
        if (!cell || !page.contains(cell))
            return false;
        for (const el of page.querySelectorAll('.wc-focused'))
            el.classList.remove('wc-focused');
        cell.classList.add('wc-focused');
        page.classList.add('wc-focus');
        return true;
    };
    document.addEventListener('click', (event) => {
        const name = event.target.closest('a.wc-name[href^="#"]');
        if (name) {
            if (focus(decodeURIComponent(name.hash.slice(1))))
                return;
        }
        // The quote itself is a thing to choose, not only its name in the roster:
        // clicking an entry brings it forward the same way.
        const cell = event.target.closest('.wc-cell');
        if (cell && cell.id) {
            focus(cell.id);
            return;
        }
        clear();
    });
    window.addEventListener('wheel', clear, { passive: true });
    window.addEventListener('touchmove', clear, { passive: true });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape')
            clear();
    });
    /*
     * A page left focused and revisited through the back/forward cache comes
     * back exactly as it was left — blurred, with no click to explain it. Only
     * the cached restore is cleared: on a fresh arrival this event follows the
     * address-led focus below, and must not undo it.
     */
    window.addEventListener('pageshow', (event) => {
        if (event.persisted)
            clear();
    });
    if (location.hash) {
        const id = decodeURIComponent(location.hash.slice(1));
        const cell = document.getElementById(id);
        if (cell && focus(id)) {
            /*
             * The browser lands on the anchor in one jump. Arriving from the
             * opening view should instead read as entering the page and travelling
             * down to the answer, the way an on-page click does — so back to the
             * top at once, then the same journey. Travel only: with motion reduced,
             * the jump the browser already made is the right behaviour.
             */
            if (!reduceMotion.matches) {
                /*
                 * The browser makes that jump itself, after this script has run —
                 * Chromium as parsing finishes, Safari some while after load — and
                 * once it has, the glide finds itself already at the answer and has
                 * nowhere to go. (The stylesheet's smooth scroll used to disguise the
                 * jump as a journey; it is gone, so the jump showed.) So the answer's
                 * id is taken off until the browser has stopped looking for it: there
                 * is no anchor to jump to, the page stays at the top, and the glide
                 * makes the trip. The id comes back once loading has settled, for the
                 * roster's own links and anyone copying the address.
                 */
                cell.removeAttribute('id');
                const restore = () => window.setTimeout(() => { cell.id = id; }, 1800);
                if (document.readyState === 'complete')
                    restore();
                else
                    window.addEventListener('load', restore, { once: true });
                window.scrollTo({ top: 0, behavior: 'auto' });
                window.setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'auto' });
                    glide(topOf(cell));
                }, 80);
            }
        }
    }
}
function openingFocus() {
    const page = document.getElementById('whats-color');
    if (!page || page.classList.contains('wc-sheet-page'))
        return;
    const clear = () => {
        page.classList.remove('wc-focus');
        for (const el of page.querySelectorAll('.wc-focused'))
            el.classList.remove('wc-focused');
    };
    document.addEventListener('click', (event) => {
        if (!isPlainClick(event))
            return;
        const name = event.target.closest('a.wc-name, a.wc-intro, .wc-text-head a');
        if (!name || !page.contains(name))
            return;
        for (const el of page.querySelectorAll('.wc-focused'))
            el.classList.remove('wc-focused');
        // A text block holds as one; a name holds alone.
        (name.closest('.wc-text') ?? name).classList.add('wc-focused');
        page.classList.add('wc-focus');
        // If the departure never commits — the load is stopped, the tab was
        // backgrounded — the page must come back whole, on the same clock the
        // transition module keeps for its own veil.
        window.setTimeout(clear, ABANDONED);
    });
    // Returning by history restores the farewell with the page; take it off.
    window.addEventListener('pageshow', clear);
    window.addEventListener('popstate', clear);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape')
            clear();
    });
}
