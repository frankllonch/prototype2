/**
 * Turning the pictures in a detail panel, and giving either column the screen.
 *
 * The photographs used to change as you scrolled. That read well while the text
 * was the thing you were following, but it meant you could not go back, and
 * could not stay on one picture — and looking at the photographs is half of why
 * anyone opens an exhibition. So they are turned by hand here, with arrows under
 * them.
 *
 * Either column can also take the whole width: the text alone for reading, the
 * pictures alone and centred for looking. One at a time — expanding one puts the
 * other away, so there is always something to come back to.
 *
 * With scripting off the panel is a plain column of text followed by every
 * photograph at full size, which is a worse read but a complete one: nothing
 * here hides anything that cannot be got at without it.
 */
export function initFigures() {
    for (const reader of document.querySelectorAll('[data-reader]')) {
        // Panels only; nothing else on the site composes this way any more.
        const panel = reader.closest('[data-panel]');
        if (!panel)
            continue;
        const stage = reader.querySelector('[data-figures]');
        const figures = stage ? [...stage.querySelectorAll('.reader-figure')] : [];
        const counter = reader.querySelector('[data-figure-count]');
        // The stacked, one-at-a-time presentation is the same as the scrolled
        // version's; only what advances it differs.
        if (stage && figures.length)
            stage.classList.add('is-live');
        let shown = 0;
        const show = (index) => {
            if (!figures.length)
                return;
            // Wraps, so the arrows never dead-end on a handful of pictures.
            shown = (index + figures.length) % figures.length;
            figures.forEach((figure, i) => figure.classList.toggle('is-current', i === shown));
            if (counter) {
                counter.textContent = (counter.dataset.template ?? '{n} / {total}')
                    .replace('{n}', String(shown + 1))
                    .replace('{total}', String(figures.length));
            }
        };
        for (const button of reader.querySelectorAll('[data-figure-step]')) {
            button.addEventListener('click', () => show(shown + Number(button.dataset.figureStep)));
        }
        /*
         * The arrow keys turn the pictures too, which is how anyone looking at a
         * set of photographs expects to move through them.
         *
         * Bound to the document and gated on this panel being the open one, rather
         * than to the panel itself: the panel is not focused when it opens, so a
         * listener on it would only answer after something inside had been clicked.
         * A press is ignored while the caret is in a field, and when a modifier is
         * held, so it never takes a key away from the browser or from typing.
         */
        document.addEventListener('keydown', (event) => {
            if (!panel.classList.contains('is-open'))
                return;
            if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
                return;
            const target = event.target;
            if (target?.closest('input, textarea, select, [contenteditable]'))
                return;
            const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (!step || figures.length < 2)
                return;
            event.preventDefault();
            show(shown + step);
        });
        const expanders = [...reader.querySelectorAll('[data-expand]')];
        const widen = (which) => {
            reader.classList.toggle('is-wide-text', which === 'text');
            reader.classList.toggle('is-wide-figures', which === 'figures');
            for (const button of expanders) {
                button.setAttribute('aria-pressed', String(button.dataset.expand === which));
            }
        };
        for (const button of expanders) {
            button.addEventListener('click', () => {
                const already = button.getAttribute('aria-pressed') === 'true';
                widen(already ? null : button.dataset.expand ?? null);
                // The column that was filling the screen has gone; starting anywhere but
                // the top of what replaced it would be landing in the middle of it.
                panel.scrollTop = 0;
            });
        }
        // Opening is always from the same state: first picture, neither column
        // widened, scrolled to the top.
        panel.addEventListener('panelopen', () => { widen(null); show(0); });
        show(0);
    }
}
