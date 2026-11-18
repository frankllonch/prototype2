import { nextHue } from './hues.ts';

/**
 * The index lists — exhibitions, and commissioned work — answer in a different
 * colour each time, drawn from the site's one list (`hues.ts`).
 *
 * Decoration only. Without this the row keeps the default `--exh-hover` from the
 * stylesheet and still answers to the pointer; it simply answers in one colour.
 */
export function initHoverList(): void {
  for (const list of document.querySelectorAll<HTMLElement>('.xlist')) wire(list);
  // The Gallery's "Inquiries", over the years, answers the same way.
  for (const link of document.querySelectorAll<HTMLElement>('.side-inquiries')) wireRow(link);
}

function wire(list: HTMLElement): void {
  for (const row of list.querySelectorAll<HTMLElement>('.hrow')) wireRow(row);
}

function colour(row: HTMLElement): void {
  const n = nextHue();
  if (n >= 0) row.style.setProperty('--exh-hover', `var(--hue-${n})`);
}

function wireRow(row: HTMLElement): void {
  // `pointerenter` rather than `pointerover`: the latter fires again for every
  // child the pointer crosses, so the colour would churn as it passed over the
  // title and then the photograph.
  //
  // Not for a finger. A touch enters the row it lands on and focuses the
  // link it taps, and neither is a reach towards the row. The colour is only
  // ever shown to a pointer that hovers and to a keyboard (the stylesheet's
  // `(hover: hover)` and `:focus-visible`), so a touch draws none — and the
  // focus that comes back to the row when its sheet closes draws none either,
  // unless a keyboard is what brought it.
  let finger = false;
  row.addEventListener('pointerdown', (event) => {
    finger = event.pointerType === 'touch';
  });
  row.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') colour(row);
  });
  row.addEventListener('focus', () => {
    if (!finger || row.matches(':focus-visible')) colour(row);
  });
}
