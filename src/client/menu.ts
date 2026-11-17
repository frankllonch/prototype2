import { isPlainClick, phone, reduceMotion } from './env.ts';
import { typeIn } from './write.ts';
import { replayRise } from './rise.ts';

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
  // No menu on the page, nothing for the head to give back (see the end).
  if (!bar || !toggle) { root.setAttribute('data-menu', ''); return; }

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
    const shown = (raised() || atStart()) && !collapsed();
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
  const lower = () => { root.classList.remove('is-menu-open', 'is-menu-held', 'is-menu-closing', 'is-menu-collapsed'); sync(); };

  /*
   * The sections leave as they came, in the reverse cascade (THE MENU'S MOTION
   * in 09-phone.css), and only then does `done` take the menu away. Each
   * section's drop is restarted so it runs backwards from where it stands; the
   * wait is the cascade's own length, read from the stylesheet.
   */
  let closing = 0;
  const sections = () => [...bar.querySelectorAll<HTMLElement>('.top-soon, .menu a')];
  const leave = (done: () => void) => {
    window.clearTimeout(closing);
    const style = getComputedStyle(root);
    const ms = (name: string) => {
      const v = style.getPropertyValue(name).trim();
      return (Number.parseFloat(v) || 0) * (v.endsWith('ms') ? 1 : 1000);
    };
    // Until the last section has gone and the last bar has turned back.
    const total = reduceMotion.matches ? 0 : Math.max(
      ms('--cascade-duration') + 5 * ms('--cascade-step'),
      ...[1, 2, 3].map((n) => ms(`--line${n}-duration`) + ms(`--line${n}-delay`)),
    );
    root.classList.add('is-menu-closing');
    for (const el of sections()) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
    closing = window.setTimeout(() => { root.classList.remove('is-menu-closing'); done(); }, total);
    return total;
  };

  /** The start screen with its sections put away: the name and the bars alone. */
  const collapsed = () => root.classList.contains('is-menu-collapsed');
  const collapse = () => leave(() => { root.classList.add('is-menu-collapsed'); sync(); });
  const expand = () => { root.classList.remove('is-menu-collapsed'); sync(); };

  /** The step `toNames` makes is marked, so `toStart` can tell it is standing on it. */
  const onStep = () => (history.state as { start?: boolean } | null)?.start === true;

  /**
   * To the start screen: the top of the page, and its plain address.
   *
   * From the step `toNames` made that is one step back, and it is taken as
   * one. Replacing the address instead left the start screen in the history
   * twice running, once more for every round of hamburger and wordmark, and
   * Back then had to be pressed through each copy with nothing changing on
   * screen. `settle` hears the step back and finds the screen already up.
   */
  const toStart = () => {
    root.classList.add('is-start');
    root.classList.remove('is-menu-open', 'is-menu-collapsed');
    if (onStep()) history.back();
    else history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
    sync();
  };
  /** From it to What's Color?, which is one step on, so Back returns here. */
  const toNames = () => {
    // A collapse still running would put the paper back over the typing.
    window.clearTimeout(closing);
    root.classList.remove('is-menu-closing');
    document.dispatchEvent(new Event('cueagain'));
    const was = atStart();
    // Asked for from inside the bar, which is about to go out of sight and
    // would take the keyboard's place with it.
    const within = bar.contains(document.activeElement);
    root.classList.remove('is-start', 'is-menu-open', 'is-menu-collapsed');
    if (location.hash !== '#whats-color') {
      if (was) history.pushState({ start: true }, '', '#whats-color');
      else history.replaceState(null, '', '#whats-color');
    }
    // The page's head, put back while the menu is still fading over it. Where
    // the scroll writes the note that is its blank stage, and the note is then
    // typed in front of the reader as the menu clears (Frank, 2026-11-15) —
    // from the start screen and from a raised menu alike. Elsewhere the note
    // is an ordinary paragraph standing there, and `typeIn` does nothing.
    const section = document.getElementById('whats-color');
    window.scrollTo(0, section ? section.getBoundingClientRect().top + window.scrollY : 0);
    typeIn();
    sync();
    if (within) toggle.focus({ preventScroll: true });
  };

  // The bars close what is showing and go nowhere (Frank, 2026-11-15): the
  // sections leave and the name stays with the bars, over the paper, on the
  // start screen and over any other page alike. Only a section, the name, or
  // Escape leaves the menu for a page.
  toggle.addEventListener('click', () => {
    if (root.classList.contains('is-menu-closing')) return;
    if (raised() || atStart()) (collapsed() ? expand() : collapse());
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
      /*
       * The menu is the way from one page to the next (Frank, 2026-11-16): the
       * sections leave, the X turns back into the three bars, and the paper
       * holds until the next page comes up under bars standing just where they
       * were. transitions.ts waits for it (`data-leave-ms`) before it goes.
       */
      if (raised() || atStart()) {
        root.dataset.leaveMs = String(leave(() => { root.classList.add('is-menu-collapsed'); }));
      }
      return;
    }
    event.preventDefault();
    if (startPage && link === wordmark) return toStart();
    if (startPage && link === names) return toNames();
    // The page you are on: back to it, and out of any panel open on it. The
    // button takes the keyboard from the link, which goes out of sight.
    // The sections leave and the bars turn back first, as on the way to
    // another page.
    const within = bar.contains(document.activeElement);
    leave(() => {
      lower();
      if (within) toggle.focus({ preventScroll: true });
      document.querySelector<HTMLElement>('.panel.is-open [data-panel-close]')?.click();
      // And its content rises again, as it does on arriving (client/rise.ts).
      window.scrollTo({ top: 0, behavior: 'instant' });
      replayRise();
    });
  }, true);

  // Before the panels and the lightbox hear it: Escape puts away the menu only.
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !raised()) return;
    event.stopImmediatePropagation();
    lower();
    toggle.focus({ preventScroll: true });
  }, true);

  /*
   * The start screen comes with the address and never with the window. The
   * head raises it for an arrival, and Back or Forward onto the start page's
   * plain address raise it here (`byAddress`). Everything else that settles —
   * the boot, a page restored whole, the window crossing 900px — may take it
   * down and may not put it up: a tablet read on its side and then turned
   * upright is below 900 at the start page's address, and had the menu dropped
   * over the text being read. There the address is made to say what is on
   * screen instead — the page, not the screen before it — so a later Back onto
   * it (out of About, say) does not raise the start screen either.
   */
  const settle = (byAddress = false) => {
    if (!wantsStart()) root.classList.remove('is-start', 'is-menu-collapsed');
    else if (byAddress) root.classList.add('is-start');
    else if (!atStart() && location.hash === '') history.replaceState(history.state, '', '#whats-color');
    if (!phone.matches || atStart()) root.classList.remove('is-menu-open', 'is-menu-held');
    if (!phone.matches || (!atStart() && !raised())) root.classList.remove('is-menu-collapsed');
    sync();
  };
  window.addEventListener('popstate', () => settle(true));
  window.addEventListener('hashchange', () => settle(true));
  window.addEventListener('pageshow', (event) => { if (event.persisted) { root.classList.remove('is-menu-open', 'is-menu-held', 'is-menu-closing', 'is-menu-collapsed'); settle(); } });
  phone.addEventListener('change', () => settle());
  settle();

  // Said last, once the button answers: the head of the page waits to hear it
  // (components/layout.ts) and otherwise gives the menu back to the document.
  root.setAttribute('data-menu', '');
}
