#!/usr/bin/env bash
set -o errexit

export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

npm install

# puppeteer-core単体にはbrowsers installのCLIが無いため、
# devDependenciesのpuppeteer経由でChromeをキャッシュにインストールする。
npx puppeteer browsers install chrome
