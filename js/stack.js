import { reduceMotion } from './env.js';
/**
 * The opening: every painting gathered into one stack in the middle of the
 * screen, dispersing into the grid as you scroll.
 *
 * The grid is the real layout; the stack is a transform on each tile. At the top
 * of the page each tile is translated and scaled onto the pile; over the first
 * screen of scrolling those transforms ease to nothing and the tiles are simply
 * where the grid put them. Nothing is laid out twice, and the stack follows the
 * viewport while it dissolves, so it never jumps.
 *
 * Transforms are recomputed when the grid changes shape (density, filter,
 * resize), because the targets move.
 */
const SCROLL_SPAN = 0.85; // fraction of a viewport height over which the stack disperses
const FRONT = 0.38; // height of the front painting, as a fraction of the viewport
const VISIBLE = 12; // tiles given their own offset in the pile; the rest sit behind
/** Small, fixed offsets for the front of the pile — the fanned look in the mockup. */
const OFFSETS = [
    [0, 0], [0.035, -0.06], [-0.045, -0.02], [0.02, 0.055], [-0.03, 0.06],
    [0.055, 0.015], [-0.055, -0.05], [0.01, -0.075], [-0.015, 0.075], [0.045, -0.035],
    [-0.04, 0.03], [0.03, 0.04],
];
export function initStack() {
    const grid = document.querySelector('[data-stack]');
    const hero = document.querySelector('[data-hero]');
    if (!grid || !hero)
        return;
    if (reduceMotion.matches) {
        hero.remove();
        return;
    }
    const tiles = [...grid.querySelectorAll('.tile')];
    let targets = [];
    let live = [];
    let frame = 0;
    const measure = () => {
        live = tiles.filter((t) => !t.hidden);
        const h = window.innerHeight;
        targets = live.map((tile, i) => {
            const r = tile.getBoundingClientRect();
            const stackHeight = h * (i === 0 ? FRONT : FRONT - 0.02 - Math.min(i, VISIBLE) * 0.006);
            const off = i < VISIBLE ? OFFSETS[i] : [0, 0];
            return {
                tx: r.left + r.width / 2,
                ty: r.top + window.scrollY + r.height / 2,
                s: r.height ? stackHeight / r.height : 1,
                ox: off[0] * window.innerWidth,
                oy: off[1] * h,
            };
        });
    };
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const render = () => {
        frame = 0;
        const h = window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / (h * SCROLL_SPAN)));
        const e = ease(p);
        const cx = window.innerWidth / 2;
        const cy = window.scrollY + h * 0.54;
        grid.classList.toggle('is-stacked', p < 1);
        live.forEach((tile, i) => {
            const t = targets[i];
            if (e >= 1) {
                tile.style.transform = '';
                tile.style.zIndex = '';
                return;
            }
            const dx = (cx + t.ox - t.tx) * (1 - e);
            const dy = (cy + t.oy - t.ty) * (1 - e);
            const s = t.s + (1 - t.s) * e;
            tile.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
            tile.style.zIndex = String(live.length - i);
        });
    };
    const schedule = () => { if (!frame)
        frame = requestAnimationFrame(render); };
    const relayout = () => { measure(); schedule(); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', relayout, { passive: true });
    grid.addEventListener('gridchange', relayout);
    document.fonts.ready.then(relayout);
    // Images settling can shift the grid by a pixel or two; re-measure once they are in.
    window.addEventListener('load', relayout);
    relayout();
}
