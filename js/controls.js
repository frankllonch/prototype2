import { reduceMotion } from './env.js';
import { nextHue } from './hues.js';
/**
 * The controls above the grid: three densities, and a switch between equal
 * heights and relative sizes.
 *
 * Both only change how the grid is drawn — a custom property and a class — and
 * both fire `gridchange`, so the opening pile re-measures against the new layout
 * rather than against stale targets, and the year rail waits for the move
 * before deciding where to scroll.
 *
 * The one pressed is named in a colour from the site's list, a different one
 * at every press — the way the index rows answer the pointer. The controls are
 * drawn as the difference of what scrolls under them, so the colour is given
 * as its negative and comes out as itself over paper.
 */
const MORPH_MS = 500;
export function initControls() {
    const grid = document.querySelector('[data-grid]');
    const root = document.querySelector('[data-controls]');
    if (!grid || !root)
        return;
    const press = (buttons, active) => {
        const n = nextHue();
        for (const b of buttons) {
            const on = b === active;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
            b.style.color = on && n >= 0 ? `var(--neg-${n})` : '';
        }
    };
    const changed = () => grid.dispatchEvent(new Event('gridchange'));
    const densities = root.querySelectorAll('[data-density]');
    for (const button of densities) {
        button.addEventListener('click', () => {
            morph(grid, () => grid.style.setProperty('--unit', button.dataset.density ?? ''));
            press(densities, button);
            changed();
        });
    }
    /*
     * The sizing switch is only offered where the tiles were given their real
     * sizes to draw at; without them every work would claim the same scale, which
     * would be a worse lie than showing them all the same on purpose.
     */
    const scales = root.querySelectorAll('[data-scale]');
    if (grid.hasAttribute('data-scalable')) {
        for (const button of scales) {
            button.addEventListener('click', () => {
                morph(grid, () => grid.classList.toggle('grid-scaled', button.dataset.scale === 'real'));
                press(scales, button);
                changed();
            });
        }
    }
    else {
        for (const button of scales)
            button.closest('.control-group')?.remove();
    }
    // The ones pressed on arrival take their colour too.
    for (const group of [densities, scales]) {
        const active = [...group].find((b) => b.classList.contains('is-active'));
        if (active)
            press(group, active);
    }
}
/**
 * Change the grid and let every painting travel to its new place.
 *
 * The rows fill the width, so a change of size re-wraps them: a painting can
 * move to another row, and the row it left re-spreads to the edge. A size
 * transition cannot carry that — the size animates but the re-wrap is a jump,
 * and it jumps again at every width the transition passes through. So the
 * layout is changed in one step, and each tile is then drawn where it was,
 * and eased to where it is: measure, change, measure again, and animate the
 * transform that joins the two. The layout itself never moves; only the
 * paintings do, on the compositor.
 */
function morph(grid, change) {
    if (reduceMotion.matches || grid.classList.contains('is-stacked')) {
        change();
        return;
    }
    const tiles = [...grid.querySelectorAll('.tile')].filter((t) => !t.hidden);
    const before = tiles.map((t) => t.getBoundingClientRect());
    change();
    tiles.forEach((tile, i) => {
        const was = before[i];
        const now = tile.getBoundingClientRect();
        if (!was.width || !now.width)
            return;
        // The tiles turn about their centre (the pile needs that), so the move is
        // the move of the centre, and the size the ratio of the two boxes.
        const dx = (was.left + was.width / 2) - (now.left + now.width / 2);
        const dy = (was.top + was.height / 2) - (now.top + now.height / 2);
        const sx = was.width / now.width;
        const sy = was.height / now.height;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.002 && Math.abs(sy - 1) < 0.002)
            return;
        tile.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }], { duration: MORPH_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    });
}
