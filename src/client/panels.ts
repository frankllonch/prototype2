import { isPlainClick, phone, returnFocus } from './env.ts';

/* Steps in the history. */
export type Step = { panel?: string; over?: string; view?: string; at?: number };
export const stepState = (): Step => (history.state ?? {}) as Step;

let leaving = false;
/** Back over a step, once. */
export function stepBack(): void {
  if (leaving) return;
  leaving = true;
  history.back();
}
window.addEventListener('popstate', () => { leaving = false; });
// After a reload the entry behind a step can be another page's, so the step back may leave this
// one altogether.
window.addEventListener('pageshow', () => { leaving = false; });

// Where the page is, as of the last time it moved: `keepScroll` has to know where it was before
// the browser touched it.
let pageY = window.scrollY;
window.addEventListener('scroll', () => { pageY = window.scrollY; }, { passive: true });

/** For the `popstate` that leaves a step or lands on one: the page under it stays where it was. */
export function keepScroll(): void {
  const y = pageY;
  const mode = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  window.scrollTo(0, y);
  window.setTimeout(() => {
    history.scrollRestoration = mode;
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }, 0);
}

/**
 * About and each exhibition open above the page you are on, which stays visible
 * and softly blurred behind them.
 */
export function initPanels(): void {
  const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')];
  const veil = document.querySelector<HTMLElement>('[data-panel-veil]');
  if (!panels.length || !veil) return;

  /* Where the bar goes back to when a panel closes. */
  const page = location.pathname + location.search;
  const root = document.querySelector<HTMLElement>('[data-panel-root]')?.dataset.panelRoot ?? page;
  const index = new URL(root, location.href).pathname;
  // Every address this page puts in the bar: its own, its index's, its panels'.
  const addresses = new Set([location.pathname, index]);
  for (const panel of panels) {
    if (panel.dataset.panelUrl) addresses.add(new URL(panel.dataset.panelUrl, location.href).pathname);
  }

  /*
   * A panel's Close link is inside it, or — where it has to be drawn over the
   * panel as the bar is, as the negative of whatever passes under it.
   */
  const closer = (panel: HTMLElement) =>
    panel.querySelector<HTMLElement>('[data-panel-close]') ??
    document.querySelector<HTMLElement>(`[data-panel-close="${panel.id}"]`);

  const panelOf = (id?: string) => (id ? panels.find((panel) => panel.id === id) ?? null : null);
  /** The address in the bar is this panel's: its anchor, or the address of its own. */
  const addressed = (panel: HTMLElement) =>
    location.hash === `#${panel.id}` ||
    (location.hash === '' && panel.dataset.panelUrl !== undefined &&
      new URL(panel.dataset.panelUrl, location.href).pathname === location.pathname);

  let open: HTMLElement | null = null;
  // The sheet the open panel was raised over, still standing under it.
  let under: HTMLElement | null = null;
  // What opened the panel, so that closing it hands the keyboard back there rather than dropping
  // focus on the body when the Close link is hidden.
  let opener: HTMLElement | null = null;
  // The open panel stands on a history step of its own, one on from the page.
  let stepped = false;

  /**
   * `byHistory`: Back has already left the panel's step, and only the panel is
   * left to put away.
   */
  const close = (byHistory = false) => {
    if (!open) return;
    // Close, Escape and the menu go back over the step rather than leaving it behind them, where
    // Forward would find a panel nobody asked for.
    if (stepped && !byHistory && stepState().panel === open.id) { stepBack(); return; }
    stepped = false;
    const id = open.id;
    open.classList.remove('is-open');
    under?.classList.remove('is-open');
    open = under = null;
    veil.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (!byHistory) history.replaceState(null, '', root);
    const back = opener ?? document.querySelector<HTMLElement>(`[data-panel-open="${id}"]`);
    opener = null;
    // On a phone what opened it may be in the menu, which is out of sight again by now: the menu's
    // button takes the keyboard instead.
    const shown = back && back.getClientRects().length > 0 && getComputedStyle(back).visibility !== 'hidden';
    // Marked as handed back rather than reached (env.ts), so the bar's hover (client/scramble.ts)
    // does not take it for a keyboard arriving on the word.
    returnFocus(shown ? back : document.querySelector<HTMLElement>('[data-menu-toggle]') ?? back);
  };

  /** `arriving`: the page came with this panel up, and nobody has pressed anything yet. */
  const show = (id: string, arriving = false, beneath: HTMLElement | null = null) => {
    const panel = panelOf(id);
    if (!panel) return;
    // Not up yet — the page was reloaded on this step, or Forward skipped the one before it — so
    // it is raised first, as it would have been.
    if (beneath && beneath !== open) show(beneath.id, arriving);
    // Back on the sheet that was under About: it never went away, and is not to be taken back to
    // its top.
    const kept = panel === under;
    if (kept) opener = null;
    for (const other of [open, under]) {
      if (other && other !== panel && other !== beneath) other.classList.remove('is-open');
    }
    open = panel;
    under = beneath;
    veil.classList.add('is-open');
    panel.classList.add('is-open');
    if (!kept) {
      panel.scrollTop = 0;
      // The figure column follows the scroll, so it has to be told that the scroll just went back
      // to the top.
      panel.dispatchEvent(new CustomEvent('panelopen'));
    }
    document.body.classList.add('is-locked');
    // Close takes the keyboard — but not on a phone sheet the page arrived with.
    if (arriving && phone.matches && panel.classList.contains('panel')) {
      panel.tabIndex = -1;
      panel.focus({ preventScroll: true });
      return;
    }
    closer(panel)?.focus({ preventScroll: true });
  };

  for (const trigger of document.querySelectorAll<HTMLAnchorElement>('[data-panel-open]')) {
    const id = trigger.dataset.panelOpen!;
    trigger.addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;
      const panel = document.getElementById(id);
      if (!panel) return; // not on this page: let the link go home
      event.preventDefault();
      /*
       * A panel with an address of its own is reached at that address; the rest
       * are reached by their anchor, which is also what the link says.
       */
      const own = panel.dataset.panelUrl;
      const here = own !== undefined && (!phone.matches || new URL(own, location.href).pathname.startsWith(index));
      const url = here ? own : `#${id}`;
      // One step per panel.
      const over = phone.matches && open && open !== panel ? open : null;
      if (phone.matches && (!open || over)) {
        history.pushState(over ? { panel: id, over: over.id } : { panel: id }, '', url);
        stepped = true;
      } else history.replaceState(stepped ? { panel: id } : null, '', url);
      opener = trigger;
      show(id, false, over);
    });
  }
  for (const panel of panels) {
    closer(panel)?.addEventListener('click', (event) => {
      event.preventDefault();
      close();
    });
  }
  veil.addEventListener('click', () => close());
  document.addEventListener('keydown', (event) => { if (open && event.key === 'Escape') close(); });

  // Back from a panel's step closes it; Forward onto one raises it again.
  window.addEventListener('popstate', () => {
    // Back onto an address this page is never at.
    if (!addresses.has(location.pathname)) { location.reload(); return; }
    const { panel: id, over } = stepState();
    if (id && panelOf(id)) {
      keepScroll();
      show(id, false, panelOf(over));
      stepped = true;
    } else if (stepped) {
      keepScroll();
      // Back off About onto a sheet the page arrived with, which made no step: the entry is that
      // sheet's all the same, and it stays up.
      if (under && addressed(under)) { show(under.id); stepped = false; }
      else close(true);
    }
  });

  // Served already open — a panel loaded at its own address — so the script takes charge of what
  // the page has done, and can close it.
  const served = panels.find((panel) => panel.classList.contains('is-open'));
  if (served) show(served.id, true);
  // Arriving on a shared #about or #exhibition-… link opens it straight away.
  const at = stepState();
  const named = location.hash.slice(1);
  if (named) show(named, true, at.panel === named ? panelOf(at.over) : null);
  stepped = open !== null && at.panel === (open as HTMLElement).id;
}
