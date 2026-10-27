# 分享海报改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把分享海报改成和主页一致的整版午夜蓝珐琅（单工具 C 版、双工具 D2 版），弹窗里可选分享哪个工具，并支持用户同意后显示 GitHub 头像。

**Architecture:** 先抽出共用的一年点阵 `yearCells` 和珐琅板颜色 `PLATE`（外观不变）。再把海报拆成三部分：
- 纯版面计算 `viewer/poster-layout.js`；
- Canvas 绘制小工具 `viewer/poster-draw.js`；
- 组装 `viewer/poster.js`。

页面面板 `app/poster.js` 管切换、缓存和导出。头像由命令行在用户同意后通过 gh 取得，存进数据目录，以 `window.__AGENT_BADGES_IDENTITY__` 注入页面。

**Tech Stack:** 原生 ES 模块、three.js 0.186.1（只用于截铸币和缩略图）、2D Canvas、Vite、Vitest（node 环境）、Playwright Chrome（`scripts/shoot.mjs`）、Node 22 内置模块（命令行）。

**Spec:** `docs/superpowers/specs/2026-10-27-share-poster-design.md`

## Global Constraints

- 画布宽 1080，输出 2 倍（2160 像素宽）；高度按内容算。
- 字体只用主页加载的 Outfit 500 和 700 两个字重（`src/styles/tokens.css` 只有这两个 woff2）。画之前 `document.fonts.load` 等字体。
- 热力图：
  - 圆点直径 = 列宽 × 0.74；
  - 两个工具同一天时左右各半，左边是第一个工具；
  - 解锁日金边 `#d9bf86`；
  - 未来日和占位格只画淡轮廓 `rgba(184, 169, 130, 0.16)`；
  - 一周起始日：`lang === 'zh' ? 1 : 0`；
  - 不用 `shadowBlur` 画圆点。
- 单工具版式常量：
  - 板离边 28，圆角 34，板内左右边距 84；
  - 头像半径 52，大号年份 72px；
  - 铸币 270；徽章墙 8 列，未解锁透明度 0.42。
- 双工具版式常量：
  - 栏间距 56，铸币 210，每栏徽章墙 5 列；
  - 数字 28px，标签 13px。
- 头像不能画成金属徽章：
  - 有图时裁圆，外加 1.5px 锡色细边 `rgba(160, 152, 138, 0.42)`；
  - 没图时是人像轮廓：圆内 `#1d2a5c`，头和肩 `rgba(154, 163, 196, 0.55)`。
- `window.__badgeApp.posterURL` 保留，仍是 PNG data URL（`scripts/shoot.mjs` 按 base64 拆）。
- 分层：
  - viewer 只引用 viewer、engine、data、brands；
  - share、collect、cli 只用 `node:` 内置模块；
  - share、collect 里不能有 `console.`，也不能引用 i18n；
  - `src/app/` 不引用 `src/share/`。
- 头像只在用户明确同意后才取：
  - 非终端（插件、Agent、脚本）不问、不取；
  - 没装或没登录 gh 时不问；
  - 页面本身不发任何网络请求（头像以 data URL 内嵌）。
- 在线演示站只用示例数据，不能出现 `__AGENT_BADGES_IDENTITY__ =`。
- 实验页文件（`poster-lab.html`、`lab-assets/`、`*-lab*.html`、`medal-lab.html`、`coin-lab.html`）不提交；`git add` 一律写明路径。
- 子代理只用临时目录或示例数据，不碰 `~/.agent-badges`、`~/.claude`、`~/.codex`。头像测试用临时的数据目录。
- 实现和审查都用 Opus。
- 不手动 `npm publish`；这个计划不发版。
- 所有用户可见文字中英文都要有。
- `npm test` 不要接 `| tail`，否则失败会被藏起来。

## File Structure

| 文件 | 职责 | 任务 |
| --- | --- | --- |
| `src/data/calendar.js` | 加 `dayParts`、`yearCells`：一年点阵的纯计算 | 1 |
| `src/viewer/heatmap.js` | `partsOf` 改用 `dayParts`；导出 `PLATE` | 1、2 |
| `src/viewer/month-medal.js`、`src/viewer/proof-set.js` | 写死的珐琅色改引用 `PLATE` | 2 |
| `tests/year-cells.test.js` | `yearCells` / `dayParts` | 1 |
| `tests/heatmap.test.js` | `PLATE` 和 `heatmap.css` 一致 | 2 |
| `src/viewer/poster-layout.js`（新） | 海报版面常量和位置计算（纯函数）、`shareModes` | 3 |
| `tests/poster-layout.test.js`（新） | 版面计算 | 3 |
| `src/viewer/poster-draw.js`（新） | Canvas 绘制小工具：文字、圆点、板底、头像、铸币、数字、徽章墙、图例、页脚、字体加载 | 4 |
| `src/viewer/poster.js` | 重写：`renderPoster({ mode, tools, heat, identity })` | 4 |
| `src/viewer/i18n.js` | 海报新文案 | 4、5 |
| `src/app/load.js` | 多返回 `tools`（所有工具的进度） | 5 |
| `src/app/context.js` | `identity`、`localData` | 5 |
| `src/app/poster-art.js`（新） | 每个工具的铸币截图和缩略图（按工具缓存） | 5 |
| `src/app/poster.js` | 重写：切换、缓存、`toBlob`、缩小预览、下载、`posterURL` | 5 |
| `src/app/automation.js` | `posterMode`、`posterModes`、`posterReady`、`posterRenders`、`setPosterMode` | 5 |
| `index.html`、`src/styles/modal.css` | 切换按钮和提示行 | 5 |
| `scripts/shoot.mjs` | 海报浏览器检查 | 5 |
| `src/share/identity.js`（新） | 头像同意记录、取头像、页面身份 | 6 |
| `src/share/publish.js` | `gh.user()` 多带 `avatarUrl` | 6 |
| `src/share/inject.js` | `identityScript`，`injectData` 第 4 个参数 | 6 |
| `tests/avatar.test.js`（新） | 身份和命令行 | 6、7 |
| `src/cli/commands/avatar.js`（新） | `avatar` 命令和第一次打开时的询问 | 7 |
| `src/cli/args.js`、`src/cli/main.js`、`src/cli/page.js`、`src/cli/commands/open.js`、`profile.js`、`publish.js` | 接上 avatar 和身份注入 | 7 |
| `scripts/build-site.mjs`、`README.md`、`README.zh-CN.md`、`AGENTS.md` | 演示站检查和隐私说明 | 8 |

---

### Task 1: 共用的一年点阵 `yearCells`

**Files:**
- Modify: `src/data/calendar.js`
- Modify: `src/viewer/heatmap.js:157-166`（`partsOf`）
- Test: `tests/year-cells.test.js`（新）

**Interfaces:**
- Produces:
  - `dayParts(date: string, series: {id,color,daily}[], thresholds: Record<id,[a,b,c]>, enabled?: Set<string>|null) → {id,color,level}[]`
  - `yearCells({ year, weekStart, series, markers = {}, enabled = null, now = today() }) → { weekStart, monthStarts, weeks: (null | { date, future, parts, unlocked })[][] }`

- [ ] **Step 0：先拍视觉基线（重构前，必须在改代码之前）**

需要开发服务器在 5199 端口，服务的是这个检出目录。用 `lsof -iTCP:5199 -sTCP:LISTEN` 确认；没有就在后台运行 `npx vite --port 5199`。

```bash
node scripts/visual.mjs capture /tmp/agent-badges-visual-base
```

Expected: 打印拍摄数量（约 299 张），退出码 0。示例数据跟着当天日期走，Task 2 的比对必须同一天做。

- [ ] **Step 1：写失败的测试** `tests/year-cells.test.js`

```js
import { describe, expect, it } from 'vitest';
import { dayParts, levelOf, levelThresholds, yearCells } from '../src/data/calendar.js';

const series = [
  { id: 'a', color: '#D97757', daily: { '2026-01-01': [100, 2], '2026-01-02': [5000, 9], '2026-03-11': [300, 1] } },
  { id: 'b', color: '#7A9DFF', daily: { '2026-01-02': [40, 1] } },
];
const markers = { '2026-01-02': [{ brandId: 'b', id: 'x' }], '2026-03-11': [{ brandId: 'a', id: 'y' }] };
const flat = (cal) => cal.weeks.flat();
const cell = (cal, date) => flat(cal).find((c) => c?.date === date);

describe('yearCells：一年的点阵', () => {
  it('2026-01-01 是周四：周一起始前面空 3 格，周日起始空 4 格', () => {
    const mon = yearCells({ year: 2026, weekStart: 1, series, now: '2026-12-31' });
    const sun = yearCells({ year: 2026, weekStart: 0, series, now: '2026-12-31' });
    expect(mon.weeks[0].slice(0, 4).map((c) => c?.date ?? null)).toEqual([null, null, null, '2026-01-01']);
    expect(sun.weeks[0].slice(0, 5).map((c) => c?.date ?? null)).toEqual([null, null, null, null, '2026-01-01']);
    expect(mon.weekStart).toBe(1);
    expect(sun.weekStart).toBe(0);
  });

  it('这一年的每一天正好出现一次，月份起点和 yearWeeks 一致', () => {
    const cal = yearCells({ year: 2026, weekStart: 1, series, now: '2026-12-31' });
    const dates = flat(cal).filter(Boolean).map((c) => c.date);
    expect(dates).toHaveLength(365);
    expect(new Set(dates).size).toBe(365);
    expect(cal.monthStarts).toHaveLength(12);
    expect(cal.monthStarts[0]).toEqual({ month: 0, col: 0 });
  });

  it('今天之后的日子是未来：没有颜色，也不算解锁', () => {
    const cal = yearCells({ year: 2026, weekStart: 1, series, markers, now: '2026-03-10' });
    expect(cell(cal, '2026-03-11')).toEqual({ date: '2026-03-11', future: true, parts: [], unlocked: false });
    expect(cell(cal, '2026-03-10').future).toBe(false);
  });

  it('一个工具、两个工具：按工具顺序给出档位，左边是第一个', () => {
    const cal = yearCells({ year: 2026, weekStart: 1, series, markers, now: '2026-12-31' });
    const thA = levelThresholds(series[0].daily);
    const thB = levelThresholds(series[1].daily);
    expect(cell(cal, '2026-01-01').parts).toEqual([{ id: 'a', color: '#D97757', level: levelOf([100, 2], thA) }]);
    expect(cell(cal, '2026-01-02').parts).toEqual([
      { id: 'a', color: '#D97757', level: levelOf([5000, 9], thA) },
      { id: 'b', color: '#7A9DFF', level: levelOf([40, 1], thB) },
    ]);
    expect(cell(cal, '2026-01-05').parts).toEqual([]);
  });

  it('解锁：那天有开着的工具的解锁标记；关掉的工具不算', () => {
    const all = yearCells({ year: 2026, weekStart: 1, series, markers, now: '2026-12-31' });
    expect(cell(all, '2026-01-02').unlocked).toBe(true);
    const onlyA = yearCells({ year: 2026, weekStart: 1, series, markers, enabled: new Set(['a']), now: '2026-12-31' });
    expect(cell(onlyA, '2026-01-02').unlocked).toBe(false);
    expect(cell(onlyA, '2026-01-02').parts.map((p) => p.id)).toEqual(['a']);
    expect(cell(onlyA, '2026-03-11').unlocked).toBe(true);
  });
});

describe('dayParts：热力图、海报共用的同一条规则', () => {
  it('enabled 为空表示全部开着', () => {
    const th = Object.fromEntries(series.map((s) => [s.id, levelThresholds(s.daily)]));
    expect(dayParts('2026-01-02', series, th).map((p) => p.id)).toEqual(['a', 'b']);
    expect(dayParts('2026-01-02', series, th, new Set(['b'])).map((p) => p.id)).toEqual(['b']);
    expect(dayParts('2026-02-02', series, th)).toEqual([]);
  });
});
```

- [ ] **Step 2：运行，确认失败**

Run: `npx vitest run tests/year-cells.test.js`
Expected: FAIL，`dayParts` / `yearCells` is not a function（未导出）。

- [ ] **Step 3：在 `src/data/calendar.js` 末尾加实现**

