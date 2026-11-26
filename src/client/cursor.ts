import { finePointer, phone, reduceMotion, targetElement } from './env.ts';

/**
 * Over a painting the pointer *becomes* its name — title and year, read from the
 * tile's own data attributes, drawn where the arrow would be.
 */
export function initCursor(): void {
  const cursor = document.querySelector<HTMLElement>('[data-cursor]');
  const label = cursor?.querySelector<HTMLElement>('.cursor-label');
  if (!cursor || !label || !finePointer.matches) return;

  // Only now is it safe to take the arrow away over a tile: without this class a browser that
  // never runs the script would leave people with no pointer.
  const root = document.documentElement;
  root.classList.toggle('has-cursor', !phone.matches);

  let targetX = 0, targetY = 0, x = 0, y = 0;
  let active = false;
  let frame = 0;
  let placed = false;
  let tickedAt = 0;

  const tick = (time: number) => {
    // Lerp toward the pointer; the lag is what gives it weight.
    const elapsed = tickedAt ? Math.min(time - tickedAt, 100) : 1000 / 120;
    tickedAt = time;
    const ease = reduceMotion.matches ? 1 : 1 - Math.pow(0.8, elapsed / (1000 / 120));
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    cursor.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    frame = Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1 || active
      ? requestAnimationFrame(tick)
      : 0;
    if (!frame) tickedAt = 0;
  };

  /** Decide what the pointer is over, given the element under it. */
  const refresh = (target: Element | null) => {
    const tile = target?.closest<HTMLElement>('.tile');
    // A tile piled up in the opening animation, or dimmed by a year filter, is not really under
    // the pointer.
    const usable = tile && !tile.closest('.is-stacked') && !tile.classList.contains('is-dimmed')
      ? tile : null;
    const title = usable?.dataset.title ?? '';

    if (usable && title) {
      // A painting's label is its reference (and collection code), size and technique
      // (content/caption.ts); without any, its name and year.
      const year = usable.dataset.year;
      const text = usable.dataset.caption || (year ? `${title}, ${year}` : title);
      if (label.textContent !== text) label.textContent = text;
      if (!active) { active = true; cursor.classList.add('is-visible'); }
      // Snap rather than trail while it is standing in for the pointer.
      x = targetX; y = targetY;
    } else if (active) {
      active = false;
      cursor.classList.remove('is-visible');
    }
    if (!frame) frame = requestAnimationFrame(tick);
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || phone.matches) return;
    targetX = event.clientX;
    targetY = event.clientY;
    // Start where the pointer already is, or the label swoops in from 0,0.
    if (!placed) { placed = true; x = targetX; y = targetY; }
    refresh(targetElement(event));
  }, { passive: true });

  // The page can move under a pointer that has not: a scroll carries a tile away, or gathers the
  // grid back into the pile, and the label would stay on as the name of nothing.
  let looking = 0;
  const relook = () => {
    if (!placed || looking || phone.matches) return;
    looking = requestAnimationFrame(() => {
      looking = 0;
      refresh(document.elementFromPoint(targetX, targetY));
    });
  };
  window.addEventListener('scroll', relook, { passive: true });
  document.addEventListener('stackrestart', relook);

  // Coming back to the gallery restores it from the cache exactly as it was left — with the name
  // of the painting just clicked still on the pointer, which then blinked off on the first
  // movement.
  const clear = () => { active = false; cursor.classList.remove('is-visible'); };
  window.addEventListener('pageshow', clear);
  window.addEventListener('pagehide', clear);

  // Crossing 900px: the arrow comes back and the name goes, or the other way.
  const follow = () => {
    root.classList.toggle('has-cursor', !phone.matches);
    if (phone.matches) clear();
  };
  phone.addEventListener('change', follow);

  // The pointer leaving the window; `pointerleave` on the document fires in Chromium only.
  root.addEventListener('mouseleave', clear);
}
