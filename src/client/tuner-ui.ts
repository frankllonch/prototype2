/** Form controls shared by the development tuners. */

export type Num = { kind: 'num'; key: string; label: string; min: number; max: number; step: number; unit?: string; value: number };
export type Pick = { kind: 'pick'; key: string; label: string; options: readonly string[]; value: string };
export type Text = { kind: 'text'; key: string; label: string; value: string };
export type Flag = { kind: 'flag'; key: string; label: string; value: boolean };
export type Colour = { kind: 'colour'; key: string; label: string; value: string };
export type Field = Num | Pick | Text | Flag | Colour;
type Values = Record<string, number | string | boolean>;

export const num = (key: string, label: string, value: number, min: number, max: number, step: number, unit = ''): Num =>
  ({ kind: 'num', key, label, value, min, max, step, unit });
export const pick = (key: string, label: string, value: string, options: readonly string[]): Pick =>
  ({ kind: 'pick', key, label, value, options });
export const flag = (key: string, label: string, value: boolean): Flag => ({ kind: 'flag', key, label, value });

export function section(name: string, ...children: Node[]): HTMLElement {
  const s = el('section', 'tuner-section');
  s.append(el('h3', '', name), ...children);
  return s;
}

export function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  if (className) b.className = className;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/** One setting: label, control, and its value. Double-click the label to reset it. */
export function row(field: Field, values: Values, defaults: Values, changed: (key: string) => void): HTMLElement {
  const wrap = el('label', 'tuner-row');
  const name = el('span', 'tuner-label', field.label);
  name.title = 'Double-click to reset';
  const shown = el('output', 'tuner-value');
  let input: HTMLInputElement | HTMLSelectElement;
  const current = values[field.key] ?? field.value;
  const commit = (value: number | string | boolean) => { values[field.key] = value; show(); changed(field.key); };
  const show = () => {
    const v = values[field.key];
    shown.textContent = field.kind === 'num' ? `${v}${field.unit ? ` ${field.unit}` : ''}` : field.kind === 'colour' ? String(v) : '';
  };

  switch (field.kind) {
    case 'num': {
      const i = document.createElement('input');
      i.type = 'range';
      i.min = String(field.min); i.max = String(field.max); i.step = String(field.step);
      i.value = String(current);
      i.addEventListener('input', () => commit(Number(i.value)));
      input = i;
      break;
    }
    case 'pick': {
      const s = document.createElement('select');
      for (const o of field.options) s.append(new Option(o, o));
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
    if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = Boolean(d);
    else input.value = String(d);
    commit(d);
  });

  wrap.append(name, input, shown);
  show();
  return wrap;
}
