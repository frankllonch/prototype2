import { reduceMotion } from './env.ts';

/**
 * The other hover: the word churns through nonsense and settles back into
 * itself, left to right.
 *
 * One of two, and only one runs — `data-hover` on the document says which, and
 * it is set in one place in `components/layout.ts`. The roll is the other.
 *
 * Two things this has to respect.
 *
 * The first is the measuring. Every position in the bar was set against the
 * designer's sheet, and a word that swaps in wider letters while it churns
 * would push its neighbours about on every frame. So each character keeps a
 * box of its own at the width it had when it was still, and whatever lands in
 * that box is centred in it and cut off if it is wider. Nothing in the bar
 * moves by a pixel for the whole of the effect.
 *
 * The second is coming back. The real character is kept on the element it
 * belongs to, not in a variable somewhere, so putting a word right is reading
 * each box's own text back out of it. That happens when the pointer leaves,
 * whatever state the churn is in, and again on the frame the last character
 * settles — a word cannot be left as nonsense by taking the pointer away
 * mid-way, which is the failing the roll had.
 */

/** What the churn draws from. Latin capitals and figures, as the bar is set. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** How long a character holds one piece of nonsense before taking another. */
const STEP = 45;
/** How long the first character churns before it settles. */
const HOLD = 150;
/** And how much longer each character after it waits. */
const STAGGER = 55;

export function initScramble(): void {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  for (const root of document.querySelectorAll<HTMLElement>('[data-roll]')) {
    const text = root.textContent ?? '';
    root.textContent = '';

    const cells: HTMLElement[] = [];
    for (const { segment } of segmenter.segment(text)) {
      // Spaces are left as themselves: a gap that churns reads as a mistake.
      if (!segment.trim()) {
        root.append(segment);
        continue;
      }
      const cell = document.createElement('span');
      cell.className = 'scram';
      cell.dataset.ch = segment;
      cell.textContent = segment;
      root.append(cell);
      cells.push(cell);
    }
    if (!cells.length) continue;

    // Measured once, while the word is still itself, and held from then on.
    for (const cell of cells) {
      cell.style.setProperty('--w', `${cell.getBoundingClientRect().width.toFixed(2)}px`);
    }

    wire(root, cells);
  }
}

function wire(root: HTMLElement, cells: readonly HTMLElement[]): void {
  let frame = 0;

  const settle = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    for (const cell of cells) cell.textContent = cell.dataset.ch ?? '';
  };

  const churn = () => {
    if (reduceMotion.matches) return;
    if (frame) cancelAnimationFrame(frame);
    const began = performance.now();

    const tick = (now: number) => {
      const elapsed = now - began;
      const piece = Math.floor(elapsed / STEP);
      let churning = false;

      cells.forEach((cell, i) => {
        if (elapsed >= HOLD + i * STAGGER) {
          cell.textContent = cell.dataset.ch ?? '';
          return;
        }
        churning = true;
        // A character only changes when the piece does, so the whole word
        // turns over on one clock rather than each box on its own.
        if (cell.dataset.piece !== String(piece)) {
          cell.dataset.piece = String(piece);
          cell.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '';
        }
      });

      frame = churning ? requestAnimationFrame(tick) : 0;
      if (!churning) settle();
    };

    frame = requestAnimationFrame(tick);
  };

  root.addEventListener('pointerenter', churn);
  root.addEventListener('pointerleave', settle);
  // A keyboard reaches these too, and leaving by tab is still leaving.
  root.addEventListener('focus', churn);
  root.addEventListener('blur', settle);
}
