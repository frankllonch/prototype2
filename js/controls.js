/**
 * The density control: three grid sizes. It sets one custom property, and fires
 * `gridchange` so the opening pile re-measures against the new layout rather
 * than against stale targets.
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
}
