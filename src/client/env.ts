/** Media queries every module consults. Evaluated once, shared everywhere. */
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** True for a plain left click — modified clicks mean "open this elsewhere". */
export const isPlainClick = (event: MouseEvent): boolean =>
  !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
