import { isPlainClick, reduceMotion } from './env.js';
/**
 * A painting opens over the contact sheet: the grid stays put, blurred, and you
 * move between works without a page load.
 *
 * One transition per action, and only one in flight. Every navigation takes a
 * ticket; when the fade-out finishes the swap happens only if that ticket is
 * still the current one. A second click issues a new ticket, so the older one
 * lapses instead of racing it.
 *
 * History: opening pushes one entry, moving between works replaces it. Back
 * therefore leaves the lightbox in a single press.
 */
/** Must match `.lightbox-plate`'s transition in the stylesheet. */
const FADE = 420;
const SWIPE = 48;
const PLATE_SIZES = '(max-width: 900px) 92vw, 46vw';
export function initLightbox() {
    const box = document.querySelector('[data-lightbox]');
    const galleryEl = document.querySelector('[data-lightbox-source]');
    if (!box || !galleryEl)
        return;
    const plate = box.querySelector('[data-lightbox-plate]');
    const titleEl = box.querySelector('[data-lightbox-title]');
    const countEl = box.querySelector('[data-lightbox-count]');
    const metaEl = box.querySelector('[data-lightbox-meta]');
    const prevBtn = box.querySelector('[data-lightbox-prev]');
    const nextBtn = box.querySelector('[data-lightbox-next]');
    const tiles = () => [...galleryEl.querySelectorAll('.tile')].filter((t) => !t.hidden);
    let current = -1;
    let ticket = 0;
    let pending = 0;
    /**
     * The close teardown, held so reopening can cancel it. An unowned one belongs
     * to the close it was started by and knows nothing of what happened since: a
     * painting opened inside its window was torn down under the reader, and the
     * scroll lock went with it.
     */
    let teardown = 0;
    /** Whether the lightbox is meant to be on screen right now. */
    let shown = false;
    let openedAt = '';
    const fill = (tile, index, total) => {
        plate.replaceChildren(largePicture(tile));
        const d = tile.dataset;
        titleEl.textContent = d.title ?? '';
        countEl.textContent = (countEl.dataset.template ?? '{n} / {total}')
            .replace('{n}', String(index + 1)).replace('{total}', String(total));
        const facts = [d.dimensions, d.materials, d.year];
        if (d.available === 'true')
            facts.push(box.dataset.availableLabel);
        metaEl.replaceChildren(...facts.filter((f) => Boolean(f)).map(line));
    };
    const show = (index, animate) => {
        const list = tiles();
        if (!list.length)
            return;
        const wrapped = (index + list.length) % list.length;
        if (wrapped === current && animate)
            return;
        const tile = list[wrapped];
        current = wrapped;
        const href = tile.getAttribute('href');
        if (href)
            history.replaceState({ lightbox: true }, '', href);
        const mine = ++ticket;
        if (!animate || reduceMotion.matches) {
            fill(tile, wrapped, list.length);
            box.classList.remove('is-changing');
            return;
        }
        box.classList.add('is-changing');
        window.clearTimeout(pending);
        pending = window.setTimeout(() => {
            if (mine !== ticket)
                return; // a newer navigation won; drop this one
            fill(tile, wrapped, list.length);
            box.classList.remove('is-changing');
        }, FADE);
    };
    const open = (tile) => {
        // A close still counting down belongs to the painting that was on screen
        // before this one, and would otherwise empty the plate under it.
        window.clearTimeout(teardown);
        shown = true;
        openedAt = location.pathname + location.search;
        box.hidden = false;
        document.body.classList.add('is-locked');
        current = -1;
        show(tiles().indexOf(tile), false);
        // Opened on the next frame so the fade has a value to start from — and only
        // if it has not been closed again in the meantime, or the class would be put
        // back on something already shutting.
        requestAnimationFrame(() => { if (shown)
            box.classList.add('is-open'); });
        history.pushState({ lightbox: true }, '', tile.getAttribute('href') ?? location.href);
        nextBtn.focus({ preventScroll: true });
    };
    const close = (restore) => {
        if (box.hidden)
            return;
        shown = false;
        ticket++;
        window.clearTimeout(pending);
        window.clearTimeout(teardown);
        box.classList.remove('is-open', 'is-changing');
        document.body.classList.remove('is-locked');
        // Held until the fade has finished, or the painting vanishes mid-close.
        teardown = window.setTimeout(() => { box.hidden = true; plate.replaceChildren(); }, 620);
        if (restore && openedAt)
            history.replaceState({}, '', openedAt);
        tiles()[current]?.focus({ preventScroll: true });
    };
    galleryEl.addEventListener('click', (event) => {
        const tile = event.target.closest('.tile');
        if (!tile || !isPlainClick(event))
            return;
        event.preventDefault();
        open(tile);
    });
    prevBtn.addEventListener('click', () => show(current - 1, true));
    nextBtn.addEventListener('click', () => show(current + 1, true));
    box.querySelector('[data-lightbox-close]')?.addEventListener('click', () => close(true));
    box.querySelector('[data-lightbox-veil]')?.addEventListener('click', () => close(true));
    document.addEventListener('keydown', (event) => {
        if (box.hidden)
            return;
        if (event.key === 'Escape')
            close(true);
        else if (event.key === 'ArrowLeft')
            show(current - 1, true);
        else if (event.key === 'ArrowRight')
            show(current + 1, true);
    });
    let startX = 0;
    let startY = 0;
    box.addEventListener('touchstart', (e) => {
        startX = e.changedTouches[0].clientX;
        startY = e.changedTouches[0].clientY;
    }, { passive: true });
    box.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy))
            show(current + (dx < 0 ? 1 : -1), true);
    }, { passive: true });
    window.addEventListener('popstate', () => { if (!box.hidden)
        close(false); });
}
/**
 * The plate, rebuilt from the tile's own <picture> at a larger size. `sizes` is
 * a width and must be expressed as one; the height cap lives in the stylesheet.
 */
function largePicture(tile) {
    const picture = tile.querySelector('picture');
    const clone = (picture?.cloneNode(true) ?? document.createElement('span'));
    clone.classList.remove('tile-image');
    for (const source of clone.querySelectorAll('source'))
        source.setAttribute('sizes', PLATE_SIZES);
    const img = clone.querySelector('img');
    if (img) {
        img.setAttribute('sizes', PLATE_SIZES);
        img.loading = 'eager';
        img.removeAttribute('fetchpriority');
    }
    return clone;
}
function line(text) {
    const span = document.createElement('span');
    span.textContent = text;
    return span;
}