```js
/**
 * 某一天开着的工具里有活动的几个：{ id, color, level }，按工具顺序（左边是第一个）。
 * 热力图、月章、分享海报都用这一条规则。
 * @param {string} date
 * @param {{ id: string, color: string, daily: object }[]} series
 * @param {Record<string, number[]>} thresholds  每个工具的 levelThresholds
 * @param {Set<string> | null} [enabled]  开着的工具；不给表示全部
 */
export function dayParts(date, series, thresholds, enabled = null) {
  const parts = [];
  for (const s of series) {
    if (enabled && !enabled.has(s.id)) continue;
    const level = levelOf(s.daily?.[date], thresholds[s.id]);
    if (level) parts.push({ id: s.id, color: s.color, level });
  }
  return parts;
}

/**
 * 一年的点阵：每周一列（yearWeeks），每格 { date, future, parts, unlocked }，不属于这一年的格子是 null。
 * unlocked：不是未来，且那天有开着的工具的解锁标记（markersFrom 的结果）。
 * @param {object} o
 * @param {number} o.year
 * @param {0 | 1} o.weekStart  0 周日 / 1 周一（页面按语言选：中文周一，英文周日）
 * @param {{ id: string, color: string, daily: object }[]} o.series
 * @param {Record<string, { brandId: string }[]>} [o.markers]
 * @param {Set<string> | null} [o.enabled]
 * @param {string} [o.now]
 */
export function yearCells({ year, weekStart, series, markers = {}, enabled = null, now = today() }) {
  const thresholds = Object.fromEntries(series.map((s) => [s.id, levelThresholds(s.daily)]));
  const on = (id) => !enabled || enabled.has(id);
  const { weeks, monthStarts } = yearWeeks(year, weekStart);
  return {
    weekStart,
    monthStarts,
    weeks: weeks.map((col) =>
      col.map((date) => {
        if (!date) return null;
        const future = date > now;
        return {
          date,
          future,
          parts: future ? [] : dayParts(date, series, thresholds, enabled),
          unlocked: !future && (markers[date] ?? []).some((m) => on(m.brandId)),
        };
      }),
    ),
  };
}
```

- [ ] **Step 4：热力图的 `partsOf` 改用 `dayParts`**

`src/viewer/heatmap.js` 第 5 行的 import 改成：

```js
import { dayParts, levelThresholds, today, yearWeeks } from '../data/calendar.js';
```

（`levelOf` 不再直接用，就从 import 里去掉。先 `grep -n "levelOf" src/viewer/heatmap.js` 确认只剩 import 那一处。）

把第 157–166 行的 `partsOf` 整个换成：

```js
  /** 某一天开着的工具里有活动的几个：{ id, color, level }，按工具顺序（左边是第一个）。 */
  const partsOf = (date) => dayParts(date, series, thresholds, enabled);
```

- [ ] **Step 5：运行测试**

Run: `npx vitest run tests/year-cells.test.js tests/heatmap.test.js tests/proof-set.test.js tests/month-medal.test.js`
Expected: 全部 PASS。

再跑全部：`npm test`
Expected: 全部 PASS（原来 593 个，加上这次新增的）。

- [ ] **Step 6：提交**

```bash
git add src/data/calendar.js src/viewer/heatmap.js tests/year-cells.test.js
git commit -m "refactor: yearCells and dayParts — one rule for the year grid, shared by heatmap, medals and the coming poster

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 珐琅板颜色 `PLATE`，和 CSS 一致

**Files:**
- Modify: `src/viewer/heatmap.js:10-13`
- Modify: `src/viewer/month-medal.js:47`
- Modify: `src/viewer/proof-set.js:139`
- Test: `tests/heatmap.test.js`

**Interfaces:**
- Produces: `PLATE`（从 `src/viewer/heatmap.js` 导出）：

```js
{ plate, sunk, frame, frameInner, ink, sub, month, dim, name, ring, outline }
```

`SUNK === PLATE.sunk`。

- [ ] **Step 1：写失败的测试**，加在 `tests/heatmap.test.js` 末尾（顶部 import 补上 `PLATE`，并加 `import { readFileSync } from 'node:fs';`）

```js
describe('珐琅板颜色：JS 和 CSS 同一份', () => {
  const css = readFileSync(new URL('../src/styles/heatmap.css', import.meta.url), 'utf8');
  const norm = (s) => s.replace(/\s+/g, '').toLowerCase();
  const VARS = { '--plate': 'plate', '--plate-sunk': 'sunk', '--plate-frame': 'frame', '--plate-ink': 'ink', '--plate-sub': 'sub', '--plate-month': 'month', '--plate-dim': 'dim', '--plate-name': 'name', '--plate-ring': 'ring' };

  it('heatmap.css 的 --plate-* 等于 PLATE', () => {
    for (const [v, key] of Object.entries(VARS)) {
      const m = css.match(new RegExp(`${v}:\\s*([^;]+);`));
      expect(m, v).toBeTruthy();
      expect(norm(m[1]), v).toBe(norm(PLATE[key]));
    }
  });

  it('两个 @property 的初始值是凹点色；内框线和淡轮廓也是 PLATE 里的值', () => {
    const inits = [...css.matchAll(/initial-value:\s*([^;]+);/g)].map((m) => norm(m[1]));
    expect(inits).toEqual([norm(PLATE.sunk), norm(PLATE.sunk)]);
    expect(norm(css)).toContain(norm(PLATE.frameInner));
    expect(norm(css)).toContain(norm(PLATE.outline));
    expect(SUNK).toBe(PLATE.sunk);
  });
});
```

- [ ] **Step 2：运行，确认失败**

Run: `npx vitest run tests/heatmap.test.js`
Expected: FAIL，`PLATE` is undefined。

- [ ] **Step 3：在 `src/viewer/heatmap.js` 导出 `PLATE`**

把第 10–11 行的 `SUNK` 定义换成：

```js
/**
 * 珐琅板的颜色（= heatmap.css 的 --plate-*，tests/heatmap.test.js 保证两边一致）。
 * 月章、铸币套装和分享海报都从这里取，不再各写一份。
 */
export const PLATE = {
  plate: '#141f4d', // 板面，和徽章的 midnight 同色
  sunk: '#0d1538', // 凹点：没有活动的日子，也是混色的另一端
  frame: 'rgba(160, 152, 138, 0.42)', // 锡色外框
  frameInner: 'rgba(160, 152, 138, 0.22)', // 内框线、板上的分隔线
  ink: '#f3ead6', // 标题、数字、年份
  sub: '#9aa3c4', // 统计行
  month: '#b8a982', // 沙金色月份
  dim: '#8d96b8', // 星期、图例文字
  name: '#e6dcc4', // 图例里的工具名
  ring: '#d9bf86', // 解锁日的金边
  outline: 'rgba(184, 169, 130, 0.16)', // 未来日和占位格的淡轮廓
};
/** 板上凹点的颜色：没有活动的日子，也是混色的另一端。 */
export const SUNK = PLATE.sunk;
```

先检查 `src/styles/heatmap.css` 里的写法：用 `grep -n "160, 152, 138, 0.22\|184, 169, 130, 0.16" src/styles/heatmap.css` 确认这两个值在 CSS 里就是带空格的这种写法。测试会去掉空白再比，所以写法上空格不同也能过。

- [ ] **Step 4：月章和铸币套装改引用 `PLATE`**

`src/viewer/month-medal.js`：在 import 区加

```js
import { PLATE } from './heatmap.js';
```

第 47 行改成：

```js
  const out = { 'medal:sunk': PLATE.sunk, 'medal:future': '#222c5c', 'medal:unlock': PLATE.ring, 'medal:label': '#d6c49a' };
```

`src/viewer/proof-set.js`：第 4 行 import 加上 `PLATE`：

```js
import { PLATE, enamelColor, escape, SUNK } from './heatmap.js';
```

第 139 行改成：

```js
    <circle cx="80" cy="80" r="75.5" fill="${PLATE.plate}"/>
```

- [ ] **Step 5：运行测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 6：证明外观没变**

开发服务器 5199 仍在运行时：

```bash
node scripts/visual.mjs capture /tmp/agent-badges-visual-after-refactor
node scripts/visual.mjs compare /tmp/agent-badges-visual-base /tmp/agent-badges-visual-after-refactor
npm run build
npm run check:browser
```

Expected:
- `compare` 报告 0 张不同，退出码 0；
- `check:browser` 全部检查通过，控制台无报错（热力图、铸币套装、3D 月章都在这里检查）。

- [ ] **Step 7：提交**

```bash
git add src/viewer/heatmap.js src/viewer/month-medal.js src/viewer/proof-set.js tests/heatmap.test.js
git commit -m "refactor: PLATE — the enamel plate colours live once in heatmap.js, a test keeps heatmap.css equal; medals and proof set use it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 海报版面计算 `poster-layout.js`

**Files:**
- Create: `src/viewer/poster-layout.js`
- Test: `tests/poster-layout.test.js`

**Interfaces:**
- Produces:
  - 常量：`W=1080`、`SCALE=2`、`MARGIN=28`、`IX=84`、`IW=912`、`WD=46`、`DUO='duo'`、`SINGLE={ coin: 270, cols: 8 }`、`DUO_L={ coin: 210, cols: 5, gap: 56, value: 28 }`
  - 函数：
    - `shareModes(ids: string[]) → string[]`
    - `heatStep(weeks, w = IW)`
    - `heatGridHeight(weeks, w = IW)`
    - `gridHeight(n, cols, w)`
    - `headLayout(weeks) → { head, summary, heat, legend, rule }`
    - `singleLayout({ weeks, count }) → { ...head, mid, rule2, grid, foot, H }`
    - `duoLayout({ weeks, counts }) → { ...head, cw, top, grid, gridH, foot, H }`
    - `duoColumn()`
    - `toolCardHeight(coin, value)`

- [ ] **Step 1：写失败的测试** `tests/poster-layout.test.js`

```js
import { describe, expect, it } from 'vitest';
import { DUO, DUO_L, IW, MARGIN, SINGLE, duoColumn, duoLayout, gridHeight, headLayout, heatGridHeight, shareModes, singleLayout, toolCardHeight } from '../src/viewer/poster-layout.js';

describe('能分享的形式', () => {
  it('只有一个工具：只有它自己，不出现「两个一起」', () => {
    expect(shareModes(['a'])).toEqual(['a']);
  });
  it('两个工具：各一种，再加「两个一起」，顺序同热力图', () => {
    expect(shareModes(['a', 'b'])).toEqual(['a', 'b', DUO]);
  });
});

describe('版面', () => {
  it('周数越多，每列越窄，点阵越矮', () => {
    expect(heatGridHeight(54)).toBeLessThan(heatGridHeight(53));
    expect(heatGridHeight(53)).toBeCloseTo(28 + 7 * ((IW - 46) / 53));
  });

  it('徽章墙高度按行数算，最后一行不满也占一整行', () => {
    expect(gridHeight(32, 8, 912)).toBe(4 * 114);
    expect(gridHeight(33, 8, 912)).toBe(5 * 114);
  });

  it('板头各块从上到下排开', () => {
    const h = headLayout(53);
    expect(h.head < h.summary && h.summary < h.heat && h.heat < h.legend && h.legend < h.rule).toBe(true);
  });

  it('单个工具：铸币、细线、徽章墙、页脚依次往下，总高包住页脚和板边', () => {
    const L = singleLayout({ weeks: 53, count: 32 });
    expect(L.mid).toBe(L.rule + 44);
    expect(L.rule2).toBe(L.mid + SINGLE.coin + 44);
    expect(L.foot).toBe(L.grid + gridHeight(32, SINGLE.cols, IW) + 70);
    expect(L.H).toBe(L.foot + 52 + MARGIN);
  });

  it('两个工具：两栏一样宽；徽章墙按徽章多的那一栏算高度', () => {
    const cw = duoColumn();
    expect(cw * 2 + DUO_L.gap).toBeCloseTo(IW);
    const a = duoLayout({ weeks: 53, counts: [32, 30] });
    const b = duoLayout({ weeks: 53, counts: [32, 5] });
    expect(a.gridH).toBe(b.gridH);
    expect(a.gridH).toBe(gridHeight(32, DUO_L.cols, cw));
    expect(a.grid).toBe(a.top + toolCardHeight(DUO_L.coin, DUO_L.value) + 44);
    expect(a.H).toBe(a.foot + 52 + MARGIN);
  });
});
```

- [ ] **Step 2：运行，确认失败**

Run: `npx vitest run tests/poster-layout.test.js`
Expected: FAIL，找不到模块 `src/viewer/poster-layout.js`。

- [ ] **Step 3：写 `src/viewer/poster-layout.js`**

