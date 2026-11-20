import { phone, reduceMotion } from './env.js';
const EASES = ['ease-in-out', 'ease', 'ease-out', 'ease-in', 'linear', 'site (expo out)', 'back out', 'snappy'];
const easeOf = (name) => {
    switch (name) {
        case 'site (expo out)': return 'cubic-bezier(0.22, 1, 0.36, 1)';
        case 'back out': return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
        case 'snappy': return 'cubic-bezier(0.7, 0, 0.2, 1)';
        default: return typeof name === 'string' ? name : 'ease-in-out';
    }
};
export const num = (key, label, value, min, max, step, unit = '') => ({ kind: 'num', key, label, value, min, max, step, unit });
export const pick = (key, label, value, options) => ({ kind: 'pick', key, label, value, options });
export const flag = (key, label, value) => ({ kind: 'flag', key, label, value });
const text = (key, label, value) => ({ kind: 'text', key, label, value });
const colour = (key, label, value) => ({ kind: 'colour', key, label, value });
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
/**
 * The word as boxed letters, each numbered (`--i`) and the count on the word
 * (`--n`), plus the plain word for a screen reader — the same two drawings the
 * page arrives with (components/layout.ts).
 */
function letters(root, word, className) {
    const shown = document.createElement('span');
    shown.className = 'roll-word';
    shown.setAttribute('aria-hidden', 'true');
    const cells = [];
    for (const { segment } of segmenter.segment(word)) {
        if (!segment.trim()) {
            shown.append(segment);
            continue;
        }
        const cell = document.createElement('span');
        cell.className = className;
        cell.dataset.ch = segment;
        cell.style.setProperty('--i', String(cells.length));
        cell.textContent = segment;
        shown.append(cell);
        cells.push(cell);
    }
    shown.style.setProperty('--n', String(cells.length));
    const plain = document.createElement('span');
    plain.className = 'roll-text';
    plain.textContent = word;
    root.replaceChildren(shown, plain);
    return cells;
}
/** The word whole, for the effects that work on it as one piece. */
function whole(root, word, className) {
    const shown = document.createElement('span');
    shown.className = `roll-word ${className}`;
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = word;
    const plain = document.createElement('span');
    plain.className = 'roll-text';
    plain.textContent = word;
    root.replaceChildren(shown, plain);
}
const HOT = ':is(:hover, :focus-visible, .is-hot)';
const EFFECTS = [
    {
        id: 'roll',
        name: 'Roll',
        note: 'The site\u2019s hover until 2026-11-17. Each letter turns over like a split-flap board.',
        fields: [
            num('duration', 'Roll time', 810, 50, 1500, 10, 'ms'),
            num('fade', 'Fade time', 220, 0, 1500, 10, 'ms'),
            num('stagger', 'Delay per letter', 85, 0, 200, 5, 'ms'),
            pick('ease', 'Easing', 'back out', EASES),
            pick('direction', 'Direction', 'up', ['up', 'down']),
            flag('reverse', 'Hover on: last letter first', false),
            pick('leave', 'Hover off (rewinds = last letter first)', 'rewinds', ['rewinds', 'same order as on']),
            num('pad', 'Room above and below', 0.35, 0, 1, 0.01, 'em'),
            num('soft', 'Edge softness', 0.35, 0, 1, 0.01, 'em'),
        ],
        css: (v) => {
            const sign = v.direction === 'down' ? -1 : 1;
            const first = 'var(--i)';
            const last = 'calc(var(--n, 1) - 1 - var(--i))';
            const on = v.reverse ? last : first;
            // Rewinding plays the way in backwards: whichever letter went first comes back last.
            const off = v.leave === 'same order as on' ? on : v.reverse ? first : last;
            return `
.roll { --roll-pad: ${v.pad ?? 0.35}em; --roll-soft: ${v.soft ?? 0.35}em; }
.roll::before, .roll::after {
  transition: transform ${v.duration}ms ${easeOf(v.ease)}, opacity ${v.fade}ms ${easeOf(v.ease)};
  transition-delay: calc(${off} * ${v.stagger}ms);
}
.roll::after { transform: translateY(${100 * sign}%); }
[data-roll]${HOT} .roll::before { transform: translateY(${-100 * sign}%); opacity: 0; transition-delay: calc(${on} * ${v.stagger}ms); }
[data-roll]${HOT} .roll::after { transform: translateY(0); opacity: 1; transition-delay: calc(${on} * ${v.stagger}ms); }`;
        },
        mount: (root, word) => { letters(root, word, 'roll'); },
    },
    {
        id: 'scramble',
        name: 'Scramble',
        note: 'On the site now. The letters near the pointer churn.',
        fields: [
            text('glyphs', 'Characters', '*'),
            num('step', 'Churn speed', 100, 15, 300, 5, 'ms'),
            num('radius', 'Reach', 55, 0, 300, 5, 'px'),
            num('edge', 'Soft edge', 1, 0, 1, 0.05),
            pick('mode', 'Where', 'under the pointer', ['under the pointer', 'whole word', 'left to right, then settle']),
            num('settle', 'Settle time (last mode)', 500, 100, 2000, 50, 'ms'),
        ],
        css: () => '',
        mount: (root, word) => {
            const cells = letters(root, word, 'scram');
            for (const cell of cells)
                cell.style.setProperty('--w', `${cell.getBoundingClientRect().width.toFixed(2)}px`);
        },
        wire: (root, v) => {
            const cells = [...root.querySelectorAll('.scram')];
            const glyphs = [...segmenter.segment(String(v.glyphs || '*'))].map((s) => s.segment);
            const step = Number(v.step);
            const radius = Number(v.radius);
            const edge = Number(v.edge);
            let frame = 0;
            let pointer = 0;
            let started = 0;
            let centres = [];
            const noise = () => glyphs[Math.floor(Math.random() * glyphs.length)] ?? '';
            const settle = () => {
                if (frame)
                    cancelAnimationFrame(frame);
                frame = 0;
                for (const cell of cells)
                    cell.textContent = cell.dataset.ch ?? '';
            };
            const locate = () => {
                centres = cells.map((cell) => { const b = cell.getBoundingClientRect(); return b.left + b.width / 2; });
            };
            const run = () => {
                if (reduceMotion.matches || frame)
                    return;
                started = performance.now();
                let piece = -1;
                const tick = () => {
                    const now = performance.now();
                    const at = Math.floor(now / step);
                    if (at !== piece) {
                        piece = at;
                        if (v.mode === 'whole word') {
                            for (const cell of cells)
                                cell.textContent = noise();
                        }
                        else if (v.mode === 'left to right, then settle') {
                            // Each letter churns until the sweep passes it, then stays itself.
                            const done = ((now - started) / Number(v.settle)) * cells.length;
                            cells.forEach((cell, i) => { cell.textContent = i < done ? cell.dataset.ch ?? '' : noise(); });
                            if (done >= cells.length) {
                                settle();
                                return;
                            }
                        }
                        else {
                            const solid = radius * (1 - edge);
                            cells.forEach((cell, i) => {
                                const away = Math.abs((centres[i] ?? 0) - pointer);
                                const chance = away <= solid ? 1 : 1 - (away - solid) / Math.max(1, radius - solid);
                                cell.textContent = chance > 0 && Math.random() < chance ? noise() : cell.dataset.ch ?? '';
                            });
                        }
                    }
                    frame = requestAnimationFrame(tick);
                };
                frame = requestAnimationFrame(tick);
            };
            const enter = (e) => {
                if (e instanceof PointerEvent)
                    pointer = e.clientX;
                else {
                    const b = root.getBoundingClientRect();
                    pointer = b.left + b.width / 2;
                }
                locate();
                run();
            };
            const move = (e) => { pointer = e.clientX; };
            const leave = () => { if (v.mode !== 'left to right, then settle')
                settle(); };
            const play = () => {
                enter(new Event('play'));
                if (v.mode !== 'left to right, then settle')
                    window.setTimeout(settle, 900);
            };
            root.addEventListener('pointerenter', enter);
            root.addEventListener('pointermove', move);
            root.addEventListener('pointerleave', leave);
            root.addEventListener('focus', enter);
            root.addEventListener('blur', leave);
            root.addEventListener('tuner:play', play);
            return () => {
                settle();
                root.removeEventListener('pointerenter', enter);
                root.removeEventListener('pointermove', move);
                root.removeEventListener('pointerleave', leave);
                root.removeEventListener('focus', enter);
                root.removeEventListener('blur', leave);
                root.removeEventListener('tuner:play', play);
            };
        },
    },
    {
        id: 'colour',
        name: 'Colour only',
        note: 'No motion: the word only brightens. Optionally the other items step back.',
        fields: [
            num('dim', 'Others fade to', 1, 0.1, 1, 0.05),
            num('dimTime', 'Others fade time', 300, 0, 1500, 10, 'ms'),
        ],
        css: (v) => Number(v.dim) >= 1 ? '' : `
.top { --tune-dim-time: ${v.dimTime}ms; }
.top:has([data-roll]:is(:hover, .is-hot)) [data-roll]:not(:is(:hover, .is-hot)):not([aria-current='page']) { opacity: ${v.dim}; }`,
        mount: (root, word) => { whole(root, word, 'tune-plain'); },
    },
    {
        id: 'underline',
        name: 'Underline',
        note: 'New. A line is drawn under the word, and taken away again.',
        fields: [
            num('thickness', 'Thickness', 1, 0.5, 6, 0.5, 'px'),
            num('offset', 'Distance below', 0.12, -0.6, 0.6, 0.01, 'em'),
            num('duration', 'Draw time', 450, 50, 1500, 10, 'ms'),
            pick('ease', 'Easing', 'site (expo out)', EASES),
            pick('from', 'Draws from', 'left', ['left', 'centre', 'right']),
            pick('exit', 'Leaves', 'on through', ['on through', 'back the way it came']),
            flag('current', 'Underline the page you are on too', false),
        ],
        css: (v) => {
            const from = v.from === 'centre' ? 'center' : v.from;
            const out = v.from === 'centre' ? 'center' : v.exit === 'on through' ? (v.from === 'left' ? 'right' : 'left') : from;
            return `
.tune-line { position: relative; }
.tune-line::after {
  content: ''; position: absolute; left: 0; right: 0;
  top: calc(100% + ${v.offset}em); height: ${v.thickness}px;
  background: currentColor;
  transform: scaleX(0); transform-origin: ${out} center;
  transition: transform ${v.duration}ms ${easeOf(v.ease)};
}
[data-roll]${HOT} .tune-line::after { transform: scaleX(1); transform-origin: ${from} center; }
${v.current ? `[aria-current='page'] .tune-line::after { transform: scaleX(1); }` : ''}`;
        },
        mount: (root, word) => { whole(root, word, 'tune-line'); },
    },
    {
        id: 'wave',
        name: 'Wave',
        note: 'New. The letters lift one after another and settle back.',
        fields: [
            num('height', 'Lift', 0.25, 0.05, 1, 0.01, 'em'),
            num('duration', 'Time per letter', 420, 100, 1500, 10, 'ms'),
            num('stagger', 'Delay per letter', 35, 0, 200, 5, 'ms'),
            pick('ease', 'Easing', 'ease-in-out', EASES),
            pick('shape', 'Shape', 'lift and settle', ['lift and settle', 'dip and settle', 'grow and settle']),
            pick('repeat', 'Plays', 'once per hover', ['once per hover', 'while hovering']),
        ],
        css: (v) => {
            const peak = v.shape === 'dip and settle' ? `translateY(${v.height}em)`
                : v.shape === 'grow and settle' ? `scale(${1 + Number(v.height)})` : `translateY(-${v.height}em)`;
            return `
.tune-wave { display: inline-block; white-space: pre; transform-origin: 50% 80%; }
@keyframes tune-wave { 0%, 100% { transform: none; } 45% { transform: ${peak}; } }
[data-roll].is-waving .tune-wave {
  animation: tune-wave ${v.duration}ms ${easeOf(v.ease)} calc(var(--i) * ${v.stagger}ms) ${v.repeat === 'while hovering' ? 'infinite' : '1'} both;
}`;
        },
        mount: (root, word) => { letters(root, word, 'tune-wave'); },
        wire: (root, v) => {
            const cells = root.querySelectorAll('.tune-wave');
            const last = cells[cells.length - 1];
            const loop = v.repeat === 'while hovering';
            const start = () => {
                if (reduceMotion.matches)
                    return;
                if (!loop && root.classList.contains('is-waving'))
                    return;
                root.classList.remove('is-waving');
                void root.offsetWidth;
                root.classList.add('is-waving');
            };
            // Once, it plays to the end even if the pointer has gone; looping, it stops with it.
            const end = () => { if (!loop)
                root.classList.remove('is-waving'); };
            const leave = () => { if (loop)
                root.classList.remove('is-waving'); };
            const play = () => { start(); if (loop)
                window.setTimeout(leave, 1500); };
            root.addEventListener('pointerenter', start);
            root.addEventListener('focus', start);
            root.addEventListener('pointerleave', leave);
            root.addEventListener('blur', leave);
            root.addEventListener('tuner:play', play);
            last?.addEventListener('animationend', end);
            return () => {
                root.classList.remove('is-waving');
                root.removeEventListener('pointerenter', start);
                root.removeEventListener('focus', start);
                root.removeEventListener('pointerleave', leave);
                root.removeEventListener('blur', leave);
                root.removeEventListener('tuner:play', play);
                last?.removeEventListener('animationend', end);
            };
        },
    },
    {
        id: 'retype',
        name: 'Retype',
        note: 'New. The word is taken back and typed again, like the What’s Color text.',
        fields: [
            pick('mode', 'How', 'erase, then type', ['erase, then type', 'vanish, then type', 'type over in place']),
            num('erase', 'Erase speed', 25, 5, 150, 5, 'ms/letter'),
            num('pause', 'Pause between', 80, 0, 600, 10, 'ms'),
            num('type', 'Type speed', 45, 5, 200, 5, 'ms/letter'),
            pick('caret', 'Cursor', '|', ['none', '|', '_', '▌']),
            num('hold', 'Cursor stays after', 250, 0, 1500, 25, 'ms'),
        ],
        css: () => `
.tune-type { display: inline-block; white-space: pre; }
.tune-type.is-gone { visibility: hidden; }
.tune-type.is-over { opacity: 0.35; }
.tune-caret { position: absolute; top: 0; pointer-events: none; font-weight: 300; }`,
        mount: (root, word) => {
            letters(root, word, 'tune-type');
            const shown = root.querySelector('.roll-word');
            if (shown)
                shown.style.position = 'relative';
        },
        wire: (root, v) => {
            const cells = [...root.querySelectorAll('.tune-type')];
            const shown = root.querySelector('.roll-word');
            let timers = [];
            let busy = false;
            let caret = null;
            const later = (ms, fn) => { timers.push(window.setTimeout(fn, ms)); };
            const place = (after) => {
                if (!caret)
                    return;
                const cell = cells[Math.max(0, Math.min(after, cells.length - 1))];
                if (!cell)
                    return;
                caret.style.left = `${after < 0 ? cell.offsetLeft : cell.offsetLeft + cell.offsetWidth}px`;
            };
            const finish = () => {
                for (const t of timers)
                    clearTimeout(t);
                timers = [];
                for (const cell of cells)
                    cell.classList.remove('is-gone', 'is-over');
                caret?.remove();
                caret = null;
                busy = false;
            };
            const run = () => {
                if (busy || reduceMotion.matches || !shown)
                    return;
                busy = true;
                if (v.caret !== 'none') {
                    caret = document.createElement('span');
                    caret.className = 'tune-caret';
                    caret.textContent = String(v.caret);
                    shown.append(caret);
                }
                const n = cells.length;
                const erase = Number(v.erase);
                const type = Number(v.type);
                let t = 0;
                if (v.mode === 'erase, then type') {
                    place(n - 1);
                    for (let i = n - 1; i >= 0; i--) {
                        t += erase;
                        later(t, () => { cells[i]?.classList.add('is-gone'); place(i - 1); });
                    }
                }
                else if (v.mode === 'vanish, then type') {
                    for (const cell of cells)
                        cell.classList.add('is-gone');
                    place(-1);
                }
                else {
                    for (const cell of cells)
                        cell.classList.add('is-over');
                    place(-1);
                }
                t += Number(v.pause);
                for (let i = 0; i < n; i++) {
                    t += type;
                    later(t, () => { cells[i]?.classList.remove('is-gone', 'is-over'); place(i); });
                }
                later(t + Number(v.hold), finish);
            };
            root.addEventListener('pointerenter', run);
            root.addEventListener('focus', run);
            root.addEventListener('tuner:play', run);
            return () => {
                finish();
                root.removeEventListener('pointerenter', run);
                root.removeEventListener('focus', run);
                root.removeEventListener('tuner:play', run);
            };
        },
    },
];
// ----------------------------------------------------------------- lettering
/*
 * The bar's lettering. Colours are given as they come out over white paper —
 * the colour you see on a white page — because the bar draws itself as the
 * negative of what is under it (`mix-blend-mode: difference`, 00-base.css,
 * "top bar"): the stylesheet holds the inverse, and this works it out.
 */
