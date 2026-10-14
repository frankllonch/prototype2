import { isPlainClick, reduceMotion } from './env.ts';
import { OUT_MS } from './transitions.ts';

/**
 * Leaving a painting the way you came: a step back, not a fresh gallery.
 *
 * Following the link builds the gallery again from the top and replays the
 * opening, which loses the place the reader had. Stepping back resumes the
 * page they left — their scroll, their chosen year, and no pile — and the
 * browser does all of it.
 *
 * Only when the gallery really is the previous page. Arriving at a painting
 * from somewhere else, or straight from its address, leaves the link as a
 * link, because there would be nothing behind to step back to.
 */
function backStepsBack(): void {
  const back = document.querySelector<HTMLAnchorElement>('.detail-back');
  if (!back || !document.referrer || window.history.length <= 1) return;

  const cameFrom = new URL(document.referrer, window.location.href);
  if (cameFrom.origin !== window.location.origin) return;
  if (cameFrom.pathname !== new URL(back.href).pathname) return;

  back.addEventListener('click', (event) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    /*
     * Faded on the way out, the same as any other departure. Stepping back is
     * instant — that is the point of it — and arriving instantly is what made
     * it feel abrupt beside the fade going in. The veil covers the change and
     * `pageshow` clears it at the other end, which fires whether the gallery
     * is rebuilt or resumed from the back/forward cache.
     */
    if (reduceMotion.matches) { window.history.back(); return; }
    document.documentElement.classList.add('is-leaving');
    window.setTimeout(() => window.history.back(), OUT_MS);
  });
}

/**
 * The left and right keys walk through the paintings.
 *
 * The page already states which works come either side of this one, as links
 * with `rel="prev"` and `rel="next"`. This binds the keys to those, so there
 * is nothing here deciding what the neighbours are — the markup decides, and
 * the keyboard follows the same two links the arrows on the page follow.
 *
 * It does nothing anywhere those links are absent, which is every page but a
 * painting's own.
 */
export function initPaging(): void {
  backStepsBack();

  const prev = document.querySelector<HTMLAnchorElement>('a[rel="prev"]');
  const next = document.querySelector<HTMLAnchorElement>('a[rel="next"]');
  if (!prev && !next) return;

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    // A modified arrow belongs to the browser or the window manager.
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

    /*
     * Not while something else is listening for the same key. A field, a
     * `contenteditable`, or anything with a role that uses the arrows for its
     * own navigation would otherwise lose them to this.
     */
    const target = event.target;
    // Guarded on Element: when nothing is focused the target can be the
    // document itself, which has no `closest` and would throw here.
    if (target instanceof Element
      && target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;

    const link = event.key === 'ArrowLeft' ? prev : next;
    if (!link) return;
    event.preventDefault();

    /*
     * Clicked rather than followed, so the page's own departure — the fade
     * that holds the navigation — runs exactly as it does for the arrows on
     * the page. Going straight to the address would skip it.
     */
    if (reduceMotion.matches) window.location.assign(link.href);
    else link.click();
  });
}
