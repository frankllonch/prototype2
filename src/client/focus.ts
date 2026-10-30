/**
 * A clicked name brings its answer forward.
 *
 * The anchor itself already travels — the page scrolls smoothly by stylesheet
 * — so this only marks what was chosen: the page gets `wc-focus`, the entry
 * gets `wc-focused`, and the stylesheet blurs everything else. The reader's
 * next own movement — a wheel, a touch, a click outside the entry, Escape —
 * clears it, and the programmatic travel does not count as movement, which is
 * why this listens to inputs rather than to the scroll they cause.
 *
 * Arriving with an answer's id in the address focuses it the same way, so a
 * shared link lands the way a click does.
 */
export function initWcFocus(): void {
  const page = document.querySelector<HTMLElement>('.wc-sheet-page');
  if (!page) return;

  const clear = () => {
    if (!page.classList.contains('wc-focus')) return;
    page.classList.remove('wc-focus');
    for (const el of page.querySelectorAll('.wc-focused')) el.classList.remove('wc-focused');
  };

  const focus = (id: string): boolean => {
    const cell = document.getElementById(id);
    if (!cell || !page.contains(cell)) return false;
    for (const el of page.querySelectorAll('.wc-focused')) el.classList.remove('wc-focused');
    cell.classList.add('wc-focused');
    page.classList.add('wc-focus');
    return true;
  };

  document.addEventListener('click', (event) => {
    const name = (event.target as Element).closest<HTMLAnchorElement>('a.wc-name[href^="#"]');
    if (name) {
      if (focus(decodeURIComponent(name.hash.slice(1)))) return;
    }
    if (!(event.target as Element).closest('.wc-focused')) clear();
  });

  window.addEventListener('wheel', clear, { passive: true });
  window.addEventListener('touchmove', clear, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clear();
  });

  if (location.hash) focus(decodeURIComponent(location.hash.slice(1)));
}
