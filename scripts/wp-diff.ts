/** Does the WordPress theme still draw what the static site draws? */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const WP = process.env.WP_URL ?? 'http://localhost:8888';
const OUT = path.join(ROOT, 'wordpress', '.diff');

const args = process.argv.slice(2);
const show = args.includes('--show');
const all = args.includes('--all');
const routes = args.filter((a) => a.startsWith('/'));

function firstDir(dir: string): string | undefined {
  if (!existsSync(dir)) return undefined;
  return readdirSync(dir, { withFileTypes: true }).find((d) => d.isDirectory())?.name;
}

const DEFAULT_ROUTES = [
  '/',
  '/artwork/',
  `/artwork/${firstDir(path.join(DIST, 'artwork')) ?? ''}/`,
  '/exhibitions/',
  `/exhibitions/${firstDir(path.join(DIST, 'exhibitions')) ?? ''}/`,
  '/commissioned/',
  // About is an overlay on every page of the static site, so it is compared on each of them rather
  // than at an address of its own.
  '/color-chart/',
  '/whats-color/i/',
  '/whats-color/ii/',
  '/whats-color/iii/',
].filter((r) => !r.endsWith('//'));

function normalise(html: string, origin: 'static' | 'wp'): string {
  let s = html;
  s = s.replace(/^[\s\S]*?<body/i, '<body').replace(/<\/body>[\s\S]*$/i, '</body>');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  if (origin === 'wp') {
    s = s.replaceAll(`${WP}/wp-content/themes/claudiavalsells/assets/`, '/');
    s = s.replaceAll(`${WP}/wp-content/uploads/`, '/uploads/');
    s = s.replaceAll(WP, '');
    s = s.replace(/\?v=\d+/g, '').replace(/\?ver=[\w.]+/g, '');
    s = s.replace(/href="\/about\/"/g, 'href="/#about"');
    s = s.replace(/ data-panel-url="[^"]*"/g, '');
    // A panel's row links to the panel's own page; on the static site, to its id.
    s = s.replace(/href="\/(?:exhibitions|commissioned)\/[^"]+\/" data-panel-open="([^"]+)"/g, 'href="#$1" data-panel-open="$1"');
    s = s.replaceAll('&#038;', '&amp;').replaceAll('&#8217;', '’');
    s = s.replace(/<body class="([^"]*)"/, (_, classes: string) => {
      const kept = classes
        .split(' ')
        .filter((c) => !/^(wp-|single|postid-|page|archive|post-type-|home$|blog$|logged-in|admin-bar|no-customize)|-template-/.test(c));
      return kept.length ? `<body class="${kept.join(' ')}"` : '<body';
    });
  } else {
    s = s.replace(/\?v=[\w-]+/g, '');
  }
  // Pictures: keep the <img> and its class; drop the renditions, the <source> elements, whose
  // number depends on which formats each side has, and the alt text, which WordPress has from the
  // media library and the static site's dataset does not.
  s = s.replace(/<picture\b[^>]*>([\s\S]*?)<\/picture>/g, (m, inner: string) => {
    const open = m.match(/<picture\b[^>]*>/)?.[0] ?? '<picture>';
    return `${open}${inner.match(/<img\b[^>]*>/)?.[0] ?? ''}</picture>`;
  });
  s = s.replace(/<img\b([^>]*)>/g, (_, attrs: string) => {
    const kept = [...attrs.matchAll(/\s(class|loading|decoding)="[^"]*"/g)].map((m) => m[0]).join('');
    return `<img${kept}>`;
  });
  // A <div> with no attributes, or an empty <i>, <em>, <span>, is a wrapper the source HTML left
  // behind, not a hook anything styles; the import drops them, the static build keeps them.
  s = s.replace(/<\/?div>/g, '');
  for (let i = 0; i < 4; i++) s = s.replace(/<(i|em|b|strong|span)>\s*<\/\1>/g, '');
  // About's record of shows: typed out on the static site, read off the exhibition entries in
  // WordPress — set aside until that is decided (docs/wordpress-migration.md), unless --all asks
  // for it.
  if (!all) s = s.replace(/<section class="about-shows[^"]*">[\s\S]*?<\/section>/g, '<section class="about-shows"></section>');
  // Fractions in inline custom properties, to three places: a tile's aspect computed from the
  // crop's pixels on one side and the upload's on the other can differ in the fourth.
  s = s.replace(/style="[^"]*"/g, (m) => m.replace(/(\d+\.\d{3})\d+/g, '$1'));
  s = s.replace(/\s+/g, ' ').replace(/\s+>/g, '>').replace(/\s+\/>/g, ' />').replace(/>\s+/g, '>').replace(/\s+</g, '<').trim();
  // The order form posts to the plugin's endpoint; the static build to whatever INQUIRIES_ENDPOINT
  // was set to, or nowhere.
  s = s.replace(/(<form class="inq-form"[^>]*?) action="[^"]*"/g, '$1');
  return `${s.replace(/></g, '>\n<')}\n`;
}

