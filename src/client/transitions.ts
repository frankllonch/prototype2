import { isPlainClick, phone, reduceMotion } from './env.ts';
import { nextHue } from './hues.ts';
import { replayRise, rises } from './rise.ts';

/**
 * Moving between pages, and the loading screen that precedes the first one.
 *
 * Arriving is handled in CSS — a sheet of paper over the page, fading off — so it
 * needs nothing from here and cannot be broken by this file failing to load.
 * Leaving is the part that needs script: a browser navigates the instant a link
 * is clicked, so the only way to fade the old page out is to hold the navigation
 * back for the length of the fade and then go.
 *
 * This replaced `@view-transition`, which never ran. Cross-document view
 * transitions are skipped silently wherever they are unimplemented and cannot be
 * feature-detected, so there was no way to tell the difference between a browser
 * that did not support them and a site that had them wrong.
 */
export const OUT_MS = 420;
/** Never hold a navigation longer than this, whatever the timer does. */
const LEAVE_GUARD = 700;
/** If the navigation has not happened by now, assume it never will. */
export const ABANDONED = 6000;
/** The note the start page leaves for the page it is going to. */
export const HELD_KEY = 'cv-held';
/**
 * When to stop trusting the entrance animations and simply show the page.
 *
 * Comfortably past the longest of them (0.1 + 0.9), so in the ordinary case the
 * animations have finished and this changes nothing visible. It exists for the
 * case where they never advance at all — a document whose animation timeline has
 * not started, which is what a tab loaded in the background is — where without it
 * a perfectly loaded page sits behind an opaque sheet with its content at zero
 * opacity, looking for all the world as though it failed to load.
 */
const REVEAL_GUARD = 1600;

export function initTransitions(): void {
  const root = document.documentElement;

  /**
   * One departure at a time, held here rather than per click.
   *
   * Clicking a second link during the fade has to change where we are going, not
   * queue a second navigation behind the first: the first one's timer fires
   * earlier, the document unloads, and the later click is discarded without
   * trace. Changing the destination instead means the last thing you clicked is
   * the one you get.
   */
  let target = '';
  let gone = false;
  /*
   * A link marked `data-replace` takes the place of this page in the history
   * rather than adding to it — walking from one painting to the next leaves
   * the gallery one step back, however far the walk went.
   */
  let replace = false;
  const go = () => {
    if (gone || !target) return;
    gone = true;
    if (replace) location.replace(target); else location.href = target;
  };

  /**
   * Back-button navigations restore the page from the back/forward cache exactly
   * as it was left — including, on the page we faded out to leave, the class
   * that faded it and the departure that was in flight. Without this, going back
   * lands under an opaque sheet with every link already spoken for.
   */
  const arrive = () => {
    root.classList.remove('is-leaving', 'is-leaving-start', 'is-leaving-to-start');
    document.querySelector('.top .is-chosen')?.classList.remove('is-chosen');
    delete root.dataset.leaveMs;
    target = ''; gone = false; replace = false;
  };
  window.addEventListener('pageshow', (event) => {
    arrive();
    /*
     * Back on What's Color from the back/forward cache, below the film. Taking
     * `is-leaving` off hands the bar's block from its lift straight to the
     * film's scroll-driven reveal, which at this scroll is already over — so
     * the block would pop back in one frame, where every other page drops it
     * again. The same drop is asked for here, for as long as it runs.
     */
    if (event.persisted && document.body.classList.contains('has-film')) {
      root.classList.add('wc-swatch-drop');
      window.setTimeout(() => root.classList.remove('wc-swatch-drop'), 600);
    }
  });
  window.addEventListener('popstate', arrive);
  arrive();

  // Armed before anything else can fail: whatever happens below, the page shows.
  window.setTimeout(() => root.classList.add('is-revealed'), REVEAL_GUARD);

  if (reduceMotion.matches) return;

  document.addEventListener('click', (event) => {
    // Anything already handled — a tile opening the lightbox, a link raising a
    // panel — has called preventDefault by the time this reaches the document,
    // and is not a navigation at all.
    if (event.defaultPrevented || !isPlainClick(event)) return;

    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    // The section you are on, clicked again in the bar: back to its top, out
    // of any panel open on it, and its content rises once more (Frank,
    // 2026-11-17). It used to reload the page.
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
    // The way out of the start page is under way and has a name in its
    // colour already: it runs to the end rather than starting over elsewhere.
    if (root.classList.contains('is-leaving-start') || root.classList.contains('is-leaving-to-start')) return;
    const first = !target;
    target = url.href;
    replace = link.hasAttribute('data-replace');
    const start = fromStart(link) ? choose(link, url) : toStart(link, url) ? goBack(url) : 0;
    root.classList.add('is-leaving');
    if (!first) return;   // already counting down; only the destination changed

    // Longer when the phone's menu is on its way out first (client/menu.ts):
    // the next page waits for the bars to stand straight again. Longer again
    // from the start page, where the bar climbs to the top first.
    const wait = Math.max(start || OUT_MS, Number(root.dataset.leaveMs) || 0);
    window.setTimeout(go, wait);
    // A tab backgrounded mid-fade may never run the first timer; the guard is
    // what stops a click from being swallowed entirely.
    window.setTimeout(go, Math.max(LEAVE_GUARD, wait + 280));
    /*
     * And if the navigation never commits at all — the load is stopped, or the
     * URL turns out to be something the browser downloads rather than opens —
     * this document stays, and must not stay behind an opaque sheet. Taking the
     * class off runs the veil's entrance again, so the page fades back rather
     * than snapping.
     */
    window.setTimeout(() => { if (!document.hidden) arrive(); }, ABANDONED);
  });
}