```js
// 分享海报的版面：纯计算，不碰 DOM，方便测试。
// 单个工具是「整版珐琅」：板头、点阵、铸币和累计数字、徽章墙。
// 两个工具是「左右分栏」：板头、点阵之后每个工具一栏。
// 数字照实验页（poster-lab.html）里用户选定的版式。

export const W = 1080;
export const SCALE = 2; // 输出 2160 像素宽
export const MARGIN = 28; // 珐琅板离画布边
export const IX = 84; // 板内左右边距
export const IW = W - IX * 2;
export const WD = 46; // 星期一栏的宽度

export const DUO = 'duo';

/** 弹窗里能选的形式：有数据的工具各一种（顺序同热力图），两个以上时再加「两个一起」。 */
export const shareModes = (ids) => (ids.length > 1 ? [...ids, DUO] : [...ids]);

/** 点阵每列的宽度。 */
export const heatStep = (weeks, w = IW) => (w - WD) / weeks;
/** 点阵（含上面一行月份）的高度。 */
export const heatGridHeight = (weeks, w = IW) => 28 + 7 * heatStep(weeks, w);
/** 徽章墙的高度：每格是正方形，最后一行不满也占一整行。 */
export const gridHeight = (n, cols, w) => Math.ceil(n / cols) * (w / cols);

/** 两种版式共用的上半部分：板头（头像、名字、年份）、统计行、点阵、图例、细线。 */
export function headLayout(weeks) {
  const head = 100;
  const summary = head + 150;
  const heat = summary + 44;
  const legend = heat + heatGridHeight(weeks) + 26;
  const rule = legend + 18 + 40;
  return { head, summary, heat, legend, rule };
}

export const SINGLE = { coin: 270, cols: 8 };

/** 单个工具：细线下面左边铸币、右边累计数字；再一道细线，下面是 8 列徽章墙。 */
export function singleLayout({ weeks, count }) {
  const h = headLayout(weeks);
  const mid = h.rule + 44;
  const rule2 = mid + SINGLE.coin + 44;
  const grid = rule2 + 46;
  const foot = grid + gridHeight(count, SINGLE.cols, IW) + 70;
  return { ...h, mid, rule2, grid, foot, H: foot + 52 + MARGIN };
}

export const DUO_L = { coin: 210, cols: 5, gap: 56, value: 28 };

/** 两栏里每栏的宽度。 */
export const duoColumn = () => (IW - DUO_L.gap) / 2;
/** 一栏的小卡：铸币、工具名、徽章数、三个数字（标签一行加数字一行）。 */
export const toolCardHeight = (coin, value) => coin + 44 + 32 + 30 + 16 + 18 + value;

/** 两个工具：每栏上面是小卡，下面是这个工具的徽章墙；两栏的徽章墙从同一高度开始。 */
export function duoLayout({ weeks, counts }) {
  const h = headLayout(weeks);
  const cw = duoColumn();
  const top = h.rule + 48;
  const grid = top + toolCardHeight(DUO_L.coin, DUO_L.value) + 44;
  const gridH = Math.max(...counts.map((n) => gridHeight(n, DUO_L.cols, cw)));
  const foot = grid + gridH + 70;
  return { ...h, cw, top, grid, gridH, foot, H: foot + 52 + MARGIN };
}
```

- [ ] **Step 4：运行测试**

Run: `npx vitest run tests/poster-layout.test.js tests/contracts.test.js`
Expected: PASS。

- [ ] **Step 5：提交**

```bash
git add src/viewer/poster-layout.js tests/poster-layout.test.js
git commit -m "feat: poster layout math — full enamel plate for one tool, side-by-side columns for both, and which share modes to offer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 海报绘制 `poster-draw.js` 和新的 `renderPoster`

**Files:**
- Create: `src/viewer/poster-draw.js`
- Rewrite: `src/viewer/poster.js`
- Modify: `src/viewer/i18n.js`（zh 段约第 108–114 行、en 段约第 214–220 行，加在 `poster.*` 键后面）

**Interfaces:**
- Consumes:
  - Task 2 的 `PLATE`、`enamelColor`（`./heatmap.js`）；
  - Task 3 的 `W`、`SCALE`、`MARGIN`、`IX`、`IW`、`WD`、`SINGLE`、`DUO_L`、`heatStep`、`singleLayout`、`duoLayout`；
  - Task 1 的 `yearCells` 返回结构（作为 `heat.cal`）。
- Produces:
  - `renderPoster({ mode: 'single' | 'duo', tools, heat, identity }) → HTMLCanvasElement`
    - `tools`：`{ brand, coin: HTMLImageElement | null, items: { state, img: HTMLImageElement | null }[], all: { tokens, activeDays, longestStreak } }[]`
    - `heat`：`{ year: number, cal, series: { id, name, color }[], yearStats: { tokens, activeDays, longestStreak } }`
    - `identity`：`{ login: string, avatar: HTMLImageElement | null } | null`
  - `loadPosterFonts() → Promise`（`poster-draw.js` 导出）。

参考实现：`lab-assets/poster-draw.js` 和 `lab-assets/poster-duo.js`（不提交的实验页，用户已在浏览器里确认过）。下面的代码已经照它们改好：字重改成 500 和 700，颜色取 `PLATE`，文案走 i18n。

- [ ] **Step 1：i18n 加文案**

在 `src/viewer/i18n.js` 的 zh 段 `'poster.footer'` 后面加：

```js
    'poster.year': '年度',
    'poster.allTime': '累计 · {badges}',
    'poster.modes': '分享哪个',
    'poster.both': '两个一起',
    'poster.progress': '正在生成… {n} / {total}',
    'poster.failed': '海报没有生成出来，请关上再试一次。',
    'poster.avatarHint': '运行 npx agent-badges avatar，可以在海报上显示你的 GitHub 头像',
```

在 en 段 `'poster.footer'` 后面加：

```js
    'poster.year': 'Year',
    'poster.allTime': 'All time · {badges}',
    'poster.modes': 'What to share',
    'poster.both': 'Both',
    'poster.progress': 'Rendering… {n} / {total}',
    'poster.failed': "The poster couldn't be made. Close it and try again.",
    'poster.avatarHint': 'Run npx agent-badges avatar to show your GitHub avatar on the poster',
```

- [ ] **Step 2：写 `src/viewer/poster-draw.js`**

```js
// 分享海报的绘制小工具（2D Canvas）。颜色取珐琅板的 PLATE，和主页热力图一致；
// 字体是主页的 Outfit，只加载了 500 和 700 两个字重。版面数字在 poster-layout.js。
import { PLATE, enamelColor } from './heatmap.js';
import { formatCount } from '../data/format.js';
import { lang, t } from './i18n.js';
import { WD, heatStep } from './poster-layout.js';

export const PAGE_BG = '#141312'; // 主页底色（tokens.css 的 --bg）
const FONT = `Outfit, -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif`;
export const F = (weight, size) => `${weight} ${size}px ${FONT}`;

/** 英文的小标签用大写，中文不变。 */
export const caps = (s) => (lang === 'zh' ? s : s.toUpperCase());
/** 小标签的字距：中文 2px，英文随字号。 */
export const trackOf = (size) => (lang === 'zh' ? 2 : size * 0.17);

/** canvas 不会等字体：画之前把两个字重载好，否则会悄悄换成系统字体。 */
export const loadPosterFonts = () => Promise.all([500, 700].map((w) => document.fonts.load(F(w, 40)))).then(() => document.fonts.ready);

// ---------- 基本图形 ----------

export function text(g, str, x, y, { font, color, align = 'left', track = 0, base = 'alphabetic' }) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = base;
  g.letterSpacing = `${track}px`;
  // letterSpacing 会在末尾多留一格：居中、右对齐时补回去
  const fix = align === 'center' ? track / 2 : align === 'right' ? track : 0;
  g.fillText(str, x + fix, y);
  g.letterSpacing = '0px';
}

export function widthOf(g, str, font, track = 0) {
  g.font = font;
  g.letterSpacing = `${track}px`;
  const w = g.measureText(str).width - track;
  g.letterSpacing = '0px';
  return w;
}

/** 放不下就把字号往下减，最小 min。返回用的字号。 */
export function fitSize(g, str, weight, size, maxW, min = 24) {
  let s = size;
  while (s > min && widthOf(g, str, F(weight, s)) > maxW) s -= 2;
  return s;
}

function circle(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
}

function fillCircle(g, x, y, r, color) {
  circle(g, x, y, r);
  g.fillStyle = color;
  g.fill();
}

/** 四角星（页面上的 ✦ 标记）。 */
export function star(g, x, y, R, color) {
  const r = R * 0.22;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 ? r : R;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

/** 板上的分隔细线。 */
export function rule(g, x, y, w) {
  g.fillStyle = PLATE.frameInner;
  g.fillRect(x, y, w, 1);
}

// ---------- 珐琅板 ----------

/** 珐琅板的底：午夜蓝、极淡的同心细纹、锡色双线框。 */
export function plateBackground(g, x, y, w, h, { radius = 34 } = {}) {
  g.beginPath();
  g.roundRect(x, y, w, h, radius);
  g.fillStyle = PLATE.plate;
  g.fill();
  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, radius);
  g.clip();
  g.strokeStyle = 'rgba(255, 255, 255, 0.022)';
  g.lineWidth = 1;
  const ox = x + w / 2;
  const oy = y - h * 0.4;
  const far = Math.hypot(w / 2, h * 1.4);
  for (let rr = 4; rr < far; rr += 4) {
    circle(g, ox, oy, rr);
    g.stroke();
  }
  g.restore();
  g.lineWidth = 1;
  g.strokeStyle = PLATE.frame;
  g.beginPath();
  g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, radius);
  g.stroke();
  g.strokeStyle = PLATE.frameInner;
  g.beginPath();
  g.roundRect(x + 6.5, y + 6.5, w - 13, h - 13, radius - 6);
  g.stroke();
}

/**
 * 一颗圆点（主页 heatmap.css 的画法）。k：相对主页 11px 圆点的倍数，阴影和金边按它缩放。
 * cell：yearCells 的格子；null 是年初年末的占位格。
 */
function dot(g, cx, cy, r, cell, k) {
  if (!cell || cell.future) {
    g.lineWidth = k;
    g.strokeStyle = PLATE.outline;
    circle(g, cx, cy, r - k / 2);
    g.stroke();
    return;
  }
  if (!cell.parts.length) {
    // 凹点：下缘一道很淡的高光，顶部向内的暗影
    fillCircle(g, cx, cy + k, r, 'rgba(255, 255, 255, 0.05)');
    fillCircle(g, cx, cy, r, PLATE.sunk);
    g.save();
    circle(g, cx, cy, r);
    g.clip();
    const sh = g.createLinearGradient(0, cy - r, 0, cy + r);
    sh.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    sh.addColorStop(0.32, 'rgba(0, 0, 0, 0)');
    g.fillStyle = sh;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  } else {
    // 凸起的珐琅：底下一点投影，左右两半各填一个工具的颜色，顶部高光、底部暗边
    fillCircle(g, cx, cy + k, r, 'rgba(0, 0, 0, 0.4)');
    const [a, b] = cell.parts.map((p) => enamelColor(p.color, p.level));
    g.save();
    circle(g, cx, cy, r);
    g.clip();
    g.fillStyle = a;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (b) {
      g.fillStyle = b;
      g.fillRect(cx, cy - r, r, r * 2);
    }
    const hl = g.createLinearGradient(0, cy - r, 0, cy + r);
    hl.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    hl.addColorStop(0.16, 'rgba(255, 255, 255, 0)');
    hl.addColorStop(0.78, 'rgba(0, 0, 0, 0)');
    hl.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    g.fillStyle = hl;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  }
  if (cell.unlocked) {
    g.lineWidth = k;
    g.strokeStyle = PLATE.ring;
    circle(g, cx, cy, r + k * 1.5);
    g.stroke();
  }
}

/** 月份 + 星期 + 点阵。cal 是 yearCells 的结果。 */
export function heatGrid(g, cal, { x, y, w }) {
  const step = heatStep(cal.weeks.length, w);
  const gx = x + WD;
  const r = (step * 0.74) / 2;
  const k = (r * 2) / 11;
  const months = t('months');
  for (const { month, col } of cal.monthStarts) {
    text(g, caps(months[month]), gx + col * step + step * 0.13, y + 13, { font: F(500, 13), color: PLATE.month, track: lang === 'zh' ? 1 : 2.2 });
  }
  const top = y + 28;
  const wd = t('weekdays');
  for (let i = 0; i < 7; i++) {
    const day = (cal.weekStart + i) % 7;
    if ([1, 3, 5].includes(day)) text(g, caps(wd[day]), x, top + i * step + step / 2, { font: F(500, 12), color: PLATE.dim, track: 1.2, base: 'middle' });
  }
  cal.weeks.forEach((col, c) => col.forEach((cell, i) => dot(g, gx + c * step + step / 2, top + i * step + step / 2, r, cell, k)));
}

