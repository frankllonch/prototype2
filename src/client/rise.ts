import { reduceMotion } from './env.ts';

/** The content rising, again (THE CONTENT RISING in 00-base.css). */
export const RISING = '.xlist';

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
