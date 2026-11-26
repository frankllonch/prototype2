/** Media queries every module consults. Evaluated once, shared everywhere. */
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
/** The phone layout: everything below 900px wide. */
export const phone = window.matchMedia('(max-width: 899px)');
/** A screen held upright. Only the phone layout asks: see `scrollWrites`. */
export const portrait = window.matchMedia('(orientation: portrait)');

/** The gallery's opening is running: the paintings cannot be pointed at, and nothing else under the pointer scrolls. */
export const piling = (): boolean => document.documentElement.classList.contains('stack-running');

/**
 * Whether the scroll writes the words here — the note on What's Color and the
 * statement on the Colour Chart, typed in as the page is scrolled down and taken
 * away as it is scrolled back up.
 */
export const scrollWrites = (upright: MediaQueryList = portrait): boolean =>
  !reduceMotion.matches &&
  (!phone.matches || upright.matches);

/** The letters of a word as a reader counts them; by code point where Intl.Segmenter is missing. */
export function graphemes(text: string): string[] {
  if (typeof Intl.Segmenter !== 'function') return Array.from(text);
  return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
}

/** A custom property holding a CSS time, in milliseconds. */
export function cssMs(style: CSSStyleDeclaration, name: string): number {
  const v = style.getPropertyValue(name).trim();
  return (Number.parseFloat(v) || 0) * (v.endsWith('ms') ? 1 : 1000);
}

/** The element an event happened on: null for the window or document, the parent for a text node. */
export function targetElement(event: Event): Element | null {
  const target = event.target;
  if (target instanceof Element) return target;
  return target instanceof Node ? target.parentElement : null;
}

/** True for a plain left click — modified clicks mean "open this elsewhere". */
export const isPlainClick = (event: MouseEvent): boolean =>
  !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;

/**
 * Gives focus back to the photograph a viewer was opened from, or was last
 * showing, without the photograph answering as if it were hovered.
 */
export function returnFocus(el: HTMLElement | null | undefined): void {
  if (!el) return;
  el.dataset.quietFocus = '';
  el.focus({ preventScroll: true });
  const done = () => { delete el.dataset.quietFocus; };
  // Focus may not take — the element hidden, or gone — and a mark left behind would quiet the
  // next, real, keyboard focus.
  if (document.activeElement === el) el.addEventListener('blur', done, { once: true });
  else done();
}
