import { isPlainClick, reduceMotion } from './env.ts';
import { glide } from './glide.ts';
import { writtenPoint } from './write.ts';

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
/**
 * Starts the film, and copes with being told no.
 *
 * `autoplay muted playsinline` is the whole of what a browser asks for and the
 * film still would not run in Safari, which is stricter in two ways. It takes
 * `preload` at its word, so `metadata` could leave it holding one frame and
 * nothing to play; that is now `auto`. And it refuses outright in Low Power
 * Mode, or when the reader has set this site to Never Auto-Play — neither of
 * which is a fault to be worked around, but both of which left the picture
 * frozen on its first frame for good, because nothing in the page ever asked
 * it to play.
 *
 * So: ask, and if the answer is no, wait for the reader to touch the page and
 * ask once more. A gesture is the one thing that lifts the restriction, and by
 * then they have decided to be here. If they never do, the poster stands, which
 * is what it is for.
 *
 * `muted` is set as a property and not trusted to the attribute alone: Safari
 * decides whether a video may autoplay from the property, and an attribute that
 * has not been reflected yet is the oldest reason for a silent refusal.
 */
function startFilm(): void {
  const video = document.querySelector<HTMLVideoElement>('.wc-film-video');
  // Withheld entirely for reduced motion, where the stylesheet hides it and the
  // poster is the picture.
  if (!video || reduceMotion.matches) return;

  video.muted = true;
  video.playsInline = true;

  const ask = () =>
    video.play().then(
      () => true,
      (error: unknown) => {
        // Said once, in the console, so a refusal can be told apart from a
        // fault: NotAllowedError is the browser's autoplay policy (Low Power
        // Mode, or the site set to Never Auto-Play); anything else is the file.
        const name = error instanceof DOMException ? error.name : String(error);
        console.info(`[film] the browser declined to start the film: ${name}`);
        return false;
      },
    );

  const onGesture = () => {
    for (const type of GESTURES) window.removeEventListener(type, onGesture);
    void ask();
  };

  void ask().then((playing) => {
    if (playing) return;
    for (const type of GESTURES) {
      window.addEventListener(type, onGesture, { passive: true, once: false });
    }
  });

  // Safari stops the film with the tab and does not always take it up again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && video.paused) void ask();
  });
}

/**
 * What counts as the reader having arrived, for a browser that wanted asking —
 * the events a browser itself treats as a gesture, since only those lift the
 * restriction. A scroll is not one in any browser and a touch's start is not
 * one in Safari, where the touch's end is; listening for those only ever
 * spent the one retry on a play() that was bound to be refused again.
 */
const GESTURES = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'] as const;

/**
 * How far the film's bottom edge sits below the top of the bar.
 *
 * The stylesheet cannot work this out. The menu is sized in `vw`, so the line
 * it sets grows with the window, while the bar's own height is in `rem` and
 * the lift was a flat 50px — so on a wide monitor the line, and the block
 * behind the current name, slid down the bar and came to rest on the white
 * below the film instead of on the picture. Measured: the block cleared the
 * edge by 7px at 1440, hung 0.5px below it at 1920 and 10.6px below at 2560.
 *
 * So the figure is taken from the thing itself. The block's own bottom is
 * found, and the edge is put `CLEAR` below it — which reproduces at every
 * width what 1440 already had, since that is where the 7px comes from. The
 * rest of the opening follows on its own: the sticky margins, the crossing
 * mark and the clip that draws the edge are all written in terms of the lift,
 * so moving it moves them together and the two states cannot disagree.
 *
 * Written to its own name so the stylesheet keeps `--film-lift` as the knob,
 * falling back to the hand-set figure when this has not run.
 */
const CLEAR = 7;

function liftToEdge(): void {
  const bar = document.querySelector<HTMLElement>('.top');
  if (!bar) return;

  // The painted block where there is one, since that is what was seen sitting
  // below the picture; any name in the menu otherwise, whose box is its line.
  const item = bar.querySelector<HTMLElement>('[aria-current="page"]')
    ?? bar.querySelector<HTMLElement>('.menu a');
  if (!item) return;

  const measure = () => {
    const trim = Number.parseFloat(getComputedStyle(bar).getPropertyValue('--bar-trim')) || 0;
    const end = item.getBoundingClientRect().bottom - trim - bar.getBoundingClientRect().top;
    // A bar that has not laid out yet should leave the stylesheet's figure
    // standing rather than pull the edge up over the type.
    if (end > 0) document.body.style.setProperty('--film-lift-measured', `${(end + CLEAR).toFixed(1)}px`);
  };

  measure();
  window.addEventListener('resize', measure);
  // The face the type is set in can arrive after the first measurement and
  // move the line; measured again once it has.
  void document.fonts?.ready.then(measure);
}

export function initFilm(): void {
  const film = document.querySelector<HTMLElement>('.wc-film');
  if (!film) return;

  liftToEdge();
  startFilm();

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

  /*
   * A second line, further down: where the film has left the screen entirely.
   *
   * The first says the bar has stopped travelling with the film's edge, which
   * is not the same thing — the bar settles a little inside that edge, so for
   * the rest of the film's run it is still over the picture. Anything that
   * belongs to the page rather than to the film waits for this one instead.
   */
  let gone = 0;
  let cleared: boolean | null = null;

  const measure = () => {
    const top = window.scrollY;
    crossing = mark.getBoundingClientRect().top + top;
    gone = film.getBoundingClientRect().bottom + top;
  };

  const update = () => {
    const y = window.scrollY;
    // Only ever written when it changes, so a scroll costs two comparisons.
    const now = y >= crossing;
    if (now !== past) {
      past = now;
      document.body.classList.toggle('is-film-past', now);
    }
    const clear = y >= gone;
    if (clear !== cleared) {
      cleared = clear;
      document.body.classList.toggle('is-film-gone', clear);
    }
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
      glide(to());
    });
  };

  go(document.querySelector<HTMLAnchorElement>('.wordmark'), () => 0, window.location.pathname);
  if (names) {
    go(
      document.querySelector<HTMLAnchorElement>('.top-soon'),
      // Through the writing, not past it: while the note writes itself on
      // scroll, the travel runs the whole sentence and stops where it stands
      // written, with the names still below. On any other footing — motion
      // reduced, no scroll-run animations — the names themselves are the place.
      () => writtenPoint() ?? names.getBoundingClientRect().top + window.scrollY,
      '#whats-color',
    );
  }
}
