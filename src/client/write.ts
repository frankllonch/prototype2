import { phone, reduceMotion, scrollWrites } from './env.ts';
import { glide } from './glide.ts';

/**
 * Matches `writeOn()` in components/whats-color.ts: each word steps in whole at
 * the start of its own range, and the last one's starts at 64% of the stage's
 * cover timeline.
 */
const WRITTEN = 0.885;

/**
 * How long a phone takes to type the note in front of the reader when the menu
 * or a link brings them to the page: the journey's own length, given rather than
 * worked out from the distance, which on a phone would rush fifty-odd words
 * through in a second and a half.
 */
export const WRITE_MS = 2400;

/**
 * The scroll offset at which the note stands fully written and the names have
 * yet to rise — the scene a link into the page should open on.
 */
export function writtenPoint(): number | null {
  const section = document.querySelector<HTMLElement>('.wc-write');
  if (!section || !scrollWrites()) return null;
  const top = section.getBoundingClientRect().top + window.scrollY;
  return top + (section.offsetHeight - window.innerHeight) * WRITTEN;
}

/**
 * On a phone the note is typed in front of the reader rather than found written:
 * they arrive on the blank stage, the page's very top, and after a beat the page
 * carries itself down to the written point slowly enough to watch the words
 * come.
 */
const TYPE_WAIT_MS = 350;

export function typeIn(): void {
  window.setTimeout(() => {
    const section = document.querySelector<HTMLElement>('.wc-write');
    const to = writtenPoint();
    if (!section || to === null) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(window.scrollY - top) > window.innerHeight * 0.1) return;
    glide(to, WRITE_MS);
  }, TYPE_WAIT_MS);
}

/**
 * Arriving with the roster named in the address picks the story up mid-scene:
 * the sentence written, the names not yet risen, the cue still asking for the
 * scroll that brings them.
 */
const HOLD_MS = 1800;

export function initWrite(): void {
  initWords();
  // Whatever happens below, the page is uncovered once this has run: the head holds it under the
  // veil only until the landing has been made (00-base.css).
  const uncover = () => document.documentElement.classList.remove('wc-arriving');
  if (location.hash !== '#whats-color') return uncover();
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav && nav.type !== 'navigate') return uncover();
  if (writtenPoint() === null) return uncover();
  // A phone does not hold the reader on the written point: the address puts them at the head of
  // the page, which there is the blank stage, and the note is typed from it once the page has
  // loaded (`typeIn`).
  if (phone.matches) {
    uncover();
    if (document.readyState === 'complete') typeIn();
    else window.addEventListener('load', typeIn, { once: true });
    return;
  }

  let held = true;
  const release = () => {
    held = false;
    window.removeEventListener('scroll', land);
  };
  const land = () => {
    if (!held) return;
    const to = writtenPoint();
    if (to !== null && Math.abs(window.scrollY - to) > 1) window.scrollTo(0, to);
  };

  for (const kind of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
    window.addEventListener(kind, release, { passive: true, once: true });
  }
  window.addEventListener('scroll', land, { passive: true });
  land();
  // The bar's place depends on the film's state, which the film module reads off the scroll — but
  // the scroll event for this move only arrives with the next frame.
  window.dispatchEvent(new Event('scroll'));
  uncover();
  void document.fonts?.ready.then(land);

  const settle = () => {
    land();
    for (const ms of [60, 180, 400, 800, 1300]) window.setTimeout(land, ms);
    window.setTimeout(release, HOLD_MS);
  };
  if (document.readyState === 'complete') settle();
  else window.addEventListener('load', settle, { once: true });
}

/**
 * The words, and the names' fade, put in by script where the engine has no
 * scroll-run animations (Safari before 26): the same slices the stylesheet's
 * timeline uses, read off each word's own `animation-range`, so the scene is the
 * same one.
 */
const NAMES_FROM = 0.658;
const NAMES_TO = 0.7;

function initWords(): void {
  const section = document.querySelector<HTMLElement>('.wc-write');
  if (!section || CSS.supports('animation-timeline: view()')) return;
  const words = [...section.querySelectorAll<HTMLElement>('.wc-word')].map((el) => ({
    el,
    from: Number(/cover ([\d.]+)%/.exec(el.getAttribute('style') ?? '')?.[1] ?? 0) / 100,
  }));
  const rise = document.querySelector<HTMLElement>('#whats-color .wc-rise');
  const update = () => {
    const box = section.getBoundingClientRect();
    // The section's `cover` timeline: 0 as its head reaches the foot of the window, 1 as its foot
    // leaves the top.
    const at = (window.innerHeight - box.top) / (box.height + window.innerHeight);
    for (const { el, from } of words) el.classList.toggle('is-written', at >= from);
    if (!rise) return;
    const held = scrollWrites() && !phone.matches;
    const shown = Math.min(1, Math.max(0, (at - NAMES_FROM) / (NAMES_TO - NAMES_FROM)));
    rise.style.opacity = held && shown < 1 ? String(shown) : '';
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  reduceMotion.addEventListener('change', update);
  update();
}
