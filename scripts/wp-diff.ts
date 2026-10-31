/**
 * Does the WordPress theme still draw what the static site draws?
 *
 *   npm run build && npm run wp:diff            every page below
 *   npm run wp:diff -- /whats-color/ii/ --show  one page, with the differences
 *   npm run wp:diff -- --all                    About's record included
 *
 * The theme's PHP components are ports of the TypeScript ones and are meant
 * to emit the same markup, so that the one stylesheet and the one set of
 * scripts serve both. This reads a page from dist/ and the same page from the
 * local WordPress (http://localhost:8888), sets aside what differs on purpose,
 * and diffs the rest. A design change made in src/ shows up here as a
 * difference until its PHP component is brought along.
 *
 * Set aside, because intended:
 *   - the head, and the WordPress classes on <body>;
 *   - asset addresses (the theme serves them from its assets folder, stamped);
 *   - About at /about/ in WordPress, /#about on the static site, and the
 *     data-panel-url attributes only WordPress has, since there a panel is a
 *     page of its own;
 *   - pictures: WordPress serves its own sizes from uploads/, the static site
 *     the pipeline's renditions, so src, srcset, sizes and dimensions are
 *     dropped and only class and the element itself are compared — and the
 *     alt text, which WordPress has from the media library and the static
 *     site's dataset does not;
 *   - the links of a panel's row: to the panel's own page in WordPress, to
 *     its id on the static site;
 *   - bare <div> wrappers the source HTML left in the static pages, which the
 *     import did not keep; the way each side writes an ampersand;
 *   - HTML comments, whitespace, trailing spaces inside tags, and the
 *     precision of fractions in inline custom properties.
 *
 * Expected to differ until decided otherwise (docs/wordpress-migration.md):
 *   - About's record of exhibitions, which the static site types out and
 *     WordPress reads off the exhibition entries — set aside unless --all;
 *   - the heading of an exhibition's or a project's panel: the static site
 *     shows the title and venue of the source page it was derived from,
 *     WordPress the entry's own title and venue, which are what the row shows;
 *   - the text inside the panels, where the static site renders the source
 *     HTML as it came, nested wrappers and all, and the import normalised it
 *     into paragraphs. Same words, different wrapping.
 */
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
  // About is an overlay on every page of the static site, so it is compared
  // on each of them rather than at an address of its own.
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
  // Pictures: keep the <img> and its class; drop the renditions, the <source>
  // elements, whose number depends on which formats each side has, and the
  // alt text, which WordPress has from the media library and the static
  // site's dataset does not.
  s = s.replace(/<picture\b[^>]*>([\s\S]*?)<\/picture>/g, (m, inner: string) => {
    const open = m.match(/<picture\b[^>]*>/)?.[0] ?? '<picture>';
    return `${open}${inner.match(/<img\b[^>]*>/)?.[0] ?? ''}</picture>`;
  });
  s = s.replace(/<img\b([^>]*)>/g, (_, attrs: string) => {
    const kept = [...attrs.matchAll(/\s(class|loading|decoding)="[^"]*"/g)].map((m) => m[0]).join('');
    return `<img${kept}>`;
  });
  // A <div> with no attributes, or an empty <i>, <em>, <span>, is a wrapper
  // the source HTML left behind, not a hook anything styles; the import drops
  // them, the static build keeps them.
  s = s.replace(/<\/?div>/g, '');
  for (let i = 0; i < 4; i++) s = s.replace(/<(i|em|b|strong|span)>\s*<\/\1>/g, '');
  // About's record of shows: typed out on the static site, read off the
  // exhibition entries in WordPress — set aside until that is decided
  // (docs/wordpress-migration.md), unless --all asks for it.
  if (!all) s = s.replace(/<section class="about-shows[^"]*">[\s\S]*?<\/section>/g, '<section class="about-shows"></section>');
  // Fractions in inline custom properties, to three places: a tile's aspect
  // computed from the crop's pixels on one side and the upload's on the other
  // can differ in the fourth.
  s = s.replace(/style="[^"]*"/g, (m) => m.replace(/(\d+\.\d{3})\d+/g, '$1'));
  s = s.replace(/\s+/g, ' ').replace(/\s+>/g, '>').replace(/\s+\/>/g, ' />').replace(/>\s+/g, '>').replace(/\s+</g, '<').trim();
  // The order form posts to the plugin's endpoint; the static build to
  // whatever INQUIRIES_ENDPOINT was set to, or nowhere. After the whitespace
  // pass, so a tag the template wrote across several lines is one tag here.
  s = s.replace(/(<form class="inq-form"[^>]*?) action="[^"]*"/g, '$1');
  return `${s.replace(/></g, '>\n<')}\n`;
}

async function page(route: string): Promise<[string, string]> {
  const file = path.join(DIST, route, 'index.html');
  if (!existsSync(file)) throw new Error(`${file} is not built — run npm run build first`);
  const res = await fetch(`${WP}${route}`);
  if (!res.ok) throw new Error(`${WP}${route} answered ${res.status}`);
  return [readFileSync(file, 'utf8'), await res.text()];
}

mkdirSync(OUT, { recursive: true });
let differing = 0;
for (const route of routes.length ? routes : DEFAULT_ROUTES) {
  const [a, b] = await page(route);
  const name = route.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
  const fa = path.join(OUT, `${name}.static.html`);
  const fb = path.join(OUT, `${name}.wp.html`);
  writeFileSync(fa, normalise(a, 'static'));
  writeFileSync(fb, normalise(b, 'wp'));
  try {
    execFileSync('diff', ['-u', fa, fb], { encoding: 'utf8' });
    console.log(`  same   ${route}`);
  } catch (e) {
    const out = (e as { stdout: string }).stdout;
    const lines = out.split('\n').filter((l) => /^[-+]/.test(l) && !/^(\+\+\+|---)/.test(l));
    differing++;
    console.log(`  DIFFER ${route}: ${lines.length} lines (${path.relative(ROOT, fa)} vs .wp.html)`);
    if (show) console.log(out);
  }
}
console.log(differing ? `${differing} page(s) differ.` : 'Every page is the same after normalisation.');
process.exitCode = differing ? 1 : 0;
