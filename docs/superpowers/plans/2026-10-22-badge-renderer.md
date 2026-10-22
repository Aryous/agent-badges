# 统一徽章渲染服务 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「把一枚徽章画成图片」只有一个入口，「展示用状态」只定义在一处；所有输出逐像素不变。

**Architecture:** 现在有五处各写一套「组装 → 加入场景 → 截图 → 移出 → 释放」，外加各自的逐张调度。它们是陈列墙缩略图、落地页画廊、主页图、studio 和宣传片。新建 `src/viewer/badge-renderer.js`（`createBadgeRenderer`），提供 `snapshot`（画现成的徽章）和 `image`（临时组装、画完释放）；逐张调度收成 `src/viewer/frame.js` 的 `forEachFrame`。三套展示用状态的规则收进 `src/brands/shared/showcase.js`，各有名字，规则本身一字不改：

- 落地页：最高一级；
- studio：留住惊喜；
- 宣传片：指定等级、进度填满。

先写一个视觉回归脚本 `scripts/visual.mjs`，改动前拍基线，每个任务结束都逐像素比对。

**Tech Stack:** Vanilla ES modules, three.js, Vite 8, Vitest 5, Node ≥ 22.15, playwright-core（浏览器检查）。

**决定（用户已确认）：** 展示用状态采用「两种（实为三种）都保留，收在一处、起清楚的名字」，视觉完全不变。落地页是否改成「留惊喜」以后单独决定，不在本计划内。

## Global Constraints

- 仓库：`/Users/lucas/Documents/Code/agent-badges`，分支 `main`。每个任务结束提交一次，提交信息以 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 结尾；不推送。
- **视觉逐像素不变**：每个任务结束运行 `node scripts/visual.mjs capture screenshots/visual-new && node scripts/visual.mjs compare screenshots/visual-base screenshots/visual-new`，输出必须是 `303 张全部一致`、退出码 0。基线 `screenshots/visual-base` 在 Task 1 生成，必须和后续比对在同一天（示例数据的日期跟着当天走）。`screenshots/` 已在 `.gitignore` 里。
- 开发服务器须在 5199 端口运行（`npx vite --port 5199`，在仓库根目录）；视觉脚本和 `npm run check:browser` 都依赖它。开工前用 `lsof -iTCP:5199 -sTCP:LISTEN` 确认。
- 不改这些文件：`src/viewer/snapshot.js`、`src/app/export-panel.js`、`src/app/inspect.js`、`src/viewer/inspector.js`、`src/viewer/mount-badge.js`。导出 PNG 画的是正在查看的那一枚的当前角度，不归渲染服务管。
- 分层（`tests/contracts.test.js` 守护）：
  - `src/brands/shared/showcase.js` 不 import 任何东西；
  - `src/viewer/badge-renderer.js` 只 import `src/viewer/` 和 `src/engine/`。
- 代码注释、测试名沿用中文；AGENTS.md、CONTRIBUTING.md 只写英文。
- 不加依赖；npm 包零运行时依赖不变。
- `window.__badgeApp`、`window.__site`、`window.__studio`、`window.__promo` 的接口不变。

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `scripts/visual.mjs` | 新建 | 视觉回归：拍下所有「徽章画成图片」的输出，逐像素比对 |
| `src/brands/shared/showcase.js` | 新建 | 三种展示用状态：`peakState`、`surpriseKeptState`、`filledState` |
| `tests/showcase.test.js` | 新建 | 三种状态和原来手写的规则逐字段一致 |
| `src/viewer/frame.js` | 修改 | 加 `forEachFrame`：逐个处理、每个之间让出一帧、可暂停可取消 |
| `tests/frame.test.js` | 新建 | `forEachFrame` 的顺序、暂停、取消 |
| `src/viewer/badge-renderer.js` | 新建 | `createBadgeRenderer(stage?)` → `{ stage, snapshot, image }` |
| `src/app/thumbnails.js` | 修改 | 用 `snapshot` + `forEachFrame` |
| `src/viewer/shelf.js` | 修改 | 用 `image` + `forEachFrame`；删掉自建离屏舞台 |
| `src/site/main.js`、`landing.html`、`src/site/site.css` | 修改 | 画廊用渲染服务（自带离屏舞台），删掉 `#thumb-stage`；首屏和画廊用 `peakState` |
| `src/project/studio.js` | 修改 | 用 `image` + `surpriseKeptState` |
| `tools/promo/main.js` | 修改 | 徽章墙用 `image`；状态用 `filledState` |
| `tests/contracts.test.js` | 修改 | 只有渲染服务和导出面板直接调 `renderBadgePNG` |
| `AGENTS.md`、`CONTRIBUTING.md` | 修改 | 地图、约定 18、检查表、目录树 |

---

### Task 1: 视觉回归脚本和基线

**Files:**
- Create: `scripts/visual.mjs`
- Modify: `AGENTS.md`（"Which checks to run" 表格加一行）
- Modify: `CONTRIBUTING.md`（浏览器检查列表加一条）

**Interfaces:**
- Produces: `node scripts/visual.mjs capture <目录>`、`node scripts/visual.mjs compare <基线目录> <新目录>`；基线目录 `screenshots/visual-base`（303 张）。后续每个任务都用它验收。

- [ ] **Step 1: 写脚本**

创建 `scripts/visual.mjs`，内容如下（已在当前 main 上实测：303 张，两次拍摄逐像素一致；故意换图、删图都能报出来）：

