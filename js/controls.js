/**
 * The controls above the grid: three densities, and a switch between equal
 * heights and relative sizes.
 *
 * Both only change how the grid is drawn — a custom property and a class — and
 * both fire `gridchange`, so the opening pile re-measures against the new layout
 * rather than against stale targets, and the year rail waits for the size
 * transition before deciding where to scroll.
 */
export function initControls() {
    const grid = document.querySelector('[data-grid]');
    const root = document.querySelector('[data-controls]');
    if (!grid || !root)
        return;
    const press = (buttons, active) => {
        for (const b of buttons) {
            const on = b === active;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        }
    };
    const changed = () => grid.dispatchEvent(new Event('gridchange'));
    const densities = root.querySelectorAll('[data-density]');
    for (const button of densities) {
        button.addEventListener('click', () => {
            grid.style.setProperty('--unit', `${button.dataset.density}px`);
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
                grid.classList.toggle('grid-scaled', button.dataset.scale === 'real');
                press(scales, button);
                changed();
            });
        }
    }
    else {
        for (const button of scales)
            button.closest('.control-group')?.remove();
    }
}
