/** Builds the theme's assets from the same source the static site is built from. */
import { cp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildAssets } from './assets.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const THEME = path.join(ROOT, 'wordpress', 'themes', 'claudiavalsells');
const ASSETS = path.join(THEME, 'assets');

async function main() {
  await rm(ASSETS, { recursive: true, force: true });

  // The stylesheet sits beside its fonts folder, so the font paths are relative.
  const built = await buildAssets({ outDir: ASSETS, fontsUrl: 'fonts/' });

  await cp(path.join(SRC, 'assets', 'fonts'), path.join(ASSETS, 'fonts'), { recursive: true });
  await cp(path.join(SRC, 'assets', 'video'), path.join(ASSETS, 'video'), { recursive: true });
  await cp(path.join(SRC, 'assets', 'about'), path.join(ASSETS, 'about'), { recursive: true });
  // Page artwork that is not catalogue work — the plate on the first edition's sheet — travels
  // with the theme as the static build carries it to dist/img.
  if (existsSync(path.join(SRC, 'assets', 'img'))) {
    await cp(path.join(SRC, 'assets', 'img'), path.join(ASSETS, 'img'), { recursive: true });
  }
  for (const dir of ['fonts', 'video', 'about', 'img']) await rm(path.join(ASSETS, dir, '.DS_Store'), { force: true });

  // The theme versions the stylesheet and the entry script with this stamp; the entry's chunks
  // carry a content hash in their names.
  await writeFile(path.join(ASSETS, 'version.txt'), String(Date.now()));
  // What the theme preloads (cv_modules() in inc/setup.php).
  await writeFile(path.join(ASSETS, 'modules.json'), JSON.stringify(['index']));

  // Where everything sits on What's Color's composed sheets, as the static site places it
  // (src/content/whats-color-sheet.ts).
  const sheets = await import('../src/content/whats-color-sheet.ts');
  await writeFile(
    path.join(ASSETS, 'whats-color-sheets.json'),
    JSON.stringify({
      I: sheets.SHEET_I,
      II: sheets.SHEET_II,
      III: sheets.SHEET_III,
      charts: { II: sheets.CHART_II },
    }),
  );

  // The one line break the phone's commissioned index sets by hand, as the words of the name it
  // comes after, by the project's slug (BREAK_AFTER in src/content/groups.ts, read here the way
  // the static page reads it: off the grouped projects).
  const { commissioned } = await import('../src/content/load.ts');
  const { groupCommissioned } = await import('../src/content/groups.ts');
  const breaks: Record<string, string> = {};
  for (const group of groupCommissioned(commissioned)) {
    for (const item of group.items) if (item.breakAfter) breaks[item.slug] = item.breakAfter;
  }
  await writeFile(path.join(ASSETS, 'index-breaks.json'), JSON.stringify(breaks));

  console.log(`Theme assets: ${built.stylesheets} stylesheets into site.css, ${built.scripts.length} scripts, fonts, film, About photographs.`);
}

await main();
