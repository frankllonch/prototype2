import { graphemes, phone, reduceMotion } from './env.ts';

/**
 * The other hover: the letters under the pointer churn, and the rest of the word
 * stays as it is.
 */

/** What the churn draws from. One character here means a mask rather than noise. */
const GLYPHS = '*';

/** How long a character holds one piece of nonsense before taking another. */
const STEP = 100;

/** How far either side of the pointer the churn reaches, in pixels. */
const RADIUS = 55;

/** How much of that reach is the soft edge, as a fraction of it. */
const EDGE = 1;

export function initScramble(): void {
  // Not on a phone, for the roll's reasons (client/text-roll.ts): nothing hovers there, and a
  // letter boxed on its own stops kerning.
  if (phone.matches) return;

  for (const root of document.querySelectorAll<HTMLElement>('[data-roll]')) {
    // The build writes the boxes into the page already (components/layout.ts), so the bar's first
    // frame is its last; they are cut here only where a page arrives with a plain word.
    const written = [...root.querySelectorAll<HTMLElement>('.scram')];
    if (written.length) {
      measure(written);
      wire(root, written);
      continue;
    }
    const text = root.textContent ?? '';
    root.textContent = '';

    const cells: HTMLElement[] = [];
    for (const segment of graphemes(text)) {
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

    measure(cells);
    wire(root, cells);
  }

  let settling = 0;
  window.addEventListener('resize', () => {
    clearTimeout(settling);
    settling = window.setTimeout(remeasure, 150);
  });
}

/*
 * Measured while the word is still itself, and held as a share of the letter's
 * own size rather than in pixels.
 */
function measure(cells: readonly HTMLElement[]): void {
  const widths = cells.map((cell) => {
    const size = parseFloat(getComputedStyle(cell).fontSize) || 1;
    return (cell.getBoundingClientRect().width / size).toFixed(4);
  });
  cells.forEach((cell, i) => cell.style.setProperty('--w', `${widths[i]}em`));
}

/*
 * And measured again once a resize has settled, because type does not scale
 * quite in step with itself at every size (hinting, rounding) and a box a hair
 * too narrow clips.
 */
function remeasure(): void {
  const still = [...document.querySelectorAll<HTMLElement>('[data-roll] .scram')]
    .filter((cell) => cell.textContent === cell.dataset.ch);
  for (const cell of still) cell.style.removeProperty('--w');
  measure(still);
}

/*
 * On the opening page the current name is drawn twice (client/current.ts), each
 * copy holding a set of the same boxes; the copy is made after this has run.
 */
function boxes(root: HTMLElement, count: number): HTMLElement[][] {
  const all = [...root.querySelectorAll<HTMLElement>('.scram')];
  const sets: HTMLElement[][] = [];
  for (let i = 0; i < all.length; i += count) sets.push(all.slice(i, i + count));
  return sets;
}

/* Writes a box's character into the text it already holds rather than handing it new text. */
function write(cell: HTMLElement, ch: string): void {
  const text = cell.firstChild;
  if (text && text.nodeType === Node.TEXT_NODE && !text.nextSibling) {
    if ((text as Text).data !== ch) (text as Text).data = ch;
  } else {
    cell.textContent = ch;
  }
}

/*
 * Where the pointer last was, for every word at once, and whether it is still in
 * the window at all.
 */
const at = { x: -1, y: -1, inside: false };
let tracking = false;
function track(): void {
  if (tracking) return;
  tracking = true;
  document.addEventListener('pointermove', (e) => { at.x = e.clientX; at.y = e.clientY; at.inside = true; }, { passive: true, capture: true });
  document.addEventListener('pointerover', (e) => { at.x = e.clientX; at.y = e.clientY; at.inside = true; }, { passive: true, capture: true });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) at.inside = false; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { at.inside = false; });
  window.addEventListener('blur', () => { at.inside = false; });
}

