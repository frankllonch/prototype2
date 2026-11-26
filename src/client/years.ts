import { phone, reduceMotion } from './env.ts';
import { scrollSpan } from './pile.ts';
import { glide } from './glide.ts';

/* THE JOURNEY TO A YEAR — the number to change is here. */
const JUMP_MS = 1350;

/** The year rail. */
export function initYears(): void {
  const rail = document.querySelector<HTMLElement>('[data-years]');
  if (!rail) return;

  const links = [...rail.querySelectorAll<HTMLAnchorElement>('.year')];
  if (!links.length) return;
  // The controls stand under the last year, and the stylesheet cannot count them: a new year added
  // in WordPress moves the controls down a line.
  document.documentElement.style.setProperty('--years-count', String(links.length));

  const grid = document.querySelector<HTMLElement>('[data-grid]');
  const tiles = grid ? [...grid.querySelectorAll<HTMLElement>('.tile')] : [];

  /*
   * Changing the density animates every tile's size for half a second, so
   * anything measured inside that window is an interpolated position rather than
   * where the year is going to be.
   */
  let settledAt = 0;
  grid?.addEventListener('gridchange', () => { settledAt = performance.now() + 560; });
  /* One journey at a time, cancelled by the reader's own hand: glide's rules. */
  const travel = (to: number) => glide(to, JUMP_MS);
  /** The year last chosen on a phone, and until when it holds the row. */
  let chosen: HTMLAnchorElement | null = null;
  let chosenUntil = 0;

  const afterRelayout = (run: () => void) => {
    const wait = settledAt - performance.now();
    if (wait > 0) window.setTimeout(run, wait); else run();
  };

  /**
   * Focusing a year dims every painting from another one, so the year you asked
   * for is the only thing in focus.
   */
  let focused = '';
  /** True while a chosen year is being travelled to, pile and all. */
  let jumping = false;
  const focus = (year: string) => {
    focused = year;
    for (const tile of tiles) tile.classList.toggle('is-dimmed', Boolean(year) && tile.dataset.year !== year);
    for (const link of links) link.setAttribute('aria-pressed', String(link.dataset.year === year));
    rail.classList.toggle('is-focused', Boolean(year));
  };

  /** Where to scroll so a year sits in the middle of the screen. */
  const centreOn = (target: HTMLElement): number => {
    const box = target.getBoundingClientRect();
    const wanted = box.top + window.scrollY + box.height / 2 - window.innerHeight / 2;
    // Keyed on the hero, not on `data-stack`: the attribute is still there when the pile is turned
    // off for reduced motion, but `stack.ts` removes the hero, and a floor held against an opening
    // that never runs would scroll straight past the newest year and put it out of reach
    // altogether.
    const floor = document.querySelector('[data-hero]') ? window.innerHeight * scrollSpan() + 8 : 0;
    const ceiling = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(Math.max(floor, wanted), ceiling));
  };

  for (const link of links) {
    link.setAttribute('aria-pressed', 'false');
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const year = link.dataset.year!;
      const target = document.getElementById(`year-${year}`);
      if (!target) return;
      event.preventDefault();

      if (focused === year) { focus(''); return; }

      /* The year's paintings start loading now, not when the journey reaches them. */
      const first = tiles.indexOf(target);
      for (const tile of tiles.slice(Math.max(0, first - 12), first + 40)) {
        const img = tile.querySelector('img');
        if (img?.loading === 'lazy') img.loading = 'eager';
      }
      // On a phone the row itself says which year, and it moves with every scroll: the other
      // years' paintings are not dimmed there.
      if (!phone.matches) focus(year);
      else { chosen = link; chosenUntil = performance.now() + JUMP_MS + 400; }
      /*
       * A jump that starts from the folded pile scrolls down through it, and the
       * pile is still `running` for the whole of that journey.
       */
      jumping = true;

      const go = () => afterRelayout(() => travel(centreOn(target)));
      go();

      /*
       * While the pile is still folded, the newest rows are behind it and
       * `centreOn` holds the scroll at the floor rather than letting it land on
       * a row that is not where it will end up.
       */
      if (document.documentElement.classList.contains('stack-running')) {
        document.addEventListener('stackdone', () => { go(); jumping = false; }, { once: true });
      } else {
        jumping = false;
      }
      history.replaceState(null, '', `#year-${year}`);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && focused) focus('');
  });

  /* Clicking away drops the year — the most natural way out. */
  document.addEventListener('pointerdown', (event) => {
    if (!focused) return;
    const target = event.target as Element | null;
    if (target?.closest('.tile') || target?.closest('[data-years]')) return;
    focus('');
  });

  // Scrolling back to the opening gathers the paintings again; a year held in focus from before
  // would otherwise still be dimming most of them when the grid comes back.
  document.addEventListener('stackrestart', () => { if (focused) focus(''); });

  // Mark the year currently under the top of the viewport.
  const start = () => {
    const anchors = links
      .map((link) => ({ link, el: document.getElementById(`year-${link.dataset.year}`) }))
      .filter((a): a is { link: HTMLAnchorElement; el: HTMLElement } => a.el !== null);
    if (!anchors.length) return;

    /** The year last marked, so the bar is only moved when it changes. */
    let marked: HTMLAnchorElement | null = null;
    const update = () => {
      /* Nothing is in the middle of a heap. */
      if (document.documentElement.classList.contains('stack-running')) {
        for (const { link } of anchors) link.classList.remove('is-current');
        return;
      }

      // Measured at the middle of the screen, which is where choosing a year now puts it — probing
      // near the top would mark a different year than the one the click just centred.
      const probe = window.innerHeight * 0.5;
      let current = anchors[0]!;
      for (const anchor of anchors) {
        if (anchor.el.getBoundingClientRect().top <= probe) current = anchor;
      }
      // A year just chosen stays the year until the paintings have got there: the row does not run
      // through the years passed on the way and back.
      if (chosen && performance.now() < chosenUntil) {
        current = anchors.find((a) => a.link === chosen) ?? current;
      } else {
        chosen = null;
      }
      for (const { link } of anchors) link.classList.toggle('is-current', link === current.link);
      /*
       * On a phone the rail is a bar along the foot of the screen, and with
       * enough years it is wider than the screen.
       */
      if (current.link !== marked) {
        marked = current.link;
        if (rail.scrollWidth > rail.clientWidth) {
          rail.scrollTo({
            left: marked.offsetLeft - (rail.clientWidth - marked.offsetWidth) / 2,
            behavior: reduceMotion.matches ? 'auto' : 'smooth',
          });
        }
      }
    };

    /* The phone's row of years (THE YEAR WHEEL in 05-artwork.css). */
    if (phone.matches) {
      let turning = false;
      let restTimer = 0;
      const rest = () => {
        if (!turning) return;
        turning = false;
        const middle = rail.getBoundingClientRect().left + rail.clientWidth / 2;
        let nearest = links[0]!;
        let best = Infinity;
        for (const link of links) {
          const box = link.getBoundingClientRect();
          const off = Math.abs(box.left + box.width / 2 - middle);
          if (off < best) { best = off; nearest = link; }
        }
        if (nearest !== marked) nearest.click();
      };
      for (const type of ['touchmove', 'wheel'] as const) {
        rail.addEventListener(type, () => { turning = true; }, { passive: true });
      }
      rail.addEventListener('scroll', () => {
        window.clearTimeout(restTimer);
        restTimer = window.setTimeout(rest, 160);
      }, { passive: true });
    }

    let last = 0;
    window.addEventListener('scroll', () => {
      const now = performance.now();
      if (now - last < 60) return;
      last = now;
      update();
    }, { passive: true });
    window.addEventListener('scrollend', update);
    /*
     * Scrolling back up gathers the paintings into the pile again, and a year
     * still marked against a heap is marking nothing.
     */
    window.addEventListener('scroll', () => {
      if (jumping) return;
      if (focused && document.documentElement.classList.contains('stack-running')) focus('');
    }, { passive: true });
    /*
     * The grid can change shape under a reader who is sitting still — a density
     * step, or the sizing switch, which moves the rows by a third of a page.
     */
    grid?.addEventListener('gridchange', () => afterRelayout(update));
    /*
     * The pile moves the paintings without moving the layout under them, so the
     * rail can be read and used while it runs.
     */
    document.addEventListener('stackdone', () => afterRelayout(update));
    update();
  };

  /* Started at once rather than on `stackdone`. */
  start();
}
