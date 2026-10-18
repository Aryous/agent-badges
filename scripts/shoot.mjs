// 浏览器实测：截图陈列墙、每枚徽章正反面，检查拖动吸附和 PNG 导出。
// 用法：node scripts/shoot.mjs [url] [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

// 固定使用示例数据，检查结果不随本机真实数据变化
const withMock = (u) => u + (u.includes('?') ? '&' : '?') + 'source=mock&lang=zh';
const url = withMock(process.argv[2] ?? 'http://localhost:5199/');
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

async function session(viewport, tag) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${tag}-wall.png`, fullPage: true });
  return { page, errors };
}

// ---------- 桌面 ----------
{
  const { page, errors } = await session({ width: 1440, height: 900 }, 'desktop');
  const ids = await page.evaluate(() => window.__badgeApp.ids);
  const tiles = await page.locator('.tile').count();
  const loaded = await page.locator('.tile:not(.is-loading) img[src^="data:image/png"]').count();
  check('陈列墙每枚徽章都有一张缩略图', tiles === ids.length && loaded === ids.length, `${loaded}/${tiles} 张，共 ${ids.length} 枚`);

  // 悬停倾斜
  const firstTile = page.locator('.tile').first();
  const box = await firstTile.boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25);
  await page.waitForTimeout(400);
  const tilt = await page.evaluate(() => getComputedStyle(document.querySelector('.tile .tile-art')).transform);
  check('悬停时徽章倾斜', tilt !== 'none' && tilt !== 'matrix(1, 0, 0, 1, 0, 0)', tilt.slice(0, 40));
  await page.screenshot({ path: `${out}/desktop-wall-hover.png` });

  // 真实点击网格打开，Esc 返回
  await firstTile.click();
  await page.waitForTimeout(800);
  const overlayOpen = await page.locator('#overlay').isVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const overlayClosed = !(await page.locator('#overlay').isVisible());
  check('点击网格打开单枚查看，Esc 回到陈列墙', overlayOpen && overlayClosed);

  // 隐藏徽章和分级徽章在墙上的表现
  const wallInfo = await page.evaluate(() =>
    [...document.querySelectorAll('.tile')].map((t) => ({
      id: t.dataset.id,
      title: t.querySelector('.tile-title').textContent,
      metal: t.dataset.metal ?? null,
    })),
  );
  const masked = wallInfo.filter((t) => t.id === 'model-collector');
  if (masked.length) check('未解锁的隐藏徽章在墙上显示 ???', masked[0].title === '???', masked[0].title);
  const tieredTile = wallInfo.find((t) => t.id === 'sessions');
  if (tieredTile) check('分级徽章在墙上显示等级', Boolean(tieredTile.metal), tieredTile.metal ?? '无');

  // 交互抽查 3 枚代表：圆形、六边形、星芒（覆盖已解锁和未解锁）
  const sample = ['first-session', 'seven-day-streak', 'subagent-commander'].filter((id) => ids.includes(id));
  for (const id of sample) {
    await page.evaluate((id) => window.__badgeApp.open(id), id);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/desktop-${id}-award-mid.png` });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${out}/desktop-${id}-front.png` });

    // 拖动半圈后应吸附到背面
    const vw = 1440;
    await page.mouse.move(vw / 2 - 100, 330);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(vw / 2 - 100 + i * 24, 330 + i * 2);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(150); // 停顿后松手，不甩动
    await page.mouse.up();
    await page.waitForTimeout(1600);
    const face = await page.evaluate(() => window.__badgeApp.face);
    const spin = await page.evaluate(() => window.__badgeApp.spin);
    const snapped = Math.abs(Math.sin(spin.angle)) < 0.02 && Math.abs(spin.tilt) < 0.02;
    check(`${id} 拖动后吸附到正/背面并回正`, snapped, `angle=${spin.angle.toFixed(3)} tilt=${spin.tilt.toFixed(3)} face=${face}`);

    await page.evaluate(() => window.__badgeApp.setAngle(Math.PI));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/desktop-${id}-back.png` });

    if (id === sample[0]) {
      // 快速甩动：松手后应继续惯性转动，最终仍吸附到正/背面
      await page.evaluate(() => window.__badgeApp.setAngle(0));
      await page.waitForTimeout(300);
      await page.mouse.move(500, 330);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) {
        await page.mouse.move(500 + i * 70, 330);
        await page.waitForTimeout(8);
      }
      await page.mouse.up();
      await page.waitForTimeout(120);
      const coasting = await page.evaluate(() => window.__badgeApp.spin);
      await page.waitForTimeout(3500);
      const settled = await page.evaluate(() => window.__badgeApp.spin);
      check('甩动后惯性转动', Math.abs(coasting.vel) > 3, `松手后角速度 ${coasting.vel.toFixed(1)} rad/s`);
      check('惯性结束后吸附', Math.abs(Math.sin(settled.angle)) < 0.02 && Math.abs(settled.vel) < 0.05,
        `转过 ${(settled.angle / Math.PI).toFixed(2)}π`);

      // 切换导出背景：预览框要立即跟着变化
      const frameState = () =>
        page.evaluate(() => {
          const f = document.querySelector('#export-frame');
          if (!f) return null;
          const cs = getComputedStyle(f);
          return { bg: f.dataset.bg, visible: cs.opacity !== '0' && cs.display !== 'none', image: cs.backgroundImage !== 'none' };
        });
      const hiddenBefore = await page.evaluate(() => getComputedStyle(document.querySelector('#export-frame')).opacity === '0');
      check('导出面板关闭时不显示取景框、不显示背景选项', hiddenBefore && !(await page.locator('[data-bg="ink"]').isVisible()));
      await page.locator('[data-export-toggle]').click();
      await page.waitForTimeout(400);
      await page.locator('[data-bg="ink"]').click();
      await page.waitForTimeout(500);
      const inkFrame = await frameState();
      await page.screenshot({ path: `${out}/desktop-export-frame-ink.png` });
      await page.locator('[data-bg="transparent"]').click();
      await page.waitForTimeout(500);
      const tFrame = await frameState();
      await page.screenshot({ path: `${out}/desktop-export-frame-transparent.png` });
      // 面板打开时拖动旋转徽章，面板应保持打开，朝向跟着变
      await page.evaluate(() => window.__badgeApp.setAngle(Math.PI));
      await page.waitForTimeout(500);
      const faceText = await page.locator('[data-export-face]').textContent();
      check('面板打开时转到背面，朝向显示「背面」', faceText === '背面', faceText);
      await page.screenshot({ path: `${out}/desktop-export-panel.png` });
      await page.evaluate(() => window.__badgeApp.setAngle(0));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      check('Esc 先收起导出面板，不退出单枚查看', !(await page.locator('#export-panel').isVisible()) && (await page.locator('#inspector').isVisible()));
      check('选墨色时预览框显示墨色底', inkFrame?.visible && inkFrame.bg === 'ink' && !inkFrame.image, JSON.stringify(inkFrame));
      check('选透明时预览框显示棋盘格', tFrame?.visible && tFrame.bg === 'transparent' && tFrame.image, JSON.stringify(tFrame));

      for (const bg of ['transparent', 'ink']) {
        const res = await page.evaluate((bg) => window.__badgeApp.exportPNG(bg), bg);
        const buf = Buffer.from(res.dataURL.split(',')[1], 'base64');
        writeFileSync(`${out}/export-${bg}-${res.filename}`, buf);
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        check(`导出 PNG（${bg}）尺寸 2048×2048`, w === 2048 && h === 2048, `${w}×${h} ${res.filename}`);
        // 检查四角像素是否透明 / 为墨色
        const corner = await page.evaluate(async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = c.height = 8;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, 2048, 2048, 0, 0, 2048, 2048);
          return Array.from(ctx.getImageData(1, 1, 1, 1).data);
        }, res.dataURL);
        const ok = bg === 'transparent' ? corner[3] === 0 : corner[3] === 255 && corner[0] < 40;
        check(`导出 PNG（${bg}）背景正确`, ok, `corner rgba=${corner.join(',')}`);
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: `${out}/desktop-wall-after.png` });
  check('桌面端控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 档案、热力图、筛选、海报 ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 60000 });

  const ringCount = Number(await page.locator('.profile-count b').textContent());
  const unlockedTiles = await page.locator('.tile:not(.is-locked)').count();
  check('档案的解锁数与陈列墙一致', ringCount === unlockedTiles, `${ringCount} vs ${unlockedTiles}`);
  const recent = await page.locator('[data-recent] .profile-item').count();
  const next = await page.locator('[data-next] .profile-item img[src^="data:image/png"]').count();
  check('最近获得、即将解锁各 3 枚，且带缩略图', recent === 3 && next === 3, `${recent} / ${next}`);

  const days = await page.locator('.heat-cell[data-date]').count();
  check('热力图一年 365 或 366 格', days === 365 || days === 366, String(days));
  const summary2026 = await page.locator('[data-summary]').textContent();
  await page.locator('.heat-years button', { hasText: '2025' }).click();
  const summary2025 = await page.locator('[data-summary]').textContent();
  const first = await page.locator('.heat-cell[data-date]').first().getAttribute('data-date');
  check('切换年份后日历和汇总跟着变', first === '2025-01-01' && summary2025 !== summary2026, `${first} · ${summary2025}`);
  await page.locator('.heat-years button', { hasText: '2026' }).click();

  const marker = page.locator('.heat-cell.is-unlock').first();
  await marker.hover();
  await page.waitForTimeout(150);
  const tip = await page.locator('[data-tip]').textContent();
  check('悬停解锁日显示日期、用量和徽章名', /2026 年/.test(tip) && tip.includes('解锁徽章'), tip.replace(/\s+/g, ' ').slice(0, 80));
  await page.screenshot({ path: `${out}/desktop-heatmap-tip.png` });

  const codexToggle = page.locator('.heat-brand[data-id="codex"]');
  await codexToggle.click();
  const off = await codexToggle.getAttribute('aria-pressed');
  const ccToggle = page.locator('.heat-brand[data-id="claude-code"]');
  await ccToggle.click(); // 只剩一个时不能关掉
  const stillOn = await ccToggle.getAttribute('aria-pressed');
  check('热力图可以按工具开关，至少保留一个', off === 'false' && stillOn === 'true', `${off} / ${stillOn}`);
  await codexToggle.click();

  await marker.click();
  await page.waitForTimeout(700);
  check('点击解锁标记打开对应徽章', await page.locator('#overlay').isVisible());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);

  const visible = () => page.evaluate(() => [...document.querySelectorAll('.tile')].filter((t) => !t.hidden).length);
  const total = await page.locator('.tile').count();
  await page.locator('[data-filter="unlocked"]').click();
  const nUnlocked = await visible();
  const lockedShown = await page.locator('.tile.is-locked:not([hidden])').count();
  await page.locator('[data-filter="locked"]').click();
  const nLocked = await visible();
  await page.locator('[data-filter="all"]').click();
  check('筛选：已获得 + 未解锁 = 全部，且互不混入', nUnlocked + nLocked === total && nUnlocked === unlockedTiles && lockedShown === 0, `${nUnlocked} + ${nLocked} / ${total}`);

  await page.locator('[data-share]').click();
  await page.waitForFunction(() => window.__badgeApp.posterURL, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/desktop-poster.png` });
  const poster = await page.evaluate(() => window.__badgeApp.posterURL);
  const buf = Buffer.from(poster.split(',')[1], 'base64');
  writeFileSync(`${out}/poster.png`, buf);
  check('分享海报是 2160 像素宽的 PNG', buf.readUInt32BE(16) === 2160, `${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`);
  await page.keyboard.press('Escape');
  check('Esc 关闭海报', !(await page.locator('#poster').isVisible()));
  check('展示层控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 手机 ----------
{
  const { page, errors } = await session({ width: 390, height: 844 }, 'mobile');
  const wallOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('手机端陈列墙（含热力图）无横向溢出', !wallOverflow);
  await page.evaluate(() => window.__badgeApp.open('seven-day-streak'));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/mobile-inspect.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('手机端无横向溢出', !overflow);
  check('手机端控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- Codex 品牌 ----------
{
  const codexUrl = url.replace('source=mock', 'source=mock&brand=codex');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(codexUrl);
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 60000 });
  await page.screenshot({ path: `${out}/codex-wall.png`, fullPage: true });
  const ids = await page.evaluate(() => window.__badgeApp.ids);
  const loaded = await page.locator('.tile:not(.is-loading) img[src^="data:image/png"]').count();
  check('Codex 陈列墙每枚徽章都有缩略图', loaded === ids.length && ids.length >= 20, `${loaded}/${ids.length}`);
  const active = await page.locator('.brand-tab.is-active').textContent();
  check('品牌切换器高亮 Codex', active === 'Codex', active);
  const masked = await page.locator('.tile[data-id="compactor"] .tile-title').textContent();
  check('Codex 未解锁的隐藏徽章显示 ???', masked === '???', masked);
  await page.evaluate(() => window.__badgeApp.open('compactor', { award: false }));
  await page.waitForTimeout(800);
  const desc = await page.locator('[data-desc]').textContent();
  check('隐藏成就文案使用当前品牌名', desc.includes('Codex') && !desc.includes('Claude'), desc);
  check('Codex 控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
