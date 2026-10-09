/**
 * Turning the pictures in a detail panel, and giving either column the screen.
 *
 * The photographs used to change as you scrolled. That read well while the text
 * was the thing you were following, but it meant you could not go back, and
 * could not stay on one picture — and looking at the photographs is half of why
 * anyone opens an exhibition. So they are turned by hand here, with arrows under
 * them. The Colour Chart keeps the scrolling version (`panel-scroll.ts`), which
 * is a page you read through rather than a thing you look at.
 *
 * Either column can also take the whole width: the text alone for reading, the
 * pictures alone and centred for looking. One at a time — expanding one puts the
 * other away, so there is always something to come back to.
 *
 * With scripting off the panel is a plain column of text followed by every
 * photograph at full size, which is a worse read but a complete one: nothing
 * here hides anything that cannot be got at without it.
 */
export function initFigures(): void {
  aboutFigures();

  for (const reader of document.querySelectorAll<HTMLElement>('[data-reader]')) {
    // Panels only. The Colour Chart scrolls the page and keeps its own mechanism.
    const panel = reader.closest<HTMLElement>('[data-panel]');
    if (!panel) continue;

    const stage = reader.querySelector<HTMLElement>('[data-figures]');
    const figures = stage ? [...stage.querySelectorAll<HTMLElement>('.reader-figure')] : [];
    const counter = reader.querySelector<HTMLElement>('[data-figure-count]');

    // The stacked, one-at-a-time presentation is the same as the scrolled
    // version's; only what advances it differs.
    if (stage && figures.length) stage.classList.add('is-live');

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
    };

    for (const button of reader.querySelectorAll<HTMLButtonElement>('[data-figure-step]')) {
      button.addEventListener('click', () => show(shown + Number(button.dataset.figureStep)));
    }

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
        widen(already ? null : button.dataset.expand ?? null);
        // The column that was filling the screen has gone; starting anywhere but
        // the top of what replaced it would be landing in the middle of it.
        panel.scrollTop = 0;
      });
    }

    // Opening is always from the same state: first picture, neither column
    // widened, scrolled to the top.
    panel.addEventListener('panelopen', () => { widen(null); show(0); });
    show(0);
  }
}

/**
 * The studio photograph on About changes as the biography goes by.
 *
 * Driven by scroll rather than by arrows, unlike a detail panel: there is no
 * sequence to work through here, only two pictures of the same room, and a
 * control for them would be a control for nothing. It reads as the view
 * shifting while you read.
 *
 * Measured against the biography's own column rather than the whole panel, so
 * the change happens while there is still text beside it, not after the reader
 * has gone past into the collections.
 */
function aboutFigures(): void {
  const stage = document.querySelector<HTMLElement>('[data-about-figures]');
  const panel = stage?.closest<HTMLElement>('[data-panel]');
  const column = stage?.closest('.about-inner')?.querySelector<HTMLElement>('.about-text');
  if (!stage || !panel || !column) return;

  const figures = [...stage.querySelectorAll<HTMLElement>('.about-figure')];
  if (figures.length < 2) return;

  let shown = 0;
  const update = () => {
    const box = column.getBoundingClientRect();
    // How far the column has travelled past the middle of the screen, 0 to 1.
    const travelled = (window.innerHeight * 0.5 - box.top) / Math.max(1, box.height);
    const index = Math.min(figures.length - 1, Math.max(0, Math.floor(travelled * figures.length)));
    if (index === shown) return;
    shown = index;
    figures.forEach((figure, i) => figure.classList.toggle('is-current', i === shown));
  };

  // On the clock rather than a frame callback: this only swaps a class, and a
  // frame a background tab withholds would leave the wrong photograph showing.
  let last = 0;
  panel.addEventListener('scroll', () => {
    const now = performance.now();
    if (now - last < 60) return;
    last = now;
    update();
  }, { passive: true });
  panel.addEventListener('scrollend', update);
  panel.addEventListener('panelopen', () => {
    shown = 0;
    figures.forEach((figure, i) => figure.classList.toggle('is-current', i === 0));
  });
}
