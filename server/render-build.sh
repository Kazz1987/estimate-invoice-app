#!/usr/bin/env bash
set -o errexit

# PUPPETEER_CACHE_DIRはRenderの環境変数で設定する想定（ビルド時と実行時で
# 同じ値を読む必要があるため、ここでは上書きせずRender側の設定を使う）。
# /opt/render/.cache配下はビルド専用の一時領域で実行時には引き継がれないため、
# /opt/render/project/src配下（リポジトリのチェックアウト先）を指定すること。
: "${PUPPETEER_CACHE_DIR:=/opt/render/project/src/.puppeteer-cache}"
export PUPPETEER_CACHE_DIR

npm install

# puppeteer-core単体にはbrowsers installのCLIが無いため、
# devDependenciesのpuppeteer経由でChromeをキャッシュにインストールする。
# --pathで明示的にインストール先を固定し、PUPPETEER_CACHE_DIRとのズレを防ぐ。
npx puppeteer browsers install chrome --path "$PUPPETEER_CACHE_DIR"

echo "=== Installed Chrome binaries under $PUPPETEER_CACHE_DIR ==="
find "$PUPPETEER_CACHE_DIR" -type f -name chrome 2>/dev/null
