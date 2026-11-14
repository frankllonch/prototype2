import { isPlainClick, phone } from './env.ts';
import { writtenPoint } from './write.ts';

/**
 * The bar on a phone: three bars at the top right, and the bar's own words —
 * the two names and the five pages — as a screen of their own behind them.
 *
 * It is the same <header class="top"> the desktop draws along the top edge;
 * the stylesheet lays it out as a full screen below 900px and keeps it out of
 * sight until the document says otherwise:
 *
 *   html.is-menu-open  raised by the hamburger, over whatever is on screen
 *   html.is-start      the start page's own first screen, where the film is on
 *                      a desktop. Set in the head before the first paint
 *                      (components/layout.ts), so the page under it is never
 *                      seen; it stands under About, which opens over it.
 *
 * The two look the same and differ in what putting them away means: a raised
 * menu goes back to the page as it was left; the start screen gives way to
 * What's Color?, which is the page it stands on.
 */
export function initMenu(): void {
  const root = document.documentElement;
  const bar = document.querySelector<HTMLElement>('.top');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (!bar || !toggle) return;

  const startPage = root.hasAttribute('data-start');
  // The page the panels here belong to. Read now, because in WordPress an open
  // panel puts its own address in the bar (client/panels.ts), and the menu's
  // link to the section would then look like a link to somewhere else.
  const index = new URL(
    document.querySelector<HTMLElement>('[data-panel-root]')?.dataset.panelRoot ?? location.href,
    location.href,
  ).pathname;
  const wordmark = bar.querySelector<HTMLAnchorElement>('.wordmark');
  const names = bar.querySelector<HTMLAnchorElement>('.top-soon');

  /** The same test the head makes. */
  const wantsStart = () =>
    startPage && phone.matches && (location.hash === '' || location.hash === '#about');
  const raised = () => root.classList.contains('is-menu-open');
  const atStart = () => root.classList.contains('is-start');

  /*
   * What is under the menu is out of reach while it shows: not tabbed into,
   * not read out. Raised, that is everything but the bar and its button; on
   * the start screen it is the page alone, since About opens over that screen
   * and has to answer.
   */
  const held = new Set<HTMLElement>();
  const sync = () => {
    const shown = raised() || atStart();
    toggle.setAttribute('aria-expanded', String(shown));
    for (const el of held) el.inert = false;
    held.clear();
    if (!shown) return;
    for (const el of document.body.children) {
      if (!(el instanceof HTMLElement) || el === bar || el === toggle) continue;
      if (el.tagName === 'SCRIPT' || el.classList.contains('skip-link')) continue;
      if (!raised() && el.id !== 'main') continue;
      el.inert = true;
      held.add(el);
    }
  };

  const raise = () => { root.classList.add('is-menu-open'); sync(); };
  const lower = () => { root.classList.remove('is-menu-open', 'is-menu-held'); sync(); };

  /** To the start screen: the top of the page, and its plain address. */
  const toStart = () => {
    root.classList.add('is-start');
    root.classList.remove('is-menu-open');
    history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
    sync();
  };
  /** From it to What's Color?, which is one step on, so Back returns here. */
  const toNames = () => {
    const was = atStart();
    root.classList.remove('is-start', 'is-menu-open');
    if (location.hash !== '#whats-color') {
      if (was) history.pushState(null, '', '#whats-color');
      else history.replaceState(null, '', '#whats-color');
    }
    const section = document.getElementById('whats-color');
    window.scrollTo(0, writtenPoint() ?? (section ? section.getBoundingClientRect().top + window.scrollY : 0));
    sync();
  };

  toggle.addEventListener('click', () => {
    if (atStart() && !raised()) toNames();
    else if (raised()) lower();
    else raise();
  });

  bar.addEventListener('click', (event) => {
    if (!phone.matches || !isPlainClick(event)) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    // About: client/panels.ts raises it, on this same click. Over the start
    // screen it stands on that screen; a raised menu gets out of its way first
    // (this listener is on the capture phase for that: the panel's Close has to
    // be reachable by the time panels.ts hands it the focus).
    if (link.dataset.panelOpen && document.getElementById(link.dataset.panelOpen)) {
      if (raised()) lower();
      return;
    }
    const here = link.pathname === location.pathname
      || (link.pathname === index && document.querySelector('.panel.is-open') !== null);
    if (!here) {
      // Another page: client/transitions.ts fades and goes. The wordmark leads
      // to this same screen, so its words are not faded on the way.
      root.classList.toggle('is-menu-held', link === wordmark);
      return;
    }
    event.preventDefault();
    if (startPage && link === wordmark) return toStart();
    if (startPage && link === names) return toNames();
    // The page you are on: back to it, and out of any panel open on it.
    lower();
    document.querySelector<HTMLElement>('.panel.is-open [data-panel-close]')?.click();
  }, true);

  // Before the panels and the lightbox hear it: Escape puts away the menu only.
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !raised()) return;
    event.stopImmediatePropagation();
    lower();
    toggle.focus({ preventScroll: true });
  }, true);

  const settle = () => {
    root.classList.toggle('is-start', wantsStart());
    if (!phone.matches || atStart()) root.classList.remove('is-menu-open', 'is-menu-held');
    sync();
  };
  window.addEventListener('popstate', settle);
  window.addEventListener('hashchange', settle);
  window.addEventListener('pageshow', (event) => { if (event.persisted) { root.classList.remove('is-menu-open', 'is-menu-held'); settle(); } });
  phone.addEventListener('change', settle);
  settle();
}