```js
// 视觉回归：把所有「徽章画成图片」的输出存成 PNG，改动前后逐像素比对。
// 用法：
//   node scripts/visual.mjs capture <目录>           需要开发服务器：npx vite --port 5199
//   node scripts/visual.mjs compare <基线目录> <新目录>  有任何一个像素不同就以退出码 1 结束
// 拍什么：studio 渲染的每枚徽章（正面、斜角；分级徽章另拍最高一级）、陈列墙缩略图、主页图、落地页画廊、宣传片的徽章墙。
// 示例数据的日期跟着当天走：基线和改动后要在同一天拍。
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRANDS } from '../src/brands/index.js';

const BASE = 'http://localhost:5199';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [cmd, dirA, dirB] = process.argv.slice(2);
if (!['capture', 'compare'].includes(cmd) || !dirA || (cmd === 'compare' && !dirB)) {
  console.error('用法：node scripts/visual.mjs capture <目录> | compare <基线目录> <新目录>');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const save = (name, dataURL) => writeFileSync(join(dirA, `${name}.png`), Buffer.from(dataURL.split(',')[1], 'base64'));

async function open(path, ready) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error(`页面报错 ${path}: ${e.message}`));
  await page.goto(BASE + path);
  await page.waitForFunction(ready, null, { timeout: 180000 });
  return page;
}

async function capture() {
  mkdirSync(dirA, { recursive: true });
  let n = 0;

  // studio：每枚徽章正面 + 斜角；分级徽章再拍最高一级（含顶级彩蛋外形）
  const studio = await open('/tools/studio.html', () => window.__studio?.ready);
  const jobs = [{ brand: 'logo' }]; // 项目标志：和 scripts/assets.mjs 一样不写 id
  for (const { brand, badges } of BRANDS) {
    for (const c of badges) {
      jobs.push({ brand: brand.id, id: c.id, showcase: true });
      if (c.tiers) jobs.push({ brand: brand.id, id: c.id, tier: c.tiers.length - 1, tag: 'top' });
    }
  }
  for (const { tag = 'showcase', ...job } of jobs) {
    for (const [view, angle, tilt] of [['front', 0, 0], ['angle', 0.52, 0.2]]) {
      const url = await studio.evaluate((o) => window.__studio.render(o), { ...job, angle, tilt, size: 1024, engraving: 1024 });
      save(`studio--${job.brand}--${job.id ?? 'logo'}--${tag}--${view}`, url);
      n++;
    }
  }
  await studio.close();

  // 陈列墙缩略图（示例数据）；第一个工具的页面上再生成一张主页图
  for (const [i, { brand }] of BRANDS.entries()) {
    const wall = await open(`/?source=mock&lang=zh&brand=${brand.id}`, () => window.__badgeApp?.ready);
    const tiles = await wall.evaluate(() => [...document.querySelectorAll('.tile')].map((t) => [t.dataset.id, t.querySelector('img').src]));
    for (const [id, src] of tiles) save(`wall--${brand.id}--${id}`, src);
    n += tiles.length;
    if (i === 0) {
      await wall.evaluate(() => window.__badgeApp.openShelf());
      await wall.waitForFunction(() => window.__badgeApp.shelfURL, null, { timeout: 180000 });
      save('shelf--dark', await wall.evaluate(() => window.__badgeApp.shelfURL));
      n++;
    }
    await wall.close();
  }

  // 落地页画廊：两个标签各拍一遍
  const site = await open('/landing.html?lang=zh', () => window.__site?.ready);
  await site.locator('[data-gallery]').scrollIntoViewIfNeeded();
  for (const [i, { brand, badges }] of BRANDS.entries()) {
    if (i > 0) await site.locator('[data-gallery-tabs] button').nth(i).click();
    await site.waitForFunction((count) => document.querySelectorAll('.gallery-item.is-ready').length === count, badges.length, { timeout: 180000 });
    const items = await site.evaluate(() => [...document.querySelectorAll('.gallery-item')].map((a) => [new URL(a.href).hash.slice(1), a.querySelector('img').src]));
    for (const [id, src] of items) save(`gallery--${brand.id}--${id}`, src);
    n += items.length;
  }
  await site.close();

  // 宣传片的徽章墙
  const promo = await open('/tools/promo.html?aspect=16x9&lang=en', () => window.__promo?.ready);
  const walls = await promo.evaluate(() => [...document.querySelectorAll('#wall img')].map((img) => img.src));
  walls.forEach((src, i) => save(`promo--wall--${String(i).padStart(2, '0')}`, src));
  n += walls.length;
  await promo.close();

  console.log(`${n} 张 → ${dirA}`);
}

async function compare() {
  const page = await browser.newPage();
  const names = readdirSync(dirA).filter((f) => f.endsWith('.png')).sort();
  const extra = readdirSync(dirB).filter((f) => f.endsWith('.png') && !names.includes(f));
  let bad = extra.length;
  for (const f of extra) console.log(`多出 ${f}`);
  for (const name of names) {
    let B;
    try {
      B = readFileSync(join(dirB, name)).toString('base64');
    } catch {
      console.log(`缺少 ${name}`);
      bad++;
      continue;
    }
    const A = readFileSync(join(dirA, name)).toString('base64');
    if (A === B) continue;
    const r = await page.evaluate(async ([A, B]) => {
      const load = (s) => new Promise((ok, fail) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = fail;
        img.src = 'data:image/png;base64,' + s;
      });
      const [ia, ib] = await Promise.all([load(A), load(B)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} → ${ib.width}x${ib.height}` };
      const px = (img) => {
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, img.width, img.height).data;
      };
      const da = px(ia);
      const db = px(ib);
      let count = 0;
      let max = 0;
      for (let i = 0; i < da.length; i += 4) {
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(da[i + k] - db[i + k]));
        if (m > 0) count++;
        if (m > max) max = m;
      }
      return { count, max };
    }, [A, B]);
    if (r.size || r.count > 0) {
      bad++;
      console.log(`不同 ${name}  ${r.size ?? `${r.count} 个像素，最大差 ${r.max}`}`);
    }
  }
  console.log(bad ? `${bad}/${names.length} 张不同` : `${names.length} 张全部一致`);
  return bad;
}

