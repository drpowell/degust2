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
rm docs/dist/latest
(cd docs/dist ; ln -s $ver latest)
