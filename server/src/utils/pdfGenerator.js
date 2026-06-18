import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findBrowser() {
  for (const p of BROWSER_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error('Chrome / Edge が見つかりません。インストールされているか確認してください。');
}

export async function htmlToPdf(html) {
  const executablePath = findBrowser();

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