const bad = cmd === 'capture' ? (await capture(), 0) : await compare();
await browser.close();
process.exit(bad ? 1 : 0);
```

- [ ] **Step 2: 拍基线，并确认可重复**

```bash
cd /Users/lucas/Documents/Code/agent-badges
lsof -iTCP:5199 -sTCP:LISTEN   # 没有就先在仓库根目录运行 npx vite --port 5199
rm -rf screenshots/visual-base screenshots/visual-new
node scripts/visual.mjs capture screenshots/visual-base
node scripts/visual.mjs capture screenshots/visual-new
node scripts/visual.mjs compare screenshots/visual-base screenshots/visual-new
```

Expected：两次 capture 都打印 `303 张 → …`；compare 打印 `303 张全部一致`，退出码 0。数目不是 303 就停下报告（studio 154 + 陈列墙 62 + 主页图 1 + 画廊 62 + 宣传片 24）。

- [ ] **Step 3: 写进文档**

`AGENTS.md` 的 "Which checks to run" 表格，在 `| Landing page (...) |` 这一行之后加一行：

```markdown
| Refactors that must not change how anything looks (engine, `src/viewer/`, rendering) | + `node scripts/visual.mjs capture <dir>` before and after (dev server on 5199, same day), then `node scripts/visual.mjs compare <before> <after>`: any differing pixel fails |
```

`CONTRIBUTING.md` 的 "Browser checks" 列表，在 `` - `node scripts/assets.mjs` regenerates `` 这一条之后加一条：

```markdown
- `node scripts/visual.mjs capture <dir>` saves every badge image the app renders (studio, wall thumbnails, shelf, landing gallery, promo wall). Capture before and after a refactor, then `node scripts/visual.mjs compare <before> <after>`: any differing pixel fails. Needs the dev server on 5199; sample data follows today's date, so capture both on the same day.
```

- [ ] **Step 4: 跑测试并提交**

```bash
npx vitest run
git add scripts/visual.mjs AGENTS.md CONTRIBUTING.md
git commit -m "test: visual regression script for every rendered badge image

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected：`Tests  413 passed`。

---

### Task 2: 展示用状态收进 `src/brands/shared/showcase.js`

**Files:**
- Create: `src/brands/shared/showcase.js`
- Create: `tests/showcase.test.js`
- Modify: `src/site/main.js`（删掉本地 `showcaseState`，改用 `peakState`）
- Modify: `src/project/studio.js`（删掉本地 `showcaseTier` 和内联规则，改用 `surpriseKeptState`）
- Modify: `tools/promo/main.js`（删掉本地 `showcase`，改用 `filledState`）
- Modify: `AGENTS.md`（Map 里 `src/brands/` 一行）、`CONTRIBUTING.md`（brands 目录树）

**Interfaces:**
- Produces:
  - `peakState(config) → state`；
  - `surpriseKeptState(config, base) → state`；
  - `filledState(config, tier?) → state`；
  - `SHOWCASE_DATE = '2026-10-24'`。

  `state` 是 `{ unlocked, earnedAt, tier, value?, progress? }`，和 `normalizeProgress` 输出的形状相同。Task 4 的落地页、studio、宣传片都用这三个函数。

- [ ] **Step 1: 写失败的测试**

创建 `tests/showcase.test.js`。期望值就是三处原来手写的规则，逐字段照抄，保证行为不变：

```js
import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { SHOWCASE_DATE, filledState, peakState, surpriseKeptState } from '../src/brands/shared/showcase.js';

// 三套展示用状态，期望值照抄自原来 src/site/main.js、src/project/studio.js、tools/promo/main.js 里手写的规则
const all = BRANDS.flatMap((b) => b.badges);
const hidden = all.find((c) => c.hidden);
const plain = all.find((c) => !c.hidden && !c.tiers);
const surprise = all.find((c) => c.tiers?.at(-1).variants);
const noSurprise = { ...surprise, tiers: surprise.tiers.map(({ variants: _v, ...t }) => t) };
const base = { unlocked: false, earnedAt: '2025-08-02', tier: 1, value: 1_200_000_000, progress: { current: 1_200_000_000, target: 10_000_000_000 } };

describe('peakState（落地页）', () => {
  it('分级徽章看最高一级', () => {
    expect(peakState(surprise)).toEqual({ unlocked: true, earnedAt: SHOWCASE_DATE, tier: surprise.tiers.length - 1, value: 0, progress: { current: 1, target: 1 } });
  });
  it('普通徽章已解锁、没有等级', () => {
    expect(peakState(plain)).toEqual({ unlocked: true, earnedAt: '2026-10-24', tier: null, value: 0, progress: { current: 1, target: 1 } });
  });
  it('隐藏徽章保持神秘', () => {
    expect(peakState(hidden)).toEqual({ unlocked: false, earnedAt: null, tier: null, value: 0, progress: { current: 0, target: 1 } });
  });
});

describe('surpriseKeptState（studio 素材）', () => {
  it('最高一级是随机彩蛋时，展示它下面一级，其余字段沿用示例数据', () => {
    expect(surpriseKeptState(surprise, base)).toEqual({ ...base, unlocked: true, earnedAt: '2025-08-02', tier: surprise.tiers.length - 2 });
  });
  it('最高一级不是彩蛋时就展示最高一级', () => {
    expect(surpriseKeptState(noSurprise, base).tier).toBe(noSurprise.tiers.length - 1);
  });
  it('示例数据没有日期时用展示日期', () => {
    expect(surpriseKeptState(plain, { ...base, earnedAt: null })).toEqual({ ...base, unlocked: true, earnedAt: SHOWCASE_DATE, tier: null });
  });
  it('隐藏徽章：在示例数据上改成未解锁', () => {
    expect(surpriseKeptState(hidden, base)).toEqual({ ...base, unlocked: false, earnedAt: null, tier: null });
  });
});

describe('filledState（宣传片）', () => {
  it('默认最高一级，进度按这一级的门槛填满', () => {
    const top = surprise.tiers.length - 1;
    const value = surprise.tiers[top].threshold;
    expect(filledState(surprise)).toEqual({ unlocked: true, earnedAt: '2026-05-02', tier: top, value, progress: { current: value, target: value } });
  });
  it('可以指定等级', () => {
    const value = surprise.tiers[1].threshold;
    expect(filledState(surprise, 1)).toEqual({ unlocked: true, earnedAt: '2026-05-02', tier: 1, value, progress: { current: value, target: value } });
  });
  it('普通徽章进度是 1 / 1', () => {
    expect(filledState(plain)).toEqual({ unlocked: true, earnedAt: '2026-05-02', tier: null, value: 1, progress: { current: 1, target: 1 } });
  });
});
```