/**
 * From the start page to another page, by the bar (Frank, 2026-11-17).
 *
 * There the bar stands across the middle of the film. Going to What's Color
 * it climbs to the top with the film and the colour comes out under the
 * name; going anywhere else it used to stay where it was while the page
 * faded, and the next page then opened with the bar at the top — a jump.
 * Now it does the same climb: the film goes to paper, the bar slides up to
 * where it stands on every other page, the colour drops onto the name you
 * chose, and the page you chose comes up under a bar already standing just
 * so. The colour is handed over in a note, so the next page wears it from
 * its first frame and does not drop it a second time (components/layout.ts).
 *
 * Only while the bar is still on the film's middle line: once it has
 * climbed it is the ordinary bar, and leaves as it does everywhere.
 */
function fromStart(link: HTMLAnchorElement): boolean {
  return document.body.classList.contains('has-film')
    && !document.body.classList.contains('is-film-past')
    && !phone.matches
    && link.closest('.top') !== null;
}

/**
 * Marks the choice and says how long the way out takes, in milliseconds: the
 * four beats as the stylesheet sets them (THE WAY OUT OF THE START PAGE in
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

  return beats('--start-veil', '--start-pause', '--start-climb', '--start-swatch', '--start-hold');
}

/** The sum of the stylesheet's beats named, in milliseconds. */
function beats(...names: string[]): number {
  const style = getComputedStyle(document.documentElement);
  const ms = (name: string) => {
    const v = style.getPropertyValue(name).trim();
    return (Number.parseFloat(v) || 0) * (v.endsWith('ms') ? 1 : 1000);
  };
  return names.reduce((total, name) => total + ms(name), 0) || 1100;
}

/**
 * And back (Frank, 2026-11-17): from any other page to the start page by the
 * name at the top left, the way out run backwards. The block lifts off this
 * page's name as the page goes to paper, the bar comes down to the film's
 * middle line, waits, and the start page comes up under it with the film
 * fading in — told so by a note, as the way out tells the page it goes to.
 */
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
  return beats('--start-veil', '--start-climb', '--start-pause');
}