/** 图例：每个工具的名字和四级色阶；两个工具时加「同一天都用」；右边「解锁徽章」金边。 */
export function legend(g, series, { x, y, w }) {
  const r = 6.5;
  const k = (r * 2) / 11;
  const cy = y + 9;
  let cx = x;
  for (const s of series) {
    text(g, s.name, cx, cy, { font: F(500, 15), color: PLATE.name, base: 'middle' });
    cx += widthOf(g, s.name, F(500, 15)) + 12;
    for (let l = 1; l <= 4; l++) {
      dot(g, cx + r, cy, r, { future: false, unlocked: false, parts: [{ color: s.color, level: l }] }, k);
      cx += r * 2 + 5;
    }
    cx += 22;
  }
  if (series.length > 1) {
    dot(g, cx + r, cy, r, { future: false, unlocked: false, parts: series.slice(0, 2).map((s) => ({ color: s.color, level: 4 })) }, k);
    text(g, t('heat.both'), cx + r * 2 + 10, cy, { font: F(500, 15), color: PLATE.dim, base: 'middle' });
  }
  const label = t('heat.unlock');
  const lw = widthOf(g, label, F(500, 15));
  text(g, label, x + w, cy, { font: F(500, 15), color: PLATE.dim, align: 'right', base: 'middle' });
  g.lineWidth = 1.4;
  g.strokeStyle = PLATE.ring;
  circle(g, x + w - lw - 18, cy, r + 1);
  g.stroke();
}

/** 这一年的统计行（和主页热力图同一句话），数字加粗提亮。 */
export function summary(g, st, { x, y }) {
  const wrap = (v) => `\u0001${v}\u0002`;
  const s = caps(t('heat.summary', { tokens: wrap(formatCount(st.tokens)), days: wrap(st.activeDays), streak: wrap(st.longestStreak) }));
  const track = lang === 'zh' ? 1.5 : 2.2;
  let cx = x;
  for (const part of s.split(/(\u0001[^\u0002]*\u0002)/).filter(Boolean)) {
    const bold = part[0] === '\u0001';
    const str = bold ? part.slice(1, -1) : part;
    const font = F(bold ? 700 : 500, 15);
    text(g, str, cx, y, { font, color: bold ? PLATE.ink : PLATE.sub, track });
    cx += widthOf(g, str, font, track) + track;
  }
}

// ---------- 头像、铸币、数字、徽章墙、页脚 ----------

/**
 * 头像：就是一张圆形头像，不做成金属徽章。
 * 有图（用户同意后取的 GitHub 头像）就裁成圆；没有就画通用的人像轮廓（头和肩）。外面一圈细边。
 */
