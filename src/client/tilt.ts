import { finePointer, reduceMotion } from './env.ts';

/**
 * Leans a painting towards the pointer.
 *
 * Every figure comes out of the stylesheet — `--tilt-max`, `--tilt-lift` and
 * the rest live on `.detail-plate` in `05-artwork.css`, and this reads them.
 * That is deliberate: the look is a design decision and belongs where the
 * other design decisions are, so it can be tuned without opening this file.
 * Setting `--tilt-max` to 0 and `--tilt-lift` to 1 turns the lean off, which
 * is also how the reduced-motion case is handled — in CSS, not here.
 *
 * Bound to the painting and not to the figure. The figure is a grid cell as
 * wide as its column, so hovering anywhere in that column tipped a painting
 * the pointer was nowhere near; the inner element is sized to the picture, so
 * the lean begins where the picture does.
 *
 * Kept deliberately cheap. Nothing is measured or read from the stylesheet
 * while the pointer moves: the box and the two numbers are taken once when
 * the pointer arrives and again only if the window changes. Reading either
 * per movement forces the browser to recompute style or layout on every event
 * — which is what made it feel heavy — and the one thing left in the handler
 * is a transform, which the compositor can do without repainting.
 */
export function initTilt(): void {
  if (!finePointer.matches) return;

  for (const art of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
    const inner = art.querySelector<HTMLElement>('.detail-plate-inner');
    if (!inner) continue;

    let box: DOMRect | null = null;
    let max = 6;
    let lift = 1.015;

    const read = () => {
      const style = getComputedStyle(art);
      const asNumber = (name: string, fallback: number) => {
        const value = Number.parseFloat(style.getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
      };
      max = asNumber('--tilt-max', 6);
      lift = asNumber('--tilt-lift', 1.015);
      box = inner.getBoundingClientRect();
    };

    const lean = (event: PointerEvent) => {
      if (!box || reduceMotion.matches) return;
      // −1 to 1 from the middle, on each axis.
      const x = (event.clientX - box.left) / box.width * 2 - 1;
      const y = (event.clientY - box.top) / box.height * 2 - 1;
      // Pointer to the right leans the right edge away, which is a rotation
      // about the vertical axis in the same direction; about the horizontal
      // axis the sign flips, because screen y grows downwards.
      inner.style.transform =
        `rotateY(${(x * max).toFixed(2)}deg) rotateX(${(-y * max).toFixed(2)}deg) scale(${lift})`;
    };

    const rest = () => {
      box = null;
      inner.classList.remove('is-tilting');
      inner.style.transform = '';
    };

    inner.addEventListener('pointerenter', (event) => {
      if (reduceMotion.matches) return;
      read();
      inner.classList.add('is-tilting');
      lean(event);
    });
    inner.addEventListener('pointermove', lean);
    inner.addEventListener('pointerleave', rest);
    // A pointer that is cancelled — dragged off, interrupted — never sends
    // `pointerleave`, and the painting would stay leaning at nothing.
    inner.addEventListener('pointercancel', rest);
    // The box is only true for where the painting was when the pointer
    // arrived; a resize moves it under a pointer that has not left.
    window.addEventListener('resize', () => { if (box) read(); });
  }
}
