import { initOil } from './ball-oil.ts';
import { finePointer, piling, reduceMotion, targetElement } from './env.ts';

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

  let targetX = 0, targetY = 0, x = 0, y = 0, vx = 0, vy = 0;
  let placed = false, frame = 0, tickedAt = 0;

  /** The dots that trail behind, each chasing the one before it. */
  let ghosts: { el: HTMLElement; x: number; y: number; scale: number }[] = [];

  /** The --ball-* motion settings, read again whenever the tuner changes them. */
  const m = { follow: 0.4, spring: false, swing: 450, bounce: 0.5, trail: 0, trailFollow: 0.35, trailShrink: 0.6, trailFade: 0 };
  const read = () => {
    const style = getComputedStyle(root);
    const n = (name: string, fallback: number, min: number, max: number) => {
      const v = parseFloat(style.getPropertyValue(name));
      return Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
    };
    m.follow = n('--ball-follow', 0.4, 0.01, 1);
    m.spring = n('--ball-spring', 0, 0, 1) > 0;
    m.swing = n('--ball-spring-swing', 450, 60, 4000);
    m.bounce = n('--ball-spring-bounce', 0.5, 0, 0.98);
    m.trail = reduceMotion.matches ? 0 : Math.round(n('--ball-trail', 0, 0, 12));
    m.trailFollow = n('--ball-trail-follow', 0.35, 0.01, 1);
    m.trailShrink = n('--ball-trail-shrink', 0.6, 0, 1);
    m.trailFade = n('--ball-trail-fade', 0, 0, 1);
    while (ghosts.length > m.trail) ghosts.pop()!.el.remove();
    while (ghosts.length < m.trail) {
      const el = document.createElement('span');
      el.className = 'ball-ghost';
      ball.prepend(el);
      ghosts.push({ el, x, y, scale: 1 });
    }
    ghosts.forEach((g, i) => {
      const along = (i + 1) / ghosts.length;
      g.scale = Math.max(1 - m.trailShrink * along, 0.04);
      g.el.style.opacity = String(Math.max(1 - m.trailFade * along, 0.04));
    });
    trail();
  };
  const trail = () => {
    for (const g of ghosts) {
      g.el.style.transform = `translate(${(g.x - x).toFixed(1)}px, ${(g.y - y).toFixed(1)}px) translate(-50%, -50%) scale(${g.scale.toFixed(3)})`;
    }
  };
  read();
  document.addEventListener('ballchange', read);

  const draw = webkit
    ? () => { ball.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; }
    : () => { ball.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; };

  const tick = (time: number) => {
    // A share of the way per 120th of a second, applied by elapsed time so the trail feels the
    // same at 60fps (Safari) as at 120.
    const elapsed = tickedAt ? Math.min(time - tickedAt, 100) : 1000 / 120;
    tickedAt = time;
    const share = (rate: number) => rate >= 1 ? 1 : 1 - Math.pow(1 - rate, elapsed / (1000 / 120));
    const fromX = x, fromY = y;
    if (m.spring && !reduceMotion.matches) {
      // Pulled to the pointer on a spring, so it can overshoot and swing back.
      const pull = (2 * Math.PI) / m.swing, drag = 2 * (1 - m.bounce) * pull;
      const steps = Math.min(Math.max(Math.ceil(elapsed * pull * 2.5), 1), 40), dt = elapsed / steps;
      for (let i = 0; i < steps; i++) {
        vx += (pull * pull * (targetX - x) - drag * vx) * dt;
        vy += (pull * pull * (targetY - y) - drag * vy) * dt;
        x += vx * dt;
        y += vy * dt;
      }
    } else {
      const ease = reduceMotion.matches ? 1 : share(m.follow);
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      vx = vy = 0;
    }
    draw();
    let trailing = false, leadX = x, leadY = y;
    for (const g of ghosts) {
      const ease = share(m.trailFollow);
      g.x += (leadX - g.x) * ease;
      g.y += (leadY - g.y) * ease;
      leadX = g.x;
      leadY = g.y;
      if (Math.abs(g.x - x) > 0.1 || Math.abs(g.y - y) > 0.1) trailing = true;
    }
    trail();
    const arriving = Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1 || Math.hypot(vx, vy) > 0.004;
    if (arriving) oil.drag((x - fromX) / elapsed, (y - fromY) / elapsed, elapsed); else oil.drag(0, 0, elapsed);
    const moving = arriving || trailing;
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
    if (!placed) {
      placed = true;
      x = targetX;
      y = targetY;
      for (const g of ghosts) { g.x = x; g.y = y; }
      draw();
      trail();
    }
    ball.classList.add('is-on');
    hover(targetElement(event));
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });

  // The page can move under a still pointer: look again, once a frame at most.
  let looking = 0;
  const relook = () => {
    if (!placed || looking || piling()) return;
    looking = requestAnimationFrame(() => {
      looking = 0;
      hover(document.elementFromPoint(targetX, targetY));
    });
  };
  window.addEventListener('scroll', relook, { passive: true, capture: true });
  document.addEventListener('stacksettle', relook);

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
