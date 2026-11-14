import { isPlainClick, phone } from './env.ts';

/**
 * About and each exhibition open above the page you are on, which stays visible
 * and softly blurred behind them. The panels are already in the markup — this
 * only raises one — so there is no fetch and nothing to wait for.
 *
 * The veil fades rather than appearing: it is always in the DOM and only its
 * opacity changes, so opening reads as the page receding, not a curtain dropping.
 *
 * A panel may have an address of its own (`data-panel-url`, as the WordPress
 * theme gives each exhibition and commissioned project), in which case opening
 * it puts that address in the bar rather than an anchor, and a page may be
 * served with a panel already open — that same address, loaded directly. The
 * static site does neither, and nothing here depends on either.
 *
 * On a phone the sheets are drawn with no Close (07-sheet.css), so the way out
 * of one is the phone's own: opening a panel there is a step in the history,
 * and Back closes it and leaves you on the page, where you were on it. About
 * opens the same way, for the same Back. Wider than a phone the address is
 * replaced, as it always was, and Back leaves the page.
 */
export function initPanels(): void {
  const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')];
  const veil = document.querySelector<HTMLElement>('[data-panel-veil]');
  if (!panels.length || !veil) return;

  /*
   * Where the bar goes back to when a panel closes. Normally the page itself,
   * read once here because opening a panel may have replaced the address; a
   * page served at a panel's own address names the index it belongs to instead
   * (`data-panel-root`), so closing it does not leave the bar on the panel.
   */
  const page = location.pathname + location.search;
  const root = document.querySelector<HTMLElement>('[data-panel-root]')?.dataset.panelRoot ?? page;

  /*
   * A panel's Close link is inside it, or — where it has to be drawn over the
   * panel as the bar is, as the negative of whatever passes under it — beside
   * it, naming the panel it closes (`data-panel-close="about"`). A blend
   * reaches only what shares its stacking context, and a panel is one.
   */
  const closer = (panel: HTMLElement) =>
    panel.querySelector<HTMLElement>('[data-panel-close]') ??
    document.querySelector<HTMLElement>(`[data-panel-close="${panel.id}"]`);

  let open: HTMLElement | null = null;
  // What opened the panel, so that closing it hands the keyboard back there
  // rather than dropping focus on the body when the Close link is hidden.
  let opener: HTMLElement | null = null;
  // The open panel stands on a history step of its own, one on from the page.
  let stepped = false;
  const stepOf = () => (history.state as { panel?: string } | null)?.panel;

  /** `byHistory`: Back has already left the panel's step, and only the panel is left to put away. */
  const close = (byHistory = false) => {
    if (!open) return;
    // Close, Escape and the menu go back over the step rather than leaving it
    // behind them, where Forward would find a panel nobody asked for. The
    // `popstate` below does the closing.
    if (stepped && !byHistory && stepOf() === open.id) { history.back(); return; }
    stepped = false;
    const id = open.id;
    open.classList.remove('is-open');
    open = null;
    veil.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (!byHistory) history.replaceState(null, '', root);
    const back = opener ?? document.querySelector<HTMLElement>(`[data-panel-open="${id}"]`);
    opener = null;
    // On a phone what opened it may be in the menu, which is out of sight
    // again by now: the menu's button takes the keyboard instead.
    const shown = back && back.getClientRects().length > 0 && getComputedStyle(back).visibility !== 'hidden';
    (shown ? back : document.querySelector<HTMLElement>('[data-menu-toggle]') ?? back)?.focus({ preventScroll: true });
  };

  /** `arriving`: the page came with this panel up, and nobody has pressed anything yet. */
  const show = (id: string, arriving = false) => {
    const panel = document.getElementById(id);
    if (!panel?.hasAttribute('data-panel')) return;
    if (open && open !== panel) open.classList.remove('is-open');
    open = panel;
    veil.classList.add('is-open');
    panel.classList.add('is-open');
    panel.scrollTop = 0;
    // The figure column follows the scroll, so it has to be told that the
    // scroll just went back to the top.
    panel.dispatchEvent(new CustomEvent('panelopen'));
    document.body.classList.add('is-locked');
    // Close takes the keyboard — but not on a phone sheet the page arrived
    // with. Focus given before anything has been touched is drawn as a
    // keyboard's would be, and the Close those sheets keep out of sight until
    // a key reaches it (07-sheet.css) would be the first thing on them. The
    // sheet itself takes it there, so the first Tab is Close all the same.
    // About keeps its Close in view on a phone, and is given it as ever.
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
      // A panel with an address of its own is reached at that address; the
      // rest are reached by their anchor, which is also what the link says.
      const url = panel.dataset.panelUrl ?? `#${id}`;
      // One step per visit: a panel raised over another — About, from the menu,
      // over a sheet — takes the step the first one made.
      if (phone.matches && !open) { history.pushState({ panel: id }, '', url); stepped = true; }
      else history.replaceState(stepped ? { panel: id } : null, '', url);
      opener = trigger;
      show(id);
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
  // A panel that made no step is not touched: there Back is on its way out
  // of the page, as it has always been.
  window.addEventListener('popstate', () => {
    const id = stepOf();
    if (id && document.getElementById(id)?.hasAttribute('data-panel')) { show(id); stepped = true; }
    else if (stepped) close(true);
  });

  // Served already open — a panel loaded at its own address — so the script
  // takes charge of what the page has done, and can close it. First, whatever
  // the hash says: a stray #main from the skip link must not leave the panel
  // open with nothing in charge of it.
  const served = panels.find((panel) => panel.classList.contains('is-open'));
  if (served) show(served.id, true);
  // Arriving on a shared #about or #exhibition-… link opens it straight away.
  if (location.hash.length > 1) show(location.hash.slice(1), true);
  // Reloaded on a panel's step, the step is still there behind it.
  stepped = open !== null && stepOf() === (open as HTMLElement).id;
}
