// 宣传动画：逐帧截图 tools/promo.html，用 ffmpeg 合成 MP4（需要先启动开发服务器：npx vite --port 5199）。
// 用法：
//   node scripts/promo.mjs                          横竖屏 × 中英文，共 4 个视频
//   node scripts/promo.mjs --aspect 9x16 --lang zh  只做一个
//   node scripts/promo.mjs --stills 1,5,9.5         只截这几个时刻的静帧，检查构图
// 输出到 promo-out/（不进 git）。
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const BASE = arg('url', 'http://localhost:5199/');
const FPS = Number(arg('fps', 30));
const aspects = arg('aspect', 'all') === 'all' ? ['16x9', '9x16'] : [arg('aspect')];
const langs = arg('lang', 'all') === 'all' ? ['en', 'zh'] : [arg('lang')];
const stills = arg('stills', null)?.split(',').map(Number);
const OUT = 'promo-out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu'],
});

for (const aspect of aspects) {
  for (const lang of langs) {
    const [width, height] = aspect === '9x16' ? [1080, 1920] : [1920, 1080];
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${BASE}tools/promo.html?aspect=${aspect}&lang=${lang}`);
    await page.waitForFunction(() => window.__promo?.ready, null, { timeout: 120000 });
    const duration = await page.evaluate(() => window.__promo.duration);
    const name = `agent-badges-${aspect}-${lang}`;

    if (stills) {
      for (const t of stills) {
        await page.evaluate((x) => window.__promo.seek(x), t);
        await page.screenshot({ path: `${OUT}/${name}-t${t}.png` });
      }
      console.log(`${name}: ${stills.length} 张静帧`);
    } else {
      const file = `${OUT}/${name}.mp4`;
      const ff = spawn('ffmpeg', [
        '-y', '-loglevel', 'error',
        '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        file,
      ], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((r, j) => ff.on('exit', (c) => (c === 0 ? r() : j(new Error(`ffmpeg exit ${c}`)))));
      const frames = Math.round(duration * FPS);
      for (let f = 0; f < frames; f++) {
        await page.evaluate((x) => window.__promo.seek(x), f / FPS);
        const png = await page.screenshot({ type: 'png' });
        if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
        if (f % 60 === 0) process.stdout.write(`\r${name}: ${f}/${frames}`);
      }
      ff.stdin.end();
      await done;
      console.log(`\r${name}: ${frames} 帧 → ${file}`);
    }
    if (errors.length) console.error(`${name} 页面报错：\n  ${errors.join('\n  ')}`);
    await page.close();
  }
}
await browser.close();
