#!/bin/sh

# Exit if any command fails
set -e

ver=$(grep ver public/degust/js/version.coffee | sed -e 's/^.* = //')
ver="${ver//\'}"

echo "Copying v$ver."

if [ -z "$ver" ]; then
  echo "Version not found!"
  exit 1
fi

cp -r public/degust-dist/ docs/dist/$ver

# gh-pages doesn't support symlinks it seems. so copy there too
rm -rf docs/dist/latest
cp -r public/degust-dist/ docs/dist/latest
