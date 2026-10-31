import { isPlainClick } from './env.ts';
import { ABANDONED } from './transitions.ts';

/**
 * A clicked name brings its answer forward.
 *
 * On an edition's page the anchor itself already travels — the page scrolls
 * smoothly by stylesheet — so this only marks what was chosen: the page gets
 * `wc-focus`, the entry gets `wc-focused`, and the stylesheet blurs everything
 * else. The reader's next own movement — a wheel, a touch, a click outside the
 * entry, Escape — clears it, and the programmatic travel does not count as
 * movement, which is why this listens to inputs rather than to the scroll they
 * cause. Arriving with an answer's id in the address focuses it the same way,
 * so a shared link lands the way a click does.
 *
 * On the opening view a clicked name is a departure instead, and the view sees
 * it off the same way: the chosen name holds while the rest of the page falls
 * back, until the new page takes the screen.
 */
export function initWcFocus(): void {
  sheetFocus();
  openingFocus();
}

function sheetFocus(): void {
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

  /*
   * A page left focused and revisited through the back/forward cache comes
   * back exactly as it was left — blurred, with no click to explain it. Only
   * the cached restore is cleared: on a fresh arrival this event follows the
   * address-led focus below, and must not undo it.
   */
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) clear();
  });

  if (location.hash) focus(decodeURIComponent(location.hash.slice(1)));
}

function openingFocus(): void {
  const page = document.getElementById('whats-color');
  if (!page || page.classList.contains('wc-sheet-page')) return;

  const clear = () => {
    page.classList.remove('wc-focus');
    for (const el of page.querySelectorAll('.wc-focused')) el.classList.remove('wc-focused');
  };

  document.addEventListener('click', (event) => {
    if (!isPlainClick(event)) return;
    const name = (event.target as Element).closest<HTMLAnchorElement>('a.wc-name, a.wc-intro');
    if (!name || !page.contains(name)) return;
    for (const el of page.querySelectorAll('.wc-focused')) el.classList.remove('wc-focused');
    name.classList.add('wc-focused');
    page.classList.add('wc-focus');
    // If the departure never commits — the load is stopped, the tab was
    // backgrounded — the page must come back whole, on the same clock the
    // transition module keeps for its own veil.
    window.setTimeout(clear, ABANDONED);
  });

  // Returning by history restores the farewell with the page; take it off.
  window.addEventListener('pageshow', clear);
  window.addEventListener('popstate', clear);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clear();
  });
}
