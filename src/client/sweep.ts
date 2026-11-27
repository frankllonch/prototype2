import { nextHue } from './hues.ts';

/**
 * The bar's sweep: each hover draws its block a new colour from the What's Color list; the page
 * you are on keeps its own block and only changes that block's colour while hovered.
 */
export function initSweep(): void {
  for (const word of document.querySelectorAll<HTMLElement>('.top [data-roll]')) {
    const here = () => word.getAttribute('aria-current') === 'page';
    const enter = () => {
      const n = nextHue();
      if (n < 0) return;
      word.style.setProperty(here() ? '--bar-swatch' : '--fx-paint', `var(--neg-${n})`);
    };
    const leave = () => { if (here()) word.style.removeProperty('--bar-swatch'); };
    word.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') enter(); });
    word.addEventListener('focus', () => { if (word.matches(':focus-visible')) enter(); });
    word.addEventListener('pointerleave', leave);
    word.addEventListener('blur', leave);
  }
}
