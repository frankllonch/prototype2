import { isPlainClick, targetElement } from './env.ts';
import { topOf } from './glide.ts';
import { ABANDONED } from './transitions.ts';

/** A clicked name brings its answer forward. */
export function initWcFocus(): void {
  try {
    sheetFocus();
    openingFocus();
  } finally {
    document.documentElement.classList.remove('wc-landing');
  }
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
    const name = targetElement(event)?.closest<HTMLAnchorElement>(
      'a.wc-name[href^="#"], a.wc-bar[href^="#"]',
    );
    if (name) {
      if (focus(decodeURIComponent(name.hash.slice(1)))) return;
    }
    // The quote itself is a thing to choose, not only its name in the roster: clicking an entry
    // brings it forward the same way.
    const cell = targetElement(event)?.closest<HTMLElement>('.wc-cell');
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

  // Arriving by a name on the opening view: the page opens on the answer, already chosen. Only a
  // fresh arrival: a reload or a step back in the history keeps the place the reader left.
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (location.hash && (!nav || nav.type === 'navigate')) {
    const id = decodeURIComponent(location.hash.slice(1));
    const cell = document.getElementById(id);
    if (cell && focus(id)) {
      // Under the veil the head holds (components/layout.ts), so the page is first seen in place.
      const land = () => {
        if (cell.classList.contains('wc-focused')) window.scrollTo({ top: topOf(cell), behavior: 'instant' });
      };
      land();
      // Late fonts and pictures can move the answer; follow it until the reader takes over.
      void document.fonts?.ready.then(land);
      if (document.readyState !== 'complete') window.addEventListener('load', land, { once: true });
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
    const name = targetElement(event)?.closest<HTMLAnchorElement>(
      'a.wc-name, a.wc-intro, .wc-text-head a',
    );
    if (!name || !page.contains(name)) return;
    // A numeral (I, II, III) opens a whole edition, not one answer: there is nothing to hold
    // forward, so it leaves like any other link — the page simply fades — rather than blurring the
    // view behind it.
    if (name.classList.contains('wc-numeral-link')) return;
    // Nor is there for a name with no answer to show: it opens its edition the same plain way.
    if (name.classList.contains('wc-name') && !name.hash) return;
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
