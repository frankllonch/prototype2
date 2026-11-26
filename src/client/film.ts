import { isPlainClick, phone, reduceMotion } from './env.ts';
import { glide } from './glide.ts';
import { writtenPoint } from './write.ts';

/** Starts the film, and copes with the browser refusing autoplay. */
function startFilm(): void {
  const video = document.querySelector<HTMLVideoElement>('.wc-film-video');
  // Withheld entirely for reduced motion, where the stylesheet hides it and the poster is the
  // picture.
  if (!video || reduceMotion.matches) return;

  /* Not on a phone, where the start page opens on the menu and the film is not shown at all. */
  if (phone.matches) {
    phone.addEventListener('change', () => { if (!phone.matches) { video.load(); startFilm(); } }, { once: true });
    return;
  }

  const still = video.dataset.poster;
  if (still && !video.hasAttribute('poster')) video.poster = still;

  video.muted = true;
  video.playsInline = true;

  const ask = () =>
    video.play().then(
      () => true,
      (error: unknown) => {
        // Said once, in the console, so a refusal can be told apart from a fault: NotAllowedError
        // is the browser's autoplay policy (Low Power Mode, or the site set to Never Auto-Play).
        const name = error instanceof DOMException ? error.name : String(error);
        console.info(`[film] the browser declined to start the film: ${name}`);
        return false;
      },
    );

  const onGesture = () => {
    // Kept for when there is a film on screen to start.
    if (phone.matches) return;
    for (const type of GESTURES) window.removeEventListener(type, onGesture);
    if (!away) void ask();
  };

  /* Stopped once the reader has scrolled down to What's Color? */
  let away = false;
  const film = video.closest<HTMLElement>('.wc-film') ?? video;
  new IntersectionObserver(
    ([entry]) => {
      away = !entry || entry.intersectionRatio < 0.15;
      if (away) video.pause();
      else if (video.paused && !phone.matches) void ask();
    },
    { threshold: [0, 0.15] },
  ).observe(film);

  initSound(video, () => (away ? Promise.resolve(false) : ask()));

  void ask().then((playing) => {
    if (playing) return;
    for (const type of GESTURES) {
      window.addEventListener(type, onGesture, { passive: true, once: false });
    }
  });

  // Safari stops the film with the tab and does not always take it up again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && video.paused && !phone.matches && !away) void ask();
  });

  // Below 900px the film is not shown, and a film that is only hidden goes on decoding: stopped
  // there, and taken up again where it was when the window is wide enough to show it.
  phone.addEventListener('change', () => {
    if (phone.matches) video.pause();
    else if (!away) void ask();
  });
}

/** The sound button in the film's corner (components/whats-color.ts). */
function initSound(video: HTMLVideoElement, ask: () => Promise<boolean>): void {
  const sound = document.querySelector<HTMLButtonElement>('.wc-film-sound');
  if (!sound) return;
  sound.hidden = false;

  const show = (on: boolean) => {
    sound.setAttribute('aria-pressed', String(on));
    sound.setAttribute('aria-label', on ? 'Sound off' : 'Sound on');
  };

  sound.addEventListener('click', (event) => {
    event.preventDefault();
    const on = video.muted;
    video.muted = !on;
    show(on);
    if (!on) return;
    void video.play().catch(() => {
      video.muted = true;
      show(false);
      void ask();
    });
  });
}

/**
 * What counts as the reader having arrived, for a browser that wanted asking —
 * the events a browser itself treats as a gesture, since only those lift the
 * restriction.
 */
const GESTURES = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'] as const;

/** How far the film's bottom edge sits below the top of the bar. */
const CLEAR = 7;

function liftToEdge(): void {
  const bar = document.querySelector<HTMLElement>('.top');
  if (!bar) return;

  // The painted block where there is one, since that is what was seen sitting below the picture;
  // any name in the menu otherwise, whose box is its line.
  const item = bar.querySelector<HTMLElement>('[aria-current="page"]')
    ?? bar.querySelector<HTMLElement>('.menu a');
  if (!item) return;

  const measure = () => {
    const trim = Number.parseFloat(getComputedStyle(bar).getPropertyValue('--bar-trim')) || 0;
    const end = item.getBoundingClientRect().bottom - trim - bar.getBoundingClientRect().top;
    // A bar that has not laid out yet should leave the stylesheet's figure standing rather than
    // pull the edge up over the type.
    if (end > 0) document.body.style.setProperty('--film-lift-measured', `${(end + CLEAR).toFixed(1)}px`);
  };

  measure();
  window.addEventListener('resize', measure);
  // The face the type is set in can arrive after the first measurement and move the line; measured
  // again once it has.
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
   * which is where the film's bottom edge meets the bar.
   */
  const mark = document.createElement('div');
  mark.className = 'wc-film-mark';
  mark.setAttribute('aria-hidden', 'true');
  film.append(mark);

  /* Measured once rather than watched. */
  let crossing = 0;
  let past: boolean | null = null;

  /* A second line, further down: where the film has left the screen entirely. */
  let gone = 0;
  let cleared: boolean | null = null;

  const measure = () => {
    // On a phone the film is not displayed, so there is nothing to cross: its boxes all measure
    // nothing, and a line read off them would be wherever the page happened to stand.
    if (phone.matches) { crossing = -1; gone = -1; return; }
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
    // The class decides nothing about where the mark sits, but it does decide where the bar sits,
    // so settle the measurement before judging against it.
    measure();
    update();
  });
  phone.addEventListener('change', () => { measure(); update(); });

  samePageLinks();
}

/** The two links in the bar that point at this page, when you are already on it. */
function samePageLinks(): void {
  const names = document.getElementById('whats-color');

  const go = (link: HTMLAnchorElement | null, to: () => number, href: string) => {
    if (!link) return;
    link.addEventListener('click', (event) => {
      // A modified click means "open this elsewhere", and a link to another page is left to be a
      // link.
      if (!isPlainClick(event) || link.pathname !== window.location.pathname) return;
      // On a phone these two are the menu's (client/menu.ts): the wordmark leads to the start
      // screen and the name to the page under it.
      if (phone.matches) return;
      event.preventDefault();
      window.history.replaceState(null, '', href);
      glide(to());
    });
  };

  go(document.querySelector<HTMLAnchorElement>('.wordmark'), () => 0, window.location.pathname);
  if (names) {
    go(
      document.querySelector<HTMLAnchorElement>('.top-soon'),
      // Through the writing, not past it: while the note writes itself on scroll, the travel runs
      // the whole sentence and stops where it stands written, with the names still below.
      () => writtenPoint() ?? names.getBoundingClientRect().top + window.scrollY,
      '#whats-color',
    );
  }
}
