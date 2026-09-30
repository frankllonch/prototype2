import { finePointer, reduceMotion } from './env.ts';

/**
 * Over a painting the pointer *becomes* its name — title and year, read from
 * the tile's own data attributes, drawn where the arrow would be. The arrow is
 * hidden for as long as the label stands in for it.
 *
 * It is decoration, never the only way to learn what a painting is: the same
 * title is the tile's accessible name, so a keyboard or screen-reader user gets
 * it without this, and coarse pointers never see it at all.
 */
export function initCursor(): void {
  const cursor = document.querySelector<HTMLElement>('[data-cursor]');
  const label = cursor?.querySelector<HTMLElement>('.cursor-label');
  if (!cursor || !label || !finePointer.matches) return;

  // Only now is it safe to take the arrow away over a tile: without this class
  // a browser that never runs the script would leave people with no pointer.
  document.documentElement.classList.add('has-cursor');

  let targetX = 0, targetY = 0, x = 0, y = 0;
  let active = false;
  let frame = 0;
  let placed = false;

  const tick = () => {
    // Lerp toward the pointer; the lag is what gives it weight.
    const ease = reduceMotion.matches ? 1 : 0.2;
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    cursor.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    frame = Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1 || active
      ? requestAnimationFrame(tick)
      : 0;
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    targetX = event.clientX;
    targetY = event.clientY;
    // Start where the pointer already is, or the label swoops in from 0,0.
    if (!placed) { placed = true; x = targetX; y = targetY; }

    const tile = (event.target as Element | null)?.closest<HTMLElement>('.tile');
    // A tile piled up in the opening animation, or dimmed by a year filter, is
    // not really under the pointer.
    const usable = tile && !tile.closest('.is-stacked') && !tile.classList.contains('is-dimmed')
      ? tile : null;
    const title = usable?.dataset.title ?? '';

    if (usable && title) {
      const year = usable.dataset.year;
      const text = year ? `${title}, ${year}` : title;
      if (label.textContent !== text) label.textContent = text;
      if (!active) { active = true; cursor.classList.add('is-visible'); }
      // Snap rather than trail while it is standing in for the pointer.
      x = targetX; y = targetY;
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
