/**
 * The sheet holds still and only its text moves (`components/sheet.ts`).
 *
 * The text column is the one thing on the sheet that scrolls, so a wheel or
 * trackpad turned anywhere on it — over the photograph, over the masthead, in
 * the margin — is handed to the text rather than spent on nothing. The keys
 * that scroll a page do the same while the sheet is open.
 *
 * The arrows, the arrow keys and the widening are `client/figures.ts`, which
 * every detail shares; this only keeps the text where it should start: at the
 * top whenever the sheet opens or the text takes the screen or gives it back.
 */
export function initSheets() {
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    for (const sheet of document.querySelectorAll('[data-sheet]')) {
        const panel = sheet.closest('[data-panel]');
        const text = sheet.querySelector('[data-sheet-text]');
        if (!panel || !text)
            continue;
        const top = () => { text.scrollTop = 0; };
        panel.addEventListener('panelopen', top);
        for (const button of sheet.querySelectorAll('[data-expand]'))
            button.addEventListener('click', top);
        panel.addEventListener('wheel', (event) => {
            if (text.contains(event.target))
                return;
            // A pinch on a trackpad arrives as a wheel with Ctrl held, as does
            // Ctrl and the wheel: both are the browser's zoom, and stay its. A
            // sideways swipe is its way back a page.
            if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX))
                return;
            event.preventDefault();
            // Lines and pages are what a mouse wheel reports on some systems; the
            // text moves by its own line or its own height for those.
            const unit = event.deltaMode === 1 ? parseFloat(getComputedStyle(text).lineHeight) || 40
                : event.deltaMode === 2 ? text.clientHeight : 1;
            text.scrollBy({ top: event.deltaY * unit });
        }, { passive: false });
        /*
         * The keys a reader scrolls with. Bound to the document and gated on this
         * panel being open, for the reason `figures.ts` gives: the panel is not
         * what has focus when it opens, the Close link is. A press inside the text
         * is left to the browser, which scrolls it already.
         */
        const steps = {
            ArrowDown: () => 48, ArrowUp: () => -48,
            PageDown: (h) => h * 0.9, PageUp: (h) => -h * 0.9, ' ': (h) => h * 0.9,
            Home: () => -Infinity, End: () => Infinity,
        };
        document.addEventListener('keydown', (event) => {
            if (!panel.classList.contains('is-open'))
                return;
            if (event.metaKey || event.ctrlKey || event.altKey)
                return;
            const target = event.target;
            if (target && text.contains(target))
                return;
            if (target?.closest('input, textarea, select, [contenteditable]'))
                return;
            // Space on a button presses it; on a link — Close, which has the focus
            // when the sheet opens — it does nothing, so there it scrolls.
            if (event.key === ' ' && target?.closest('button'))
                return;
            const step = steps[event.key];
            if (!step)
                return;
            event.preventDefault();
            const by = step(text.clientHeight) * (event.shiftKey && event.key === ' ' ? -1 : 1);
            if (by === Infinity)
                text.scrollTop = text.scrollHeight;
            else if (by === -Infinity)
                text.scrollTop = 0;
            // A held arrow repeats faster than a smooth scroll finishes, and each new
            // one would cut the last one short; lines move at once, pages glide —
            // unless the reader has asked for less motion.
            else
                text.scrollBy({ top: by, behavior: Math.abs(by) > 48 && !still.matches ? 'smooth' : 'auto' });
        });
    }
}
