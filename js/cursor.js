import { finePointer, reduceMotion } from './env.js';
/**
 * Over a painting the pointer *becomes* its name — title and year, read from
 * the tile's own data attributes, drawn where the arrow would be. The arrow is
 * hidden for as long as the label stands in for it.
 *
 * It is decoration, never the only way to learn what a painting is: the same
 * title is the tile's accessible name, so a keyboard or screen-reader user gets
 * it without this, and coarse pointers never see it at all.
 */
export function initCursor() {
    const cursor = document.querySelector('[data-cursor]');
    const label = cursor?.querySelector('.cursor-label');
    if (!cursor || !label || !finePointer.matches)
        return;
    // Only now is it safe to take the arrow away over a tile: without this class
    // a browser that never runs the script would leave people with no pointer.
    document.documentElement.classList.add('has-cursor');
    let targetX = 0, targetY = 0, x = 0, y = 0;
    let active = false;
    let frame = 0;
    let placed = false;
    let tickedAt = 0;
    const tick = (time) => {
        // Lerp toward the pointer; the lag is what gives it weight. A fifth of
        // the way per frame at 120fps — the pace it was approved at — applied by
        // elapsed time, so the weight is the same in Safari, which draws at 60.
        const elapsed = tickedAt ? Math.min(time - tickedAt, 100) : 1000 / 120;
        tickedAt = time;
        const ease = reduceMotion.matches ? 1 : 1 - Math.pow(0.8, elapsed / (1000 / 120));
        x += (targetX - x) * ease;
        y += (targetY - y) * ease;
        cursor.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        frame = Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1 || active
            ? requestAnimationFrame(tick)
            : 0;
        if (!frame)
            tickedAt = 0;
    };
    /** Decide what the pointer is over, given the element under it. */
    const refresh = (target) => {
        const tile = target?.closest('.tile');
        // A tile piled up in the opening animation, or dimmed by a year filter, is
        // not really under the pointer.
        const usable = tile && !tile.closest('.is-stacked') && !tile.classList.contains('is-dimmed')
            ? tile : null;
        const title = usable?.dataset.title ?? '';
        if (usable && title) {
            const year = usable.dataset.year;
            const text = year ? `${title}, ${year}` : title;
            if (label.textContent !== text)
                label.textContent = text;
            if (!active) {
                active = true;
                cursor.classList.add('is-visible');
            }
            // Snap rather than trail while it is standing in for the pointer.
            x = targetX;
            y = targetY;
        }
        else if (active) {
            active = false;
            cursor.classList.remove('is-visible');
        }
        if (!frame)
            frame = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse')
            return;
        targetX = event.clientX;
        targetY = event.clientY;
        // Start where the pointer already is, or the label swoops in from 0,0.
        if (!placed) {
            placed = true;
            x = targetX;
            y = targetY;
        }
        refresh(event.target);
    }, { passive: true });
    // The page can move under a pointer that has not: a scroll carries a tile
    // away, or gathers the grid back into the pile, and the label would stay on
    // as the name of nothing. Look again at what is under the pointer now —
    // once a frame at most. A scroll can fire several times a frame, and each
    // look is a synchronous hit test of the whole page; Chromium shrugs that
    // off, Safari pays for every one, which it felt during the opening's unfold.
    let looking = 0;
    const relook = () => {
        if (!placed || looking)
            return;
        looking = requestAnimationFrame(() => {
            looking = 0;
            refresh(document.elementFromPoint(targetX, targetY));
        });
    };
    window.addEventListener('scroll', relook, { passive: true });
    document.addEventListener('stackrestart', relook);
    // Coming back to the gallery restores it from the cache exactly as it was
    // left — with the name of the painting just clicked still on the pointer,
    // which then blinked off on the first movement. Arrive with it off.
    const clear = () => { active = false; cursor.classList.remove('is-visible'); };
    window.addEventListener('pageshow', clear);
    window.addEventListener('pagehide', clear);
    document.addEventListener('pointerleave', () => {
        active = false;
        cursor.classList.remove('is-visible');
    });
}
