/**
 * Switches the bar between its two resting states over the opening film.
 *
 * The motion has three phases: held on the middle line while the film runs,
 * then travelling on the film's bottom edge, then pinned at the top. The last
 * two are one `position: sticky` — the bar's place in flow is the film's bottom
 * edge, so it rides that edge and `top: 0` catches it. The first is
 * `position: fixed`.
 *
 * Both are states the browser holds by itself, which is the whole point of
 * doing it this way. An earlier version kept the bar on the middle line by
 * rewriting its transform on every scroll event, and that visibly shook: the
 * scroll is composited and the transform is not, so the bar arrived a frame
 * late and appeared to resist the scroll. Nothing here runs per frame now. The
 * only work is adding a class once, at the single point where the two states
 * meet, and at that point they agree on where the bar is — the film's bottom
 * edge has just reached the middle line — so the swap is invisible.
 *
 * Found with an observer rather than a scroll handler, so there is no listener
 * on the scroll at all: a one-pixel mark is placed at the crossing point and
 * the browser reports when it passes the top of the screen.
 *
 * The two states are laid out to occupy the same space, so nothing reflows when
 * they swap: fixed, the bar is out of flow and `main` starts at the top; sticky,
 * the bar takes a screen of top margin and `main` is pulled back by exactly
 * that much again. The film sits in the same place either way and the page is
 * the same height, so the scroll position cannot jump.
 */
export function initFilm(): void {
  const film = document.querySelector<HTMLElement>('.wc-film');
  if (!film || !('IntersectionObserver' in window)) return;

  /*
   * The crossing point, as a mark in the page rather than a number to compare
   * against: half a screen plus half the bar below the top, which is where the
   * film's bottom edge meets the middle line. Its position is in the stylesheet
   * with the rest of the arithmetic, so there is one place this is decided.
   */
  const mark = document.createElement('div');
  mark.className = 'wc-film-mark';
  mark.setAttribute('aria-hidden', 'true');
  film.append(mark);

  const watch = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      // Above the top of the screen, not merely out of sight: before the first
      // scroll the mark is below the fold, which is also not intersecting.
      const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      document.body.classList.toggle('is-film-past', past);
    },
    { threshold: 0 },
  );
  watch.observe(mark);
}
