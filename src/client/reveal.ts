import { phone, reduceMotion } from './env.ts';

/** Matches About's own: a beat later from one column to the next. */
const STAGGER_MS = 260;

/**
 * What's Color? on a phone, brought in as About brings in
 * its record (client/about.ts): each block rises a little out of a blur as it
 * reaches the screen, in order down the page (Frank, 2026-11-15). The look is
 * About's, in 09-phone.css under `.phone-pop`.
 *
 * Phone only, and only for a page that loads as one: the desktop has its own
 * scroll-run scenes on these pages. Without scripting, or with motion
 * reduced, nothing is hidden in the first place.
 */
const BLOCKS = [
  // What's Color? on the start page
  '.wc-rise .wc-numeral', '.wc-rise .wc-names', '.wc-text-head', '.wc-text p:not(.wc-text-head)',
  // an edition's own page
  '.wc-edition > .wc-numeral', '.wc-edition > .wc-names', '.wc-book', '.wc-say',
  '.wc-cell-name', '.wc-cell-meta', '.wc-cell-text > *', '.wc-back', '.wc-foot',
].join(', ');

export function initReveal(): void {
  if (!phone.matches || reduceMotion.matches || !('IntersectionObserver' in window)) return;
  const blocks = [...document.querySelectorAll<HTMLElement>(BLOCKS)];
  if (!blocks.length) return;

  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const across = entry.boundingClientRect.left / Math.max(1, window.innerWidth);
        el.style.setProperty('--pop-delay', `${Math.round(Math.max(0, across) * STAGGER_MS)}ms`);
        el.classList.add('is-in');
        seen.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of blocks) {
    el.classList.add('phone-pop');
    seen.observe(el);
  }
}
