import { reduceMotion } from './env.ts';

/**
 * The content rising, again (THE CONTENT RISING in 00-base.css).
 *
 * Arriving at Exhibitions, Commissioned or Artwork, the stylesheet runs it on
 * its own. Clicking the section in the bar while already on it, this runs it
 * once more: the animation is set inline, so the guarantee that cancels the
 * entrances once the page has shown (`is-revealed`) does not cancel it too.
 */
export const RISING = '.xlist, .grid[data-stack]';

export function replayRise(): void {
  if (reduceMotion.matches) return;
  for (const el of document.querySelectorAll<HTMLElement>(RISING)) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'content-rise var(--rise-time) var(--rise-ease) var(--rise-delay) backwards';
  }
}

/** Whether this page has anything that rises. */
export const rises = (): boolean => document.querySelector(RISING) !== null;