/** Whether the last known pointer is on the box, give or take a pixel. */
function over(root: HTMLElement): boolean {
  if (!at.inside) return false;
  const box = root.getBoundingClientRect();
  return at.x >= box.left - 2 && at.x <= box.right + 2 && at.y >= box.top - 2 && at.y <= box.bottom + 2;
}

function wire(root: HTMLElement, cells: readonly HTMLElement[]): void {
  track();
  let frame = 0;
  let pointer = 0;
  let centres: number[] = [];

  /*
   * Whether anything still asks for the churn: the pointer on the word, or a
   * keyboard's focus on it.
   */
  const keyed = () =>
    root === document.activeElement && root.matches(':focus-visible') && !('quietFocus' in root.dataset);
  const wanted = () => (root.matches(':hover') && over(root)) || keyed();

  /*
   * Still while the button is held: what is pressed is the word, and a word that
   * keeps changing under a press is the one place a click can go astray.
   */
  let pressed = false;

  const settle = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    for (const set of boxes(root, cells.length)) for (const cell of set) write(cell, cell.dataset.ch ?? '');
  };

  /* Where each letter is, taken when the pointer arrives rather than kept from before. */
  const locate = () => {
    centres = (boxes(root, cells.length)[0] ?? cells).map((cell) => {
      const box = cell.getBoundingClientRect();
      return box.left + box.width / 2;
    });
  };

  const run = () => {
    // Nor on a page that loaded wide and is below 900px now: the boxes are still in the words
    // there (09-phone.css lets them flow as plain text).
    if (reduceMotion.matches || phone.matches) return;
    if (frame) return;
    let piece = -1;

    const tick = () => {
      if (!wanted()) { settle(); return; }
      if (pressed) { frame = requestAnimationFrame(tick); return; }
      const now = Math.floor(performance.now() / STEP);
      if (now !== piece) {
        piece = now;
        const sets = boxes(root, cells.length);
        cells.forEach((cell, i) => {
          const away = Math.abs((centres[i] ?? 0) - pointer);
          // Certain within the solid part of the reach, thinning to nothing at its edge, so the
          // churn frays rather than stopping at a line.
          const solid = RADIUS * (1 - EDGE);
          const chance = away <= solid ? 1 : 1 - (away - solid) / Math.max(1, RADIUS - solid);
          const shown = chance > 0 && Math.random() < chance
            ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ''
            : cell.dataset.ch ?? '';
          for (const set of sets) { const box = set[i]; if (box) write(box, shown); }
        });
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
  };

  const enter = (event: PointerEvent) => { pointer = event.clientX; locate(); run(); };
  const move = (event: PointerEvent) => { pointer = event.clientX; };

  root.addEventListener('pointerenter', enter);
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerleave', () => { pressed = false; settle(); });
  root.addEventListener('pointerdown', () => {
    pressed = true;
    // The word as itself for the press, in every copy of it.
    for (const set of boxes(root, cells.length)) for (const cell of set) write(cell, cell.dataset.ch ?? '');
  });
  const release = () => {
    if (!pressed) return;
    pressed = false;
    if (wanted()) { locate(); run(); }
  };
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);

  /*
   * A keyboard reaches these too and has no pointer to follow, so focus churns
   * the middle of the word and leaves the ends alone, which is the same effect
   * standing still.
   */
  root.addEventListener('focus', () => {
    // Focus put back by a script, or left by a click, is not a keyboard's.
    if (!keyed()) return;
    const box = root.getBoundingClientRect();
    pointer = box.left + box.width / 2;
    locate();
    run();
  });
  root.addEventListener('blur', settle);

  // Leaving the window or the page, or coming back to one kept in the back and forward cache,
  // leaves every word as itself.
  window.addEventListener('blur', settle);
  window.addEventListener('pagehide', settle);
  window.addEventListener('pageshow', settle);
  document.addEventListener('visibilitychange', settle);
}
