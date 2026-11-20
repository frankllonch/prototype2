import { finePointer, reduceMotion } from './env.js';
/**
 * The site's pointer: a ball, the negative of whatever is under it, that grows
 * a little over anything that can be clicked. How it looks and moves is set by
 * the --ball-* variables at the head of styles/11-ball.css; ?ball opens a panel
 * to try them live (client/ball-tuner.ts).
 *
 * Mouse only. Touch screens never see it and keep their own behaviour, and a
 * page whose script never runs keeps the ordinary arrow, since the arrow is
 * only taken away by the class set here.
 */
/** Anything that answers a click. Rules in the stylesheet that give an
 *  element a pointing hand are added to this when the page starts. */
const CLICKABLE = [
    'a[href]', 'button:not([disabled])', '[role="button"]', '[role="link"]', '[role="tab"]',
    'label[for]', 'select', 'summary', 'input[type="checkbox"]', 'input[type="radio"]',
    'input[type="submit"]', 'input[type="button"]', 'input[type="range"]', 'input[type="color"]',
    '[onclick]', '[data-clickable]', '.tile',
];
/** Selectors the stylesheets give a clicking cursor (pointer, zoom, grab). */
function pointerRules() {
    const found = [];
    const walk = (rules) => {
        for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule) {
                if (/^(pointer|zoom-in|zoom-out|grab|grabbing)$/.test(rule.style.cursor))
                    found.push(rule.selectorText);
            }
            if ('cssRules' in rule && rule.cssRules)
                walk(rule.cssRules);
        }
    };
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            walk(sheet.cssRules);
        }
        catch { /* another origin's sheet */ }
    }
    // Only the ones the browser can still match on their own.
    return found.filter((s) => { try {
        document.querySelector(s);
        return true;
    }
    catch {
        return false;
    } });
}
export function initBall() {
    if (!finePointer.matches)
        return;
    const root = document.documentElement;
    const ball = document.createElement('div');
    ball.className = 'ball';
    ball.setAttribute('aria-hidden', 'true');
    ball.innerHTML = '<span class="ball-dot"></span>';
    document.body.append(ball);
    root.classList.add('has-ball');
    const clickable = [...CLICKABLE, ...pointerRules()].join(', ');
    /** --ball-follow, read again whenever the tuner changes it. */
    let follow = 0.4;
    const read = () => {
        const v = parseFloat(getComputedStyle(root).getPropertyValue('--ball-follow'));
        follow = Number.isFinite(v) ? Math.min(Math.max(v, 0.01), 1) : 0.4;
    };
    read();
    document.addEventListener('ballchange', read);
    let targetX = 0, targetY = 0, x = 0, y = 0;
    let placed = false, frame = 0, tickedAt = 0;
    const draw = () => { ball.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; };
    const tick = (time) => {
        // A share of the way per 120th of a second, applied by elapsed time so
        // the trail feels the same at 60fps (Safari) as at 120.
        const elapsed = tickedAt ? Math.min(time - tickedAt, 100) : 1000 / 120;
        tickedAt = time;
        const ease = reduceMotion.matches || follow >= 1 ? 1 : 1 - Math.pow(1 - follow, elapsed / (1000 / 120));
        x += (targetX - x) * ease;
        y += (targetY - y) * ease;
        draw();
        const moving = Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1;
        frame = moving ? requestAnimationFrame(tick) : 0;
        if (!frame)
            tickedAt = 0;
    };
    const hover = (target) => {
        let over = false;
        try {
            over = !!target?.closest(clickable);
        }
        catch { /* never */ }
        ball.classList.toggle('is-hover', over);
    };
    document.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') {
            ball.classList.remove('is-on');
            return;
        }
        targetX = event.clientX;
        targetY = event.clientY;
        // Start where the pointer is, or it swoops in from the corner.
        if (!placed) {
            placed = true;
            x = targetX;
            y = targetY;
            draw();
        }
        ball.classList.add('is-on');
        hover(event.target);
        if (!frame)
            frame = requestAnimationFrame(tick);
    }, { passive: true });
    // The page can move under a still pointer: look again, once a frame at most.
    let looking = 0;
    const relook = () => {
        if (!placed || looking)
            return;
        looking = requestAnimationFrame(() => {
            looking = 0;
            hover(document.elementFromPoint(targetX, targetY));
        });
    };
    window.addEventListener('scroll', relook, { passive: true, capture: true });
    document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse')
        ball.classList.add('is-down'); });
    document.addEventListener('pointerup', () => ball.classList.remove('is-down'));
    // Gone with the pointer when it leaves the window, back when it returns.
    document.documentElement.addEventListener('mouseleave', () => ball.classList.remove('is-on', 'is-down'));
    window.addEventListener('blur', () => ball.classList.remove('is-down'));
    window.addEventListener('pagehide', () => ball.classList.remove('is-on', 'is-down', 'is-hover'));
    // A mouse unplugged, or a tablet's trackpad taken away: the arrow comes back.
    finePointer.addEventListener('change', () => {
        root.classList.toggle('has-ball', finePointer.matches);
        if (!finePointer.matches)
            ball.classList.remove('is-on');
    });
}
