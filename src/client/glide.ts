import { reduceMotion } from './env.ts';

/* HOW FAST THE SITE SCROLLS ITSELF — the numbers to change are here. */
const BASE_MS = 1050;
const PER_PX_MS = 0.33;
const MAX_MS = 2400;

/** In and out on a cubic: leaves slower and arrives softer than a quadratic. */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let journey = 0;
const abandon = () => {
  journey = 0;
  window.removeEventListener('wheel', holdMomentum);
};
for (const kind of ['touchmove', 'keydown'] as const) {
  window.addEventListener(kind, abandon, { passive: true });
}

/*
 * The wheel is read more carefully than a touch or a key, because a trackpad
 * goes on sending wheel events for a second or so after the fingers lift.
 */
let lastWheel = 0;
let lastSpeed = 0;
let fresh = true;
window.addEventListener('wheel', (event) => {
  // When the event was made, not when it is handled: the click that starts a journey keeps the
  // page busy for a moment, and the momentum queued behind it would otherwise arrive looking like
  // a pause.
  const now = event.timeStamp;
  const gap = now - lastWheel;
  // Measured as speed, not as the size of one event: while the page is busy the browser merges the
  // queued events into one, twice the push over twice the time, which by size alone read as a
  // fresh, harder push.
  const speed = (Math.abs(event.deltaY) + Math.abs(event.deltaX)) / Math.max(16, gap);
  fresh = gap > 120 || speed > lastSpeed * 1.3 + 0.15;
  lastWheel = now;
  lastSpeed = speed;
  if (journey && fresh) abandon();
}, { passive: true });
function holdMomentum(event: WheelEvent): void {
  if (journey && !fresh) event.preventDefault();
}

/** Take the page to a scroll position, gently. */
export function glide(to: number, duration?: number): void {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.max(0, Math.min(to, max));
  if (reduceMotion.matches) {
    window.scrollTo({ top: target, behavior: 'auto' });
    return;
  }
  const from = window.scrollY;
  const distance = Math.abs(target - from);
  if (distance < 1) return;
  const ms = duration ?? Math.min(MAX_MS, BASE_MS + distance * PER_PX_MS);
  const id = ++journey;
  const t0 = performance.now();
  window.addEventListener('wheel', holdMomentum, { passive: false });
  const arrive = () => { journey = 0; window.removeEventListener('wheel', holdMomentum); };
  // Timed by the same clock throughout, never by the frame's own timestamp: one clock cannot
  // disagree with itself, and a frame stamp from another origin would make the first step read as
  // the last and jump to the end.
  const step = () => {
    if (journey !== id) return;
    const t = Math.min(1, (performance.now() - t0) / ms);
    window.scrollTo({ top: from + (target - from) * ease(t), behavior: 'auto' });
    if (t < 1) requestAnimationFrame(step);
    else arrive();
  };
  requestAnimationFrame(step);
  // A tab that is not being painted is granted no frames, and a journey begun there would never
  // arrive.
  window.setTimeout(() => {
    if (journey !== id) return;
    arrive();
    window.scrollTo({ top: target, behavior: 'auto' });
  }, ms + 400);
}

/** Where to glide so an element stands at the top, clear of its scroll margin. */
export function topOf(el: Element): number {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return el.getBoundingClientRect().top + window.scrollY - margin;
}

/** Links into the same page glide rather than jump. */
export function initGlide(): void {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || link.target) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    event.preventDefault();
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
    glide(topOf(el));
  });
}
