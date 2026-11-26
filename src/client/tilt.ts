import { finePointer, reduceMotion } from './env.ts';

/** Leans a painting towards the pointer. */
export function initTilt(): void {
  if (!finePointer.matches) return;

  for (const art of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
    const inner = art.querySelector<HTMLElement>('[data-tilt-inner], .detail-plate-inner');
    if (!inner) continue;

    let box: DOMRect | null = null;
    let max = 6;
    let lift = 1.015;
    /** Time constant of the follow, in ms: smaller is tighter to the pointer. */
    let follow = 110;
    let settle = 620;
    /** Where the lean is heading (−1 to 1 on each axis) and where it is. */
    let goal = { x: 0, y: 0 };
    let now = { x: 0, y: 0 };
    let frame = 0;
    let last = 0;
    let leftAt = 0;

    const read = () => {
      const style = getComputedStyle(art);
      const asNumber = (name: string, fallback: number) => {
        const value = Number.parseFloat(style.getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
      };
      max = asNumber('--tilt-max', 6);
      lift = asNumber('--tilt-lift', 1.015);
      follow = Math.max(1, asNumber('--tilt-follow', 110));
      settle = asNumber('--tilt-settle', 0.62) * (style.getPropertyValue('--tilt-settle').trim().endsWith('ms') ? 1 : 1000);
      box = inner.getBoundingClientRect();
    };

    const write = () => {
      // The lift rises with the lean rather than jumping in at the first move.
      const reach = Math.min(1, Math.hypot(now.x, now.y) * 2);
      const s = 1 + (lift - 1) * Math.max(reach, 0.6);
      inner.style.transform =
        `rotateY(${(now.x * max).toFixed(3)}deg) rotateX(${(-now.y * max).toFixed(3)}deg) scale(${s.toFixed(4)})`;
    };

    const tick = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      const k = 1 - Math.exp(-dt / follow);
      now = { x: now.x + (goal.x - now.x) * k, y: now.y + (goal.y - now.y) * k };
      write();
      frame = requestAnimationFrame(tick);
    };

    const lean = (event: PointerEvent) => {
      // A box with no size is a picture that has not arrived; a lean worked out against it divides
      // by zero and writes nothing but noise.
      if (!box || !box.width || !box.height || reduceMotion.matches) return;
      // A photograph on the plate (see views.ts) is a flat record, not the work.
      if (inner.classList.contains('is-photo')) return;
      // −1 to 1 from the middle, on each axis.
      goal = {
        x: (event.clientX - box.left) / box.width * 2 - 1,
        y: (event.clientY - box.top) / box.height * 2 - 1,
      };
    };

    const rest = () => {
      box = null;
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      leftAt = performance.now();
      inner.classList.remove('is-tilting');
      // Handed back to the stylesheet's own settle transition from here.
      inner.style.transform = '';
    };

    inner.addEventListener('pointerenter', (event) => {
      if (reduceMotion.matches || inner.classList.contains('is-photo')) return;
      read();
      // Picking up where the settle has got to, roughly, so coming back in mid-settle does not
      // snap the painting flat first.
      const left = Math.min(1, (performance.now() - leftAt) / settle);
      const remain = Math.pow(1 - left, 3);
      now = { x: now.x * remain, y: now.y * remain };
      inner.classList.add('is-tilting');
      lean(event);
      if (!frame) frame = requestAnimationFrame(tick);
    });
    inner.addEventListener('pointermove', lean);
    inner.addEventListener('pointerleave', rest);
    // A pointer that is cancelled — dragged off, interrupted — never sends `pointerleave`, and the
    // painting would stay leaning at nothing.
    inner.addEventListener('pointercancel', rest);
    // The box is only true for where the painting was when the pointer arrived; a resize moves it
    // under a pointer that has not left.
    window.addEventListener('resize', () => { if (box) read(); });
  }
}