const MENU_FIELDS = () => [
    num('size', 'Size', px(getComputedStyle(document.querySelector('.menu') ?? document.body).fontSize, 18), 8, 40, 0.5, 'px'),
    num('tracking', 'Letter spacing', 0.1, -0.05, 0.4, 0.005, 'em'),
    num('nameWeight', 'Weight: name + What’s Color', 600, 100, 900, 50),
    num('pageWeight', 'Weight: pages', 400, 100, 900, 50),
    flag('caps', 'Capitals', true),
    flag('italicHover', 'Italic on hover', false),
    num('gap', 'Space between pages', px(getComputedStyle(document.querySelector('.menu') ?? document.body).columnGap, 75), 0, 160, 1, 'px'),
    num('top', 'Distance from top', px(getComputedStyle(document.querySelector('.top') ?? document.body).paddingTop, 26), 0, 120, 1, 'px'),
    colour('rest', 'Colour at rest (on white)', '#1b1b1d'),
    colour('hover', 'Colour on hover (on white)', '#030305'),
    num('colourTime', 'Colour change time', 550, 0, 2000, 10, 'ms'),
    pick('colourEase', 'Colour easing', 'site (expo out)', EASES),
    pick('blend', 'Over pictures', 'negative', ['negative', 'plain colour']),
    num('blockSide', 'Page block: width either side', 0.18, 0, 1, 0.01, 'em'),
    num('blockTrim', 'Page block: trim at bottom', 6, -10, 30, 1, 'px'),
];
/**
 * Every selector put behind `html[data-tune]`, which is one attribute more
 * than the stylesheet's own rules carry, so these win without `!important`.
 * Rules are written one to a line, or with the selector alone on its first
 * line; at-rules are left as they are.
 */
