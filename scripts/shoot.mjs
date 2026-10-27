// 浏览器实测：截图陈列墙、每枚徽章正反面，检查拖动吸附和 PNG 导出。
// 用法：node scripts/shoot.mjs [url] [outDir]
import { launchChrome } from './browser.mjs';
// 软件渲染（CI）下页面的 load 事件可能超过 Playwright 默认的 30 秒，和后面的就绪等待一样放宽到 3 分钟
const NAV_TIMEOUT = 180000;
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SHELF } from '../src/data/shelf.js';

// 固定使用示例数据，检查结果不随本机真实数据变化
const withMock = (u) => u + (u.includes('?') ? '&' : '?') + 'source=mock&lang=zh';
const url = withMock(process.argv[2] ?? 'http://localhost:5199/');
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });

const browser = await launchChrome();

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

// ---------- 按条件等待（不按墙钟固定等待） ----------
// 渲染循环每帧最多推进 0.1 秒（src/app/loop.js），CSS 过渡也只在出帧时前进。软件渲染（CI）一帧要一两秒，
// 固定等待里动画几乎没走：吸附没停稳、预览框还没淡入就读了状态。下面的等待都逐帧检查页面里可观察的状态，
// 真实显卡上很快满足，和原来的固定等待差不多长。超时只记一笔不抛出：检查照常读状态，条件没满足就照常失败。
const WAIT_TIMEOUT = 180000;

async function waitUntil(page, label, fn, arg) {
  await page
    .waitForFunction(fn, arg, { polling: 'raf', timeout: WAIT_TIMEOUT })
    .catch(() => console.log(`  （${WAIT_TIMEOUT / 1000} 秒内没等到：${label}）`));
}

/** 获得动画（飞入 + 高光）播完。播放期间「重播」按钮禁用；未解锁的徽章没有动画，按钮隐藏。播放中拖动会被忽略。 */
async function waitAwardDone(page) {
  await waitUntil(page, '获得动画播完', () => {
    const b = document.querySelector('[data-replay]');
    return b.hidden || !b.disabled;
  });
}

/** 徽章停稳：没在拖动，角速度≈0，角度和倾斜连续 frames 帧不再变化。 */
async function waitSpinRest(page, frames = 5) {
  await page.evaluate(() => (window.__spinRest = { n: 0, angle: NaN, tilt: NaN }));
  await waitUntil(page, '徽章停稳', (frames) => {
    const s = window.__badgeApp.spin;
    const r = window.__spinRest;
    const still = !s.dragging && Math.abs(s.vel) < 1e-3 && Math.abs(s.tiltVel) < 1e-3
      && Math.abs(s.angle - r.angle) < 1e-4 && Math.abs(s.tilt - r.tilt) < 1e-4;
    r.n = still ? r.n + 1 : 0;
    r.angle = s.angle;
    r.tilt = s.tilt;
    return r.n >= frames;
  }, frames);
}

/** 单枚查看里说明文字（导出面板打开时淡出、收起时淡回来）的透明度停在 value。 */
const INFO_TEXT = ['[data-kicker]', '[data-title]', '[data-desc]', '[data-hint]'];
async function infoTextAt(page, value) {
  await waitUntil(page, `说明文字透明度到 ${value}`, ([sel, v]) => sel.every((s) => getComputedStyle(document.querySelector(s)).opacity === v), [INFO_TEXT, value]);
  return page.evaluate((sel) => sel.map((s) => getComputedStyle(document.querySelector(s)).opacity), INFO_TEXT);
}

/**
 * 导出面板开着时点「全部徽章」退出单枚查看：说明文字不能先淡回来再跟着信息区淡出。
 * 按住 120ms 再松开，和真人点击一样先收到 pointerdown 再收到 click。逐帧记下说明文字的有效透明度
 * （文字 × 信息区 × 遮罩是否还显示），至少 400ms、直到遮罩藏起来。遮罩藏起来后整块不显示，记 0。
 */
