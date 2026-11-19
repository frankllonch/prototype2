import { reduceMotion } from './env.ts';

/**
 * The Colour Chart, as an ordinary page that scrolls (Frank, 2026-11-19).
 *
 * 1. On arrival the title and the statement type themselves in, a word at a
 *    time, by a clock: the page is not held while they do, and the reader can
 *    scroll at any point. Their first wheel, touch or key finishes the typing
 *    at once, so nothing is still being written behind them.
 * 2. Everything under the statement — Order yours, the cost, Features and
 *    Technical characteristics in their columns, the thanks and the line at
 *    the foot — comes in out of a blur as it reaches the screen, after the
 *    typing, with About's look and About's beat from one column to the next.
 *
 * All of it is an enhancement of a page that already stands. The words are
 * split here; the stylesheet hides the statement only under `html.js`, and the
 * page is marked done (`.is-typed`) whenever this gives up or finishes, which
 * shows every word whatever state the spans are in.
 */

/** After the page's own entrance, so the words are not typed behind a veil. */
const WAIT_MS = 350;

/** One word every this many milliseconds. Less is faster typing. */
const WORD_MS = 32;

/** Each column comes in this much later than the one to its left, at most. */
const STAGGER_MS = 260;

export function initChart(): void {
  const chart = document.querySelector<HTMLElement>('[data-chart]');
  if (!chart) return;
  const typed = chart.querySelector<HTMLElement>('[data-chart-type]');
  const pops = [...chart.querySelectorAll<HTMLElement>('.chart-in')];

  const done = () => chart.classList.add('is-typed');

  if (reduceMotion.matches || !typed || !('IntersectionObserver' in window)) {
    done();
    for (const el of pops) el.classList.add('is-in');
    return;
  }

  const words = splitWords(typed);
  let shown = 0;
  let timer = 0;
  let finished = false;

  /* -------------------------------------------------------- the fade-ins */

  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const across = entry.boundingClientRect.left / Math.max(1, window.innerWidth);
        el.style.setProperty('--pop-delay', `${Math.round(Math.max(0, across) * STAGGER_MS)}ms`);
        el.classList.add('is-in');
        seen.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    for (const w of words) w.classList.add('is-written');
    done();
    for (const el of pops) seen.observe(el);
    for (const kind of ['wheel', 'touchstart', 'keydown'] as const) window.removeEventListener(kind, finish);
  };

  /* ------------------------------------------------------------ the typing */

  // A reload or a back-navigation lands where the reader was: the page simply
  // stands there, typed.
  if (window.scrollY > window.innerHeight * 0.1) return finish();

  const step = () => {
    words[shown++]?.classList.add('is-written');
    if (shown >= words.length) finish();
    else timer = window.setTimeout(step, WORD_MS);
  };

  for (const kind of ['wheel', 'touchstart', 'keydown'] as const) {
    window.addEventListener(kind, finish, { passive: true, once: true });
  }
  // Scrolled by anything else — a scrollbar drag, the cue — finishes it too.
  window.addEventListener('scroll', () => { if (window.scrollY > 4) finish(); }, { passive: true });

  timer = window.setTimeout(step, WAIT_MS);
}

/**
 * Every word in the element wrapped in its own span, in reading order, leaving
 * the markup around them (line breaks, the title, the paragraphs) as it is.
 * The spaces stay outside the spans, so the lines break exactly as they did.
 */
function splitWords(root: HTMLElement): HTMLElement[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);

  const words: HTMLElement[] = [];
  for (const node of nodes) {
    const text = node.textContent ?? '';
    if (!text.trim()) continue;
    const frag = document.createDocumentFragment();
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.append(part);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'chart-word';
      span.textContent = part;
      words.push(span);
      frag.append(span);
    }
    node.replaceWith(frag);
  }
  return words;
}
