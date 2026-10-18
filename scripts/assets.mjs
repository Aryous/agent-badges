// 生成 README 和落地页用的图片素材（需要先启动开发服务器）。
// 用法：node scripts/assets.mjs [logo|gallery|all] [url]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const what = process.argv[2] ?? 'all';
const base = process.argv[3] ?? 'http://localhost:5199/';
const OUT = 'assets';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
page.on('pageerror', (e) => console.error(e.message));
await page.goto(new URL('studio.html', base).href);
await page.waitForFunction(() => window.__studio?.ready, null, { timeout: 60000 });

const save = async (file, opts) => {
  const url = await page.evaluate((o) => window.__studio.render(o), opts);
  writeFileSync(`${OUT}/${file}`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${OUT}/${file}`);
};

if (what === 'logo' || what === 'all') {
  await save('logo.png', { brand: 'logo', size: 1024 });
  await save('logo-256.png', { brand: 'logo', size: 256 });
  await save('logo-angle.png', { brand: 'logo', size: 1024, angle: -0.5, tilt: 0.12 });
}
await browser.close();
