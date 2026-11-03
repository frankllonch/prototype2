# The WordPress site

claudiavalsells.com as a WordPress theme, with Claudia editing everything in the
block editor. The design has one source — `src/` in this repository — and this
folder is its WordPress reading: the stylesheet and the client scripts are
copied in unchanged, and each PHP component under `themes/claudiavalsells/inc/`
is the port of one TypeScript component, emitting the same markup.

```
wordpress/
  .wp-env.json                       Local WordPress in Docker (wp-env)
  themes/claudiavalsells/            The theme
    inc/                             setup, colour, size, image, content; components/
    assets/                          Built by `npm run wp:assets` — not committed
    *.php                            One template per page of the site
  plugins/claudiavalsells-content/   Content types, fields, redirects, the order desk
    includes/                        post-types, queries, editor, settings, redirects, inquiries, colours
    admin/editor.js                  The fields panel beside each entry (no build step)
    import.php                       Brings the content in from the bundle
  import/                            The bundle `npm run wp:export` writes — not committed
```

## Running it locally

Docker Desktop must be running.

```bash
npm install
npm run wp:assets        # src/ → themes/claudiavalsells/assets
npm run wp:start         # WordPress at http://localhost:8888 (admin / password)
npm run wp:export        # content/ + crops → wordpress/import (~310 MB)
npm run wp:import        # into the local WordPress: minutes the first time
```

`wp-env start` resets WordPress's permalink setting to its own default each
time it sets the environment up; Tools → Site check says so when it happens,
and `npx wp-env run cli wp rewrite structure '/%postname%/' --hard` puts it
back.

`wp:start` activates the plugin; the theme is activated once with

```bash
cd wordpress && npx wp-env run cli wp theme activate claudiavalsells
```

`npm run wp:stop` stops the containers; the database persists between runs.
After editing `src/styles` or `src/client`, run `wp:assets` again — the built
files carry a stamp, so browsers fetch the new ones.

The import runs again safely: entries are found by their address (or the key
the first run stamped on them, so a changed permalink is not a second copy)
and updated, pictures by the id the bundle gave them and reused. An entry
edited in WordPress since the last run is kept as it is and reported — what
Claudia typed outranks the bundle. To overwrite anyway:

```bash
cd wordpress && npx wp-env run cli wp --exec='define("CV_IMPORT_OVERWRITE", true);' eval-file wp-content/plugins/claudiavalsells-content/import.php
```

The site's settings (name, timezone, permalinks, search engines kept out) are
set on the first run only.

## The admin in Spanish or Catalan

The plugin ships its labels in both (`plugins/claudiavalsells-content/languages/`).
WordPress itself is translated by its language packs: Settings → General →
Site Language sets it for everyone, or each user picks their own under Users →
Profile → Language. The public site stays in English either way. After a
change to a label in the code:

```bash
cd wordpress
npx wp-env run cli wp i18n make-pot wp-content/plugins/claudiavalsells-content wp-content/plugins/claudiavalsells-content/languages/claudiavalsells.pot --domain=claudiavalsells --exclude=languages
cd plugins/claudiavalsells-content/languages
msgmerge --update --backup=none claudiavalsells-es_ES.po claudiavalsells.pot   # then translate the new entries
msgmerge --update --backup=none claudiavalsells-ca.po claudiavalsells.pot
msgfmt -o claudiavalsells-es_ES.mo claudiavalsells-es_ES.po
msgfmt -o claudiavalsells-ca.mo claudiavalsells-ca.po
cd ../../.. && npx wp-env run cli wp i18n make-json wp-content/plugins/claudiavalsells-content/languages --no-purge
```

## Pictures in WebP

The static site serves every picture as AVIF and WebP with a JPEG behind
them. WordPress does the same with the **Modern Image Formats** plugin
(`webp-uploads`, by the WordPress performance team), set to WebP with JPEG
kept (Settings → Media); the theme reads the formats it writes into each
picture's metadata and offers them in the same `<picture>` markup. Pictures
uploaded before the plugin was on need regenerating once:

```bash
cd wordpress && npx wp-env run cli wp media regenerate --yes
```

