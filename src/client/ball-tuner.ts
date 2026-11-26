import { finePointer } from './env.ts';

/**
 * The ball tuner: a panel for trying the pointer live — its size, how much it
 * grows over a link, how it trails the mouse, its colour and blend, and the
 * oil-drop wobble of its click.
 */

const ON = 'cv-ball-on';
const STORE = 'cv-ball';

type Field = { group?: string } & (
  | { kind: 'num'; v: string; label: string; min: number; max: number; step: number; unit: string; def: number }
  | { kind: 'pick'; v: string; label: string; options: [string, string][]; def: string }
  | { kind: 'colour'; v: string; label: string; def: string }
  | { kind: 'flag'; v: string; label: string; def: boolean });

const EASES: [string, string][] = [
  ['var(--ease)', 'Site (soft out)'],
  ['cubic-bezier(0.34, 1.56, 0.64, 1)', 'Spring'],
  ['ease-out', 'Ease out'],
  ['ease-in-out', 'Ease in-out'],
  ['linear', 'Linear'],
];

const FIELDS: Field[] = [
  { group: 'Ball', kind: 'num', v: '--ball-size', label: 'Size', min: 2, max: 80, step: 1, unit: 'px', def: 14 },
  { kind: 'num', v: '--ball-hover-size', label: 'Size over a link', min: 2, max: 160, step: 1, unit: 'px', def: 30 },
  { kind: 'num', v: '--ball-press', label: 'Size while pressed', min: 0.2, max: 4, step: 0.05, unit: '×', def: 0.8 },
  { kind: 'num', v: '--ball-press-time', label: 'Press time', min: 0, max: 1, step: 0.01, unit: 's', def: 0.15 },
  { kind: 'num', v: '--ball-follow', label: 'Follow (1 = glued)', min: 0.02, max: 1, step: 0.01, unit: '', def: 0.4 },
  { kind: 'num', v: '--ball-grow', label: 'Grow time', min: 0, max: 1.5, step: 0.01, unit: 's', def: 0.35 },
  { kind: 'pick', v: '--ball-grow-ease', label: 'Grow curve', options: EASES, def: 'var(--ease)' },
  { group: 'Look', kind: 'colour', v: '--ball-color', label: 'Colour', def: '#ffffff' },
  { kind: 'pick', v: '--ball-blend', label: 'Blend', options: [
    ['difference', 'Negative (difference)'], ['exclusion', 'Soft negative (exclusion)'], ['normal', 'Plain, no blend'],
  ], def: 'difference' },
  { kind: 'num', v: '--ball-opacity', label: 'Opacity', min: 0.1, max: 1, step: 0.05, unit: '', def: 1 },
  { kind: 'flag', v: '--ball-over-names', label: 'Keep over painting names', def: false },
  { group: 'Click: oil in water', kind: 'flag', v: '--ball-oil', label: 'Wobble on click', def: true },
  { kind: 'num', v: '--ball-oil-expand', label: 'Swell (strength)', min: -0.8, max: 1.5, step: 0.01, unit: '×', def: 0.35 },
  { kind: 'num', v: '--ball-oil-wobble', label: 'Wobble (out of round)', min: 0, max: 1.2, step: 0.01, unit: '×', def: 0.25 },
  { kind: 'num', v: '--ball-oil-lobes', label: 'Bumps', min: 1, max: 8, step: 1, unit: '', def: 4 },
  { kind: 'num', v: '--ball-oil-bounce', label: 'Spring (one swing)', min: 80, max: 2000, step: 10, unit: 'ms', def: 420 },
  { kind: 'num', v: '--ball-oil-settle', label: 'Settles in (damping)', min: 100, max: 6000, step: 50, unit: 'ms', def: 1100 },
  { kind: 'num', v: '--ball-oil-tension', label: 'Surface tension', min: 0, max: 1.5, step: 0.05, unit: '', def: 0.6 },
  { kind: 'num', v: '--ball-oil-release', label: 'Second push on release', min: -1, max: 1.5, step: 0.05, unit: '×', def: 0.4 },
  { kind: 'num', v: '--ball-oil-speed', label: 'Speed of it all', min: 0.1, max: 3, step: 0.05, unit: '×', def: 1 },
  { kind: 'num', v: '--ball-oil-swirl', label: 'Swirl', min: -360, max: 360, step: 5, unit: '°/s', def: 0 },
  { kind: 'num', v: '--ball-oil-stretch', label: 'Stretch when moved fast', min: 0, max: 3, step: 0.05, unit: '', def: 0 },
  { group: 'Click: ripple ring', kind: 'num', v: '--ball-oil-ring', label: 'Ring opacity (0 = none)', min: 0, max: 1, step: 0.05, unit: '', def: 0 },
  { kind: 'num', v: '--ball-oil-ring-size', label: 'Ring reach', min: 1.1, max: 2.9, step: 0.05, unit: '×', def: 2.4 },
  { kind: 'num', v: '--ball-oil-ring-time', label: 'Ring time', min: 100, max: 3000, step: 50, unit: 'ms', def: 600 },
  { kind: 'num', v: '--ball-oil-ring-width', label: 'Ring line', min: 0.02, max: 0.6, step: 0.01, unit: '', def: 0.12 },
];

