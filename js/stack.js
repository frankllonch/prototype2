import { reduceMotion } from './env.js';
/**
 * The opening: every painting gathered into one pile in the middle of the
 * screen, dispersing into the grid as you scroll.
 *
 * The grid is the real layout; the pile is a transform on each tile. At the top
 * of the page each tile is translated and scaled onto the pile; over the first
 * screen of scrolling those transforms ease to nothing and the tiles are simply
 * where the grid put them. Nothing is laid out twice.
 *
 * Three rules keep it from breaking:
 *
 * 1. **Measure untransformed.** `getBoundingClientRect()` returns the
 *    *transformed* box, so measuring mid-animation would read a tile's pile
 *    position and compute nonsense from it. Every measure clears the transforms
 *    first. This was what made changing the year mid-animation go haywire.
 * 2. **Always start at the top.** Browsers restore the scroll position on
 *    reload; landing mid-animation with a half-built grid is what left the
 *    paintings invisible. The page takes scroll restoration into its own hands.
 * 3. **Never leave a tile hidden.** Any failure path — zero-height tiles, a
 *    measure that never happened, the watchdog — ends with the transforms
 *    cleared and the grid interactive.
 */
const SCROLL_SPAN = 0.85; // fraction of a viewport height over which the pile disperses
const FRONT = 0.38; // height of the front painting, as a fraction of the viewport
const VISIBLE = 12; // tiles given their own offset in the pile; the rest sit behind
const WATCHDOG = 4000; // ms: if the pile has not resolved by now, give up and show the grid
/** Small, fixed offsets for the front of the pile — the fanned look in the mockup. */
const OFFSETS = [
    [0, 0], [0.035, -0.06], [-0.045, -0.02], [0.02, 0.055], [-0.03, 0.06],
    [0.055, 0.015], [-0.055, -0.05], [0.01, -0.075], [-0.015, 0.075], [0.045, -0.035],
    [-0.04, 0.03], [0.03, 0.04],
];
export function initStack() {
    const grid = document.querySelector('[data-stack]');
    const hero = document.querySelector('[data-hero]');
    const root = document.documentElement;
    // Pages without a pile (exhibitions, collaborations) must not wait for one.
    if (!grid || !hero) {
        finish();
        return;
    }
    const tiles = [...grid.querySelectorAll('.tile')];
    if (!tiles.length || reduceMotion.matches) {
        hero.remove();
        finish();
        return;
    }
    root.classList.add('stack-running');
    // The pile only makes sense from the top of the page.
    if ('scrollRestoration' in history)
        history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    let targets = [];
    let live = [];
    let frame = 0;
    let done = false;
    let measured = false;
    const clearTransforms = () => {
        for (const tile of tiles) {
            tile.style.transform = '';
            tile.style.zIndex = '';
        }
    };
    const measure = () => {
        // Clear first: a transformed element reports its transformed box, and the
        // whole pile is computed from where the tiles *would* sit without it.
        clearTransforms();
        live = tiles.filter((tile) => !tile.hidden);
        const h = window.innerHeight;
        const scroll = window.scrollY;
        targets = live.map((tile, i) => {
            const r = tile.getBoundingClientRect();
            const pileHeight = h * (i === 0 ? FRONT : FRONT - 0.02 - Math.min(i, VISIBLE) * 0.006);
            const off = i < VISIBLE ? OFFSETS[i] : [0, 0];
            return {
                tx: r.left + r.width / 2,
                ty: r.top + scroll + r.height / 2,
                s: r.height ? pileHeight / r.height : 1,
                ox: off[0] * window.innerWidth,
                oy: off[1] * h,
            };
        });
        measured = live.length > 0 && live.every((tile) => tile.getBoundingClientRect().height > 0);
    };
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const render = () => {
        frame = 0;
        if (done)
            return;
        const h = window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / (h * SCROLL_SPAN)));
        const e = ease(p);
        // Without a trustworthy measurement there is nothing sensible to draw, so
        // show the grid rather than scatter the tiles on bad numbers.
        if (!measured) {
            finishNow();
            return;
        }
        if (e >= 1) {
            finishNow();
            return;
        }
        grid.classList.add('is-stacked');
        const cx = window.innerWidth / 2;
        const cy = window.scrollY + h * 0.54;
        live.forEach((tile, i) => {
            const t = targets[i];
            const dx = (cx + t.ox - t.tx) * (1 - e);
            const dy = (cy + t.oy - t.ty) * (1 - e);
            const s = t.s + (1 - t.s) * e;
            tile.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
            tile.style.zIndex = String(live.length - i);
        });
    };
    /** The pile has resolved: drop every transform and hand the page over. */
    function finishNow() {
        if (done)
            return;
        done = true;
        clearTransforms();
        grid.classList.remove('is-stacked');
        window.clearTimeout(watchdog);
        finish();
    }
    const schedule = () => { if (!frame && !done)
        frame = requestAnimationFrame(render); };
    const relayout = () => { if (done)
        return; measure(); schedule(); };
    const watchdog = window.setTimeout(finishNow, WATCHDOG);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', relayout, { passive: true });
    // The grid can change shape under the pile (density, filter). Re-measure, never
    // reuse stale targets.
    grid.addEventListener('gridchange', relayout);
    window.addEventListener('load', relayout);
    void document.fonts.ready.then(relayout);
    relayout();
}
/**
 * Reveal whatever waits for the pile — the year rail and the grid controls.
 * Called on every path, including the ones where no pile ever runs, so nothing
 * can be left hidden behind an animation that did not happen.
 */
function finish() {
    document.documentElement.classList.remove('stack-running');
    document.dispatchEvent(new CustomEvent('stackdone'));
}
