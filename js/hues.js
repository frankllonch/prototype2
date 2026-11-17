/**
 * The one way of drawing a colour from the site's list.
 *
 * The list itself is on the document as `--hue-0` … `--hue-N` (and the
 * negatives the bar needs as `--neg-N`), written there by content/palette.ts;
 * this hands out an index into it. The page's first colour is drawn at random
 * in the head, before the first paint, for the block in the bar
 * (components/layout.ts, `data-hue`); every draw after walks the list from
 * there, so two in a row are never the same colour — which chance alone would
 * not promise.
 */
let count = -1;
let at = -1;
/** The colour the head drew for the page, or -1 when it drew none. */
export function pageHue() {
    const n = Number(document.documentElement.dataset.hue);
    return Number.isInteger(n) && n >= 0 ? n : -1;
}
/** The next colour's index, or -1 when the document carries no list. */
export function nextHue() {
    if (count < 0) {
        count = Number(getComputedStyle(document.documentElement).getPropertyValue('--hues')) || 0;
        at = pageHue();
    }
    if (!count)
        return -1;
    at = at < 0 ? Math.floor(Math.random() * count) : (at + 1) % count;
    return at;
}
