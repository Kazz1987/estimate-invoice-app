import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Browser, getInstalledBrowsers } from '@puppeteer/browsers';

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

// puppeteer-core単体ではキャッシュ管理機能を持たないため、@puppeteer/browsers の
// Cache APIで実際にインストールされているChromeのパスを動的に解決する。
// 固定パス（PUPPETEER_EXECUTABLE_PATH）は再デプロイでビルドキャッシュの内容が
// ずれるとファイルが存在しなくなることがあるため、フォールバックとしてのみ使う。
async function findInstalledChromeViaCache() {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(homedir(), '.cache', 'puppeteer');
  try {
    const installed = await getInstalledBrowsers({ cacheDir });
    console.error(
      `[pdfGenerator] @puppeteer/browsers cacheDir=${cacheDir} installed=${JSON.stringify(
        installed.map((b) => ({ browser: b.browser, buildId: b.buildId, executablePath: b.executablePath }))
      )}`
    );
    const chrome = installed.find((b) => b.browser === Browser.CHROME && existsSync(b.executablePath));
    return chrome?.executablePath ?? null;
  } catch (error) {
    console.error(`[pdfGenerator] キャッシュ探索失敗 cacheDir=${cacheDir} error.message=${error.message}`);
    return null;
  }
}

async function findBrowser() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath) {
    const exists = existsSync(envPath);
    console.error(`[pdfGenerator] PUPPETEER_EXECUTABLE_PATH=${envPath} (存在: ${exists})`);
    if (exists) return envPath;
  }

  const cachedPath = await findInstalledChromeViaCache();
  if (cachedPath) return cachedPath;

  for (const p of BROWSER_PATHS) {
    if (existsSync(p)) return p;
  }

  throw new Error(
    'Chrome / Edge が見つかりません。PUPPETEER_EXECUTABLE_PATH 環境変数、または @puppeteer/browsers のキャッシュ、固定パスのいずれにも実行ファイルがありませんでした。'
  );
}

export async function htmlToPdf(html) {
  const executablePath = await findBrowser();

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (error) {
    console.error('[pdfGenerator] Puppeteer起動失敗');
    console.error(`[pdfGenerator] executablePath=${executablePath} (存在: ${existsSync(executablePath)})`);
    console.error(`[pdfGenerator] error.message: ${error.message}`);
    console.error(`[pdfGenerator] error.stack: ${error.stack}`);
    throw error;
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
    });
    return pdf;
  } catch (error) {
    console.error('[pdfGenerator] PDF生成失敗');
    console.error(`[pdfGenerator] error.message: ${error.message}`);
    console.error(`[pdfGenerator] error.stack: ${error.stack}`);
    throw error;
  } finally {
    await browser.close();
  }
}
