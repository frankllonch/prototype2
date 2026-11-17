import { nextHue } from './hues.js';
/**
 * The index lists — exhibitions, and commissioned work — answer in a different
 * colour each time, drawn from the site's one list (`hues.ts`).
 *
 * Decoration only. Without this the row keeps the default `--exh-hover` from the
 * stylesheet and still answers to the pointer; it simply answers in one colour.
 */
export function initHoverList() {
    for (const list of document.querySelectorAll('.xlist'))
        wire(list);
}
function wire(list) {
    const colour = (row) => {
        const n = nextHue();
        if (n >= 0)
            row.style.setProperty('--exh-hover', `var(--hue-${n})`);
    };
    for (const row of list.querySelectorAll('.hrow')) {
        // `pointerenter` rather than `pointerover`: the latter fires again for every
        // child the pointer crosses, so the colour would churn as it passed over the
        // title and then the photograph.
        //
        // Not for a finger. A touch enters the row it lands on and focuses the
        // link it taps, and neither is a reach towards the row. The colour is only
        // ever shown to a pointer that hovers and to a keyboard (the stylesheet's
        // `(hover: hover)` and `:focus-visible`), so a touch draws none — and the
        // focus that comes back to the row when its sheet closes draws none either,
        // unless a keyboard is what brought it.
        let finger = false;
        row.addEventListener('pointerdown', (event) => {
            finger = event.pointerType === 'touch';
        });
        row.addEventListener('pointerenter', (event) => {
            if (event.pointerType !== 'touch')
                colour(row);
        });
        row.addEventListener('focus', () => {
            if (!finger || row.matches(':focus-visible'))
                colour(row);
        });
    }
}
