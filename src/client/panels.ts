import { isPlainClick } from './env.ts';

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

  let open: HTMLElement | null = null;
  // What opened the panel, so that closing it hands the keyboard back there
  // rather than dropping focus on the body when the Close link is hidden.
  let opener: HTMLElement | null = null;

  const close = () => {
    if (!open) return;
    const id = open.id;
    open.classList.remove('is-open');
    open = null;
    veil.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    history.replaceState(null, '', root);
    const back = opener ?? document.querySelector<HTMLElement>(`[data-panel-open="${id}"]`);
    opener = null;
    back?.focus({ preventScroll: true });
  };

  const show = (id: string) => {
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
    panel.querySelector<HTMLElement>('[data-panel-close]')?.focus({ preventScroll: true });
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
      history.replaceState(null, '', panel.dataset.panelUrl ?? `#${id}`);
      opener = trigger;
      show(id);
    });
  }
  for (const panel of panels) {
    panel.querySelector('[data-panel-close]')?.addEventListener('click', (event) => {
      event.preventDefault();
      close();
    });
  }
  veil.addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (open && event.key === 'Escape') close(); });

  // Served already open — a panel loaded at its own address — so the script
  // takes charge of what the page has done, and can close it. First, whatever
  // the hash says: a stray #main from the skip link must not leave the panel
  // open with nothing in charge of it.
  const served = panels.find((panel) => panel.classList.contains('is-open'));
  if (served) show(served.id);
  // Arriving on a shared #about or #exhibition-… link opens it straight away.
  if (location.hash.length > 1) show(location.hash.slice(1));
}
