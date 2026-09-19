#!/usr/bin/env sh
# Builds for GitHub Pages (served from /<repo>/) and force-pushes dist/ to gh-pages.
set -e
REPO=${1:-prototype2}
BASE_PATH="/$REPO" npm run build
cd dist
touch .nojekyll
[ -d .git ] || git init -q
git checkout -q -B gh-pages
git add -A
git -c user.name="Frank Llonch" -c user.email="llonchfrank@gmail.com" commit -q -m "Deploy" || true
git push -f -q "https://github.com/frankllonch/$REPO.git" gh-pages
cd ..
# The Pages build carries /$REPO/ in every URL; put a root build back for local preview.
npm run build >/dev/null
echo "https://frankllonch.github.io/$REPO/"
