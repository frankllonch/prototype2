import { isPlainClick } from './env.ts';

/**
 * The photographs of the book open over the page.
 *
 * Each strip item is a real link to its picture, so this only steps in on a
 * plain click: the same picture opens in place, large over the blurred page,
 * and a click anywhere or Escape puts the page back. Modified clicks and
 * middle clicks keep their meaning, and with scripting off the links simply
 * open the file, which is the fallback the markup promises.
 *
 * The picture is the strip's own markup cloned — the same sources, the same
 * alt — eagerly loaded at the larger size rather than fetched twice.
 */
export function initBook(): void {
  const view = document.querySelector<HTMLElement>('[data-book-view]');
  if (!view) return;
  const plate = view.querySelector<HTMLElement>('[data-book-plate]');
  if (!plate) return;

  let opener: HTMLElement | null = null;

  const open = (link: HTMLAnchorElement) => {
    const picture = link.querySelector('picture');
    if (!picture) return;
    const copy = picture.cloneNode(true) as HTMLElement;
    copy.querySelector('img')?.setAttribute('loading', 'eager');
    plate.replaceChildren(copy);
    view.hidden = false;
    // A forced layout between showing and fading, instead of waiting a frame:
    // a background pane may never be granted one, and a reflow is owed either
    // way. The fade then starts from a state the engine has actually built.
    void view.offsetWidth;
    view.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    opener = link;
    view.tabIndex = -1;
    view.focus({ preventScroll: true });
  };

  const close = () => {
    if (view.hidden) return;
    view.classList.remove('is-open');
    view.hidden = true;
    document.body.style.overflow = '';
    opener?.focus({ preventScroll: true });
    opener = null;
  };

  // In the capture phase, ahead of the page-transition module's own click
  // listener: that one politely yields to a defaulted-prevented event, but it
  // was registered first, so the yielding only works if this runs earlier.
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a.wc-book');
      if (link && isPlainClick(event)) {
        event.preventDefault();
        open(link);
        return;
      }
      if (!view.hidden) {
        event.preventDefault();
        close();
      }
    },
    { capture: true },
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}
