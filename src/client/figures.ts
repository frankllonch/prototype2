import { targetElement } from './env.ts';
/** Turning the pictures in a detail panel, and giving either column the screen. */
import { morphSheet } from './sheet-morph.ts';

export function initFigures(): void {
  for (const reader of document.querySelectorAll<HTMLElement>('[data-reader]')) {
    // Panels only; nothing else on the site composes this way any more.
    const panel = reader.closest<HTMLElement>('[data-panel]');
    if (!panel) continue;

    const stage = reader.querySelector<HTMLElement>('[data-figures]');
    const figures = stage ? [...stage.querySelectorAll<HTMLElement>('.reader-figure')] : [];
    const counter = reader.querySelector<HTMLElement>('[data-figure-count]');

    // The stacked, one-at-a-time presentation is the same as the scrolled version's; only what
    // advances it differs.
    if (stage && figures.length) stage.classList.add('is-live');

    /*
     * The count a phone shows between the arrows, "2 / 8" (07-sheet.css hides it
     * on a computer, where the frame stands alone).
     */
    const next = reader.querySelector<HTMLElement>('[data-figure-step="1"]');
    const visible = next && figures.length > 1 ? document.createElement('p') : null;
    if (visible && next) {
      visible.className = 'reel-count';
      visible.setAttribute('aria-hidden', 'true');
      next.before(visible);
    }

    let shown = 0;

    const show = (index: number) => {
      if (!figures.length) return;
      // Wraps, so the arrows never dead-end on a handful of pictures.
      shown = (index + figures.length) % figures.length;
      figures.forEach((figure, i) => figure.classList.toggle('is-current', i === shown));
      if (counter) {
        counter.textContent = (counter.dataset.template ?? '{n} / {total}')
          .replace('{n}', String(shown + 1))
          .replace('{total}', String(figures.length));
      }
      if (visible) visible.textContent = `${shown + 1} / ${figures.length}`;
    };
    show(0);

    // A swipe across the photograph turns it, as the arrows do.
    if (stage && figures.length > 1) {
      let from: { x: number; y: number } | null = null;
      stage.addEventListener('touchstart', (event) => {
        const t = event.touches[0];
        from = event.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
      }, { passive: true });
      stage.addEventListener('touchend', (event) => {
        const t = event.changedTouches[0];
        if (!from || !t) return;
        const dx = t.clientX - from.x;
        const dy = t.clientY - from.y;
        from = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(shown + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }

    for (const button of reader.querySelectorAll<HTMLButtonElement>('[data-figure-step]')) {
      button.addEventListener('click', () => show(shown + Number(button.dataset.figureStep)));
    }

    /*
     * The arrow keys turn the pictures too, which is how anyone looking at a set
     * of photographs expects to move through them.
     */
    document.addEventListener('keydown', (event) => {
      if (!panel.classList.contains('is-open')) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = targetElement(event);
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step || figures.length < 2) return;
      event.preventDefault();
      show(shown + step);
    });

    const expanders = [...reader.querySelectorAll<HTMLButtonElement>('[data-expand]')];
    const widen = (which: string | null) => {
      reader.classList.toggle('is-wide-text', which === 'text');
      reader.classList.toggle('is-wide-figures', which === 'figures');
      for (const button of expanders) {
        button.setAttribute('aria-pressed', String(button.dataset.expand === which));
      }
    };

    for (const button of expanders) {
      button.addEventListener('click', () => {
        const already = button.getAttribute('aria-pressed') === 'true';
        const which = already ? null : button.dataset.expand ?? null;
        // A sheet moves from one layout to the other (sheet-morph.ts).
        if (reader.hasAttribute('data-sheet')) morphSheet(reader, () => widen(which));
        else widen(which);
        // The column that was filling the screen has gone; starting anywhere but the top of what
        // replaced it would be landing in the middle of it.
        panel.scrollTop = 0;
      });
    }

    // Opening is always from the same state: first picture, neither column widened, scrolled to
    // the top.
    panel.addEventListener('panelopen', () => {
      widen(null);
      show(Number(panel.dataset.figureStart) || 0);
      delete panel.dataset.figureStart;
    });
    show(0);
  }
}