export function avatar(g, cx, cy, r, img) {
  g.save();
  circle(g, cx, cy, r);
  g.clip();
  if (img) {
    g.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    g.fillStyle = '#1d2a5c';
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.fillStyle = 'rgba(154, 163, 196, 0.55)';
    circle(g, cx, cy - r * 0.2, r * 0.34);
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy + r * 0.86, r * 0.66, r * 0.56, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.lineWidth = 1.5;
  g.strokeStyle = PLATE.frame;
  circle(g, cx, cy, r + 0.75);
  g.stroke();
}

/** 全解锁铸币（3D 截图），下面一团很软的影子（整张海报只有两三处，shadowBlur 可以用）。 */
export function coin(g, img, cx, cy, size) {
  if (!img) return;
  g.save();
  g.shadowColor = 'rgba(0, 0, 0, 0.55)';
  g.shadowBlur = size * 0.08;
  g.shadowOffsetY = size * 0.04;
  g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  g.restore();
}

/** 累计的三个数字：小标签在上，数字在下。align: left 每列左对齐；center 每列居中，列间一道竖线。 */
export function stats(g, all, { x, y, w, align = 'left', size = 42, labelSize = 15 }) {
  const cols = [
    [t('profile.tokens'), formatCount(all.tokens)],
    [t('profile.activeDays'), String(all.activeDays)],
    [t('profile.streak'), t('profile.days', { n: all.longestStreak })],
  ];
  const cw = w / 3;
  cols.forEach(([label, value], i) => {
    const cx = align === 'center' ? x + cw * i + cw / 2 : x + cw * i;
    text(g, caps(label), cx, y + 16, { font: F(500, labelSize), color: PLATE.sub, track: trackOf(labelSize), align });
    text(g, value, cx, y + 34 + size * 0.86, { font: F(700, size), color: PLATE.ink, align });
    if (align === 'center' && i) {
      g.fillStyle = PLATE.frameInner;
      g.fillRect(x + cw * i, y + 4, 1, size + 30);
    }
  });
}

/** 徽章墙：未解锁的压暗；最后一行不满时居中。items: { state, img }。 */
export function badgeGrid(g, items, { x, y, w, cols, fill = 0.9, lockedAlpha = 0.42 }) {
  const cell = w / cols;
  const rows = Math.ceil(items.length / cols);
  items.forEach((it, i) => {
    if (!it.img) return;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = row === rows - 1 ? items.length - row * cols : cols;
    const off = ((cols - inRow) * cell) / 2;
    const s = cell * fill;
    g.globalAlpha = it.state?.unlocked ? 1 : lockedAlpha;
    g.drawImage(it.img, x + off + col * cell + (cell - s) / 2, y + row * cell + (cell - s) / 2, s, s);
  });
  g.globalAlpha = 1;
}

/** 页脚：左边金色四角星和 agent-badges，右边一句「用 npx agent-badges 生成你的徽章墙」。 */
export function footer(g, y, { x, w }) {
  star(g, x + 9, y - 7, 9, PLATE.ring);
  text(g, 'agent-badges', x + 28, y, { font: F(700, 21), color: PLATE.ink });
  text(g, t('poster.footer'), x + w, y, { font: F(500, 18), color: PLATE.dim, align: 'right' });
}
```

- [ ] **Step 3：重写 `src/viewer/poster.js`**（整个文件替换）

```js
// 分享海报：一张竖版 PNG，整张是一块午夜蓝珐琅板，和主页热力图同一套颜色和画法。
// 单个工具：板头（头像、名字、年份）、点阵、铸币和累计数字、徽章墙。
// 两个工具：板头和点阵之后左右分栏，每栏一个工具（铸币、数字、它自己的徽章墙）。
// 全部用 2D Canvas：徽章和铸币用已经截好的图，不再走 3D。版面数字在 poster-layout.js，绘制在 poster-draw.js。
import { t } from './i18n.js';
import { PLATE } from './heatmap.js';
import { DUO_L, IW, IX, MARGIN, SCALE, SINGLE, W, duoLayout, singleLayout } from './poster-layout.js';
import { F, PAGE_BG, avatar, badgeGrid, caps, coin, fitSize, footer, heatGrid, legend, plateBackground, rule, stats, summary, text, trackOf } from './poster-draw.js';

const unlockedOf = (tool) => tool.items.filter((it) => it.state?.unlocked).length;
const badgeCount = (n, total) => t('poster.badges', { n, total });

/** 名字一行：有身份（用户同意后的 GitHub 登录名）就写 @登录名，否则写工具名。副标题是工具名和徽章数。 */
function names(tools, identity) {
  const n = tools.reduce((s, x) => s + unlockedOf(x), 0);
  const total = tools.reduce((s, x) => s + x.items.length, 0);
  const tool = tools.map((x) => x.brand.name).join(' + ');
  const count = badgeCount(n, total);
  return identity ? { title: `@${identity.login}`, sub: `${tool} · ${count}` } : { title: tool, sub: count };
}

function drawHead(g, L, tools, heat, identity) {
  const ar = 52;
  avatar(g, IX + ar, L.head + ar, ar, identity?.avatar ?? null);
  const { title, sub } = names(tools, identity);
  const nx = IX + ar * 2 + 30;
  // 右边留给大号年份；名字太长就缩小字号
  const size = fitSize(g, title, 700, 40, W - IX - 280 - nx);
  text(g, title, nx, L.head + 48, { font: F(700, size), color: PLATE.ink });
  text(g, sub, nx, L.head + 84, { font: F(500, 19), color: PLATE.sub });
  text(g, caps(t('poster.year')), W - IX, L.head + 14, { font: F(500, 14), color: PLATE.month, align: 'right', track: 3 });
  text(g, String(heat.year), W - IX, L.head + 86, { font: F(700, 72), color: PLATE.ink, align: 'right', track: 1 });
  summary(g, heat.yearStats, { x: IX, y: L.summary });
  heatGrid(g, heat.cal, { x: IX, y: L.heat, w: IW });
  legend(g, heat.series, { x: IX, y: L.legend, w: IW });
  rule(g, IX, L.rule, IW);
}

function drawSingle(g, L, tool) {
  const s = SINGLE.coin;
  coin(g, tool.coin, IX + s / 2, L.mid + s / 2, s);
  const sx = IX + s + 56;
  text(g, caps(t('poster.allTime', { badges: badgeCount(unlockedOf(tool), tool.items.length) })), sx, L.mid + 74, { font: F(500, 15), color: PLATE.month, track: trackOf(15) });
  stats(g, tool.all, { x: sx, y: L.mid + 112, w: W - IX - sx, size: 42 });
  rule(g, IX, L.rule2, IW);
  badgeGrid(g, tool.items, { x: IX, y: L.grid, w: IW, cols: SINGLE.cols });
}

/** 一栏的小卡：铸币、工具名、徽章数、三个数字，全部居中。 */
function toolCard(g, x, y, w, tool) {
  const s = DUO_L.coin;
  coin(g, tool.coin, x + w / 2, y + s / 2, s);
  let cy = y + s + 44;
  text(g, tool.brand.name, x + w / 2, cy, { font: F(700, 28), color: PLATE.ink, align: 'center' });
  cy += 32;
  text(g, badgeCount(unlockedOf(tool), tool.items.length), x + w / 2, cy, { font: F(500, 18), color: PLATE.sub, align: 'center' });
  cy += 30;
  stats(g, tool.all, { x, y: cy, w, align: 'center', size: DUO_L.value, labelSize: 13 });
}

function drawDuo(g, L, tools) {
  tools.forEach((tool, i) => {
    const x = IX + i * (L.cw + DUO_L.gap);
    toolCard(g, x, L.top, L.cw, tool);
    badgeGrid(g, tool.items, { x, y: L.grid, w: L.cw, cols: DUO_L.cols });
  });
  // 两栏中间一道竖细线
  g.fillStyle = PLATE.frameInner;
  g.fillRect(IX + L.cw + DUO_L.gap / 2, L.top + 10, 1, L.grid + L.gridH - L.top - 10);
}

/**
 * @param {object} o
 * @param {'single' | 'duo'} o.mode
 * @param {{ brand, coin: HTMLImageElement | null, items: { state, img: HTMLImageElement | null }[], all: { tokens, activeDays, longestStreak } }[]} o.tools
 *   单个工具时只有一个；两个工具时顺序同热力图（第一个在左）
 * @param {{ year: number, cal: object, series: { id, name, color }[], yearStats: { tokens, activeDays, longestStreak } }} o.heat
 *   cal 是 data/calendar.js 的 yearCells 结果
 * @param {{ login: string, avatar: HTMLImageElement | null } | null} o.identity
 * @returns {HTMLCanvasElement}
 */
export function renderPoster({ mode, tools, heat, identity }) {
  const weeks = heat.cal.weeks.length;
  const L = mode === 'duo' ? duoLayout({ weeks, counts: tools.map((x) => x.items.length) }) : singleLayout({ weeks, count: tools[0].items.length });
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = Math.round(L.H * SCALE);
  const g = canvas.getContext('2d');
  g.scale(SCALE, SCALE);
  g.fillStyle = PAGE_BG;
  g.fillRect(0, 0, W, L.H);
  plateBackground(g, MARGIN, MARGIN, W - MARGIN * 2, L.H - MARGIN * 2, { radius: 34 });
  drawHead(g, L, tools, heat, identity);
  if (mode === 'duo') drawDuo(g, L, tools);
  else drawSingle(g, L, tools[0]);
  footer(g, L.foot, { x: IX, w: IW });
  return canvas;
}
```

- [ ] **Step 4：检查旧文案是否还有人用**

Run: `grep -rn "poster.unlocked" src`
Expected: 如果只剩 i18n.js 里的定义，就从 zh 和 en 两段都删掉这一键；如果别处还在用，就保留。

- [ ] **Step 5：运行测试和构建**

Run: `npm test`
Expected: 全部 PASS（分层契约：`poster-draw.js` 只引用 viewer 和 data）。

此时 `src/app/poster.js` 还按旧接口调用 `renderPoster`，下一个任务才改。所以这一步只跑单元测试，不跑浏览器检查。用 `npm run build` 确认能打包：
Expected: 构建成功。

- [ ] **Step 6：提交**

```bash
git add src/viewer/poster-draw.js src/viewer/poster.js src/viewer/i18n.js
git commit -m "feat: poster drawing on the enamel plate — heatmap dots like the page, coin snapshot, avatar or person placeholder, single and side-by-side layouts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 海报弹窗：切换、缓存、导出

**Files:**
- Modify: `src/app/load.js:41`（return 多一个 `tools`）
- Modify: `src/app/context.js`（`createContext` 返回对象里加 `identity`、`localData`）
- Create: `src/app/poster-art.js`
- Rewrite: `src/app/poster.js`
- Modify: `src/app/automation.js:34-36`
- Modify: `index.html:41-54`（海报弹窗）
- Modify: `src/styles/modal.css`（末尾加样式）
- Modify: `scripts/shoot.mjs:747-756`

**Interfaces:**
- Consumes:
  - Task 4 的 `renderPoster`、`loadPosterFonts`；
  - Task 3 的 `shareModes`、`DUO`；
  - Task 1 的 `yearCells`。
- Produces（`window.__badgeApp`，给 `scripts/shoot.mjs` 用）：
  - `posterURL`（getter，PNG data URL，第一次读时异步生成，生成前返回 null）
  - `posterMode`、`posterModes`、`posterReady`、`posterRenders`
  - `setPosterMode(mode) → Promise`
- `ctx.identity`：`{ login, avatar: dataURL } | null`
- `ctx.localData`：boolean

- [ ] **Step 1：`src/app/load.js` 返回所有工具**

第 41 行改成：

```js
  // 分享海报的「两个一起」要用另一个工具的徽章和进度
  const tools = all.map(({ brand: b, badges, progress: p, daily }) => ({ brand: b, badges, progress: p, daily }));
  return { valid, progress, heatSeries, markers, currentDaily: mine.daily, notices, tools };
```

- [ ] **Step 2：`src/app/context.js` 读身份**

在 `createContext()` 返回对象里，`PUBLIC:` 那一行后面加：

```js
    // 用户同意后命令行注入的 GitHub 登录名和头像（data URL）；没同意、开发服务器、演示站都是 null
    identity: window.__AGENT_BADGES_IDENTITY__ ?? null,
    // 页面带着本机数据（命令行打开的或开发服务器）：海报弹窗才提示可以加头像
    localData: Boolean(window.__AGENT_BADGES_DATA__) && params.get('source') !== 'mock',
```

- [ ] **Step 3：写 `src/app/poster-art.js`**

```js
import { createBadgeRenderer } from '../viewer/badge-renderer.js';
import { completionistItem } from '../viewer/completionist.js';
import { forEachFrame } from '../viewer/frame.js';

const THUMB = 360; // 另一个工具的缩略图：海报上一格最大约 230 像素
const COIN = 900;

export const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * 海报要的图：每个工具的全解锁铸币截图和徽章缩略图，按工具缓存。
 * 当前工具的缩略图直接用陈列墙画好的（等 thumbsDone，等的时候报进度）；另一个工具的在这里现画，一帧一枚。
 * 都用页面共用的舞台（ctx.stage），整页仍只有一个 WebGL 上下文给缩略图。
 * @param {object} ctx
 * @param {{ thumbsDone: Promise<void> }} deps
 */
export function createPosterArt(ctx, { thumbsDone }) {
  const cache = new Map();
  let renderer = null;
  const shoot = (config, brand, state, size, fill) => (renderer ??= createBadgeRenderer(ctx.stage)).image(config, brand, state, { size, fill, engraving: 0 });

  async function build(tool, onProgress) {
    let urls;
    if (tool.brand.id === ctx.brand.id) {
      const total = ctx.items.length;
      const tick = () => onProgress(ctx.items.filter((it) => it.thumb).length, total);
      tick();
      const timer = setInterval(tick, 200);
      try {
        await thumbsDone;
      } finally {
        clearInterval(timer);
      }
      urls = ctx.items.map((it) => it.thumb);
    } else {
      urls = [];
      await forEachFrame(tool.items, (it) => {
        urls.push(shoot(it.config, tool.brand, it.state, THUMB, 0.92));
        onProgress(urls.length, tool.items.length);
      });
    }
    const c = completionistItem(tool.kit, tool.items);
    const coinURL = shoot(c.config, tool.brand, c.state, COIN, 0.94);
    const [coin, ...imgs] = await Promise.all([coinURL, ...urls].map((u) => (u ? loadImage(u) : null)));
    return { coin, items: tool.items.map((it, i) => ({ state: it.state, img: imgs[i] })) };
  }

  return {
    /**
     * @param {{ brand, kit, items: { config, state }[] }} tool
     * @param {(n: number, total: number) => void} [onProgress]
     * @returns {Promise<{ coin: HTMLImageElement | null, items: { state, img }[] }>}
     */
    get(tool, onProgress = () => {}) {
      if (!cache.has(tool.brand.id)) {
        cache.set(
          tool.brand.id,
          build(tool, onProgress).catch((e) => {
            cache.delete(tool.brand.id); // 下次再试
            throw e;
          }),
        );
      }
      return cache.get(tool.brand.id);
    },
  };
}
```

- [ ] **Step 4：重写 `src/app/poster.js`**（整个文件替换）

```js
import { renderPoster } from '../viewer/poster.js';
import { loadPosterFonts } from '../viewer/poster-draw.js';
import { DUO, shareModes } from '../viewer/poster-layout.js';
import { combineDaily } from '../viewer/heatmap.js';
import { trackSegThumb } from '../viewer/seg.js';
import { downloadDataURL } from '../viewer/export.js';
import { t } from '../viewer/i18n.js';
import { today, yearCells } from '../data/calendar.js';
import { dailyStats } from '../data/daily.js';
import { brandById } from '../brands/index.js';
import { createModal } from './modal.js';
import { createPosterArt, loadImage } from './poster-art.js';

const PREVIEW_W = 720; // 弹窗里的预览图宽度；下载用原尺寸

const toBlob = (canvas) => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/**
 * 分享海报：可以选只分享某一个工具，或两个一起（有两个工具的数据时）。默认是当前所在的工具。
 * 每种画过就缓存（形式 | 年份 | 语言），切回来不重画。预览是缩小的图，下载用原尺寸的 PNG。
 * 响应 ctx 的 'poster' 事件。
 */
export function mount(ctx, { thumbsDone, heatmap, heatSeries, markers, tools }) {
  const { $, brand, lang, PUBLIC, identity, localData } = ctx;
  const posterEl = $('#poster');
  const closeBtn = $('[data-poster-close]');
  const download = $('[data-poster-download]');
  const modesEl = $('[data-poster-modes]');
  const hint = $('[data-poster-hint]');
  const preview = $('[data-poster-preview]');
  $('[data-poster-title]').textContent = t('poster.title');
  closeBtn.setAttribute('aria-label', t('poster.close'));
  download.textContent = t('poster.download');
  const modal = createModal(posterEl, closeBtn);

  // 能分享的工具：热力图上有的（有数据的，加上当前工具），顺序同热力图
  const shown = heatSeries.map((s) => s.id);
  const list = tools
    .filter((x) => shown.includes(x.brand.id))
    .map((x) => ({
      brand: x.brand,
      kit: brandById(x.brand.id).completionist,
      items: x.brand.id === brand.id ? ctx.items : x.badges.map((config) => ({ config, state: x.progress[config.id] })),
      daily: x.daily,
    }));
  const modes = shareModes(list.map((x) => x.brand.id));
  let mode = brand.id;

  // 三段切换（只有一个工具时不显示）
  modesEl.hidden = modes.length < 2;
  modesEl.setAttribute('aria-label', t('poster.modes'));
  for (const m of modes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.mode = m;
    b.textContent = m === DUO ? t('poster.both') : list.find((x) => x.brand.id === m).brand.name;
    b.addEventListener('click', () => show(m));
    modesEl.appendChild(b);
  }
  const paintModes = () => modesEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  paintModes();
  if (!modesEl.hidden) trackSegThumb(modesEl);

  // 本机页面上还没有头像：提示可以加（公开页、演示站不提示）
  if (localData && !PUBLIC && !identity) {
    hint.textContent = t('poster.avatarHint');
    hint.hidden = false;
  }

  const art = createPosterArt(ctx, { thumbsDone });
  const cache = new Map();
  let current = null;
  let renders = 0;
  let seq = 0;
  let avatar;

  async function build(m) {
    const picked = m === DUO ? list : list.filter((x) => x.brand.id === m);
    const year = heatmap.year;
    const series = heatSeries.filter((s) => picked.some((x) => x.brand.id === s.id));
    const making = preview.querySelector('.poster-making');
    const arts = [];
    for (const x of picked) {
      arts.push(await art.get(x, (n, total) => making?.isConnected && (making.textContent = t('poster.progress', { n, total }))));
    }
    await loadPosterFonts();
    if (identity && avatar === undefined) avatar = await loadImage(identity.avatar);
    const canvas = renderPoster({
      mode: m === DUO ? 'duo' : 'single',
      tools: picked.map((x, i) => ({ brand: x.brand, coin: arts[i].coin, items: arts[i].items, all: dailyStats(x.daily) })),
      heat: {
        year,
        series,
        cal: yearCells({ year, weekStart: lang === 'zh' ? 1 : 0, series, markers, enabled: new Set(series.map((s) => s.id)), now: today() }),
        yearStats: dailyStats(combineDaily(series.map((s) => s.daily)), { from: `${year}-01-01`, to: `${year}-12-31` }),
      },
      identity: identity ? { login: identity.login, avatar: avatar ?? null } : null,
    });
    renders++;
    const blob = await toBlob(canvas);
    const small = document.createElement('canvas');
    small.width = PREVIEW_W;
    small.height = Math.round((canvas.height * PREVIEW_W) / canvas.width);
    small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
    const previewBlob = await toBlob(small);
    // 两张 canvas 用完就清空，释放内存（缓存里只留 PNG）
    canvas.width = canvas.height = small.width = small.height = 0;
    return {
      mode: m,
      blob,
      url: URL.createObjectURL(blob),
      preview: URL.createObjectURL(previewBlob),
      file: `${m === DUO ? 'agent' : m}-badges-${year}.png`,
      dataURL: null,
      pending: null,
    };
  }

  async function show(m) {
    if (!modes.includes(m)) return;
    mode = m;
    paintModes();
    const job = ++seq;
    const key = `${m}|${heatmap.year}|${lang}`;
    download.disabled = true;
    if (!cache.has(key)) {
      const making = document.createElement('p');
      making.className = 'poster-making';
      making.textContent = t('poster.making');
      preview.replaceChildren(making);
      cache.set(
        key,
        build(m).catch((e) => {
          cache.delete(key);
          throw e;
        }),
      );
    }
    let entry;
    try {
      entry = await cache.get(key);
    } catch (e) {
      console.error(e);
      if (job === seq) {
        const p = document.createElement('p');
        p.className = 'poster-making';
        p.textContent = t('poster.failed');
        preview.replaceChildren(p);
      }
      return;
    }
    if (job !== seq) return;
    current = entry;
    const img = new Image();
    img.alt = t('poster.title');
    img.src = entry.preview;
    preview.replaceChildren(img);
    download.disabled = false;
  }

  function open({ viaKeyboard = false } = {}) {
    modal.open({ viaKeyboard });
    return show(mode);
  }

  download.addEventListener('click', () => {
    if (current) downloadDataURL(current.url, current.file);
  });
  ctx.on('poster', open);
  return {
    open,
    setMode: show,
    modes,
    get mode() {
      return mode;
    },
    /** 当前显示的就是选中的形式（切换后新海报画好之前是 false）。 */
    get ready() {
      return current?.mode === mode && !download.disabled;
    },
    get renders() {
      return renders;
    },
    /** PNG 的 data URL，只给自动化检查用：第一次读时才从 blob 转（异步），转好之前返回 null。 */
    get url() {
      const e = current;
      if (!e) return null;
      e.pending ??= blobToDataURL(e.blob).then((u) => (e.dataURL = u));
      return e.dataURL;
    },
  };
}
```

说明：`downloadDataURL` 只是设置 `<a href>` 并点击，blob URL 同样可用，不用改 `src/viewer/export.js`。

- [ ] **Step 5：`src/app/automation.js` 加接口**

把第 34–36 行：

```js
    openPoster: poster.open,
    get posterURL() {
      return poster.url;
    },
```

换成：

```js
    openPoster: poster.open,
    get posterURL() {
      return poster.url;
    },
    posterModes: poster.modes,
    get posterMode() {
      return poster.mode;
    },
    get posterReady() {
      return poster.ready;
    },
    get posterRenders() {
      return poster.renders;
    },
    setPosterMode: (m) => poster.setMode(m),
```

并在文件顶部的说明注释里，把 getter 列表补上 `posterMode`、`posterReady`、`posterRenders`。

- [ ] **Step 6：`index.html` 海报弹窗**

第 49–52 行（`poster-preview` 到 `modal-foot` 结束）换成：

```html
        <div class="seg poster-modes" role="radiogroup" data-poster-modes hidden></div>
        <div class="poster-preview" data-poster-preview></div>
        <footer class="modal-foot poster-foot">
          <p class="poster-hint" data-poster-hint hidden></p>
          <button class="btn btn-primary" type="button" data-poster-download disabled></button>
        </footer>
```

- [ ] **Step 7：`src/styles/modal.css` 末尾加样式**

```css
/* 分享海报：选分享哪个（胶囊切换，和陈列墙的筛选同一个控件），底部一行加头像的提示 */
.poster-modes {
  align-self: flex-start;
  margin: 0 20px 14px;
}

.poster-foot {
  gap: 16px;
}

.poster-hint {
  flex: 1;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
  overflow-wrap: anywhere;
}
```

先看一下 `.modal-card` 的排版方向（`grep -n "modal-card" -A8 src/styles/modal.css`）。如果不是纵向 flex，`align-self` 不起作用，就改用 `width: max-content; max-width: calc(100% - 40px);`，让胶囊不被拉满一整行。

- [ ] **Step 8：`scripts/shoot.mjs` 海报检查**

把第 747–756 行（从 `await page.locator('[data-share]').click();` 到 `check('Esc 关闭海报', …)`）换成：

```js
  await page.locator('[data-share]').click();
  await page.waitForFunction(() => window.__badgeApp.posterReady && window.__badgeApp.posterURL, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/desktop-poster.png` });
  const posterPNG = async () => Buffer.from((await page.evaluate(() => window.__badgeApp.posterURL)).split(',')[1], 'base64');
  const buf = await posterPNG();
  writeFileSync(`${out}/poster.png`, buf);
  check('分享海报是 2160 像素宽的 PNG', buf.readUInt32BE(16) === 2160, `${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`);
  const pm = await page.evaluate(() => ({ modes: window.__badgeApp.posterModes, mode: window.__badgeApp.posterMode, buttons: document.querySelectorAll('[data-poster-modes] button').length }));
  check('两个工具都有数据：弹窗里有三段切换，默认是当前工具', pm.modes.length === 3 && pm.buttons === 3 && pm.mode === pm.modes[0], JSON.stringify(pm));
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
```

如果 `shoot.mjs` 里有总检查数的说明或断言，同步改掉。用 `grep -n "检查\|checks" scripts/shoot.mjs | head` 找；如果检查数只是运行时统计出来的，就不用改。

- [ ] **Step 9：运行测试、构建、浏览器检查**

```bash
npm test
npm run build
npm run check:browser
CHROME_GL=software npm run check:browser
```

Expected:
- `npm test` 全部 PASS（分层契约：`src/app/` 没有引用 `src/share/`）；
- 两次 `check:browser` 全部通过，控制台没有报错；
- 截图保存在脚本打印的目录里。

- [ ] **Step 10：用眼睛看结果**

打开 Step 9 生成的 `poster.png` 和 `poster-duo.png`（用 Read 工具看图），对照实验页的 C 和 D2，确认：
- 点阵是圆点；左右分色；解锁日金边；未来日只有淡轮廓；
- 铸币清晰；人像轮廓头像；字体是 Outfit；
- 没有文字重叠或出界。

再用 `?lang=en` 打开一次（`node` 脚本或在 `check:browser` 的英文截图里看），确认英文一周从周日开始，星期标签是 MON / WED / FRI。

有问题就修，修完重跑 Step 9。

- [ ] **Step 11：提交**

```bash
git add src/app/load.js src/app/context.js src/app/poster-art.js src/app/poster.js src/app/automation.js index.html src/styles/modal.css scripts/shoot.mjs
git commit -m "feat: share poster modal — pick one tool or both, cached per mode, toBlob export with a small preview, posterURL kept for automation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 身份（头像）的存取和注入

