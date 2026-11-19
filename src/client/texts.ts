import { isPlainClick } from './env.ts';
import { glide, topOf } from './glide.ts';

/**
 * The opening view's three texts.
 *
 * ‘Read more’ swaps the cut text for the whole of it, in place; any other
 * plain click on a block is the block being used as the doorway it looks
 * like, and goes through the heading's own link so the page leaves the way
 * every other departure does. Modified clicks are left alone — the heading is
 * a real link and knows what a cmd-click means.
 */
export function initWcTexts(): void {
  const texts = document.querySelector<HTMLElement>('.wc-texts');
  if (!texts) return;
  initTextFilm(texts);

  texts.addEventListener('click', (event) => {
    const target = event.target as Element;
    const more = target.closest<HTMLButtonElement>('.wc-more');
    if (more) {
      event.preventDefault();
      const block = more.closest<HTMLElement>('.wc-text');
      if (block) {
        block.classList.add('is-open');
        more.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    const less = target.closest<HTMLButtonElement>('.wc-less');
    if (less) {
      event.preventDefault();
      const block = less.closest<HTMLElement>('.wc-text');
      if (block) {
        block.classList.remove('is-open');
        block.querySelector('.wc-more')?.setAttribute('aria-expanded', 'false');
        // Folding a long text can leave the reader staring past its end;
        // bring the block's head back if it has gone over the top.
        if (block.getBoundingClientRect().top < 0) {
          glide(topOf(block));
        }
      }
      return;
    }
    if (target.closest('a')) return;
    // The film under the first edition's text plays where it is: a click on
    // its controls is not a click on the doorway.
    if (target.closest('.wc-text-film')) return;
    if (!isPlainClick(event)) return;
    const block = target.closest<HTMLElement>('.wc-text');
    if (!block) return;
    const visible = block.querySelector<HTMLAnchorElement>(
      block.classList.contains('is-open') ? '.wc-text-open .wc-text-head a' : '.wc-text-closed .wc-text-head a',
    );
    visible?.click();
  });
}

/**
 * The first edition's film: silent and looping while it is on screen, paused
 * when it is not, with its own sound button (components/whats-color.ts). The
 * browser's controls are taken off once this is in charge.
 */
function initTextFilm(texts: HTMLElement): void {
  const video = texts.querySelector<HTMLVideoElement>('.wc-text-film video');
  const sound = texts.querySelector<HTMLButtonElement>('.wc-film-sound');
  if (!video || !sound) return;

  video.controls = false;
  video.muted = true;
  sound.hidden = false;

  // Paused by a click, it stays paused until another click, however the
  // reader scrolls.
  let held = false;
  let inView = false;
  const play = () => { void video.play().catch(() => undefined); };

  new IntersectionObserver(
    ([entry]) => {
      inView = !!entry?.isIntersecting;
      if (inView && !held) play();
      else if (!inView) video.pause();
    },
    { threshold: 0.25 },
  ).observe(video);

  sound.addEventListener('click', (event) => {
    event.preventDefault();
    const on = video.muted;
    video.muted = !on;
    sound.setAttribute('aria-pressed', String(on));
    sound.setAttribute('aria-label', on ? 'Sound off' : 'Sound on');
    if (on && video.paused) { held = false; play(); }
  });

  video.addEventListener('click', () => {
    if (video.paused) { held = false; play(); }
    else { held = true; video.pause(); }
  });
}
