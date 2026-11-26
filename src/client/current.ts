import { nextHue, pageHue } from './hues.ts';

/** Paints the page you are on, in the bar, as a block of colour. */
export function initCurrent(): void {
  const bar = document.querySelector<HTMLElement>('.top');
  const here = bar?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!bar || !here) return;

  // Drawn in the head before the first paint (components/layout.ts), so the block is never seen in
  // another colour first.
  if (pageHue() < 0) {
    const n = nextHue();
    if (n >= 0) {
      document.documentElement.style.setProperty('--bar-swatch', `var(--neg-${n})`);
      // The question in the opening note wears the same colour as the block in the bar, so the two
      // read as one mark.
      document.documentElement.style.setProperty('--wc-ask', `var(--hue-${n})`);
    }
  }

  const rise = () => {
    const applied = parseFloat(getComputedStyle(here).paddingTop) || 0;
    const gap = here.getBoundingClientRect().top + applied - bar.getBoundingClientRect().top;
    // Written to its own name, not to --bar-rise: the stylesheet keeps that one as the knob,
    // falling back to this measurement, so a figure set by hand there is not overwritten by an
    // inline style from here.
    if (gap > 0) bar.style.setProperty('--bar-rise-measured', `${gap.toFixed(1)}px`);
  };

  rise();
  window.addEventListener('resize', rise);
  // The type's own face can arrive after the first measurement and move the line; measured again
  // once it has.
  void document.fonts?.ready.then(rise);
  // On the opening page the bar changes footing as the film passes, and the block only shows once
  // it has; measured again whenever that state turns.
  if (document.body.classList.contains('has-film')) {
    new MutationObserver(rise).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.body.classList.contains('has-film')) split(here);
}

/** Two copies of the name, for the stretch where the film is still passing it. */
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
