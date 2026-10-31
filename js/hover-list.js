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
        row.addEventListener('pointerenter', () => colour(row));
        row.addEventListener('focus', () => colour(row));
    }
}
