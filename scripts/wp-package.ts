/**
 * The site, packed for a server.
 *
 *   npm run wp:package                 the theme and the plugin, the theme's
 *                                      assets built fresh from src/ first
 *   npm run wp:package -- --bundle     …and the content bundle as one zip
 *   npm run wp:package -- --skip-assets   the theme's assets as they stand
 *
 * Writes wordpress/package/ (not committed): the two zips WordPress installs
 * from its own screens (Plugins → Add New → Upload, Appearance → Themes → Add
 * New → Upload), the bundle the importer reads, a list of checksums, and
 * INSTALL.txt — the steps, in order, for a fresh WordPress at the host.
 *
 * The same files are what the rehearsal installs (wordpress/rehearsal/), so a
 * package is only handed over after it has gone onto a clean WordPress once.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WP = path.join(ROOT, 'wordpress');
const OUT = path.join(WP, 'package');
const THEME = path.join(WP, 'themes', 'claudiavalsells');
const PLUGIN = path.join(WP, 'plugins', 'claudiavalsells-content');

const args = process.argv.slice(2);
const withBundle = args.includes('--bundle');
const skipAssets = args.includes('--skip-assets');

const header = (file: string, field: string): string =>
  new RegExp(`^\\s*\\*?\\s*${field}:\\s*(.+)$`, 'm').exec(readFileSync(file, 'utf8'))?.[1]?.trim() ?? '?';

const size = (file: string): string => {
  const mb = statSync(file).size / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.ceil(mb * 1024)} KB`;
};

const sha256 = async (file: string): Promise<string> =>
  createHash('sha256').update(await readFile(file)).digest('hex');

/** zip, run from `cwd`, storing `entry` and everything under it; `store` skips compression (photographs gain nothing). */
function zip(cwd: string, out: string, entry: string, store = false): void {
  execFileSync('zip', ['-r', '-X', '-q', ...(store ? ['-0'] : []), out, entry, '-x', '*.DS_Store', '*/.DS_Store'], { cwd, stdio: 'inherit' });
}

if (!skipAssets) {
  execFileSync(process.execPath, ['--experimental-strip-types', path.join(ROOT, 'scripts', 'wp-assets.ts')], { stdio: 'inherit' });
}
for (const need of ['site.css', 'version.txt', 'js/index.js', 'modules.json', 'whats-color-sheets.json']) {
  if (!existsSync(path.join(THEME, 'assets', need))) {
    throw new Error(`The theme's assets are missing ${need} — run npm run wp:assets (or drop --skip-assets).`);
  }
}
for (const lang of ['es_ES', 'ca']) {
  if (!existsSync(path.join(PLUGIN, 'languages', `claudiavalsells-${lang}.mo`))) {
    throw new Error(`The plugin's ${lang} translation is not compiled (languages/claudiavalsells-${lang}.mo).`);
  }
}

// Emptied, not removed: the rehearsal WordPress (wordpress/rehearsal/) has
// this folder mounted, and a folder deleted and made again is a different
// folder to a container that already holds the old one.
await mkdir(OUT, { recursive: true });
for (const entry of await readdir(OUT)) await rm(path.join(OUT, entry), { recursive: true, force: true });

const themeZip = path.join(OUT, 'claudiavalsells-theme.zip');
const pluginZip = path.join(OUT, 'claudiavalsells-content.zip');
zip(path.dirname(THEME), themeZip, 'claudiavalsells');
zip(path.dirname(PLUGIN), pluginZip, 'claudiavalsells-content');

const files = [themeZip, pluginZip];
let bundleNote = 'The content bundle is the folder wordpress/import (run npm run wp:export first); upload it as it is.';
if (withBundle) {
  if (!existsSync(path.join(WP, 'import', 'manifest.json'))) throw new Error('No bundle: run npm run wp:export first.');
  const bundleZip = path.join(OUT, 'claudiavalsells-import.zip');
  zip(WP, bundleZip, 'import', true);
  files.push(bundleZip);
  bundleNote = 'claudiavalsells-import.zip is the content bundle: unzip it on the server so that wp-content/import/manifest.json exists.';
}

// The bundle is optional to the package: without one exported, say so rather
// than stop with half the package written.
const manifestFile = path.join(WP, 'import', 'manifest.json');
const manifest = (existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {}) as { generatedAt?: string };
if (!manifest.generatedAt) bundleNote = 'No content bundle exported yet: run npm run wp:export, then upload wordpress/import.';
const stamp = readFileSync(path.join(THEME, 'assets', 'version.txt'), 'utf8').trim();
const sums = await Promise.all(files.map(async (f) => `${await sha256(f)}  ${path.basename(f)}`));
await writeFile(path.join(OUT, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);

const install = `Claudia Valsells — installing the site on a server
${'='.repeat(52)}

Packed ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.
  claudiavalsells-theme.zip     theme ${header(path.join(THEME, 'style.css'), 'Version')}, assets build ${stamp}   ${size(themeZip)}
  claudiavalsells-content.zip   plugin ${header(path.join(PLUGIN, 'claudiavalsells-content.php'), 'Version')}   ${size(pluginZip)}
  Content bundle of ${manifest.generatedAt ?? '— none exported yet'}.
  ${bundleNote}

On a fresh WordPress (latest version, PHP 8.1 or newer), in this order:

 1. wp-config.php, before "That's all, stop editing!":
      on staging:   define( 'WP_ENVIRONMENT_TYPE', 'staging' );
      everywhere:   define( 'DISALLOW_FILE_EDIT', true );
    The live site sets no environment type: it is production by default.
 2. Plugins → Add New Plugin → Upload Plugin: claudiavalsells-content.zip,
    Install, Activate.
 3. Appearance → Themes → Add New Theme → Upload Theme:
    claudiavalsells-theme.zip, Install, Activate. If the upload is refused as
    too large (the theme carries the film), upload the folder claudiavalsells
    from the zip by SFTP into wp-content/themes/ and activate it from
    Appearance → Themes.
 4. Plugins → Add New Plugin: search "Modern Image Formats", Install,
    Activate. (Its settings are made by the import.)
 5. By SFTP, upload the content bundle so that wp-content/import/manifest.json
    exists on the server.
 6. Tools → Import content → Import. Keep the page open until it says the
    import is complete — some minutes the first time.
 7. Settings → Site texts: where the order form sends (on staging, your own
    address).
 8. Tools → Site check: everything red is fixed before anyone else sees the
    site; send the test message and check it arrives.
 9. On the live site only, after the last import: delete wp-content/import by
    SFTP.

To check the files arrived whole: shasum -a 256 -c SHA256SUMS.txt
`;
await writeFile(path.join(OUT, 'INSTALL.txt'), install);

console.log(`Package in ${path.relative(ROOT, OUT)}/:`);
for (const f of files) console.log(`  ${path.basename(f).padEnd(30)} ${size(f)}`);
console.log('  INSTALL.txt, SHA256SUMS.txt');
