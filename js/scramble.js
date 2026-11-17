import { phone, reduceMotion } from './env.js';
/**
 * The other hover: the letters under the pointer churn, and the rest of the
 * word stays as it is.
 *
 * One of two, and only one runs — `data-hover` on the document says which, and
 * it is set in one place in `components/layout.ts`. The roll is the other.
 *
 * It follows the pointer across the word rather than running the whole word at
 * once: what churns is whatever falls inside `RADIUS` of where the pointer is,
 * so moving along a word opens and closes the effect under the hand. The edge
 * of that reach is soft — a letter at the very edge takes a piece of nonsense
 * only now and then, and more often the nearer it is — because a hard circle
 * reads as a rectangle of noise sliding about.
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
 * whatever state the churn is in, and on every frame for any letter that has
 * fallen out of reach — a word cannot be left as nonsense by taking the
 * pointer away mid-way, which is the failing the roll had.
 */
/** What the churn draws from. One character here means a mask rather than noise. */
const GLYPHS = '*';
/** How long a character holds one piece of nonsense before taking another. */
const STEP = 100;
/**
 * How far either side of the pointer the churn reaches, in pixels. The knob
 * for "only the letters I am on" against "most of the word": at 0 nothing
 * churns, and at the width of the longest word it all does.
 */
const RADIUS = 55;
/**
 * How much of that reach is the soft edge, as a fraction of it. At 0 the reach
 * is a hard edge and letters snap in and out of the churn; at 1 it fades the
 * whole way from the pointer outwards.
 */
const EDGE = 1;
export function initScramble() {
    // Not on a phone, for the roll's reasons (client/text-roll.ts): nothing
    // hovers there, and a letter boxed on its own stops kerning.
    if (phone.matches)
        return;
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const root of document.querySelectorAll('[data-roll]')) {
        // The build writes the boxes into the page already (components/layout.ts),
        // so the bar's first frame is its last; they are cut here only where a
        // page arrives with a plain word.
        const written = [...root.querySelectorAll('.scram')];
        if (written.length) {
            measure(written);
            wire(root, written);
            continue;
        }
        const text = root.textContent ?? '';
        root.textContent = '';
        const cells = [];
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
        if (!cells.length)
            continue;
        measure(cells);
        wire(root, cells);
    }
}
/** Measured once, while the word is still itself, and held from then on. */
function measure(cells) {
    const widths = cells.map((cell) => cell.getBoundingClientRect().width.toFixed(2));
    cells.forEach((cell, i) => cell.style.setProperty('--w', `${widths[i]}px`));
}
/*
 * On the opening page the current name is drawn twice (client/current.ts),
 * each copy holding a set of the same boxes; the copy is made after this has
 * run. So the boxes are looked up as they stand each time they are written,
 * and the nth box of every copy takes what the nth letter takes.
 */
function boxes(root, count) {
    const all = [...root.querySelectorAll('.scram')];
    const sets = [];
    for (let i = 0; i < all.length; i += count)
        sets.push(all.slice(i, i + count));
    return sets;
}
function wire(root, cells) {
    let frame = 0;
    let pointer = 0;
    let centres = [];
    // The hover tuner (?tune, client/hover-tuner.ts) writes the bar's words
    // itself while it is on; this stands aside for it.
    const tuning = () => 'tune' in document.documentElement.dataset;
    const settle = () => {
        if (frame)
            cancelAnimationFrame(frame);
        frame = 0;
        if (tuning())
            return;
        for (const set of boxes(root, cells.length))
            for (const cell of set)
                cell.textContent = cell.dataset.ch ?? '';
    };
    /*
     * Where each letter is, taken when the pointer arrives rather than kept from
     * before. The bar is fixed to the window, so these are good for as long as
     * the pointer is on the word, and reading them again on each arrival costs
     * one layout and saves having to watch for everything that could move them.
     */
    const locate = () => {
        centres = (boxes(root, cells.length)[0] ?? cells).map((cell) => {
            const box = cell.getBoundingClientRect();
            return box.left + box.width / 2;
        });
    };
    const run = () => {
        // Nor on a page that loaded wide and is below 900px now: the boxes are
        // still in the words there (09-phone.css lets them flow as plain text).
        if (reduceMotion.matches || phone.matches || tuning())
            return;
        if (frame)
            return;
        let piece = -1;
        const tick = () => {
            const now = Math.floor(performance.now() / STEP);
            if (now !== piece) {
                piece = now;
                const sets = boxes(root, cells.length);
                cells.forEach((cell, i) => {
                    const away = Math.abs((centres[i] ?? 0) - pointer);
                    // Certain within the solid part of the reach, thinning to nothing at
                    // its edge, so the churn frays rather than stopping at a line.
                    const solid = RADIUS * (1 - EDGE);
                    const chance = away <= solid ? 1 : 1 - (away - solid) / Math.max(1, RADIUS - solid);
                    const shown = chance > 0 && Math.random() < chance
                        ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ''
                        : cell.dataset.ch ?? '';
                    for (const set of sets) {
                        const box = set[i];
                        if (box)
                            box.textContent = shown;
                    }
                });
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
    };
    const enter = (event) => { pointer = event.clientX; locate(); run(); };
    const move = (event) => { pointer = event.clientX; };
    root.addEventListener('pointerenter', enter);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', settle);
    /*
     * A keyboard reaches these too and has no pointer to follow, so focus churns
     * the middle of the word and leaves the ends alone, which is the same effect
     * standing still.
     */
    root.addEventListener('focus', () => {
        const box = root.getBoundingClientRect();
        pointer = box.left + box.width / 2;
        locate();
        run();
    });
    root.addEventListener('blur', settle);
}
