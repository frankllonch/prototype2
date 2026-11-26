/** Renders the site to dist/ as static HTML. */
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildAssets } from '../scripts/assets.ts';
import type { Html } from './components/html.ts';
import { commissioned, colourChart, exhibitions, works, yearColours } from './content/load.ts';
import { EDITIONS } from './content/whats-color.ts';
import { BASE } from './content/paths.ts';
import { singleQuotes } from './content/quotes.ts';
import { ENDPOINT as INQUIRIES } from './content/inquiries.ts';
import {
  artworkDetailPage, artworkPage, commissionedPage, colourChartPage, exhibitionsPage,
  whatsColorPage, whatsColorEditionPage,
} from './pages/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
// DIST_DIR sends the build somewhere else, for trying a change without disturbing the dist/ a
// preview is being served from.
const DIST = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(ROOT, 'dist');

let pagesWritten = 0;

/** The entry's preload as layout() prints it, and the same with the entry's chunks beside it. */
const preload = (file: string) => `<link rel="modulepreload" href="${BASE}/js/${file}" />`;
const ENTRY_PRELOAD = preload('index.js');
let preloads = ENTRY_PRELOAD;

async function writePage(route: string, page: Html) {
  const dir = path.join(DIST, route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), singleQuotes(page.__html).replace(ENTRY_PRELOAD, preloads));
  pagesWritten++;
}

/** The stylesheet, the client bundle, and the files copied as they are. */
async function buildSiteAssets() {
  const { chunks } = await buildAssets({ outDir: DIST, fontsUrl: `${BASE}/fonts/` });
  preloads = ['index.js', ...chunks].map(preload).join('\n');
  for (const dir of ['fonts', 'video', 'img', 'about']) {
    await cp(path.join(ROOT, 'src', 'assets', dir), path.join(DIST, dir), { recursive: true });
  }
}

async function main() {
  /*
   * Everything is regenerated except the rendered images, which cost minutes to
   * make and never change unless `npm run images` is run.
   */
  if (existsSync(DIST)) {
    for (const entry of await readdir(DIST)) {
      if (entry === 'media' || entry === '.git') continue;
      await rm(path.join(DIST, entry), { recursive: true, force: true });
    }
  }
  await buildSiteAssets();

  // What's Color?
  await writePage('', whatsColorPage());
  await writePage('artwork', artworkPage(works, yearColours));
  for (const edition of EDITIONS) {
    await writePage(`whats-color/${edition.numeral.toLowerCase()}`, whatsColorEditionPage(edition));
  }
  await writePage('exhibitions', exhibitionsPage(exhibitions, commissioned));
  await writePage('commissioned', commissionedPage(commissioned));
  if (colourChart) await writePage('color-chart', colourChartPage());

  // Behind an open work the phone shows the gallery, faintly: the twelve paintings round it on the
  // gallery's two columns.
  const wall = works.filter((w) => w.cover);
  const AROUND = 12;
  for (const [i, work] of works.entries()) {
    const at = wall.indexOf(work);
    const from = Math.max(0, Math.min(Math.floor(at / 2) * 2 - 4, wall.length - AROUND));
    const around = at < 0 ? [] : wall.slice(from, from + AROUND);
    await writePage(`artwork/${work.slug}`, artworkDetailPage(work, works[i - 1], works[i + 1], { index: i + 1, total: works.length }, around));
  }

  const wc = EDITIONS.map((e) => `${e.numeral}:${e.participants.length}`).join(' ');
  console.log(
    `Built ${pagesWritten} pages: what's color (${EDITIONS.length} editions, ${wc}), ` +
    `artwork (${works.length} works, ${yearColours.length} years), ` +
    `exhibitions (${exhibitions.length}), commissioned (${commissioned.length}), color chart.` +
    (BASE ? `\nBase path: ${BASE}` : ''),
  );
  /* Said out loud, because the one way to ship this broken is quietly. */
  if (!INQUIRIES) {
    console.warn('! INQUIRIES_ENDPOINT is not set — the colour chart order form will not send (server/inquiries/)');
  }
}

await main();
