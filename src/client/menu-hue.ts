import { nextHue } from './hues.ts';

/**
 * The page you are on is named in colour in the bar — a different one from the
 * site's list on every visit, the way the index rows answer the pointer.
 *
 * The bar is drawn as the difference of whatever passes under it, so the
 * colour is given as its negative (`--neg-N`) and comes out as itself over
 * paper. Without scripting the current page stays the brighter white it is in
 * the stylesheet.
 */
export function initMenuHue(): void {
  const current = document.querySelector<HTMLElement>('.top [aria-current="page"]');
  if (!current) return;
  const n = nextHue();
  if (n < 0) return;
  current.style.setProperty('--roll-color', `var(--neg-${n})`);
  current.style.color = `var(--neg-${n})`;
}
