import { finePointer, reduceMotion } from './env.ts';

/**
 * Leans a painting towards the pointer.
 *
 * Every figure comes out of the stylesheet — `--tilt-max`, `--tilt-lift` and
 * the rest live on `.plate-art` in `05-artwork.css`, and this reads them. That
 * is deliberate: the look is a design decision and belongs where the other
 * design decisions are, so it can be tuned without opening this file. Setting
 * `--tilt-max` to 0 and `--tilt-lift` to 1 turns the lean off and leaves the
 * markup and this module doing nothing visible, which is also how the
 * reduced-motion case is handled — in CSS, not here.
 *
 * Driven straight off `pointermove` and not off a frame callback. This is the
 * opposite case to a scroll: a scroll is composited and runs ahead of script,
 * so following one by hand lags, but a pointer position only exists because an
 * event delivered it, and acting on it immediately is as current as it gets.
 * Waiting for a frame would only add one.
 *
 * Only for a real pointer. On a touch screen there is nothing hovering, and
 * `pointermove` arrives mid-tap, which would tip the painting as you press it.
 */
export function initTilt(): void {
  if (!finePointer.matches) return;

  for (const art of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
    const inner = art.querySelector<HTMLElement>('.plate-art-inner');
    if (!inner) continue;

    const knob = (name: string, fallback: number) => {
      const raw = getComputedStyle(art).getPropertyValue(name).trim();
      const value = Number.parseFloat(raw);
      return Number.isFinite(value) ? value : fallback;
    };

    const lean = (event: PointerEvent) => {
      if (reduceMotion.matches) return;
      const box = art.getBoundingClientRect();
      // −1 to 1 from the middle, on each axis.
      const x = (event.clientX - box.left) / box.width * 2 - 1;
      const y = (event.clientY - box.top) / box.height * 2 - 1;
      const max = knob('--tilt-max', 6);
      const lift = knob('--tilt-lift', 1.015);
      // Pointer to the right leans the right edge away, which is a rotation
      // about the vertical axis in the same direction; about the horizontal
      // axis the sign flips, because screen y grows downwards.
      inner.style.transform =
        `rotateY(${(x * max).toFixed(2)}deg) rotateX(${(-y * max).toFixed(2)}deg) scale(${lift})`;
    };

    const rest = () => {
      art.classList.remove('is-tilting');
      inner.style.transform = '';
    };

    art.addEventListener('pointerenter', (event) => {
      if (reduceMotion.matches) return;
      art.classList.add('is-tilting');
      lean(event);
    });
    art.addEventListener('pointermove', lean);
    art.addEventListener('pointerleave', rest);
    // A pointer that is cancelled — dragged off, interrupted — never sends
    // `pointerleave`, and the painting would stay leaning at nothing.
    art.addEventListener('pointercancel', rest);
  }
}
