import { reduceMotion } from './env.ts';

/**
 * Horizontal slide-through. The track is a real scroll container with CSS
 * scroll-snap, so the browser owns the physics; this file only routes input
 * into it — a vertical wheel becomes horizontal movement, the pointer drags,
 * arrows step — and keeps the counter honest.
 */
const DRAG_THRESHOLD = 6;

export function initSliders(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-slider]')) setup(root);
}

function setup(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-slider-track]');
  const count = root.querySelector<HTMLElement>('[data-slider-count]');
  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
  if (!track || !slides.length) return;

  const behavior: ScrollBehavior = reduceMotion.matches ? 'auto' : 'smooth';

  /** Index of the slide whose centre is nearest the track's centre. */
  const current = () => {
    const middle = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let gap = Infinity;
    slides.forEach((slide, i) => {
      const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
      if (d < gap) { gap = d; best = i; }
    });
    return best;
  };

  const goTo = (index: number) => {
    const slide = slides[Math.max(0, Math.min(slides.length - 1, index))]!;
    track.scrollTo({ left: slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2, behavior });
  };

  const updateCount = () => {
    if (!count) return;
    count.textContent = (count.dataset.template ?? '{n} / {total}')
      .replace('{n}', String(current() + 1))
      .replace('{total}', String(slides.length));
  };

  // A vertical wheel over the row moves it sideways — the gesture people reach
  // for first. Horizontal wheels (trackpads) already work natively.
  track.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    track.scrollLeft += event.deltaY;
  }, { passive: false });

  // Drag with a mouse. Touch already scrolls natively.
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startLeft = track.scrollLeft;
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    track.scrollLeft = startLeft - (event.clientX - startX);
  });
  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    // A drag is not a click: swallow the click that would follow a real move.
    if (Math.abs(event.clientX - startX) > DRAG_THRESHOLD) {
      track.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true });
    }
    goTo(current());
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current() + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current() - 1); }
  });
  root.querySelector('[data-slider-prev]')?.addEventListener('click', () => goTo(current() - 1));
  root.querySelector('[data-slider-next]')?.addEventListener('click', () => goTo(current() + 1));

  // Counter follows the scroll directly; the work is a handful of offset reads.
  let last = 0;
  track.addEventListener('scroll', () => {
    const now = performance.now();
    if (now - last < 40) return;
    last = now;
    updateCount();
  }, { passive: true });
  track.addEventListener('scrollend', updateCount);

  updateCount();
}
