import { reduceMotion } from './env.js';
/**
 * The year rail. Clicking a swatch scrolls to that year in the grid; the swatch
 * of the year you are looking at stays marked as you scroll.
 *
 * The links are plain anchors to ids in the grid, so this only adds the smooth
 * scroll and the current-year marking. It also never runs while the opening
 * pile is still moving: the rail is revealed by `stackdone`, and the marking
 * observer is only wired up then, so a mid-animation measurement can never
 * reach it.
 */
export function initYears() {
    const rail = document.querySelector('[data-years]');
    if (!rail)
        return;
    const links = [...rail.querySelectorAll('.year')];
    if (!links.length)
        return;
    for (const link of links) {
        link.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
                return;
            const target = document.getElementById(`year-${link.dataset.year}`);
            if (!target)
                return;
            event.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
            history.replaceState(null, '', `#year-${link.dataset.year}`);
        });
    }
    // Mark the year currently under the top of the viewport.
    const start = () => {
        const anchors = links
            .map((link) => ({ link, el: document.getElementById(`year-${link.dataset.year}`) }))
            .filter((a) => a.el !== null);
        if (!anchors.length)
            return;
        const update = () => {
            const probe = window.innerHeight * 0.25;
            let current = anchors[0];
            for (const anchor of anchors) {
                if (anchor.el.getBoundingClientRect().top <= probe)
                    current = anchor;
            }
            for (const { link } of anchors)
                link.classList.toggle('is-current', link === current.link);
        };
        let last = 0;
        window.addEventListener('scroll', () => {
            const now = performance.now();
            if (now - last < 60)
                return;
            last = now;
            update();
        }, { passive: true });
        window.addEventListener('scrollend', update);
        update();
    };
    document.addEventListener('stackdone', start, { once: true });
}
