import { isPlainClick, phone } from './env.js';
import { keepScroll, stepBack, stepState } from './panels.js';
/**
 * The photographs of the book open over the page.
 *
 * Each strip item is a real link to its picture, so this only steps in on a
 * plain click: the same picture opens in place, large over the blurred page,
 * and a click anywhere or Escape puts the page back. Modified clicks and
 * middle clicks keep their meaning, and with scripting off the links simply
 * open the file, which is the fallback the markup promises.
 *
 * The picture is the strip's own markup cloned — the same sources, the same
 * alt — eagerly loaded at the larger size rather than fetched twice.
 *
 * Once open, the arrow keys walk the strip: left and right step to the
 * neighbouring photograph and wrap at the ends, since eight spreads of one
 * book read as a loop rather than a list with a dead end. The swap happens in
 * place with no fade, so holding a key flips through the book. Leaving
 * returns focus to whichever photograph was showing last, not the one first
 * clicked, so the strip keeps the reader's place.
 *
 * On a phone the open view is the whole screen, with nothing on it that says
 * Close, and the first thing a hand does there is the phone's own Back. So
 * opening is a step in the history, as a panel's is (client/panels.ts): Back
 * closes the view and leaves the page, a tap closes it by going back over the
 * step, and Forward — or a reload on the step — shows the photograph again.
 */
export function initBook() {
    const view = document.querySelector('[data-book-view]');
    if (!view)
        return;
    const plate = view.querySelector('[data-book-plate]');
    if (!plate)
        return;
    let opener = null;
    // The open view stands on a history step of its own, one on from the page.
    let stepped = false;
    const books = () => [...document.querySelectorAll('a.wc-book')];
    const show = (link) => {
        const picture = link.querySelector('picture');
        if (!picture)
            return false;
        const copy = picture.cloneNode(true);
        copy.querySelector('img')?.setAttribute('loading', 'eager');
        plate.replaceChildren(copy);
        opener = link;
        return true;
    };
    const step = (by) => {
        const list = books();
        if (!list.length || !opener)
            return;
        const at = list.indexOf(opener);
        const next = list[(at + by + list.length) % list.length];
        if (next)
            show(next);
    };
    /** `byHistory`: the step is there already — Forward landed on it, or the page was reloaded on it. */
    const open = (link, byHistory = false) => {
        if (!show(link))
            return;
        // The step says which photograph, for whoever comes back to it.
        if (phone.matches && !byHistory)
            history.pushState({ view: 'book', at: books().indexOf(link) }, '');
        stepped = byHistory || phone.matches;
        view.hidden = false;
        // A forced layout between showing and fading, instead of waiting a frame:
        // a background pane may never be granted one, and a reflow is owed either
        // way. The fade then starts from a state the engine has actually built.
        void view.offsetWidth;
        view.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        view.tabIndex = -1;
        view.focus({ preventScroll: true });
    };
    /** `byHistory`: Back has already left the view's step, and only the view is left to put away. */
    const close = (byHistory = false) => {
        if (view.hidden)
            return;
        // The tap goes back over the step rather than leaving it behind, and the
        // `popstate` below does the closing.
        if (stepped && !byHistory && stepState().view === 'book') {
            stepBack();
            return;
        }
        stepped = false;
        view.classList.remove('is-open');
        view.hidden = true;
        document.body.style.overflow = '';
        opener?.focus({ preventScroll: true });
        opener = null;
    };
    // In the capture phase, ahead of the page-transition module's own click
    // listener: that one politely yields to a defaulted-prevented event, but it
    // was registered first, so the yielding only works if this runs earlier.
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a.wc-book');
        if (link && isPlainClick(event)) {
            event.preventDefault();
            open(link);
            return;
        }
        if (!view.hidden) {
            event.preventDefault();
            close();
        }
    }, { capture: true });
    // A phone's Safari sends a tap's click on to the document only when the
    // thing tapped answers clicks itself, which a plain veil does not; with a
    // listener of its own the open view does, and the tap that closes it arrives.
    view.addEventListener('click', () => close());
    /** The photograph a step of this view's names. */
    const stepLink = () => {
        const { view: whose, at } = stepState();
        return whose === 'book' && at !== undefined ? books()[at] : undefined;
    };
    window.addEventListener('popstate', () => {
        const link = stepLink();
        if (link) {
            keepScroll();
            open(link, true);
        }
        else if (stepped) {
            keepScroll();
            close(true);
        }
    });
    document.addEventListener('keydown', (event) => {
        if (view.hidden)
            return;
        if (event.key === 'Escape')
            close();
        else if (event.key === 'ArrowRight') {
            event.preventDefault();
            step(1);
        }
        else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            step(-1);
        }
    });
    // Reloaded on the view's step: the photograph is what that step shows.
    const first = stepLink();
    if (first)
        open(first, true);
}
