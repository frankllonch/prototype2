/**
 * Publishes the built site to GitHub Pages.
 *
 * It deploys from here rather than from CI, and that is not a shortcut. The
 * photographs, the crops and everything else under content/raw are deliberately
 * not in the repository — they are hundreds of megabytes of someone else's
 * photography — so a runner that checked out this repository could not build the
 * site at all. The machine with the source images is the machine that can
 * publish it.
 *
 * dist/ carries a git repository of its own, pointed at the same remote. Nothing
 * built is ever committed to main; the branch below holds only output, and is
 * overwritten each time, because it is a build artefact and its history is of no
 * interest.
 *
 *   npm run deploy
 *
 * The site goes to https://<user>.github.io/<repo>/, so it is built with that
 * prefix. Pass --dry-run to build and stage without pushing.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

/**
 * Output only. Never main, and the guard below makes sure of it — typed wide on
 * purpose, so the check is against whatever this is edited to rather than against
 * a literal the compiler has already decided the answer for.
 */
const BRANCH: string = 'gh-pages';

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** For questions whose answer may be "no": git writes to stderr, which is not news. */
function tryGit(args: string[], cwd: string): string | null {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (BRANCH === 'main' || BRANCH === 'master') {
    throw new Error('refusing to deploy over the source branch');
  }

  const remote = git(['remote', 'get-url', 'origin'], ROOT);
  const repo = remote.replace(/\.git$/, '').split('/').slice(-2).join('/');
  const [owner, name] = repo.split('/');
  const base = `/${name}`;
  const url = `https://${owner}.github.io/${name}/`;

  // Everything published should be traceable to a commit. A dirty tree is not a
  // refusal — a prototype gets shown before it is tidied — but it is recorded.
  const dirty = git(['status', '--porcelain'], ROOT).length > 0;
  const head = git(['rev-parse', '--short', 'HEAD'], ROOT);
  const subject = git(['log', '-1', '--pretty=%s'], ROOT);
  if (dirty) console.warn('! working tree has uncommitted changes — deploying them anyway');

  console.log(`Building for ${url}`);
  execFileSync('npm', ['run', 'build'], {
    cwd: ROOT,
    env: { ...process.env, BASE_PATH: base },
    stdio: 'inherit',
  });

  // Without this, Pages runs the output through Jekyll, which quietly drops any
  // path beginning with an underscore.
  await writeFile(path.join(DIST, '.nojekyll'), '');

  if (!existsSync(path.join(DIST, 'index.html'))) throw new Error('build produced no index.html');

  if (!existsSync(path.join(DIST, '.git'))) {
    console.log(`Preparing ${path.relative(ROOT, DIST)} as a ${BRANCH} checkout`);
    git(['init', '-q', '-b', BRANCH], DIST);
  }
  // Set every run rather than only at init. A dist/.git left over from an earlier
  // attempt has no remote, and the push then fails after the whole build — which
  // is a long way to go to find out.
  if (tryGit(['remote', 'get-url', 'origin'], DIST) === null) {
    git(['remote', 'add', 'origin', remote], DIST);
  } else {
    git(['remote', 'set-url', 'origin', remote], DIST);
  }
  // The source repository ignores dist/ wholesale; this one must not inherit that.
  await writeFile(path.join(DIST, '.gitignore'), '.git/\n');

  git(['add', '-A'], DIST);
  const staged = tryGit(['diff', '--cached', '--stat'], DIST) ?? '';
  const nothing = staged.length === 0;

  if (nothing) {
    console.log('Nothing changed since the last deploy.');
  } else {
    git(['commit', '-q', '-m', `Build ${head}${dirty ? '+dirty' : ''} — ${subject}`.slice(0, 160)], DIST);
  }

  if (dryRun) {
    console.log(`[dry run] staged in ${path.relative(ROOT, DIST)}; not pushed`);
    return;
  }

  const sizeMb = Math.round(Number(execFileSync('du', ['-sk', DIST], { encoding: 'utf8' }).split(/\s+/)[0]) / 1024);
  console.log(`Pushing ${sizeMb} MB to ${repo} ${BRANCH}…`);
  // Force, because this branch is regenerated rather than developed. It holds no
  // work that could be lost.
  execFileSync('git', ['push', '-f', 'origin', `HEAD:${BRANCH}`], { cwd: DIST, stdio: 'inherit' });

  console.log(`\nDeployed. ${url}`);
  console.log(`Pages must be set to serve ${BRANCH} / (root) — once, in the repository settings.`);
}

await main();
