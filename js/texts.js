import { isPlainClick, reduceMotion } from './env.js';
/**
 * The opening view's three texts.
 *
 * ‘Read more’ swaps the cut text for the whole of it, in place; any other
 * plain click on a block is the block being used as the doorway it looks
 * like, and goes through the heading's own link so the page leaves the way
 * every other departure does. Modified clicks are left alone — the heading is
 * a real link and knows what a cmd-click means.
 */
export function initWcTexts() {
    const texts = document.querySelector('.wc-texts');
    if (!texts)
        return;
    texts.addEventListener('click', (event) => {
        const target = event.target;
        const more = target.closest('.wc-more');
        if (more) {
            event.preventDefault();
            const block = more.closest('.wc-text');
            if (block) {
                block.classList.add('is-open');
                more.setAttribute('aria-expanded', 'true');
            }
            return;
        }
        const less = target.closest('.wc-less');
        if (less) {
            event.preventDefault();
            const block = less.closest('.wc-text');
            if (block) {
                block.classList.remove('is-open');
                block.querySelector('.wc-more')?.setAttribute('aria-expanded', 'false');
                // Folding a long text can leave the reader staring past its end;
                // bring the block's head back if it has gone over the top.
                if (block.getBoundingClientRect().top < 0) {
                    block.scrollIntoView({
                        block: 'start',
                        behavior: reduceMotion.matches ? 'auto' : 'smooth',
                    });
                }
            }
            return;
        }
        if (target.closest('a'))
            return;
        if (!isPlainClick(event))
            return;
        const block = target.closest('.wc-text');
        if (!block)
            return;
        const visible = block.querySelector(block.classList.contains('is-open') ? '.wc-text-open .wc-text-head a' : '.wc-text-closed .wc-text-head a');
        visible?.click();
    });
}
