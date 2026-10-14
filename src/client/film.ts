import { isPlainClick, reduceMotion } from './env.ts';

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
  if (!film) return;

  /*
   * The crossing point, as a mark in the page rather than a number worked out
   * again here: half a screen plus half the bar below the top, less the lift,
   * which is where the film's bottom edge meets the bar. It is placed by the
   * stylesheet along with the rest of the arithmetic, so there is one place
   * this is decided and the two states cannot come to disagree about it.
   */
  const mark = document.createElement('div');
  mark.className = 'wc-film-mark';
  mark.setAttribute('aria-hidden', 'true');
  film.append(mark);

  /*
   * Measured once rather than watched.
   *
   * An observer used to report the crossing, and it arrived late: observers are
   * delivered after layout, a frame or more behind the scroll that caused them,
   * so the bar held at the middle a beat too long and then caught up in one
   * step. At any speed above a crawl that step is visible, and it is the jolt
   * at the hand-over.
   *
   * Comparing the scroll against a number costs nothing and happens in the same
   * frame as the scroll itself. The number is safe to keep: the film occupies
   * the same place in the page in both states — that is what `main` giving back
   * the bar's margin is for — so the mark does not move when the class changes,
   * and reading it cannot feed back into itself.
   */
  let crossing = 0;
  let past: boolean | null = null;

  const measure = () => { crossing = mark.getBoundingClientRect().top + window.scrollY; };

  const update = () => {
    const now = window.scrollY >= crossing;
    // Only ever written when it changes, so a scroll costs one comparison.
    if (now === past) return;
    past = now;
    document.body.classList.toggle('is-film-past', now);
  };

  measure();
  update();

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => {
    // The class decides nothing about where the mark sits, but it does decide
    // where the bar sits, so settle the measurement before judging against it.
    measure();
    update();
  });

  samePageLinks();
}

/**
 * The two links in the bar that point at this page, when you are already on it.
 *
 * The film and the names live on one page, so from anywhere else the bar's two
 * halves are ordinary links to two places in it: the wordmark to the top, where
 * the film is, and the section's own name to the names below. From another page
 * the browser does the work and lands where the link says.
 *
 * From this page it would do nothing at all — the wordmark's href is the page
 * you are reading — so the view is moved by hand instead, and smoothly, since
 * the whole point is to show that the names are further down the same page
 * rather than somewhere else.
 *
 * The address is corrected to match, so that reloading, or coming back, returns
 * to the part you were actually looking at. Replaced rather than pushed: moving
 * within a page is not a step to be undone with the back button.
 */
function samePageLinks(): void {
  const names = document.getElementById('whats-color');

  const go = (link: HTMLAnchorElement | null, to: () => number, href: string) => {
    if (!link) return;
    link.addEventListener('click', (event) => {
      // A modified click means "open this elsewhere", and a link to another page
      // is left to be a link.
      if (!isPlainClick(event) || link.pathname !== window.location.pathname) return;
      event.preventDefault();
      window.history.replaceState(null, '', href);
      window.scrollTo({ top: to(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  };

  go(document.querySelector<HTMLAnchorElement>('.wordmark'), () => 0, window.location.pathname);
  if (names) {
    go(
      document.querySelector<HTMLAnchorElement>('.top-soon'),
      () => names.getBoundingClientRect().top + window.scrollY,
      '#whats-color',
    );
  }
}
