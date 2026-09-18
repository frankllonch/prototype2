/**
 * Hover text roll, after the links on landonorris.com.
 *
 * Nothing new ever appears. Each character is wrapped in a span whose own text
 * is made transparent; two pseudo-elements draw the same character — one in
 * place, one held just below, clipped. On hover the top copy rolls up and out
 * while the lower copy rolls up into its place, each character a beat after the
 * one before it (`--i`), so the word turns over like a split-flap board.
 *
 * All of the motion is CSS. This file only wraps the characters and numbers
 * them; the transition, its timing and its stagger live in the stylesheet.
 */
export function initTextRoll(): void {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  for (const root of document.querySelectorAll<HTMLElement>('[data-roll]')) {
    const text = root.textContent ?? '';
    root.textContent = '';
    let index = 0;
    for (const { segment } of segmenter.segment(text)) {
      if (!segment.trim()) {
        root.append(segment);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'roll';
      span.dataset.ch = segment;
      span.style.setProperty('--i', String(index++));
      span.textContent = segment;
      root.append(span);
    }
  }
}
