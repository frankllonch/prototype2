import { nextHue } from './hues.ts';

/**
 * The index lists — exhibitions, and commissioned work — answer in a different
 * colour each time, drawn from the site's one list (`hues.ts`).
 */
export function initHoverList(): void {
  for (const list of document.querySelectorAll<HTMLElement>('.xlist, .chart-thanks')) wire(list);
  // The Gallery's "Inquiries", over the years, answers the same way.
  for (const link of document.querySelectorAll<HTMLElement>('.side-inquiries')) wireRow(link);
  // So does the gallery's name at the foot of About's biography.
  for (const link of document.querySelectorAll<HTMLElement>('.about-link')) wireRow(link);
}

function wire(list: HTMLElement): void {
  for (const row of list.querySelectorAll<HTMLElement>('.hrow')) wireRow(row);
}

function colour(row: HTMLElement): void {
  const n = nextHue();
  if (n >= 0) row.style.setProperty('--exh-hover', `var(--hue-${n})`);
}

function wireRow(row: HTMLElement): void {
  // `pointerenter` rather than `pointerover`: the latter fires again for every child the pointer
  // crosses, so the colour would churn as it passed over the title and then the photograph.
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
