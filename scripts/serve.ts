/** Static file server for previewing dist/. Zero dependencies. */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

// DIST_DIR serves another build folder (see src/build.ts).
const DIST = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.resolve(import.meta.dirname, '..', 'dist');
const PORT = Number(process.env.PORT ?? 4321);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.avif': 'image/avif', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

/** Which bytes the client asked for, or null for all of them. */
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
  /* `no-cache`, deliberately, and not `no-store`. */
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  const { size, mtime } = await stat(file);

  /* And something to check *against*. */
  const etag = `"${size.toString(36)}-${mtime.getTime().toString(36)}"`;
  const lastModified = mtime.toUTCString();
  const unchanged = req.headers['if-none-match']
    ? req.headers['if-none-match'].split(/\s*,\s*/).includes(etag)
    : req.headers['if-modified-since'] === lastModified;
  if (unchanged && !req.headers.range) {
    res.writeHead(304, { etag, 'last-modified': lastModified, 'cache-control': 'no-cache' });
    res.end();
    return;
  }

  /* Byte ranges, which are what makes video work at all in Safari. */
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
    etag,
    'last-modified': lastModified,
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
