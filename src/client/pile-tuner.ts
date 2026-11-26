import { phone, reduceMotion } from './env.ts';
import { button, el, flag, num, pick, row, section, type Field } from './hover-tuner.ts';
import { ON, SITE, STORE, gridCss, pile, scrollSpan, type Values } from './pile.ts';

/**
 * The pile tuner: a panel for trying the gallery's opening live — where the
 * paintings start, how far apart, and how they travel into the grid.
 */

type Effect = { id: string; name: string; note: string; fields: Field[]; spread: readonly string[] };

const d = (id: string, key: string) => SITE.effects[id]![key] as never;
const REST = ['behind', 'invisible'] as const;

const EFFECTS: Effect[] = [
  {
    id: 'pile',
    name: 'Pile',
    note: 'The site’s opening: one heap in the middle, the front dozen fanned. Spread pushes the fanned ones apart.',
    spread: ['spreadX', 'spreadY', 'count'],
    fields: [
      num('spreadX', 'Spread across', d('pile', 'spreadX'), 0, 12, 0.1, '×'),
      num('spreadY', 'Spread up and down', d('pile', 'spreadY'), 0, 12, 0.1, '×'),
      num('count', 'Paintings fanned out', d('pile', 'count'), 1, 120, 1),
      num('size', 'Front painting height', d('pile', 'size'), 0.05, 0.95, 0.01, 'vh'),
      num('depth', 'Shrink per painting', d('pile', 'depth'), 0, 0.04, 0.001, 'vh'),
      num('rot', 'Random turn', d('pile', 'rot'), 0, 45, 1, '°'),
      flag('turnFront', 'Turn the front one too', d('pile', 'turnFront')),
      pick('rest', 'The rest', d('pile', 'rest'), REST),
    ],
  },
  {
    id: 'scatter',
    name: 'Scatter',
    note: 'Thrown across the window. Above 1 the spread reaches past its edges.',
    spread: ['spreadX', 'spreadY', 'hole', 'count'],
    fields: [
      num('spreadX', 'Spread across', d('scatter', 'spreadX'), 0, 4, 0.05, '×'),
      num('spreadY', 'Spread up and down', d('scatter', 'spreadY'), 0, 4, 0.05, '×'),
      num('hole', 'Keep the middle clear', d('scatter', 'hole'), 0, 0.9, 0.01),
      num('count', 'Paintings scattered', d('scatter', 'count'), 1, 181, 1),
      pick('shape', 'Shape', d('scatter', 'shape'), ['box', 'ellipse', 'cloud']),
      num('size', 'Height', d('scatter', 'size'), 0.03, 0.8, 0.01, 'vh'),
      num('jitter', 'Size variety', d('scatter', 'jitter'), 0, 0.9, 0.01),
      num('rot', 'Random turn', d('scatter', 'rot'), 0, 45, 1, '°'),
      pick('rest', 'The rest', d('scatter', 'rest'), REST),
    ],
  },
  {
    id: 'spiral',
    name: 'Spiral',
    note: 'A sunflower: each painting a golden turn from the last, a step further out.',
    spread: ['gap', 'stretch', 'count'],
    fields: [
      num('gap', 'Distance between', d('spiral', 'gap'), 0.005, 0.3, 0.005, 'vh'),
      num('stretch', 'Wider than tall', d('spiral', 'stretch'), 0.3, 3, 0.05, '×'),
      num('count', 'Paintings in the spiral', d('spiral', 'count'), 1, 181, 1),
      num('twist', 'Turn between', d('spiral', 'twist'), 1, 360, 0.5, '°'),
      num('size', 'Height', d('spiral', 'size'), 0.03, 0.8, 0.01, 'vh'),
      num('shrink', 'Smaller outwards', d('spiral', 'shrink'), 0, 0.95, 0.01),
      num('rot', 'Random turn', d('spiral', 'rot'), 0, 45, 1, '°'),
      flag('align', 'Turn with the spiral', d('spiral', 'align')),
      pick('rest', 'The rest', d('spiral', 'rest'), REST),
    ],
  },
  {
    id: 'ring',
    name: 'Rings',
    note: 'Rings around an empty middle.',
    spread: ['radiusX', 'radiusY', 'ringGap'],
    fields: [
      num('radiusX', 'Radius across', d('ring', 'radiusX'), 0, 1.5, 0.01, '×'),
      num('radiusY', 'Radius up and down', d('ring', 'radiusY'), 0, 1.5, 0.01, '×'),
      num('ringGap', 'Space between rings', d('ring', 'ringGap'), 0, 2, 0.01),
      num('rings', 'Rings', d('ring', 'rings'), 1, 6, 1),
      num('count', 'Paintings on the rings', d('ring', 'count'), 1, 181, 1),
      num('spin', 'Start angle', d('ring', 'spin'), -180, 180, 1, '°'),
      num('size', 'Height', d('ring', 'size'), 0.03, 0.8, 0.01, 'vh'),
      num('ringShrink', 'Each ring smaller by', d('ring', 'ringShrink'), 0.3, 1.5, 0.01, '×'),
      num('rot', 'Random turn', d('ring', 'rot'), 0, 45, 1, '°'),
      flag('tangent', 'Turn along the ring', d('ring', 'tangent')),
      pick('rest', 'The rest', d('ring', 'rest'), REST),
    ],
  },
  {
    id: 'deck',
    name: 'Deck',
    note: 'A hand of cards, fanned in a curve across the window.',
    spread: ['spread', 'arc', 'count'],
    fields: [
      num('spread', 'Spread across', d('deck', 'spread'), 0, 3, 0.01, '×'),
      num('arc', 'Curve', d('deck', 'arc'), -0.6, 0.6, 0.01, 'vh'),
      num('count', 'Cards in the hand', d('deck', 'count'), 1, 181, 1),
      num('lift', 'Up or down', d('deck', 'lift'), -0.5, 0.5, 0.01, 'vh'),
      num('tilt', 'Tilt at the ends', d('deck', 'tilt'), -60, 60, 1, '°'),
      num('size', 'Height', d('deck', 'size'), 0.03, 0.8, 0.01, 'vh'),
      pick('order', 'Front card', d('deck', 'order'), ['from the middle', 'left to right']),
      pick('rest', 'The rest', d('deck', 'rest'), REST),
    ],
  },
  {
    id: 'miniature',
    name: 'Miniature',
    note: 'The grid itself, shrunk into the window, opening out to full size. Spread pulls the paintings apart without making them bigger.',
    spread: ['spread', 'zoom'],
    fields: [
      num('spread', 'Spread', d('miniature', 'spread'), 0.2, 6, 0.05, '×'),
      num('zoom', 'Size of the miniature', d('miniature', 'zoom'), 0.03, 1, 0.01, '×'),
      num('top', 'Its top above the middle', d('miniature', 'top'), -0.5, 1, 0.01, 'vh'),
      num('rot', 'Random turn', d('miniature', 'rot'), 0, 45, 1, '°'),
    ],
  },
  {
    id: 'burst',
    name: 'Burst',
    note: 'Each painting comes in from outside, along the line to its place in the grid.',
    spread: ['distance', 'pull'],
    fields: [
      num('distance', 'How far out', d('burst', 'distance'), 0, 3, 0.01, '×'),
      num('pull', 'Grid kept in shape', d('burst', 'pull'), 0, 1.5, 0.01, '×'),
      num('jitter', 'Unevenness', d('burst', 'jitter'), 0, 1, 0.01),
      num('scale', 'Starting size', d('burst', 'scale'), 0.05, 3, 0.01, '×'),
      num('opacity', 'Starting opacity', d('burst', 'opacity'), 0, 1, 0.01),
      num('rot', 'Random turn', d('burst', 'rot'), 0, 90, 1, '°'),
    ],
  },
];

