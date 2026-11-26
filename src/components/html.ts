/** A 40-line templating layer, in place of a framework. */

/** Marks a string as already-escaped markup. */
export type Html = { readonly __html: string };

const ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

const escape = (value: string): string => value.replace(/[&<>"']/g, (c) => ESCAPES[c]!);

/** Wraps a trusted string (e.g. sanitised WordPress rich text) without escaping. */
export const raw = (value: string): Html => ({ __html: value });

const isHtml = (value: unknown): value is Html =>
  typeof value === 'object' && value !== null && '__html' in value;

type Renderable = Html | string | number | false | null | undefined | readonly Renderable[];

function render(value: Renderable): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  if (isHtml(value)) return value.__html;
  return escape(String(value));
}

/** Tagged template that escapes interpolations unless they are `Html`. */
export function html(strings: TemplateStringsArray, ...values: Renderable[]): Html {
  let out = strings[0] ?? '';
  for (let i = 0; i < values.length; i++) out += render(values[i]) + (strings[i + 1] ?? '');
  return { __html: out };
}


/** Joins a list of components with an optional separator. */
export const join = (items: readonly Renderable[], separator = ''): Html =>
  raw(items.map(render).join(separator));
