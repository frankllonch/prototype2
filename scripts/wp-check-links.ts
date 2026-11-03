/**
 * Does every address the old site published still lead somewhere?
 *
 *   npm run wp:check-links                                    the pages, against http://localhost:8888
 *   npm run wp:check-links -- https://nova.claudiavalsells.com --images
 *   npm run wp:check-links -- --csv wordpress/redirects.csv   the list for the host
 *   npm run wp:check-links -- --snapshot                      take wordpress/old-urls.txt again
 *
 * wordpress/old-urls.txt is every address the old site (www.claudiavalsells.com,
 * the WordPress the new one replaces) published: what its sitemaps list, the
 * pages and pictures the dataset was extracted from, and the one-offs the
 * redirect rules name. It is a snapshot, so the check does not need the old
 * site, which is gone once the new one is live.
 *
 * Each address is asked of the site under test without following redirects,
 * and the redirects are then followed by hand, five at most, so the whole
 * chain is seen. An address passes when it ends on a 200 and, if one of the
 * redirect rules matches it, ends where that rule sends it, by a permanent
 * redirect; if no rule matches, it must answer 200 itself, with no redirect at
 * all. The rules are read out of redirects.php with a regular expression rather
 * than typed again here, so the check and the plugin cannot drift apart.
 *
 *   --images          the pictures as well, and the other files the old pages linked
 *   --concurrency N   requests at a time, 6 by default: this is run against shared hosting too
 *   --delay MS        a pause before each request, for a host that limits requests a minute
 *   --csv <file>      old path, final path and outcome (301, unchanged, FAIL) of every
 *                     address checked: the list for Toni at hubsfera
 *   --snapshot        read the old site's sitemaps again, one at a time, and rewrite
 *                     old-urls.txt; refused once the old address answers with the new site
 *
 * A site behind a server password, as the staging is, is given with it:
 * https://user:password@nova.claudiavalsells.com.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Dataset, ProjectImage } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const LIST = path.join(ROOT, 'wordpress', 'old-urls.txt');
const RULES = path.join(ROOT, 'wordpress', 'plugins', 'claudiavalsells-content', 'includes', 'redirects.php');
const DATASET = path.join(ROOT, 'content', 'projects.json');
const OLD_SITE = 'https://www.claudiavalsells.com';
const OLD_HOSTS = new Set(['www.claudiavalsells.com', 'claudiavalsells.com']);
const MAX_HOPS = 5;
const USER_AGENT = 'claudiavalsells-check-links/1.0';

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const args = process.argv.slice(2);
const VALUED = ['--csv', '--concurrency', '--delay'];
for (const a of args) if (a.startsWith('--') && ![...VALUED, '--images', '--snapshot'].includes(a)) fail(`Unknown option ${a}.`);
function option(flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) fail(`${flag} needs a value.`);
  return value;
}
const images = args.includes('--images');
const snapshot = args.includes('--snapshot');
const csv = option('--csv');
const concurrency = Number(option('--concurrency') ?? 6);
if (!Number.isInteger(concurrency) || concurrency < 1) fail('--concurrency takes a whole number, 1 or more.');
// A pause before each request, in milliseconds, for a host that limits how
// many a visitor may make a minute: --concurrency 1 --delay 500 is two a second.
const delay = Number(option('--delay') ?? 0);
if (!Number.isInteger(delay) || delay < 0) fail('--delay takes a whole number of milliseconds.');
// An address as printed: never with the server password it may carry.
const shown = (s: string) => s.replace(/^([a-z][\w+.-]*:\/\/)[^@/?#]*@/i, '$1…@');
// The one argument that is neither an option nor an option's value is the site.
const sites = args.filter((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1] ?? ''));
if (sites.length > 1) fail(`One site at a time, not ${sites.map(shown).join(' and ')}.`);
const site = sites[0] ?? (snapshot ? OLD_SITE : 'http://localhost:8888');
const BASE_URL = URL.canParse(site) && /^https?:$/.test(new URL(site).protocol)
  ? new URL(site)
  : fail(`${shown(site)} is not a web address. A password with # / ? or @ in it has to be written percent-encoded.`);
// The staging sits behind a password at the server door. Given in the address
// (https://user:password@nova.claudiavalsells.com), it goes with every request
// to that site, and nowhere else: nothing is followed off it, nor to another
// scheme or port of it, where the password would travel unencrypted.
const AUTH = BASE_URL.username
  ? `Basic ${Buffer.from(`${decodeURIComponent(BASE_URL.username)}:${decodeURIComponent(BASE_URL.password)}`).toString('base64')}`
  : undefined;
BASE_URL.username = '';
BASE_URL.password = '';
const BASE = BASE_URL.href.replace(/\/+$/, '');
const HEADERS: Record<string, string> = { 'user-agent': USER_AGENT, ...(AUTH ? { authorization: AUTH } : {}) };

// ---------------------------------------------------------------- the rules

type Rule = { pattern: string; re: RegExp; target: string };

/**
 * The redirect rules, read out of redirects.php with a regular expression
 * rather than typed again here, so the check and the plugin cannot drift
 * apart: each [ '#pattern#', '/target/$1/' ] pair of cvc_redirect_rules(), in
 * their order, since the first that matches is the one the plugin follows.
 */
