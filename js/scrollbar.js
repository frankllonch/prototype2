/**
 * A handle on the page rather than a scrollbar beside it.
 *
 * The browser's own bar cannot be made to sit on the page. Its track can be
 * given no colour, which is what the stylesheet did first, but the column it
 * occupies is still held open beside the content and the handle still rides in
 * that column, not over the page. So the native bar is taken away entirely and
 * a handle is drawn instead, fixed to the right edge, over whatever is behind
 * it.
 *
 * Only its length is worked out here. Where it sits is the stylesheet's, driven
 * by the scroll itself — the same mechanism the film drifts on, computed where
 * the scrolling is computed, so it cannot lag the way a handle moved by script
 * on every scroll event would.
 *
 * Length is the viewport's share of the whole document, floored so that a very
 * long page still leaves something to see. Remeasured when the window changes
 * and when the document does, since a panel opening or a filter closing changes
 * how much there is to scroll through.
 *
 * It is `aria-hidden` and takes no pointer: it reports the scroll, it does not
 * offer to drive it. Dragging a bar this thin was never the way anyone moved
 * through this site, and the wheel, the keys and the trackpad are untouched.
 */
export function initScrollbar() {
    const thumb = document.createElement('div');
    thumb.className = 'scroll-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    document.body.append(thumb);
    const root = document.documentElement;
    const size = () => {
        const whole = root.scrollHeight;
        const view = window.innerHeight;
        // Nothing to report on a page that fits.
        if (whole <= view + 1) {
            thumb.style.setProperty('--thumb-h', '0px');
            return;
        }
        const share = (view / whole) * view;
        thumb.style.setProperty('--thumb-h', `${Math.max(36, Math.round(share))}px`);
    };
    size();
    window.addEventListener('resize', size);
    if ('ResizeObserver' in window)
        new ResizeObserver(size).observe(root);
}