function scope(css) {
    return css.split('\n').map((line) => {
        const open = line.indexOf('{');
        if (open < 0 || /^\s|^@|^}/.test(line))
            return line;
        const parts = [];
        let depth = 0;
        let start = 0;
        const selector = line.slice(0, open);
        for (let i = 0; i < selector.length; i++) {
            const c = selector[i];
            if (c === '(')
                depth++;
            else if (c === ')')
                depth--;
            else if (c === ',' && depth === 0) {
                parts.push(selector.slice(start, i));
                start = i + 1;
            }
        }
        parts.push(selector.slice(start));
        return `${parts.map((p) => `html[data-tune] ${p.trim()}`).join(', ')} ${line.slice(open)}`;
    }).join('\n');
}
function px(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? Math.round(n * 2) / 2 : fallback;
}
/** `#rrggbb` over white → the source colour `difference` needs to produce it. */
function inverse(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m)
        return hex;
    const [r, g, b] = [m[1], m[2], m[3]].map((h) => 255 - parseInt(h ?? '0', 16));
    return `rgb(${r}, ${g}, ${b})`;
}
function menuCss(v, defaults) {
    const changed = (k) => v[k] !== defaults[k];
    const negative = v.blend === 'negative';
    const rest = negative ? inverse(String(v.rest)) : String(v.rest);
    const hover = negative ? inverse(String(v.hover)) : String(v.hover);
    const rules = [];
    // Only what has been moved is written, so the stylesheet's own fluid sizes
    // stay in charge of everything left alone.
    if (changed('size'))
        rules.push(`.top :is(.wordmark, .top-soon, .menu) { font-size: ${v.size}px; }`);
    if (changed('tracking'))
        rules.push(`.top :is(.wordmark, .top-soon, .menu) { letter-spacing: ${v.tracking}em; }`);
    if (changed('nameWeight'))
        rules.push(`.top :is(.wordmark, .top-soon) { font-weight: ${v.nameWeight}; }`);
    if (changed('pageWeight'))
        rules.push(`.top .menu a { font-weight: ${v.pageWeight}; }`);
    if (changed('caps'))
        rules.push(`.top :is(.wordmark, .top-soon, .menu) { text-transform: ${v.caps ? 'uppercase' : 'none'}; }`);
    if (v.italicHover)
        rules.push(`.top [data-roll]${HOT} { font-style: italic; }`);
    if (changed('gap'))
        rules.push(`.top .menu { gap: ${v.gap}px; }`);
    if (changed('top'))
        rules.push(`.top { --bar-top: ${v.top}px; }`);
    if (!negative)
        rules.push(`.top { mix-blend-mode: normal; }`);
    // Both or neither: the rest colour's rule outranks the stylesheet's hover,
    // so once it is written the hover has to be written above it again.
    if (changed('rest') || changed('hover') || !negative) {
        rules.push(`.top :is(.menu a, .top-soon):not([aria-current='page']) { color: ${rest}; --roll-color: ${rest}; }`);
        rules.push(`.top { --bar-ink: ${hover}; }`);
        rules.push(`.top .wordmark:not([aria-current='page']), .top :is(.menu a, .top-soon):not([aria-current='page'])${HOT} { color: ${hover}; --roll-color: ${hover}; }`);
    }
    rules.push(`.top :is(.menu a, .top-soon, .wordmark) { --tune-colour-time: ${v.colourTime}ms; --tune-colour-ease: ${easeOf(v.colourEase)}; transition: color ${v.colourTime}ms ${easeOf(v.colourEase)}, opacity var(--tune-dim-time, 300ms) ease; }`);
    if (changed('blockSide'))
        rules.push(`.top { --bar-side: ${v.blockSide}em; }`);
    if (changed('blockTrim'))
        rules.push(`.top { --bar-trim: ${v.blockTrim}px; }`);
    return rules.join('\n');
}
// --------------------------------------------------------------------- state
const STORE = 'cv-hover-tuner';
const ON = 'cv-tune';
/** What the head of each page reads before the first paint (components/layout.ts). */
const CSS_STORE = 'cv-tune-css';
function read(key) {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : null;
    }
    catch {
        return null;
    }
}
function write(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    catch { /* private window */ }
}
function forget(...keys) {
    try {
        for (const k of keys)
            localStorage.removeItem(k);
    }
    catch { /* private window */ }
}
const valuesOf = (fields) => Object.fromEntries(fields.map((f) => [f.key, f.value]));
// ---------------------------------------------------------------------- boot
export function initHoverTuner() {
    const asked = new URLSearchParams(location.search).get('tune');
    if (asked === 'off' || asked === '0') {
        forget(ON, CSS_STORE);
        document.getElementById('tune-early')?.remove();
        delete document.documentElement.dataset.tune;
        return;
    }
    if (asked !== null)
        write(ON, '1');
    let on = false;
    try {
        on = localStorage.getItem(ON) === '1';
    }
    catch {
        on = asked !== null;
    }
    if (!on)
        return;
    const roots = [...document.querySelectorAll('.top [data-roll]')];
    if (!roots.length)
        return;
    // Exactly what the page arrived with, to put back.
    // On the opening page the current name may be drawn twice, in two spans of
    // its own (client/current.ts); each of those then takes the letters.
    const original = roots.map((root) => {
        const faces = [...root.querySelectorAll('.top-face, .top-echo')];
        const word = root.querySelector('.roll-text')?.textContent ?? root.textContent ?? '';
        return { root, html: root.innerHTML, word: faces.length ? (faces[0]?.querySelector('.roll-text')?.textContent ?? faces[0]?.textContent ?? word) : word, targets: faces.length ? faces : [root] };
    });
    // The lettering's defaults are read off the page as the stylesheet draws it,
    // so the copy the head laid down first is taken away before they are read.
    // The live copy goes in within the same task, before anything is painted.
    document.getElementById('tune-early')?.remove();
    const menuFields = MENU_FIELDS();
    const menuDefaults = valuesOf(menuFields);
    const saved = read(STORE);
    const state = {
        effect: saved?.effect && EFFECTS.some((e) => e.id === saved.effect) ? saved.effect : (document.documentElement.dataset.hover === 'roll' ? 'roll' : 'scramble'),
        effects: Object.fromEntries(EFFECTS.map((e) => [e.id, { ...valuesOf(e.fields), ...(saved?.effects?.[e.id] ?? {}) }])),
        menu: { ...menuDefaults, ...(saved?.menu ?? {}) },
        open: saved?.open ?? true,
        pin: false,
    };
    const siteHover = document.documentElement.dataset.hover ?? 'scramble';
    document.documentElement.dataset.tune = '';
    const style = document.createElement('style');
    style.id = 'tune-live';
    document.head.append(style);
    let undo = [];
    let active = false;
    const effect = () => EFFECTS.find((e) => e.id === state.effect) ?? EFFECTS[0];
    const apply = () => {
        const fx = effect();
        const v = state.effects[fx.id] ?? {};
        // Desktop only, and ahead of the stylesheet's own rules by one attribute.
        const css = `@media (min-width: 900px) {\n${scope(`${menuCss(state.menu, menuDefaults)}\n${fx.css(v)}`)}\n}`;
        style.textContent = css;
        write(CSS_STORE, css);
        write(STORE, { ...state, pin: false });
        document.documentElement.dataset.hover = `tune-${fx.id}`;
    };
    const mount = () => {
        for (const fn of undo)
            fn();
        undo = [];
        const fx = effect();
        const v = state.effects[fx.id] ?? {};
        for (const { root, word, targets } of original) {
            for (const target of targets)
                fx.mount(target, word, v);
            root.classList.toggle('is-hot', state.pin);
            if (fx.wire)
                undo.push(fx.wire(root, v));
        }
        active = true;
        // The bar's figures (client/current.ts) are read off its words.
        window.dispatchEvent(new Event('resize'));
    };
    const restore = () => {
        for (const fn of undo)
            fn();
        undo = [];
        for (const { root, html } of original) {
            root.innerHTML = html;
            root.classList.remove('is-hot');
        }
        active = false;
    };
    if (!phone.matches)
        apply();
    const panel = buildPanel(state, menuFields, menuDefaults, {
        effectChanged: () => { apply(); mount(); },
        settingChanged: (structural) => { apply(); if (structural)
            mount();
        else
            window.dispatchEvent(new Event('resize')); },
        play: () => {
            roots.forEach((root, i) => {
                window.setTimeout(() => {
                    root.classList.add('is-hot');
                    root.dispatchEvent(new Event('tuner:play'));
                    window.setTimeout(() => { if (!state.pin)
                        root.classList.remove('is-hot'); }, 900);
                }, i * 120);
            });
        },
        pin: (on) => { state.pin = on; for (const root of roots)
            root.classList.toggle('is-hot', on); },
        off: () => {
            forget(ON, CSS_STORE);
            document.getElementById('tune-early')?.remove();
            restore();
            style.remove();
            delete document.documentElement.dataset.tune;
            document.documentElement.dataset.hover = siteHover;
            panel.remove();
        },
        save: () => write(STORE, { ...state, pin: false }),
    });
    const fit = () => {
        if (phone.matches) {
            if (active)
                restore();
            panel.hidden = true;
        }
        else {
            panel.hidden = false;
            apply();
            if (!active)
                mount();
        }
    };
    phone.addEventListener('change', fit);
    document.body.append(panel);
    fit();
}
/** Settings that change the letters themselves, so the words are written again. */
const STRUCTURAL = new Set(['glyphs', 'step', 'radius', 'edge', 'mode', 'settle', 'repeat', 'erase', 'pause', 'type', 'caret', 'hold']);
function buildPanel(state, menuFields, menuDefaults, hooks) {
    const panel = el('aside', 'tuner');
    panel.setAttribute('aria-label', 'Hover tuner');
    panel.classList.toggle('is-closed', !state.open);
    const head = el('div', 'tuner-head');
    const title = el('strong', '', 'Menu hover tuner');
    const fold = button(state.open ? 'Hide' : 'Show', () => {
        state.open = !state.open;
        panel.classList.toggle('is-closed', !state.open);
        fold.textContent = state.open ? 'Hide' : 'Show';
        hooks.save();
    });
    const off = button('Off', hooks.off);
    off.title = 'Turn the tuner off and put the site back. ?tune brings it back.';
    head.append(title, fold, off);
    const body = el('div', 'tuner-body');
    // Effect picker
    const picker = el('div', 'tuner-effects');
    const note = el('p', 'tuner-note');
    const effectFields = el('div', 'tuner-fields');
    const drawEffect = () => {
        const fx = EFFECTS.find((e) => e.id === state.effect) ?? EFFECTS[0];
        for (const b of picker.querySelectorAll('button'))
            b.setAttribute('aria-pressed', String(b.dataset.id === fx.id));
        note.textContent = fx.note;
        const v = state.effects[fx.id];
        effectFields.replaceChildren(...fx.fields.map((f) => row(f, v, valuesOf(fx.fields), (key) => hooks.settingChanged(STRUCTURAL.has(key)))));
        effectFields.append(button('Reset this effect', () => {
            state.effects[fx.id] = valuesOf(fx.fields);
            drawEffect();
            hooks.effectChanged();
        }, 'tuner-small'));
    };
    for (const fx of EFFECTS) {
        const b = button(fx.name, () => { state.effect = fx.id; drawEffect(); hooks.effectChanged(); });
        b.dataset.id = fx.id;
        picker.append(b);
    }
    const try_ = el('div', 'tuner-row tuner-try');
    const pin = document.createElement('input');
    pin.type = 'checkbox';
    pin.addEventListener('change', () => hooks.pin(pin.checked));
    const pinLabel = el('label', '');
    pinLabel.append(pin, ' Hold hover on all');
    try_.append(button('Play on all', hooks.play), pinLabel);
    // Lettering
    const menuBox = el('div', 'tuner-fields');
    const drawMenu = () => {
        menuBox.replaceChildren(...menuFields.map((f) => row(f, state.menu, menuDefaults, () => hooks.settingChanged(true))));
        menuBox.append(button('Reset lettering', () => {
            Object.assign(state.menu, menuDefaults);
            drawMenu();
            hooks.settingChanged(true);
        }, 'tuner-small'));
    };
    // Copy
    const out = el('div', 'tuner-row tuner-out');
    const copied = el('span', 'tuner-copied');
    out.append(button('Copy settings', () => {
        const fx = EFFECTS.find((e) => e.id === state.effect);
        const changedMenu = Object.fromEntries(Object.entries(state.menu).filter(([k, val]) => val !== menuDefaults[k]));
        const payload = JSON.stringify({ hover: fx.id, settings: state.effects[fx.id], lettering: changedMenu }, null, 2);
        const done = () => { copied.textContent = 'Copied. Paste it to Claude to make it permanent.'; };
        navigator.clipboard?.writeText(payload).then(done, () => { window.prompt('Copy these settings:', payload); });
    }), copied);
    body.append(section('Effect', picker, note, try_, effectFields), section('Menu lettering', menuBox), out);
    panel.append(head, body);
    drawEffect();
    drawMenu();
    return panel;
}
export function section(name, ...children) {
    const s = el('section', 'tuner-section');
    s.append(el('h3', '', name), ...children);
    return s;
}
export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
}
export function button(label, onClick, className = '') {
    const b = document.createElement('button');
    b.type = 'button';
    if (className)
        b.className = className;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
}
/** One setting: label, control, and its value. Double-click the label to reset it. */
export function row(field, values, defaults, changed) {
    const wrap = el('label', 'tuner-row');
    const name = el('span', 'tuner-label', field.label);
    name.title = 'Double-click to reset';
    const shown = el('output', 'tuner-value');
    let input;
    const current = values[field.key] ?? field.value;
    const commit = (value) => { values[field.key] = value; show(); changed(field.key); };
    const show = () => {
        const v = values[field.key];
        shown.textContent = field.kind === 'num' ? `${v}${field.unit ? ` ${field.unit}` : ''}` : field.kind === 'colour' ? String(v) : '';
    };
    switch (field.kind) {
        case 'num': {
            const i = document.createElement('input');
            i.type = 'range';
            i.min = String(field.min);
            i.max = String(field.max);
            i.step = String(field.step);
            i.value = String(current);
            i.addEventListener('input', () => commit(Number(i.value)));
            input = i;
            break;
        }
        case 'pick': {
            const s = document.createElement('select');
            for (const o of field.options)
                s.append(new Option(o, o));
            s.value = String(current);
            s.addEventListener('change', () => commit(s.value));
            input = s;
            break;
        }
        case 'text': {
            const i = document.createElement('input');
            i.type = 'text';
            i.value = String(current);
            i.addEventListener('input', () => commit(i.value));
            input = i;
            break;
        }
        case 'flag': {
            const i = document.createElement('input');
            i.type = 'checkbox';
            i.checked = Boolean(current);
            i.addEventListener('change', () => commit(i.checked));
            input = i;
            break;
        }
        case 'colour': {
            const i = document.createElement('input');
            i.type = 'color';
            i.value = String(current);
            i.addEventListener('input', () => commit(i.value));
            input = i;
            break;
        }
    }
    name.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const d = defaults[field.key] ?? field.value;
        if (input instanceof HTMLInputElement && input.type === 'checkbox')
            input.checked = Boolean(d);
        else
            input.value = String(d);
        commit(d);
    });
    wrap.append(name, input, shown);
    show();
    return wrap;
}
