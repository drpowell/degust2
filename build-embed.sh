#!/bin/sh

# Exit if any command fails
set -e

degust_home='http://victorian-bioinformatics-consortium.github.io/degust'

case "$1" in
    local)
        url='./'
        echo "Building LOCAL file serving : $url"
        ;;
    local-srv)
        url='http://localhost:3000/degust/'
        echo "Building LOCAL port access : $url"
        ;;
    remote)
        url='http://drpowell.github.io/degust2/dist/latest/'
        echo "Building REMOTE access : $url"
        ;;
    *)
      echo "Usage: ./build-embed.sh local|local-srv|remote"
      exit 1
      ;;
esac

ver=$(grep ver public/degust/js/version.coffee | sed -e 's/^.* = //')
ver="${ver//\'}"

echo "Building v$ver.  Using URL $url"

if [ -z "$ver" ]; then
  echo "Version not found!"
  exit 1
fi

sed -e "s|'\./|'$url|" \
    -e s"|index\.html|$degust_home|" public/degust/compare.html > xx.html


OUT=public/degust-dist/degust.py
sed -e "/HTML-HERE/r xx.html" \
    -e '/HTML-HERE/d' \
    -e "s/VERSION-HERE/$ver/g" \
    -e "s^ASSET-HERE^$url^g"  public/degust/scripts/embed.py > $OUT

rm -f xx.html

echo "Built: $OUT"
