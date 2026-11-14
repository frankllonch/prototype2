/** Media queries every module consults. Evaluated once, shared everywhere. */
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
/**
 * The phone layout: everything below 900px wide. The one definition of it for
 * scripts — the stylesheets say `(max-width: 899px)` and the head of every
 * page makes the same test before the first paint (components/layout.ts).
 */
export const phone = window.matchMedia('(max-width: 899px)');
/** True for a plain left click — modified clicks mean "open this elsewhere". */
export const isPlainClick = (event) => !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
