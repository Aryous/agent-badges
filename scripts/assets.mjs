// 生成 README 和落地页用的图片素材（需要先启动开发服务器：npx vite --port 5199）。
// 全部用示例数据，不含任何个人数据。
// 用法：node scripts/assets.mjs [logo|banner|gallery|gif|shots|card|shelf|all] [url]
import { launchChrome } from './browser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const what = process.argv[2] ?? 'all';
const base = process.argv[3] ?? 'http://localhost:5199/';
const OUT = 'assets';
mkdirSync(OUT, { recursive: true });
const want = (k) => what === 'all' || what === k;

const browser = await launchChrome();
const studio = await browser.newPage({ viewport: { width: 640, height: 640 } });
studio.on('pageerror', (e) => console.error(e.message));
await studio.goto(new URL('tools/studio.html', base).href);
await studio.waitForFunction(() => window.__studio?.ready, null, { timeout: 60000 });

const render = (opts) => studio.evaluate((o) => window.__studio.render(o), opts);
const toFile = (file, dataURL) => {
  writeFileSync(file, Buffer.from(dataURL.split(',')[1], 'base64'));
  console.log(file);
};
const SERIF = `'Iowan Old Style', 'Palatino Linotype', Georgia, serif`;
const SANS = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
const MONO = `ui-monospace, 'SF Mono', Menlo, monospace`;

/** 用一段 HTML 排版，截图成 PNG。 */
async function compose(file, html, { width, height, scale = 2 }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: file, omitBackground: false });
  await page.close();
  console.log(file);
}

// ---------- 标志 ----------
if (want('logo')) {
  toFile(`${OUT}/logo.png`, await render({ brand: 'logo', size: 512 }));
  toFile(`${OUT}/logo-angle.png`, await render({ brand: 'logo', size: 512, angle: -0.5, tilt: 0.12 }));
}

// ---------- 横幅（也可作 GitHub 社交预览图，1280 × 640） ----------
if (want('banner')) {
  const fan = [
    { brand: 'claude-code', id: 'tokens', angle: 0.38, x: 690, y: 340, s: 260 },
    { brand: 'codex', id: 'tokens', angle: -0.38, x: 1125, y: 340, s: 260 },
    { brand: 'logo', angle: 0, x: 908, y: 330, s: 390 },
  ];
  const imgs = [];
  for (const f of fan) {
    const src = await render({ brand: f.brand, id: f.id, angle: f.angle, tilt: 0.05, size: 760, showcase: true, fill: 0.9 });
    imgs.push(`<img src="${src}" style="position:absolute;left:${f.x - f.s / 2}px;top:${f.y - f.s / 2}px;width:${f.s}px;height:${f.s}px;filter:drop-shadow(0 18px 28px rgba(0,0,0,.55))">`);
  }
  await compose(
    `${OUT}/banner.png`,
    `<div style="position:relative;width:1280px;height:640px;overflow:hidden;background:radial-gradient(ellipse 60% 80% at 70% 52%, #2b2723 0%, #141413 72%);color:#F0EEE6;font-family:${SANS}">
      <div style="position:absolute;left:72px;top:150px;width:470px">
        <div style="font-size:15px;letter-spacing:.12em;color:#E8B45A;text-transform:uppercase">Achievements for AI coding agents</div>
        <div style="margin-top:16px;font-family:${SERIF};font-size:76px;line-height:1.02">Agent<br>Badges</div>
        <div style="margin-top:22px;font-size:21px;line-height:1.5;color:#BDB9B0">3D achievement badges for your<br>Claude Code &amp; Codex history.</div>
        <div style="display:inline-block;margin-top:30px;padding:12px 18px;border:1px solid rgba(240,238,230,.18);border-radius:12px;background:rgba(240,238,230,.05);font-family:${MONO};font-size:21px"><span style="color:#5D5A54">$</span> npx agent-badges</div>
        <div style="margin-top:18px;font-size:14px;color:#6E6A62">Local only · metadata only · nothing uploaded</div>
      </div>
      ${imgs.join('')}
    </div>`,
    { width: 1280, height: 640, scale: 1.5 },
  );
}

