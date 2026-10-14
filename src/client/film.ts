/**
 * Holds the bar on the middle line while the opening film runs behind it.
 *
 * The other two phases are the stylesheet's: the bar is sticky with its resting
 * place in flow at the film's bottom edge, so once that edge rises past it the
 * bar travels on it, and `top: 0` pins it when it reaches the top. What CSS
 * cannot do is the first phase — holding the bar *above* where it would
 * naturally sit, which is what `bottom` on a sticky box is for, except that a
 * box with both offsets set and room to fit takes the top one and ignores the
 * other. So that one clamp is applied here and nothing else is.
 *
 * The shift is `min(0, middle − natural)`: negative while the film's bottom is
 * below the middle line, which lifts the bar to it, and exactly zero from the
 * moment the two meet. There is no second mode and no threshold to cross — the
 * handover is the point where the expression reaches zero, so it cannot jump.
 *
 * Measured off the film rather than off the bar, because the bar's own box is
 * what this moves; reading it back would feed the result into its own input.
 */
export function initFilm(): void {
  const bar = document.querySelector<HTMLElement>('.top');
  const film = document.querySelector<HTMLElement>('.wc-film');
  if (!bar || !film) return;

  const place = () => {
    // Where the bar would sit with no help: the film's bottom edge on screen.
    const natural = film.getBoundingClientRect().bottom;
    const middle = (window.innerHeight - bar.offsetHeight) / 2;
    const shift = Math.min(0, middle - natural);
    // Left off entirely once it is nil, so the bar carries no transform — and
    // so no stacking context it did not already have — for most of the page.
    bar.style.transform = shift < 0 ? `translateY(${shift.toFixed(1)}px)` : '';
  };

  /*
   * Run straight off the scroll event rather than waiting on a frame callback.
   * The work is one measurement and one transform, which is what a compositor
   * handles without a repaint; deferring it to `requestAnimationFrame` would
   * buy nothing and would leave the bar wherever it was on any page that never
   * gets a frame — a background tab, or a browser that has stopped animating.
   */
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
  place();
}
