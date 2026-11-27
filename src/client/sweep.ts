import { nextHue } from './hues.ts';

/**
 * The bar's sweep: each hover draws its block a new colour from the What's Color list; the page
 * you are on keeps its own block and only changes that block's colour while hovered.
 */
export function initSweep(): void {
  for (const word of document.querySelectorAll<HTMLElement>('.top [data-roll]')) {
    // On the opening page the block only comes out once the film has passed (00-base.css).
    const here = () => word.getAttribute('aria-current') === 'page'
      && !document.querySelector('.has-film:not(.is-film-past)');
    let tinted = false;
    const enter = () => {
      const n = nextHue();
      if (n < 0) return;
      tinted = here();
      word.style.setProperty(tinted ? '--bar-swatch' : '--fx-paint', `var(--neg-${n})`);
    };
    const leave = () => { if (tinted) word.style.removeProperty('--bar-swatch'); tinted = false; };
    word.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') enter(); });
    word.addEventListener('focus', () => { if (word.matches(':focus-visible')) enter(); });
    word.addEventListener('pointerleave', leave);
    word.addEventListener('blur', leave);
  }
}
