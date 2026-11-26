import { phone, targetElement } from './env.ts';

/** The sheet holds still and only its text moves (`components/sheet.ts`). */
export function initSheets(): void {
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  for (const sheet of document.querySelectorAll<HTMLElement>('[data-sheet]')) {
    const panel = sheet.closest<HTMLElement>('[data-panel]');
    const text = sheet.querySelector<HTMLElement>('[data-sheet-text]');
    if (!panel || !text) continue;

    const top = () => { text.scrollTop = 0; };
    /** What moves: the text in its column, or on a phone the whole page. */
    const scroller = () => (phone.matches ? panel : text);
    panel.addEventListener('panelopen', top);
    for (const button of sheet.querySelectorAll('[data-expand]')) button.addEventListener('click', top);

    panel.addEventListener('wheel', (event) => {
      if (phone.matches || text.contains(event.target as Node)) return;
      // A pinch on a trackpad arrives as a wheel with Ctrl held, as does Ctrl and the wheel: both
      // are the browser's zoom, and stay its.
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      // Lines and pages are what a mouse wheel reports on some systems; the text moves by its own
      // line or its own height for those.
      const unit = event.deltaMode === 1 ? parseFloat(getComputedStyle(text).lineHeight) || 40
        : event.deltaMode === 2 ? text.clientHeight : 1;
      text.scrollBy({ top: event.deltaY * unit });
    }, { passive: false });

    /* The keys a reader scrolls with. */
    const steps: Record<string, (h: number) => number> = {
      ArrowDown: () => 48, ArrowUp: () => -48,
      PageDown: (h) => h * 0.9, PageUp: (h) => -h * 0.9, ' ': (h) => h * 0.9,
      Home: () => -Infinity, End: () => Infinity,
    };
    document.addEventListener('keydown', (event) => {
      if (!panel.classList.contains('is-open')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = targetElement(event);
      if (target && !phone.matches && text.contains(target)) return;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      // Space on a button presses it; on a link — Close, which has the focus when the sheet opens
      // — it does nothing, so there it scrolls.
      if (event.key === ' ' && target?.closest('button')) return;
      const step = steps[event.key];
      if (!step) return;
      event.preventDefault();
      const moved = scroller();
      const by = step(moved.clientHeight) * (event.shiftKey && event.key === ' ' ? -1 : 1);
      if (by === Infinity) moved.scrollTop = moved.scrollHeight;
      else if (by === -Infinity) moved.scrollTop = 0;
      // A held arrow repeats faster than a smooth scroll finishes, and each new one would cut the
      // last one short; lines move at once, pages glide — unless the reader has asked for less
      // motion.
      else moved.scrollBy({ top: by, behavior: Math.abs(by) > 48 && !still.matches ? 'smooth' : 'auto' });
    });
  }
}
