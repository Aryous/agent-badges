# 架构定型（第二期）、文档与 add-badge skill — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 README、AGENTS.md 和代码成为一个整体：工具列表和徽章门槛各只写一处，大文件按职责拆开，约定都有测试守护，再配一个 `add-badge` skill。

**Architecture:** 先收口约定（注册表、规则表、分层），再拆三个大文件（命令行、页面主程序、样式表），最后写文档和 skill。每一步都对照改造前存下的基准（徽章配置、统计结果、帮助输出、截图）证明行为不变。

**Tech Stack:** Vanilla ES modules, three.js, Vite 8, Vitest 5, Node ≥ 22.15, playwright-core（浏览器检查）。

**Spec:** `docs/superpowers/specs/2026-10-21-architecture-phase2-docs-skill-design.md`

## Global Constraints

- 仓库：`/Users/lucas/Documents/Code/agent-badges`，分支 `main`。每个任务结束提交一次，提交信息以 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 结尾；不推送。
- npm 包零运行时依赖；命令行加载到的文件必须在 `package.json` 的 `files` 里且不引用 three（`tests/package-files.test.js` 守护）。
- `src/brands/` 不得引用 `src/engine/`（three）。
- 代码注释、测试名沿用中文；新文档（AGENTS.md、CONTRIBUTING.md、skill）只写英文一份；README 保持中英两份。
- 行为不变：外观、统计结果、命令行输出、`window.__badgeApp` 接口都不变。
- 不读取凭证和历史文件：`~/.claude/settings.json`、`~/.claude/.credentials.json`、`history.jsonl`、`~/.codex/auth.json`、`~/.codex/config.toml`、`*.env`、CC Switch 数据库。
- 不手动 `npm publish`；不提交视频；不改 `.claude-plugin/`、`plugin.json`、`.agents/plugins/`、`skills/` 的位置。

## 验证工具（所有任务共用）

基准在改造前已生成，放在会话临时目录（不进仓库）：

```bash
S=/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/p2
R=/Users/lucas/Documents/Code/agent-badges
```

| 检查 | 命令 | 期望 |
| --- | --- | --- |
| 徽章配置 | `node $S/dump-configs.mjs $R > $S/after-configs.json && node $S/compare-configs.mjs $S/base/configs.json $S/after-configs.json` | 最后一行「配置一致（criteria 之外）」；`criteria` 的变化逐条列出，需人工核对 |
| 统计结果 | `node $S/dump-progress.mjs $R > $S/after-progress.json && diff $S/base/progress.json $S/after-progress.json && echo same` | 输出 `same`（同一份账本副本 `$S/base/*.ledger.json`，日期固定 2026-10-21） |
| 帮助输出 | `LANG=zh_CN.UTF-8 node $R/bin/agent-badges.mjs --help \| cmp - $S/base/help-zh.txt && LANG=en_US.UTF-8 node $R/bin/agent-badges.mjs --help \| cmp - $S/base/help-en.txt && echo same` | 输出 `same` |
| 截图 | 先确保开发服务器在跑：`curl -s -o /dev/null -w '%{http_code}' http://localhost:5199/` 为 200，否则 `cd $R && npx vite --port 5199 --strictPort &`；然后 `cd $R && npm run check:browser && node $S/compare-shots.mjs $S/base/shots $R/screenshots` | `44/44 通过`；对比结果只允许 `desktop-inspect-moving.png`、`desktop-seven-day-streak-award-mid.png` 两张不一致（动画中途帧，本身每次都不同） |
| 全套 | `cd $R && npm test && npm run build && npm run check:pack && npm run check:shelf` | 全部通过 |

---

## 文件结构总览

| 位置 | 新建 / 修改 | 职责 |
| --- | --- | --- |
| `src/brands/index.js` | 改 | 根注册表，新增 `BRAND_IDS`、`brandById` |
| `src/brands/<id>/brand.js` | 改 | 新增 `launchDate` |
| `src/data/tiers.js` | 新 | `tierIndexFor`（从 engine 移来） |
| `src/data/mock-<id>.js` | 改 | 导出 `BRAND_ID`、`MOCK_DAILY` |
| `src/data/progress.js` | 改 | 导出由 mock 推出的 `DATA_SOURCES` |
| `src/data/<id>-metrics.js` | 改 | 导出 `RULES`；`computeProgress` 遍历徽章 |
| `src/cli/**` | 新 | 命令行（从 `bin/agent-badges.mjs` 拆出） |
| `src/app/**` | 新 | 页面主程序各面板（从 `src/main.js` 拆出） |
| `src/viewer/{describe,mount-badge,snapshot}.js` | 新 | 从 viewer 现有文件抽出的公共件 |
| `src/styles/*.css` | 新 | 样式按组件拆分；`src/style.css` 只剩 `@import` |
| `tools/` | 新 | `studio.html`、`promo.html`、`promo/`（开发专用） |
| `tests/contracts.test.js` | 新 | 契约测试 |
| `tests/docs.test.js` | 新 | 文档同步测试 |
| `AGENTS.md`、`CLAUDE.md`、`CONTRIBUTING.md` | 新 | 文档 |
| `.agents/skills/add-badge/**`、`.claude/skills/add-badge`（软链接） | 新 | 贡献者 skill |

---

### Task 1: 工具注册表与分层归位

**Files:**
- Modify: `src/brands/index.js`, `src/brands/claude-code/brand.js`, `src/brands/codex/brand.js`
- Modify: `src/collect/summary.js:2-13`, `src/collect/common.js:24-31`, `src/collect/claude-code.js`, `src/collect/codex.js`
- Modify: `src/data/daily.js:5-18`, `src/data/metrics-common.js:163-164`, `src/data/claude-code-metrics.js` (LAUNCH_DATES 用处), `src/data/codex-metrics.js` (同), `src/data/normalize.js:2`
- Create: `src/data/tiers.js`
- Modify: `src/engine/tiers.js:54-61`（删 `tierIndexFor`）, `tests/tiers.test.js:3`
- Modify: `src/data/mock-claude-code.js`, `src/data/mock-codex.js`, `src/data/progress.js`, `src/project/studio.js:7-8,17`, `scripts/assets.mjs:146-148`
- Modify: `bin/agent-badges.mjs:23-73 (HELP), 94, 130`, `vite.config.js:19`
- Modify: `package.json` `files`
- Modify: `tests/daily.test.js:16-21`, `tests/claude-code-metrics.test.js:273`
- Modify: `src/site/main.js`, `src/promo/main.js`（加 `// showcase` 标记）
- Create: `tests/contracts.test.js`

**Interfaces:**
- Produces: `BRAND_IDS: string[]`、`brandById(id) → { brand, badges, series } | null`（`src/brands/index.js`）；`brand.launchDate: 'YYYY-MM-DD'`；`DATA_SOURCES: { [id]: { mock: () => Promise<raw>, mockDaily: object } }`（`src/data/progress.js`）；`dailySeries(ledger, turnsField)`；`saveBrand(home, brandId, ledger, progress, { turnsField })`；每个采集模块导出 `TURNS_FIELD`；`tierIndexFor`（`src/data/tiers.js`）。

- [ ] **Step 1: 写契约测试（注册表、分层、手写 id、展示列表）**

新建 `tests/contracts.test.js`：

```js
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANDS, BRAND_IDS, brandById } from '../src/brands/index.js';
import { COLLECTORS } from '../src/collect/index.js';
import { BRAND_INFO } from '../src/collect/summary.js';
import { DATA_SOURCES } from '../src/data/progress.js';

// 项目约定的守护测试：文档（AGENTS.md / CONTRIBUTING.md）里写的每条约定，都在这里或别的测试里有一条对应。

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sorted = (a) => [...a].sort();
const read = (f) => readFileSync(join(root, f), 'utf8');

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) out.push(...filesUnder(rel));
    else if (/\.(m?js)$/.test(name)) out.push(rel);
  }
  return out;
}

const importsOf = (file) =>
  [
    ...read(file).matchAll(/^\s*(?:import|export)\b[^'"`]*?from\s*['"]([^'"]+)['"]/gm),
    ...read(file).matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm),
    ...read(file).matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1]);

const withoutComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

