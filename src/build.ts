/**
 * Renders the site to dist/ as static HTML.
 *
 * Four pages and the artwork details. Every route is a pure function of the
 * dataset, so the build is deterministic: same content in, same pages out.
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { Html } from './components/html.ts';
import { commissioned, colourChart, exhibitions, works, yearColours } from './content/load.ts';
import { BASE } from './content/paths.ts';
import {
  artworkDetailPage, artworkPage, commissionedPage, colourChartPage, exhibitionsPage,
} from './pages/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CLIENT = path.join(ROOT, 'src', 'client');

let pagesWritten = 0;

async function writePage(route: string, page: Html) {
  const dir = path.join(DIST, route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), page.__html);
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
   *
   * Swept rather than named one by one. A list of routes to delete looks tidier
   * and is quietly wrong the first time a route is renamed: the old directory is
   * not on the list, so nothing removes it, and it sits in dist being deployed
   * long after the page that made it is gone. Renaming Collaborations to
   * Commissioned left exactly that behind.
   */
  if (existsSync(DIST)) {
    for (const entry of await readdir(DIST)) {
      if (entry === 'media' || entry === '.git') continue;
      await rm(path.join(DIST, entry), { recursive: true, force: true });
    }
  }
  await buildAssets();

  await writePage('', artworkPage(works, yearColours));
  await writePage('exhibitions', exhibitionsPage(exhibitions, yearColours));
  await writePage('commissioned', commissionedPage(commissioned, yearColours));
  if (colourChart) await writePage('colour-chart', colourChartPage(colourChart));

  for (const [i, work] of works.entries()) {
    await writePage(`artwork/${work.slug}`, artworkDetailPage(work, works[i - 1], works[i + 1]));
  }

  console.log(
    `Built ${pagesWritten} pages: artwork (${works.length} works, ${yearColours.length} years), ` +
    `exhibitions (${exhibitions.length}), commissioned (${commissioned.length}), colour chart.` +
    (BASE ? `\nBase path: ${BASE}` : ''),
  );
}

await main();
