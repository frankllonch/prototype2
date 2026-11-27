import { reduceMotion } from './env.ts';

/** The ball's click: a drop of oil in water, pushed out of round and pulled back by its own skin. */

const SVG = 'http://www.w3.org/2000/svg';
const POINTS = 64;
/** The drawing's room around the ball, in ball radii. */
const REACH = 3;
const MAX_LOBES = 8;

/** One way the outline can bend: `k` bumps round the rim (0 = the whole drop swelling). */
type Mode = { k: number; a: number; b: number; va: number; vb: number; ta: number; tb: number };

export type Oil = {
  /** A push outward, as a share of the full click. */
  kick(share?: number): void;
  /** The ball's speed in px/ms over the last `ms`, so the drop can trail behind itself. */
  drag(vx: number, vy: number, ms: number): void;
};

const COS: number[][] = [];
const SIN: number[][] = [];
for (let k = 0; k <= MAX_LOBES + 1; k++) {
  COS.push(Array.from({ length: POINTS }, (_, i) => Math.cos((k * i * 2 * Math.PI) / POINTS)));
  SIN.push(Array.from({ length: POINTS }, (_, i) => Math.sin((k * i * 2 * Math.PI) / POINTS)));
}

export function initOil(ball: HTMLElement, dot: HTMLElement): Oil {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'ball-blob');
  svg.setAttribute('viewBox', `${-REACH} ${-REACH} ${REACH * 2} ${REACH * 2}`);
  const ring = document.createElementNS(SVG, 'circle');
  const path = document.createElementNS(SVG, 'path');
  svg.append(ring, path);
  dot.append(svg);

  const mode = (k: number): Mode => ({ k, a: 0, b: 0, va: 0, vb: 0, ta: 0, tb: 0 });
  const long = mode(2);
  const modes: Mode[] = [mode(0), long, ...Array.from({ length: MAX_LOBES - 1 }, (_, i) => mode(i + 3))];

  const s = {
    on: true, expand: 0.35, wobble: 0.25, lobes: 4, bounce: 420, settle: 1100, tension: 0.6,
    release: 0.4, swirl: 0, stretch: 0, speed: 1, ring: 0, ringSize: 2.4, ringTime: 600, ringWidth: 0.12,
    stretchMax: 0.5, moveSize: 0, moveWobble: 0,
  };
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    const n = (name: string, fallback: number, min: number, max: number) => {
      const v = parseFloat(style.getPropertyValue(name));
      return Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
    };
    s.on = n('--ball-oil', 1, 0, 1) > 0;
    s.expand = n('--ball-oil-expand', s.expand, -1, 2);
    s.wobble = n('--ball-oil-wobble', s.wobble, 0, 2);
    s.lobes = Math.round(n('--ball-oil-lobes', s.lobes, 1, MAX_LOBES));
    s.bounce = n('--ball-oil-bounce', s.bounce, 60, 4000);
    s.settle = n('--ball-oil-settle', s.settle, 60, 10000);
    s.tension = n('--ball-oil-tension', s.tension, 0, 2);
    s.release = n('--ball-oil-release', s.release, -2, 2);
    s.swirl = n('--ball-oil-swirl', s.swirl, -720, 720);
    s.stretch = n('--ball-oil-stretch', s.stretch, 0, 3);
    s.speed = n('--ball-oil-speed', s.speed, 0.05, 4);
    s.stretchMax = n('--ball-move-stretch-max', s.stretchMax, 0, 0.9);
    s.moveSize = n('--ball-move-size', s.moveSize, -1, 2);
    s.moveWobble = n('--ball-move-wobble', s.moveWobble, 0, 2);
    s.ring = n('--ball-oil-ring', s.ring, 0, 1);
    s.ringSize = n('--ball-oil-ring-size', s.ringSize, 1, REACH - 0.1);
    s.ringTime = n('--ball-oil-ring-time', s.ringTime, 50, 5000);
    s.ringWidth = n('--ball-oil-ring-width', s.ringWidth, 0.01, 1);
  };
  read();
  document.addEventListener('ballchange', read);

  /** Radians per ms and decay per ms for a mode: small ripples are quicker and die sooner. */
  const rates = (k: number): [number, number] => {
    const scale = Math.pow(Math.max(k, 2) / 2, s.tension);
    return [Math.min(((2 * Math.PI) / s.bounce) * scale, 1), Math.min((4 / s.settle) * scale, 1)];
  };

  let frame = 0, at = 0, turn = 0, rippled = -1, shaken = 0;

  const draw = () => {
    let d = '';
    for (let i = 0; i < POINTS; i++) {
      let r = 1;
      for (const m of modes) r += m.a * (COS[m.k]?.[i] ?? 0) + m.b * (SIN[m.k]?.[i] ?? 0);
      r = Math.min(Math.max(r, 0.15), REACH - 0.1);
      const angle = (i * 2 * Math.PI) / POINTS + turn;
      d += `${i ? 'L' : 'M'}${(r * Math.cos(angle)).toFixed(3)} ${(r * Math.sin(angle)).toFixed(3)}`;
    }
    path.setAttribute('d', `${d}Z`);
    if (rippled >= 0) {
      const p = Math.min(rippled / s.ringTime, 1);
      const out = 1 - Math.pow(1 - p, 3);
      ring.setAttribute('r', (1 + (s.ringSize - 1) * out).toFixed(3));
      ring.setAttribute('stroke-width', (s.ringWidth * (1 - p)).toFixed(3));
      ring.setAttribute('opacity', (s.ring * (1 - p)).toFixed(3));
    } else ring.setAttribute('opacity', '0');
  };

  const step = (ms: number) => {
    let quickest = 0;
    for (const m of modes) quickest = Math.max(quickest, rates(m.k)[0]);
    const count = Math.min(Math.max(Math.ceil(ms * quickest * 2.5), 1), 60);
    const dt = ms / count;
    for (const m of modes) {
      const [w, c] = rates(m.k);
      for (let i = 0; i < count; i++) {
        m.va += (-w * w * (m.a - m.ta) - 2 * c * m.va) * dt;
        m.vb += (-w * w * (m.b - m.tb) - 2 * c * m.vb) * dt;
        m.a += m.va * dt;
        m.b += m.vb * dt;
      }
    }
  };

  /** How far from round and at rest it still is. */
  const energy = () => {
    let e = 0;
    for (const m of modes) {
      const w = rates(m.k)[0];
      e += Math.abs(m.a) + Math.abs(m.b) + Math.abs(m.ta) + Math.abs(m.tb) + (Math.abs(m.va) + Math.abs(m.vb)) / w;
    }
    return e;
  };

  const rest = () => {
    for (const m of modes) m.a = m.b = m.va = m.vb = m.ta = m.tb = 0;
    rippled = -1;
    frame = 0;
    at = 0;
    ball.classList.remove('is-oil');
  };

  const tick = (time: number) => {
    const ms = (at ? Math.min(time - at, 50) : 1000 / 60) * s.speed;
    at = time;
    step(ms);
    turn += (s.swirl * Math.PI / 180) * (ms / 1000);
    if (rippled >= 0) { rippled += ms; if (rippled >= s.ringTime) rippled = -1; }
    if (!s.on || (energy() < 0.004 && rippled < 0)) { rest(); return; }
    draw();
    frame = requestAnimationFrame(tick);
  };

  const wake = () => {
    if (frame) return;
    draw();
    ball.classList.add('is-oil');
    frame = requestAnimationFrame(tick);
  };

  return {
    kick(share = 1) {
      if (!s.on || reduceMotion.matches || !share) return;
      for (const m of modes) {
        const w = rates(m.k)[0];
        if (m.k === 0) { m.va += s.expand * share * w; continue; }
        if (m.k > s.lobes + 1) continue;
        const push = s.wobble * Math.abs(share) * (2 / m.k) * w;
        const phase = Math.random() * 2 * Math.PI;
        m.va += push * Math.cos(phase);
        m.vb += push * Math.sin(phase);
      }
      if (s.ring > 0 && share > 0) rippled = 0;
      wake();
    },
    drag(vx, vy, ms) {
      const swell = modes[0];
      const quick = s.on && !reduceMotion.matches ? Math.hypot(vx, vy) * 0.15 : 0;
      const pull = Math.min(s.stretch * quick, s.stretchMax);
      const size = Math.min(Math.max(s.moveSize * Math.min(quick, 1), -0.8), 1.5);
      const shake = s.moveWobble * Math.min(quick, 1);
      if (swell) swell.ta = Math.abs(size) < 0.004 ? 0 : size;
      if (pull < 0.004) long.ta = long.tb = 0;
      else {
        // The drawing is turned by `turn`, so the pull is aimed in its own frame.
        const along = 2 * (Math.atan2(vy, vx) - turn);
        long.ta = pull * Math.cos(along);
        long.tb = pull * Math.sin(along);
      }
      shaken += ms;
      if (shake > 0.004 && shaken > 90) {
        shaken = 0;
        for (const m of modes) {
          if (m.k < 2 || m.k > s.lobes + 1) continue;
          const push = shake * 0.5 * (2 / m.k) * rates(m.k)[0];
          const phase = Math.random() * 2 * Math.PI;
          m.va += push * Math.cos(phase);
          m.vb += push * Math.sin(phase);
        }
      }
      if (pull >= 0.004 || Math.abs(size) >= 0.004 || shake > 0.004) wake();
    },
  };
}
