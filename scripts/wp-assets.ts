/**
 * Builds the theme's assets from the same source the static site is built from.
 *
 *   npm run wp:assets
 *
 * One stylesheet from the numbered parts under src/styles, with the font paths
 * made relative to it; one JavaScript module per client file, exactly as
 * src/build.ts makes them; and the fonts, the film and the two studio
 * photographs copied beside them. Everything lands in the theme's assets folder,
 * which is build output and not committed — the theme is packaged after this has
 * run.
 *
 * Nothing is forked. The design has one source, and this and the static build
 * are two readers of it.
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const THEME = path.join(ROOT, 'wordpress', 'themes', 'claudiavalsells');
const ASSETS = path.join(THEME, 'assets');

async function main() {
  await rm(ASSETS, { recursive: true, force: true });
  await mkdir(path.join(ASSETS, 'js'), { recursive: true });

  const styles = path.join(SRC, 'styles');
  const parts = (await readdir(styles)).filter((f) => f.endsWith('.css')).sort();
  let css = '';
  for (const part of parts) css += `${await readFile(path.join(styles, part), 'utf8')}\n`;
  // The stylesheet sits in assets/ and the fonts in assets/fonts/, so the
  // absolute paths the static site uses become relative ones here.
  css = css.replaceAll("url('/fonts/", "url('fonts/");
  await writeFile(path.join(ASSETS, 'site.css'), css);

  await cp(path.join(SRC, 'assets', 'fonts'), path.join(ASSETS, 'fonts'), { recursive: true });
  await cp(path.join(SRC, 'assets', 'video'), path.join(ASSETS, 'video'), { recursive: true });
  await cp(path.join(SRC, 'assets', 'about'), path.join(ASSETS, 'about'), { recursive: true });
  // Page artwork that is not catalogue work — the plate on the first edition's
  // sheet — travels with the theme as the static build carries it to dist/img.
  if (existsSync(path.join(SRC, 'assets', 'img'))) {
    await cp(path.join(SRC, 'assets', 'img'), path.join(ASSETS, 'img'), { recursive: true });
  }
  for (const dir of ['fonts', 'video', 'about', 'img']) await rm(path.join(ASSETS, dir, '.DS_Store'), { force: true });

  // A stamp the theme reads to version its asset URLs, so a rebuild is a new
  // address and no browser keeps serving the old one. The modules' own imports
  // carry the same stamp: a browser keys its module map by the full URL, so a
  // preload of `panels.js?v=…` only counts for an import that names exactly
  // that, and a rebuild re-addresses every module rather than the entry alone.
  const stamp = String(Date.now());
  const client = path.join(SRC, 'client');
  const files = (await readdir(client)).filter((f) => f.endsWith('.ts'));
  for (const file of files) {
    const source = await readFile(path.join(client, file), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    await writeFile(
      path.join(ASSETS, 'js', file.replace(/\.ts$/, '.js')),
      outputText.replace(/from '(\.\/[\w-]+)\.ts'/g, `from '$1.js?v=${stamp}'`),
    );
  }
  await writeFile(path.join(ASSETS, 'version.txt'), stamp);

  // The modules in the order the entry boots them, for the theme's preloads:
  // read off index.ts's own imports, so a module added there is preloaded in
  // WordPress without anyone remembering to list it.
  const entry = await readFile(path.join(client, 'index.ts'), 'utf8');
  const booted = [...entry.matchAll(/from '\.\/([\w-]+)\.ts'/g)].map((m) => m[1]!);
  const order = ['env', ...booted.filter((m) => m !== 'env')];
  const rest = files.map((f) => f.replace(/\.ts$/, '')).filter((m) => m !== 'index' && !order.includes(m));
  await writeFile(path.join(ASSETS, 'modules.json'), JSON.stringify([...order, ...rest, 'index']));

  // Where everything sits on What's Color's composed sheets, as the static
  // site places it (src/content/whats-color-sheet.ts). The placement is
  // layout, owned by the design; the theme reads it from here rather than
  // keeping a copy that drifts every time a sheet is re-traced.
  const sheets = await import('../src/content/whats-color-sheet.ts');
  await writeFile(
    path.join(ASSETS, 'whats-color-sheets.json'),
    JSON.stringify({ I: sheets.SHEET_I, II: sheets.SHEET_II, III: sheets.SHEET_III, books: sheets.BOOKS_III }),
  );

  console.log(`Theme assets: ${parts.length} stylesheets into site.css, ${files.length} modules, fonts, film, About photographs.`);
}

await main();