// ---------- 画廊：每个工具一张 ----------
if (want('gallery')) {
  const brands = await studio.evaluate(() => window.__studio.brands);
  for (const b of brands) {
    const cells = [];
    for (const id of b.badges) {
      const src = await render({ brand: b.id, id, size: 300, showcase: true });
      cells.push(`<img src="${src}" style="width:112px;height:112px;filter:drop-shadow(0 8px 12px rgba(0,0,0,.5))">`);
    }
    const cols = 10;
    const rows = Math.ceil(cells.length / cols);
    await compose(
      `${OUT}/gallery-${b.id}.png`,
      `<div style="width:1280px;padding:28px 40px;box-sizing:border-box;background:#141413;display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;justify-items:center">${cells.join('')}</div>`,
      { width: 1280, height: 56 + rows * 112 + (rows - 1) * 6, scale: 1.25 },
    );
  }
}

// ---------- 旋转动图：三枚徽章同步转一圈 ----------
if (want('gif')) {
  const tmp = mkdtempSync(join(tmpdir(), 'agent-badges-gif-'));
  try {
    const trio = [
      { brand: 'claude-code', id: 'first-session' },
      { brand: 'logo' },
      { brand: 'codex', id: 'first-thread' },
    ];
    const N = 44;
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      for (const [k, b] of trio.entries()) {
        const src = await render({ ...b, angle, tilt: 0.06, size: 300, showcase: true, fill: 0.86, background: '#141413' });
        writeFileSync(join(tmp, `b${k}_${String(i).padStart(3, '0')}.png`), Buffer.from(src.split(',')[1], 'base64'));
      }
    }
    const inputs = trio.flatMap((_, k) => ['-framerate', '16', '-i', join(tmp, `b${k}_%03d.png`)]);
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', ...inputs,
      '-filter_complex', '[0][1][2]hstack=inputs=3,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
      '-loop', '0', `${OUT}/spin.gif`,
    ]);
    console.log(`${OUT}/spin.gif`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------- 页面截图（示例数据） ----------
if (want('shots')) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  await page.goto(new URL('?source=mock&lang=en', base).href);
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/screenshot-wall.png` });
  await page.close();
  for (const f of ['screenshot-wall.png']) {
    execFileSync('sips', ['-Z', '1600', `${OUT}/${f}`], { stdio: 'ignore' });
    console.log(`${OUT}/${f}`);
  }
}

// ---------- 成就卡片示例（示例数据） ----------
if (want('card')) {
  const { renderCard } = await import('../src/share/card.js');
  const { summarize, BRAND_INFO } = await import('../src/cli/summary.js');
  const { loadDaily, DATA_SOURCES } = await import('../src/data/progress.js');
  const { BRAND_IDS } = await import('../src/brands/index.js');
  const brands = [];
  for (const id of BRAND_IDS) {
    const { unlocked, total } = summarize(id, await DATA_SOURCES[id].mock());
    const { brand } = BRAND_INFO[id];
    brands.push({ id, name: brand.name, accent: brand.ui.accent, unlocked, total, daily: await loadDaily(id, { forceMock: true }) });
  }
  for (const theme of ['dark', 'light']) {
    writeFileSync(`${OUT}/card-${theme}.svg`, renderCard({ brands, theme, today: '2026-10-15' }));
    console.log(`${OUT}/card-${theme}.svg`);
  }
}

// ---------- GitHub 主页徽章图示例（示例数据） ----------
if (want('shelf')) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await page.goto(new URL('?source=mock&lang=en', base).href);
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 90000 });
  await page.evaluate(() => window.__badgeApp.openShelf());
  await page.waitForFunction(() => window.__badgeApp.shelfURL, null, { timeout: 90000 });
  toFile(`${OUT}/shelf-example.png`, await page.evaluate(() => window.__badgeApp.shelfURL));
  // README 里显示 600 宽，2 倍清晰度够用，缩小一些省体积
  execFileSync('sips', ['--resampleWidth', '1200', `${OUT}/shelf-example.png`], { stdio: 'ignore' });
  await page.close();
}

await browser.close();
// 素材体积提醒：README 图片太大会拖慢仓库
for (const f of ['banner.png', 'spin.gif', 'shelf-example.png']) {
  try {
    console.log(`${f}: ${(readFileSync(`${OUT}/${f}`).length / 1024).toFixed(0)} KB`);
  } catch {}
}