async function leaveWithPanelOpen(page) {
  await page.locator('[data-export-toggle]').click();
  const before = await infoTextAt(page, '0');
  const sampling = page.evaluate((sel) => new Promise((resolve) => {
    const overlay = document.querySelector('#overlay');
    const info = document.querySelector('#inspector .info');
    const t0 = performance.now();
    const samples = [];
    const tick = () => {
      const t = performance.now() - t0;
      const text = Math.max(...sel.map((s) => Number(getComputedStyle(document.querySelector(s)).opacity)));
      const shown = overlay.hidden ? 0 : Number(getComputedStyle(info).opacity);
      samples.push({ t: Math.round(t), text, info: shown, eff: text * shown });
      if (t >= 400 && overlay.hidden) resolve(samples);
      else requestAnimationFrame(tick);
    };
    tick();
  }), INFO_TEXT);
  const box = await page.locator('[data-close]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  const samples = await sampling;
  const open = Math.max(...before.map(Number));
  const peak = Math.max(...samples.map((s) => s.eff));
  // 每 80ms 左右取一个点写进说明，方便对照
  const series = [];
  let last = -Infinity;
  for (const s of samples) {
    if (s.t - last < 80) continue;
    last = s.t;
    series.push(`${s.t}ms ${s.text.toFixed(2)}×${s.info.toFixed(2)}`);
  }
  return { open, peak, n: samples.length, series: series.join(' · ') };
}

/** 导出预览框淡入完成（0.35 秒的 CSS 过渡，出帧才会前进）。 */
async function waitFrameShown(page) {
  await waitUntil(page, '预览框淡入', () => getComputedStyle(document.querySelector('#export-frame')).opacity === '1');
}

/**
 * 快速甩动后松手：手以固定速度移动，位置按墙钟时间算，每步之间不睡眠。
 * 应用用「两次 pointermove 的位移 / 两次处理的间隔」估算松手速度（src/viewer/inspector.js），
 * 而指针移动按帧派发，每一步都要等一帧才被处理、才返回。原来每步固定 70 像素，软件渲染一帧一两秒时
 * 只相当于每秒几十像素的慢拖（CI 上测出 0.8 rad/s）。位置按时间算后，每步位移和帧间隔成正比，
 * 测出的速度只取决于手速。
 * 松手：末步移动和松手直接用 CDP 连发、不等末步返回。松手是离散事件，会立刻冲出排队中的末步再处理自己，
 * 两者紧挨着；否则松手要排在一整帧的渲染之后，和末步隔开上百毫秒，触发应用「松手前停顿超过 90ms 视为没甩」。
 * 末步只走上一步被处理后这几毫秒的路，和它被处理的时刻一致。不经过 page.mouse，Playwright 的鼠标状态不受影响。
 * 拖动时指针被画布捕获，位置跑出视口也照常收到。
 */
async function fling(page, x, y, pxPerSecond = 2000) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, px, buttons) =>
    cdp.send('Input.dispatchMouseEvent', { type, x: px, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
  await send('mouseMoved', x, 0);
  await send('mousePressed', x, 1);
  const t0 = Date.now();
  let px = x;
  let handled = t0;
  for (let n = 1; n < 6 || Date.now() - t0 < 100; n++) {
    px = x + ((Date.now() - t0) / 1000) * pxPerSecond;
    await send('mouseMoved', px, 1);
    handled = Date.now();
  }
  px += ((Date.now() - handled) / 1000) * pxPerSecond;
  await Promise.all([send('mouseMoved', px, 1), send('mouseReleased', px, 0)]);
  await cdp.detach();
}

async function session(viewport, tag) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${tag}-wall.png`, fullPage: true });
  return { page, errors };
}

/** 年度铸币套装的滑盖停稳：打开时板子滑到只剩一道边，关上时回到原位、礼盒藏起来。 */
async function waitProof(page, open) {
  await waitUntil(page, open ? '铸币套装打开' : '铸币套装关上', (open) => {
    const box = document.querySelector('.proof');
    const sheet = box.querySelector('.proof-sheet');
    const ty = new DOMMatrix(getComputedStyle(sheet).transform).m42;
    const shown = getComputedStyle(box.querySelector('.proof-case')).visibility === 'visible';
    const lifted = getComputedStyle(box.querySelector('.heat-plate')).transform !== 'none';
    return open ? shown && Math.abs(ty + sheet.offsetHeight - 6) < 0.5 && sheet.getAnimations({ subtree: true }).length === 0 : !shown && ty === 0 && !lifted;
  }, open);
}

/** 拉一下铸币套装的拉环，读出状态。 */
async function proofState(page) {
  return page.evaluate(() => {
    const box = document.querySelector('.proof');
    const pull = box.querySelector('.proof-pull');
    const plate = box.querySelector('.heat-plate');
    const year = document.querySelector('.heat-years').dataset.year;
    // 期望的月章数：热力图上这一年有亮点的月份（和铸币套装各自独立算）
    const lit = new Set([...document.querySelectorAll(`.heat-cell.is-lit[data-date^="${year}-"]`)].map((c) => c.dataset.date.slice(5, 7)));
    const tray = box.querySelector('.proof-tray');
    // 拉环底边到它下面第一排凹槽（横向和拉环重叠的那几个）顶边的距离
    const pr = pull.getBoundingClientRect();
    const below = [...tray.children].slice(0, 6).map((n) => n.getBoundingClientRect()).filter((r) => r.right > pr.left && r.left < pr.right);
    return {
      year,
      expanded: pull.getAttribute('aria-expanded'),
      controls: document.getElementById(pull.getAttribute('aria-controls'))?.getAttribute('role'),
      medals: box.querySelectorAll('.proof-medal').length,
      months: lit.size,
      plateInert: plate.inert,
      caseInert: box.querySelector('.proof-case').inert,
      boxH: box.offsetHeight,
      plateH: plate.offsetHeight,
      cols: getComputedStyle(tray).gridTemplateColumns.split(' ').length,
      rows: getComputedStyle(tray).gridTemplateRows.split(' ').length,
      slides: tray.scrollWidth > tray.clientWidth,
      clearance: below.length ? Math.min(...below.map((r) => r.top - pr.bottom)) : null,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

/**
 * 打开铸币套装：板子滑到一半时把过渡暂停、读一次，停稳后再读一次；然后原路关上再读一次。
 * 盒子的高度在三个时刻都应该等于板子的高度（不再有比板子高的竖排）。
 */
async function proofCycle(page) {
  const closed = await proofState(page);
  await page.locator('.proof-pull').click();
  await waitUntil(page, '滑盖开始滑动', () => document.querySelector('.proof').classList.contains('is-open'));
  const mid = await page.evaluate(() => {
    const box = document.querySelector('.proof');
    const sheet = box.querySelector('.proof-sheet');
    const a = sheet.getAnimations().find((x) => x.transitionProperty === 'transform');
    // 暂停、跳到一半读数，再跳回原来的时刻接着播：不改变滑盖的总时长（滑盖在动画期间不响应拉环）
    const t0 = a?.currentTime;
    if (a) {
      a.pause();
      a.currentTime = a.effect.getComputedTiming().activeDuration / 2;
    }
    const r = { sliding: Boolean(a), ty: new DOMMatrix(getComputedStyle(sheet).transform).m42, boxH: box.offsetHeight, plateH: box.querySelector('.heat-plate').offsetHeight };
    if (a) {
      a.currentTime = t0;
      a.play();
    }
    return r;
  });
  await waitProof(page, true);
  const open = await proofState(page);
  await page.locator('.proof-pull').click();
  await waitProof(page, false);
  const back = await proofState(page);
  return { closed, mid, open, back };
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

  // 静止时超采样：停稳后叠上更细腻的画面，一拖动就收起
  {
    await page.evaluate(() => window.__badgeApp.open('first-session', { award: false }));
    await page.waitForTimeout(150);
    const moving = await page.evaluate(() => getComputedStyle(document.querySelector('#stage-accum')).visibility);
    await page.screenshot({ path: `${out}/desktop-inspect-moving.png` });
    await page.waitForTimeout(1800);
    // 开场动画按帧推进：软件渲染（CI）每秒只有几帧，要多等几秒才停稳。等不到就照常读出 hidden，检查失败
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#stage-accum')).visibility === 'visible', null, { timeout: 60000 }).catch(() => {});
    const settled = await page.evaluate(() => getComputedStyle(document.querySelector('#stage-accum')).visibility);
    await page.screenshot({ path: `${out}/desktop-inspect-settled.png` });
    const box = await page.locator('#stage').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5 + 120, box.y + box.height * 0.45, { steps: 6 });
    const dragging = await page.evaluate(() => getComputedStyle(document.querySelector('#stage-accum')).visibility);
    await page.mouse.up();
    check('单枚查看：停稳后叠上超采样画面，拖动时立刻收起', moving === 'hidden' && settled === 'visible' && dragging === 'hidden', `${moving} → ${settled} → ${dragging}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

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
    await page.waitForTimeout(400); // 只用于截图，不做检查
    await page.screenshot({ path: `${out}/desktop-${id}-award-mid.png` });
    // 获得动画要播完：播放期间拖动会被忽略，下面的吸附检查就成了空测
    await waitAwardDone(page);
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
    await waitSpinRest(page);
    const face = await page.evaluate(() => window.__badgeApp.face);
    const spin = await page.evaluate(() => window.__badgeApp.spin);
    const snapped = Math.abs(Math.sin(spin.angle)) < 0.02 && Math.abs(spin.tilt) < 0.02;
    check(`${id} 拖动后吸附到正/背面并回正`, snapped, `angle=${spin.angle.toFixed(3)} tilt=${spin.tilt.toFixed(3)} face=${face}`);

    await page.evaluate(() => window.__badgeApp.setAngle(Math.PI));
    await waitSpinRest(page);
    await page.screenshot({ path: `${out}/desktop-${id}-back.png` });

    if (id === sample[0]) {
      // 快速甩动：松手后应继续惯性转动，最终仍吸附到正/背面
      await page.evaluate(() => window.__badgeApp.setAngle(0));
      await waitSpinRest(page);
      await fling(page, 500, 330);
      const released = await page.evaluate(() => window.__badgeApp.spin);
      await waitSpinRest(page);
      const settled = await page.evaluate(() => window.__badgeApp.spin);
      // 只看松手后有没有继续转，不看具体速度：慢机器上读数时刻会落后好几帧，速度读数不可靠。
      // 没有惯性时松手后只会吸附到最近的正/背面，最多 0.5π；有惯性时实测约 2.3π
      const coast = Math.abs(settled.angle - released.angle);
      check('甩动后惯性转动', coast > Math.PI, `松手后又转了 ${(coast / Math.PI).toFixed(2)}π`);
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
      // 面板盖在说明文字上：打开时文字淡出，Esc 收起后原样淡回来（下面检查）
      const textOpen = await infoTextAt(page, '0');
      await page.locator('[data-bg="ink"]').click();
      await waitFrameShown(page);
      const inkFrame = await frameState();
      await page.screenshot({ path: `${out}/desktop-export-frame-ink.png` });
      await page.locator('[data-bg="transparent"]').click();
      await waitFrameShown(page);
      const tFrame = await frameState();
      await page.screenshot({ path: `${out}/desktop-export-frame-transparent.png` });
      // 面板打开时拖动旋转徽章，面板应保持打开，朝向跟着变
      await page.evaluate(() => window.__badgeApp.setAngle(Math.PI));
      // 朝向文字在渲染循环里更新，要出帧才会变
      await waitUntil(page, '朝向显示背面', () => document.querySelector('[data-export-face]').textContent === '背面');
      const faceText = await page.locator('[data-export-face]').textContent();
      check('面板打开时转到背面，朝向显示「背面」', faceText === '背面', faceText);
      await page.screenshot({ path: `${out}/desktop-export-panel.png` });
      await page.evaluate(() => window.__badgeApp.setAngle(0));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      check('Esc 先收起导出面板，不退出单枚查看', !(await page.locator('#export-panel').isVisible()) && (await page.locator('#inspector').isVisible()));
      const textBack = await infoTextAt(page, '1');
      check('导出面板打开时说明文字淡出，收起后淡回来', textOpen.every((o) => o === '0') && textBack.every((o) => o === '1'), `${textOpen.join(',')} → ${textBack.join(',')}`);
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

      // 面板开着时点「全部徽章」：说明文字一直保持淡出，跟着信息区一起离开，不先回闪
      const leave = await leaveWithPanelOpen(page);
      check('导出面板开着时退出单枚查看，说明文字不回闪', leave.peak <= leave.open + 0.005,
        `打开时 ${leave.open} · 峰值 ${leave.peak.toFixed(3)}（${leave.n} 帧）· ${leave.series}`);
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
  // 打开到铸币挂上这段时间，逐帧看兜底刻度环有没有露出来（露出来就是打开时闪一下）
  await page.addInitScript(() => {
    window.__ringSeen = false;
    const watch = () => {
      const fig = document.querySelector('[data-coin]');
      if (fig?.classList.contains('has-coin')) return;
      const ticks = fig?.querySelector('.profile-ticks');
      if (ticks && getComputedStyle(ticks).visibility !== 'hidden' && getComputedStyle(ticks).display !== 'none') window.__ringSeen = true;
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });
  // 月章换成 3D 图片的每一次：记下当时有几张图、是不是都解码好了（要求 12 枚一起换，不逐枚跳）
  await page.addInitScript(() => {
    window.__artSwaps = [];
    new MutationObserver((list) => {
      for (const m of list) {
        const el = m.target;
        if (!el.classList?.contains('proof-tray') || !el.classList.contains('has-art') || (m.oldValue ?? '').includes('has-art')) continue;
        const imgs = [...el.querySelectorAll('.proof-art img')];
        window.__artSwaps.push({ imgs: imgs.length, ready: imgs.every((i) => i.complete && i.naturalWidth > 0), slots: el.querySelectorAll('.proof-slot[data-m]').length });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  });
  await page.goto(url, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });

  const ringCount = Number(await page.locator('.profile-count b').textContent());
  const unlockedTiles = await page.locator('.tile:not(.is-locked)').count();
  check('档案的解锁数与陈列墙一致', ringCount === unlockedTiles, `${ringCount} vs ${unlockedTiles}`);
  await waitUntil(page, '全解锁徽章挂上', () => document.querySelector('[data-coin]')?.classList.contains('has-coin'));
  const coin = await page.evaluate(() => {
    const fig = document.querySelector('[data-coin]');
    const canvas = fig?.querySelector('canvas');
    return { has: fig?.classList.contains('has-coin'), canvas: !!canvas && !canvas.hidden && canvas.clientWidth > 0, role: fig?.getAttribute('role'), label: fig?.getAttribute('aria-label') ?? '' };
  });
  check('打开页面时不先露兜底刻度环，铸币直接淡入', !(await page.evaluate(() => window.__ringSeen)));
  check('概览区的全解锁徽章是实时画布，说明文字里的解锁数与陈列墙一致', coin.has && coin.canvas && coin.role === 'button' && Number(coin.label.match(/\d+/)?.[0]) === unlockedTiles, JSON.stringify(coin));

  // 拖动铸币不打开单枚查看；点击才打开，标题是「全解锁」，它不进陈列墙
  const figBox = await page.locator('[data-coin]').boundingBox();
  const cx = figBox.x + figBox.width / 2;
  const cy = figBox.y + figBox.width / 2; // figure 下方还有说明文字，点铸币正中
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  check('拖动全解锁徽章不打开单枚查看', !(await page.locator('#overlay').isVisible()));
  await page.mouse.click(cx, cy);
  await page.locator('#overlay').waitFor({ state: 'visible' });
  await waitAwardDone(page);
  const coinTitle = await page.locator('[data-title]').textContent();
  const coinMeter = await page.locator('[data-meter-text]').textContent();
  const notOnWall = await page.evaluate(() => !window.__badgeApp.ids.includes('completionist') && !document.querySelector('.tile[data-id="completionist"]'));
  check('点开全解锁徽章，标题是「全解锁」，进度写下一阶段', coinTitle === '全解锁' && coinMeter.includes(`${unlockedTiles} / `) && coinMeter.includes('下一阶段'), `${coinTitle} · ${coinMeter}`);
  check('全解锁徽章不进陈列墙', notOnWall && (await page.locator('.tile').count()) === (await page.evaluate(() => window.__badgeApp.ids.length)));
  await page.keyboard.press('Escape');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  // 键盘：焦点回到铸币，Enter 再次打开
  const refocused = await page.evaluate(() => document.activeElement?.matches('[data-coin]'));
  await page.keyboard.press('Enter');
  await page.locator('#overlay').waitFor({ state: 'visible' });
  check('关上后焦点回到铸币，Enter 再次打开', refocused && (await page.locator('[data-title]').textContent()) === '全解锁');
  await page.keyboard.press('Escape');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  // 自动化接口也能打开全解锁徽章，和点它一样
  const viaApi = await page.evaluate(() => {
    try {
      window.__badgeApp.open('completionist', { award: false });
      return null;
    } catch (e) {
      return e.message;
    }
  });
  await page.locator('#overlay').waitFor({ state: 'visible' });
  const apiTitle = await page.locator('[data-title]').textContent();
  check('__badgeApp.open(\'completionist\') 打开全解锁徽章', viaApi === null && apiTitle === '全解锁', viaApi ?? apiTitle);
  await page.keyboard.press('Escape');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  const proofName = await page.evaluate(() => document.querySelector('.proof-case').getAttribute('aria-label'));
  check('中文页面铸币套装的读屏名字是中文状态', /铸造中 · \d+ \/ 12$/.test(proofName) && !/MINTING|SEALED/.test(proofName), proofName);
  const recent = await page.locator('[data-recent] .profile-item').count();
  const next = await page.locator('[data-next] .profile-item img[src^="data:image/png"]').count();
  check('最近获得、即将解锁各 3 枚，且带缩略图', recent === 3 && next === 3, `${recent} / ${next}`);

  const days = await page.locator('.heat-cell[data-date]').count();
  check('热力图一年 365 或 366 格', days === 365 || days === 366, String(days));
  // 年份步进：点「上一年」切到 2025 再点「下一年」切回；点阵淡出、重建、淡入，统计行淡一下再换数字
  const step = (d) => page.locator(`.heat-years [data-d="${d}"]`);
  const yearSettled = (y) =>
    waitUntil(page, `点阵换成 ${y} 年`, (y) => {
      const grid = document.querySelector('.heat-grid');
      return document.querySelector('.heat-cell[data-date]')?.dataset.date === `${y}-01-01` && !grid.classList.contains('is-fading') && !document.querySelector('.heat-summary').classList.contains('is-swapping') && grid.getAnimations({ subtree: true }).length === 0;
    }, y);
  const summary2026 = await page.locator('[data-summary]').textContent();
  const nextAt2026 = await step(1).getAttribute('aria-disabled');
  await step(-1).click();
  await yearSettled(2025);
  const at2025 = await page.evaluate(() => ({
    year: document.querySelector('.heat-years').dataset.year,
    shown: document.querySelector('.heat-year').textContent.trim().slice(-4),
    prev: document.querySelector('.heat-years [data-d="-1"]').getAttribute('aria-disabled'),
    summary: document.querySelector('[data-summary]').textContent,
    first: document.querySelector('.heat-cell[data-date]').dataset.date,
  }));
  check(
    '年份步进：点「上一年」切到 2025，日历和汇总跟着变；到头的一侧 aria-disabled',
    at2025.first === '2025-01-01' && at2025.year === '2025' && at2025.shown === '2025' && at2025.summary !== summary2026 && at2025.prev === 'true' && nextAt2026 === 'true',
    JSON.stringify({ ...at2025, nextAt2026 }),
  );
  await page.screenshot({ path: `${out}/desktop-heatmap-2025.png` });
  await step(1).click();
  await yearSettled(2026);
  const back2026 = await page.evaluate(() => ({ year: document.querySelector('.heat-years').dataset.year, summary: document.querySelector('[data-summary]').textContent, next: document.querySelector('.heat-years [data-d="1"]').getAttribute('aria-disabled') }));
  check('年份步进：点「下一年」切回 2026，汇总复原', back2026.year === '2026' && back2026.summary === summary2026 && back2026.next === 'true', JSON.stringify(back2026));

  const marker = page.locator('.heat-cell.is-unlock').first();
  await marker.hover();
  await page.waitForTimeout(150);
  const tip = await page.locator('[data-tip]').textContent();
  check('悬停解锁日显示日期、用量和徽章名', /2026 年/.test(tip) && tip.includes('解锁徽章'), tip.replace(/\s+/g, ' ').slice(0, 80));
  await page.screenshot({ path: `${out}/desktop-heatmap-tip.png` });

  // 工具开关在图例里：切换时圆点不重建（同一个 DOM 节点），只改颜色
  await page.evaluate(() => (window.__heatCell = document.querySelector('.heat-cell.is-lit[data-date]')));
  const codexToggle = page.locator('.heat-legend .heat-brand[data-id="codex"]');
  await codexToggle.click();
  const off = await codexToggle.getAttribute('aria-pressed');
  const ccToggle = page.locator('.heat-legend .heat-brand[data-id="claude-code"]');
  await ccToggle.click(); // 只剩一个时不能关掉
  const stillOn = await ccToggle.getAttribute('aria-pressed');
  check('热力图可以在图例里按工具开关，至少保留一个', off === 'false' && stillOn === 'true', `${off} / ${stillOn}`);
  await codexToggle.click();
  const sameNode = await page.evaluate(() => {
    const c = window.__heatCell;
    return c.isConnected && c === document.querySelector(`.heat-cell[data-date="${c.dataset.date}"]`);
  });
  check('切换工具前后同一个圆点还是同一个 DOM 节点（点阵没有重建）', sameNode);

  // 年度铸币套装：点拉环，板子滑上去露出礼盒；再点一下原路关上
  const { closed: proofClosed, mid: proofMid, open: proofOpen, back: proofBack } = await proofCycle(page);
  check(
    '点拉环打开铸币套装：aria-expanded，月章数等于有活动的月份数，礼盒和板子一样高',
    proofClosed.expanded === 'false' && proofClosed.caseInert && proofOpen.expanded === 'true' && proofOpen.controls === 'region' && proofOpen.medals === proofOpen.months && proofOpen.months > 0 && proofOpen.plateInert && !proofOpen.caseInert && proofOpen.boxH === proofOpen.plateH,
    `${proofOpen.medals} 枚 / ${proofOpen.months} 个月 · 高 ${proofOpen.boxH} / ${proofOpen.plateH}`,
  );
  check(
    '电脑 1440：打开中途和打开后盒子都和板子一样高，托盘 6 × 2 不用滑动，拉环和第一排铸币之间至少 16px',
    proofMid.boxH === proofMid.plateH && proofOpen.cols === 6 && proofOpen.rows === 2 && !proofOpen.slides && proofOpen.clearance >= 16,
    `中途 ${proofMid.boxH} / ${proofMid.plateH}（${proofMid.sliding ? `滑到 ${proofMid.ty.toFixed(0)}px` : '没赶上过渡'}）· ${proofOpen.cols} × ${proofOpen.rows} · 拉环下 ${proofOpen.clearance?.toFixed(1)}px`,
  );
  check('再点一下原路关上，板子上的控件又能用', proofBack.expanded === 'false' && !proofBack.plateInert && proofBack.caseInert && proofBack.boxH === proofBack.plateH, JSON.stringify(proofBack));

  // 年度铸币套装：3D 月章、悬停、点开飞出、Esc 飞回
  await page.locator('.proof-pull').click();
  await waitUntil(page, '月章换成 3D 图片', () => document.querySelector('.proof-tray').classList.contains('has-art'));
  const swaps = await page.evaluate(() => window.__artSwaps);
  check('月章换成 3D 图片：每个铸好的月份一张，换上时全部已经解码（一起换，不逐枚跳）', swaps.length > 0 && swaps.every((w) => w.imgs === w.slots && w.imgs > 0 && w.ready), JSON.stringify(swaps));

  // 落定还没播完就点开：抬起会停掉落定动画，交给单枚查看以后不能再从头播一遍（不然飞回来时凹槽里是透明的）。
  // 挑最后一枚（落定最晚），等滑盖让开、它还在落定时点它的正中
  const lastM = await page.evaluate(() => [...document.querySelectorAll('.proof-slot[data-m]')].at(-1).dataset.m);
  await waitUntil(page, '滑盖让开、最后一枚还在落定', (m) => {
    const art = document.querySelector(`.proof-slot[data-m="${m}"] .proof-art`);
    const r = art.getBoundingClientRect();
    const reachable = art.closest('.proof-slot').contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    return reachable && art.getAnimations().some((a) => a.animationName === 'proof-settle');
  }, lastM);
  const early = await page.evaluate((m) => {
    const slot = document.querySelector(`.proof-slot[data-m="${m}"]`);
    const art = slot.querySelector('.proof-art');
    const r = art.getBoundingClientRect();
    const w = (window.__earlyWatch = { during: false, lifted: false, replayed: false, done: false, opacity: '' });
    // 抬起只有 0.19 秒，慢的一帧会错过：用 class 变动来记。加上 is-lifting 那一刻，旧的 class 里还没有 is-settled，才算落定中点开的
    new MutationObserver((list, obs) => {
      for (const r of list) {
        if (w.lifted || (r.oldValue ?? '').includes('is-lifting') || !slot.classList.contains('is-lifting')) continue;
        w.lifted = true;
        w.during = !(r.oldValue ?? '').includes('is-settled');
        obs.disconnect();
      }
    }).observe(slot, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    const tick = () => {
      // 抬起时停掉落定动画是对的；抬起结束以后又出现，就是重播了
      if (w.lifted && !slot.classList.contains('is-lifting') && art.getAnimations().some((a) => a.animationName === 'proof-settle')) w.replayed = true;
      if (!window.__escAt || performance.now() - window.__escAt < 1200) return requestAnimationFrame(tick);
      w.opacity = getComputedStyle(art).opacity;
      w.done = true;
    };
    requestAnimationFrame(tick);
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, lastM);
  await page.mouse.click(early.x, early.y);
  await waitUntil(page, '落定中点开的月章打开', () => document.body.classList.contains('is-inspecting'));
  await page.waitForTimeout(300);
  await page.evaluate(() => (window.__escAt = performance.now()));
  await page.keyboard.press('Escape');
  await waitUntil(page, '落定中点开的月章关上', () => document.querySelector('#overlay').hidden);
  await waitUntil(page, '落定中点开的月章：Esc 后 1.2 秒', () => window.__earlyWatch.done);
  const earlyWatch = await page.evaluate(() => window.__earlyWatch);
  check('落定还没播完就点开月章：落定动画不从头重播，飞回后不透明', earlyWatch.during && earlyWatch.lifted && !earlyWatch.replayed && earlyWatch.opacity === '1', JSON.stringify(earlyWatch));

  // 等滑盖和落定动画都走完（软件渲染一帧要一两秒，不能按固定时间等）
  await waitUntil(page, '滑盖和托盘里的动画走完', () => ['.proof-sheet', '.proof-tray'].every((s) => document.querySelector(s).getAnimations({ subtree: true }).length === 0));

  const bead = await page.evaluate(() => {
    const c = document.querySelector('.proof-slot[data-m] .proof-hit circle[data-date]');
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, date: c.dataset.date };
  });
  await page.mouse.move(bead.x, bead.y);
  await page.waitForTimeout(200);
  const tipShown = await page.evaluate(() => !document.querySelector('.heat-tip').hidden);
  check('悬停 3D 月章上的珠子，显示当天的详情', tipShown, bead.date);
  await page.mouse.move(5, 5);

  const slotM = await page.evaluate(() => document.querySelector('.proof-slot[data-m]').dataset.m);
  await page.locator(`.proof-slot[data-m="${slotM}"]`).click();
  await waitUntil(page, '月章打开', () => document.body.classList.contains('is-inspecting'));
  await page.waitForTimeout(700);
  const medalOpen = await page.evaluate((m) => ({
    title: document.querySelector('[data-title]').textContent,
    facts: document.querySelectorAll('[data-medal-facts] div').length,
    factsShown: !document.querySelector('[data-medal-facts]').hidden,
    descHidden: document.querySelector('[data-desc]').hidden,
    replayHidden: document.querySelector('[data-replay]').hidden,
    hash: location.hash,
    out: document.querySelector(`.proof-slot[data-m="${m}"]`).classList.contains('is-out'),
  }), slotM);
  check(
    '点开月章：单枚查看显示月份和三行数字，没有说明和重播，地址栏不写 hash，托盘里留空凹槽',
    medalOpen.title === `${Number(slotM) + 1} 月` && medalOpen.facts === 3 && medalOpen.factsShown && medalOpen.descHidden && medalOpen.replayHidden && medalOpen.hash === '' && medalOpen.out,
    JSON.stringify(medalOpen),
  );

  // 从按下 Esc 起逐帧看，直到那一格去掉 is-out（月章落回凹槽）后再看 0.4 秒：3D 图片不能重播落定动画
  await page.evaluate((m) => {
    const slot = document.querySelector(`.proof-slot[data-m="${m}"]`);
    const art = slot.querySelector('.proof-art');
    const w = (window.__settleWatch = { back: false, replayed: false, done: false, opacity: '' });
    let backAt = 0;
    const t0 = performance.now();
    new MutationObserver((list, obs) => {
      if (!list.some((r) => (r.oldValue ?? '').includes('is-out')) || slot.classList.contains('is-out')) return;
      w.back = true;
      backAt = performance.now();
      obs.disconnect();
    }).observe(slot, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    const tick = () => {
      if (art.getAnimations().some((a) => a.animationName === 'proof-settle')) w.replayed = true;
      // 一直没落回来也不无限等：20 秒后收尾，back 是 false，检查照常失败
      const over = w.back ? performance.now() - backAt >= 400 : performance.now() - t0 >= 20000;
      if (!over) return requestAnimationFrame(tick);
      w.opacity = getComputedStyle(art).opacity;
      w.done = true;
    };
    requestAnimationFrame(tick);
  }, slotM);
  await page.keyboard.press('Escape');
  await waitUntil(page, '月章关上', () => document.querySelector('#overlay').hidden);
  const medalBack = await page.evaluate((m) => {
    const slot = document.querySelector(`.proof-slot[data-m="${m}"]`);
    return { focused: document.activeElement === slot, out: slot.classList.contains('is-out'), tile: document.querySelector('#overlay').classList.contains('is-tile') };
  }, slotM);
  check('Esc 关上：焦点回到那一格，凹槽里的月章回来了', medalBack.focused && !medalBack.out && !medalBack.tile, JSON.stringify(medalBack));
  await waitUntil(page, '月章落回凹槽后 0.4 秒', () => window.__settleWatch.done);
  const settle = await page.evaluate(() => window.__settleWatch);
  check('飞回落定后月章不透明，落定动画没有重播', settle.back && !settle.replayed && settle.opacity === '1', JSON.stringify(settle));

  await page.locator(`.proof-slot[data-m="${slotM}"]`).focus();
  await page.keyboard.press('Enter');
  await waitUntil(page, '键盘打开月章', () => document.body.classList.contains('is-inspecting'));
  check('月章可以用键盘打开', await page.evaluate(() => document.body.classList.contains('is-inspecting')));
  await page.keyboard.press('Escape');
  await waitUntil(page, '键盘打开的月章关上', () => document.querySelector('#overlay').hidden);

  // 月章关上后马上点开陈列墙上的徽章：照旧写 hash、显示说明，不带月章的样式和信息
  await page.locator('.tile:not(.is-locked)').first().click();
  await waitUntil(page, '陈列墙徽章打开', () => document.body.classList.contains('is-inspecting'));
  await page.waitForTimeout(700);
  const wallAfter = await page.evaluate(() => ({
    hash: location.hash,
    tile: document.querySelector('#overlay').classList.contains('is-tile'),
    desc: !document.querySelector('[data-desc]').hidden,
    facts: document.querySelector('[data-medal-facts]').hidden,
    legend: document.querySelector('[data-medal-legend]').hidden,
  }));
  check('月章关上后点开陈列墙徽章：写 hash、显示说明，月章的数字和图例都藏起来', wallAfter.hash.length > 1 && !wallAfter.tile && wallAfter.desc && wallAfter.facts && wallAfter.legend, JSON.stringify(wallAfter));
  await page.keyboard.press('Escape');
  await waitUntil(page, '陈列墙徽章关上', () => document.querySelector('#overlay').hidden);

  await page.locator('.proof-pull').click(); // 收起礼盒，后面的检查照旧在热力图上
  await waitUntil(page, '礼盒收起', () => !document.querySelector('.proof').classList.contains('is-shown'));

  // 再拉开一次：已经是 3D 图片，落定动画照样从头播（关上时摘掉了 is-settled）。在动画开始那一刻读，不按固定时间等
  await page.evaluate(() => {
    const w = (window.__reopenSettle = { started: false, running: false });
    const tray = document.querySelector('.proof-tray');
    const on = (e) => {
      if (e.animationName !== 'proof-settle' || !e.target.classList.contains('proof-art') || !e.target.closest('.proof-slot[data-m]')) return;
      w.started = true;
      w.running = e.target.getAnimations().some((a) => a.animationName === 'proof-settle' && a.playState === 'running');
      tray.removeEventListener('animationstart', on);
    };
    tray.addEventListener('animationstart', on);
  });
  await page.locator('.proof-pull').click();
  await waitUntil(page, '重新拉开后 3D 月章开始落定', () => window.__reopenSettle.started);
  const reopen = await page.evaluate(() => ({ ...window.__reopenSettle, art: document.querySelector('.proof-tray').classList.contains('has-art') }));
  check('关上再拉开：3D 月章的落定动画重新播放', reopen.art && reopen.started && reopen.running, JSON.stringify(reopen));
  // 落定播完（也就过了拉环忙碌的那 1 秒）再关上，后面的检查照旧在热力图上
  await waitUntil(page, '重新拉开后滑盖和托盘里的动画走完', () => ['.proof-sheet', '.proof-tray'].every((s) => document.querySelector(s).getAnimations({ subtree: true }).length === 0));
  await page.locator('.proof-pull').click();
  await waitUntil(page, '礼盒再次收起', () => !document.querySelector('.proof').classList.contains('is-shown'));

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
  await page.waitForFunction(() => window.__badgeApp.posterReady && window.__badgeApp.posterURL, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/desktop-poster.png` });
  const posterPNG = async () => Buffer.from((await page.evaluate(() => window.__badgeApp.posterURL)).split(',')[1], 'base64');
  const buf = await posterPNG();
  writeFileSync(`${out}/poster.png`, buf);
  check('分享海报是 2160 像素宽的 PNG', buf.readUInt32BE(16) === 2160, `${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`);
  const pm = await page.evaluate(() => ({ modes: window.__badgeApp.posterModes, mode: window.__badgeApp.posterMode, brand: window.__badgeApp.brand, buttons: document.querySelectorAll('[data-poster-modes] button').length }));
  check('两个工具都有数据：弹窗里有三段切换，默认是当前工具', pm.modes.length === 3 && pm.buttons === 3 && pm.mode === pm.brand, JSON.stringify(pm));
  const previewW = await page.evaluate(() => document.querySelector('[data-poster-preview] img')?.naturalWidth);
  check('预览是缩小的图（720 宽），下载才用原尺寸', previewW === 720, String(previewW));
  await page.locator('[data-poster-modes] [data-mode="duo"]').click();
  await page.waitForFunction(() => window.__badgeApp.posterMode === 'duo' && window.__badgeApp.posterReady, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__badgeApp.posterURL, null, { timeout: 30000 });
  const duo = await posterPNG();
  writeFileSync(`${out}/poster-duo.png`, duo);
  check('两个一起：新海报同样 2160 宽，高度和单个工具不同', duo.readUInt32BE(16) === 2160 && duo.readUInt32BE(20) !== buf.readUInt32BE(20), `${duo.readUInt32BE(16)}×${duo.readUInt32BE(20)}`);
  const rendersBefore = await page.evaluate(() => window.__badgeApp.posterRenders);
  await page.locator(`[data-poster-modes] [data-mode="${pm.modes[0]}"]`).click();
  await page.waitForFunction((m) => window.__badgeApp.posterMode === m && window.__badgeApp.posterReady, pm.modes[0], { timeout: 30000 });
  check('切回画过的形式直接用缓存，不重画', (await page.evaluate(() => window.__badgeApp.posterRenders)) === rendersBefore);
  await page.keyboard.press('Escape');
  check('Esc 关闭海报', !(await page.locator('#poster').isVisible()));

  // GitHub 主页徽章图：只有已解锁的徽章，透明背景，1680 像素宽
  await page.locator('[data-shelf]').click();
  // 逐枚渲染几十枚徽章：真实显卡约 5 秒，软件渲染（CI）要几分钟
  await page.waitForFunction(() => window.__badgeApp.shelfURL, null, { timeout: 600000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/desktop-shelf.png` });
  const shelfURL = await page.evaluate(() => window.__badgeApp.shelfURL);
  const shelf = Buffer.from(shelfURL.split(',')[1], 'base64');
  writeFileSync(`${out}/shelf.png`, shelf);
  // 右下角应该透明；第一枚徽章的中心应该不透明（徽章确实画上去了）
  const cell = (SHELF.width - SHELF.pad * 2) / SHELF.cols;
  const firstBadge = [(SHELF.pad + cell / 2) * SHELF.scale, (SHELF.pad + SHELF.head + SHELF.badge / 2) * SHELF.scale];
  const [shelfCorner, badgeAlpha] = await page.evaluate(async ([src, first]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return [g.getImageData(c.width - 2, c.height - 2, 1, 1).data[3], g.getImageData(first[0], first[1], 1, 1).data[3]];
  }, [shelfURL, firstBadge]);
  check('主页徽章图是 1680 像素宽、背景透明的 PNG', shelf.readUInt32BE(16) === 1680 && shelfCorner === 0, `${shelf.readUInt32BE(16)}×${shelf.readUInt32BE(20)}，右下角透明度 ${shelfCorner}`);
  check('主页徽章图里画出了徽章', badgeAlpha > 200, `第一枚中心透明度 ${badgeAlpha}`);
  check('主页徽章图面板有提示文字，可以下载', (await page.locator('[data-shelf-status]').textContent()).length > 0 && (await page.locator('[data-shelf-download]').isEnabled()));
  await page.keyboard.press('Escape');
  check('Esc 关闭主页徽章图', !(await page.locator('#shelf').isVisible()));
  // 放在最后：铸币的 WebGL 上下文丢了，换回刻度环（读屏重新读得到下方的数字）
  const lost = await page.evaluate(async () => {
    const fig = document.querySelector('[data-coin]');
    fig.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
    await new Promise((r) => setTimeout(r, 300));
    return { has: fig.classList.contains('has-coin'), canvasHidden: fig.querySelector('canvas').hidden, ticks: getComputedStyle(fig.querySelector('.profile-ticks')).display !== 'none', countHidden: fig.querySelector('.profile-count').getAttribute('aria-hidden') };
  });
  check('全解锁徽章的上下文丢了就换回刻度环', !lost.has && lost.canvasHidden && lost.ticks && lost.countHidden === null, JSON.stringify(lost));
  check('展示层控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 手机 ----------
{
  const { page, errors } = await session({ width: 390, height: 844 }, 'mobile');
  const wallOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('手机端陈列墙（含热力图）无横向溢出', !wallOverflow);
  // 手机：礼盒和板子一样高，托盘仍是 6 × 2，在礼盒里横向滑动
  const m = await proofCycle(page);
  check(
    '手机 390：铸币套装打开中途、打开后、关上后都和板子一样高，托盘 6 列可以横向滑动，页面无横向溢出',
    m.mid.boxH === m.mid.plateH && m.open.boxH === m.open.plateH && m.back.boxH === m.back.plateH && m.open.cols === 6 && m.open.slides && !m.open.overflow,
    `中途 ${m.mid.boxH} / ${m.mid.plateH} · 开 ${m.open.boxH} / ${m.open.plateH} · 关 ${m.back.boxH} · ${m.open.cols} 列 · 滑动 ${m.open.slides}`,
  );
  await page.evaluate(() => window.__badgeApp.open('seven-day-streak'));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/mobile-inspect.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('手机端无横向溢出', !overflow);
  // 导出面板：在屏幕正中，两侧留白；盖住的说明文字淡出，Esc 收起后淡回来
  await waitAwardDone(page);
  await page.locator('[data-export-toggle]').click();
  const mTextOpen = await infoTextAt(page, '0');
  const mPanel = await page.evaluate(() => {
    const r = document.querySelector('#export-panel').getBoundingClientRect();
    return { off: r.left + r.width / 2 - innerWidth / 2, left: r.left, right: innerWidth - r.right };
  });
  await page.screenshot({ path: `${out}/mobile-export-panel.png` });
  await page.keyboard.press('Escape');
  const mTextBack = await infoTextAt(page, '1');
  const mClosed = !(await page.locator('#export-panel').isVisible());
  check(
    '手机 390：导出面板在屏幕正中、两侧至少 16px，打开时说明文字淡出，Esc 收起后淡回来',
    Math.abs(mPanel.off) <= 1 && mPanel.left >= 16 && mPanel.right >= 16 && mTextOpen.every((o) => o === '0') && mTextBack.every((o) => o === '1') && mClosed,
    `偏 ${mPanel.off.toFixed(1)}px · 左 ${mPanel.left.toFixed(0)} 右 ${mPanel.right.toFixed(0)} · ${mTextOpen.join(',')} → ${mTextBack.join(',')}`,
  );
  const mLeave = await leaveWithPanelOpen(page);
  check('手机 390：导出面板开着时退出单枚查看，说明文字不回闪', mLeave.peak <= mLeave.open + 0.005,
    `打开时 ${mLeave.open} · 峰值 ${mLeave.peak.toFixed(3)}（${mLeave.n} 帧）· ${mLeave.series}`);
  check('手机端控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 同意过头像的页面：海报带上头像和 @登录名（示例数据 + 注入的示例身份，用项目标志当头像） ----------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const avatar = `data:image/png;base64,${readFileSync(new URL('../assets/logo.png', import.meta.url)).toString('base64')}`;
  await page.addInitScript((a) => (window.__AGENT_BADGES_IDENTITY__ = { login: 'sample-dev', avatar: a }), avatar);
  await page.goto(url, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
  await page.locator('[data-share]').click();
  await page.waitForFunction(() => window.__badgeApp.posterReady && window.__badgeApp.posterURL, null, { timeout: 60000 });
  const id = await page.evaluate(async (a) => {
    const img = new Image();
    img.src = a;
    await img.decode().catch(() => {});
    return { avatarLoads: img.naturalWidth > 0, hintHidden: document.querySelector('[data-poster-hint]').hidden, url: window.__badgeApp.posterURL };
  }, avatar);
  const png = Buffer.from(id.url.split(',')[1], 'base64');
  writeFileSync(`${out}/poster-identity.png`, png);
  check('同意过头像：海报照常生成（2160 宽），头像图能加载，不再提示加头像', png.readUInt32BE(16) === 2160 && id.avatarLoads && id.hintHidden, `${png.readUInt32BE(16)} · 头像 ${id.avatarLoads} · 提示隐藏 ${id.hintHidden}`);
  check('同意过头像的页面控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 中等宽度（820）：铭牌栏仍在左边，托盘放不下 6 枚，在礼盒里横向滑动 ----------
{
  const page = await browser.newPage({ viewport: { width: 820, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
  const m = await proofCycle(page);
  check(
    '中等宽度 820：铸币套装打开中途、打开后、关上后都和板子一样高，托盘 6 列可以横向滑动，页面无横向溢出',
    m.mid.boxH === m.mid.plateH && m.open.boxH === m.open.plateH && m.back.boxH === m.back.plateH && m.open.cols === 6 && m.open.slides && !m.open.overflow && !m.closed.overflow,
    `中途 ${m.mid.boxH} / ${m.mid.plateH} · 开 ${m.open.boxH} / ${m.open.plateH} · 关 ${m.back.boxH} · ${m.open.cols} 列 · 滑动 ${m.open.slides}`,
  );
  check('中等宽度控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 减少动态效果（手机 390）：铸币套装和热力图都直接切换 ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
  await page.locator('.proof-pull').click();
  // 点下去之后立刻读：不等任何一帧动画
  const opened = await page.evaluate(() => {
    const box = document.querySelector('.proof');
    const sheet = box.querySelector('.proof-sheet');
    return {
      anims: box.getAnimations({ subtree: true }).map((a) => a.transitionProperty ?? a.animationName),
      boxH: box.offsetHeight,
      plateH: box.querySelector('.heat-plate').offsetHeight,
      slid: Math.abs(new DOMMatrix(getComputedStyle(sheet).transform).m42 + sheet.offsetHeight - 6) < 0.5,
      heightTransition: getComputedStyle(box).transitionProperty.includes('height') && parseFloat(getComputedStyle(box).transitionDuration) > 0,
    };
  });
  check('减少动态效果：铸币套装直接打开，盒子高度没有过渡、等于板子', opened.anims.length === 0 && opened.slid && opened.boxH === opened.plateH && !opened.heightTransition, JSON.stringify(opened));
  // 点开月章：不抬起、不从原位起飞，遮罩照常整体淡入；Esc 照常关上
  await waitUntil(page, '减少动态效果：月章换成 3D 图片', () => document.querySelector('.proof-tray').classList.contains('has-art'));
  const rmSlot = page.locator('.proof-slot[data-m]').first();
  await rmSlot.click();
  await waitUntil(page, '减少动态效果：月章打开', () => document.body.classList.contains('is-inspecting'));
  const rmOpen = await page.evaluate(() => ({
    tile: document.querySelector('#overlay').classList.contains('is-tile'),
    shown: !document.querySelector('#overlay').hidden,
    out: document.querySelector('.proof-slot[data-m]').classList.contains('is-out'),
  }));
  await page.keyboard.press('Escape');
  await waitUntil(page, '减少动态效果：月章关上', () => document.querySelector('#overlay').hidden);
  const rmClosed = await page.evaluate(() => ({ inspecting: document.body.classList.contains('is-inspecting'), tile: document.querySelector('#overlay').classList.contains('is-tile') }));
  check('减少动态效果：点开月章不从原位起飞（遮罩没有 is-tile、托盘那一格不留空），Esc 照常关上', rmOpen.shown && !rmOpen.tile && !rmOpen.out && !rmClosed.inspecting && !rmClosed.tile, JSON.stringify({ rmOpen, rmClosed }));
  await page.locator('.proof-pull').click();
  await page.locator('.heat-legend .heat-brand[data-id="codex"]').click();
  await page.locator('.heat-years [data-d="-1"]').click();
  const heat = await page.evaluate(() => ({
    anims: document.querySelector('.heat').getAnimations({ subtree: true }).length,
    first: document.querySelector('.heat-cell[data-date]').dataset.date,
    year: document.querySelector('.heat-year').textContent.trim(),
  }));
  check('减少动态效果：切换工具和年份直接切换，没有淡入淡出和数字滚动', heat.anims === 0 && heat.first === '2025-01-01' && heat.year === '2025', JSON.stringify(heat));
  check('减少动态效果控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 3D 图片解码失败：托盘一直用 SVG ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  // 托盘换图前解码的是还没挂进页面的新图片，只让这些解码失败（陈列墙缩略图挂在格子里，照常解码）；记下托盘有没有加过 has-art
  await page.addInitScript(() => {
    window.__decodeTried = 0;
    window.__artSeen = false;
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      if (this.isConnected) return decode.call(this);
      window.__decodeTried++;
      return Promise.reject(new DOMException('测试：解码失败', 'EncodingError'));
    };
    new MutationObserver(() => {
      if (document.querySelector('.proof-tray.has-art')) window.__artSeen = true;
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await page.goto(url, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
  await page.locator('.proof-pull').click();
  await waitProof(page, true);
  // 解码是图片画好之后的最后一步：等它被调过、再等落定动画走完，图片要来早就来了
  await waitUntil(page, '解码失败：托盘试过解码', () => window.__decodeTried > 0);
  await waitUntil(page, '解码失败：托盘里的动画走完', () => document.querySelector('.proof-tray').getAnimations({ subtree: true }).length === 0);
  const svgOnly = await page.evaluate(() => ({
    tried: window.__decodeTried,
    artSeen: window.__artSeen,
    hasArt: document.querySelector('.proof-tray').classList.contains('has-art'),
    medals: [...document.querySelectorAll('.proof-slot[data-m] .proof-medal')].map((el) => getComputedStyle(el).opacity),
  }));
  check(
    '3D 图片解码失败：托盘从没换上 3D 图片，SVG 月章都看得见',
    svgOnly.tried > 0 && !svgOnly.artSeen && !svgOnly.hasArt && svgOnly.medals.length > 0 && svgOnly.medals.every((o) => o === '1'),
    JSON.stringify(svgOnly),
  );
  check('解码失败时控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 英文界面：铸币套装的读屏名字用英文状态，和铭牌上的字一致 ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.replace('lang=zh', 'lang=en'), { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
  const en = await page.evaluate(() => {
    const box = document.querySelector('.proof');
    return {
      name: box.querySelector('.proof-case').getAttribute('aria-label'),
      year: box.querySelector('[data-year]').textContent,
      plaque: box.querySelector('[data-status]').textContent,
    };
  });
  check(
    '英文页面铸币套装的读屏名字是英文状态，和铭牌一致',
    /^\d{4} proof set · MINTING · \d+ \/ 12$/.test(en.name) && en.name === `${en.year} proof set · ${en.plaque}` && !/[一-鿿]/.test(en.name),
    `${en.name} | 铭牌 ${en.plaque}`,
  );
  check('英文界面控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- Codex 品牌 ----------
{
  const codexUrl = url.replace('source=mock', 'source=mock&brand=codex');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(codexUrl, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
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
