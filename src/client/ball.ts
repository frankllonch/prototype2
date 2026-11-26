import { initOil } from './ball-oil.ts';
import { finePointer, reduceMotion, targetElement } from './env.ts';

/**
 * The site's pointer: a ball, the negative of whatever is under it, that grows a
 * little over anything that can be clicked.
 */

/** Anything that answers a click. */
const CLICKABLE = [
  'a[href]', 'button:not([disabled])', '[role="button"]', '[role="link"]', '[role="tab"]',
  'label[for]', 'select', 'summary', 'input[type="checkbox"]', 'input[type="radio"]',
  'input[type="submit"]', 'input[type="button"]', 'input[type="range"]', 'input[type="color"]',
  '[onclick]', '[data-clickable]', '.tile',
];

/** Selectors the stylesheets give a clicking cursor (pointer, zoom, grab). */
function pointerRules(): string[] {
  const found: string[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        if (/^(pointer|zoom-in|zoom-out|grab|grabbing)$/.test(rule.style.cursor)) found.push(rule.selectorText);
      }
      if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { walk(sheet.cssRules); } catch { /* another origin's sheet */ }
  }
  // Only the ones the browser can still match on their own.
  return found.filter((s) => { try { document.querySelector(s); return true; } catch { return false; } });
}

/* Safari. */
const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent);

export function initBall(): void {
  if (!finePointer.matches) return;
  const root = document.documentElement;

  const ball = document.createElement('div');
  ball.className = 'ball';
  ball.setAttribute('aria-hidden', 'true');
  ball.innerHTML = '<span class="ball-dot"></span>';
  if (webkit) ball.classList.add('is-flat');
  document.body.append(ball);
  root.classList.add('has-ball');
  const oil = initOil(ball, ball.querySelector<HTMLElement>('.ball-dot')!);

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

  const draw = webkit
    ? () => { ball.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; }
    : () => { ball.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; };

  const tick = (time: number) => {
    // A share of the way per 120th of a second, applied by elapsed time so the trail feels the
    // same at 60fps (Safari) as at 120.
    const elapsed = tickedAt ? Math.min(time - tickedAt, 100) : 1000 / 120;
    tickedAt = time;
    const ease = reduceMotion.matches || follow >= 1 ? 1 : 1 - Math.pow(1 - follow, elapsed / (1000 / 120));
    const dx = (targetX - x) * ease, dy = (targetY - y) * ease;
    x += dx;
    y += dy;
    draw();
    const moving = Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1;
    if (moving) oil.drag(dx / elapsed, dy / elapsed); else oil.drag(0, 0);
    frame = moving ? requestAnimationFrame(tick) : 0;
    if (!frame) tickedAt = 0;
  };

  const hover = (target: Element | null) => {
    let over = false;
    try { over = !!target?.closest(clickable); } catch { /* never */ }
    ball.classList.toggle('is-hover', over);
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') { ball.classList.remove('is-on'); return; }
    targetX = event.clientX;
    targetY = event.clientY;
    // Start where the pointer is, or it swoops in from the corner.
    if (!placed) { placed = true; x = targetX; y = targetY; draw(); }
    ball.classList.add('is-on');
    hover(targetElement(event));
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });

  // The page can move under a still pointer: look again, once a frame at most.
  let looking = 0;
  const relook = () => {
    if (!placed || looking) return;
    looking = requestAnimationFrame(() => {
      looking = 0;
      hover(document.elementFromPoint(targetX, targetY));
    });
  };
  window.addEventListener('scroll', relook, { passive: true, capture: true });

  /** --ball-oil-release: the second, smaller push as the button comes up. */
  const release = () => parseFloat(getComputedStyle(root).getPropertyValue('--ball-oil-release')) || 0;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    ball.classList.add('is-down');
    oil.kick();
  });
  document.addEventListener('pointerup', () => {
    if (ball.classList.contains('is-down')) oil.kick(release());
    ball.classList.remove('is-down');
  });
  document.addEventListener('ballkick', () => oil.kick());
  // Gone with the pointer when it leaves the window, back when it returns.
  document.documentElement.addEventListener('mouseleave', () => ball.classList.remove('is-on', 'is-down'));
  window.addEventListener('blur', () => ball.classList.remove('is-down'));
  window.addEventListener('pagehide', () => ball.classList.remove('is-on', 'is-down', 'is-hover'));

  // A mouse unplugged, or a tablet's trackpad taken away: the arrow comes back.
  finePointer.addEventListener('change', () => {
    root.classList.toggle('has-ball', finePointer.matches);
    if (!finePointer.matches) ball.classList.remove('is-on');
  });
}
