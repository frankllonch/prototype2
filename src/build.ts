/** Renders the site to dist/ as static HTML. */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
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
const CLIENT = path.join(ROOT, 'src', 'client');

let pagesWritten = 0;

async function writePage(route: string, page: Html) {
  const dir = path.join(DIST, route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), singleQuotes(page.__html));
  pagesWritten++;
}

/** One stylesheet from the numbered parts; one JS module per client file. */
async function buildAssets() {
  await mkdir(path.join(DIST, 'js'), { recursive: true });

  const styles = path.join(ROOT, 'src', 'styles');
  const parts = (await readdir(styles)).filter((f) => f.endsWith('.css')).sort();
  let css = '';
  for (const part of parts) css += `${await readFile(path.join(styles, part), 'utf8')}\n`;
  await writeFile(path.join(DIST, 'site.css'), BASE ? css.replaceAll("url('/fonts/", `url('${BASE}/fonts/`) : css);
  await cp(path.join(ROOT, 'src', 'assets', 'fonts'), path.join(DIST, 'fonts'), { recursive: true });
  // The opening film, re-encoded for the web from the 168MB original on the live site.
  await cp(path.join(ROOT, 'src', 'assets', 'video'), path.join(DIST, 'video'), { recursive: true });
  // Page artwork that is not catalogue work, so it never goes through the image pipeline: the
  // plate on the first edition's sheet is one of these.
  await cp(path.join(ROOT, 'src', 'assets', 'img'), path.join(DIST, 'img'), { recursive: true });
  // The two studio photographs on About, already rendered at their serving sizes from the
  // originals in content/raw/about.
  await cp(path.join(ROOT, 'src', 'assets', 'about'), path.join(DIST, 'about'), { recursive: true });

  for (const file of (await readdir(CLIENT)).filter((f) => f.endsWith('.ts'))) {
    const source = await readFile(path.join(CLIENT, file), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    // Imports keep their `.ts` extension in source; the browser needs `.js`.
    await writeFile(path.join(DIST, 'js', file.replace(/\.ts$/, '.js')), outputText.replace(/from '(\.\/[\w-]+)\.ts'/g, "from '$1.js'"));
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
  await buildAssets();

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