function readRules(): Rule[] {
  const php = readFileSync(RULES, 'utf8');
  const body = /function cvc_redirect_rules\(\)[^{]*\{([\s\S]*?)\n\}/.exec(php)?.[1] ?? '';
  // A PHP string in single quotes, where only \\ and \' are escapes. Comment
  // lines go first, so a pair quoted in one is not taken for a rule.
  const quoted = String.raw`'((?:[^'\\]|\\.)*)'`;
  const pairs = body.replace(/^\s*(?:\/\/|\/\*|\*).*$/gm, '').matchAll(new RegExp(String.raw`\[\s*${quoted}\s*,\s*${quoted}\s*\]`, 'g'));
  const unquote = (s: string) => s.replace(/\\([\\'])/g, '$1');
  const rules = [...pairs].map((m): Rule => {
    const pattern = unquote(m[1] ?? '');
    const end = pattern.lastIndexOf(pattern[0] ?? '');
    const flags = pattern.slice(end + 1);
    if (end < 1 || !/^[imsu]*$/.test(flags)) fail(`The rule ${pattern} in redirects.php is not one this check can read.`);
    let re: RegExp;
    try {
      re = new RegExp(pattern.slice(1, end), flags);
    } catch (err) {
      fail(`The rule ${pattern} in redirects.php is not one JavaScript can read: ${(err as Error).message}.`);
    }
    // preg_replace's ${1} and \1 are JavaScript's $1.
    const target = unquote(m[2] ?? '').replace(/\$\{(\d+)\}|\\(\d+)/g, (_, a?: string, b?: string) => `$${a ?? b}`);
    return { pattern, re, target };
  });
  if (!rules.length) fail('No rules found in redirects.php: has cvc_redirect_rules() changed shape?');
  return rules;
}

/** Where the plugin sends a path, or undefined when no rule matches it. */
function destination(rules: Rule[], p: string): string | undefined {
  const rule = rules.find((r) => r.re.test(p));
  // preg_replace replaces every match; the rules are anchored, so that is the whole path.
  return rule && p.replace(new RegExp(rule.re.source, `${rule.re.flags}g`), rule.target);
}

/**
 * The addresses a rule names outright — /contacto/, /sitemap_index.xml — which
 * no sitemap need list: plain text, (a|b) choices, an optional closing slash.
 */
function namedBy(rule: Rule): string[] {
  const body = rule.pattern.slice(1, rule.pattern.lastIndexOf(rule.pattern[0] ?? ''));
  const m = /^\^(.*?)(\/\?)?\$$/.exec(body);
  if (!m) return [];
  let named = [''];
  for (const [i, part] of (m[1] ?? '').split(/\((?:\?:)?([^()]*)\)/).entries()) {
    const choices = i % 2 ? part.split('|') : [part];
    if (choices.some((c) => /[\\[\](){}*+?|^$.]/.test(c.replaceAll('\\.', '')))) return [];
    named = named.flatMap((n) => choices.map((c) => n + c.replaceAll('\\.', '.')));
  }
  return named.map((n) => (m[2] ? `${n}/` : n));
}

// ---------------------------------------------------------------- the old addresses

type Kind = 'pages' | 'images';
type Entry = { path: string; kind: Kind };

function readList(): Entry[] {
  if (!existsSync(LIST)) fail(`${path.relative(ROOT, LIST)} is missing: npm run wp:check-links -- --snapshot takes it.`);
  let kind: Kind = 'pages';
  const entries: Entry[] = [];
  for (const [n, raw] of readFileSync(LIST, 'utf8').split('\n').entries()) {
    const line = raw.trim();
    if (line === '# images') kind = 'images';
    else if (line.startsWith('/')) entries.push({ path: line, kind });
    else if (line && !line.startsWith('#')) fail(`${path.relative(ROOT, LIST)}, line ${n + 1}: ${line} is not a path.`);
  }
  return entries;
}

/**
 * An address on the old site as the path a browser sends for it, so that the
 * sitemaps' spelling and the dataset's meet; undefined for one elsewhere, or
 * for a picture the dataset took from a folder rather than from the site.
 */
function oldPath(address: string): string | undefined {
  if (!/^(?:https?:)?\//.test(address) || !URL.canParse(address, OLD_SITE)) return undefined;
  const url = new URL(address, OLD_SITE);
  return OLD_HOSTS.has(url.hostname) || (snapshot && url.hostname === BASE_URL.hostname) ? url.pathname : undefined;
}

/**
 * What the dataset knows of the old site: each record's own address, its
 * pictures' uploads, and what its texts link there — a page, or a file such
 * as a video or a PDF.
 */
function fromDataset(): { pages: Set<string>; files: Set<string>; extractedAt?: string } {
  const pages = new Set<string>();
  const files = new Set<string>();
  if (!existsSync(DATASET)) return { pages, files };
  const data = JSON.parse(readFileSync(DATASET, 'utf8')) as Dataset;
  const add = (set: Set<string>, address: string) => {
    const p = oldPath(address);
    if (p) set.add(p);
  };
  for (const record of data.projects) {
    add(pages, record.sourceUrl);
    const columns = record.rows.flatMap((r) => r.columns);
    const pictures: (ProjectImage | undefined)[] = [record.cover, ...record.images, ...columns.flatMap((c) => (c.kind === 'images' ? c.images : []))];
    for (const picture of pictures) if (picture) add(files, picture.source);
    const texts = [record.description ?? '', ...columns.flatMap((c) => (c.kind === 'text' ? [c.html] : []))];
    for (const text of texts) {
      for (const m of text.matchAll(/(?:href|src)="((?:https?:)?\/[^"]*)"|https?:\/\/(?:www\.)?claudiavalsells\.com\/[^\s"'<>()]*/g)) {
        // An address written out in the text may end a sentence.
        const link = m[1] ?? m[0].replace(/[.,;:!?]+$/, '');
        add(/\.[a-z\d]{2,4}$/i.test(oldPath(link) ?? '') ? files : pages, link);
      }
    }
  }
  return { pages, files, extractedAt: data.extractedAt };
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Every <loc>, or every <image:loc>, of a sitemap, its entities decoded. */
function locs(xml: string, tag: 'loc' | 'image:loc'): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`, 'g'))].map((m) =>
    (m[1] ?? '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, name: string) =>
      name.startsWith('#') ? String.fromCodePoint(Number(name.replace(/^#x/i, '0x').replace(/^#/, ''))) : ENTITIES[name] ?? entity),
  );
}

/**
 * One of the old site's sitemaps, asked without following redirects: once the
 * new site answers at the old address, /sitemap_index.xml is sent on to
 * WordPress's own sitemap, and a snapshot taken then would list the new
 * site's addresses as the old ones.
 */
async function sitemap(address: string): Promise<string> {
  const res = await fetch(address, { redirect: 'manual', headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  const xml = await res.text();
  if (res.status !== 200 || !/<(?:urlset|sitemapindex)\b/.test(xml)) {
    fail(`${address} answered ${res.status}, not with a sitemap: is the old site still there? ${path.relative(ROOT, LIST)} is left as it was.`);
  }
  return xml;
}

/** A paragraph as comment lines of the list, broken between words but not inside `a command`. */
function wrap(text: string, width = 78): string[] {
  const lines = [''];
  for (const word of text.match(/`[^`]*`\S*|\S+/g) ?? []) {
    const last = lines.length - 1;
    if (lines[last] && `${lines[last]} ${word}`.length > width) lines.push(word);
    else lines[last] = lines[last] ? `${lines[last]} ${word}` : word;
  }
  return lines.map((line) => `# ${line}`);
}

async function takeSnapshot(rules: Rule[]): Promise<void> {
  const pages = new Set<string>();
  const files = new Set<string>();
  const add = (set: Set<string>, address: string) => {
    const p = oldPath(address);
    if (p) set.add(p);
  };
  const index = `${BASE}/sitemap_index.xml`;
  const listed = locs(await sitemap(index), 'loc').filter((address) => oldPath(address));
  add(pages, index);
  // One sitemap at a time: this is the live site, and there is no hurry.
  for (const address of listed) {
    const xml = await sitemap(address);
    add(pages, address);
    for (const loc of locs(xml, 'loc')) add(pages, loc);
    for (const loc of locs(xml, 'image:loc')) add(files, loc);
  }
  const dataset = fromDataset();
  for (const p of dataset.pages) pages.add(p);
  for (const f of dataset.files) files.add(f);
  for (const rule of rules) for (const p of namedBy(rule)) pages.add(p);
  const names = ['sitemap_index.xml', ...listed.map((address) => path.posix.basename(new URL(address).pathname))];
  const header = [
    `Every address the old site published, checked by \`npm run wp:check-links\`. Taken ${new Date().toISOString().slice(0, 10)}` +
      ` from ${BASE}: its sitemaps (${names.join(', ')}); content/projects.json, extracted` +
      ` ${dataset.extractedAt?.slice(0, 10) ?? 'on an unknown date'}, for each record's old address, its pictures' uploads and` +
      ' the files its texts link; and the addresses the rules in redirects.php name outright.',
    'A snapshot, so the check does not need the old site: take it again with `npm run wp:check-links -- --snapshot` while that is still up.',
    `${pages.size} pages, then, after the marker, ${files.size} pictures and other files. Paths only, no host.`,
  ];
  const lines = [...header.flatMap((p) => wrap(p)), '', ...[...pages].sort(), '', '# images', ...[...files].sort()];
  writeFileSync(LIST, `${lines.join('\n')}\n`);
  console.log(`Wrote ${pages.size} pages and ${files.size} files to ${path.relative(ROOT, LIST)}.`);
}

// ---------------------------------------------------------------- the check

type Hop = { status: number; url: URL };
type Result = Entry & { chain: Hop[]; final: string; outcome: string; why?: string };

/** An address on the site under test as a path from its root, as the rules write it. */
function local(url: URL): string {
  const prefix = BASE_URL.pathname.replace(/\/$/, '');
  return (url.pathname.startsWith(`${prefix}/`) ? url.pathname.slice(prefix.length) : url.pathname) + url.search;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ask(url: URL): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    if (delay) await pause(delay);
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'manual', headers: HEADERS, signal: AbortSignal.timeout(30_000) });
      // The status and the Location are all that is read; a picture is not downloaded.
      await res.body?.cancel();
    } catch (err) {
      // A second chance for a dropped connection: shared hosting has its moments.
      if (attempt >= 2) throw err;
      await pause(2000);
      continue;
    }
    // Told to slow down — by the host or by Wordfence — it waits as long as it
    // is asked to (up to a minute) and asks again, three times at most, rather
    // than record every address after the limit as a failure.
    if ((res.status === 429 || res.status === 503) && attempt <= 3) {
      const after = Number(res.headers.get('retry-after'));
      await pause(Math.min(60_000, Number.isFinite(after) && after > 0 ? after * 1000 : 5000 * attempt));
      continue;
    }
    return res;
  }
}

