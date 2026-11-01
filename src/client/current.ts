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
 * Measured off the painted item itself. It used to be read off a neighbour,
 * on the assumption that everything in the bar shares one top — true in
 * Chromium, but the bar aligns its items on their baselines and Safari places
 * them differently, so the wordmark sat higher than the menu and the block
 * stopped short of the edge. The swatch climbs by giving itself padding and
 * taking the same back as margin, so the item's box has already moved by
 * whatever rise is applied; adding that back gives where the item really
 * sits, and the measurement corrects itself to the right figure on any engine.
 */
export function initCurrent(): void {
  const bar = document.querySelector<HTMLElement>('.top');
  const here = bar?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!bar || !here) return;

  const n = nextHue();
  if (n >= 0) here.style.setProperty('--bar-swatch', `var(--neg-${n})`);

  const rise = () => {
    const applied = parseFloat(getComputedStyle(here).paddingTop) || 0;
    const gap = here.getBoundingClientRect().top + applied - bar.getBoundingClientRect().top;
    // Written to its own name, not to --bar-rise: the stylesheet keeps that
    // one as the knob, falling back to this measurement, so a figure set by
    // hand there is not overwritten by an inline style from here.
    // Floored at nothing: a bar that has not laid out yet should leave the
    // stylesheet's own figure standing rather than pull the block off the top.
    if (gap > 0) bar.style.setProperty('--bar-rise-measured', `${gap.toFixed(1)}px`);
  };

  rise();
  window.addEventListener('resize', rise);
  // The type's own face can arrive after the first measurement and move the
  // line; measured again once it has.
  void document.fonts?.ready.then(rise);
  // On the opening page the bar changes footing as the film passes, and the
  // block only shows once it has; measured again whenever that state turns.
  if (document.body.classList.contains('has-film')) {
    new MutationObserver(rise).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.body.classList.contains('has-film')) split(here);
}

/**
 * Two copies of the name, for the stretch where the film is still passing it.
 *
 * On the opening page the bar travels up across the film before it settles, and
 * for that stretch the name is over the picture. The name on the block is drawn
 * black so the bar's `difference` turns it to paper — which only holds where
 * what lies behind is paper. Over the film it is dark on dark, and the name
 * simply went missing for the whole of that climb.
 *
 * So the name is drawn twice, each copy showing only its own side of the film's
 * bottom edge: the upper in the ink the bar wears over the film, with no block
 * behind it, and the lower in paper on the block. The edge sweeps down through
 * the two as the film clears, so the name is handed from one to the other a
 * letter at a time and is never absent from either.
 *
 * The copy is taken after the roll has built itself, so it carries the same
 * per-character spans and rolls with the original rather than sitting still
 * beside it. It is spoken by neither — the original is the one in the document's
 * reading, and this is a second drawing of it.
 */
function split(here: HTMLElement): void {
  const face = document.createElement('span');
  face.className = 'top-face';
  while (here.firstChild) face.append(here.firstChild);
  here.append(face);

  const echo = face.cloneNode(true) as HTMLElement;
  echo.className = 'top-echo';
  echo.setAttribute('aria-hidden', 'true');
  here.append(echo);
}
