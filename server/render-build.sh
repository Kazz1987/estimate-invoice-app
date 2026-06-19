#!/usr/bin/env bash
set -o errexit

export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

npm install

# puppeteer-core単体にはbrowsers installのCLIが無いため、
# devDependenciesのpuppeteer経由でChromeをキャッシュにインストールする。
# --pathで明示的にインストール先を固定し、PUPPETEER_CACHE_DIRとのズレを防ぐ。
npx puppeteer browsers install chrome --path "$PUPPETEER_CACHE_DIR"

echo "=== Installed Chrome binaries under $PUPPETEER_CACHE_DIR ==="
find "$PUPPETEER_CACHE_DIR" -type f -name chrome 2>/dev/null
