import { finePointer, phone } from './env.ts';
import { nextHue } from './hues.ts';
import { scramble } from './scramble.ts';

/**
 * The menu tuner: a panel on a local server for trying hovers on the bar's words live,
 * each with its own settings, and copying the chosen one out to be made permanent.
 */

const OFF = 'cv-menu-off';
const STORE = 'cv-menu';

type Field =
  | { kind: 'num'; key: string; label: string; min: number; max: number; step: number; unit: string; def: number }
  | { kind: 'pick'; key: string; label: string; options: [string, string][]; def: string }
  | { kind: 'text'; key: string; label: string; def: string }
  | { kind: 'colour'; key: string; label: string; def: string }
  | { kind: 'flag'; key: string; label: string; def: boolean };
type Values = Record<string, string | number | boolean>;

const num = (key: string, label: string, def: number, min: number, max: number, step: number, unit = ''): Field =>
  ({ kind: 'num', key, label, def, min, max, step, unit });
const pick = (key: string, label: string, def: string, options: [string, string][]): Field =>
  ({ kind: 'pick', key, label, def, options });
const flag = (key: string, label: string, def: boolean): Field => ({ kind: 'flag', key, label, def });
const text = (key: string, label: string, def: string): Field => ({ kind: 'text', key, label, def });
const colour = (key: string, label: string, def: string): Field => ({ kind: 'colour', key, label, def });

const EASES: [string, string][] = [
  ['cubic-bezier(0.22, 1, 0.36, 1)', 'Site (soft out)'],
  ['cubic-bezier(0.34, 1.56, 0.64, 1)', 'Back out (overshoots)'],
  ['cubic-bezier(0.7, 0, 0.2, 1)', 'Snappy'],
  ['ease-in-out', 'Ease in-out'],
  ['ease-out', 'Ease out'],
  ['linear', 'Linear'],
];
const ease = (def = 'cubic-bezier(0.22, 1, 0.36, 1)') => pick('ease', 'Curve', def, EASES);

/** Where a colour comes from: the What's Color list, one colour, or the bar's own ink. */
const paint = (def = 'palette'): Field[] => [
  pick('paint', 'Colour', def, [['palette', 'What’s Color list, new each hover'], ['fixed', 'One colour'], ['ink', 'The bar’s ink']]),
  colour('fixed', 'That one colour', '#3a3f9e'),
];

/** `T` is every word the hover is on, `H` the same word while it is hovered. */
type Effect = { id: string; name: string; note: string; fields: Field[]; css: (v: Values, T: string, H: string) => string };

const ms = (v: Values, key: string) => `${v[key]}ms`;
const em = (v: Values, key: string) => `${v[key]}em`;