- [ ] **Step 2: 确认测试失败**

Run: `npx vitest run tests/showcase.test.js`
Expected: FAIL，找不到模块 `src/brands/shared/showcase.js`。

- [ ] **Step 3: 写实现**

创建 `src/brands/shared/showcase.js`：

```js
// 展示用的徽章状态：不看真实进度，只是把徽章摆出来给人看。
// 三个地方的规则不同，各有名字，统一放在这里，调用处不要再手写一份：
//   peakState          落地页画廊和首屏：分级徽章看最高一级（顶级彩蛋取第 0 款），隐藏徽章保持神秘
//   surpriseKeptState  README 素材（tools/studio.html）：最高一级是随机彩蛋时展示它下面一级，留住惊喜
//   filledState        宣传片：指定等级（默认最高一级），进度按这一级的门槛填满

/** 落地页和素材上显示的获得日期。 */
export const SHOWCASE_DATE = '2026-10-24';

/** 宣传片里的获得日期。 */
const PROMO_DATE = '2026-05-02';

const topTier = (tiers) => tiers.length - 1;

/** 落地页：分级徽章看最高一级，隐藏徽章保持神秘，其余都已解锁。 */
export function peakState(config) {
  if (config.hidden) return { unlocked: false, earnedAt: null, tier: null, value: 0, progress: { current: 0, target: 1 } };
  const tier = config.tiers ? topTier(config.tiers) : null;
  return { unlocked: true, earnedAt: SHOWCASE_DATE, tier, value: 0, progress: { current: 1, target: 1 } };
}

/**
 * README 素材：在示例数据的这枚徽章状态（base）上改。分级徽章看最高一级；
 * 最高一级是随机款式的彩蛋时，展示它下面一级，留住惊喜。隐藏徽章保持神秘。
 */
export function surpriseKeptState(config, base) {
  if (config.hidden) return { ...base, unlocked: false, earnedAt: null, tier: null };
  const { tiers } = config;
  const tier = tiers ? (tiers.at(-1).variants ? topTier(tiers) - 1 : topTier(tiers)) : null;
  return { ...base, unlocked: true, earnedAt: base.earnedAt ?? SHOWCASE_DATE, tier };
}

/** 宣传片：指定等级（默认最高一级），进度按这一级的门槛填满。宣传片不放隐藏徽章，这里不处理。 */
export function filledState(config, tier) {
  const t = config.tiers ? (tier ?? topTier(config.tiers)) : null;
  const value = config.tiers ? config.tiers[t].threshold : 1;
  return { unlocked: true, earnedAt: PROMO_DATE, tier: t, value, progress: { current: value, target: value } };
}
```

- [ ] **Step 4: 确认测试通过**

Run: `npx vitest run tests/showcase.test.js`
Expected: PASS（10 个测试）。

- [ ] **Step 5: 落地页改用 `peakState`**

`src/site/main.js`：

1. 在 import 区，`import { badgeTitle } from '../brands/shared/text.js';` 之后加一行：
   ```js
   import { peakState } from '../brands/shared/showcase.js';
   ```
2. 删掉整个本地函数（含注释）：
   ```js
   /** 展示用的状态：分级徽章看最高级，隐藏徽章保持神秘。 */
   function showcaseState(config) {
     if (config.hidden) return { unlocked: false, earnedAt: null, tier: null, value: 0, progress: { current: 0, target: 1 } };
     const tier = config.tiers ? config.tiers.length - 1 : null;
     return { unlocked: true, earnedAt: '2026-10-24', tier, value: 0, progress: { current: 1, target: 1 } };
   }
   ```
3. 把剩下的两处 `showcaseState(config)`（`heroItem` 里一处、`startGallery` 的 `render` 里一处）改成 `peakState(config)`。

- [ ] **Step 6: studio 改用 `surpriseKeptState`**

`src/project/studio.js`：

1. 在 import 区，`import { BRANDS, getBrand } from '../brands/index.js';` 之后加一行：
   ```js
   import { surpriseKeptState } from '../brands/shared/showcase.js';
   ```
2. 删掉：
   ```js
   /** 展示用的等级：最高一级；最高一级是随机款式的彩蛋时，展示它下面一级，留住惊喜。 */
   const showcaseTier = (tiers) => (tiers.at(-1).variants ? tiers.length - 2 : tiers.length - 1);
   ```
3. 把
   ```js
       // 展示用：分级徽章看最高级，隐藏徽章保持神秘，其余都已解锁
       if (showcase) {
         state = config.hidden
           ? { ...state, unlocked: false, earnedAt: null, tier: null }
           : { ...state, unlocked: true, earnedAt: state.earnedAt ?? '2026-10-24', tier: config.tiers ? showcaseTier(config.tiers) : null };
       }
   ```
   换成
   ```js
       // 展示用：其余都已解锁，分级徽章留住顶级彩蛋的惊喜（见 brands/shared/showcase.js）
       if (showcase) state = surpriseKeptState(config, state);
   ```

