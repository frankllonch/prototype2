import { isPlainClick, phone, returnFocus, targetElement } from './env.ts';
import { keepScroll, stepBack, stepState } from './panels.ts';

/** The photographs of the book open over the page. */
export function initBook(): void {
  const view = document.querySelector<HTMLElement>('[data-book-view]');
  if (!view) return;
  const plate = view.querySelector<HTMLElement>('[data-book-plate]');
  if (!plate) return;

  let opener: HTMLAnchorElement | null = null;

  // The view's two chevrons are drawn in the negative, and the page's <main> is a group of its own
  // (isolation), so a blend inside it would only reach the view's pale veil and come out grey.
  const turns = [...document.querySelectorAll<HTMLElement>('[data-book-step]')];
  document.body.append(...turns);
  const showTurns = (on: boolean) => { for (const t of turns) t.classList.toggle('is-shown', on); };
  // The open view stands on a history step of its own, one on from the page.
  let stepped = false;

  const books = () => [...document.querySelectorAll<HTMLAnchorElement>('a.wc-book')];

  const show = (link: HTMLAnchorElement) => {
    const picture = link.querySelector('picture');
    if (!picture) return false;
    const copy = picture.cloneNode(true) as HTMLElement;
    copy.querySelector('img')?.setAttribute('loading', 'eager');
    plate.replaceChildren(copy);
    opener = link;
    return true;
  };

  const step = (by: number) => {
    const list = books();
    if (!list.length || !opener) return;
    const at = list.indexOf(opener);
    const next = list[(at + by + list.length) % list.length];
    if (next) show(next);
  };

  /**
   * `byHistory`: the step is there already — Forward landed on it, or the page
   * was reloaded on it.
   */
  const open = (link: HTMLAnchorElement, byHistory = false) => {
    if (!show(link)) return;
    // The step says which photograph, for whoever comes back to it.
    if (phone.matches && !byHistory) history.pushState({ view: 'book', at: books().indexOf(link) }, '');
    stepped = byHistory || phone.matches;
    view.hidden = false;
    // A forced layout between showing and fading, instead of waiting a frame: a background pane
    // may never be granted one, and a reflow is owed either way.
    void view.offsetWidth;
    view.classList.add('is-open');
    showTurns(true);
    document.body.style.overflow = 'hidden';
    view.tabIndex = -1;
    view.focus({ preventScroll: true });
  };

  /** `byHistory`: Back has already left the view's step, and only the view is left to put away. */
  const close = (byHistory = false) => {
    if (view.hidden) return;
    // The tap goes back over the step rather than leaving it behind, and the `popstate` below does
    // the closing.
    if (stepped && !byHistory && stepState().view === 'book') { stepBack(); return; }
    stepped = false;
    view.classList.remove('is-open');
    showTurns(false);
    view.hidden = true;
    document.body.style.overflow = '';
    returnFocus(opener);
    opener = null;
  };

  // In the capture phase, ahead of the page-transition module's own click listener: that one
  // politely yields to a defaulted-prevented event, but it was registered first, so the yielding
  // only works if this runs earlier.
  document.addEventListener(
    'click',
    (event) => {
      const link = targetElement(event)?.closest<HTMLAnchorElement>('a.wc-book');
      if (link && isPlainClick(event)) {
        event.preventDefault();
        open(link);
        return;
      }
      if (!view.hidden) {
        event.preventDefault();
        // Its two chevrons (beside the view, components/whats-color.ts) turn the book rather than
        // closing it.
        const turn = targetElement(event)?.closest<HTMLElement>('[data-book-step]');
        if (turn) {
          event.stopPropagation();
          step(Number(turn.dataset.bookStep));
          return;
        }
        close();
      }
    },
    { capture: true },
  );

  // A phone's Safari sends a tap's click on to the document only when the thing tapped answers
  // clicks itself, which a plain veil does not.
  view.addEventListener('click', () => close());

  /** The photograph a step of this view's names. */
  const stepLink = () => {
    const { view: whose, at } = stepState();
    return whose === 'book' && at !== undefined ? books()[at] : undefined;
  };
  window.addEventListener('popstate', () => {
    const link = stepLink();
    if (link) { keepScroll(); open(link, true); }
    else if (stepped) { keepScroll(); close(true); }
  });

  document.addEventListener('keydown', (event) => {
    if (view.hidden) return;
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  });

  // Reloaded on the view's step: the photograph is what that step shows.
  const first = stepLink();
  if (first) open(first, true);
}
