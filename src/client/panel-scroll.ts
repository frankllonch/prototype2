/**
 * Detail panels, after bofill.com: the text scrolls, the photograph stays.
 *
 * The images are stacked in one sticky column and only one is shown at a time.
 * Which one follows the reader's progress through the text — progress 0 to 1
 * maps across the images — so a project with three photographs and one with
 * twenty-seven both work without any per-project tuning.
 *
 * With scripting off the same markup is a plain column of figures beside the
 * text: nothing is hidden behind this file.
 */
export function initPanelScroll(): void {
  // A panel scrolls inside itself; the Colour Chart scrolls the page.
  const readers: Array<{ scroller: HTMLElement | Document; root: HTMLElement }> = [
    ...[...document.querySelectorAll<HTMLElement>('[data-panel]')].map((p) => ({ scroller: p, root: p })),
    ...[...document.querySelectorAll<HTMLElement>('.reader-page')].map((p) => ({ scroller: document, root: p })),
  ];

  for (const { scroller, root: panel } of readers) {
    const stage = panel.querySelector<HTMLElement>('[data-figures]');
    if (!stage) continue;

    const figures = [...stage.querySelectorAll<HTMLElement>('.reader-figure')];
    const counter = panel.querySelector<HTMLElement>('[data-figure-count]');
    if (figures.length < 1) continue;

    stage.classList.add('is-live');
    let shown = -1;

    const show = (index: number) => {
      if (index === shown) return;
      shown = index;
      figures.forEach((figure, i) => figure.classList.toggle('is-current', i === index));
      if (counter) {
        counter.textContent = (counter.dataset.template ?? '{n} / {total}')
          .replace('{n}', String(index + 1))
          .replace('{total}', String(figures.length));
      }
    };

    const scrollTopOf = () => (scroller === document ? window.scrollY : (scroller as HTMLElement).scrollTop);
    const spanOf = () => (scroller === document
      ? document.documentElement.scrollHeight - window.innerHeight
      : (scroller as HTMLElement).scrollHeight - (scroller as HTMLElement).clientHeight);

    const update = () => {
      const span = spanOf();
      // A panel short enough not to scroll simply shows its first photograph.
      const progress = span > 8 ? Math.min(1, Math.max(0, scrollTopOf() / span)) : 0;
      show(Math.min(figures.length - 1, Math.floor(progress * figures.length * 0.9999)));
    };

    // Throttled on the clock rather than an animation frame: this only swaps a
    // class, and a frame callback a background tab withholds would leave the
    // wrong photograph showing.
    let last = 0;
    const target: EventTarget = scroller === document ? window : scroller;
    target.addEventListener('scroll', () => {
      const now = performance.now();
      if (now - last < 50) return;
      last = now;
      update();
    }, { passive: true });
    target.addEventListener('scrollend', update);

    // Opening a panel resets its scroll, so the first photograph must be set
    // then too, not only on the first scroll.
    panel.addEventListener('panelopen', update);
    show(0);
  }
}
