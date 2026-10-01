import { reduceMotion } from './env.js';
import { SCROLL_SPAN } from './stack.js';
/**
 * The year rail. Clicking a swatch brings that year to the middle of the screen;
 * the swatch of the year you are looking at stays marked as you scroll.
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
    const grid = document.querySelector('[data-grid]');
    const tiles = grid ? [...grid.querySelectorAll('.tile')] : [];
    /*
     * Changing the density animates every tile's size for half a second, so
     * anything measured inside that window is an interpolated position rather than
     * where the year is going to be — and the rail would scroll to it. The same
     * allowance the pile gives itself for the same transition.
     */
    let settledAt = 0;
    grid?.addEventListener('gridchange', () => { settledAt = performance.now() + 560; });
    const afterRelayout = (run) => {
        const wait = settledAt - performance.now();
        if (wait > 0)
            window.setTimeout(run, wait);
        else
            run();
    };
    /**
     * Focusing a year dims every painting from another one, so the year you asked
     * for is the only thing in focus. Choosing the same year again clears it, as
     * does Escape.
     */
    let focused = '';
    const focus = (year) => {
        focused = year;
        for (const tile of tiles)
            tile.classList.toggle('is-dimmed', Boolean(year) && tile.dataset.year !== year);
        for (const link of links)
            link.setAttribute('aria-pressed', String(link.dataset.year === year));
        rail.classList.toggle('is-focused', Boolean(year));
    };
    /**
     * Where to scroll so a year sits in the middle of the screen.
     *
     * Two things stop it being simply "half a viewport above the year". The pile
     * only lets go after `SCROLL_SPAN` of scrolling, so anything above that would
     * gather the paintings back up — and take the year selection with it, since
     * that is what `stackrestart` is for. And the last years have nothing much
     * below them, so the page runs out before they reach the middle.
     *
     * Both are clamps rather than failures: the year comes as close to the centre
     * as the page allows. `scrollIntoView` could do neither, which is why this is
     * worked out by hand.
     */
    const centreOn = (target) => {
        const box = target.getBoundingClientRect();
        const wanted = box.top + window.scrollY + box.height / 2 - window.innerHeight / 2;
        // Keyed on the hero, not on `data-stack`: the attribute is still there when
        // the pile is turned off for reduced motion, but `stack.ts` removes the hero,
        // and a floor held against an opening that never runs would scroll straight
        // past the newest year and put it out of reach altogether.
        const floor = document.querySelector('[data-hero]') ? window.innerHeight * SCROLL_SPAN + 8 : 0;
        const ceiling = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        return Math.max(0, Math.min(Math.max(floor, wanted), ceiling));
    };
    for (const link of links) {
        link.setAttribute('aria-pressed', 'false');
        link.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
                return;
            const year = link.dataset.year;
            const target = document.getElementById(`year-${year}`);
            if (!target)
                return;
            event.preventDefault();
            if (focused === year) {
                focus('');
                return;
            }
            focus(year);
            afterRelayout(() => {
                window.scrollTo({ top: centreOn(target), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            });
            history.replaceState(null, '', `#year-${year}`);
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && focused)
            focus('');
    });
    /*
     * Clicking away drops the year — the most natural way out. A click that lands
     * on a painting is left alone: that one is opening the work, not dismissing
     * the selection. Bound on pointerdown so it settles before the tile's own
     * click handler runs.
     */
    document.addEventListener('pointerdown', (event) => {
        if (!focused)
            return;
        const target = event.target;
        if (target?.closest('.tile') || target?.closest('[data-years]'))
            return;
        focus('');
    });
    // Scrolling back to the opening gathers the paintings again; a year held in
    // focus from before would otherwise still be dimming most of them when the
    // grid comes back.
    document.addEventListener('stackrestart', () => { if (focused)
        focus(''); });
    // Mark the year currently under the top of the viewport.
    const start = () => {
        const anchors = links
            .map((link) => ({ link, el: document.getElementById(`year-${link.dataset.year}`) }))
            .filter((a) => a.el !== null);
        if (!anchors.length)
            return;
        const update = () => {
            // Measured at the middle of the screen, which is where choosing a year now
            // puts it — probing near the top would mark a different year than the one
            // the click just centred.
            const probe = window.innerHeight * 0.5;
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
