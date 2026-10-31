/**
 * The one way of drawing a colour from the site's list.
 *
 * The list itself is on the document as `--hue-0` … `--hue-N` (and the
 * negatives the bar needs as `--neg-N`), written there by content/palette.ts;
 * this hands out an index into it. The first draw of a page is at random, and
 * every draw after walks the list, so two in a row are never the same colour —
 * which chance alone would not promise.
 */
let count = -1;
let at = -1;
/** The next colour's index, or -1 when the document carries no list. */
export function nextHue() {
    if (count < 0) {
        count = Number(getComputedStyle(document.documentElement).getPropertyValue('--hues')) || 0;
    }
    if (!count)
        return -1;
    at = at < 0 ? Math.floor(Math.random() * count) : (at + 1) % count;
    return at;
}
