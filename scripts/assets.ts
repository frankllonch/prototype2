/** Builds the stylesheet and the client bundle; shared by the static build and the WordPress theme. */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build, transform } from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
const STYLES = path.join(ROOT, 'src', 'styles');
const ENTRY = path.join(ROOT, 'src', 'client', 'index.ts');

/** Oldest browsers the output is written for. */
const TARGET = ['es2020', 'chrome109', 'edge109', 'firefox115', 'safari15.4', 'ios15.4'];

interface AssetOptions {
  /** Folder that receives site.css and js/. */
  readonly outDir: string;
  /** What `url('/fonts/` becomes in the stylesheet. */
  readonly fontsUrl: string;
}

export interface BuiltAssets {
  readonly stylesheets: number;
  /** Files written to js/. */
  readonly scripts: readonly string[];
  /** The chunks index.js imports as it loads, for preloading beside it. */
  readonly chunks: readonly string[];
}

export async function buildAssets({ outDir, fontsUrl }: AssetOptions): Promise<BuiltAssets> {
  const parts = (await readdir(STYLES)).filter((f) => f.endsWith('.css')).sort();
  let css = '';
  for (const part of parts) css += `${await readFile(path.join(STYLES, part), 'utf8')}\n`;
  css = css.replaceAll("url('/fonts/", `url('${fontsUrl}`);
  const { code } = await transform(css, { loader: 'css', minify: true, target: TARGET, legalComments: 'none' });
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'site.css'), code);

  const js = path.join(outDir, 'js');
  await rm(js, { recursive: true, force: true });
  const result = await build({
    entryPoints: [ENTRY],
    outdir: js,
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: true,
    sourcemap: true,
    target: TARGET,
    legalComments: 'none',
    chunkNames: '[name]-[hash]',
    metafile: true,
    logLevel: 'warning',
  });
  const outputs = Object.entries(result.metafile.outputs).filter(([file]) => file.endsWith('.js'));
  const entry = outputs.find(([file]) => path.basename(file) === 'index.js');
  const chunks = (entry?.[1].imports ?? [])
    .filter((i) => i.kind === 'import-statement')
    .map((i) => path.basename(i.path));
  return { stylesheets: parts.length, scripts: outputs.map(([file]) => path.basename(file)), chunks };
}
