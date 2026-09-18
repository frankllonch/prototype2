import { isPlainClick } from './env.ts';

/**
 * About and each exhibition open above the page you are on, which stays visible
 * and softly blurred behind them. The panels are already in the markup — this
 * only raises one — so there is no fetch and nothing to wait for.
 *
 * The veil fades rather than appearing: it is always in the DOM and only its
 * opacity changes, so opening reads as the page receding, not a curtain dropping.
 */
export function initPanels(): void {
  const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')];
  const veil = document.querySelector<HTMLElement>('[data-panel-veil]');
  if (!panels.length || !veil) return;

  let open: HTMLElement | null = null;

  const close = () => {
    if (!open) return;
    open.classList.remove('is-open');
    open = null;
    veil.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    history.replaceState(null, '', location.pathname + location.search);
  };

  const show = (id: string) => {
    const panel = document.getElementById(id);
    if (!panel?.hasAttribute('data-panel')) return;
    if (open && open !== panel) open.classList.remove('is-open');
    open = panel;
    veil.classList.add('is-open');
    panel.classList.add('is-open');
    panel.scrollTop = 0;
    document.body.classList.add('is-locked');
    panel.querySelector<HTMLElement>('[data-panel-close]')?.focus({ preventScroll: true });
  };

  for (const trigger of document.querySelectorAll<HTMLAnchorElement>('[data-panel-open]')) {
    const id = trigger.dataset.panelOpen!;
    trigger.addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;
      if (!document.getElementById(id)) return; // not on this page: let the link go home
      event.preventDefault();
      history.replaceState(null, '', `#${id}`);
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

  // Arriving on a shared #about or #exhibition-… link opens it straight away.
  if (location.hash.length > 1) show(location.hash.slice(1));
}
