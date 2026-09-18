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
import { collaborations, colourChart, exhibitions, works, workYears } from './content/load.ts';
import { BASE } from './content/paths.ts';
import {
  artworkDetailPage, artworkPage, collaborationItem, colourChartPage, exhibitionItem, panelGridPage,
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
  // dist/media (the rendered images) is kept; everything else is regenerated.
  for (const entry of ['site.css', 'js', 'fonts', 'index.html', 'artwork', 'exhibitions', 'collaborations', 'colour-chart']) {
    const target = path.join(DIST, entry);
    if (existsSync(target)) await rm(target, { recursive: true, force: true });
  }
  await buildAssets();

  await writePage('', artworkPage(works, workYears));
  await writePage('exhibitions', panelGridPage({
    title: 'Exhibitions', path: '/exhibitions/', kind: 'exhibition', items: exhibitions.map(exhibitionItem),
  }));
  await writePage('collaborations', panelGridPage({
    title: 'Collaborations', path: '/collaborations/', kind: 'collaboration', items: collaborations.map(collaborationItem),
  }));
  if (colourChart) await writePage('colour-chart', colourChartPage(colourChart));

  for (const [i, work] of works.entries()) {
    await writePage(`artwork/${work.slug}`, artworkDetailPage(work, works[i - 1], works[i + 1]));
  }

  console.log(
    `Built ${pagesWritten} pages: artwork (${works.length} works, ${workYears.length} years), ` +
    `exhibitions (${exhibitions.length}), collaborations (${collaborations.length}), colour chart.` +
    (BASE ? `\nBase path: ${BASE}` : ''),
  );
}

await main();