type Values = Record<string, string | number | boolean>;

const css = (f: Field, value: Values[string] | undefined): string =>
  f.kind === 'num' ? `${value}${f.unit === 'px' || f.unit === 's' ? f.unit : ''}`
    : f.kind === 'flag' ? (value ? '1' : '0')
    : String(value);

/**
 * What the stylesheet says now (styles/11-ball.css), so Reset goes back to the
 * site's own settings even after they have been changed there.
 */
function fromSheet(): Values {
  const style = getComputedStyle(document.documentElement);
  const ease = style.getPropertyValue('--ease').trim();
  const out: Values = {};
  for (const f of FIELDS) {
    const raw = style.getPropertyValue(f.v).trim();
    if (!raw) { out[f.v] = f.def; continue; }
    if (f.kind === 'num') { const n = parseFloat(raw); out[f.v] = Number.isFinite(n) ? n : f.def; }
    else if (f.kind === 'flag') out[f.v] = parseFloat(raw) > 0;
    else if (f.kind === 'pick') {
      const value = raw === ease ? 'var(--ease)' : raw;
      if (!f.options.some(([v]) => v === value)) f.options.push([value, value]);
      out[f.v] = value;
    } else out[f.v] = /^#[0-9a-f]{6}$/i.test(raw) ? raw : f.def;
  }
  return out;
}
let sheet: Values = {};
const defaults = (): Values => ({ ...sheet });