async function check(rules: Rule[], entry: Entry): Promise<Result> {
  const chain: Hop[] = [];
  const expected = destination(rules, entry.path);
  const result = (outcome: string, why?: string): Result => {
    const last = chain.at(-1);
    return { ...entry, chain, final: last ? local(last.url) : entry.path, outcome, ...(why ? { why } : {}) };
  };
  let url = new URL(BASE + entry.path);
  try {
    for (;;) {
      const res = await ask(url);
      chain.push({ status: res.status, url });
      const location = res.headers.get('location');
      if (res.status < 300 || res.status > 399 || !location) break;
      if (chain.length > MAX_HOPS) return result('FAIL', `still redirecting after ${MAX_HOPS} hops`);
      const next = new URL(location, url);
      // Never followed off the site — nor to another scheme or port of it, where
      // the server password would go out unencrypted: whatever answers there is
      // not this check's to ask, and an https site sending a visitor to http is
      // a fault in itself.
      if (next.origin !== BASE_URL.origin) return result('FAIL', `sent off the site, to ${shown(next.href)}`);
      url = next;
    }
  } catch (err) {
    const e = err as Error & { cause?: unknown };
    return result('FAIL', `no answer: ${String(e.cause ?? e.message)}`);
  }
  const first = chain[0]!;
  const last = chain.at(-1)!;
  if (expected === undefined) {
    if (chain.length === 1 && last.status === 200) return result('unchanged');
    return result('FAIL', chain.length > 1 ? 'redirected, though no rule names it' : `answers ${last.status}`);
  }
  if (chain.length === 1) {
    return result('FAIL', last.status === 200 ? `answers 200 itself: the rule to ${expected} did not run` : `answers ${last.status}; the rule says ${expected}`);
  }
  const final = local(last.url);
  if (final !== expected) return result('FAIL', `ends on ${final}; the rule says ${expected}`);
  if (last.status !== 200) return result('FAIL', `${expected} answers ${last.status}`);
  if (first.status !== 301 && first.status !== 308) return result('FAIL', `a ${first.status}, not a permanent redirect`);
  return result(String(first.status));
}