/** The entities one side may write where the other writes the character. */
const ENTITIES: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: String.fromCharCode(0xa0), hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—',
};

function decode(s: string): string {
  return s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m;
    const hex = e[1] === 'x' || e[1] === 'X';
    const code = parseInt(e.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });
}

/** A tag's attributes by name, however each is quoted. */
function attributes(tag: string): Map<string, string> {
  const out = new Map<string, string>();
  const inner = tag.replace(/^<[\w-]+/, '').replace(/\/?>$/, '');
  for (const m of inner.matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    out.set(m[1]!.toLowerCase(), decode(m[2] ?? m[3] ?? m[4] ?? ''));
  }
  return out;
}

/**
 * The order the head's lines are written in: by what each says, not where it
 * stands, since WordPress prints its title and stylesheets from wp_head(), after
 * the theme's own lines, and the static site before them.
 */
const HEAD_ORDER = [
  'html', 'charset', 'viewport', 'title', 'description', 'canonical', 'robots', 'social', 'icon',
  'manifest', 'theme-color', 'json-ld', 'preload', 'stylesheet', 'script', 'modulepreload', 'other',
];

function headLines(html: string, origin: 'static' | 'wp'): string[] {
  const address = (u: string) => {
    let s = u;
    if (origin === 'wp') {
      s = s.replaceAll(`${WP}/wp-content/themes/claudiavalsells/assets/`, '/');
      s = s.replaceAll(`${WP}/wp-content/uploads/`, '/uploads/');
      s = s.replaceAll(WP, '');
      s = s.replace(/\?v=\d+/g, '').replace(/\?ver=[\w.]+/g, '');
    } else {
      s = s.replace(/\?v=[\w-]+/g, '');
    }
    // An address written in full, with the domain it is meant for, compares with the other side's
    // by its path.
    return s.replace(/^https?:\/\/[^/]+/, '');
  };
  const text = (s: string) => decode(s).replace(/\s+/g, ' ').trim();
  const lines: { kind: string; line: string }[] = [];
  const add = (kind: string, value: string) => lines.push({ kind, line: `${kind} ${value}`.trim() });

  for (const [name, value] of attributes(html.match(/<html\b[^>]*>/i)?.[0] ?? '<html>')) {
    if (name !== 'style') add('html', `${name}="${value}"`);
    else for (const d of value.split(';').map((v) => v.trim()).filter(Boolean)) add('html', `style ${d.replace(/(\d+\.\d{3})\d+/g, '$1')}`);
  }
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '').replace(/<!--[\s\S]*?-->/g, '');
  for (const [el] of head.matchAll(/<(title|script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:meta|link|base)\b[^>]*>/gi)) {
    const open = el.match(/^<[^>]*>/)![0];
    const tag = open.match(/^<([\w-]+)/)![1]!.toLowerCase();
    const a = attributes(open);
    const inner = el.slice(open.length).replace(/<\/[\w-]+\s*>$/, '');
    const rel = (a.get('rel') ?? '').toLowerCase().split(/\s+/);
    const name = (a.get('name') ?? a.get('property') ?? '').toLowerCase();
    const content = a.get('content') ?? '';
    const href = address(a.get('href') ?? '');
    if (tag === 'meta' && a.has('charset')) add('charset', a.get('charset')!.toLowerCase());
    else if (tag === 'meta' && name === 'viewport') add('viewport', content);
    else if (tag === 'title') add('title', text(inner));
    else if (tag === 'meta' && name === 'description') add('description', text(content));
    else if (tag === 'link' && rel.includes('canonical')) add('canonical', href);
    else if (tag === 'meta' && name === 'robots') add('robots', content);
    else if (tag === 'meta' && /^(og|twitter|article|fb):/.test(name)) {
      add('social', `${name} ${
        /:image(:url|:secure_url)?$/.test(name) ? '(a picture)'
        : /:image:(width|height)$/.test(name) ? '(its size)'
        : /:url$/.test(name) ? address(content) : text(content)}`);
    } else if (tag === 'link' && rel.some((r) => r.endsWith('icon'))) add('icon', `${rel.join(' ')} ${href}`);
    else if (tag === 'meta' && name === 'msapplication-tileimage') add('icon', `tile ${address(content)}`);
    else if (tag === 'link' && rel.includes('manifest')) add('manifest', href);
    else if (tag === 'meta' && name === 'theme-color') add('theme-color', `${content} ${a.get('media') ?? ''}`);
    else if (tag === 'script' && a.get('type') === 'application/ld+json') {
      add('json-ld', inner.replace(/\s+/g, ' ').replace(/"https?:\/\/[^/"]+/g, '"').trim());
    } else if (tag === 'link' && rel.includes('preload')) {
      add('preload', `${a.get('as') ?? ''} ${a.get('type') ?? ''} ${href}${a.has('crossorigin') ? ' crossorigin' : ''}`);
    } else if (tag === 'link' && rel.includes('modulepreload')) add('modulepreload', href);
    else if (tag === 'link' && rel.includes('stylesheet')) add('stylesheet', href);
    else if (tag === 'script' && a.has('src')) add('script', `src ${address(a.get('src')!)}`);
    else if (tag === 'script') {
      // Its code line by line, without the comments, which each side words its own way.
      for (const line of inner.split('\n').map((l) => l.trim())) if (line && !line.startsWith('//')) add('script', line);
    } else add('other', address(open.replace(/\s+/g, ' ')));
  }
  const rank = (kind: string) => HEAD_ORDER.indexOf(kind);
  return lines
    .map((l, i) => ({ ...l, i }))
    .sort((x, y) => rank(x.kind) - rank(y.kind)
      || (x.kind === 'modulepreload' ? (x.line < y.line ? -1 : x.line > y.line ? 1 : 0) : x.i - y.i))
    .map((l) => l.line);
}

