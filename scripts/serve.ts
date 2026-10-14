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
  '.json': 'application/json',
};

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
   * Markup, styles and scripts are never stored; everything else may be, but
   * must be checked.
   *
   * `no-cache` was not enough. It permits the browser to keep the response and
   * only asks it to revalidate first — and nothing here sends an ETag or a
   * Last-Modified for it to revalidate against, so what happens next is up to
   * the browser. In practice a rebuild would show on a hard reload and not on
   * an ordinary click, which looks exactly like the build having failed.
   * `no-store` forbids keeping it at all, so a click always fetches what is on
   * disk now.
   *
   * Only the small text files: the rendered images are hundreds of megabytes
   * and almost never change, and re-fetching them on every page would make the
   * preview useless.
   */
  const ext = path.extname(file);
  const volatile = ext === '.html' || ext === '.css' || ext === '.js' || ext === '';
  res.writeHead(200, {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'cache-control': volatile ? 'no-store, must-revalidate' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
