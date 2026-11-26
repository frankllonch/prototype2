import { phone } from './env.ts';

/** Hover text roll, after the links on landonorris.com. */
export function initTextRoll(): void {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  /*
   * The static site writes the letters into the page already
   * (components/layout.ts), both drawings of each word, and the stylesheet picks
   * one by the window's width.
   */
  const words = [...document.querySelectorAll<HTMLElement>('[data-roll]')]
    .filter((root) => !root.querySelector('.roll-word'))
    .map((root) => ({ root, text: root.textContent ?? '' }));

  const wrap = (into: HTMLElement, text: string) => {
    into.textContent = '';
    let index = 0;
    for (const { segment } of segmenter.segment(text)) {
      if (!segment.trim()) {
        into.append(segment);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'roll';
      span.dataset.ch = segment;
      span.style.setProperty('--i', String(index++));
      span.textContent = segment;
      into.append(span);
    }
  };

  const set = () => {
    for (const { root, text } of words) {
      // On the opening page the current name is drawn twice, each drawing in a span of its own
      // (client/current.ts).
      const faces = root.querySelectorAll<HTMLElement>('.top-face, .top-echo');
      for (const into of faces.length ? faces : [root]) {
        if (phone.matches) into.textContent = text;
        else wrap(into, text);
      }
    }
  };

  // A page that loads on a phone already has its words plain.
  if (!phone.matches) set();
  phone.addEventListener('change', () => {
    set();
    // The figures read off the bar's words on a resize (client/current.ts, client/film.ts) were
    // read a moment ago, off the other lettering: a window reports its new size before it reports
    // the crossing.
    window.dispatchEvent(new Event('resize'));
  });
}