const m = SITE.motion;
const MOTION: Field[] = [
  num('span', 'Scroll it takes', m.span as number, 0.3, 4, 0.05, '\u00d7 screen'),
  num('follow', 'Follow the wheel', m.follow as number, 0.01, 1, 0.01),
  pick('curve', 'Easing', m.curve as string, ['in-out', 'out', 'in', 'linear', 'back out', 'expo out', 'sine in-out']),
  num('power', 'Easing strength', m.power as number, 1, 6, 0.1),
  num('overshoot', 'Overshoot (back out)', m.overshoot as number, 0, 4, 0.05),
  num('stagger', 'Stagger', m.stagger as number, 0, 0.9, 0.01),
  pick('order', 'Stagger order', m.order as string, ['pile order', 'back of pile first', 'centre first', 'edges first', 'top rows first', 'bottom rows first', 'random']),
  num('fade', 'Starting opacity', m.fade as number, 0, 1, 0.01),
  num('cx', 'Centre across', m.cx as number, 0, 1, 0.01, '×'),
  num('cy', 'Centre down', m.cy as number, 0, 1, 0.01, '×'),
  num('seed', 'Shuffle (seed)', m.seed as number, 1, 99, 1),
];

const g = SITE.grid;
const GRID: Field[] = [
  num('gapX', 'Gap between paintings', g.gapX as number, 0, 12, 0.1, 'vw'),
  num('gapY', 'Gap between rows', g.gapY as number, 0, 12, 0.1, 'vw'),
  num('start', 'Grid starts at', g.start as number, 20, 200, 1, 'vh'),
];