- [ ] **Step 7: 宣传片改用 `filledState`**

`tools/promo/main.js`：

1. 在 import 区，`import { badgeTitle, tierName } from '../../src/brands/shared/text.js';` 之后加一行：
   ```js
   import { filledState } from '../../src/brands/shared/showcase.js';
   ```
2. 删掉：
   ```js
   /** 展示用状态：分级徽章用最高级（或指定级），其余都已解锁。 */
   function showcase(config, tier = null) {
     const t = config.tiers ? (tier ?? config.tiers.length - 1) : null;
     const value = config.tiers ? config.tiers[t].threshold : 1;
     return { unlocked: true, earnedAt: '2026-05-02', tier: t, value, progress: { current: value, target: value } };
   }
   ```
3. 把 `showcase(config)` 改成 `filledState(config)`，`showcase(tokens, i)` 改成 `filledState(tokens, i)`（各一处）。

- [ ] **Step 8: 文档**

`AGENTS.md` Map 表 `src/brands/` 一行里，把 `` `shared/` medal layout, parts, top-tier designs `` 改成 `` `shared/` medal layout, parts, top-tier designs, showcase states ``。

`CONTRIBUTING.md` brands 目录树里，把

```
│                 lantern, calendar…), top-tier.js (the three top-tier designs), pixel-art.js, text.js
```

改成

```
│                 lantern, calendar…), top-tier.js (the three top-tier designs), pixel-art.js, text.js,
│                 showcase.js (display states for the landing page, studio and promo)
```

- [ ] **Step 9: 全部测试、残留检查、视觉比对**

```bash
npx vitest run
grep -rn "showcaseState\|showcaseTier\|function showcase" src tools   # 应该没有输出
node scripts/visual.mjs capture screenshots/visual-new
node scripts/visual.mjs compare screenshots/visual-base screenshots/visual-new
```

Expected：`Tests  423 passed`（413 + 10）；grep 无输出；`303 张全部一致`。

- [ ] **Step 10: 提交**

```bash
git add src/brands/shared/showcase.js tests/showcase.test.js src/site/main.js src/project/studio.js tools/promo/main.js AGENTS.md CONTRIBUTING.md
git commit -m "refactor: showcase states live in one place, each with a name

peakState (landing), surpriseKeptState (studio assets) and filledState
(promo) keep their exact rules; only the location changes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 渲染服务和逐张调度；陈列墙缩略图、主页图改用它

**Files:**
- Modify: `src/viewer/frame.js`（加 `forEachFrame`）
- Create: `tests/frame.test.js`
- Create: `src/viewer/badge-renderer.js`
- Modify: `src/app/thumbnails.js`
- Modify: `src/viewer/shelf.js`

**Interfaces:**
- Consumes: `createStage(canvas)`（`src/viewer/scene.js`）；`renderBadgePNG({ stage, items, item, size, fill, background })`（`src/viewer/snapshot.js`）；`mountBadge(config, brand, state, { stage, lang, engraving })`（`src/viewer/mount-badge.js`）；`disposeBadge(badge)`（`src/engine/badge.js`）；`nextFrame()`（`src/viewer/frame.js`）。
- Produces:
  - `forEachFrame(list, fn, { pause?, cancelled? }) → Promise<boolean>`：
    - 按顺序 `await fn(x)`，每个之后让出一帧；
    - 每个开始前先 `await pause()`，然后若 `cancelled()` 为真就停下并返回 `false`；
    - 全部做完返回 `true`。
  - `createBadgeRenderer(stage?) → { stage, snapshot(item, opts) → string, image(config, brand, state, opts) → string }`：
    - `snapshot` 的 opts 为 `{ size, fill, angle = 0, tilt = 0, background = null }`；
    - `image` 的 opts 为 `{ lang, engraving, size, fill, angle, tilt, background }`；
    - 不传 stage 时自建一个不显示的离屏舞台；
    - 返回 PNG data URL。

  Task 4 的落地页、studio、宣传片都用这两个接口。

- [ ] **Step 1: 写 `forEachFrame` 的失败测试**

创建 `tests/frame.test.js`：

```js
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { forEachFrame } from '../src/viewer/frame.js';

// nextFrame 在页面不可见时用消息通道让出；Node 里也有 MessageChannel，这里把页面设成「不可见」
beforeAll(() => {
  globalThis.document = { visibilityState: 'hidden' };
});
afterAll(() => {
  delete globalThis.document;
});

