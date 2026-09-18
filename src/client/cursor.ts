import { finePointer, reduceMotion } from './env.ts';

/**
 * A label that follows the pointer and names whatever is under it. The title is
 * read from `data-cursor-title`, which mirrors text already in the tile's
 * caption, so the cursor is decoration and never the only way to learn a name.
 */
export function initCursor(): void {
  const cursor = document.querySelector<HTMLElement>('.cursor');
  const label = cursor?.querySelector<HTMLElement>('.cursor-label');
  if (!cursor || !label || !finePointer.matches) return;

  let targetX = 0, targetY = 0, x = 0, y = 0;
  let active = false;
  let frame = 0;
  let placed = false;

  const tick = () => {
    const ease = reduceMotion.matches ? 1 : 0.18;
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    cursor.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    const settled = Math.abs(targetX - x) < 0.1 && Math.abs(targetY - y) < 0.1;
    frame = settled && !active ? 0 : requestAnimationFrame(tick);
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!placed) { placed = true; x = targetX; y = targetY; } // start where the pointer is

    const title = (event.target as Element | null)?.closest<HTMLElement>('[data-cursor-title]')?.dataset.cursorTitle ?? '';
    if (title) {
      if (label.textContent !== title) label.textContent = title;
      if (!active) { active = true; cursor.classList.add('is-visible'); }
    } else if (active) {
      active = false;
      cursor.classList.remove('is-visible');
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });

  document.addEventListener('pointerleave', () => {
    active = false;
    cursor.classList.remove('is-visible');
  });
}
