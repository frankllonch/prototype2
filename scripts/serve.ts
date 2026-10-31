/** Static file server for previewing dist/. Zero dependencies. */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const PORT = Number(process.env.PORT ?? 4321);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.avif': 'image/avif', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

/**
 * Which bytes the client asked for, or null for all of them.
 *
 * Only the single-range form, which is the only one a browser sends for media.
 * `bytes=500-` is from there to the end and `bytes=-500` is the last 500, so
 * the suffix form is not a negative offset however much it looks like one.
 * Returns `false` for a range that cannot be met, which is answered with 416
 * rather than quietly sending the whole file.
 */
function wanted(header: string | undefined, size: number): { start: number; end: number } | null | false {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header ?? '').trim());
  if (!m) return null;
  const [, from, to] = m;
  if (!from && !to) return false;
  const start = from ? Number(from) : Math.max(0, size - Number(to));
  const end = from ? (to ? Math.min(Number(to), size - 1) : size - 1) : size - 1;
  if (start > end || start >= size) return false;
  return { start, end };
}

async function resolve(urlPath: string): Promise<string | null> {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const target = path.join(DIST, path.normalize(decoded).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(DIST)) return null;
  for (const candidate of [target, path.join(target, 'index.html')]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch { /* try the next candidate */ }
  }
  return null;
}

http.createServer(async (req, res) => {
  const file = await resolve(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }
  /*
   * `no-cache`, deliberately, and not `no-store`.
   *
   * They read as near-synonyms and are not: `no-store` forbids keeping the
   * response at all, and a page that may not be kept cannot go in the
   * back/forward cache either. That is the thing that makes stepping back
   * instant — the page is resumed rather than rebuilt, with its scroll and its
   * state intact — so forbidding it to fix a staleness problem that turned out
   * to be something else entirely was a poor trade. `no-cache` still has the
   * browser check with the server before reusing anything.
   */
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  const { size } = await stat(file);

  /*
   * Byte ranges, which are what makes video work at all in Safari.
   *
   * Safari will not play a `<video>` from a server that answers a range
   * request with the whole file: it asks for the first bytes, is handed two
   * hundred and a stream, and gives up. Chromium does not mind — it downloads
   * the lot and plays it — so the film ran everywhere except the one browser
   * that was being strict, which is also why seeking never moved off zero.
   *
   * `accept-ranges` goes on every response, including the ones that are not
   * ranged, because that is how a client learns it may ask.
   */
  const range = wanted(req.headers.range, size);
  if (range === false) {
    res.writeHead(416, { 'content-range': `bytes */${size}`, 'accept-ranges': 'bytes' });
    res.end();
    return;
  }

  const head: Record<string, string> = {
    'content-type': type,
    'cache-control': 'no-cache',
    'accept-ranges': 'bytes',
  };

  if (range) {
    const length = range.end - range.start + 1;
    res.writeHead(206, { ...head, 'content-length': String(length), 'content-range': `bytes ${range.start}-${range.end}/${size}` });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file, { start: range.start, end: range.end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...head, 'content-length': String(size) });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