const EFFECTS: Effect[] = [
  {
    id: 'scramble',
    name: 'Scramble',
    note: 'The site’s hover now: the letters under the pointer churn.',
    fields: [
      text('glyphs', 'Characters (one = a mask)', '*'),
      num('step', 'Hold each for', 100, 20, 400, 5, 'ms'),
      num('radius', 'Reach either side', 55, 5, 400, 1, 'px'),
      num('edge', 'Soft edge', 1, 0, 1, 0.05),
    ],
    css: () => '',
  },
  {
    id: 'roll',
    name: 'Roll',
    note: 'Each letter turns over like a split-flap board, one after another.',
    fields: [
      num('time', 'Turn time', 810, 50, 1600, 10, 'ms'),
      num('fade', 'Fade time', 220, 0, 1500, 10, 'ms'),
      num('stagger', 'Delay per letter', 85, 0, 200, 5, 'ms'),
      ease('cubic-bezier(0.34, 1.56, 0.64, 1)'),
      pick('dir', 'Direction', 'up', [['up', 'Up'], ['down', 'Down']]),
      flag('rewind', 'Rewinds on leaving (last letter first)', true),
    ],
    css: (v, T, H) => {
      const d = v.dir === 'down' ? -1 : 1;
      const back = v.rewind ? `max(0ms, calc((var(--n, 1) - 1 - var(--i)) * ${ms(v, 'stagger')}))` : `calc(var(--i) * ${ms(v, 'stagger')})`;
      return `${T} .scram { position: relative; color: transparent; vertical-align: top; padding-bottom: 0.18em; margin-bottom: -0.18em; }
${T} .scram::before, ${T} .scram::after { content: attr(data-ch); position: absolute; left: 0; top: 0; width: 100%; text-align: center; color: var(--roll-color, currentColor);
  transition: transform ${ms(v, 'time')} ${v.ease}, opacity ${ms(v, 'fade')} ${v.ease}; transition-delay: ${back}; }
${T} .scram::after { transform: translateY(${d * 100}%); opacity: 0; }
${H} .scram::before { transform: translateY(${-d * 100}%); opacity: 0; }
${H} .scram::after { transform: none; opacity: 1; }
${H} .scram::before, ${H} .scram::after { transition-delay: calc(var(--i) * ${ms(v, 'stagger')}); }`;
    },
  },
  {
    id: 'sweep',
    name: 'Highlight sweep',
    note: 'A block of colour slides in under the word, like a marker.',
    fields: [
      ...paint(),
      num('time', 'Sweep time', 450, 50, 1500, 10, 'ms'),
      ease(),
      pick('leave', 'On leaving', 'through', [['through', 'Carries on out the far side'], ['back', 'Goes back the way it came']]),
      pick('from', 'Comes from', 'left', [['left', 'Left'], ['right', 'Right'], ['bottom', 'Below (rises)']]),
      num('height', 'Height', 1.15, 0.1, 2, 0.05, 'em'),
      num('drop', 'Move down', 0, -0.6, 0.6, 0.01, 'em'),
      num('side', 'Overhang at the sides', 0.18, 0, 1, 0.01, 'em'),
      pick('letters', 'Letters on it', 'paper', [['paper', 'Paper (knocked out)'], ['ink', 'Ink as they are']]),
    ],
    css: (v, T, H) => {
      const axis = v.from === 'bottom' ? 'Y' : 'X';
      const start = v.from === 'bottom' ? 'bottom' : v.from;
      const end = v.from === 'bottom' ? 'top' : v.from === 'left' ? 'right' : 'left';
      const out = v.leave === 'through' ? end : start;
      return `${T} { position: relative; }
${T}::after { content: ''; position: absolute; z-index: -1; pointer-events: none;
  left: -${em(v, 'side')}; right: -${em(v, 'side')}; top: calc(50% - ${Number(v.height) / 2}em + ${em(v, 'drop')}); height: ${em(v, 'height')};
  background: var(--fx-paint, currentColor); transform: scale${axis}(0); transform-origin: ${out};
  transition: transform ${ms(v, 'time')} ${v.ease}; }
${H}::after { transform: none; transform-origin: ${start}; }
${v.letters === 'paper' ? `${H} { color: #000; --roll-color: #000; transition: color ${Number(v.time) / 2}ms linear ${Number(v.time) / 4}ms; }` : ''}`;
    },
  },
  {
    id: 'underline',
    name: 'Underline',
    note: 'A line draws itself under the word.',
    fields: [
      ...paint('ink'),
      num('time', 'Draw time', 400, 50, 1500, 10, 'ms'),
      ease(),
      pick('from', 'Grows from', 'left', [['left', 'Left'], ['center', 'The middle'], ['right', 'Right'], ['pointer', 'Where the pointer came in']]),
      pick('leave', 'On leaving', 'through', [['through', 'Leaves out the far side'], ['back', 'Shrinks back']]),
      num('weight', 'Thickness', 1, 0.5, 8, 0.5, 'px'),
      num('drop', 'Below the baseline', 0.12, -0.3, 0.6, 0.01, 'em'),
    ],
    css: (v, T, H) => {
      const from = v.from === 'pointer' ? 'var(--fx-x, left)' : String(v.from);
      const out = v.leave === 'through' && v.from === 'left' ? 'right' : v.leave === 'through' && v.from === 'right' ? 'left' : from;
      return `${T} { position: relative; }
${T}::after { content: ''; position: absolute; left: 0; right: 0; bottom: calc(-1 * ${em(v, 'drop')}); height: ${v.weight}px; pointer-events: none;
  background: var(--fx-paint, currentColor); transform: scaleX(0); transform-origin: ${out}; transition: transform ${ms(v, 'time')} ${v.ease}; }
${H}::after { transform: none; transform-origin: ${from}; }`;
    },
  },
  {
    id: 'colour',
    name: 'Colour fill',
    note: 'The letters take a colour from the What’s Color list, one after another.',
    fields: [
      ...paint(),
      flag('each', 'A different colour for every letter', false),
      num('time', 'Change time', 300, 0, 1500, 10, 'ms'),
      num('stagger', 'Delay per letter', 30, 0, 200, 5, 'ms'),
      flag('rewind', 'Goes back last letter first', true),
    ],
    css: (v, T, H) => {
      const back = v.rewind ? `max(0ms, calc((var(--n, 1) - 1 - var(--i)) * ${ms(v, 'stagger')}))` : `calc(var(--i) * ${ms(v, 'stagger')})`;
      return `${T} .scram { transition: color ${ms(v, 'time')} linear ${back}; }
${H} .scram { color: var(--fx-cell, var(--fx-paint, currentColor)); transition-delay: calc(var(--i) * ${ms(v, 'stagger')}); }`;
    },
  },
  {
    id: 'shift',
    name: 'Spacing / weight',
    note: 'The word opens out, or gets bolder, letter by letter. Changing width moves its neighbours.',
    fields: [
      num('spacing', 'Extra tracking', 0.06, -0.08, 0.5, 0.005, 'em'),
      num('weight', 'Weight when hovered (0 = as is)', 0, 0, 900, 10),
      num('time', 'Change time', 450, 0, 1500, 10, 'ms'),
      num('stagger', 'Delay per letter', 15, 0, 150, 5, 'ms'),
      ease(),
    ],
    css: (v, T, H) => `${T} .scram { width: auto; overflow: visible;
  transition: letter-spacing ${ms(v, 'time')} ${v.ease}, font-weight ${ms(v, 'time')} ${v.ease}; transition-delay: calc(var(--i) * ${ms(v, 'stagger')}); }
${H} .scram { letter-spacing: calc(0.1em + ${em(v, 'spacing')});${Number(v.weight) > 0 ? ` font-weight: ${v.weight};` : ''} }`,
  },
  {
    id: 'lift',
    name: 'Lift / wave',
    note: 'The letters rise one after another, then settle or stay up.',
    fields: [
      num('lift', 'Rise', 0.25, -0.8, 0.8, 0.01, 'em'),
      num('time', 'Time per letter', 500, 50, 1500, 10, 'ms'),
      num('stagger', 'Delay per letter', 35, 0, 200, 5, 'ms'),
      pick('mode', 'Then', 'wave', [['wave', 'Settles back (a wave)'], ['stay', 'Stays up while hovered']]),
      ease('cubic-bezier(0.34, 1.56, 0.64, 1)'),
    ],
    css: (v, T, H) => v.mode === 'wave'
      ? `@keyframes fx-lift { 50% { transform: translateY(calc(-1 * ${em(v, 'lift')})); } }
${H} .scram { animation: fx-lift ${ms(v, 'time')} ${v.ease} calc(var(--i) * ${ms(v, 'stagger')}) both; }`
      : `${T} .scram { transition: transform ${ms(v, 'time')} ${v.ease}; transition-delay: calc(var(--i) * ${ms(v, 'stagger')} / 2); }
${H} .scram { transform: translateY(calc(-1 * ${em(v, 'lift')})); transition-delay: calc(var(--i) * ${ms(v, 'stagger')}); }`,
  },
  {
    id: 'blur',
    name: 'Blur / fade',
    note: 'The letters blur and fade out and come back sharp, in a run along the word.',
    fields: [
      num('blur', 'Blur', 4, 0, 16, 0.5, 'px'),
      num('fade', 'Fades to', 0.15, 0, 1, 0.05),
      num('time', 'Time per letter', 500, 50, 1500, 10, 'ms'),
      num('stagger', 'Delay per letter', 30, 0, 200, 5, 'ms'),
      pick('mode', 'Then', 'back', [['back', 'Comes back sharp'], ['stay', 'Stays soft while hovered']]),
      ease(),
    ],
    css: (v, T, H) => v.mode === 'back'
      ? `@keyframes fx-blur { 45% { filter: blur(${v.blur}px); opacity: ${v.fade}; } }
${H} .scram { animation: fx-blur ${ms(v, 'time')} ${v.ease} calc(var(--i) * ${ms(v, 'stagger')}) both; }`
      : `${T} .scram { transition: filter ${ms(v, 'time')} ${v.ease}, opacity ${ms(v, 'time')} ${v.ease}; transition-delay: calc(var(--i) * ${ms(v, 'stagger')}); }
${H} .scram { filter: blur(${v.blur}px); opacity: ${v.fade}; }`,
  },
  {
    id: 'none',
    name: 'Colour only',
    note: 'No motion: only the change of shade every word has on hover.',
    fields: [],
    css: () => '',
  },
];

/** What goes on around the hovered word, whatever the hover. */
const AROUND: Field[] = [
  flag('wordmark', 'Claudia Valsells joins in', true),
  flag('soon', 'What’s Color? joins in', true),
  flag('current', 'The page you’re on joins in', true),
  num('dim', 'The other words fade to', 1, 0, 1, 0.05),
  num('soft', 'The other words blur', 0, 0, 8, 0.5, 'px'),
  num('dimTime', 'Fade time', 300, 0, 1500, 10, 'ms'),
];

const defaultsOf = (fields: Field[]): Values => Object.fromEntries(fields.map((f) => [f.key, f.def]));

type State = { fx: string; values: Record<string, Values>; around: Values; open: boolean };

function load(): State {
  const state: State = {
    fx: 'scramble',
    values: Object.fromEntries(EFFECTS.map((e) => [e.id, defaultsOf(e.fields)])),
    around: defaultsOf(AROUND),
    open: true,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? '{}') as Partial<State>;
    if (saved.fx && EFFECTS.some((e) => e.id === saved.fx)) state.fx = saved.fx;
    for (const e of EFFECTS) state.values[e.id] = { ...state.values[e.id], ...saved.values?.[e.id] };
    state.around = { ...state.around, ...saved.around };
    state.open = saved.open ?? true;
  } catch { /* defaults */ }
  return state;
}

