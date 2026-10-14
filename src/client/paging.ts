import { reduceMotion } from './env.ts';

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
