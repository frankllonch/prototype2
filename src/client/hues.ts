/** The one way of drawing a colour from the site's list. */
let count = -1;
let at = -1;

/** The colour the head drew for the page, or -1 when it drew none. */
export function pageHue(): number {
  const n = Number(document.documentElement.dataset.hue);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

/** The next colour's index, or -1 when the document carries no list. */
export function nextHue(): number {
  if (count < 0) {
    count = Number(getComputedStyle(document.documentElement).getPropertyValue('--hues')) || 0;
    at = pageHue();
  }
  if (!count) return -1;
  // Any colour but the one just drawn.
  at = at < 0 || count < 2
    ? Math.floor(Math.random() * count)
    : (at + 1 + Math.floor(Math.random() * (count - 1))) % count;
  return at;
}
