import { finePointer, reduceMotion } from './env.js';
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
 * Also leans the About card, which names its own inner element with
 * `data-tilt-inner`; a painting is the plate's inner by default.
 *
 * Bound to the painting and not to the figure. The figure is a grid cell as
 * wide as its column, so hovering anywhere in that column tipped a painting
 * the pointer was nowhere near; the inner element is sized to the picture, so
 * the lean begins where the picture does.
 *
 * Kept deliberately cheap. Nothing is measured or read from the stylesheet
 * while the pointer moves: the box and the numbers are taken once when the
 * pointer arrives and again only if the window changes. Reading either per
 * movement forces the browser to recompute style or layout on every event —
 * which is what made it feel heavy.
 *
 * And smoothed here, once per frame, rather than left to the pointer. The
 * pointer only says where the lean is heading; the painting follows it on its
 * own clock, easing a fixed share of the way each frame (`--tilt-follow`).
 * Before, every pointer move wrote the transform outright and a CSS transition
 * was meant to stay out of the way — but on the artwork page it never did,
 * because the rule switching it off looked for the tilting class on the
 * figure and the class goes on the picture. So each move started a fresh
 * 620ms transition from wherever the last had reached. Chromium sends moves
 * in step with the screen and blurs that into a lagging glide; Safari sends
 * them unevenly and restarts transitions less gracefully, so there the lean
 * stuttered. Driven by frames, it is the same glide on every engine.
 */
export function initTilt() {
    if (!finePointer.matches)
        return;
    for (const art of document.querySelectorAll('[data-tilt]')) {
        const inner = art.querySelector('[data-tilt-inner], .detail-plate-inner');
        if (!inner)
            continue;
        let box = null;
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
            const asNumber = (name, fallback) => {
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
        const tick = (t) => {
            const dt = last ? Math.min(64, t - last) : 16;
            last = t;
            const k = 1 - Math.exp(-dt / follow);
            now = { x: now.x + (goal.x - now.x) * k, y: now.y + (goal.y - now.y) * k };
            write();
            frame = requestAnimationFrame(tick);
        };
        const lean = (event) => {
            // A box with no size is a picture that has not arrived; a lean worked out
            // against it divides by zero and writes nothing but noise.
            if (!box || !box.width || !box.height || reduceMotion.matches)
                return;
            // A photograph on the plate (see views.ts) is a flat record, not the work.
            if (inner.classList.contains('is-photo'))
                return;
            // −1 to 1 from the middle, on each axis. Pointer to the right leans the
            // right edge away, which is a rotation about the vertical axis in the
            // same direction; about the horizontal axis the sign flips, because
            // screen y grows downwards — both applied in `write`.
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
            if (reduceMotion.matches || inner.classList.contains('is-photo'))
                return;
            read();
            // Picking up where the settle has got to, roughly, so coming back in
            // mid-settle does not snap the painting flat first.
            const left = Math.min(1, (performance.now() - leftAt) / settle);
            const remain = Math.pow(1 - left, 3);
            now = { x: now.x * remain, y: now.y * remain };
            inner.classList.add('is-tilting');
            lean(event);
            if (!frame)
                frame = requestAnimationFrame(tick);
        });
        inner.addEventListener('pointermove', lean);
        inner.addEventListener('pointerleave', rest);
        // A pointer that is cancelled — dragged off, interrupted — never sends
        // `pointerleave`, and the painting would stay leaning at nothing.
        inner.addEventListener('pointercancel', rest);
        // The box is only true for where the painting was when the pointer
        // arrived; a resize moves it under a pointer that has not left.
        window.addEventListener('resize', () => { if (box)
            read(); });
    }
}
