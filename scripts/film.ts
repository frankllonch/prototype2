/**
 * Prepares the opening film for serving, and makes its poster.
 *
 * Run after replacing `src/assets/video/whats-color.mp4` with a new cut:
 *
 *   npm run film
 *
 * Two jobs, both cheap and both easy to forget by hand.
 *
 * The first is faststart. An MP4 carries an index — the `moov` atom — and most
 * editors leave it at the end of the file, after the frames. A browser cannot
 * begin playing until it has read that index, so with it at the end the whole
 * file has to arrive before the first frame appears: seven megabytes of wait on
 * the first thing anyone sees. Moving it to the front is a remux, not a
 * re-encode — the frames are copied across untouched, so nothing is lost and
 * nothing is spent on quality.
 *
 * The second is the poster, which is simply the film's own first frame. Doing
 * it here rather than by hand is the point: a poster that was right for an
 * earlier cut is worse than none at all, because it shows a frame the film no
 * longer opens on. Re-cut the film, run this, and the two cannot disagree.
 */
import { execFile } from 'node:child_process';
import { rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src', 'assets', 'video');
const FILM = path.join(DIR, 'whats-color.mp4');
const POSTER = path.join(DIR, 'whats-color-poster.jpg');
const TEMP = path.join(DIR, '.whats-color.remux.mp4');

/** Where the index sits. `moov` before `mdat` is what lets a film stream. */
async function atomOrder(file: string): Promise<string[]> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=format_name', '-of', 'default=nw=1', file,
  ]).catch(() => ({ stdout: '' }));
  if (!stdout) throw new Error(`ffprobe could not read ${file}`);

  // Read the top-level atom names straight off the front of the file.
  const { readFile } = await import('node:fs/promises');
  const buf = await readFile(file);
  const names: string[] = [];
  let at = 0;
  while (at + 8 <= buf.length) {
    const size = buf.readUInt32BE(at);
    names.push(buf.toString('latin1', at + 4, at + 8));
    if (size === 0) break;
    at += size === 1 ? Number(buf.readBigUInt64BE(at + 8)) : size;
  }
  return names;
}

async function main() {
  const before = (await stat(FILM)).size;
  const order = await atomOrder(FILM);
  const moov = order.indexOf('moov');
  const mdat = order.indexOf('mdat');
  const streams = moov >= 0 && mdat >= 0 && moov < mdat;

  console.log(`film: ${order.join(' ')}`);

  if (streams) {
    console.log('faststart: already set, leaving the file alone');
  } else {
    await run('ffmpeg', ['-v', 'error', '-i', FILM, '-c', 'copy', '-movflags', '+faststart', TEMP, '-y']);
    await rename(TEMP, FILM);
    const after = (await stat(FILM)).size;
    const now = await atomOrder(FILM);
    if (now.indexOf('moov') > now.indexOf('mdat')) throw new Error('remux did not move the index');
    console.log(`faststart: index moved to the front (${now.join(' ')}), ${before} -> ${after} bytes`);
  }

  // The first frame, at the film's own size.
  await run('ffmpeg', ['-v', 'error', '-i', FILM, '-frames:v', '1', '-q:v', '3', POSTER, '-y']);
  const poster = (await stat(POSTER)).size;
  console.log(`poster: first frame written, ${poster} bytes`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
