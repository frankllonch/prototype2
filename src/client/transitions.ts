import { cssMs, isPlainClick, phone, reduceMotion, targetElement } from './env.ts';
import { nextHue } from './hues.ts';
import { replayRise, rises } from './rise.ts';

/** Moving between pages, and the loading screen that precedes the first one. */
export const OUT_MS = 420;
/** Never hold a navigation longer than this, whatever the timer does. */
const LEAVE_GUARD = 700;
/** If the navigation has not happened by now, assume it never will. */
export const ABANDONED = 6000;
/** The note the start page leaves for the page it is going to. */
export const HELD_KEY = 'cv-held';
/** When to stop trusting the entrance animations and simply show the page. */
const REVEAL_GUARD = 1600;

export function initTransitions(): void {
  const root = document.documentElement;

  /** One departure at a time, held here rather than per click. */
  let target = '';
  let gone = false;
  /*
   * A link marked `data-replace` takes the place of this page in the history
   * rather than adding to it — walking from one painting to the next leaves the
   * gallery one step back, however far the walk went.
   */
  let replace = false;
  const go = () => {
    if (gone || !target) return;
    gone = true;
    if (replace) location.replace(target); else location.href = target;
  };

  /**
   * Back-button navigations restore the page from the back/forward cache exactly
   * as it was left.
   */
  const arrive = () => {
    root.classList.remove('is-leaving', 'is-leaving-start', 'is-leaving-to-start');
    document.querySelector('.top .is-chosen')?.classList.remove('is-chosen');
    delete root.dataset.leaveMs;
    target = ''; gone = false; replace = false;
  };
  window.addEventListener('pageshow', (event) => {
    arrive();
    /* Back on What's Color from the back/forward cache, below the film. */
    if (event.persisted && document.body.classList.contains('has-film')) {
      root.classList.add('wc-swatch-drop');
      window.setTimeout(() => root.classList.remove('wc-swatch-drop'), 600);
    }
  });
  window.addEventListener('popstate', arrive);
  arrive();

  /*
   * Back at the start page by the name, the bar comes down once (00-base.css,
   * `bar-descend`) — once.
   */
  if (root.classList.contains('arrive-start')) {
    const bar = document.querySelector<HTMLElement>('.top');
    const done = (event: AnimationEvent) => {
      if (event.target !== bar || event.animationName !== 'bar-descend') return;
      root.classList.add('start-arrived');
    };
    bar?.addEventListener('animationend', done);
    bar?.addEventListener('animationcancel', done);
  }

  // Armed before anything else can fail: whatever happens below, the page shows.
  window.setTimeout(() => root.classList.add('is-revealed'), REVEAL_GUARD);

  if (reduceMotion.matches) return;

  document.addEventListener('click', (event) => {
    // Anything already handled — a tile opening the lightbox, a link raising a panel — has called
    // preventDefault by the time this reaches the document, and is not a navigation at all.
    if (event.defaultPrevented || !isPlainClick(event)) return;

    const link = targetElement(event)?.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    // The section you are on, clicked again in the bar: back to its top, out of any panel open on
    // it, and its content rises once more.
    if (url.pathname === location.pathname && url.search === location.search && !url.hash
      && link.closest('.top') && rises()) {
      event.preventDefault();
      document.querySelector<HTMLElement>('.panel.is-open [data-panel-close]')?.click();
      window.scrollTo({ top: 0, behavior: 'instant' });
      replayRise();
      return;
    }
    // A link to somewhere on this same page is a jump, not a departure.
    if (url.pathname === location.pathname && url.search === location.search) return;

    event.preventDefault();
    // The way out of the start page is under way and has a name in its colour already: it runs to
    // the end rather than starting over elsewhere.
    if (root.classList.contains('is-leaving-start') || root.classList.contains('is-leaving-to-start')) return;
    const first = !target;
    target = url.href;
    replace = link.hasAttribute('data-replace');
    const start = fromStart(link) ? choose(link, url) : toStart(link, url) ? goBack(url) : 0;
    root.classList.add('is-leaving');
    if (!first) return;   // already counting down; only the destination changed

    // Longer when the phone's menu is on its way out first (client/menu.ts): the next page waits
    // for the bars to stand straight again.
    const wait = Math.max(start || OUT_MS, Number(root.dataset.leaveMs) || 0);
    window.setTimeout(go, wait);
    // A tab backgrounded mid-fade may never run the first timer; the guard is what stops a click
    // from being swallowed entirely.
    window.setTimeout(go, Math.max(LEAVE_GUARD, wait + 280));
    /*
     * And if the navigation never commits at all — the load is stopped, or the
     * URL turns out to be something the browser downloads rather than opens.
     */
    window.setTimeout(() => { if (!document.hidden) arrive(); }, ABANDONED);
  });
}

/** From the start page to another page, by the bar. */
function fromStart(link: HTMLAnchorElement): boolean {
  return document.body.classList.contains('has-film')
    && !document.body.classList.contains('is-film-past')
    && !phone.matches
    && link.closest('.top') !== null;
}

/**
 * Marks the choice and says how long the way out takes, in milliseconds: the
 * beats as the stylesheet sets them (THE WAY OUT OF THE START PAGE in
 * 00-base.css), so the timings live in one place.
 */
function choose(link: HTMLAnchorElement, url: URL): number {
  const root = document.documentElement;
  document.querySelector('.top .is-chosen')?.classList.remove('is-chosen');
  const n = nextHue();
  if (n >= 0) link.style.setProperty('--bar-swatch', `var(--neg-${n})`);
  // Restarted, for a second choice made while the first is still dropping.
  void link.offsetWidth;
  link.classList.add('is-chosen');
  root.classList.add('is-leaving-start');
  try {
    sessionStorage.setItem(HELD_KEY, JSON.stringify({ path: url.pathname, hue: n, at: Date.now() }));
  } catch { /* private window: the next page simply drops its own block */ }

  // Until the drop and what follows it, or until the film has gone, if the film is set to go after
  // the colour has dropped (a negative lead).
  const drop = beats('--start-pause', '--start-climb', '--start-settle');
  return Math.max(
    drop + beats('--start-swatch', '--start-hold'),
    drop - beats('--start-film-lead'),
  );
}

/** The sum of the stylesheet's beats named, in milliseconds. */
function beats(...names: string[]): number {
  const style = getComputedStyle(document.documentElement);
  return names.reduce((total, name) => total + cssMs(style, name), 0);
}

/** And back: from any other page to the start page by the name at the top left. */
function toStart(link: HTMLAnchorElement, url: URL): boolean {
  const home = document.querySelector<HTMLAnchorElement>('.top .wordmark');
  return !document.body.classList.contains('has-film')
    && !phone.matches
    && link.closest('.top') !== null
    && home !== null
    && url.pathname === new URL(home.href, location.href).pathname
    && url.hash === '';
}

function goBack(url: URL): number {
  document.documentElement.classList.add('is-leaving-to-start');
  try {
    sessionStorage.setItem(HELD_KEY, JSON.stringify({ path: url.pathname, start: true, at: Date.now() }));
  } catch { /* the start page simply opens as it always does */ }
  return beats('--start-veil');
}
