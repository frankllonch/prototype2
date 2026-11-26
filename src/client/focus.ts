import { isPlainClick, reduceMotion } from './env.ts';
import { glide, topOf } from './glide.ts';
import { ABANDONED } from './transitions.ts';

/** A clicked name brings its answer forward. */
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
    // A name in the roster, or a bar of the colour chart at the foot.
    const name = (event.target as Element).closest<HTMLAnchorElement>(
      'a.wc-name[href^="#"], a.wc-bar[href^="#"]',
    );
    if (name) {
      if (focus(decodeURIComponent(name.hash.slice(1)))) return;
    }
    // The quote itself is a thing to choose, not only its name in the roster: clicking an entry
    // brings it forward the same way.
    const cell = (event.target as Element).closest<HTMLElement>('.wc-cell');
    if (cell && cell.id) {
      focus(cell.id);
      return;
    }
    clear();
  });

  window.addEventListener('wheel', clear, { passive: true });
  window.addEventListener('touchmove', clear, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clear();
  });

  /*
   * A page left focused and revisited through the back/forward cache comes back
   * exactly as it was left — blurred, with no click to explain it.
   */
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) clear();
  });

  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    const cell = document.getElementById(id);
    if (cell && focus(id)) {
      /* The browser lands on the anchor in one jump. */
      if (!reduceMotion.matches) {
        /* The browser makes that jump itself, after this script has run. */
        cell.removeAttribute('id');
        const restore = () => window.setTimeout(() => { cell.id = id; }, 1800);
        if (document.readyState === 'complete') restore();
        else window.addEventListener('load', restore, { once: true });
        window.scrollTo({ top: 0, behavior: 'auto' });
        window.setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'auto' });
          glide(topOf(cell));
        }, 80);
      }
    }
  }
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
    const name = (event.target as Element).closest<HTMLAnchorElement>(
      'a.wc-name, a.wc-intro, .wc-text-head a',
    );
    if (!name || !page.contains(name)) return;
    // A numeral (I, II, III) opens a whole edition, not one answer: there is nothing to hold
    // forward, so it leaves like any other link — the page simply fades — rather than blurring the
    // view behind it.
    if (name.classList.contains('wc-numeral-link')) return;
    for (const el of page.querySelectorAll('.wc-focused')) el.classList.remove('wc-focused');
    // A text block holds as one; a name holds alone.
    (name.closest('.wc-text') ?? name).classList.add('wc-focused');
    page.classList.add('wc-focus');
    // If the departure never commits — the load is stopped, the tab was backgrounded — the page
    // must come back whole, on the same clock the transition module keeps for its own veil.
    window.setTimeout(clear, ABANDONED);
  });

  // Returning by history restores the farewell with the page; take it off.
  window.addEventListener('pageshow', clear);
  window.addEventListener('popstate', clear);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clear();
  });
}