/** Runs `worker` over `items`, `limit` at a time, keeping their order. */
async function pool<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await worker(items[i]!);
      }
    }),
  );
  return results;
}

function report(results: Result[]): void {
  // A picture the dataset does not name was never imported: expected on the
  // local site; on the host it has to come across from the old uploads folder.
  const imported = fromDataset().files;
  const notImported = (r: Result) => r.kind === 'images' && !imported.has(r.path);
  for (const kind of ['pages', 'images'] as const) {
    const of = results.filter((r) => r.kind === kind);
    if (!of.length) continue;
    const failed = of.filter((r) => r.outcome === 'FAIL');
    const moved = of.filter((r) => /^\d+$/.test(r.outcome)).length;
    const missing = failed.filter(notImported).length;
    console.log(
      `${kind.padEnd(6)} ${of.length - failed.length} of ${of.length} passed (${moved} redirected, ${of.length - failed.length - moved} where they were)` +
        (failed.length ? `, ${failed.length} failed${missing ? `, ${missing} of them not in the dataset` : ''}` : ''),
    );
  }
  for (const r of results.filter((r) => r.outcome === 'FAIL')) {
    const hops = r.chain.map((h, i) => `${i ? '→ ' : ''}${local(h.url)} ${h.status}`).join(' ') || r.path;
    // WordPress has no sitemap while it asks search engines to stay away, as the
    // local site and the staging do until go-live; and a host, or Wordfence,
    // may slow down a visitor asking this much this fast.
    const status = r.chain.at(-1)?.status;
    const note = notImported(r)
      ? ' (not in the dataset, so not imported)'
      : r.final === '/wp-sitemap.xml' && status === 404
        ? ' (no sitemap while search engines are kept out: Settings → Reading)'
        : status === 429 || status === 503
          ? ' (held back by the server: try --concurrency 1 --delay 500)'
          : '';
    console.log(`  FAIL ${hops}: ${r.why ?? ''}${note}`);
  }
}

function writeCsv(results: Result[], file: string): void {
  const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
  const rows = [['old_path', 'final_path', 'outcome'], ...results.map((r) => [r.path, r.final, r.outcome])];
  // npm runs this from the repository's root; the file is where it was asked for.
  const out = path.resolve(process.env.INIT_CWD ?? process.cwd(), file);
  writeFileSync(out, `${rows.map((row) => row.map(cell).join(',')).join('\n')}\n`);
  console.log(`Wrote ${results.length} rows to ${path.relative(process.cwd(), out)}.`);
}

const rules = readRules();
if (snapshot) {
  await takeSnapshot(rules);
} else {
  const entries = readList().filter((e) => images || e.kind === 'pages');
  console.log(`Checking ${entries.length} old addresses against ${BASE}, ${concurrency} at a time.`);
  let done = 0;
  const results = await pool(entries, concurrency, async (entry) => {
    const result = await check(rules, entry);
    if (process.stdout.isTTY) process.stdout.write(`\r  ${++done}/${entries.length}`);
    return result;
  });
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[K');
  report(results);
  if (csv) writeCsv(results, csv);
  process.exitCode = results.some((r) => r.outcome === 'FAIL') ? 1 : 0;
}