**Files:**
- Create: `src/share/identity.js`
- Modify: `src/share/publish.js`（`createGitHub().user()`）
- Modify: `src/share/inject.js`
- Test: `tests/avatar.test.js`（新）

**Interfaces:**
- Produces:
  - `IDENTITY_FILE = 'identity.json'`
  - `readIdentity(home) → object | null`
  - `consentOf(home) → true | false | null`（null = 没问过）
  - `declineAvatar(home)`：删除头像文件，记住“不要”
  - `fetchAvatar(home, { gh, fetch, now }) → Promise<{ status: 'ok', login } | { status: 'no-gh' | 'not-logged-in' | 'bad-image' | 'fetch-failed', detail? }>`
  - `pageIdentity(home) → { login, avatar: dataURL } | null`
  - `identityScript(identity) → string`
  - `injectData(html, dataByBrand, publicMeta = null, identity = null)`
  - `gh.user() → { login, id, avatarUrl } | null`

- [ ] **Step 1：写失败的测试** `tests/avatar.test.js`

```js
// 头像：只有用户同意后才通过 gh 取，存在数据目录；页面拿到的是内嵌的 data URL，页面本身不联网。
// gh 和 fetch 都用替身，不联网；数据目录用临时目录。
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consentOf, declineAvatar, fetchAvatar, pageIdentity, readIdentity } from '../src/share/identity.js';
import { identityScript, injectData } from '../src/share/inject.js';

// 1×1 的透明 PNG
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c63f8ffff3f0005fe02fea7d5a3c20000000049454e44ae426082', 'hex');
const USER = { login: 'octo', id: 1, avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' };
const fakeGh = ({ available = true, user = USER } = {}) => ({ available: async () => available, user: async () => user });
function fakeFetch({ body = PNG, type = 'image/png', status = 200 } = {}) {
  const f = async (url) => {
    f.calls.push(url);
    return new Response(body, { status, headers: { 'content-type': type } });
  };
  f.calls = [];
  return f;
}

let home;
beforeEach(() => (home = mkdtempSync(join(tmpdir(), 'agent-badges-avatar-'))));
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe('取头像', () => {
  it('同意后：通过 gh 拿到头像地址，取 256 像素的图，存进数据目录，记住登录名和日期', async () => {
    const fetch = fakeFetch();
    const r = await fetchAvatar(home, { gh: fakeGh(), fetch, now: () => new Date('2026-10-27T10:00:00Z') });
    expect(r).toEqual({ status: 'ok', login: 'octo' });
    expect(new URL(fetch.calls[0]).searchParams.get('s')).toBe('256');
    expect(readFileSync(join(home, 'avatar.png'))).toEqual(PNG);
    expect(readIdentity(home)).toEqual({ consent: true, login: 'octo', file: 'avatar.png', fetchedAt: '2026-10-27' });
    expect(consentOf(home)).toBe(true);
  });

  it('没装 gh、gh 没登录：不联网，什么都不写', async () => {
    const fetch = fakeFetch();
    expect(await fetchAvatar(home, { gh: fakeGh({ available: false }), fetch })).toEqual({ status: 'no-gh' });
    expect(await fetchAvatar(home, { gh: fakeGh({ user: null }), fetch })).toEqual({ status: 'not-logged-in' });
    expect(fetch.calls).toEqual([]);
    expect(consentOf(home)).toBe(null);
  });

  it('不是 PNG / JPEG、超过 1 MB、HTTP 出错：不保存', async () => {
    expect((await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch({ type: 'text/html' }) })).status).toBe('bad-image');
    expect((await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch({ body: Buffer.alloc(1024 * 1024 + 1) }) })).status).toBe('bad-image');
    expect((await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch({ status: 404 }) })).status).toBe('fetch-failed');
    expect(existsSync(join(home, 'avatar.png'))).toBe(false);
    expect(consentOf(home)).toBe(null);
  });

  it('不要了：删掉头像文件，记住「不要」', async () => {
    await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch() });
    declineAvatar(home);
    expect(existsSync(join(home, 'avatar.png'))).toBe(false);
    expect(readIdentity(home)).toEqual({ consent: false });
    expect(consentOf(home)).toBe(false);
  });
});

describe('页面拿到的身份', () => {
  it('没问过、不同意、文件没了：都是 null', async () => {
    expect(pageIdentity(home)).toBe(null);
    declineAvatar(home);
    expect(pageIdentity(home)).toBe(null);
    await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch() });
    rmSync(join(home, 'avatar.png'));
    expect(pageIdentity(home)).toBe(null);
  });

  it('同意了：登录名和内嵌的 data URL', async () => {
    await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch() });
    expect(pageIdentity(home)).toEqual({ login: 'octo', avatar: `data:image/png;base64,${PNG.toString('base64')}` });
  });

  it('identity.json 被改成别的文件名：不读', () => {
    writeFileSync(join(home, 'identity.json'), JSON.stringify({ consent: true, login: 'octo', file: '../secret.png' }));
    expect(pageIdentity(home)).toBe(null);
  });

  it('注入页面：单独一个变量，转义 <，不和公开版标记混用', () => {
    const id = { login: 'a</script><b>', avatar: 'data:image/png;base64,AAAA' };
    expect(identityScript(null)).toBe('');
    const html = injectData('<html><head></head><body></body></html>', {}, null, id);
    expect(html).toContain('window.__AGENT_BADGES_IDENTITY__ = ');
    expect(html).not.toContain('</script><b>');
    expect(html).not.toContain('__AGENT_BADGES_PUBLIC__');
    expect(html.match(/<\/head>/g)).toHaveLength(1);
    expect(injectData('<html><head></head></html>', {})).not.toContain('__AGENT_BADGES_IDENTITY__');
  });
});
```

- [ ] **Step 2：运行，确认失败**

Run: `npx vitest run tests/avatar.test.js`
Expected: FAIL，找不到 `src/share/identity.js`。

- [ ] **Step 3：写 `src/share/identity.js`**