export function initBallTuner(): void {
  const asked = new URLSearchParams(location.search).get('ball');
  try {
    if (asked === 'off') localStorage.removeItem(ON);
    else if (asked !== null) localStorage.setItem(ON, '1');
  } catch { /* private window */ }
  let on = asked !== null && asked !== 'off';
  try { on = localStorage.getItem(ON) === '1'; } catch { /* keep the URL's word */ }
  if (!on || !finePointer.matches || !document.querySelector('.ball')) return;

  sheet = fromSheet();
  let values: Values = defaults();
  let open = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? '{}') as { values?: Values; open?: boolean };
    values = { ...values, ...saved.values };
    open = saved.open ?? true;
  } catch { /* defaults */ }

  const root = document.documentElement;
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ values, open })); } catch { /* private */ } };
  const apply = () => {
    for (const f of FIELDS) root.style.setProperty(f.v, css(f, values[f.v]));
    document.dispatchEvent(new Event('ballchange'));
  };

  const panel = document.createElement('div');
  panel.className = 'tuner tuner-ball';
  panel.classList.toggle('is-closed', !open);
  panel.innerHTML = `
    <div class="tuner-head"><strong>Cursor</strong>
      <button type="button" data-act="fold">${open ? 'Hide' : 'Show'}</button>
      <button type="button" data-act="off">Off</button></div>
    <div class="tuner-body">
      <p class="tuner-note">Move over links and buttons to see it grow; click anywhere to see the oil drop, or let it replay while you move the sliders.</p>
      <div class="tuner-section" data-fields></div>
      <div class="tuner-out">
        <button type="button" data-act="copy">Copy settings</button>
        <button type="button" data-act="reset">Reset</button>
        <button type="button" data-act="replay" aria-pressed="false">Replay click</button>
        <span class="tuner-copied" hidden>Copied</span>
      </div>
      <p class="tuner-note tuner-small">Paste the copied lines over :root at the top of src/styles/11-ball.css, or send them to Claude.</p>
    </div>`;
  const list = panel.querySelector<HTMLElement>('[data-fields]')!;

  const draw = () => {
    list.replaceChildren();
    for (const f of FIELDS) {
      if (f.group) {
        const head = document.createElement('h3');
        head.textContent = f.group;
        list.append(head);
      }
      const row = document.createElement('label');
      row.className = 'tuner-row';
      const name = document.createElement('span');
      name.className = 'tuner-label';
      name.textContent = f.label;
      const out = document.createElement('span');
      out.className = 'tuner-value';
      let input: HTMLInputElement | HTMLSelectElement;
      if (f.kind === 'pick') {
        input = document.createElement('select');
        for (const [value, text] of f.options) input.add(new Option(text, value));
        input.value = String(values[f.v]);
        input.addEventListener('change', () => { values[f.v] = input.value; apply(); save(); });
      } else {
        input = document.createElement('input');
        if (f.kind === 'num') {
          Object.assign(input, { type: 'range', min: String(f.min), max: String(f.max), step: String(f.step) });
          input.value = String(values[f.v]);
          out.textContent = `${values[f.v]}${f.unit}`;
          input.addEventListener('input', () => {
            values[f.v] = Number(input.value);
            out.textContent = `${input.value}${f.unit}`;
            apply(); save();
          });
        } else if (f.kind === 'colour') {
          input.type = 'color';
          input.value = String(values[f.v]);
          out.textContent = String(values[f.v]);
          input.addEventListener('input', () => { values[f.v] = input.value; out.textContent = input.value; apply(); save(); });
        } else {
          input.type = 'checkbox';
          (input as HTMLInputElement).checked = !!values[f.v];
          input.addEventListener('change', () => { values[f.v] = (input as HTMLInputElement).checked; apply(); save(); });
        }
      }
      row.append(name, input, out);
      list.append(row);
    }
  };

  const copied = panel.querySelector<HTMLElement>('.tuner-copied')!;
  let replay = 0;
  panel.addEventListener('click', (event) => {
    const act = (event.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'fold') {
      open = !open;
      panel.classList.toggle('is-closed', !open);
      (event.target as HTMLElement).textContent = open ? 'Hide' : 'Show';
      save();
    } else if (act === 'off') {
      try { localStorage.removeItem(ON); localStorage.removeItem(STORE); } catch { /* private */ }
      for (const f of FIELDS) root.style.removeProperty(f.v);
      document.dispatchEvent(new Event('ballchange'));
      clearInterval(replay);
      panel.remove();
    } else if (act === 'reset') {
      values = defaults();
      apply(); save(); draw();
    } else if (act === 'replay') {
      const button = (event.target as HTMLElement).closest('button')!;
      clearInterval(replay);
      replay = replay ? 0 : window.setInterval(() => document.dispatchEvent(new Event('ballkick')), 1400);
      button.setAttribute('aria-pressed', String(!!replay));
    } else if (act === 'copy') {
      const text = `:root {\n${FIELDS.map((f) => `  ${f.v}: ${css(f, values[f.v])};`).join('\n')}\n}`;
      void navigator.clipboard?.writeText(text).then(() => {
        copied.hidden = false;
        setTimeout(() => { copied.hidden = true; }, 1600);
      });
    }
  });

  draw();
  apply();
  document.body.append(panel);
}
