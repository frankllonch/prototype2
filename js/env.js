/** Media queries every module consults. Evaluated once, shared everywhere. */
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
/**
 * The phone layout: everything below 900px wide. The one definition of it for
 * scripts — the stylesheets say `(max-width: 899px)` and the head of every
 * page makes the same test before the first paint (components/layout.ts).
 */
export const phone = window.matchMedia('(max-width: 899px)');
/** A screen held upright. Only the phone layout asks: see `scrollWrites`. */
export const portrait = window.matchMedia('(orientation: portrait)');
/**
 * Whether the scroll writes the words here — the note on What's Color and the
 * statement on the Colour Chart, typed in as the page is scrolled down and
 * taken away as it is scrolled back up. The one test for scripts; the
 * stylesheets make the same one around each stage.
 *
 * Wherever the engine runs scroll-driven animations and motion is not
 * reduced — and on a phone only when it is held upright (Frank, 2026-11-15):
 * turned on its side the screen is too short for the pinned words, which
 * would be typed below its edge, so there the words simply stand, as they do
 * everywhere the scene does not run. Asked at the moment it matters rather
 * than once, because a phone turned mid-page changes the answer and the
 * stylesheet with it.
 */
export const scrollWrites = (timeline = 'view()', upright = portrait) => !reduceMotion.matches &&
    CSS.supports(`animation-timeline: ${timeline}`) &&
    (!phone.matches || upright.matches);
/** True for a plain left click — modified clicks mean "open this elsewhere". */
export const isPlainClick = (event) => !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
/**
 * Gives focus back to the photograph a viewer was opened from, or was last
 * showing, without the photograph answering as if it were hovered.
 *
 * Focus has to go back there, so a keyboard carries on from the same place.
 * But the browser decides whether that focus *shows* from the last input it
 * saw, and inside a viewer that is the arrow keys and Escape — so the
 * photograph came back lifted, or dimmed, and stayed so with the pointer
 * nowhere near it (Frank, 2026-11-17). Marked here, the stylesheets hold its
 * focus-visible look back until focus leaves it; hovering it still answers.
 */
export function returnFocus(el) {
    if (!el)
        return;
    el.dataset.quietFocus = '';
    el.focus({ preventScroll: true });
    const done = () => { delete el.dataset.quietFocus; };
    // Focus may not take — the element hidden, or gone — and a mark left behind
    // would quiet the next, real, keyboard focus.
    if (document.activeElement === el)
        el.addEventListener('blur', done, { once: true });
    else
        done();
}
