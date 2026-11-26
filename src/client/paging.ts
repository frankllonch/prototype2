import { isPlainClick, phone, reduceMotion, targetElement } from './env.ts';
import { OUT_MS } from './transitions.ts';

/** Leaving a painting the way you came: a step back, not a fresh gallery. */
const BEHIND = 'cv-gallery-behind';

function galleryIsBehind(back: HTMLAnchorElement): boolean {
  if (window.history.length <= 1) return false;
  const depth = String(window.history.length);
  if (document.referrer) {
    const cameFrom = new URL(document.referrer, window.location.href);
    if (cameFrom.origin === window.location.origin
      && cameFrom.pathname === new URL(back.href).pathname) {
      try { sessionStorage.setItem(BEHIND, depth); } catch { /* private mode: this visit only */ }
      return true;
    }
  }
  try { return sessionStorage.getItem(BEHIND) === depth; } catch { return false; }
}

function backStepsBack(): void {
  // The page's two corners at the top — the section's name and Close — both lead back to the
  // gallery.
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.detail-back')];
  if (!links.length || !galleryIsBehind(links[0]!)) return;

  for (const back of links) back.addEventListener('click', (event) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    /* Faded on the way out, the same as any other departure. */
    if (reduceMotion.matches) { window.history.back(); return; }
    document.documentElement.classList.add('is-leaving');
    window.setTimeout(() => window.history.back(), OUT_MS);
  });
}

/** The left and right keys walk through the paintings. */
export function initPaging(): void {
  backStepsBack();

  const prev = document.querySelector<HTMLAnchorElement>('a[rel="prev"]');
  const next = document.querySelector<HTMLAnchorElement>('a[rel="next"]');
  touchPaging(prev, next);
  if (!prev && !next) return;

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    // A modified arrow belongs to the browser or the window manager.
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

    /* Not while something else is listening for the same key. */
    const target = event.target;
    // Guarded on Element: when nothing is focused the target can be the document itself, which has
    // no `closest` and would throw here.
    if (target instanceof Element
      && target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;

    const link = event.key === 'ArrowLeft' ? prev : next;
    if (!link) return;
    event.preventDefault();

    follow(link);
  });
}

/*
 * Clicked rather than followed, so the page's own departure — the fade that
 * holds the navigation — runs exactly as it does for the arrows on the page.
 */
function follow(link: HTMLAnchorElement): void {
  if (!reduceMotion.matches) link.click();
  else if (link.hasAttribute('data-replace')) window.location.replace(link.href);
  else window.location.assign(link.href);
}

/*
 * THE SWIPE — how far a finger has to travel across the painting's page to turn
 * it, in CSS pixels, and how much more across than down the movement has to be
 * (1.5 is about 34 degrees off level).
 */
const SWIPE = 48;
const SWIPE_LEVEL = 1.5;
const EDGE = 24;

/** A painting's page on a phone, where nothing but the painting is drawn. */
function touchPaging(prev: HTMLAnchorElement | null, next: HTMLAnchorElement | null): void {
  const page = document.querySelector<HTMLElement>('.detail');
  const close = document.querySelector<HTMLAnchorElement>('.detail-close');
  if (!page) return;

  page.addEventListener('click', (event) => {
    if (!phone.matches || !close || !isPlainClick(event)) return;
    // The painting, its small pictures and the words are not the ground: a touch there is looking,
    // choosing a picture or selecting text.
    const target = targetElement(event);
    if (target?.closest('a, button, .detail-plate, .detail-under, .detail-caption')) return;
    follow(close);
  });

  let startX = 0, startY = 0, tracking = false;
  page.addEventListener('touchstart', (event) => {
    const touch = event.touches[0]!;
    // One finger, away from the edges, on a page at its own size: two are a pinch, the edges are
    // the phone's own, and across a page that has been zoomed into a finger is only moving the
    // picture about.
    tracking = phone.matches && event.touches.length === 1
      && touch.clientX > EDGE && touch.clientX < window.innerWidth - EDGE
      && (window.visualViewport?.scale ?? 1) < 1.05;
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });
  page.addEventListener('touchend', (event) => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches[0]!;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < SWIPE_LEVEL * Math.abs(dy)) return;
    // The page follows the finger: pulled to the left, the next one comes.
    const link = dx < 0 ? next : prev;
    if (link) follow(link);
  }, { passive: true });
  page.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
}
