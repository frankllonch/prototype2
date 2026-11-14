import { phone } from './env.js';
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
 *
 * Not on a phone. There is no hover there to roll on, and the wrapping is not
 * free: a letter in a span of its own no longer kerns against its neighbours,
 * which at the 40 the phone's menu is set in moves VALSELLS and WHAT'S by
 * three and four pixels off the designer's sheet, and a word of boxed letters
 * may break between any two of them.
 *
 * And that follows the window, not the moment the page loaded: a tablet is
 * wider than 900 on its side and narrower upright. So each word's own text is
 * kept, and put back plain when the window goes below 900 and wrapped again
 * when it comes back above.
 */
export function initTextRoll() {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const words = [...document.querySelectorAll('[data-roll]')]
        .map((root) => ({ root, text: root.textContent ?? '' }));
    const wrap = (into, text) => {
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
            // On the opening page the current name is drawn twice, each drawing in
            // a span of its own (client/current.ts). Those two hold the letters
            // then, and the name itself holds only them.
            const faces = root.querySelectorAll('.top-face, .top-echo');
            for (const into of faces.length ? faces : [root]) {
                if (phone.matches)
                    into.textContent = text;
                else
                    wrap(into, text);
            }
        }
    };
    // A page that loads on a phone already has its words plain.
    if (!phone.matches)
        set();
    phone.addEventListener('change', () => {
        set();
        // The figures read off the bar's words on a resize (client/current.ts,
        // client/film.ts) were read a moment ago, off the other lettering: a
        // window reports its new size before it reports the crossing. Said again,
        // so they are taken from the words as they now stand.
        window.dispatchEvent(new Event('resize'));
    });
}