The local site has it from `.wp-env.json`; on the host, install it from
Plugins → Add New.

## What is where in the admin

| Menu | Holds |
|---|---|
| Artwork | One entry per painting: the picture, year, dimensions, materials, reference, available, and the photograph of it in place |
| Commissioned | The projects, in groups (Commissioned, Education, Solidary) |
| Exhibitions | Every show and fair. One with text or photographs opens as a page; one without is a line in the list. "In the record as" decides which About column lists it |
| What's Color? | The editions: each entry's text is Claudia's paragraphs in the order the page sets them between the people. Under it, Answers: one person per entry, filed under an edition |
| Pages → About | The card (city, year, phone, emails), the biography with its photographs, the collections |
| Pages → Color Chart | The text, the price, the bands |
| Settings → Site texts | The description, the What's Color? note, the opening screen's lines, and where the order form sends |

Order of things: works newest year first; exhibitions and commissioned work in
the order they were listed, with anything new on top. An entry saved without
a year is given the current one — the year is what everything is ordered
by, and the field is there to correct it.

The three editions of What's Color? are compositions the designer drew by
hand — which column each person sits in, how far down, where the photographs
and Claudia's paragraphs fall. That placement is layout, so it lives in the
theme (`inc/components/whats-color.php`, mirroring
`src/content/whats-color-sheet.ts`), not in the editor. Claudia edits the
words; a person she adds to an edition appears after the composition, column
by column, until the sheet is redrawn to place them.

## Keeping the two in step

The design has one source and two readers. After a change in `src/`:

```bash
npm run build && npm run wp:assets && npm run wp:diff
```

`wp:diff` reads each page from `dist/` and from the local WordPress and
diffs the markup, with what differs on purpose set aside (asset addresses,
pictures' renditions, About's address). It compares the head as well — title,
description, canonical, the tags search engines and link previews read, the
preloads — reported apart from the body. A page that differs means a PHP
component has not been brought along with its TypeScript one.

Two things follow on their own with `wp:assets`: the list of client modules
the theme preloads (read off `src/client/index.ts`), and where everything
sits on What's Color's three sheets (`src/content/whats-color-sheet.ts`,
written to `assets/whats-color-sheets.json`). A re-traced sheet needs no PHP.

When the dataset changes (new photographs, a renamed show), `wp:export` and
`wp:import` again. The importer moves to the bin any entry it made earlier
that the bundle no longer names, unless it was edited in WordPress since.

## The order desk

The Colour Chart's form posts to `/wp-json/cv/v1/inquiries`. The same checks the
Cloudflare worker made (`server/inquiries/`) are made here: a honeypot, the
time the form was open, field shapes, header-safe values, a per-sender rate
limit and a daily ceiling. Mail goes out with `wp_mail()`; on the host, WP Mail
SMTP (or the host's own mailer) carries it. The address it sends to is in
Settings → Site texts and nowhere on the page.

On this Mac there is no mail server in Docker, so on a site whose environment
is `local` and whose address is this machine's, every message is written to
`wp-content/cv-mail.log.php` instead (`includes/environment.php`) — a file a
browser cannot read. Set a test recipient and send one through the endpoint to
see exactly what Claudia would receive:

```bash
cd wordpress && npx wp-env run cli wp option update cv_inquiry_to orders@example.test
curl -s -X POST http://localhost:8888/wp-json/cv/v1/inquiries \
  --data-urlencode name=Ana --data-urlencode email=ana@example.test \
  --data-urlencode 'message=One colour chart, please.' \
  --data-urlencode started=$(node -e 'console.log(Date.now()-15000)')
docker exec wp-env-wordpress-b532b15e-wordpress-1 cat /var/www/html/wp-content/cv-mail.log.php
```

Once a privacy notice is published (Settings → Privacy), a line under the form
links to it.

## Which site is this

`WP_ENVIRONMENT_TYPE` in `wp-config.php` says, and a site that does not say is
production. Staging sets `define( 'WP_ENVIRONMENT_TYPE', 'staging' );`. Anywhere
but production the admin bar says so in red on every page, and every page
sends search engines a no-index header on top of Settings → Reading — so a
staging copy can never be mistaken for, or compete with, the live site.

## Tools → Site check

The go-live checklist, read from the site as it is each time the page opens:
search engines, HTTPS, permalinks, the theme's built files, the privacy notice,
the order form's recipient and how mail leaves the server (with a button that
sends a test message), the redirect rules and one redirect requested from
outside, the sitemap, what the server can make of pictures, PHP and its
limits, a page cache, debug output, an account named "admin", code editing
from the admin, a security plugin. Each line is right, to look at, or to fix,
judged for the kind of site it is — what is right on staging (search engines
kept out) is to fix on production. The whole report also comes as text, to
paste into an email to the host: on staging it answers the plan's questions
about PHP and images by itself.

