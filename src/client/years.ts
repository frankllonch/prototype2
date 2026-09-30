import { reduceMotion } from './env.ts';

/**
 * The year rail. Clicking a swatch scrolls to that year in the grid; the swatch
 * of the year you are looking at stays marked as you scroll.
 *
 * The links are plain anchors to ids in the grid, so this only adds the smooth
 * scroll and the current-year marking. It also never runs while the opening
 * pile is still moving: the rail is revealed by `stackdone`, and the marking
 * observer is only wired up then, so a mid-animation measurement can never
 * reach it.
 */
export function initYears(): void {
  const rail = document.querySelector<HTMLElement>('[data-years]');
  if (!rail) return;

  const links = [...rail.querySelectorAll<HTMLAnchorElement>('.year')];
  if (!links.length) return;

  const grid = document.querySelector<HTMLElement>('[data-grid]');
  const tiles = grid ? [...grid.querySelectorAll<HTMLElement>('.tile')] : [];

  /**
   * Focusing a year dims every painting from another one, so the year you asked
   * for is the only thing in focus. Choosing the same year again clears it, as
   * does Escape.
   */
  let focused = '';
  const focus = (year: string) => {
    focused = year;
    for (const tile of tiles) tile.classList.toggle('is-dimmed', Boolean(year) && tile.dataset.year !== year);
    for (const link of links) link.setAttribute('aria-pressed', String(link.dataset.year === year));
    rail.classList.toggle('is-focused', Boolean(year));
  };

  for (const link of links) {
    link.setAttribute('aria-pressed', 'false');
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const year = link.dataset.year!;
      const target = document.getElementById(`year-${year}`);
      if (!target) return;
      event.preventDefault();

      if (focused === year) { focus(''); return; }
      focus(year);
      target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#year-${year}`);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && focused) focus('');
  });

  /*
   * Clicking away drops the year — the most natural way out. A click that lands
   * on a painting is left alone: that one is opening the work, not dismissing
   * the selection. Bound on pointerdown so it settles before the tile's own
   * click handler runs.
   */
  document.addEventListener('pointerdown', (event) => {
    if (!focused) return;
    const target = event.target as Element | null;
    if (target?.closest('.tile') || target?.closest('[data-years]')) return;
    focus('');
  });

  // Scrolling back to the opening gathers the paintings again; a year held in
  // focus from before would otherwise still be dimming most of them when the
  // grid comes back.
  document.addEventListener('stackrestart', () => { if (focused) focus(''); });

  // Mark the year currently under the top of the viewport.
  const start = () => {
    const anchors = links
      .map((link) => ({ link, el: document.getElementById(`year-${link.dataset.year}`) }))
      .filter((a): a is { link: HTMLAnchorElement; el: HTMLElement } => a.el !== null);
    if (!anchors.length) return;

    const update = () => {
      const probe = window.innerHeight * 0.25;
      let current = anchors[0]!;
      for (const anchor of anchors) {
        if (anchor.el.getBoundingClientRect().top <= probe) current = anchor;
      }
      for (const { link } of anchors) link.classList.toggle('is-current', link === current.link);
    };

    let last = 0;
    window.addEventListener('scroll', () => {
      const now = performance.now();
      if (now - last < 60) return;
      last = now;
      update();
    }, { passive: true });
    window.addEventListener('scrollend', update);
    update();
  };

  document.addEventListener('stackdone', start, { once: true });
}
