import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

function findBrowser() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.error(
      `[pdfGenerator] PUPPETEER_EXECUTABLE_PATH=${envPath} (存在: ${existsSync(envPath)})`
    );
    return envPath;
  }

  for (const p of BROWSER_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    'Chrome / Edge が見つかりません。PUPPETEER_EXECUTABLE_PATH 環境変数で実行パスを指定してください。'
  );
}

export async function htmlToPdf(html) {
  const executablePath = findBrowser();

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