describe('工具注册表只有一份', () => {
  it('BRANDS、COLLECTORS、DATA_SOURCES、BRAND_INFO 的工具 id 完全一致', () => {
    const ids = sorted(BRAND_IDS);
    expect(sorted(BRANDS.map((e) => e.brand.id))).toEqual(ids);
    expect(sorted(COLLECTORS.map((c) => c.BRAND_ID))).toEqual(ids);
    expect(sorted(Object.keys(DATA_SOURCES))).toEqual(ids);
    expect(sorted(Object.keys(BRAND_INFO))).toEqual(ids);
  });

  it('每个工具都写了发布日期', () => {
    for (const { brand } of BRANDS) expect(brand.launchDate, brand.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('每个采集模块都声明了对话轮数字段', () => {
    for (const c of COLLECTORS) expect(typeof c.TURNS_FIELD, c.BRAND_ID).toBe('string');
  });
});

describe('分层', () => {
  // 每一层能引用的层；不在表里的（app、site、project 和 src 根目录的入口）是入口层，可以引用任何层。
  const DEPS = {
    engine: ['engine'],
    brands: ['brands'],
    data: ['data', 'brands'],
    collect: ['collect', 'data', 'brands'],
    cli: ['cli', 'collect', 'data', 'brands'],
    viewer: ['viewer', 'engine', 'data', 'brands'],
  };
  // 这些层在命令行里运行：只能用 Node 自带模块
  const NODE_ONLY = ['brands', 'data', 'collect', 'cli'];
  const layerOf = (file) => {
    const parts = relative('src', file).split('/');
    return parts.length > 1 ? parts[0] : 'entry';
  };

  it('每个文件只引用允许的层', () => {
    const bad = [];
    for (const file of filesUnder('src')) {
      const from = layerOf(file);
      const allowed = DEPS[from];
      for (const spec of importsOf(file)) {
        if (spec.startsWith('.')) {
          const target = relative(root, resolve(root, dirname(file), spec));
          if (!target.startsWith('src/')) continue;
          const to = layerOf(target);
          if (allowed && !allowed.includes(to)) bad.push(`${file} → ${target}`);
        } else if (NODE_ONLY.includes(from) && !spec.startsWith('node:')) {
          bad.push(`${file} → ${spec}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('不手写工具 id', () => {
  const ids = BRAND_IDS.join('|');
  // 工具专属的文件可以写自己的 id
  const OWN = new RegExp(`^src/(brands/(${ids})/|brands/index\\.js$|collect/(${ids})\\.js$|data/(${ids})-metrics\\.js$|data/mock-(${ids})\\.js$)`);
  const LITERAL = new RegExp(`(['"\`])(${ids})\\1`);

  it('src/、bin/、vite.config.js 里只有工具专属文件和标了 showcase 的展示文件出现工具 id', () => {
    const files = [...filesUnder('src'), ...filesUnder('bin'), 'vite.config.js'];
    const bad = files.filter((f) => !OWN.test(f) && !/\/\/ showcase\b/.test(read(f)) && LITERAL.test(withoutComments(read(f))));
    expect(bad).toEqual([]);
  });
});

describe('展示列表', () => {
  it('网站、宣传片和素材脚本里挑出来展示的徽章都存在', () => {
    const files = [...filesUnder('src'), ...(statSync(join(root, 'tools'), { throwIfNoEntry: false }) ? filesUnder('tools') : []), ...filesUnder('scripts')];
    const missing = [];
    for (const f of files) {
      if (!/\/\/ showcase\b/.test(read(f)) && !f.startsWith('scripts/')) continue;
      for (const [, brand, id] of read(f).matchAll(/\{\s*brand:\s*'([a-z-]+)',\s*id:\s*'([a-z0-9-]+)'/g)) {
        if (!brandById(brand)?.badges.some((b) => b.id === id)) missing.push(`${f}: ${brand}/${id}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `cd $R && npx vitest run tests/contracts.test.js`
Expected: FAIL — `BRAND_IDS` / `DATA_SOURCES` 未导出、`launchDate` 缺失、分层（`src/data/normalize.js → src/engine/tiers.js`）、手写 id（`bin/agent-badges.mjs`、`src/collect/summary.js`、`src/data/daily.js`、`src/data/metrics-common.js`、`src/data/progress.js`、`src/project/studio.js`、`src/site/main.js`、`src/promo/main.js`、`vite.config.js`）。

- [ ] **Step 3: 根注册表**

`src/brands/index.js` 改为：

```js
import claudeBrand from './claude-code/brand.js';
import claudeBadges, { SERIES as claudeSeries } from './claude-code/index.js';
import codexBrand from './codex/brand.js';
import codexBadges, { SERIES as codexSeries } from './codex/index.js';

// 工具注册表：全项目唯一的工具列表。其他层（采集、示例数据、命令行、开发服务器）都从这里或自己按 id 索引的表取，
// tests/contracts.test.js 保证各处一致。新增工具的完整步骤见 CONTRIBUTING.md。

export const BRANDS = [
  { brand: claudeBrand, badges: claudeBadges, series: claudeSeries },
  { brand: codexBrand, badges: codexBadges, series: codexSeries },
];

export const BRAND_IDS = BRANDS.map((e) => e.brand.id);

export const DEFAULT_BRAND = 'claude-code';

export const brandById = (id) => BRANDS.find((e) => e.brand.id === id) ?? null;

export function getBrand(id) {
  return brandById(id) ?? brandById(DEFAULT_BRAND);
}
```

`src/brands/claude-code/brand.js` 的品牌对象加 `launchDate: '2025-02-24',`（工具发布日，生日徽章用）；`src/brands/codex/brand.js` 加 `launchDate: '2025-04-16',`。若 `src/engine/validate.js` 对品牌对象有字段白名单，把 `launchDate` 加进去。

- [ ] **Step 4: 汇总表由注册表推出**

`src/collect/summary.js` 第 2–13 行替换为：

```js
import { BRANDS } from '../brands/index.js';
import { normalizeProgress } from '../data/normalize.js';
import { highlights } from '../data/highlights.js';
import { badgeTitle, tierKey, tierLabel } from '../brands/shared/text.js';

export const BRAND_INFO = Object.fromEntries(BRANDS.map(({ brand, badges }) => [brand.id, { brand, badges }]));
```

- [ ] **Step 5: 发布日期与对话轮数字段归位**

- `src/data/metrics-common.js`：删除 `LAUNCH_DATES` 及其注释（163–164 行），`holidays.birthday(launch)` 保留。
- `src/data/claude-code-metrics.js`：import 列表删 `LAUNCH_DATES`，加 `import brand from '../brands/claude-code/brand.js';`，把 `LAUNCH_DATES['claude-code']` 换成 `brand.launchDate`。
- `src/data/codex-metrics.js`：同理，`import brand from '../brands/codex/brand.js';`，`LAUNCH_DATES.codex` → `brand.launchDate`。
- `src/data/daily.js`：删除 `TURNS_FIELD`，`dailySeries` 改为：

```js
/** 账本 → 按天的使用量（没有任何活动的日子不写）。turnsField 由采集模块给出（各工具的对话轮数字段名不同）。 */
export function dailySeries(ledger, turnsField) {
  const out = {};
  for (const date of Object.keys(ledger?.days ?? {}).sort()) {
    const d = ledger.days[date];
    const tokens = Math.round(d.tokens ?? 0);
    const turns = d[turnsField] ?? 0;
    if (tokens > 0 || turns > 0) out[date] = [tokens, turns];
  }
  return out;
}
```

- `src/collect/common.js`：`saveBrand(home, brandId, ledger, progress, { turnsField })`，内部 `daily: dailySeries(ledger, turnsField)`。
- `src/collect/claude-code.js`：加 `export const TURNS_FIELD = 'humanTurns';`，调用改为 `saveBrand(home, BRAND_ID, ledger, progress, { turnsField: TURNS_FIELD })`。
- `src/collect/codex.js`：加 `export const TURNS_FIELD = 'turns';`，同样传入。
- 测试：`tests/daily.test.js:16-21` 改为 `dailySeries(ledger, 'humanTurns')` / `dailySeries({...}, 'turns')`；`tests/claude-code-metrics.test.js:273` 改为 `dailySeries(merged, 'humanTurns')`。

- [ ] **Step 6: 等级下标挪到 data 层**

新建 `src/data/tiers.js`：

```js
// 分级徽章：数值 → 达到的等级下标。统计、归一化、命令行都用，不依赖引擎。

/** 根据数值算出达到的等级下标（-1 表示还没到第一级）。 */
export function tierIndexFor(tiers, value) {
  let idx = -1;
  tiers.forEach((t, i) => {
    if (value >= t.threshold) idx = i;
  });
  return idx;
}
```

- 删除 `src/engine/tiers.js` 里的 `tierIndexFor`（文件末尾 54–61 行）。先 `grep -rn tierIndexFor src scripts tests bin` 确认只有 `src/data/normalize.js` 和 `tests/tiers.test.js` 在用。
- `src/data/normalize.js:2` 改为 `import { tierIndexFor } from './tiers.js';`
- `tests/tiers.test.js:3` 拆成 `import { resolveTier } from '../src/engine/tiers.js';` 和 `import { tierIndexFor } from '../src/data/tiers.js';`
- `package.json` `files`：删 `"src/engine/tiers.js"`，在 `"src/data/highlights.js"` 后加 `"src/data/tiers.js"`。

- [ ] **Step 7: 示例数据自报 id，`DATA_SOURCES` 由它们推出**

- `src/data/mock-claude-code.js` 顶部（注释之后）加：

```js
export const BRAND_ID = 'claude-code';

/** 示例数据的按天使用量：从 2025 年 3 月开始。 */
export const MOCK_DAILY = { seed: 7, from: '2025-03-01', to: '2026-10-15', base: 2_000_000 };
```

- `src/data/mock-codex.js` 加：

```js
export const BRAND_ID = 'codex';

/** 示例数据的按天使用量：从 2026 年 4 月开始，和 Claude Code 重叠的日子在热力图上显示双色。 */
export const MOCK_DAILY = { seed: 11, from: '2026-04-10', to: '2026-10-15', base: 60_000_000, restRate: 0.45 };
```

- `src/data/progress.js`：import 改为 `import * as mockClaudeCode from './mock-claude-code.js';`、`import * as mockCodex from './mock-codex.js';`；删除 `MOCKS`、`SOURCES`、`MOCK_DAILY` 三张手写表，改为：

```js
/** 每个工具的示例数据（在线演示和 ?source=mock 用），由示例数据模块自报 id。 */
export const DATA_SOURCES = Object.fromEntries(
  [mockClaudeCode, mockCodex].map((m) => [m.BRAND_ID, { mock: m.default, mockDaily: m.MOCK_DAILY }]),
);

const source = (brandId) => async ({ forceMock } = {}) => {
  const l = local(brandId);
  return l && !forceMock ? l.progress : DATA_SOURCES[brandId].mock();
};

const SOURCES = Object.fromEntries(Object.keys(DATA_SOURCES).map((id) => [id, source(id)]));
```

`loadDaily` 里 `MOCK_DAILY[brandId]` → `DATA_SOURCES[brandId]?.mockDaily`，`MOCKS[brandId]()` → `DATA_SOURCES[brandId].mock()`。顶部注释里的 `{ 'claude-code': {...}, codex: {...} }` 改成 `{ [工具 id]: {...} }`。

- `src/project/studio.js`：删掉两个 mock import 和 `MOCKS`，改为 `import { DATA_SOURCES } from '../data/progress.js';`，用到 `MOCKS[x]` 的地方换成 `DATA_SOURCES[x].mock`。
- `scripts/assets.mjs:146-148`：`mocks` 改为从 `../src/data/progress.js` 取 `DATA_SOURCES`（`DATA_SOURCES[id].mock`），`['claude-code', 'codex']` 换成 `BRAND_IDS`（从 `../src/brands/index.js` 引入）。

- [ ] **Step 8: 命令行和开发服务器取注册表**

- `bin/agent-badges.mjs`：加 `import { BRAND_IDS } from '../src/brands/index.js';`
  - 94 行：`if (opts.brand && !BRAND_IDS.includes(opts.brand)) throw …`
  - 130 行：`Object.fromEntries(BRAND_IDS.map((id) => …))`
  - `HELP` 里写死的 `claude-code|codex`（以及任何列出两个 id 的地方）改为 `${BRAND_IDS.join('|')}`，帮助输出必须逐字节不变。
- `vite.config.js`：加 `import { BRAND_IDS } from './src/brands/index.js';`，19 行 `for (const id of BRAND_IDS)`。

- [ ] **Step 9: 展示文件加标记**

`src/site/main.js` 和 `src/promo/main.js` 文件头注释后加一行 `// showcase: 手工挑选的展示徽章，id 由 tests/contracts.test.js 核对`。

- [ ] **Step 10: 运行测试**

Run: `cd $R && npx vitest run tests/contracts.test.js && npm test`
Expected: 全部 PASS。若分层测试报出其他越界（例如 viewer → 入口层），按 spec 1.3 的表判断：属于代码越界就修，属于表漏写就在提交说明里写明并更新 spec 的表。

- [ ] **Step 11: 对照基准**

Run: 配置、统计、帮助输出三项检查（见「验证工具」），再 `npm run build && npm run check:pack`。
Expected: 配置一致（无 criteria 变化）；统计 `same`；帮助 `same`；pack 通过。

- [ ] **Step 12: Commit**

```bash
cd $R && git add -A src bin tests scripts vite.config.js package.json && git commit -m "refactor: one tool registry, launch dates and turns field move to their owners, tierIndexFor moves to data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 规则按徽章 id 登记，门槛只写在配置里

**Files:**
- Modify: `src/data/metrics-common.js`（新增 `dayPeak`）
- Modify: `src/data/claude-code-metrics.js:318-398`（`computeProgress` → `context` + `RULES` + 遍历）
- Modify: `src/data/codex-metrics.js:287-372`（`computeCodexProgress` → 改名 `computeProgress`，同样结构）
- Modify: 调用方 `src/collect/codex.js`、`tests/codex-metrics.test.js` 等（`grep -rn computeCodexProgress`）
- Modify: 62 个徽章文件的 `criteria`；`src/brands/codex/feature-frame.js:36,43`；`src/brands/claude-code/app-icon.js:48,55`（如需）；`src/project/logo.js:44`
- Modify: `src/engine/validate.js:60,78`
- Modify: `tests/progress.test.js:45,98`, `tests/tiers.test.js:14,120`
- Modify: `tests/contracts.test.js`（追加两组）

**Interfaces:**
- Consumes: Task 1 的 `brand.launchDate`。
- Produces: `RULES: { [badgeId]: (ctx, badge) => rawProgress }`（两个统计模块各一份）；`computeProgress(ledger, badges, today)`（两个模块同名）；`dayPeak(dates, days, field, target)`（metrics-common）；徽章 `criteria` 形状：一次性 `{ target: number, unit?: 'h', dynamic?: true }`，分级徽章无 `criteria`。

- [ ] **Step 1: 写契约测试（覆盖、门槛跟随配置）**

在 `tests/contracts.test.js` 末尾追加（文件顶部补 import）：

```js
import * as ccMetrics from '../src/data/claude-code-metrics.js';
import * as cxMetrics from '../src/data/codex-metrics.js';
import { addDays } from '../src/data/metrics-common.js';

const METRICS = { 'claude-code': ccMetrics, codex: cxMetrics };
const TODAY = '2026-10-21';

// 一天的基础记录：让这一天算「有活动」，其余字段为 0
const baseDay = (brandId, extra) => ({
  ...(brandId === 'codex' ? { threads: 1, turns: 1, patches: 0 } : { sessions: 1, humanTurns: 1, toolCalls: 0 }),
  tokens: 1,
  hours: Array(24).fill(0),
  models: [],
  mcp: [],
  longestSessionMin: 0,
  ...extra,
});
const names = (n) => Array.from({ length: n }, (_, i) => `x${i}`);

// 「有数字门槛的一次性徽章」在账本里对应的字段：给出数值 n，造出刚好是 n 的账本。
// 新增这类徽章时在这里补一条，否则下面的测试会提醒。
const FIXTURES = {
  'productive-day': (b, n) => ({ '2026-03-02': baseDay(b, b === 'codex' ? { threads: n } : { sessions: n }) }),
  multitasker: (b, n) => ({ '2026-03-02': baseDay(b, { maxParallel: n }) }),
  'subagent-commander': (b, n) => ({ '2026-03-02': baseDay(b, { maxParallelAgents: n }) }),
  'bash-maniac': (b, n) => ({ '2026-03-02': baseDay(b, { bashCalls: n }) }),
  'skill-master': (b, n) => ({ '2026-03-02': baseDay(b, { skillCalls: n }) }),
  connector: (b, n) => ({ '2026-03-02': baseDay(b, { mcp: names(n) }) }),
  'model-collector': (b, n) => ({ '2026-03-02': baseDay(b, { models: names(n) }) }),
  compactor: (b, n) => ({ '2026-03-02': baseDay(b, { compactions: n }) }),
  marathon: (b, n) => ({ '2026-03-02': baseDay(b, { longestSessionMin: n * 60 }) }),
  'seven-day-streak': (b, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays('2026-03-02', i), baseDay(b)])),
};

const isCounted = (badge) => !badge.tiers && badge.criteria.target > 1 && !badge.criteria.dynamic;

describe('每枚徽章都有统计规则', () => {
  for (const { brand, badges } of BRANDS) {
    it(`${brand.id}：RULES 的 key 和徽章 id 一一对应`, () => {
      expect(sorted(Object.keys(METRICS[brand.id].RULES))).toEqual(sorted(badges.map((b) => b.id)));
    });
    it(`${brand.id}：空账本也能算出每枚徽章的进度`, () => {
      const out = METRICS[brand.id].computeProgress({ days: {} }, badges, TODAY);
      expect(sorted(Object.keys(out))).toEqual(sorted(badges.map((b) => b.id)));
    });
  }
});

describe('门槛只写在配置里', () => {
  for (const { brand, badges } of BRANDS) {
    const { computeProgress } = METRICS[brand.id];
    const unlockedAt = (badge, n) => computeProgress({ days: FIXTURES[badge.id](brand.id, n) }, [badge], TODAY)[badge.id].unlocked;

    for (const badge of badges.filter(isCounted)) {
      it(`${brand.id}/${badge.id}：达到配置的门槛才解锁，改门槛规则跟着变`, () => {
        expect(FIXTURES[badge.id], `tests/contracts.test.js 的 FIXTURES 缺 ${badge.id}`).toBeTypeOf('function');
        const t = badge.criteria.target;
        expect(unlockedAt(badge, t)).toBe(true);
        expect(unlockedAt(badge, t - 1)).toBe(false);
        const moved = { ...badge, criteria: { ...badge.criteria, target: t + 2 } };
        expect(unlockedAt(moved, t + 1)).toBe(false);
        expect(unlockedAt(moved, t + 2)).toBe(true);
        expect(computeProgress({ days: FIXTURES[badge.id](brand.id, t) }, [badge], TODAY)[badge.id].progress.target).toBe(t);
      });

      it(`${brand.id}/${badge.id}：中英文说明里写的是配置的门槛`, () => {
        const t = String(badge.criteria.target);
        expect(badge.description).toContain(t);
        expect(badge.en.description).toContain(t);
      });
    }
  }

  it('criteria 只有 target、unit、dynamic；分级徽章不写 criteria', () => {
    for (const { badges } of BRANDS) {
      for (const b of badges) {
        if (b.tiers) expect(b.criteria, b.id).toBeUndefined();
        else expect(Object.keys(b.criteria).filter((k) => !['target', 'unit', 'dynamic'].includes(k)), b.id).toEqual([]);
      }
    }
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `cd $R && npx vitest run tests/contracts.test.js`
Expected: FAIL — `RULES` 未导出、codex 的 `computeProgress` 未导出、`criteria` 里还有 `metric`。

- [ ] **Step 3: 公共辅助 `dayPeak`**

`src/data/metrics-common.js` 在 `tiered` 之后加：

```js
/**
 * 「某一天的 field 达到 target」类徽章。进度显示历史单日最高值（不超过 target）。
 * @param {string[]} dates 参与判断的日期（升序）
 */
export function dayPeak(dates, days, field, target) {
  const max = Math.max(0, ...dates.map((d) => days[d][field] ?? 0));
  return once(firstDate(dates, days, (d) => (d[field] ?? 0) >= target), Math.min(max, target), target);
}
```

- [ ] **Step 4: Claude Code 规则表**

`src/data/claude-code-metrics.js` 的第 4 部分（`computeProgress`，318 行起到文件末）替换为下面的代码；import 补上 `dayPeak`，保留其余已有 import（`perfectMonth`、`holidays`、`hoursSeries` 等），删除不再用的。

```js
// ---------- 4. 账本 → 徽章进度 ----------

/** 规则共用的上下文：活跃日期、按天数据，以及几个常用的算法。 */
function context(ledger, today) {
  const days = ledger.days;
  const dates = Object.keys(days)
    .filter((d) => {
      const x = days[d];
      // hook 触发、进入 Plan 模式本身也说明那天在用
      return x.sessions > 0 || x.humanTurns > 0 || x.toolCalls > 0 || x.tokens > 0 || x.hooks || x.plan;
    })
    .sort();
  let streak;
  return {
    ledger,
    days,
    dates,
    today,
    first: (pred) => firstDate(dates, days, pred),
    on: (pred) => once(firstDate(dates, days, (_, date) => pred(date))),
    cum: (field) => cumulative(dates, days, field),
    maxOf: (field) => Math.max(0, ...dates.map((d) => days[d][field] ?? 0)),
    peak: (field, target) => dayPeak(dates, days, field, target),
    get streak() {
      return (streak ??= streaks(dates));
    },
  };
}

const tier = (badge, series) => tiered(badge.tiers, series.value, series.reachedOn);

/**
 * 每枚徽章一条规则，键是徽章 id。门槛一律从徽章配置读（criteria.target / tiers），这里不写数字。
 * 新增徽章：在这里加一条；tests/contracts.test.js 会检查规则和徽章一一对应、门槛跟随配置。
 */
export const RULES = {
  // 里程碑
  'first-session': (c) => once(c.dates[0] ?? null),
  sessions: (c, b) => tier(b, c.cum('sessions')),
  tokens: (c, b) => tier(b, c.cum('tokens')),
  'tool-calls': (c, b) => tier(b, c.cum('toolCalls')),
  'active-hours': (c, b) => tier(b, hoursSeries(c.dates, c.days)),
  dispatches: (c, b) => tier(b, c.cum('dispatches')),
  'web-research': (c, b) => tier(b, c.cum('webCalls')),
  'file-edits': (c, b) => tier(b, c.cum('editCalls')),

  // 连续与习惯
  'seven-day-streak': (c, { criteria: { target: t } }) => once(c.streak.reached[t] ?? null, Math.min(c.streak.best, t), t),
  'streak-days': (c, b) => tiered(b.tiers, c.streak.best, (n) => c.streak.reached[n] ?? null),
  'night-owl': (c) => once(c.first((d) => d.hours.slice(0, 5).some((h) => h > 0))),
  'early-bird': (c) => once(c.first((d) => d.hours[5] + d.hours[6] > 0)),
  // 周末战士：同一个周末的周六和周日都有使用，记在周日
  'weekend-warrior': (c) => once(c.first((_, date) => weekday(date) === 0 && c.dates.includes(addDays(date, -1)))),
  // 门槛单位是小时，账本里是分钟
  marathon: (c, { criteria: { target: t } }) => once(c.first((d) => d.longestSessionMin >= t * 60), Math.floor(c.maxOf('longestSessionMin') / 60), t),
  'midnight-crossing': (c) => once(c.first((d) => d.midnight)),
  'productive-day': (c, b) => c.peak('sessions', b.criteria.target),
  multitasker: (c, b) => c.peak('maxParallel', b.criteria.target),
  // 门槛是当月的工作日数，由规则自己算（配置里的 target 只是显示兜底）
  'perfect-month': (c) => {
    const pm = perfectMonth(c.dates, c.today);
    return once(pm.date, pm.current, pm.target);
  },

  // 功能探索
  'subagent-commander': (c, b) => c.peak('maxParallelAgents', b.criteria.target),
  'hooks-smith': (c) => once(c.first((d) => d.hooks)),
  connector: (c, { criteria: { target: t } }) => {
    const { size, reached } = distinctOver(c.dates, c.days, 'mcp', t);
    return once(reached, Math.min(size, t), t);
  },
  'skill-master': (c, { criteria: { target: t } }) => {
    const s = c.cum('skillCalls');
    return once(s.reachedOn(t), Math.min(s.value, t), t);
  },
  'plan-mode': (c) => once(c.first((d) => d.plan)),
  autopilot: (c) => once(c.first((d) => d.autopilot)),

  // 限定与彩蛋
  'programmers-day': (c) => c.on((date) => date.endsWith('-10-24')),
  // 门槛是年数
  anniversary: (c, { criteria: { target: years } }) => {
    const firstDay = [c.ledger.firstSeen, c.dates[0]].filter(Boolean).sort()[0];
    const anniv = firstDay ? addDays(firstDay, 365 * years) : null;
    return once(anniv && anniv <= c.today ? anniv : null);
  },
  'model-collector': (c, { criteria: { target: t } }) => {
    // stats-cache 里没有日期的模型使用记录也算：一开始就收集到了
    const seen = new Set(c.ledger.undatedModels ?? []);
    let r = seen.size >= t ? c.dates[0] ?? null : null;
    for (const date of c.dates) {
      for (const m of c.days[date].models) seen.add(m);
      if (!r && seen.size >= t) r = date;
    }
    return once(r, Math.min(seen.size, t), t);
  },
  'bash-maniac': (c, b) => c.peak('bashCalls', b.criteria.target),
  'new-year': (c) => c.on(holidays['new-year']),
  'spring-festival': (c) => c.on(holidays['spring-festival']),
  'tool-birthday': (c) => c.on(holidays.birthday(brand.launchDate)),
  christmas: (c) => c.on(holidays.christmas),
};

/**
 * @param {object} ledger   mergeLedger 的结果
 * @param {object[]} badges 徽章配置（规则从这里读门槛）
 * @param {string} today    YYYY-MM-DD
 * @returns {object} 原始进度（交给 normalizeProgress）
 */
export function computeProgress(ledger, badges, today) {
  const ctx = context(ledger, today);
  return Object.fromEntries(
    badges.map((b) => {
      const rule = RULES[b.id];
      if (!rule) throw new Error(`徽章「${b.id}」没有统计规则：在 src/data/claude-code-metrics.js 的 RULES 里加一条`);
      return [b.id, rule(ctx, b)];
    }),
  );
}
```

注意：`dayPeak` 的进度上限是 `Math.min(max, target)`，与原代码一致；原来的 `bash-maniac`、`subagent-commander`、`productive-day`、`multitasker` 都是这个形状。`marathon` 原代码进度不封顶，保持不封顶。

- [ ] **Step 5: Codex 规则表**

`src/data/codex-metrics.js` 的 `computeCodexProgress` 整体替换为同样结构的 `context` + `RULES` + `computeProgress`。`context` 里的活跃日期过滤沿用原来的 `d.threads > 0 || d.turns > 0 || d.patches > 0`，另外提供 `all`（全部日期，功能类徽章用）。规则逐条对应原代码：

```js
export const RULES = {
  // 里程碑
  'first-thread': (c) => once(c.first((d) => d.threads > 0) ?? c.dates[0] ?? null),
  threads: (c, b) => tier(b, c.cum('threads')),
  tokens: (c, b) => tier(b, c.cum('tokens')),
  patches: (c, b) => tier(b, c.cum('patches')),
  'active-hours': (c, b) => tier(b, hoursSeries(c.dates, c.days)),
  dispatches: (c, b) => tier(b, c.cum('dispatches')),

  // 连续与习惯
  'seven-day-streak': (c, { criteria: { target: t } }) => once(c.streak.reached[t] ?? null, Math.min(c.streak.best, t), t),
  'streak-days': (c, b) => tiered(b.tiers, c.streak.best, (n) => c.streak.reached[n] ?? null),
  'night-owl': (c) => once(c.first((d) => d.hours.slice(0, 5).some((h) => h > 0))),
  'early-bird': (c) => once(c.first((d) => d.hours[5] + d.hours[6] > 0)),
  'weekend-warrior': (c) => once(c.first((_, date) => weekday(date) === 0 && c.dates.includes(addDays(date, -1)))),
  marathon: (c, { criteria: { target: t } }) => once(c.first((d) => d.longestSessionMin >= t * 60), Math.floor(c.maxOf('longestSessionMin') / 60), t),
  'midnight-crossing': (c) => once(c.first((d) => d.midnight)),
  'productive-day': (c, b) => c.peak('threads', b.criteria.target),
  multitasker: (c, b) => c.peak('maxParallel', b.criteria.target),
  'perfect-month': (c) => {
    const pm = perfectMonth(c.dates, c.today);
    return once(pm.date, pm.current, pm.target);
  },

  // 功能探索（这几项也看非活跃日，例如只有子代理或审查记录的日子）
  'multi-agent': (c) => once(c.firstAll((d) => d.spawn)),
  'plan-tracker': (c) => once(c.firstAll((d) => d.plan)),
  'deep-thinker': (c) => once(c.firstAll((d) => d.highEffort)),
  'full-auto': (c) => once(c.firstAll((d) => d.fullAuto)),
  reviewer: (c) => once(c.firstAll((d) => d.review)),
  'ide-buddy': (c) => once(c.firstAll((d) => d.vscode)),

  // 限定与彩蛋
  'programmers-day': (c) => c.on((date) => date.endsWith('-10-24')),
  anniversary: (c, { criteria: { target: years } }) => {
    const firstDay = [c.ledger.firstSeen, c.dates[0]].filter(Boolean).sort()[0];
    const anniv = firstDay ? addDays(firstDay, 365 * years) : null;
    return once(anniv && anniv <= c.today ? anniv : null);
  },
  'model-collector': (c, { criteria: { target: t } }) => {
    const { size, reached } = distinctOver(c.all, c.days, 'models', t);
    return once(reached, Math.min(size, t), t);
  },
  compactor: (c, { criteria: { target: t } }) => {
    const s = cumulative(c.all, c.days, 'compactions');
    return once(s.reachedOn(t), Math.min(s.value, t), t);
  },
  'new-year': (c) => c.on(holidays['new-year']),
  'spring-festival': (c) => c.on(holidays['spring-festival']),
  'tool-birthday': (c) => c.on(holidays.birthday(brand.launchDate)),
  christmas: (c) => c.on(holidays.christmas),
};
```

`context` 额外提供 `all` 和 `firstAll: (pred) => firstDate(all, days, pred)`；`maxOf` 用 `days[d][field] ?? 0`（原 marathon 没有 `?? 0`，缺字段时会得到 NaN，这里顺带修掉；基准对比会证明真实数据结果不变）。`computeProgress` 与 Claude Code 版相同，报错信息里的路径换成 `src/data/codex-metrics.js`。

把 `computeCodexProgress` 改名为 `computeProgress`，`grep -rn computeCodexProgress src tests scripts bin` 找到全部调用方一起改。

- [ ] **Step 6: 徽章配置的 criteria**

对 `src/brands/**/*.js` 中每枚徽章：
- 分级徽章（有 `tiers`）：删除整行 `criteria: { metric: … },`。
- 一次性徽章：`criteria: { metric: '…', target: N }` → `criteria: { target: N }`。
- `marathon`（两个品牌）：`criteria: { target: 4, unit: 'h' }`。
- `perfect-month`（两个品牌）：`criteria: { target: 22, dynamic: true }`。
- `src/brands/codex/feature-frame.js`：`featureBadge({ …, metric, target, … })` 去掉 `metric` 参数，`criteria: { target }`；调用方去掉 `metric:` 实参。
- `src/brands/claude-code/app-icon.js`：确认只是透传 `criteria`，调用方的 `criteria` 同样去掉 `metric`。
- `src/project/logo.js:44`：`criteria: { target: 1 }`。

可以用一次性的 Node 脚本做机械替换（不要提交脚本），改完 `grep -rn "metric" src/brands src/project` 应为空。

- [ ] **Step 7: 校验器**

`src/engine/validate.js`：
- 60 行（分级徽章逐级校验）：改为 `validateBadge({ ...plain, criteria: { target: tiers[0].threshold } }, brand);`
- 78 行替换为：

```js
  const extra = Object.keys(config.criteria ?? {}).filter((k) => !['target', 'unit', 'dynamic'].includes(k));
  if (extra.length) fail(`criteria 只能有 target、unit、dynamic，多了 ${extra.join('、')}`);
  if (!(config.criteria?.target > 0)) fail('criteria 需要大于 0 的 target');
```

同时在分级徽章分支开头（校验 tiers 之前）加：`if (config.criteria) fail('分级徽章的门槛写在 tiers 里，不写 criteria');`

测试里的旧形状：`tests/progress.test.js:45` 删 `criteria`，`:98` 改 `criteria: { target: 5 }`；`tests/tiers.test.js:14` 删 `criteria`，`:120` 改 `criteria: { target: 1 }`。`tests/validate.test.js` 若有断言旧报错文案（`criteria 需要 metric`），改成新文案，并加一条：`criteria: { metric: 'x', target: 1 }` 应报「criteria 只能有 target、unit、dynamic」。

- [ ] **Step 8: 运行测试**

Run: `cd $R && npm test`
Expected: 全部 PASS。若「说明里写的是配置的门槛」失败，说明文案用的不是阿拉伯数字或数字不一致：改文案（中英都改），与 README 计数表保持一致，并在提交说明里列出改了哪几枚。

- [ ] **Step 9: 对照基准**

Run: 配置检查、统计检查（见「验证工具」）。
Expected: 统计 `same`。配置除 `criteria` 外一致；`criteria` 变化清单应恰好是：分级徽章 `{"metric":…}` → `undefined`；一次性徽章去掉 `metric`；marathon 多 `unit`；perfect-month 多 `dynamic`。逐条看一遍，不应有别的变化。

- [ ] **Step 10: Commit**

```bash
cd $R && git add -A src tests && git commit -m "refactor(data): rules keyed by badge id read targets from config; drop criteria.metric

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 命令行拆到 `src/cli/`

**Files:**
- Modify: `bin/agent-badges.mjs`（缩到约 15 行）
- Create: `src/cli/{i18n,paths,args,runtime,server,app,main}.js`、`src/cli/commands/{collect,open,card,shelf,profile,publish}.js`
- Modify: `package.json` `files`（加 `"src/cli/"`）
- Modify: `tests/cli.test.js:10`, `tests/shelf.test.js:4`, `tests/publish.test.js:8`, `tests/profile.test.js:3`, `tests/card.test.js:3`（改从 `../src/cli/args.js` 引 `parseArgs`）, `tests/plugin.test.js:70`（改读 `src/cli/args.js`）

**Interfaces:**
- Consumes: Task 1 的 `BRAND_IDS`。
- Produces: `src/cli/main.js` 导出 `main(argv = process.argv.slice(2))`；`src/cli/args.js` 导出 `parseArgs`、`HELP`、`THEMES = ['dark', 'light']`、`LANGS = ['en', 'zh']`；`bin/agent-badges.mjs` 继续导出 `parseArgs`（兼容）。

当前 `bin/agent-badges.mjs` 的分段（行号以 Task 1 之后的文件为准，先 `grep -n` 定位）：

| 现在的代码 | 搬到 |
| --- | --- |
| `process.emitWarning` 补丁 | 留在 `bin/agent-badges.mjs` |
| `ROOT`、`APP`、`pkg` | `src/cli/paths.js`（`ROOT` 由 `src/cli/` 往上两级算） |
| `lang`、`t(zh, en)` | `src/cli/i18n.js`，另导出 `detectLang(env)` 供测试 |
| `HELP`、`parseArgs` | `src/cli/args.js`（所有 `--flag` 字面量都在这里） |
| `checkRuntime` | `src/cli/runtime.js` |
| `openBrowser`、`serve` | `src/cli/server.js` |
| `appTemplate`、`appHtml`、`PROJECT_SITE`、`publicPage` | `src/cli/app.js` |
| `collectAndReport` | `src/cli/commands/collect.js` |
| `main` 里内联的 open / export 分支 | `src/cli/commands/open.js`（导出 `open(opts, data)`、`exportPage(opts, data)`） |
| `writeCard` | `src/cli/commands/card.js` |
| `SHELF_TIMEOUT`、`lightPath`、`shelfPicture`、`writeShelf` | `src/cli/commands/shelf.js` |
| `writeProfile` | `src/cli/commands/profile.js`，`'agent-badges-shelf.png'` 字面量改用 `collect/publish.js` 导出的 `SHELF_FILE`、`SHELF_LIGHT_FILE` |
| `PUBLISH_STOPS`、`writePublish` | `src/cli/commands/publish.js` |
| `main` | `src/cli/main.js` |

- [ ] **Step 1: 搬代码**

按上表逐段原样搬运（只改 import 路径，不改逻辑）。规则：
- `src/cli/main.js` 用**字面量路径**动态加载命令：`await import('./commands/shelf.js')`，不要用模板字符串（`tests/package-files.test.js` 只认字面量）。
- 采集器保持懒加载：`args.js`、`main.js` 不静态引用 `src/collect/index.js`（Node 版本过低时要先显示 `checkRuntime` 的友好提示）。
- `src/cli/*` 负责终端输出和文案；`src/collect/*` 不加 `console` 和 `t()`。

`bin/agent-badges.mjs` 最终形如（保留原有的 `emitWarning` 补丁原文和 isMain 判断原文）：

```js
#!/usr/bin/env node
// agent-badges 命令行入口。实现都在 src/cli/。
// （此处保留原有的 process.emitWarning 补丁：屏蔽 node:sqlite 的实验性警告）
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { main } from '../src/cli/main.js';

export { parseArgs } from '../src/cli/args.js';

// （此处保留原有的 isMain 判断：被测试 import 时不运行）
```

- [ ] **Step 2: 包清单与测试引用**

- `package.json` `files` 在 `"src/collect/"` 前加 `"src/cli/"`。
- 五个测试文件改为 `import { parseArgs } from '../src/cli/args.js';`。
- `tests/plugin.test.js:70` 读取的文件改为 `src/cli/args.js`。

- [ ] **Step 3: 运行测试**

Run: `cd $R && npm test`
Expected: 全部 PASS（含 package-files、plugin、cli 端到端）。

- [ ] **Step 4: 对照基准与打包**

Run: 帮助输出检查；`node bin/agent-badges.mjs --brand gemini; echo exit=$?`；`npm run build && npm run check:pack && npm run check:shelf`。
Expected: 帮助 `same`；`--brand gemini` 报「Unsupported tool: gemini」且退出码非 0；pack、shelf 全部通过。

- [ ] **Step 5: Commit**

```bash
cd $R && git add -A bin src/cli tests package.json && git commit -m "refactor(cli): split the CLI into src/cli modules and commands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: viewer 公共件

**Files:**
- Create: `src/viewer/describe.js`, `src/viewer/mount-badge.js`, `src/viewer/snapshot.js`
- Modify: `src/viewer/grid.js:7,10`（删 `fmtDate`、`describeState`，改为引用）, `src/viewer/heatmap.js`, `src/viewer/profile.js`, `src/viewer/inspector.js:115`, `src/viewer/export.js`, `src/viewer/shelf.js:31,56`
- Modify: `src/main.js:23,168,181-189`, `src/site/main.js:93,210`, `src/project/studio.js:50`, `src/promo/main.js:101`
- Create: `src/data/brand-progress.js`（所有品牌的进度加载，`viewer/shelf.js` 和 `main.js` 共用）

**Interfaces:**
- Produces:
  - `src/viewer/describe.js`：`fmtDate(date, lang)`、`describeState(config, state, lang)`（从 `grid.js` 原样搬来）。
  - `src/viewer/mount-badge.js`：`mountBadge(config, state, { lang, ... }) → { badge, pivot, holder }`，参数以 6 处重复代码的公共部分为准。
  - `src/viewer/snapshot.js`：`renderBadgePNG`（从 `export.js` 搬来）；`export.js` 只留下载相关并从 `snapshot.js` 再导出 `renderBadgePNG` 以兼容。
  - `src/data/brand-progress.js`：`loadAllProgress({ forceMock, only }) → [{ brand, badges, series, progress, daily, local }]`，以 `main.js:181-189` 与 `viewer/shelf.js:31` 的公共部分为准。

- [ ] **Step 1: 先读后抽**

逐个读 `grep -rn "new Group\|pivot\|holder" src/main.js src/viewer/shelf.js src/site/main.js src/project/studio.js src/promo/main.js` 定位 6 处「把徽章装进 pivot/holder」，确认公共部分后写 `mountBadge`；只抽完全相同的部分，差异作为参数，不改变任何一处的行为。`describeState`、`fmtDate` 原样搬到 `describe.js`，所有调用方改引用。

- [ ] **Step 2: 去掉检视器的死代码**

`src/viewer/inspector.js:115` 遍历 `items` 的循环：`createInspector` 永远收到 `[]`（`src/main.js` 调用处），删除这段循环和 `items` 参数，调用方同步去掉。

- [ ] **Step 3: 运行测试与浏览器检查**

Run: `cd $R && npm test && npm run build`，然后截图检查，再 `npm run build:site && npm run check:site`。
Expected: 测试通过；`44/44 通过`；截图只有两张已知噪声不一致；site 检查通过。

- [ ] **Step 4: Commit**

```bash
cd $R && git add -A src && git commit -m "refactor(viewer): shared describe, mount-badge, snapshot and all-brand progress loading

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 页面主程序拆到 `src/app/`

**Files:**
- Create: `src/app/{context,preview,brand-select,topbar,load,badges,overview,wall,thumbnails,modal,poster,shelf,inspect,export-panel,loop,automation}.js`
- Modify: `src/main.js`（缩到约 60 行）

**Interfaces:**
- Consumes: Task 4 的 `mountBadge`、`describeState`、`fmtDate`、`loadAllProgress`。
- Produces（各模块）：
  - `context.js`：`createContext()` → `{ params, lang, PUBLIC, forceMock, available, brand, configs, series, task, items, progress, stage, tweens, accum, ensureBuilt, $, on(event, fn), emit(event, ...args) }`；事件 `'open' | 'close' | 'poster' | 'shelf'`。
  - `preview.js`：`applyPreview(configs, progress, { preview, tier })`（纯函数）。
  - `brand-select.js`：`selectBrand(params, data)`。
  - `topbar.js`：`mountTopbar(ctx, source)`。
  - `load.js`：`loadAll(ctx)` → `{ valid, progress, heatSeries, markers, currentDaily, notices }`。
  - `badges.js`：`createItems(ctx, valid, progress)`。
  - `overview.js`：`mount(ctx)` → `{ profile, heatmap }`。
  - `wall.js`：`mount(ctx)` → `{ grid, setFilter }`。
  - `thumbnails.js`：`renderThumbnails(ctx, { grid, profile, inspect })` → Promise。
  - `modal.js`：`createModal(el, closeBtn)` → `{ open(), close(), isOpen }`（打开关闭、Esc、遮罩点击、焦点恢复）。
  - `poster.js`：`mount(ctx, { thumbsDone, profile, heatmap, heatSeries, markers })` → `{ open, get url }`。
  - `shelf.js`：`mount(ctx)` → `{ open, get url }`（含 `?task=shelf` 握手）。
  - `inspect.js`：`mount(ctx, { exportPanel, loop })` → `{ open, close, get current }`。
  - `export-panel.js`：`mount(ctx, inspector)` → `{ set(open), isOpen, place(), exportCurrent }`。
  - `loop.js`：`createLoop(ctx, inspector)` → `{ start, stop }`。
  - `automation.js`：`expose(ctx, parts)` 设置 `window.__badgeApp`。

`src/main.js` 现状分段（行号以 Task 4 之后为准）：

| 段落 | 去向 |
| --- | --- |
| `$`、`fmtDate`、`showNotice`、`fatal` | `context.js`（`fmtDate` 已在 Task 4 移走） |
| `applyPreview` | `preview.js` |
| `params`、`PUBLIC`、`LOCAL`、`AVAILABLE`、`brand`/`badgeConfigs`/`SERIES` | `context.js` + `brand-select.js` |
| 品牌标签、语言切换、来源标签 | `topbar.js` |
| 校验、`loadProgress`、提示、全品牌加载 | `load.js` |
| `stage`、`accum`、`tweens`、`items`、`ensureBuilt` | `context.js` + `badges.js` |
| 资料卡与热力图 | `overview.js` |
| 网格与筛选 | `wall.js` |
| 海报 | `poster.js` + `modal.js` |
| 陈列图与握手 | `shelf.js` + `modal.js` |
| `renderThumbnails` | `thumbnails.js` |
| 检视器、键盘与缩放 | `inspect.js` |
| 导出面板 | `export-panel.js` |
| 渲染循环 | `loop.js` |
| `window.__badgeApp`、按 hash 打开、按任务打开 | `automation.js` + `main.js` |

- [ ] **Step 1: 记下接口清单**

开发服务器打开 `http://localhost:5199/?source=mock`，在 playwright 或浏览器控制台记录 `Object.keys(window.__badgeApp).sort()`，应为 `close, exportPNG, face, heatmap, hold, ids, open, openPoster, openShelf, posterURL, ready, setAngle, setFilter, shelfURL, spin`，其中 `posterURL`、`shelfURL` 是 getter。

- [ ] **Step 2: 拆分**

按表逐段搬运，面板之间只通过 `ctx.emit` / `ctx.on` 通信，不互相 import。必须保持：
1. 先创建 `thumbsDone` 再挂载海报；按 hash 打开、按任务打开陈列图放在 `__badgeApp` 设置之后；缩略图完成后才把 `ready` 设为 true。
2. 三个 `window` `keydown` 监听（海报、陈列图、检视器）和一个 `document` `pointerdown` 监听：数量和注册顺序不变。
3. 陈列图握手：`shelfBusy ??=` 只执行一次；`params.get('brand')` 覆盖 `only`；总是带上 dark 主题；后台标签页也能完成。
4. 公开页隐藏 `[data-shelf]`。

- [ ] **Step 3: 验证**

Run: `cd $R && npm test && npm run build`；截图检查；`npm run check:shelf`；`npm run build:site && npm run check:site`；再次记录 `Object.keys(window.__badgeApp).sort()` 并与 Step 1 对比。
Expected: 全部通过；截图只有两张已知噪声；接口清单相同。

- [ ] **Step 4: Commit**

```bash
cd $R && git add -A src && git commit -m "refactor(app): split the wall page into panel modules under src/app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 样式表按组件拆分

**Files:**
- Create: `src/styles/{tokens,controls,topbar,profile,heatmap,wall,inspector,export,modal,notice,responsive}.css`
- Modify: `src/style.css`（只剩有序的 `@import`）

- [ ] **Step 1: 拆分**

`src/style.css` 改为：

```css
/* 样式入口：按组件拆在 src/styles/，顺序即层叠顺序，不要随意调换。 */
@import './styles/tokens.css';
@import './styles/controls.css';
@import './styles/topbar.css';
@import './styles/profile.css';
@import './styles/heatmap.css';
@import './styles/wall.css';
@import './styles/inspector.css';
@import './styles/export.css';
@import './styles/modal.css';
@import './styles/notice.css';
@import './styles/responsive.css';
```

归属：`:root`、重置、`body`、`#stage-accum` → tokens；`.btn`、`.seg`、`.swatch`、`.section-title`、`.dot`、`[data-metal]` → controls；顶栏、语言切换、来源链接（原文件末尾 1522–1546 行）→ topbar；资料卡 → profile；热力图（含原 1517 行的 `.heat-tip-brand`）→ heatmap；徽章格子与墙顶栏 → wall；遮罩、舞台、信息栏、等级阶梯、进度条 → inspector；导出面板 → export；弹窗、海报、陈列图 → modal；提示 → notice；所有媒体查询 → responsive（保持原顺序）。

删除无用样式：先 `grep -rn "labels\|\.label\b\|tally\|is-hover" src index.html landing.html studio.html promo.html` 确认 `.labels`、`.label*`、`.tally`、`.is-hover` 没有被任何 JS/HTML 用到，再删。

合并重复规则 `.heat`、`.heat-grid`、`.ring-fill`、`#stage-accum`、`.modal-foot`：合并时后出现的声明覆盖先出现的同名属性，保证层叠结果相同。

- [ ] **Step 2: 验证**

Run: `cd $R && npm run build`；截图检查；`npm run build:site && npm run check:site`。
Expected: 构建产物里的 CSS 已内联（`grep -c "@import" dist/index.html` 为 0）；截图只有两张已知噪声；site 检查通过。

- [ ] **Step 3: Commit**

```bash
cd $R && git add -A src && git commit -m "refactor(styles): split style.css by component, drop dead rules, merge duplicates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 根目录整理与过时文字

**Files:**
- Move: `studio.html` → `tools/studio.html`，`promo.html` → `tools/promo.html`，`src/promo/` → `tools/promo/`
- Modify: `scripts/assets.mjs:23`, `scripts/promo.mjs:36`, `scripts/promo-audio.mjs:6`, `tools/promo/*.js` 的 `../` 引用, `tools/promo.html` 的 script 路径
- Modify: `src/site/strings.js`（约 17、61 行）, `src/collect/codex.js` 文件头
- Modify: `tests/contracts.test.js`（展示列表测试已兼容 `tools/`，确认通过）

- [ ] **Step 1: 移动**

```bash
cd $R && mkdir -p tools && git mv studio.html tools/studio.html && git mv promo.html tools/promo.html && git mv src/promo tools/promo
```

修路径：
- `tools/promo/*.js` 里的 `../brands/…`、`../engine/…` 等改成 `../../src/…`；
- `tools/promo.html` 里引用 `/src/promo/main.js` 改为 `/tools/promo/main.js`（其余 `/src/...` 绝对路径不变）；
- `scripts/assets.mjs:23` 打开的页面改为 `/tools/studio.html`；`scripts/promo.mjs:36` 改为 `/tools/promo.html`；`scripts/promo-audio.mjs:6` 的路径同步。
- 用 `grep -rn "studio.html\|promo.html\|src/promo" --exclude-dir=node_modules --exclude-dir=.git .` 确认没有遗漏（README 的引用留到 Task 8）。

- [ ] **Step 2: 过时文字**

- `src/site/strings.js`：中文「铜到白金」、英文「bronze to platinum」改为符合四级加顶级三款的说法，例如「铜、银、金，最高一级随机解锁三款顶级设计之一」/「bronze, silver, gold, and one of three top-tier designs at the top」（以句子上下文为准，中英意思一致）。
- `src/main.js`（或 Task 5 后 `src/app/preview.js`）里 `tier=0..3` 的注释改为「tier=等级下标（0 起）」。
- `src/collect/codex.js` 文件头的数据来源列表补上 `archived_sessions`。

- [ ] **Step 3: 验证**

Run: `cd $R && npm test`；开发服务器下 `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5199/tools/studio.html` 为 200；`node scripts/assets.mjs --help 2>&1 | head -3`（只确认脚本能启动；不重新生成素材）；`npm run build:site && npm run check:site`。
Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
cd $R && git add -A && git commit -m "chore: move dev-only pages to tools/, fix stale tier wording

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: AGENTS.md、CLAUDE.md、CONTRIBUTING.md、README 重排

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `tests/docs.test.js`
- Modify: `README.md`, `README.zh-CN.md`
- Modify: `src/brands/index.js` 注释（已在 Task 1 指向 CONTRIBUTING，确认）

**Interfaces:**
- Consumes: 前面所有任务的最终目录结构和测试文件名。

- [ ] **Step 1: 写文档同步测试**

新建 `tests/docs.test.js`：

```js
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANDS } from '../src/brands/index.js';

// 文档和代码是一个整体：文档里写到的测试、目录、数字都要和仓库实际情况一致。

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const srcDirs = () => readdirSync(join(root, 'src')).filter((d) => statSync(join(root, 'src', d)).isDirectory()).sort();

describe('AGENTS.md', () => {
  it('每条契约引用的测试文件都存在', () => {
    const refs = [...read('AGENTS.md').matchAll(/`(tests\/[\w./-]+\.test\.js)`/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(5);
    expect(refs.filter((f) => !existsSync(join(root, f)))).toEqual([]);
  });

  it('地图列出了 src/ 下的每个目录，且没有多余的', () => {
    const listed = [...read('AGENTS.md').matchAll(/^\|\s*`src\/([\w-]+)\/`/gm)].map((m) => m[1]).sort();
    expect(listed).toEqual(srcDirs());
  });

  it('CLAUDE.md 引入 AGENTS.md', () => {
    expect(read('CLAUDE.md')).toMatch(/^@AGENTS\.md/m);
  });
});

describe('CONTRIBUTING.md', () => {
  it('目录树列出了 src/ 下的每个目录', () => {
    const tree = read('CONTRIBUTING.md');
    for (const d of srcDirs()) expect(tree, d).toMatch(new RegExp(`[├└]─ ${d}/`));
  });

  it('「Adding a tool」列出了每一张按工具 id 索引的表', () => {
    const section = read('CONTRIBUTING.md').split(/^### Adding a tool/m)[1]?.split(/^##/m)[0] ?? '';
    for (const place of ['src/brands/index.js', 'src/collect/index.js', 'src/data/progress.js', 'src/data/mock-', 'src/data/', 'launchDate', 'TURNS_FIELD']) {
      expect(section, place).toContain(place);
    }
  });
});

describe('README', () => {
  const total = BRANDS.reduce((n, e) => n + e.badges.length, 0);

  for (const file of ['README.md', 'README.zh-CN.md']) {
    it(`${file}：徽章数量和代码一致`, () => {
      const text = read(file);
      expect(text).toContain(String(total));
      for (const { brand, badges } of BRANDS) expect(text, brand.id).toContain(String(badges.length));
    });

    it(`${file}：工具生日的日期和配置一致`, () => {
      const text = read(file);
      for (const { brand } of BRANDS) {
        const [, m, d] = brand.launchDate.split('-').map(Number);
        const en = new Date(2000, m - 1, d).toLocaleString('en-US', { month: 'long', day: 'numeric' });
        expect(file.includes('zh') ? text.includes(`${m} 月 ${d} 日`) || text.includes(`${m}月${d}日`) : text.includes(en), brand.id).toBe(true);
      }
    });

    it(`${file}：开发内容已移到 CONTRIBUTING`, () => {
      expect(read(file)).not.toMatch(/^### Adding a badge|^### 新增一枚徽章/m);
      expect(read(file)).toContain('CONTRIBUTING.md');
    });
  }
});
```

Run: `cd $R && npx vitest run tests/docs.test.js` → Expected: FAIL（文档还不存在）。

- [ ] **Step 2: 写 AGENTS.md（英文，≤ 150 行）**

结构固定为以下 6 节，内容依据仓库实际情况填写（不是照抄这里的示例行）：

```markdown
# AGENTS.md

agent-badges turns local Claude Code and Codex usage metadata into 3D achievement badges. Offline; nothing is uploaded.

## Commands
| Command | What it checks |
| `npm test` | unit, contract and docs tests |
| … build, check:pack, check:shelf, check:browser (needs `npx vite --port 5199`), build:site + check:site |

## Map
| Path | Owns | May import |
| `src/engine/` | shapes, materials, relief, text, tiers rendering (three.js) | engine |
| `src/brands/` | … | brands |
| … one row per directory under src/, plus bin/, tools/, scripts/, skills/, .agents/skills/ |

## Contracts
1. One tool list: `src/brands/index.js`. Every per-tool table derives from it or is checked against it — `tests/contracts.test.js`
2. Badge thresholds live only in the badge config (`criteria.target` / `tiers`); rules in `src/data/<tool>-metrics.js` `RULES` read them — `tests/contracts.test.js`
3. Layering follows the Map table — `tests/contracts.test.js`
4. The CLI loads only files listed in `package.json` `files`, and no three.js — `tests/package-files.test.js`
5. Badge design principles (inside follows outside, breathing room, calm outlines) — `tests/layout.test.js`
6. Every badge config validates — `tests/validate.test.js` / `tests/badge.test.js`
7. Collected data contains only counts, dates and hashes — leak tests in `tests/claude-code-metrics.test.js`, `tests/codex-metrics.test.js`
8. Docs match the code — `tests/docs.test.js`
(按实际测试文件名核对，每条都要有真实存在的测试)

## Workflows
- Add a badge: use the `add-badge` skill (`.agents/skills/add-badge/SKILL.md`).
- Add a tool: see CONTRIBUTING.md › Adding a tool.
- Release: bump version in package.json, package-lock.json, plugin.json, .claude-plugin/plugin.json; commit `release: X.Y.Z`; tag `vX.Y.Z`; push. GitHub Actions publishes to npm. Never run `npm publish` by hand.
- Which checks to run for which change (table).

## Data boundary
Reads only tool names, event types, timestamps and usage counts. Never reads conversation text, command arguments, file paths or file contents. Never opens: (list the credential/history files from Global Constraints).

## House rules
- Code comments and test names are in Chinese; README has English and Chinese versions; AGENTS.md, CONTRIBUTING.md and skills are English only.
- Commit at each verified milestone. Never commit videos (promo output stays in promo-out/).
```

`CLAUDE.md` 内容只有一行：`@AGENTS.md`。

- [ ] **Step 3: 写 CONTRIBUTING.md（英文）**

承接 README 现有「Development」「Adding a badge」「Adding a tool」三节并更新为新结构：
- `## Setup and commands`（npm 命令表、浏览器检查前提、页面 URL 参数）
- `## Project layout`（目录树，`src/` 下每个目录一行，用 `├─ name/` 格式；加上 `tools/`、`bin/`、`skills/`、`.agents/skills/`）
- `## Adding a badge`（5 行摘要：badge file → series index → rule in RULES → mock entry → checks；指向 skill）
- `### Adding a tool`（逐项列出：`src/brands/<id>/`（含 `brand.js` 的 `launchDate`）、`src/brands/index.js`、`src/collect/<id>.js`（导出 `BRAND_ID`、`TURNS_FIELD`、`collect()`）、`src/collect/index.js`、`src/data/<id>-metrics.js`（`RULES`、`computeProgress`）、`src/data/mock-<id>.js`（`BRAND_ID`、`MOCK_DAILY`）、`src/data/progress.js`、leak test）
- `## Design principles`（四条，与 `tests/layout.test.js` 一致）
- `## Before you open a pull request`（检查清单）

- [ ] **Step 4: README 重排（中英两份同步）**

新顺序：What you get → Privacy（三句话：只读元数据；不读对话、参数、路径和凭证；不上传）→ Install（原 Ask your agent / Install / How it works / JSON output）→ Quick start → Show it on your GitHub profile → How badges are counted → Contributing（一行：`See [CONTRIBUTING.md](CONTRIBUTING.md).`）→ Credits → Disclaimer → License。原「Privacy」长节保留在原位置之后的内容并入新 Privacy 节或 How badges are counted，不丢信息。删除 Development、Adding a badge、Adding a tool 三节（已在 CONTRIBUTING）。中文版对应调整，标题用中文。

- [ ] **Step 5: 运行测试**

Run: `cd $R && npm test`
Expected: 全部 PASS（含 `tests/docs.test.js`）。

- [ ] **Step 6: Commit**

```bash
cd $R && git add -A AGENTS.md CLAUDE.md CONTRIBUTING.md README.md README.zh-CN.md tests/docs.test.js src && git commit -m "docs: AGENTS.md, CONTRIBUTING.md, README reordered for users; docs sync tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: `add-badge` skill

**Files:**
- Create: `.agents/skills/add-badge/SKILL.md`, `.agents/skills/add-badge/references/template.js`, `.agents/skills/add-badge/references/parts.md`, `.agents/skills/add-badge/references/design-principles.md`
- Create: `.claude/skills/add-badge` → `../../.agents/skills/add-badge`（相对软链接）
- Modify: `tests/docs.test.js`（追加 skill 检查）

- [ ] **Step 1: 追加测试**

在 `tests/docs.test.js` 末尾追加：

```js
import { lstatSync, readlinkSync, realpathSync } from 'node:fs';

describe('add-badge skill', () => {
  const dir = '.agents/skills/add-badge';

  it('Claude Code 的入口是指向正本的相对软链接', () => {
    const link = join(root, '.claude/skills/add-badge');
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe('../../.agents/skills/add-badge');
    expect(realpathSync(link)).toBe(realpathSync(join(root, dir)));
  });

  it('SKILL.md 有 name 和 description，提到的仓库路径都存在', () => {
    const skill = read(`${dir}/SKILL.md`);
    expect(skill).toMatch(/^---\nname: add-badge\ndescription: .+\n---/);
    const paths = [...skill.matchAll(/`((?:src|tests|scripts|references)\/[\w./<>-]+)`/g)].map((m) => m[1]).filter((p) => !p.includes('<'));
    expect(paths.length).toBeGreaterThan(5);
    expect(paths.filter((p) => !existsSync(join(root, p.startsWith('references/') ? `${dir}/${p}` : p)))).toEqual([]);
  });

  it('模板是一枚能通过校验的徽章', async () => {
    // 模板放在 skill 目录里，引用路径按「复制到 src/brands/claude-code/habits/ 之后」写；这里只检查它语法正确、导出默认配置
    const src = read(`${dir}/references/template.js`);
    expect(src).toMatch(/export default/);
    expect(src).toMatch(/criteria: \{ target: \d+ \}/);
  });

  it('不进 npm 包，也不进插件', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.files.some((f) => f.startsWith('.agents') || f.startsWith('.claude'))).toBe(false);
    expect(existsSync(join(root, 'skills/add-badge'))).toBe(false);
  });
});
```

Run: `cd $R && npx vitest run tests/docs.test.js` → Expected: FAIL（skill 不存在）。

- [ ] **Step 2: 写 SKILL.md（英文）**

```markdown
---
name: add-badge
description: Use when adding or redesigning a badge in the agent-badges repo — a new achievement for Claude Code or Codex, a new tier, or a new holiday/limited badge. Walks through data, config, rule, copy, design review and checks.
---

# Add a badge

A badge is one config file plus one rule. Follow the steps in order; do not skip the design review.

## 1. Pick the series and id
(series dirs under `src/brands/<tool>/`; ids are kebab-case and unique per tool — grep before choosing)

## 2. Check the data exists and is allowed
(signal must already be in the daily ledger, or added to the collector with a leak test; never conversation text, arguments, paths, credentials)

## 3. Write the badge file
(copy `references/template.js` to `src/brands/<tool>/<series>/<id>.js`; use `medal()` from the tool's `medal.js` and parts from `src/brands/shared/parts.js`; see `references/parts.md`)

## 4. Register it in the series
(`src/brands/<tool>/<series>/index.js` — the order there is the order on the wall)

## 5. Add the rule
(`RULES` in `src/data/claude-code-metrics.js` or `src/data/codex-metrics.js`; read the threshold from `badge.criteria.target` or `badge.tiers`, never a number literal; a counted one-time badge also needs a fixture in `tests/contracts.test.js`)

## 6. Add sample data
(`src/data/mock-claude-code.js` / `src/data/mock-codex.js`)

## 7. Write the copy
(Chinese `title`/`description`, English `titleEn`/`en`; the threshold number appears in both descriptions; update the counting table in both READMEs)

## 8. Design review
(principles in `references/design-principles.md`; preview at `http://localhost:5199/?preview=unlocked#<id>`; screenshot with `node scripts/peek.mjs …`; show the human and iterate until approved)

## 9. Checks
(`npm test`, `npm run build`, `npm run check:browser`)
```

每节括号里的提示换成完整、可执行的英文说明，路径与仓库一致；第 8 步写明 0.5.0 评审得出的教训（圆环与花瓣重叠、圆弧和尖角混用、描边贴边），并链接 `references/design-principles.md`。

- [ ] **Step 3: 写 references**

- `references/template.js`：以 `src/brands/claude-code/habits/productive-day.js` 为蓝本的完整徽章文件（含 import、配置、`en`、`criteria: { target: 20 }`、`medal({...})`），每个字段一行注释说明。
- `references/parts.md`：形状（circle、polygon ≤ 8 边、starburst、flower、shield、gear）、材质、浮雕类型（含 `contour`）、`shared/parts.js` 的每个零件一行说明、坐标与色板约定、分级与 `withTopTier`/`topTierFromLast`。以代码里的注册表为准（`src/engine/registry.js`、`src/brands/shared/parts.js`）。
- `references/design-principles.md`：四条原则，每条附「做 / 不做」各一例，引用 `tests/layout.test.js` 的检查项。

- [ ] **Step 4: 软链接**

```bash
cd $R && mkdir -p .claude/skills && ln -s ../../.agents/skills/add-badge .claude/skills/add-badge && ls -l .claude/skills
```

- [ ] **Step 5: 运行测试与总检**

Run: `cd $R && npm test && npm run build && npm run check:pack && npm run check:shelf`；截图检查。
Expected: 全部通过。

- [ ] **Step 6: Commit**

```bash
cd $R && git add -A .agents/skills .claude/skills tests/docs.test.js && git commit -m "feat: add-badge skill for contributors (Codex and Claude Code)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
