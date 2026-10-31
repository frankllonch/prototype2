import { nextHue } from './hues.ts';

/**
 * Paints the page you are on, in the bar, as a block of colour.
 *
 * The colour comes from the site's one list and is drawn the one way —
 * `nextHue` — so this answers like everything else that answers in colour: a
 * different hue each time the page is opened, and never the same twice running.
 *
 * It is handed over as `--neg-N` rather than `--hue-N` because the bar blends
 * with `difference`, and what that paints is the distance between the backdrop
 * and the colour given to it. Over the page's white that turns the negative
 * back into the hue itself; handing it the hue would paint the hue's opposite.
 * The same reason the type in the bar is stored inverted.
 *
 * The rise is the other half. The block is meant to touch the top of the
 * screen, so it has to climb however far the item happens to sit below the
 * bar's own edge — 25.6px on most pages, and something else on the opening
 * page, where the bar is a fixed height with its one line centred in it.
 * Rather than keep two numbers in step with rules that may move again, it is
 * measured.
 *
 * Measured off an item that is *not* the one being painted, which matters: the
 * swatch climbs by giving itself that much padding and taking the same amount
 * back as margin, so reading the painted item would be reading a number this
 * had already moved. Its neighbours share its line and never carry a swatch.
 */
export function initCurrent(): void {
  const bar = document.querySelector<HTMLElement>('.top');
  const here = bar?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!bar || !here) return;

  const n = nextHue();
  if (n >= 0) here.style.setProperty('--bar-swatch', `var(--neg-${n})`);

  const neighbour = [...bar.querySelectorAll<HTMLElement>('a, button')].find((el) => el !== here);
  if (!neighbour) return;

  const rise = () => {
    const gap = neighbour.getBoundingClientRect().top - bar.getBoundingClientRect().top;
    // Floored at nothing: a bar that has not laid out yet should leave the
    // stylesheet's own figure standing rather than pull the block off the top.
    if (gap > 0) bar.style.setProperty('--bar-rise', `${gap.toFixed(1)}px`);
  };

  rise();
  window.addEventListener('resize', rise);
}