/**
 * Both heads as lines, with what WordPress says on purpose set aside (see the
 * top of this file).
 */
function heads(staticHtml: string, wpHtml: string, route: string): [string, string] {
  const a = headLines(staticHtml, 'static');
  const has = (kind: string) => a.some((l) => l.startsWith(`${kind} `));
  // What is set aside is set aside once: a second description, or a second og:title from a plugin
  // printing its own set, is a fault and is reported.
  const seen = new Map<string, number>();
  const again = (key: string) => {
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n > 1;
  };
  const b = headLines(wpHtml, 'wp').filter((l) => {
    const kind = l.slice(0, l.indexOf(' '));
    const value = l.slice(kind.length + 1);
    if ((kind === 'description' || kind === 'social') && again(kind === 'social' ? value.split(' ')[0]! : kind)) return true;
    switch (kind) {
      case 'robots': return !value.split(',').every((t) => ['noindex', 'nofollow', 'max-image-preview:large'].includes(t.trim()));
      case 'canonical': return has('canonical') || value !== route;
      case 'description': return has('description');
      case 'modulepreload': return a.includes(l);
      case 'stylesheet': return value !== '/wp-content/themes/claudiavalsells/wp.css';
      // The sharing tags are WordPress's own (cv_share_tags in inc/setup.php); compared only once
      // the static site has some too.
      case 'social': return has('social');
      default: return true;
    }
  });
  return [`${a.join('\n')}\n`, `${b.join('\n')}\n`];
}

async function page(route: string): Promise<[string, string]> {
  const file = path.join(DIST, route, 'index.html');
  if (!existsSync(file)) throw new Error(`${file} is not built — run npm run build first`);
  const res = await fetch(`${WP}${route}`);
  if (!res.ok) throw new Error(`${WP}${route} answered ${res.status}`);
  return [readFileSync(file, 'utf8'), await res.text()];
}

/** One part of a page written out from both sides and diffed; no lines when they agree. */
function compare(part: string, name: string, ext: string, [a, b]: readonly [string, string]) {
  const fa = path.join(OUT, `${name}.static.${ext}`);
  const fb = path.join(OUT, `${name}.wp.${ext}`);
  writeFileSync(fa, a);
  writeFileSync(fb, b);
  try {
    execFileSync('diff', ['-u', fa, fb], { encoding: 'utf8' });
    return { lines: 0, out: '', label: '' };
  } catch (e) {
    // 1 is "they differ"; anything else is diff itself failing, not a result.
    if ((e as { status?: number }).status !== 1) throw e;
    const out = (e as { stdout: string }).stdout;
    const lines = out.split('\n').filter((l) => /^[-+]/.test(l) && !/^(\+\+\+|---)/.test(l)).length;
    return { lines, out, label: `${part} ${lines} lines (${path.relative(ROOT, fa)} vs .wp.${ext})` };
  }
}

mkdirSync(OUT, { recursive: true });
let differing = 0;
for (const route of routes.length ? routes : DEFAULT_ROUTES) {
  const [a, b] = await page(route);
  const name = route.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
  const parts = [
    compare('head', name, 'head.txt', heads(a, b, route)),
    compare('body', name, 'html', [normalise(a, 'static'), normalise(b, 'wp')]),
  ].filter((p) => p.lines);
  if (!parts.length) {
    console.log(`  same   ${route}`);
    continue;
  }
  differing++;
  console.log(`  DIFFER ${route}: ${parts.map((p) => p.label).join('; ')}`);
  if (show) for (const p of parts) console.log(p.out);
}
console.log(differing ? `${differing} page(s) differ.` : 'Every page is the same after normalisation.');
process.exitCode = differing ? 1 : 0;