## Old addresses

Every address the old site published answers with a permanent redirect to its
new home — `includes/redirects.php`, and section 5 of
`docs/wordpress-migration.md` in words.

`old-urls.txt` is the list of them, taken while the old site was still up so
the check never needs it: what its sitemaps named (the pages, each picture's
own page, the sitemaps themselves), the pages and pictures of the dataset,
and the one-offs the rules name; `--snapshot` takes it again, at the content
freeze. `npm run wp:check-links` asks a site for every one without following
redirects, follows them by hand, and passes an address that ends on a 200
where the rules — read out of `redirects.php` — send it, or that answers 200
itself where no rule applies. `--images` adds the pictures; `--csv` writes
the old path, where it ended and the outcome (301, unchanged, FAIL) of each:
`redirects.csv`, the list for Toni (the copy here is from the local site).
Run it against the staging before go-live and against the live address
right after:

```bash
npm run wp:check-links -- https://user:password@nova.claudiavalsells.com --images
npm run wp:check-links -- https://www.claudiavalsells.com --images --csv wordpress/redirects.csv
```

Until search engines are let in, the five sitemap addresses fail, since
WordPress serves no sitemap; on the local site, so do the pictures the import
did not bring.

## Packaging for a server

```bash
npm run wp:export                 # the content bundle, fresh
npm run wp:package                # → wordpress/package/
npm run wp:package -- --bundle    # …with the bundle as one zip as well
```

`wordpress/package/` then holds the theme and the plugin as the zips
WordPress installs from its own upload screens, `INSTALL.txt` — the steps for
a fresh WordPress at the host, in order — and `SHA256SUMS.txt`. The content
bundle goes up by SFTP into `wp-content/import/`.

### The import on a server

Where the host has WP-CLI:
`wp eval-file wp-content/plugins/claudiavalsells-content/import.php`.
Where it has not, **Tools → Import content**: it shows what the uploaded bundle
holds and imports it a few entries per request, each request stopping inside
the half-minute a shared host allows, with a progress bar and a log. A run cut
short — a closed tab, a dropped connection — is picked up where it stopped
("Continue the import"); every step can safely run twice. Both ways run the
same code (`includes/importer.php`). The first import into a site also makes
its settings (name, permalinks, search engines kept out, WebP).

Imported pictures are made at the six sizes the theme and the admin use, each
with a WebP beside it; WordPress's own 768, 1536 and 2048 are not made
(`inc/setup.php`).

### A rehearsal before every handover

`wordpress/rehearsal/` is a second, empty WordPress (http://localhost:8890,
marked as staging) that mounts only the package and the bundle — what a host
would have. A package is handed over after it has gone onto it once:

```bash
npm run wp:export && npm run wp:package
npm run wp:rehearsal              # fresh WordPress at :8890 (admin / password)
cd wordpress/rehearsal
npx wp-env run cli wp plugin install wp-content/package/claudiavalsells-content.zip --activate
npx wp-env run cli wp theme install wp-content/package/claudiavalsells-theme.zip --activate
npx wp-env run cli wp plugin install webp-uploads --activate
```

then Tools → Import content in its admin, Tools → Site check, and
`WP_URL=http://localhost:8890 npm run wp:diff` against the static build.
`npx wp-env destroy` in that folder throws it away.

Without any of this, a Duplicator package of the local site is still another
way across — see the plan — but it carries the local test account and
database with it, where a fresh install plus the import starts clean.
