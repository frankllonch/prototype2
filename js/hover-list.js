/**
 * The index lists — exhibitions, and commissioned work — answer in a different
 * colour each time.
 *
 * The palette is the one sampled from the paintings for the year rail, handed
 * over as custom properties on the list itself, so the colours stay in the
 * stylesheet's world and only the choosing happens here. Walking the list rather
 * than picking at random is what guarantees the thing that was asked for: two
 * hovers in a row are never the same colour, which chance alone would not give.
 *
 * The starting point is drawn from the number of rows, so the page does not open
 * on the same colour every time without needing a random number.
 *
 * Decoration only. Without this the row keeps the default `--exh-hover` from the
 * stylesheet and still answers to the pointer; it simply answers in one colour.
 */
export function initHoverList() {
    for (const list of document.querySelectorAll('[data-hues]'))
        wire(list);
}
function wire(list) {
    const count = Number(list.dataset.hues ?? 0);
    if (!Number.isFinite(count) || count < 2)
        return;
    const rows = [...list.querySelectorAll('.hrow')];
    let next = rows.length % count;
    const colour = (row) => {
        next = (next + 1) % count;
        row.style.setProperty('--exh-hover', `var(--hue-${next})`);
    };
    for (const row of rows) {
        // `pointerenter` rather than `pointerover`: the latter fires again for every
        // child the pointer crosses, so the colour would churn as it passed over the
        // title and then the photograph.
        row.addEventListener('pointerenter', () => colour(row));
        row.addEventListener('focus', () => colour(row));
    }
}
