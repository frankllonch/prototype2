import { reduceMotion } from './env.js';
/**
 * The Colour Chart's opening (Frank, 2026-11-19).
 *
 * 1. On arrival the title and the first paragraph ("Color has always been my
 *    inspiration: a source of knowledge, a way of life!") type themselves in.
 * 2. The rest of the statement is typed by the reader: the opening holds
 *    still over a run of scroll, and each stretch of it types the next words
 *    — or a tap on the chevron carries the page down the run for them
 *    (client/scroll-cue.ts). Forwards only, as About is: a word once typed
 *    stays, and scrolling back up takes nothing away.
 * 3. When the run is spent the opening lets go and the page scrolls on as any
 *    page does. Everything under the statement — Order yours, the cost, the
 *    two sections, the thanks, the line at the foot — comes in out of a blur
 *    as it reaches the screen, with About's look and beat.
 *
 * Typing never jumps: however fast the scroll, the words come at most one a
 * beat (`WORD_MS`), so a quick flick types quickly rather than all at once.
 *
 * All of it is an enhancement of a page that already stands. The words are
 * split here and the run is made here; the stylesheet hides the statement
 * only under `html.js`, and `.is-typed` shows every word whatever happened.
 */
/** After the page's own entrance, so the words are not typed behind a veil. */
const WAIT_MS = 350;
/** At most one word every this many milliseconds. Less is faster typing. */
const WORD_MS = 24;
/**
 * And once the reader has scrolled past the end of the run, the words still
 * owed are typed at this pace, so the statement is finished before anything
 * under it comes in (Frank, 2026-11-20).
 */
const CATCH_UP_MS = 10;
/**
 * How much scroll the reader types with, per word, in screens. More is
 * slower: the reader has to travel further for each word. The run is at
 * least RUN_MIN screens, so a short statement still asks for a real scroll.
 */
const PER_WORD = 0.02;
const RUN_MIN = 0.6;
/** Each column comes in this much later than the one to its left, at most. */
const STAGGER_MS = 260;
export function initChart() {
    const chart = document.querySelector('[data-chart]');
    if (!chart)
        return;
    const typed = chart.querySelector('[data-chart-type]');
    const opening = chart.querySelector('[data-chart-opening]');
    const stage = chart.querySelector('[data-chart-stage]');
    const pops = [...chart.querySelectorAll('.chart-in')];
    const done = () => chart.classList.add('is-typed');
    if (reduceMotion.matches || !typed || !opening || !stage || !('IntersectionObserver' in window)) {
        done();
        for (const el of pops)
            el.classList.add('is-in');
        return;
    }
    /* -------------------------------------------------------- the fade-ins */
    const seen = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting)
                continue;
            const el = entry.target;
            const across = entry.boundingClientRect.left / Math.max(1, window.innerWidth);
            el.style.setProperty('--pop-delay', `${Math.round(Math.max(0, across) * STAGGER_MS)}ms`);
            el.classList.add('is-in');
            seen.unobserve(el);
        }
    }, { rootMargin: '0px 0px -8% 0px' });
    // Nothing under the statement comes in until the statement is finished:
    // the page reads as one sequence, the words and then the rest (Frank,
    // 2026-11-20). Asked from `done`, so whatever is already on screen then
    // comes in at once, column by column.
    let watching = false;
    const watch = () => {
        if (watching)
            return;
        watching = true;
        for (const el of pops)
            seen.observe(el);
    };
    /* ------------------------------------------------------------- the words */
    const auto = [...typed.querySelectorAll('.chart-title, [data-chart-auto]')];
    const autoWords = auto.flatMap(splitWords);
    const restWords = [...typed.querySelectorAll('p:not([data-chart-auto])')].flatMap(splitWords);
    const words = [...autoWords, ...restWords];
    /* --------------------------------------------------------------- the run */
    const runway = document.createElement('div');
    runway.className = 'chart-runway';
    runway.setAttribute('aria-hidden', 'true');
    opening.append(runway);
    let run = 1;
    const measure = () => {
        run = Math.round(Math.max(RUN_MIN, restWords.length * PER_WORD) * window.innerHeight);
        runway.style.height = `${run}px`;
        // A stage taller than the screen is held with its foot on the screen's,
        // so the words being typed are always in view.
        stage.style.top = `${Math.min(0, window.innerHeight - stage.offsetHeight)}px`;
        // Where the run ends, for the chevron to carry the reader to.
        chart.dataset.chartEnd = String(opening.offsetTop + run);
    };
    measure();
    window.addEventListener('resize', measure);
    /* ------------------------------------------------------------ the typing */
    let shown = 0;
    let target = 0;
    let timer = 0;
    const tick = () => {
        timer = 0;
        if (shown >= target)
            return;
        words[shown++]?.classList.add('is-written');
        if (shown >= words.length) {
            done();
            watch();
            window.removeEventListener('scroll', onScroll);
            return;
        }
        timer = window.setTimeout(tick, furthest >= run ? CATCH_UP_MS : WORD_MS);
    };
    const aim = (n) => {
        // Forwards only: the target never comes back down.
        target = Math.max(target, Math.min(words.length, n));
        if (!timer && shown < target)
            tick();
    };
    let autoDone = false;
    // The furthest the reader has been down the run. Forwards only: going back
    // up never lowers it, so a reader who went past the end and came back finds
    // the statement finished, not stopped where they now are.
    let furthest = 0;
    const onScroll = () => {
        furthest = Math.max(furthest, window.scrollY - opening.offsetTop);
        // The reader's words follow the clock's: nothing they scroll is typed
        // until the opening has finished typing itself, and then it catches up.
        if (!autoDone)
            return;
        const share = Math.max(0, Math.min(1, furthest / run));
        aim(autoWords.length + Math.ceil(share * restWords.length));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // A reload or a back-navigation that lands down the page: it stands typed.
    if (window.scrollY > window.innerHeight * 0.1) {
        autoDone = true;
        target = shown = words.length;
        for (const w of words)
            w.classList.add('is-written');
        done();
        watch();
        return;
    }
    window.setTimeout(() => {
        aim(autoWords.length);
        // When the clock's words are in, whatever the reader has scrolled since
        // is typed after them.
        const wait = () => {
            if (shown < autoWords.length)
                return void window.setTimeout(wait, WORD_MS);
            autoDone = true;
            onScroll();
        };
        wait();
    }, WAIT_MS);
}
/**
 * Every word in the element wrapped in its own span, in reading order, leaving
 * the markup around them (line breaks, the paragraphs) as it is. The spaces
 * stay outside the spans, so the lines break exactly as they did.
 */
function splitWords(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode())
        nodes.push(n);
    const words = [];
    for (const node of nodes) {
        const text = node.textContent ?? '';
        if (!text.trim())
            continue;
        const frag = document.createDocumentFragment();
        for (const part of text.split(/(\s+)/)) {
            if (!part)
                continue;
            if (/^\s+$/.test(part)) {
                frag.append(part);
                continue;
            }
            const span = document.createElement('span');
            span.className = 'chart-word';
            span.textContent = part;
            words.push(span);
            frag.append(span);
        }
        node.replaceWith(frag);
    }
    return words;
}