```js
// 分享海报上的 GitHub 头像：只有用户明确同意后才取。
// 同意记录、登录名和头像图片存在数据目录（~/.agent-badges）。页面拿到的是内嵌的 data URL，页面本身不发网络请求。
// 纯逻辑：gh 和 fetch 由调用方传进来，测试里换成替身；不输出到控制台。
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const IDENTITY_FILE = 'identity.json';
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg' };
const FILES = new Set(['avatar.png', 'avatar.jpg']);
export const AVATAR_MAX = 1024 * 1024;

export function readIdentity(home) {
  try {
    return JSON.parse(readFileSync(join(home, IDENTITY_FILE), 'utf8'));
  } catch {
    return null;
  }
}

function save(home, data) {
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, IDENTITY_FILE), `${JSON.stringify(data, null, 2)}\n`);
}

function removeAvatarFiles(home, keep = null) {
  for (const f of FILES) if (f !== keep) rmSync(join(home, f), { force: true });
}

/** 用户的回答：没问过 null，同意 true，不要 false。 */
export const consentOf = (home) => readIdentity(home)?.consent ?? null;

/** 不要头像：删掉已存的图片，记住「不要」，以后不再问。 */
export function declineAvatar(home) {
  removeAvatarFiles(home);
  save(home, { consent: false });
}

/**
 * 取 GitHub 头像（调用前必须已经得到用户同意）：gh 拿登录名和头像地址，fetch 下载 256 像素的图，存进数据目录。
 * 只接受 PNG 和 JPEG，不超过 1 MB。失败时什么都不写。
 * @param {string} home
 * @param {{ gh: { available(): Promise<boolean>, user(): Promise<{ login, avatarUrl } | null> }, fetch?: typeof fetch, now?: () => Date }} deps
 */
export async function fetchAvatar(home, { gh, fetch: get = globalThis.fetch, now = () => new Date() }) {
  if (!(await gh.available())) return { status: 'no-gh' };
  const user = await gh.user();
  if (!user) return { status: 'not-logged-in' };
  if (!user.avatarUrl) return { status: 'fetch-failed', detail: 'no avatar_url' };
  const url = new URL(user.avatarUrl);
  url.searchParams.set('s', '256');
  let res;
  try {
    res = await get(url.href);
  } catch (e) {
    return { status: 'fetch-failed', detail: e.message };
  }
  if (!res.ok) return { status: 'fetch-failed', detail: `HTTP ${res.status}` };
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return { status: 'bad-image', detail: type || 'unknown type' };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > AVATAR_MAX) return { status: 'bad-image', detail: `${buf.length} bytes` };
  const file = `avatar.${ext}`;
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, file), buf);
  removeAvatarFiles(home, file);
  save(home, { consent: true, login: user.login, file, fetchedAt: now().toISOString().slice(0, 10) });
  return { status: 'ok', login: user.login };
}

/** 页面要的身份：同意了且图片在，返回 { login, avatar: data URL }；否则 null。 */
export function pageIdentity(home) {
  const id = readIdentity(home);
  if (id?.consent !== true || !id.login || !FILES.has(id.file)) return null;
  const path = join(home, id.file);
  if (!existsSync(path)) return null;
  const type = id.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { login: String(id.login), avatar: `data:${type};base64,${readFileSync(path).toString('base64')}` };
}
```

- [ ] **Step 4：`src/share/inject.js` 加身份脚本**

把 `injectData` 换成下面这样，并新增 `identityScript`：

```js
/** 用户同意后的 GitHub 登录名和头像：单独一个变量，不和公开版标记混用（那个会把页面切成「给别人看」）。 */
export function identityScript(identity) {
  if (!identity) return '';
  const json = JSON.stringify({ login: identity.login, avatar: identity.avatar }).replace(/</g, '\\u003c');
  return `<script>window.__AGENT_BADGES_IDENTITY__ = ${json};</script>`;
}

/**
 * @param {object} [publicMeta]  公开版（profile）才有：{ name, home }，页面据此切换成「给别人看」的样子
 * @param {{ login: string, avatar: string } | null} [identity]  用户同意后的身份（pageIdentity 的结果）
 */
export function injectData(html, dataByBrand, publicMeta = null, identity = null) {
  let tag = dataScript(dataByBrand);
  if (publicMeta) tag += `\n<script>window.__AGENT_BADGES_PUBLIC__ = ${JSON.stringify(publicMeta).replace(/</g, '\\u003c')};</script>`;
  if (identity) tag += `\n${identityScript(identity)}`;
  // 用函数做替换：数据里的 $& $' 之类不会被当成替换模式
  return html.includes('</head>') ? html.replace('</head>', () => `${tag}\n</head>`) : tag + html;
}
```

- [ ] **Step 5：`gh.user()` 多带头像地址**

`src/share/publish.js` 的 `user()` 改成：

```js
    /** 已登录返回 { login, id, avatarUrl }，没登录返回 null。 */
    async user() {
      const r = await exec('gh', ['api', 'user']);
      if (r.code !== 0) return null;
      const u = JSON.parse(r.stdout);
      return { login: u.login, id: u.id, avatarUrl: u.avatar_url ?? null };
    },
```

- [ ] **Step 6：运行测试**

Run: `npx vitest run tests/avatar.test.js tests/publish.test.js tests/profile.test.js tests/contracts.test.js`
Expected: PASS（契约：`identity.js` 只用 `node:` 模块，没有 `console.`）。

再跑 `npm test`，Expected: 全部 PASS。

- [ ] **Step 7：提交**

```bash
git add src/share/identity.js src/share/inject.js src/share/publish.js tests/avatar.test.js
git commit -m "feat: opt-in identity — consent record, avatar fetch through gh, data-URL identity script for the page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 命令行：`avatar` 命令、第一次打开时询问、注入页面

**Files:**
- Create: `src/cli/commands/avatar.js`
- Modify: `src/cli/args.js`（命令、`--remove`、帮助文本）
- Modify: `src/cli/main.js`
- Modify: `src/cli/page.js`
- Modify: `src/cli/commands/open.js`
- Modify: `src/cli/commands/profile.js`
- Modify: `src/cli/commands/publish.js`
- Test: `tests/avatar.test.js`（加测试）

**Interfaces:**
- Consumes: Task 6 的 `consentOf`、`declineAvatar`、`fetchAvatar`、`pageIdentity`、`injectData(…, identity)`。
- Produces:
  - `runAvatar(opts, deps?)`；
  - `maybeAskAvatar(deps?)`；
  - deps 是 `{ home, gh, fetch, isTTY, prompt: (q) => Promise<boolean>, log }`；
  - `appHtml(data, identity = null)`；
  - `publicPage(data, name, identity = null)`；
  - `parseArgs` 认 `avatar` 命令和 `--remove`（`opts.remove`）。

- [ ] **Step 1：写失败的测试**，追加到 `tests/avatar.test.js`

在文件顶部 import 区追加：

```js
import { maybeAskAvatar, runAvatar } from '../src/cli/commands/avatar.js';
import { parseArgs } from '../src/cli/args.js';
```

在文件末尾追加：

```js
describe('命令行', () => {
  const deps = (over = {}) => {
    const out = { home, gh: fakeGh(), fetch: fakeFetch(), isTTY: true, asked: 0, logs: [], ...over };
    out.prompt = async () => {
      out.asked++;
      return over.answer ?? true;
    };
    out.log = (s) => out.logs.push(s);
    return out;
  };

  it('参数：avatar 命令和 --remove', () => {
    expect(parseArgs(['avatar'])).toMatchObject({ command: 'avatar', remove: false });
    expect(parseArgs(['avatar', '--remove'])).toMatchObject({ command: 'avatar', remove: true });
    expect(parseArgs(['avatar', '--yes'])).toMatchObject({ command: 'avatar', yes: true });
  });

  it('avatar：非终端不带 --yes 只打印说明，不取', async () => {
    const d = deps({ isTTY: false });
    await runAvatar({ yes: false, remove: false }, d);
    expect(d.fetch.calls).toEqual([]);
    expect(consentOf(home)).toBe(null);
  });

  it('avatar --yes：直接取；终端里问了说不要：记住不要', async () => {
    const d = deps({ isTTY: false });
    await runAvatar({ yes: true, remove: false }, d);
    expect(consentOf(home)).toBe(true);
    const no = deps({ answer: false });
    await runAvatar({ yes: false, remove: false }, no);
    expect(no.asked).toBe(1);
    expect(consentOf(home)).toBe(false);
  });

  it('avatar --remove：删掉头像，记住不要', async () => {
    await runAvatar({ yes: true, remove: false }, deps({ isTTY: false }));
    await runAvatar({ yes: false, remove: true }, deps());
    expect(existsSync(join(home, 'avatar.png'))).toBe(false);
    expect(consentOf(home)).toBe(false);
  });

  it('第一次在终端里打开：问一次；回答被记住，以后不再问', async () => {
    const first = deps();
    await maybeAskAvatar(first);
    expect(first.asked).toBe(1);
    expect(consentOf(home)).toBe(true);
    const again = deps();
    await maybeAskAvatar(again);
    expect(again.asked).toBe(0);
  });

  it('插件、Agent、脚本里（非终端）不问；没装或没登录 gh 也不问，下次装好了再问', async () => {
    const plugin = deps({ isTTY: false });
    await maybeAskAvatar(plugin);
    expect(plugin.asked).toBe(0);
    const noGh = deps({ gh: fakeGh({ available: false }) });
    await maybeAskAvatar(noGh);
    const loggedOut = deps({ gh: fakeGh({ user: null }) });
    await maybeAskAvatar(loggedOut);
    expect(noGh.asked + loggedOut.asked).toBe(0);
    expect(consentOf(home)).toBe(null);
  });
});
```

- [ ] **Step 2：运行，确认失败**

Run: `npx vitest run tests/avatar.test.js`
Expected: FAIL，找不到 `src/cli/commands/avatar.js`；`parseArgs(['avatar'])` 报“不认识的参数”。

- [ ] **Step 3：`src/cli/args.js`**

在 `parseArgs` 里：
- `opts` 初值加 `remove: false`；
- 命令判断那一行加上 `a === 'avatar'`；
- 加一个分支：`else if (a === '--remove') opts.remove = true;`。

具体如下：

```js
  const opts = { command: 'open', dir: null, brand: null, port: 4747, open: true, json: false, out: null, theme: 'dark', name: '', cardLang: 'en', outLang: null, yes: false, remove: false };
```

```js
    else if (a === '--yes' || a === '-y') opts.yes = true;
    else if (a === '--remove') opts.remove = true;
```

```js
    else if (a === 'collect' || a === 'export' || a === 'open' || a === 'card' || a === 'shelf' || a === 'profile' || a === 'publish' || a === 'avatar') opts.command = a;
```

帮助文本中文段，在 `profile <目录>` 那一行后面加：

```
  npx agent-badges avatar          在分享海报上显示你的 GitHub 头像（先问你同意；需要 gh）
```

选项里 `--yes` 那一行改成，并在后面加 `--remove`：

```
  --yes                            publish / avatar：确认执行（不带时只检查或询问）
  --remove                         avatar：删除已存的头像
```

英文段对应加：

```
  npx agent-badges avatar          show your GitHub avatar on the share poster (asks first; needs gh)
```

```
  --yes                            publish / avatar: go ahead (without it, only checks or asks)
  --remove                         avatar: delete the saved avatar
```

结尾那句“不上传任何内容 / Nothing is uploaded.”保持不变（头像是下载，不是上传）。

- [ ] **Step 4：写 `src/cli/commands/avatar.js`**

```js
// avatar 命令：在分享海报上显示 GitHub 头像。只有用户明确同意才取（终端里问，或带 --yes）。
// 第一次在终端里打开徽章墙时也会问一次（maybeAskAvatar），回答记在数据目录，以后不再问。
// 插件、Agent、脚本里（非终端）一律不问；没装或没登录 gh 时不问。
import { t } from '../i18n.js';

const STATUS = {
  'no-gh': () => t('需要 GitHub 命令行工具 gh：https://cli.github.com 。装好并 gh auth login 后再运行 npx agent-badges avatar。', 'This needs the GitHub CLI (gh): https://cli.github.com. Install it, run gh auth login, then run npx agent-badges avatar again.'),
  'not-logged-in': () => t('gh 还没有登录。运行 gh auth login 后再试。', "gh isn't signed in. Run gh auth login and try again."),
  'bad-image': (d) => t(`取到的头像不是 PNG 或 JPEG，或者太大（${d}），继续用示意头像。`, `The avatar isn't a PNG or JPEG, or it's too large (${d}). Keeping the placeholder.`),
  'fetch-failed': (d) => t(`没取到头像（${d}），继续用示意头像。可以稍后再运行 npx agent-badges avatar。`, `Couldn't fetch the avatar (${d}). Keeping the placeholder. You can run npx agent-badges avatar later.`),
};

const QUESTION = () =>
  t(
    '\n要在分享海报上显示你的 GitHub 头像吗？会通过 gh 读取你的用户名，并从 GitHub 下载头像，存在 ~/.agent-badges。[y/N] ',
    '\nShow your GitHub avatar on the share poster? This reads your username through gh and downloads your avatar from GitHub into ~/.agent-badges. [y/N] ',
  );

