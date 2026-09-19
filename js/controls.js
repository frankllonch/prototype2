/**
 * The controls above a grid: density (row height) and, on the artwork page, a
 * year filter. Density is one custom property; the filter is a `hidden` toggle.
 * Either change fires `gridchange` on the grid so the stack can re-measure.
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
    const years = root.querySelectorAll('[data-year-filter]');
    const tiles = grid.querySelectorAll('.tile');
    for (const button of years) {
        button.addEventListener('click', () => {
            const year = button.dataset.yearFilter;
            for (const tile of tiles)
                tile.hidden = year !== 'all' && tile.dataset.year !== year;
            press(years, button);
            changed();
        });
    }
}
