/** Media queries every module consults. Evaluated once, shared everywhere. */
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
/** True for a plain left click — modified clicks mean "open this elsewhere". */
export const isPlainClick = (event) => !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