async function ask(question) {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

async function defaults(deps) {
  const { dataHome } = await import('../../collect/common.js');
  const { createGitHub } = await import('../../share/publish.js');
  return { home: dataHome(), gh: createGitHub(), fetch: globalThis.fetch, isTTY: Boolean(process.stdin.isTTY), prompt: ask, log: console.log, ...deps };
}

async function fetchAndReport(d) {
  const { fetchAvatar } = await import('../../share/identity.js');
  const r = await fetchAvatar(d.home, { gh: d.gh, fetch: d.fetch });
  d.log(r.status === 'ok' ? t(`已保存 @${r.login} 的头像，下次打开徽章墙时就会出现在分享海报上。`, `Saved the avatar for @${r.login}. It shows on the share poster next time you open the badge wall.`) : STATUS[r.status](r.detail));
}

/** npx agent-badges avatar [--yes] [--remove] */
export async function runAvatar(opts, deps = {}) {
  const d = await defaults(deps);
  const { declineAvatar } = await import('../../share/identity.js');
  if (opts.remove) {
    declineAvatar(d.home);
    return d.log(t('已删除头像，分享海报改回示意头像。', 'Avatar removed. The share poster goes back to the placeholder.'));
  }
  if (!opts.yes) {
    if (!d.isTTY) {
      return d.log(t('这会通过 gh 读取你的 GitHub 用户名并下载头像，什么都还没做。确认后加上 --yes 再运行一次。', 'This reads your GitHub username through gh and downloads your avatar. Nothing has happened yet. Run again with --yes to go ahead.'));
    }
    if (!(await d.prompt(QUESTION()))) {
      declineAvatar(d.home);
      return d.log(t('好的，不取头像。', 'OK, no avatar.'));
    }
  }
  await fetchAndReport(d);
}

/** 第一次在终端里打开徽章墙时问一次。非终端、已经回答过、没装或没登录 gh：都不问。 */
export async function maybeAskAvatar(deps = {}) {
  const d = await defaults(deps);
  if (!d.isTTY) return;
  const { consentOf, declineAvatar } = await import('../../share/identity.js');
  if (consentOf(d.home) !== null) return;
  if (!(await d.gh.available()) || !(await d.gh.user())) return;
  if (!(await d.prompt(QUESTION()))) {
    declineAvatar(d.home);
    return d.log(t('好的。以后想加，运行 npx agent-badges avatar。', 'OK. To add it later, run npx agent-badges avatar.'));
  }
  await fetchAndReport(d);
}
```

- [ ] **Step 5：`src/cli/main.js` 接上 `avatar`**

在 `await checkRuntime();` 后面、采集之前加（头像不需要采集）：

```js
  if (opts.command === 'avatar') return (await import('./commands/avatar.js')).runAvatar(opts);
```

- [ ] **Step 6：`src/cli/page.js` 传身份**

```js
export function appHtml(data, identity = null) {
  const html = appTemplate();
  return import('../share/inject.js').then(({ injectData }) => injectData(html, data, null, identity));
}
```

```js
/** 公开版徽章墙的 HTML：只放页面上看得到的数据（用户同意过的头像也放，海报上要用）。 */
export async function publicPage(data, name, identity = null) {
  const { publicData } = await import('../share/public.js');
  const { injectData } = await import('../share/inject.js');
  return injectData(appTemplate(), publicData(data), { name, home: PROJECT_SITE }, identity);
}
```

- [ ] **Step 7：各命令传入身份**

`src/cli/commands/open.js`：

```js
async function identity() {
  const { dataHome } = await import('../../collect/common.js');
  const { pageIdentity } = await import('../../share/identity.js');
  return pageIdentity(dataHome());
}

export async function exportPage(opts, data) {
  const html = await appHtml(data, await identity());
```

`open` 函数开头改成：

```js
export async function open(opts, data) {
  // 第一次在终端里打开时问一次要不要头像（非终端不问）
  await (await import('./avatar.js')).maybeAskAvatar();
  const html = await appHtml(data, await identity());
```

函数其余部分不变。

`src/cli/commands/profile.js`：
- 顶部加 `import { dataHome } from '../../collect/common.js';` 和 `import { pageIdentity } from '../../share/identity.js';`；
- `writeFileSync(page, …)` 那一行改成：

```js
  writeFileSync(page, await publicPage(data, opts.name || pages?.owner || '', pageIdentity(dataHome())));
```

`src/cli/commands/publish.js`：`writePublish` 里已经有 `dataHome`。在 `executePublish` 调用里把 `pageHtml` 改成：

```js
      pageHtml: await publicPage(data, opts.name || plan.login, (await import('../../share/identity.js')).pageIdentity(dataHome())),
```

- [ ] **Step 8：运行测试**

Run: `npx vitest run tests/avatar.test.js tests/cli.test.js tests/publish.test.js tests/profile.test.js tests/contracts.test.js tests/plugin.test.js`
Expected: PASS（`plugin.test.js` 检查技能里提到的参数都存在；技能里不提 `avatar`）。

再跑 `npm test` 和 `npm run check:pack`：
Expected: 全部 PASS；装好的命令行能跑（`check:pack` 是非终端，不会问头像）。

- [ ] **Step 9：提交**

```bash
git add src/cli/commands/avatar.js src/cli/args.js src/cli/main.js src/cli/page.js src/cli/commands/open.js src/cli/commands/profile.js src/cli/commands/publish.js tests/avatar.test.js
git commit -m "feat: agent-badges avatar — asks once in a terminal (never in plugins or scripts), --yes and --remove; local, exported and public pages embed the identity only after consent

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 演示站检查和隐私说明

**Files:**
- Modify: `scripts/build-site.mjs:11-12`
- Modify: `README.md:73-74`、`README.md:251`
- Modify: `README.zh-CN.md:73-74`、`README.zh-CN.md:251`
- Modify: `AGENTS.md:3`，以及 Map 里 `src/share/` 那一行
- Test: `tests/avatar.test.js`（加一个测试）

- [ ] **Step 1：写失败的测试**，追加到 `tests/avatar.test.js` 末尾

```js
describe('演示站和文档', () => {
  it('演示站构建脚本会拦住身份脚本', () => {
    const src = readFileSync(new URL('../scripts/build-site.mjs', import.meta.url), 'utf8');
    expect(src).toContain("demo.includes('__AGENT_BADGES_IDENTITY__ =')");
  });

  it('README 写明页面不联网，命令行只在 publish 和取头像时联网', () => {
    const en = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const zh = readFileSync(new URL('../README.zh-CN.md', import.meta.url), 'utf8');
    expect(en).toContain('npx agent-badges avatar');
    expect(en).not.toContain('There are no network calls and no analytics.');
    expect(zh).toContain('npx agent-badges avatar');
    expect(zh).not.toContain('不发任何网络请求，也没有任何统计。');
  });
});
```

- [ ] **Step 2：运行，确认失败**

Run: `npx vitest run tests/avatar.test.js`
Expected: FAIL（两条新测试）。

- [ ] **Step 3：`scripts/build-site.mjs`**

在第 12 行后面加：

```js
if (demo.includes('__AGENT_BADGES_IDENTITY__ =')) throw new Error('演示页里混进了头像或用户名');
```

- [ ] **Step 4：README（英文）**

第 73–74 行的命令列表里，在 `npx agent-badges shelf` 那一行后面加一行（`#` 和上面几行对齐）：

```
npx agent-badges avatar             # show your GitHub avatar on the share poster (asks first)
```

第 251 行换成：

```
- **Local only.** It reads `~/.claude` and `~/.codex` and writes to `~/.agent-badges`. The page is served on `127.0.0.1`, so nothing else on your network can reach it. The page makes no network calls and there are no analytics. The CLI goes online only for `publish` and, if you agree, to fetch your GitHub avatar for the share poster (`npx agent-badges avatar`).
```

- [ ] **Step 5：README（中文）**

第 73–74 行后面加：

```
npx agent-badges avatar             # 在分享海报上显示你的 GitHub 头像（会先问你）
```

第 251 行换成：

```
- **只在本机运行。** 读取 `~/.claude` 和 `~/.codex`，结果写进 `~/.agent-badges`。本地页面只监听 `127.0.0.1`，同一局域网里的其他设备也打不开。页面本身不发任何网络请求，也没有任何统计；命令行只在 `publish`，以及你同意取 GitHub 头像时（`npx agent-badges avatar`）联网。
```

- [ ] **Step 6：`AGENTS.md`**

第 3 行末尾：

```
Offline; nothing is uploaded unless the user runs `publish`.
```

换成：

```
Offline; nothing is uploaded unless the user runs `publish`, and the only other network use is the opt-in avatar download (`avatar`, asks first, never in non-TTY runs).
```

Map 表里 `src/share/` 那一行的 “Owns” 列，在 `the shelf image the page hands back (\`receive.js\`)` 后面加：

```
, the opt-in avatar and identity for the poster (`identity.js`)
```

改完确认 `AGENTS.md` 不超过 150 行（`docs.test.js` 会检查）。

- [ ] **Step 7：运行测试和站点检查**

```bash
npm test
npm run build:site
npm run check:site
```

Expected: 全部 PASS；`build:site` 不报“混进了头像或用户名”。

- [ ] **Step 8：提交**

```bash
git add scripts/build-site.mjs README.md README.zh-CN.md AGENTS.md tests/avatar.test.js
git commit -m "docs: the page stays offline; the CLI goes online only for publish and the opt-in avatar; demo build refuses an identity script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 全面验证

**Files:** 无新改动（发现问题就回到对应任务修）。

- [ ] **Step 1：单元测试和构建**

```bash
npm test
npm run build
```

Expected: 全部 PASS。

- [ ] **Step 2：浏览器检查（真实显卡和软件渲染）**

```bash
npm run check:browser
CHROME_GL=software npm run check:browser
```

Expected: 两次都全部通过，控制台没有报错。软件渲染下“两个一起”要现画 30 枚缩略图，较慢；`shoot.mjs` 给了 180 秒。

- [ ] **Step 3：徽章导出图逐像素比对**（和 Task 1 的基线必须同一天）

```bash
node scripts/visual.mjs capture /tmp/agent-badges-visual-final
node scripts/visual.mjs compare /tmp/agent-badges-visual-base /tmp/agent-badges-visual-final
```

Expected: 0 张不同。

- [ ] **Step 4：其余检查**

```bash
npm run check:shelf
npm run check:pack
npm run build:site && npm run check:site
```

Expected: 全部通过。

- [ ] **Step 5：真实头像的端到端检查（只由主控执行，要用户批准）**

这一步会读用户真实的数据目录，并联网访问 GitHub，所以子代理不做，由主控在用户同意后执行。
- 用户自己在终端运行 `npx agent-badges avatar`（或本地 `node bin/agent-badges.mjs avatar`）；
- 打开徽章墙，点“分享海报”，确认头像和 `@登录名` 出现，海报能下载。

把结果写进最终报告；没做就写明“没做”。

---

## Self-Review

**Spec coverage：**

| 规格要求 | 任务 |
| --- | --- |
| C / D2 外观、热力图画法、周起始日 | 4（绘制）、5（Step 10 目视） |
| 弹窗三段切换、默认当前工具、单工具时不显示 | 5；`shareModes` 测试在 3 |
| 缓存（形式 \| 年份 \| 语言）、切回不重画 | 5，`posterRenders` 检查 |
| 另一个工具的数据和缩略图 | 5（`load.js` 的 `tools`、`poster-art.js`） |
| `toBlob`、缩小预览、下载原尺寸、`posterURL` 保留 | 5 |
| 第一次点开的进度 | 5（`poster-art` 的 `onProgress`） |
| `yearCells`、`PLATE`、CSS 一致性测试、月章和铸币套装引用 | 1、2 |
| 重构前后 299 张逐像素一致 | 1 Step 0、2 Step 6、9 Step 3 |
| 铸币截图 | 5（`poster-art`） |
| 头像同意、`avatar` 命令、`--remove`、非终端不问、没 gh 不问、只问一次 | 6、7 |
| 身份注入（本机、导出、公开页），不和 `PUBLIC` 混用；开发服务器不注入 | 6、7（`vite.config.js` 不改，所以不注入） |
| 页面读身份、提示行（只在本机页面） | 5 |
| 演示站检查、README 和 AGENTS 说明 | 8 |
| 自定义头像、其他版式、年终总结、自动刷新 | 不做 |

**类型一致：**
- `renderPoster` 的 `tools[].items` 是 `{ state, img }`，由 `poster-art.get` 返回；
- `heat.cal` 是 `yearCells` 的返回值；
- `identity.avatar` 在页面上是 data URL，传给 `renderPoster` 前加载成 `HTMLImageElement`；
- `gh.user()` 的 `avatarUrl` 由 `fetchAvatar` 使用。

**已知取舍：**
- 规格说“热力图的 `partsOf`、`markersOn` 改成从 `yearCells` 取”。热力图是常驻的 DOM 格子，切换工具时只重新上色、不重建。所以这里让 `partsOf` 和 `yearCells` 共用同一个 `dayParts`，同样做到“一条规则、三处使用”，又不改热力图的增量重绘。
- `markersOn` 只有一行过滤，保持原样。
