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
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