const valuesOf = (fields: Field[]): Values => Object.fromEntries(fields.map((f) => [f.key, f.value]));
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); } catch { /* private window */ } };
const forget = (...keys: string[]) => { try { for (const k of keys) localStorage.removeItem(k); } catch { /* private window */ } };
const changed = (v: Values, defaults: Values) => Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== defaults[k]));

export function initPileTuner(): void {
  const asked = new URLSearchParams(location.search).get('pile');
  if (asked === 'off' || asked === '0') { forget(ON); return; }
  if (asked !== null) write(ON, '1');
  let on = false;
  try { on = localStorage.getItem(ON) === '1'; } catch { on = asked !== null; }
  if (!on) return;
  // Only where there is a pile, and only where it runs.
  if (!document.querySelector('[data-stack]') || !document.querySelector('[data-hero]') || reduceMotion.matches) return;

  let open = true;
  try { open = (JSON.parse(localStorage.getItem(STORE) ?? '{}') as { open?: boolean }).open ?? true; } catch { /* default */ }

  const save = () => write(STORE, { effect: pile.effect, effects: pile.effects, motion: pile.motion, grid: pile.grid, open });
  const style = document.getElementById('pile-live') ?? Object.assign(document.createElement('style'), { id: 'pile-live' });
  document.head.append(style);
  const tell = () => document.dispatchEvent(new Event('piletune'));
  const apply = (gridChanged = false) => {
    if (gridChanged) {
      style.textContent = gridCss(pile);
      // The grid's new shape has to be laid out before it is measured.
      requestAnimationFrame(tell);
    } else {
      /*
       * Changed while the grid is at rest, the change would be invisible: the
       * opening has already happened.
       */
      if (pile.freeze === null && window.scrollY >= window.innerHeight * scrollSpan() - 2) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
      tell();
    }
    save();
  };

  // ------------------------------------------------------------------ panel
  const panel = el('aside', 'tuner tuner-pile');
  panel.setAttribute('aria-label', 'Gallery opening tuner');
  panel.classList.toggle('is-closed', !open);
  const head = el('div', 'tuner-head');
  const fold = button(open ? 'Hide' : 'Show', () => {
    open = !open;
    panel.classList.toggle('is-closed', !open);
    fold.textContent = open ? 'Hide' : 'Show';
    save();
  });
  const off = button('Off', () => {
    forget(ON);
    pile.freeze = null;
    Object.assign(pile, JSON.parse(JSON.stringify({ effect: SITE.effect, effects: SITE.effects, motion: SITE.motion, grid: SITE.grid })));
    style.textContent = '';
    panel.remove();
    requestAnimationFrame(tell);
  });
  off.title = 'Turn the tuner off and put the site’s opening back. ?pile brings it back.';
  head.append(el('strong', '', 'Gallery opening tuner'), fold, off);

  // Scrub: hold the opening at any point instead of scrolling it.
  const hold = document.createElement('input');
  hold.type = 'checkbox';
  const at = document.createElement('input');
  at.type = 'range'; at.min = '0'; at.max = '1'; at.step = '0.005'; at.value = '0';
  const atShown = el('output', 'tuner-value', '0%');
  const setFreeze = () => {
    pile.freeze = hold.checked ? Number(at.value) : null;
    atShown.textContent = `${Math.round(Number(at.value) * 100)}%`;
    tell();
  };
  hold.addEventListener('change', setFreeze);
  // Scrolling is how the opening is played, so it always lets go of a hold.
  window.addEventListener('wheel', () => { if (hold.checked) { hold.checked = false; setFreeze(); } }, { passive: true });
  at.addEventListener('input', () => { hold.checked = true; setFreeze(); });
  const holdLabel = el('label', '');
  holdLabel.append(hold, ' Hold');
  const scrubRow = el('label', 'tuner-row');
  scrubRow.append(el('span', 'tuner-label', 'Unfolded'), at, atShown);
  const tryRow = el('div', 'tuner-row tuner-try');
  tryRow.append(
    button('Show the start', () => { at.value = '0'; hold.checked = true; setFreeze(); }),
    button('Replay', () => {
      hold.checked = false; setFreeze();
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      window.setTimeout(() => window.scrollTo({ top: window.innerHeight * scrollSpan() + 2, behavior: 'smooth' }), 700);
    }),
    holdLabel,
  );

  // Effect
  const picker = el('div', 'tuner-effects');
  const note = el('p', 'tuner-note');
  const fieldsBox = el('div', 'tuner-fields');
  const drawEffect = () => {
    const fx = EFFECTS.find((e) => e.id === pile.effect) ?? EFFECTS[0]!;
    for (const b of picker.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.id === fx.id));
    note.textContent = fx.note;
    const v = pile.effects[fx.id]!;
    const defaults = valuesOf(fx.fields);
    const rows = fx.fields.map((f) => {
      const r = row(f, v, defaults, () => apply());
      if (fx.spread.includes(f.key)) r.classList.add('is-big');
      return r;
    });
    const spread = el('div', 'tuner-spread');
    spread.append(el('span', 'tuner-kicker', 'Spread'), ...rows.filter((r) => r.classList.contains('is-big')));
    fieldsBox.replaceChildren(spread, ...rows.filter((r) => !r.classList.contains('is-big')));
    fieldsBox.append(button('Reset this opening', () => {
      Object.assign(pile.effects[fx.id]!, SITE.effects[fx.id]);
      drawEffect();
      apply();
    }, 'tuner-small'));
  };
  for (const fx of EFFECTS) {
    const b = button(fx.name, () => { pile.effect = fx.id; drawEffect(); apply(); });
    b.dataset.id = fx.id;
    picker.append(b);
  }

  const motionBox = el('div', 'tuner-fields');
  const drawMotion = () => {
    const defaults = valuesOf(MOTION);
    motionBox.replaceChildren(...MOTION.map((f) => row(f, pile.motion, defaults, (key) => apply(key === 'span'))));
    motionBox.append(button('Reset motion', () => { Object.assign(pile.motion, SITE.motion); drawMotion(); apply(true); }, 'tuner-small'));
  };
  const gridBox = el('div', 'tuner-fields');
  const drawGrid = () => {
    const defaults = valuesOf(GRID);
    gridBox.replaceChildren(...GRID.map((f) => row(f, pile.grid, defaults, () => apply(true))));
    gridBox.append(button('Reset grid', () => { Object.assign(pile.grid, SITE.grid); drawGrid(); apply(true); }, 'tuner-small'));
  };

  const out = el('div', 'tuner-row tuner-out');
  const copied = el('span', 'tuner-copied');
  out.append(button('Copy settings', () => {
    const payload = JSON.stringify({
      opening: pile.effect,
      settings: pile.effects[pile.effect],
      motion: changed(pile.motion, SITE.motion),
      grid: changed(pile.grid, SITE.grid),
    }, null, 2);
    const done = () => { copied.textContent = 'Copied. Paste it to Claude to make it permanent.'; };
    navigator.clipboard?.writeText(payload).then(done, () => { window.prompt('Copy these settings:', payload); });
  }), copied);

  /*
   * Three tabs rather than one long column: each fits on the screen, so the
   * panel never has to scroll, and the buttons never slide out of sight.
   */
  const panes: Record<string, HTMLElement> = {
    Opening: section('Opening', picker, note, fieldsBox),
    Motion: section('Motion', motionBox),
    Grid: section('Grid at rest', gridBox),
  };
  const tabs = el('div', 'tuner-tabs');
  const show = (name: string) => {
    for (const [k, pane] of Object.entries(panes)) pane.hidden = k !== name;
    for (const b of tabs.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.textContent === name));
    try { sessionStorage.setItem('cv-pile-tab', name); } catch { /* private window */ }
  };
  for (const name of Object.keys(panes)) tabs.append(button(name, () => show(name)));
  let first = 'Opening';
  try { first = sessionStorage.getItem('cv-pile-tab') ?? first; } catch { /* default */ }

  const body = el('div', 'tuner-body');
  const pane = el('div', 'tuner-pane');
  pane.append(...Object.values(panes));
  body.append(section('Try it', scrubRow, tryRow), tabs, pane, out);
  panel.append(head, body);
  show(first in panes ? first : 'Opening');

  /*
   * The wheel over the panel scrolls the page, exactly as if the panel were not
   * there — the opening is scroll-driven, and the panel sits over a third of the
   * window.
   */
  panel.addEventListener('wheel', (e) => {
    if ((e.target as Element).closest?.('select')) return;
    // A pane too tall for a short window scrolls its own knobs while it can; the tabs and buttons
    // above it stay where they are.
    const list = (e.target as Element).closest?.<HTMLElement>('.tuner-fields');
    const down = e.deltaY > 0;
    const room = list && (down ? list.scrollHeight - list.clientHeight - list.scrollTop > 1 : list.scrollTop > 0);
    if (room) return;
    e.preventDefault();
    window.scrollBy({ top: e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, left: 0, behavior: 'instant' as ScrollBehavior });
  }, { passive: false });
  drawEffect();
  drawMotion();
  drawGrid();
  document.body.append(panel);

  const fit = () => { panel.hidden = phone.matches; };
  phone.addEventListener('change', fit);
  fit();
  if (style.textContent) requestAnimationFrame(tell);
}