const inverse = (hex: string): string => {
  const n = Number.parseInt(hex.replace('#', ''), 16) || 0;
  return `rgb(${255 - ((n >> 16) & 255)}, ${255 - ((n >> 8) & 255)}, ${255 - (n & 255)})`;
};

export function initMenuTuner(): void {
  const asked = new URLSearchParams(location.search).get('menu');
  try {
    if (asked === 'off') localStorage.setItem(OFF, '1');
    else if (asked !== null) localStorage.removeItem(OFF);
    if (localStorage.getItem(OFF) === '1') return;
  } catch { /* private window */ }
  if (!finePointer.matches) return;

  const html = document.documentElement;
  const words = [...document.querySelectorAll<HTMLElement>('.top [data-roll]')];
  if (!words.length) return;
  const state = load();
  const effect = () => EFFECTS.find((e) => e.id === state.fx) ?? EFFECTS[0]!;
  const values = () => state.values[state.fx]!;
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* private */ } };

  const style = document.createElement('style');
  style.id = 'menu-tuner-css';
  document.head.append(style);

  const apply = () => {
    const fx = effect();
    const v = values();
    const a = state.around;
    html.dataset.menuFx = fx.id;
    for (const word of words) {
      const off = (!a.wordmark && word.matches('.wordmark')) || (!a.soon && word.matches('.top-soon'))
        || (!a.current && word.getAttribute('aria-current') === 'page');
      if (off) word.dataset.fxOff = ''; else delete word.dataset.fxOff;
    }
    scramble.on = fx.id === 'scramble';
    if (fx.id === 'scramble') {
      scramble.glyphs = String(v.glyphs || '*');
      scramble.step = Number(v.step);
      scramble.radius = Number(v.radius);
      scramble.edge = Number(v.edge);
    }
    const T = `html[data-menu-fx='${fx.id}'] .top [data-roll]:not([data-fx-off])`;
    const H = `${T}:is(:hover, :focus-visible:not([data-quiet-focus]), .is-hot)`;
    const hot = `[data-roll]:not([data-fx-off]):is(:hover, .is-hot)`;
    const others = Number(a.dim) < 1 || Number(a.soft) > 0
      ? `html[data-menu-fx] .top [data-roll] { transition: opacity ${a.dimTime}ms ease, filter ${a.dimTime}ms ease; }
html[data-menu-fx] .top:has(${hot}) [data-roll]:not(:hover, .is-hot) { opacity: ${a.dim}; filter: blur(${a.soft}px); }`
      : '';
    style.textContent = `${fx.css(v, T, H)}\n${others}`;
  };

  // The colour for each hover is drawn as the pointer arrives, so every visit can bring a new one.
  const arrive = (word: HTMLElement, x: number) => {
    const v = values();
    const box = word.getBoundingClientRect();
    word.style.setProperty('--fx-x', `${Math.round(((x - box.left) / Math.max(1, box.width)) * 100)}%`);
    if (v.paint === 'palette') {
      const n = nextHue();
      if (n >= 0) word.style.setProperty('--fx-paint', `var(--neg-${n})`);
    } else if (v.paint === 'fixed') word.style.setProperty('--fx-paint', inverse(String(v.fixed)));
    else word.style.removeProperty('--fx-paint');
    for (const cell of word.querySelectorAll<HTMLElement>('.scram')) {
      const n = state.fx === 'colour' && v.each ? nextHue() : -1;
      if (n >= 0) cell.style.setProperty('--fx-cell', `var(--neg-${n})`); else cell.style.removeProperty('--fx-cell');
    }
  };
  for (const word of words) word.addEventListener('pointerenter', (e) => arrive(word, e.clientX));

  // Plays the hover on each menu word in turn, without the pointer.
  let preview = 0;
  const play = (list: HTMLElement[], i: number) => {
    for (const w of words) w.classList.remove('is-hot');
    const word = list[i % list.length];
    if (!word) return;
    const box = word.getBoundingClientRect();
    const x = box.left + box.width / 2;
    word.classList.add('is-hot');
    word.dispatchEvent(new PointerEvent('pointerenter', { clientX: x }));
  };
  const stopPreview = () => {
    clearInterval(preview);
    preview = 0;
    for (const w of words) w.classList.remove('is-hot');
  };

  const panel = document.createElement('div');
  panel.className = 'tuner tuner-menu';
  panel.classList.toggle('is-closed', !state.open);
  panel.innerHTML = `
    <div class="tuner-head"><strong>Menu hover</strong>
      <button type="button" data-act="fold">${state.open ? 'Hide' : 'Show'}</button>
      <button type="button" data-act="off">Off</button></div>
    <div class="tuner-body">
      <div class="tuner-fx" data-fx></div>
      <p class="tuner-note" data-note></p>
      <div class="tuner-section" data-fields></div>
      <div class="tuner-section" data-around></div>
      <div class="tuner-out">
        <button type="button" data-act="copy">Copy settings</button>
        <button type="button" data-act="reset">Reset</button>
        <button type="button" data-act="preview" aria-pressed="false">Preview</button>
        <span class="tuner-copied" hidden>Copied</span>
      </div>
      <p class="tuner-note tuner-small">Hover the menu to try it. Send the copied settings to Claude to make the hover permanent. ?menu=off hides this panel, ?menu brings it back.</p>
    </div>`;
  const pills = panel.querySelector<HTMLElement>('[data-fx]')!;
  const note = panel.querySelector<HTMLElement>('[data-note]')!;
  const list = panel.querySelector<HTMLElement>('[data-fields]')!;
  const around = panel.querySelector<HTMLElement>('[data-around]')!;

  const rows = (box: HTMLElement, title: string, fields: Field[], v: Values) => {
    box.replaceChildren();
    const head = document.createElement('h3');
    head.textContent = title;
    box.append(head);
    for (const f of fields) {
      const row = document.createElement('label');
      row.className = 'tuner-row';
      const name = document.createElement('span');
      name.className = 'tuner-label';
      name.textContent = f.label;
      const out = document.createElement('span');
      out.className = 'tuner-value';
      const changed = (value: Values[string], shown = String(value)) => { v[f.key] = value; out.textContent = shown; apply(); save(); };
      let input: HTMLInputElement | HTMLSelectElement;
      if (f.kind === 'pick') {
        input = document.createElement('select');
        for (const [value, label] of f.options) input.add(new Option(label, value));
        input.value = String(v[f.key]);
        input.addEventListener('change', () => changed(input.value, ''));
      } else {
        const field = document.createElement('input');
        input = field;
        if (f.kind === 'num') {
          Object.assign(field, { type: 'range', min: String(f.min), max: String(f.max), step: String(f.step) });
          field.value = String(v[f.key]);
          out.textContent = `${v[f.key]}${f.unit}`;
          field.addEventListener('input', () => changed(Number(field.value), `${field.value}${f.unit}`));
        } else if (f.kind === 'colour') {
          field.type = 'color';
          field.value = String(v[f.key]);
          out.textContent = String(v[f.key]);
          field.addEventListener('input', () => changed(field.value));
        } else if (f.kind === 'text') {
          field.type = 'text';
          field.value = String(v[f.key]);
          field.addEventListener('input', () => changed(field.value, ''));
        } else {
          field.type = 'checkbox';
          field.checked = !!v[f.key];
          field.addEventListener('change', () => changed(field.checked, ''));
        }
      }
      row.append(name, input, out);
      box.append(row);
    }
  };

  const draw = () => {
    pills.replaceChildren();
    for (const fx of EFFECTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.pick = fx.id;
      b.textContent = fx.name;
      b.setAttribute('aria-pressed', String(fx.id === state.fx));
      pills.append(b);
    }
    note.textContent = effect().note;
    if (effect().fields.length) rows(list, effect().name, effect().fields, values());
    else list.replaceChildren();
    rows(around, 'Around it', AROUND, state.around);
  };

  const copied = panel.querySelector<HTMLElement>('.tuner-copied')!;
  panel.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const picked = target.closest<HTMLElement>('[data-pick]')?.dataset.pick;
    if (picked) { state.fx = picked; apply(); save(); draw(); return; }
    const act = target.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'fold') {
      state.open = !state.open;
      panel.classList.toggle('is-closed', !state.open);
      target.textContent = state.open ? 'Hide' : 'Show';
      save();
    } else if (act === 'off') {
      try { localStorage.setItem(OFF, '1'); } catch { /* private */ }
      stopPreview();
      location.reload();
    } else if (act === 'reset') {
      state.values[state.fx] = defaultsOf(effect().fields);
      state.around = defaultsOf(AROUND);
      apply(); save(); draw();
    } else if (act === 'preview') {
      const button = target.closest('button')!;
      if (preview) stopPreview();
      else {
        const menu = words.filter((w) => w.closest('.menu') && !('fxOff' in w.dataset));
        let i = 0;
        play(menu, i);
        preview = window.setInterval(() => play(menu, ++i), 1600);
      }
      button.setAttribute('aria-pressed', String(!!preview));
    } else if (act === 'copy') {
      const payload = { hover: state.fx, settings: values(), around: state.around };
      void navigator.clipboard?.writeText(`Menu hover settings:\n${JSON.stringify(payload, null, 2)}`).then(() => {
        copied.hidden = false;
        setTimeout(() => { copied.hidden = true; }, 1600);
      });
    }
  });

  // Not on a phone's width: the bar there is a different menu with no hover.
  const fit = () => { panel.hidden = phone.matches; if (phone.matches) stopPreview(); };
  phone.addEventListener('change', fit);

  draw();
  apply();
  fit();
  document.body.append(panel);
}
