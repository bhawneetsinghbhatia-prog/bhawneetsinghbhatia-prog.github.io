import { chromium } from '@playwright/test';

const url = process.argv[2];
if (!url) throw new Error('Usage: node src/probe-url.mjs <url>');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'en-IN',
  timezoneId: 'Asia/Kolkata',
  viewport: { width: 1440, height: 1100 },
  extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
});
const page = await context.newPage();
const apiResponses = [];
page.on('response', async (response) => {
  const type = response.headers()['content-type'] || '';
  if (!type.includes('json')) return;
  try {
    const body = await response.text();
    if (/price|rate|room|availability/i.test(body)) {
      apiResponses.push({ url: response.url(), status: response.status(), body: body.slice(0, 5000) });
    }
  } catch {
    // A redirected or closed response can no longer be read.
  }
});
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);
  const body = await page.locator('body').innerText();
  console.log(JSON.stringify({
    title: await page.title(),
    finalUrl: page.url(),
    text: body.slice(0, 30000),
    apiResponses: apiResponses.slice(0, 20)
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