describe('forEachFrame', () => {
  it('按顺序处理，每个开始前先等 pause', async () => {
    const log = [];
    const done = await forEachFrame([1, 2, 3], async (x) => log.push(`do ${x}`), { pause: async () => log.push('pause') });
    expect(done).toBe(true);
    expect(log).toEqual(['pause', 'do 1', 'pause', 'do 2', 'pause', 'do 3']);
  });

  it('cancelled 返回 true 就停下，结果是 false', async () => {
    const seen = [];
    const done = await forEachFrame([1, 2, 3], (x) => seen.push(x), { cancelled: () => seen.length === 2 });
    expect(seen).toEqual([1, 2]);
    expect(done).toBe(false);
  });

  it('空列表直接完成', async () => {
    expect(
      await forEachFrame([], () => {
        throw new Error('不该调用');
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `npx vitest run tests/frame.test.js`
Expected: FAIL，`forEachFrame` 不是函数（frame.js 还没导出它）。

- [ ] **Step 3: 实现 `forEachFrame`**

在 `src/viewer/frame.js` 的 `nextFrame` 函数之后（`idle` 之前）加入：

```js
/**
 * 逐个处理 list，每个之间让出一帧，页面不会卡住。
 * pause：每个开始前先等它（比如等单枚查看关上）；cancelled：返回 true 就停下（比如中途切换了标签）。
 * @returns {Promise<boolean>} 是否全部做完
 */
export async function forEachFrame(list, fn, { pause, cancelled } = {}) {
  for (const x of list) {
    if (pause) await pause();
    if (cancelled?.()) return false;
    await fn(x);
    await nextFrame();
  }
  return true;
}
```

Run: `npx vitest run tests/frame.test.js`
Expected: PASS（3 个测试）。

- [ ] **Step 4: 写渲染服务**

创建 `src/viewer/badge-renderer.js`：

```js
import { disposeBadge } from '../engine/badge.js';
import { createStage } from './scene.js';
import { renderBadgePNG } from './snapshot.js';
import { mountBadge } from './mount-badge.js';

// 把徽章画成图片（PNG data URL）的唯一入口：陈列墙缩略图、落地页画廊、主页图、素材工作台、宣传片都走这里。
// 单枚查看的实时画面和「导出 PNG」画的是正在查看的那一枚，不归这里（见 app/inspect.js、app/export-panel.js）。

/** 建在不显示的画布上的舞台，只用来截图；绘图缓冲由截图按需放大（见 snapshot.js）。 */
function offscreenStage() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'none';
  document.body.appendChild(canvas);
  return createStage(canvas);
}

/**
 * @param {object} [stage]  createStage 的结果；不给就自己建一个离屏舞台
 */
export function createBadgeRenderer(stage = offscreenStage()) {
  /**
   * 画一枚已经组装好的徽章（mountBadge 的结果）：摆到原点、按角度转好，截一张图，再移出场景。
   * @param {{ badge, pivot, holder }} item
   * @param {{ size?: number, fill?: number, angle?: number, tilt?: number, background?: string | null }} [opts]
   * @returns {string}
   */
  function snapshot(item, { size, fill, angle = 0, tilt = 0, background = null } = {}) {
    item.holder.position.set(0, 0, 0);
    item.holder.scale.setScalar(1);
    item.pivot.rotation.set(tilt, angle, 0);
    stage.scene.add(item.holder);
    try {
      return renderBadgePNG({ stage, items: [item], item, size, fill, background });
    } finally {
      stage.scene.remove(item.holder);
    }
  }

  /**
   * 临时组装一枚徽章，画完立即释放它独占的显卡资源。
   * opts：snapshot 的选项，另加 lang（背面刻字语言）和 engraving（刻字贴图边长）。
   * @returns {string}
   */
  function image(config, brand, state, { lang, engraving, ...shot } = {}) {
    const item = mountBadge(config, brand, state, { stage, lang, engraving });
    try {
      return snapshot(item, shot);
    } finally {
      disposeBadge(item.badge);
    }
  }

  return { stage, snapshot, image };
}
```

说明（不用写进代码）：

- `renderBadgePNG` 的 `size`、`fill` 有默认值，传 `undefined` 时生效；所有调用方都会显式传入。
- `mountBadge` 的 `lang` 默认 `'zh'`，`engraving` 为 `undefined` 时不换贴图，和原来各调用方的行为一致。

- [ ] **Step 5: 陈列墙缩略图改用渲染服务**

把 `src/app/thumbnails.js` 整个替换为：

```js
import { createBadgeRenderer } from '../viewer/badge-renderer.js';
import { forEachFrame } from '../viewer/frame.js';

const THUMB_SIZE = 480;

/**
 * 逐枚渲染缩略图，每枚之间让出一帧，页面不会卡住。
 * inspect：单枚查看面板。查看时陈列墙被挡住，缩略图先停下，关上后再接着画，
 * 不和正在转动的那枚抢主线程和显卡。徽章用 ensureBuilt 组装，画完留着给单枚查看用。
 */
export async function renderThumbnails(ctx, { grid, profile, inspect }) {
  const renderer = createBadgeRenderer(ctx.stage);
  await forEachFrame(
    ctx.items,
    (item) => {
      ctx.ensureBuilt(item);
      const src = renderer.snapshot(item, { size: THUMB_SIZE, fill: 0.92 });
      grid.setThumbnail(item, src);
      profile.setThumbnail(item.config.id, src);
      item.thumb = src;
    },
    { pause: inspect.whenClosed },
  );
}
```

- [ ] **Step 6: 主页图改用渲染服务**

`src/viewer/shelf.js`：

1. 把这几行 import
   ```js
   import { createStage } from './scene.js';
   import { renderBadgePNG } from './snapshot.js';
   import { mountBadge } from './mount-badge.js';
   import { disposeBadge } from '../engine/badge.js';
   import { nextFrame } from './frame.js';
   ```
   换成
   ```js
   import { createBadgeRenderer } from './badge-renderer.js';
   import { forEachFrame } from './frame.js';
   ```
2. 删掉 `// 离屏舞台只建一次……` 注释、`let stage = null;`、整个 `offscreenStage()` 函数和整个 `badgeImage()` 函数，换成：
   ```js
   // 离屏渲染只建一次：反复生成时不必每次新开 WebGL 上下文
   let renderer = null;
   ```
3. 在 `renderShelves` 里，把
   ```js
     let done = 0;
     const images = new Map();
     for (const group of layout.groups) {
       for (const it of group.items) {
         images.set(it, await badgeImage(it.config, group.brand, it.state, lang));
         onProgress?.(++done, total);
       }
     }
   ```
   换成
   ```js
     renderer ??= createBadgeRenderer();
     let done = 0;
     const images = new Map();
     const jobs = layout.groups.flatMap((group) => group.items.map((it) => ({ brand: group.brand, it })));
     await forEachFrame(jobs, async ({ brand, it }) => {
       const src = renderer.image(it.config, brand, it.state, { lang, size: THUMB, fill: 0.92 });
       images.set(it, await loadImage(src));
       onProgress?.(++done, total);
     });
   ```

- [ ] **Step 7: 测试、浏览器检查、视觉比对**

```bash
npx vitest run
npm run build
npm run check:browser
npm run check:shelf
node scripts/visual.mjs capture screenshots/visual-new
node scripts/visual.mjs compare screenshots/visual-base screenshots/visual-new
```

Expected：

- `Tests  426 passed`；
- `check:browser` 44/44；
- `check:shelf` 17/17；
- 视觉比对 `303 张全部一致`。

- [ ] **Step 8: 提交**

```bash
git add src/viewer/frame.js tests/frame.test.js src/viewer/badge-renderer.js src/app/thumbnails.js src/viewer/shelf.js
git commit -m "refactor: one badge renderer; wall thumbnails and shelf use it

createBadgeRenderer owns mount → snapshot → dispose; forEachFrame owns
yielding, pausing and cancelling between items.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 落地页、studio、宣传片改用渲染服务；约定和文档

**Files:**
- Modify: `src/site/main.js`
- Modify: `landing.html`（删 `#thumb-stage` 画布）
- Modify: `src/site/site.css`（删 `#thumb-stage` 规则）
- Modify: `src/project/studio.js`
- Modify: `tools/promo/main.js`
- Modify: `tests/contracts.test.js`
- Modify: `AGENTS.md`（Map 的 `src/viewer/` 行，Contracts 加第 18 条）、`CONTRIBUTING.md`（目录树的 `viewer/` 行）

**Interfaces:**
- Consumes:
  - Task 3 的 `createBadgeRenderer(stage?)`（`snapshot` / `image`）和 `forEachFrame`；
  - Task 2 的 `peakState`、`surpriseKeptState`、`filledState`。

- [ ] **Step 1: 写失败的约定测试**

在 `tests/contracts.test.js` 末尾加：

```js
describe('徽章画成图片只有一个入口', () => {
  it('只有 viewer/badge-renderer.js 和导出面板直接调 renderBadgePNG', () => {
    const users = [...filesUnder('src'), ...filesUnder('tools')].filter((f) => f !== 'src/viewer/snapshot.js' && /\brenderBadgePNG\b/.test(withoutComments(read(f))));
    expect(sorted(users)).toEqual(['src/app/export-panel.js', 'src/viewer/badge-renderer.js']);
  });
});
```

Run: `npx vitest run tests/contracts.test.js`
Expected: FAIL，多出 `src/project/studio.js`、`src/site/main.js`、`tools/promo/main.js`。

- [ ] **Step 2: 落地页画廊改用渲染服务**

`src/site/main.js`：

1. import 区：
   - 删掉 `import { renderBadgePNG } from '../viewer/snapshot.js';`、`import { mountBadge } from '../viewer/mount-badge.js';`；
   - 把 `import { buildBadge, disposeBadge } from '../engine/badge.js';` 改成 `import { buildBadge } from '../engine/badge.js';`；
   - 把 `import { idle, nextFrame } from '../viewer/frame.js';` 改成 `import { forEachFrame, idle } from '../viewer/frame.js';`；
   - 加一行 `import { createBadgeRenderer } from '../viewer/badge-renderer.js';`。
2. 在 `startGallery` 里，把开头到 `render` 函数结束这一段（从 `function startGallery() {` 到 `render` 的右花括号）替换为：

```js
function startGallery() {
  const renderer = createBadgeRenderer(); // 自带离屏舞台，只用来截图
  const root = $('[data-gallery]');
  const tabs = $('[data-gallery-tabs]');
  const cache = new Map();
  let token = 0;

  async function render(b) {
    const my = ++token;
    root.style.setProperty('--accent-tab', b.brand.ui.accent);
    root.innerHTML = '';
    const cells = b.badges.map((config) => {
      const state = peakState(config);
      const a = document.createElement('a');
      a.className = 'gallery-item' + (state.unlocked ? '' : ' is-locked');
      a.href = demoURL(b.brand.id, config.id);
      a.title = t('gallery.open');
      a.innerHTML = `<span class="gallery-art"><img alt="" /></span><span class="gallery-name"></span>`;
      a.querySelector('.gallery-name').textContent = config.hidden ? '???' : badgeTitle(config, lang, state.tier);
      root.appendChild(a);
      return { a, config, state, key: `${b.brand.id}/${config.id}` };
    });
    const show = ({ a, key }) => {
      const img = a.querySelector('img');
      img.src = cache.get(key);
      img.decode?.().catch(() => {}).finally(() => a.classList.add('is-ready'));
    };
    // 画过的直接显示；没画过的逐张画，中途切换了标签就停下
    cells.filter((c) => cache.has(c.key)).forEach(show);
    await forEachFrame(
      cells.filter((c) => !cache.has(c.key)),
      (c) => {
        cache.set(c.key, renderer.image(c.config, b.brand, c.state, { lang, size: 360, fill: 0.92 }));
        show(c);
      },
      { cancelled: () => my !== token },
    );
  }
```

（`render` 之后的标签按钮和 IntersectionObserver 代码不变。）

3. `landing.html` 删掉这一行：
   ```html
       <canvas id="thumb-stage" aria-hidden="true"></canvas>
   ```
4. `src/site/site.css` 删掉这一段：
   ```css
   /* 画廊用的离屏画布：不显示，绘图缓冲由截图按需放大（见 viewer/snapshot.js） */
   #thumb-stage {
     display: none;
   }
   ```
5. 确认 `src/site/main.js` 里不再出现 `thumb-stage`、`renderBadgePNG`、`mountBadge`、`disposeBadge`、`nextFrame`：
   ```bash
   grep -n "thumb-stage\|renderBadgePNG\|mountBadge\|disposeBadge\|nextFrame" src/site/main.js landing.html src/site/site.css
   ```
   Expected: 无输出。

- [ ] **Step 3: studio 改用渲染服务**

`src/project/studio.js`：

1. import 区：
   - 删掉 `import { renderBadgePNG } from '../viewer/snapshot.js';`、`import { mountBadge } from '../viewer/mount-badge.js';`、`import { disposeBadge } from '../engine/badge.js';`；
   - 加 `import { createBadgeRenderer } from '../viewer/badge-renderer.js';`。
2. 把 `const stage = createStage(document.querySelector('#stage'));` 改成：
   ```js
   const renderer = createBadgeRenderer(createStage(document.querySelector('#stage')));
   ```
3. 把 `render` 函数末尾这一段
   ```js
     const item = mountBadge(config, brand, state, { stage, lang, engraving });
     const { badge, pivot, holder } = item;
     pivot.rotation.set(tilt, angle, 0);
     stage.scene.add(holder);
     try {
       return renderBadgePNG({ stage, items: [item], item, size, fill, background });
     } finally {
       stage.scene.remove(holder);
       // 每次都新建一枚徽章，用完就释放；素材脚本会连续渲染几百帧
       disposeBadge(badge);
     }
   ```
   换成
   ```js
     // 每次都新建一枚徽章，画完就释放；素材脚本会连续渲染几百帧
     return renderer.image(config, brand, state, { lang, engraving, angle, tilt, size, fill, background });
   ```

- [ ] **Step 4: 宣传片徽章墙改用渲染服务**

`tools/promo/main.js`：

1. import 区：
   - 删掉 `import { renderBadgePNG } from '../../src/viewer/snapshot.js';`；
   - 加 `import { createBadgeRenderer } from '../../src/viewer/badge-renderer.js';`。
2. 在 `stage.resize();`（紧跟 `stage.renderer.setPixelRatio(2);` 的那一行）之后加：
   ```js
   const renderer = createBadgeRenderer(stage);
   ```
3. 在 `prepare()` 里，把
   ```js
       for (const config of b.badges.filter((c) => !c.hidden).slice(0, 12)) {
         const item = holderFor(config, b.brand, filledState(config));
         stage.scene.add(item.holder);
         const img = new Image();
         img.src = renderBadgePNG({ stage, items: [item], item, size: 320, fill: 0.92 });
         stage.scene.remove(item.holder);
         grid.appendChild(img);
         await img.decode();
       }
   ```
   换成
   ```js
       for (const config of b.badges.filter((c) => !c.hidden).slice(0, 12)) {
         const img = new Image();
         img.src = renderer.image(config, b.brand, filledState(config), { lang: LANG, size: 320, fill: 0.92 });
         grid.appendChild(img);
         await img.decode();
       }
   ```

- [ ] **Step 5: 约定和文档**

`AGENTS.md`：

1. Map 表 `src/viewer/` 一行里，把 `mount-badge, snapshot, export` 改成 `mount-badge, badge-renderer, snapshot, export`。
2. Contracts 列表第 17 条之后加：
   ```markdown
   18. Badges become images only through `createBadgeRenderer` (`src/viewer/badge-renderer.js`); only it and the export panel call `renderBadgePNG`. Showcase states (landing page, studio, promo) come from `src/brands/shared/showcase.js` — `tests/contracts.test.js`, `tests/showcase.test.js`
   ```

`CONTRIBUTING.md` 目录树里，把

```
├─ viewer/    stage, wall, inspector, heatmap, poster, shelf, i18n, snapshot and export
```

改成

```
├─ viewer/    stage, wall, inspector, heatmap, poster, shelf, i18n, badge renderer, snapshot and export
```

- [ ] **Step 6: 全部测试和检查**

```bash
npx vitest run
grep -rn "renderBadgePNG\|createStage" src tools --include='*.js' | grep -v "^src/viewer/snapshot.js\|^src/viewer/scene.js"
npm run build
npm run check:pack
npm run check:browser
npm run check:shelf
npm run build:site
npm run check:site
node scripts/visual.mjs capture screenshots/visual-new
node scripts/visual.mjs compare screenshots/visual-base screenshots/visual-new
```

Expected：

- `Tests  427 passed`。
- grep 只剩这些行：
  - `renderBadgePNG`：只在 `src/viewer/badge-renderer.js`、`src/app/export-panel.js`；
  - `createStage`：只在
    - `src/app/badges.js`（陈列墙和单枚查看共用的舞台）；
    - `src/site/main.js` 的首屏；
    - `src/project/studio.js`；
    - `src/viewer/badge-renderer.js`；
    - `tools/promo/main.js`。
- 各项检查：
  - `check:pack` 通过；
  - `check:browser` 44/44；
  - `check:shelf` 17/17；
  - `check:site` 20/20；
  - 视觉比对 `303 张全部一致`。

- [ ] **Step 7: 提交**

```bash
git add src/site/main.js landing.html src/site/site.css src/project/studio.js tools/promo/main.js tests/contracts.test.js AGENTS.md CONTRIBUTING.md
git commit -m "refactor: landing gallery, studio and promo render through the badge renderer

Only the renderer and the export panel call renderBadgePNG now (guarded
by tests/contracts.test.js). The landing page no longer needs its own
hidden canvas.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 完成标准

- 「组装 → 截图 → 释放」只有 `src/viewer/badge-renderer.js` 一份；逐张调度只有 `forEachFrame` 一份；展示用状态只有 `src/brands/shared/showcase.js` 一份。
- `scripts/visual.mjs compare` 对 303 张图逐像素一致。
- 测试 427 个全部通过；`check:pack`、`check:browser` 44/44、`check:shelf` 17/17、`check:site` 20/20。
- 不推送、不发版；由用户决定何时合并发布。
