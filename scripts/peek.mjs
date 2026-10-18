// 快速截图：node scripts/peek.mjs <url> <out.png> [badgeId] [angle] [w] [h]
import { chromium } from 'playwright-core';
const [url, out, id, angle, w = 1440, h = 900] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
await page.goto(url);
await page.waitForFunction(() => window.__badgeApp?.ready);
if (id) {
  await page.evaluate((id) => window.__badgeApp.open(id, { award: false }), id);
  await page.waitForTimeout(1500);
  if (angle) await page.evaluate((a) => window.__badgeApp.setAngle(+a), angle);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: out });
await browser.close();
