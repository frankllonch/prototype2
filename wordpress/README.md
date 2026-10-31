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
npm run wp:export        # content/ + crops → wordpress/import (~240 MB)
npm run wp:import        # into the local WordPress: 2 minutes
```

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
| Pages → Color Chart | The text, the price, the bands, the three photographs |
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
pictures' renditions, About's address). A page that differs means a PHP
component has not been brought along with its TypeScript one.

## The order desk

The Colour Chart's form posts to `/wp-json/cv/v1/inquiries`. The same checks the
Cloudflare worker made (`server/inquiries/`) are made here: a honeypot, the
time the form was open, field shapes, header-safe values, a per-sender rate
limit and a daily ceiling. Mail goes out with `wp_mail()`; on the host, WP Mail
SMTP (or the host's own mailer) carries it. The address it sends to is in
Settings → Site texts and nowhere on the page.

## Old addresses

Every address the old site published answers with a permanent redirect to its
new home — `includes/redirects.php`, and section 5 of
`docs/wordpress-migration.md` in words.

## Packaging for a server

```bash
npm run wp:assets
cd wordpress/themes && zip -r claudiavalsells.zip claudiavalsells
cd ../plugins && zip -r claudiavalsells-content.zip claudiavalsells-content
```

Upload both through Appearance → Themes and Plugins → Add New, copy
`wordpress/import/` to the server's `wp-content/import/`, and run the import
with WP-CLI there (`wp eval-file wp-content/plugins/claudiavalsells-content/import.php`).
Without WP-CLI on the host, a Duplicator package of the local site is the other
way across — see the plan.
