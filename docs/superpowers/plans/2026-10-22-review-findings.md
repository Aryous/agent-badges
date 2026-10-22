# 架构审查问题修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按设计文档 `docs/superpowers/specs/2026-10-22-review-findings-design.md` 修掉独立架构审查确认的 8 类问题，除两处有意的变化外，外观、统计结果和命令行行为都不变。

**Architecture:** 8 个任务按顺序执行，每个任务自带验证：

1. 宣传片移出版本控制；
2. 命名整理：拆出 `src/share/`，改名 `page.js`、`display-states.js`，studio 搬到 `tools/studio/`，删除 `titleEn`；
3. 哈希说明和文档漂移；
4. 两个工具的统计模块去重；
5. 大数字格式统一为 K/M/B；
6. 账本和缓存的安全写入；
7. 背面刻字推迟到打开时生成；
8. 浏览器检查进入 CI。

页面外观由逐像素视觉回归守护，统计结果由固定账本算出的进度基线守护。

**Tech Stack:** 原生 ES modules，three.js 0.186，Vite 8，Vitest 5，Node ≥ 22.15，playwright-core 加本机 Google Chrome。

## Global Constraints

- 仓库：`/Users/lucas/Documents/Code/agent-badges`，分支 `fix/review-findings`（从 `refactor/badge-renderer` 建出）。所有命令都在仓库根目录运行。
- 不推送、不发版、不改写 git 历史。第 8 节需要推送分支来验证 CI，那一步由主控先征得用户同意，实现子代理不推送。
- 不读取任何凭证或历史文件：`~/.claude/settings.json`、`~/.claude/.credentials.json`、`~/.claude/history.jsonl`、`~/.codex/auth.json`、`~/.codex/config.toml`、`~/.codex/*.env`、`~/.codex/history.jsonl`、CC Switch 数据库。测试一律用临时目录里伪造的数据。
- 不提交视频或音频。宣传片输出留在 `promo-out/`（已被忽略）。
- 只有两处有意的变化，其余外观、统计结果、命令行输出都不变：
  - 大数字统一显示为 K/M/B（任务 5）；
  - 两枚程序员节徽章（两个工具各一枚）的背面刻字和英文副标题从 `PROGRAMMERS DAY` 变为 `PROGRAMMERS' DAY`（任务 2）。
- 代码注释和测试名用中文；AGENTS.md、CONTRIBUTING.md、技能文档只用英文；README 中英两份同步改。AGENTS.md 不超过 150 行（`tests/docs.test.js` 检查）。
- 文档和代码是一回事：凡是 AGENTS.md、CONTRIBUTING.md、两份 README、`.agents/skills/add-badge/` 提到被改动内容的地方，在同一个任务里改完。
- 搬动文件一律用 `git mv`。从任务 1 起，约定测试只扫描被 git 跟踪的文件：新建的文件要先 `git add`，`npm test` 才看得到它。
- 每个任务结束时提交一次（里程碑提交已获授权），提交信息结尾加：

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

---

## 共用操作

以下操作在多个任务里用到，任务里直接引用这里的名字。

### 开发服务器

视觉回归和浏览器检查都需要开发服务器跑在 5199 端口。先看是否已在运行：

```bash
curl -sf http://localhost:5199/ > /dev/null && echo running || echo stopped
```

没有运行时，在仓库根目录用后台方式启动（Bash 工具的 `run_in_background`）：

```bash
npx vite --port 5199 --strictPort
```

### 视觉回归（拍图与比对）

拍图目录放在 `.superpowers/sdd/visual/` 下（该目录被 `.superpowers/sdd/.gitignore` 忽略）。目录必须是新的空目录，否则脚本拒绝。

- **改动前拍图**：在动手改代码之前、工作区干净时运行：

  ```bash
  node scripts/visual.mjs capture .superpowers/sdd/visual/task-N-before
  ```

- **改动后拍图并比对**：

  ```bash
  node scripts/visual.mjs capture .superpowers/sdd/visual/task-N-after
  node scripts/visual.mjs compare .superpowers/sdd/visual/task-N-before .superpowers/sdd/visual/task-N-after
  ```

- 期望输出：`279 张全部一致`（任务 1 之后的总数，任务 7 之后会再增加背面截图）。
- 示例数据的日期跟着当天走，改动前后必须在同一天拍。
- 出现任何差异，都要在任务报告里逐张列出文件名和原因。只有任务说明里写明「预期」的差异才可以接受。

### 统计基线比对

改动前的统计基线已经存好：

- 基线：`/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/p2/progress-baseline.json`
- 计算方式：用固定的账本副本（同目录 `base/*.ledger.json`，只含数字、日期和哈希），按当前代码、以 2026-10-21 为今天算出两个工具的全部徽章进度。

比对命令：

```bash
S=/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/p2
node $S/dump-progress.mjs "$PWD" > .superpowers/sdd/progress-now.json
diff $S/progress-baseline.json .superpowers/sdd/progress-now.json && echo 统计结果一致
```

期望输出：`统计结果一致`，`diff` 没有任何输出。

### 每个任务结束前的检查

- `npx vitest run`：全部通过。
- 按 AGENTS.md「Which checks to run」表运行与改动相关的检查，每个任务的最后一步会列出具体命令。
- `git status --short`：只剩本任务有意改动的文件，没有遗留的临时文件。

---

## 文件结构

| 路径 | 任务 | 变化 |
| --- | --- | --- |
| `tools/promo.html`、`tools/promo/`、`scripts/promo.mjs`、`scripts/promo-audio.mjs` | 1 | 停止跟踪并加入 `.gitignore`，本地文件保留 |
| `src/brands/shared/showcase.js` → `src/brands/shared/display-states.js` | 1、2 | 删除 `filledState`；改名 |
| `tests/showcase.test.js` → `tests/display-states.test.js` | 1、2 | 删除 `filledState` 的测试；改名 |
| `scripts/visual.mjs` | 1、7、8 | 不再拍宣传片；新增背面截图；改用公共浏览器启动函数 |
| `tests/contracts.test.js` | 1、2 | 只扫描 git 跟踪的文件；新增 `share` 层 |
| `src/share/`（新目录） | 2 | 从 `src/collect/` 搬来 `card.js`、`public.js`、`inject.js`、`publish.js`、`receive.js` |
| `src/cli/summary.js` | 2、5 | 从 `src/collect/summary.js` 搬来；改用 `formatCount` |
| `src/cli/app.js` → `src/cli/page.js` | 2 | 改名 |
| `src/project/studio.js` → `tools/studio/main.js` | 2 | 搬家 |
| `src/brands/shared/text.js` | 2、3 | 新增 `upperTitle`；修正头部注释 |
| 62 个徽章文件、`app-icon.js`、`feature-frame.js`、`logo.js`、`validate.js`、`badge.js`、`inspect.js` | 2 | 删除 `titleEn` |
| `src/data/hash.js`、两个 `*-metrics.js`、`src/collect/codex.js`、`src/data/progress.js` | 3 | 注释如实；哈希参数必须传入 |
| `src/data/metrics-common.js` | 4 | 新增 `createComputeProgress`、导出 `IDLE_GAP_MS` |
| `src/data/format.js`（新） | 5 | `formatCount` |
| `src/collect/common.js`、`src/collect/claude-code.js`、`src/collect/codex.js`、`src/cli/commands/collect.js` | 6 | 安全写入、`.bak`、损坏文件的处理 |
| `tests/storage.test.js`（新） | 6 | 安全写入和三种损坏情形 |
| `src/engine/engraving.js`、`src/engine/badge.js`、`src/viewer/mount-badge.js`、`src/app/badges.js`、`src/app/inspect.js` | 7 | 占位刻字贴图，打开时生成、关闭时释放 |
| `scripts/browser.mjs`（新） | 8 | 公共的 Chrome 启动函数 |
| `.github/workflows/ci.yml` | 8 | 新增页面检查的任务 |

---

### Task 1: 宣传片移出版本控制

**背景**：宣传片的页面、逐帧录制脚本和配乐合成脚本在 2026-10-19 被加入仓库，本不该被跟踪。这一步停止跟踪，但保留本地文件和已公开的 git 历史。

**Files:**
- Modify: `.gitignore`
- Stop tracking (keep local): `tools/promo.html`, `tools/promo/`, `scripts/promo.mjs`, `scripts/promo-audio.mjs`
- Modify (local only, untracked afterwards): `tools/promo/main.js`
- Modify: `src/brands/shared/showcase.js`, `tests/showcase.test.js`, `scripts/visual.mjs`, `tests/contracts.test.js`, `AGENTS.md`, `CONTRIBUTING.md`

**Interfaces:**
- Consumes: 无。
- Produces:
  - `src/brands/shared/showcase.js` 只导出 `SHOWCASE_DATE`、`peakState(config)`、`surpriseKeptState(config, base)`（任务 2 把它改名为 `display-states.js`）。
  - `tests/contracts.test.js` 里的 `filesUnder(dir)` 只返回 git 跟踪的 `.js` / `.mjs` 文件，任务 2 在此基础上加 `share` 层。
  - `scripts/visual.mjs capture` 拍 279 张。

- [ ] **Step 1: 改动前拍图**

确认开发服务器在运行（见「共用操作 › 开发服务器」），然后：

```bash
node scripts/visual.mjs capture .superpowers/sdd/visual/task-1-before
```

Expected: 最后一行是 `303 张 → .superpowers/sdd/visual/task-1-before`。

- [ ] **Step 2: 停止跟踪宣传片，加入忽略列表**

```bash
git rm -r --cached tools/promo.html tools/promo scripts/promo.mjs scripts/promo-audio.mjs
```

在 `.gitignore` 末尾追加：

```
# 宣传片只在本机制作，不进仓库（输出在 promo-out/）
tools/promo.html
tools/promo/
scripts/promo.mjs
scripts/promo-audio.mjs
```

检查本地文件还在、git 不再跟踪：

```bash
ls tools/promo.html tools/promo/main.js scripts/promo.mjs scripts/promo-audio.mjs
git ls-files | grep -i promo
```

Expected: `ls` 列出四个路径；`git ls-files | grep -i promo` 没有输出。

- [ ] **Step 3: 宣传片改用自己的展示状态（本地文件）**

`tools/promo/main.js` 已不被跟踪，但要保持本机能打开。把第 8 行

```js
import { filledState } from '../../src/brands/shared/showcase.js';
```

替换为本地定义（规则与原 `filledState` 一字不差）：

```js
/** 宣传片里的获得日期。 */
const PROMO_DATE = '2026-05-02';

/** 指定等级（默认最高一级），进度按这一级的门槛填满。宣传片不放隐藏徽章，这里不处理。 */
function filledState(config, tier) {
  const t = config.tiers ? (tier ?? config.tiers.length - 1) : null;
  const value = config.tiers ? config.tiers[t].threshold : 1;
  return { unlocked: true, earnedAt: PROMO_DATE, tier: t, value, progress: { current: value, target: value } };
}
```

- [ ] **Step 4: 展示状态模块删除 `filledState`**

`src/brands/shared/showcase.js` 改为（删除 `PROMO_DATE`、`filledState`，头部注释只写两种状态）：

```js
// 展示用的徽章状态：不看真实进度，只是把徽章摆出来给人看。
// 两个地方的规则不同，各有名字，统一放在这里，调用处不要再手写一份：
//   peakState          落地页画廊和首屏：分级徽章看最高一级（顶级彩蛋取第 0 款），隐藏徽章保持神秘
//   surpriseKeptState  README 素材（tools/studio.html）：最高一级是随机彩蛋时展示它下面一级，留住惊喜

/** 落地页和素材上显示的获得日期。 */
export const SHOWCASE_DATE = '2026-10-24';

const topTier = (tiers) => tiers.length - 1;
```

文件其余部分（`peakState`、`surpriseKeptState`）保持原样。

`tests/showcase.test.js`：
- import 行改为 `import { SHOWCASE_DATE, peakState, surpriseKeptState } from '../src/brands/shared/showcase.js';`
- 第 5 行注释改为 `// 两套展示用状态，期望值照抄自原来 src/site/main.js、src/project/studio.js 里手写的规则`
- 删除整个 `describe('filledState（宣传片）', …)`。

- [ ] **Step 5: 视觉回归脚本不再拍宣传片**

`scripts/visual.mjs`：
- 第 5 行注释改为 `// 拍什么：studio 渲染的每枚徽章（正面、斜角；分级徽章另拍最高一级）、陈列墙缩略图、主页图、落地页画廊。`
- 删除 `// 宣传片的徽章墙` 这一段（从该注释行到 `await promo.close();`，共 6 行）。

- [ ] **Step 6: 约定测试只扫描 git 跟踪的文件**

`tests/contracts.test.js`：
- 第 2 行改为 `import { existsSync, readFileSync } from 'node:fs';`，并新增 `import { execFileSync } from 'node:child_process';`。
- 把 `function filesUnder(dir) { … }`（第 19–27 行）整段替换为：

```js
// 只看被 git 跟踪的文件：本机没提交的文件（例如宣传片）不影响结果，本机和 CI 看到的一样。
// 新建的文件要先 git add，这里才看得到；已删除但还没提交删除的文件跳过。
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && existsSync(join(root, f)));
const filesUnder = (dir) => tracked.filter((f) => f.startsWith(`${dir}/`) && /\.m?js$/.test(f));
```

`relative`、`resolve`、`dirname` 仍被其他地方使用，保留它们的 import；`readdirSync`、`statSync` 不再使用，从 import 里删掉。

- [ ] **Step 7: 运行测试**

```bash
npx vitest run
```

Expected: 全部通过（`showcase.test.js` 少了 4 个测试）。

- [ ] **Step 8: 同步文档**

AGENTS.md：
- Map 里 `tools/` 一行的说明改为 `Dev-only pages: \`studio.html\` (asset studio)`。
- Map 里 `scripts/` 一行的说明改为 `Build, check, screenshot and asset scripts (\`*.mjs\`, run by hand or npm scripts)`。
- 约定 3 改为：`3. Showcase lists (\`{ brand, id }\` in the site and \`scripts/\`) name badges that exist — \`tests/contracts.test.js\``
- 约定 18 的第二句改为：`The display states for the landing page and studio are \`peakState\` / \`surpriseKeptState\` in \`src/brands/shared/showcase.js\` (unrelated to the \`// showcase\` file marker in contract 2) — \`tests/showcase.test.js\``（括号里的解释由任务 2 删除）。
- House rules 里「Never commit videos: promo output stays in `promo-out/` (git-ignored).」保留不动。

CONTRIBUTING.md：
- 第 27 行括号里删去 `, promo wall`。
- 第 29 行末尾改为 `Dev-only page: \`/tools/studio.html\` (asset studio).`
- 目录树：`tools/        dev-only pages: studio.html`；`scripts/      build, check, screenshot and asset scripts`。
- 第 76 行改为 `│                 showcase.js (display states for the landing page and studio)`。
- 在「Setup and commands」代码块之后、「Browser checks」之前加一句：`Contract tests only look at files tracked by git, so \`git add\` new files before running \`npm test\`.`

```bash
grep -rn -i "promo" AGENTS.md CONTRIBUTING.md README.md README.zh-CN.md .agents skills package.json .github
```

Expected: 只剩 AGENTS.md House rules 里关于 `promo-out/` 的那一句。

- [ ] **Step 9: 改动后拍图并比对**

```bash
npx vitest run
node scripts/visual.mjs capture .superpowers/sdd/visual/task-1-after
node scripts/visual.mjs compare .superpowers/sdd/visual/task-1-before .superpowers/sdd/visual/task-1-after
```

Expected:
- capture 输出 `279 张`。
- compare 以退出码 1 结束，输出恰好 24 行 `缺少 promo--wall--00.png` 到 `缺少 promo--wall--23.png`，没有任何 `不同` 或 `多出` 行，最后一行 `24/303 张不同`。这 24 张是预期差异（宣传片不再拍），其余 279 张一致。

- [ ] **Step 10: 确认本机宣传片仍能打开**

```bash
node --input-type=module -e "
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:5199/tools/promo.html?aspect=16x9&lang=en');
await p.waitForFunction(() => window.__promo?.ready, null, { timeout: 180000 });
console.log('promo ready', errors);
await b.close();
"
```

Expected: `promo ready []`。

- [ ] **Step 11: 提交**

```bash
git add -A .gitignore src/brands/shared/showcase.js tests/showcase.test.js scripts/visual.mjs tests/contracts.test.js AGENTS.md CONTRIBUTING.md
git status --short
git commit -m "chore: stop tracking the promo; contract tests read only git-tracked files

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`git status --short` 在提交前应只显示上面这些文件和四个宣传片路径的删除（`D`）。提交后 `git status --short` 为空。

---

### Task 2: 命名整理

**背景**：放在第二步，让后续任务都在最终的名字上进行。

**Files:**
- Move: `src/collect/{card,public,inject,publish,receive}.js` → `src/share/`
- Move: `src/collect/summary.js` → `src/cli/summary.js`
- Move: `src/cli/app.js` → `src/cli/page.js`
- Move: `src/project/studio.js` → `tools/studio/main.js`
- Move: `src/brands/shared/showcase.js` → `src/brands/shared/display-states.js`
- Move: `tests/showcase.test.js` → `tests/display-states.test.js`
- Modify: 全部引用方（清单见 Step 3、Step 4）、`package.json`、`tests/contracts.test.js`、`tools/studio.html`
- Modify (`titleEn`): 62 个徽章文件、`src/brands/claude-code/app-icon.js`、`src/brands/codex/feature-frame.js`、`src/project/logo.js`、`src/brands/shared/text.js`、`src/engine/badge.js`、`src/engine/validate.js`、`src/app/inspect.js`、`tests/tiers.test.js`、`tests/text.test.js`
- Docs: `AGENTS.md`、`CONTRIBUTING.md`、`.agents/skills/add-badge/SKILL.md`、`.agents/skills/add-badge/references/parts.md`、`.agents/skills/add-badge/references/template.js`

**Interfaces:**
- Consumes: 任务 1 的 `filesUnder`（只看 git 跟踪的文件）。
- Produces:
  - 分层：`share` 只用 Node 内置模块，可以引用 `share`、`collect`、`data`、`brands`；`cli` 可以引用 `cli`、`share`、`collect`、`data`、`brands`。
  - `src/cli/summary.js` 导出 `BRAND_INFO`、`summarize`、`newUnlocks`、`formatSummary`（任务 5 修改其中的数字格式）。
  - `src/share/card.js` 导出 `formatTokens`、`renderCard`（任务 5 删除 `formatTokens`）。
  - `src/brands/shared/text.js` 新增 `upperTitle(config, tier = null)`：返回 `badgeTitle(config, 'en', tier).toUpperCase()`。
  - `src/brands/shared/display-states.js` 导出 `SHOWCASE_DATE`、`peakState`、`surpriseKeptState`。

- [ ] **Step 1: 改动前拍图、存下刻字文字**

先拍视觉基线：

```bash
node scripts/visual.mjs capture .superpowers/sdd/visual/task-2-before
```

Expected: `279 张`。

再写一个只在本机用的脚本，打印每枚徽章、每一级、每一款、中英文、解锁和未解锁时的背面刻字文字。新建 `.superpowers/sdd/engraving-lines.mjs`（该目录被忽略，不提交）：

```js
// 打印所有徽章背面刻字的文字，用于改动前后逐字比较。用法：node .superpowers/sdd/engraving-lines.mjs > 输出.json
import { BRANDS } from '../../src/brands/index.js';
import { resolveTier } from '../../src/engine/tiers.js';
import { logoBadge, logoBrand } from '../../src/project/logo.js';

const out = {};
const groups = [...BRANDS, { brand: logoBrand, badges: [logoBadge] }];
for (const { brand, badges } of groups) {
  for (const config of badges) {
    const tiers = config.tiers ?? [null];
    tiers.forEach((tier, i) => {
      const variants = tier?.variants?.length ?? 1;
      for (let v = 0; v < variants; v++) {
        const resolved = resolveTier(config, i, v);
        for (const lang of ['zh', 'en']) {
          for (const unlocked of [true, false]) {
            out[`${brand.id}/${config.id}/${i}/${v}/${lang}/${unlocked}`] = brand.engraving.lines({
              brandName: brand.name,
              config: resolved,
              lang,
              earnedAt: '2026.05.02',
              unlocked,
              progress: { current: 1, target: 2 },
              tier: resolved.tier,
              hidden: false,
            });
          }
        }
      }
    });
  }
}
console.log(JSON.stringify(out, null, 1));
```

```bash
node .superpowers/sdd/engraving-lines.mjs > .superpowers/sdd/engraving-before.json
```

Expected: 生成一个非空的 JSON 文件（几百个键）。

- [ ] **Step 2: 搬动文件**

```bash
mkdir -p src/share tools/studio
git mv src/collect/card.js src/collect/public.js src/collect/inject.js src/collect/publish.js src/collect/receive.js src/share/
git mv src/collect/summary.js src/cli/summary.js
git mv src/cli/app.js src/cli/page.js
git mv src/project/studio.js tools/studio/main.js
git mv src/brands/shared/showcase.js src/brands/shared/display-states.js
git mv tests/showcase.test.js tests/display-states.test.js
```

- [ ] **Step 3: 更新源码里的引用**

逐个修改下列 import（左边是文件，右边是旧路径 → 新路径）：

| 文件 | 改动 |
| --- | --- |
| `src/share/public.js` | `import { BRAND_INFO } from './summary.js';` → `import { brandById } from '../brands/index.js';`；`publicData` 里 `const info = BRAND_INFO[id];` → `const info = brandById(id);`（`brandById` 返回的对象同样有 `badges`，结果不变；`share` 不能引用 `cli`，所以不能再从 `summary.js` 取） |
| `src/cli/page.js` | `../collect/inject.js` → `../share/inject.js`（两处）；`../collect/public.js` → `../share/public.js` |
| `src/cli/commands/profile.js` | `../../collect/publish.js` → `../../share/publish.js`；`../app.js` → `../page.js`；`../../collect/public.js` → `../../share/public.js` |
| `src/cli/commands/shelf.js` | `../app.js` → `../page.js`；`../../collect/summary.js` → `../summary.js`；`../../collect/receive.js` → `../../share/receive.js` |
| `src/cli/commands/publish.js` | `../app.js` → `../page.js`；`../../collect/publish.js` → `../../share/publish.js` |
| `src/cli/commands/collect.js` | `../../collect/summary.js` → `../summary.js` |
| `src/cli/commands/card.js` | `../../collect/card.js` → `../../share/card.js`；`../../collect/summary.js` → `../summary.js` |
| `src/cli/commands/open.js` | `../app.js` → `../page.js` |
| `src/site/main.js` | `../brands/shared/showcase.js` → `../brands/shared/display-states.js` |
| `vite.config.js` | `./src/collect/inject.js` → `./src/share/inject.js` |
| `scripts/assets.mjs` | `../src/collect/card.js` → `../src/share/card.js`；`../src/collect/summary.js` → `../src/cli/summary.js` |
| `scripts/check-shelf.mjs` | `../src/collect/summary.js` → `../src/cli/summary.js` |
| `tools/studio.html` | `<script type="module" src="/src/project/studio.js">` → `src="/tools/studio/main.js"` |

`tools/studio/main.js` 的头部改为下面这样（import 路径多一层 `src/`，日期改成具名常量，注释里的路径同步）：

```js
// 徽章工作台（仅开发服务器）：window.__studio.render(...) 把一枚徽章渲染成 PNG data URL。
// scripts/assets.mjs 用它生成 README 横幅、动图帧和项目标志。
import { BRANDS, getBrand } from '../../src/brands/index.js';
import { surpriseKeptState } from '../../src/brands/shared/display-states.js';
import { normalizeProgress } from '../../src/data/normalize.js';
import { DATA_SOURCES } from '../../src/data/progress.js';
import { createStage } from '../../src/viewer/scene.js';
import { createBadgeRenderer } from '../../src/viewer/badge-renderer.js';
import { LOGO_STATE, logoBadge, logoBrand } from '../../src/project/logo.js';

/** 覆盖解锁状态或等级时，示例数据里没有获得日期就用这一天。 */
const OVERRIDE_DATE = '2026-05-02';
```

函数体里两处 `state.earnedAt ?? '2026-05-02'` 改为 `state.earnedAt ?? OVERRIDE_DATE`；注释 `（见 brands/shared/showcase.js）` 改为 `（见 src/brands/shared/display-states.js）`。

`src/brands/shared/display-states.js` 头部注释里的 `README 素材（tools/studio.html）` 保持不变。

- [ ] **Step 4: 更新测试里的引用**

| 文件 | 改动 |
| --- | --- |
| `tests/card.test.js` | `../src/collect/card.js` → `../src/share/card.js` |
| `tests/contracts.test.js` | `../src/collect/summary.js` → `../src/cli/summary.js` |
| `tests/cli.test.js` | `../src/collect/inject.js` → `../src/share/inject.js` |
| `tests/publish.test.js` | `../src/collect/publish.js` → `../src/share/publish.js` |
| `tests/profile.test.js` | `../src/collect/summary.js` → `../src/cli/summary.js`；`../src/collect/inject.js` → `../src/share/inject.js`；`../src/collect/public.js` → `../src/share/public.js` |
| `tests/daily.test.js` | 两处 `../src/collect/summary.js` → `../src/cli/summary.js` |
| `tests/shelf.test.js` | `../src/collect/summary.js` → `../src/cli/summary.js`；`../src/collect/receive.js` → `../src/share/receive.js` |
| `tests/display-states.test.js` | `../src/brands/shared/showcase.js` → `../src/brands/shared/display-states.js`；第 5 行注释里 `src/project/studio.js` → `tools/studio/main.js` |

然后搜索遗漏（代码、注释、测试名都算）：

```bash
grep -rn "collect/\(card\|public\|inject\|publish\|receive\|summary\)\|cli/app\|\.\./app\.js\|project/studio\|shared/showcase\|showcase\.js\|showcase\.test" --include='*.js' --include='*.mjs' --include='*.html' --include='*.json' --include='*.md' --include='*.yml' . | grep -v node_modules | grep -v '^./docs/' | grep -v '^./dist'
```

Expected: 只剩 AGENTS.md 和 CONTRIBUTING.md 里的说明（Step 8 修改），以及 `.agents/skills/add-badge/SKILL.md` 里的 `src/project/studio.js`（Step 8 修改）。

- [ ] **Step 5: 分层规则加入 `share`**

`package.json` 的 `files` 里，在 `"src/collect/",` 之后加一行 `"src/share/",`。

`tests/contracts.test.js`：

1. `DEPS` 改为：

```js
  const DEPS = {
    engine: ['engine'],
    brands: ['brands'],
    data: ['data', 'brands'],
    collect: ['collect', 'data', 'brands'],
    share: ['share', 'collect', 'data', 'brands'],
    cli: ['cli', 'share', 'collect', 'data', 'brands'],
    viewer: ['viewer', 'engine', 'data', 'brands'],
  };
  // 这些层在命令行里运行：只能用 Node 自带模块
  const NODE_ONLY = ['brands', 'data', 'collect', 'share', 'cli'];
```

2. 在 `describe('分层', …)` 里，`it('每个文件只引用允许的层', …)` 之后加一个测试（`app` 是入口层，表里不限制它，这里单独守住）：

```js
  it('页面（src/app/）不引用 src/share/：分享功能只在命令行里运行', () => {
    const bad = [];
    for (const file of filesUnder('src/app')) {
      for (const spec of importsOf(file).filter((s) => s.startsWith('.'))) {
        const target = relative(root, resolve(root, dirname(file), spec));
        if (target.startsWith('src/share/')) bad.push(`${file} → ${target}`);
      }
    }
    expect(bad).toEqual([]);
  });
```

3. 「入口和采集层的边界」里第一个测试改为同时守住 `share`（这些文件原来在 `collect/` 里，受这条约定保护，搬家后保护不能丢）：

```js
  it('src/collect/ 和 src/share/ 是纯逻辑：不输出到控制台，不引用 i18n', () => {
    const files = [...filesUnder('src/collect'), ...filesUnder('src/share')];
    const bad = files.filter((f) => /\bconsole\./.test(withoutComments(read(f))) || importsOf(f).some((s) => /i18n/.test(s)));
    expect(bad).toEqual([]);
  });
```

```bash
git add -A src tools tests package.json vite.config.js scripts
npx vitest run
```

Expected: 全部通过。

- [ ] **Step 6: 删除 `titleEn`，由 `en.title` 转大写得到**

1. 先在 `tests/text.test.js` 末尾加测试（失败测试先行）：

```js
import { upperTitle } from '../src/brands/shared/text.js';

describe('upperTitle：英文大写标题由 en.title 转大写', () => {
  const tiered = { title: '会话里程碑', en: { title: '{label} Sessions' }, tiers: [{ label: '10' }, { label: '1K' }] };
  it('普通徽章', () => {
    expect(upperTitle({ title: '程序员节', en: { title: "Programmers' Day" } })).toBe("PROGRAMMERS' DAY");
  });
  it('分级徽章带上等级数值，不传等级时用第一级', () => {
    expect(upperTitle(tiered, 1)).toBe('1K SESSIONS');
    expect(upperTitle(tiered)).toBe('10 SESSIONS');
  });
});
```

如果 `tests/text.test.js` 顶部已经从 `text.js` import 了别的函数，把 `upperTitle` 合进那一行，不要重复 import 同一个模块。

```bash
npx vitest run tests/text.test.js
```

Expected: FAIL，`upperTitle` 不存在。

2. `src/brands/shared/text.js`：在 `badgeTitle` 之后加：

```js
/** 英文大写标题：背面刻字和中文界面标题下面那行英文。由 en.title 转大写，分级徽章带上等级数值。 */
export const upperTitle = (config, tier = null) => badgeTitle(config, 'en', tier).toUpperCase();
```

`engravingLines` 中文分支的返回值改为：

```js
    return [brandName.toUpperCase(), config.title, upperTitle(config), footer];
```

（这里的 `config` 已经由 `resolveTier` 替换过等级数值，`en.title` 里没有占位符了。）

3. 删除所有徽章配置里的 `titleEn` 行（每处都是单独一行 `  titleEn: '…',`）：

```bash
grep -rln "^\s*titleEn: " src/brands | xargs sed -i '' '/^[[:space:]]*titleEn: .*,$/d'
grep -rn "titleEn" src/brands
```

Expected: 第二条命令只剩 `src/brands/claude-code/app-icon.js` 和 `src/brands/codex/feature-frame.js` 的参数和返回对象（下一步手动删）。

4. `src/brands/claude-code/app-icon.js`：参数列表删掉 `titleEn`，返回对象里删掉 `titleEn,` 一行。`src/brands/codex/feature-frame.js` 同样处理。`src/project/logo.js`：删掉 `titleEn: 'AGENT BADGES',` 一行。

5. `src/engine/badge.js`：
   - 隐藏成就的 `config = { …, title: '???', titleEn: '???', … }` 里删掉 `titleEn: '???',`（隐藏时刻字走 `hidden` 分支，用不到它）。
   - `brand.engraving.lines({ … })` 的参数里删掉 `titleEn: config.titleEn,` 一行。

6. `src/engine/validate.js` 第 78 行改为：

```js
  for (const k of ['title', 'description']) if (!config[k]) fail(`缺少 ${k}`);
  if (!config.en?.title) fail('缺少 en.title（英文标题，背面刻字的大写英文由它转换）');
```

7. `src/app/inspect.js`：import 里加上 `upperTitle`（从 `../brands/shared/text.js`；如果该文件已经从 `text.js` import，就合并到同一行）。第 44–46 行改为：

```js
    const subtitle = $('[data-title-en]');
    subtitle.hidden = lang !== 'zh';
    subtitle.textContent = d.masked ? 'HIDDEN ACHIEVEMENT' : upperTitle(config, state.tier);
```

（`badgeTitle` 会把 `null` 或负数的等级当作第一级，和原来「没有等级就用第一级的数值」一致。）

8. `tests/tiers.test.js`：测试用的 `tiered` 配置里，`titleEn: '{label} SESSIONS',` 改为 `en: { title: '{label} Sessions', description: 'x' },`；断言 `expect(c.titleEn).toBe('100 SESSIONS');` 改为 `expect(c.en.title).toBe('100 Sessions');`。

```bash
grep -rn "titleEn" src tests scripts tools .agents | grep -v "data-title-en"
npx vitest run
```

Expected: `grep` 只剩 `.agents/skills/add-badge/` 里的文档（Step 8 修改）；测试全部通过。

- [ ] **Step 7: 比较刻字文字，渲染程序员节背面**

```bash
node .superpowers/sdd/engraving-lines.mjs > .superpowers/sdd/engraving-after.json
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const a = JSON.parse(readFileSync('.superpowers/sdd/engraving-before.json', 'utf8'));
const b = JSON.parse(readFileSync('.superpowers/sdd/engraving-after.json', 'utf8'));
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
const diff = keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
console.log(diff.length, 'differences');
for (const k of diff) console.log(k, JSON.stringify(a[k]), '→', JSON.stringify(b[k]));
"
```

Expected: 只有 `claude-code/programmers-day/0/0/zh/true`、`claude-code/programmers-day/0/0/zh/false`、`codex/programmers-day/0/0/zh/true`、`codex/programmers-day/0/0/zh/false` 四个键不同，且每个只有第三个元素从 `"PROGRAMMERS DAY"` 变成 `"PROGRAMMERS' DAY"`。英文刻字本来就用 `en.title`，不变。

再用 studio 渲染两枚程序员节徽章的背面，存到 `.superpowers/sdd/programmers-day-<工具>.png`，用 Read 工具看图，确认刻字的第三行是 `PROGRAMMERS' DAY`、排版没有溢出：

```bash
node --input-type=module -e "
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 640, height: 640 } });
await p.goto('http://localhost:5199/tools/studio.html');
await p.waitForFunction(() => window.__studio?.ready);
for (const brand of ['claude-code', 'codex']) {
  const url = await p.evaluate((brand) => window.__studio.render({ brand, id: 'programmers-day', angle: Math.PI, lang: 'zh', unlocked: true, size: 1024 }), brand);
  writeFileSync('.superpowers/sdd/programmers-day-' + brand + '.png', Buffer.from(url.split(',')[1], 'base64'));
}
await b.close();
"
```

- [ ] **Step 8: 同步文档**

AGENTS.md：
- Map 中 `src/brands/` 一行：`shared/` 的说明结尾 `showcase states` 改为 `display states (\`display-states.js\`)`。
- Map 中 `src/collect/` 一行改为：
  `| \`src/collect/\` | Local collectors (\`<tool>.js\`: \`BRAND_ID\`, \`TURNS_FIELD\`, \`collect()\`), \`COLLECTORS\`, the data home and ledger files (\`common.js\`). Pure logic: no \`console.\`, no i18n import (guarded) | collect, data, brands (Node built-ins only) |`
- 在它下面新增一行：
  `| \`src/share/\` | Sharing what was collected: achievement card SVG (\`card.js\`), public page data (\`public.js\`), data injection into pages (\`inject.js\`), \`publish\` to GitHub (\`publish.js\`), the shelf image the page hands back (\`receive.js\`). Same rules as \`collect/\` | share, collect, data, brands (Node built-ins only) |`
- Map 中 `src/cli/` 一行改为：
  `| \`src/cli/\` | Argument parsing and help (\`args.js\`, every flag literal), terminal summary (\`summary.js\`: \`BRAND_INFO\`), page HTML (\`page.js\`), terminal output and i18n, local HTTP server, commands (\`commands/*.js\`) | cli, share, collect, data, brands (Node built-ins only) |`
- Map 中 `src/project/` 一行说明改为 `The Agent Badges logo (\`logo.js\`)`。
- Map 中 `tools/` 一行说明改为 `Dev-only pages: \`studio.html\` and \`studio/main.js\` (asset studio)`。
- 约定 7：`brands, data, collect and cli use only` 改为 `brands, data, collect, share and cli use only`。
- 约定 15 改为：`15. \`src/collect/\` and \`src/share/\` have no \`console.\` and no i18n import; \`src/app/\` does not import \`src/share/\`; \`bin/\` imports only \`src/cli/\` — \`tests/contracts.test.js\``
- 约定 18 的第二句改为：`The display states for the landing page and studio are \`peakState\` / \`surpriseKeptState\` in \`src/brands/shared/display-states.js\` — \`tests/display-states.test.js\``
- 「Which checks to run」表：`CLI, collectors, \`package.json\` \`files\`` 改为 `CLI, collectors, sharing (\`src/share/\`), \`package.json\` \`files\``。

CONTRIBUTING.md：
- 目录树：
  - `├─ collect/   local collectors and the ledger files (used by the CLI)`
  - 在它下面加 `├─ share/     achievement card, public page data, page data injection, publish (used by the CLI)`
  - `├─ cli/       argument parsing and help, terminal summary, page HTML, local server, commands/`
  - `└─ project/   the Agent Badges logo`
  - `tools/        dev-only pages: studio.html and studio/ (asset studio)`
- 分层说明那段：`\`collect\` and \`cli\` build on those` 改为 `\`collect\`, \`share\` and \`cli\` build on those`；`The CLI side (\`brands\`, \`data\`, \`collect\`, \`cli\`)` 改为 `The CLI side (\`brands\`, \`data\`, \`collect\`, \`share\`, \`cli\`)`。
- Building blocks 树：`showcase.js (display states for the landing page and studio)` 改为 `display-states.js (display states for the landing page and studio)`。
- Adding a tool：`\`BRAND_INFO\` in \`src/collect/summary.js\`` 改为 `\`BRAND_INFO\` in \`src/cli/summary.js\``。

`.agents/skills/add-badge/`：
- `SKILL.md` 第 81 行 `` - `titleEn` (uppercase, engraved on the back) and `en: { title, description }`. `` 改为 `` - `en: { title, description }`. The uppercase English line on the back is made from `en.title`, so there is no separate field for it. ``
- `SKILL.md` 第 105 行 `(\`src/project/studio.js\`, \`tools/studio.html\`)` 改为 `(\`tools/studio/main.js\`, \`tools/studio.html\`)`。
- `references/parts.md` 第 67、68 行函数签名里删掉 `titleEn, `。
- `references/template.js` 删掉 `titleEn: 'EXAMPLE BADGE',` 一行。

```bash
grep -rn "titleEn\|collect/summary\|collect/card\|collect/publish\|collect/public\|collect/inject\|collect/receive\|cli/app\|project/studio\|showcase\.js" AGENTS.md CONTRIBUTING.md README.md README.zh-CN.md .agents skills
npx vitest run
```

Expected: `grep` 没有输出；测试全部通过（含 `tests/docs.test.js` 的目录树、Map、技能路径检查）。

- [ ] **Step 9: 改动后拍图并比对，运行检查**

```bash
node scripts/visual.mjs capture .superpowers/sdd/visual/task-2-after
node scripts/visual.mjs compare .superpowers/sdd/visual/task-2-before .superpowers/sdd/visual/task-2-after
npm run build
npm run check:pack
npm run check:shelf
npm run check:browser
npm run build:site
npm run check:site
```

Expected: `279 张全部一致`（背面刻字不在视觉回归范围内）；各项检查全部通过。

- [ ] **Step 10: 提交**

```bash
git add -A
git status --short
git commit -m "refactor: share/ for sharing, page.js, studio in tools/, display-states.js; titleEn derived from en.title

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

提交前确认 `git status --short` 里没有 `.superpowers/`、`screenshots/`、`dist/` 等文件。

---

### Task 3: 哈希说明和文档漂移

**Files:**
- Modify: `src/data/hash.js`、`src/data/claude-code-metrics.js`、`src/data/codex-metrics.js`、`src/collect/codex.js`、`src/data/progress.js`、`src/brands/shared/text.js`
- Modify: `tests/claude-code-metrics.test.js`、`tests/codex-metrics.test.js`、`tests/cli.test.js`、`tests/docs.test.js`

**Interfaces:**
- Consumes: 任务 2 之后的文件位置。
- Produces:
  - `extractFacts(rec, { hash })`、`extractRolloutFacts(rec, { hash })`、`threadFacts(row, { hash })`：`hash` 必须由调用方传入，不再有默认值。
  - `src/data/hash.js` 只导出 `hash32`（`fnv1a` 删除）。

- [ ] **Step 1: 哈希参数改为必须传入**

`src/data/hash.js` 改为：

```js
// FNV-1a 32 位哈希：浏览器和 Node 结果一致。
// 只用来决定顶级彩蛋抽到哪一款（normalize.js 的 pickVariant），按「这一级的 salt + 获得日期」计算。
// 改算法会让所有人的顶级款式重新洗牌，不要动。
// 写进账本的哈希（MCP 服务名、Codex 模型名）是另一套：src/collect/common.js 的 hash（加前缀的 sha256，取前 12 位）。

/** 32 位无符号整数 */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
```

`src/data/claude-code-metrics.js`：删除 `import { fnv1a } from './hash.js';`；`export function extractFacts(rec, { hash = fnv1a } = {})` 改为 `export function extractFacts(rec, { hash })`，并在它上面的说明里补一句 `hash：调用方传入的哈希函数（采集时是 src/collect/common.js 的 hash）。`

`src/data/codex-metrics.js`：删除 `import { fnv1a } from './hash.js';`；`extractRolloutFacts(rec, { hash = fnv1a } = {})` 改为 `extractRolloutFacts(rec, { hash })`；`threadFacts(row, { hash = fnv1a } = {})` 改为 `threadFacts(row, { hash })`；两个函数的说明里同样补上那一句。

- [ ] **Step 2: 测试显式传入哈希函数**

```bash
npx vitest run
```

Expected: FAIL。不传第二个参数的调用会报 `Cannot destructure property 'hash' of 'undefined'`，列出的就是要改的地方（`tests/claude-code-metrics.test.js` 第 48、57–59 行附近，`tests/cli.test.js` 第 145 行附近，以及 `tests/codex-metrics.test.js` 里不传 `{ hash }` 的调用）。

逐个改成传入哈希函数。测试里已经有 `hash` 可用时（例如 `tests/claude-code-metrics.test.js` 第 35 行用的那个），沿用它；没有时，在文件顶部加 `import { hash } from '../src/collect/common.js';`。例如：

```js
const facts = records.map((r) => extractFacts(r, { hash })).filter(Boolean);
expect(extractFacts({ type: 'last-prompt', lastPrompt: SECRET }, { hash })).toBeNull();
```

```bash
npx vitest run
grep -rn "fnv1a" src tests scripts
```

Expected: 测试全部通过；`grep` 没有输出。

- [ ] **Step 3: 落地页写的徽章数量加入一致性检查**

在 `tests/docs.test.js` 末尾加：

```js
describe('落地页文字', () => {
  const text = read('src/site/strings.js');
  const total = BRANDS.reduce((n, e) => n + e.badges.length, 0);
  const claude = BRANDS.find((e) => e.brand.id === 'claude-code');

  it('徽章总数、工具数量和代码一致', () => {
    expect(text).toContain(`'${total} 枚徽章，两个工具'`);
    expect(text).toContain(`'${total} badges, two tools'`);
    expect(BRANDS.length, 'strings.js 写的是「两个工具」，工具数量变了要改文字').toBe(2);
  });

  it('对话示例里 Claude Code 的徽章总数和代码一致', () => {
    expect(text).toContain(`Claude Code：已解锁 27 / ${claude.badges.length}`);
    expect(text).toContain(`Claude Code: 27 / ${claude.badges.length} unlocked`);
  });
});
```

```bash
npx vitest run tests/docs.test.js
```

Expected: 通过。再临时把 `src/site/strings.js` 里的 `62 枚徽章` 改成 `61 枚徽章` 运行一次，确认测试失败，然后改回来。

- [ ] **Step 4: 修正过时和错位的注释**

只改注释，不改代码：

1. `src/data/progress.js`：删除头部注释的最后两行（空注释行 `//` 和 `// 以后接入真实数据（如读取 ~/.claude 下的会话记录）时，只需新增一个 source。`）。真实数据的来源在同一文件下方已经写清楚（命令行或开发服务器注入 `window.__AGENT_BADGES_DATA__`，没有时用示例数据）。
2. `src/brands/shared/text.js` 第 2 行改为 `// 中文写在徽章配置里（title / description），英文写在同一个配置的 en 字段里（en.title / en.description）。`
3. `src/data/claude-code-metrics.js`「3. 账本合并」：现在 `mergeLedger` 的说明（「会话记录会被定期清理……保留账本里的旧值。」）错放在 `fromStats` 上面，形成连续两段说明。把它移到 `export function mergeLedger` 正上方；`fromStats` 只保留它自己的说明。顺手删掉文件里连续两个空行中的一个（`modelFamily` 之后、「2. 事实 → 按天汇总」之后）。
4. `src/data/codex-metrics.js`：
   - `aggregateCodexDays` 上方有两段连续的 JSDoc，合并成一段：

```js
/**
 * 按天汇总会话记录和会话索引库的事实。
 * @param {object[][]} sessions  每个会话记录文件的事实数组
 * @param {object[]}   threads   会话索引库的事实数组
 * @param {object} [opts]
 * @param {Array}  [opts.streamsOut]  传入时，旧版 token_count 用量不直接计入，而是以 [指纹, 日期, Token] 放进这里，
 *   由调用方合并所有文件后用 applyStreams 统一去重（采集时按文件缓存，跨文件去重只能放到最后做）
 * @param {Array}  [opts.segsOut]  传入时，自己发起的会话的活动段放进这里，由调用方合并所有文件后用
 *   applySessionSegments 统一计算协作时长、多线并行、跨日夜战（这三项要跨会话一起算）
 */
```

   - 「合并两份按天汇总……模型取并集。」这段说明现在在 `applyCodexSegments` 上面，移到 `export function mergeDays` 正上方。
5. `src/collect/codex.js`：「增量处理会话记录……大小或修改时间变了才重新解析。」这段说明现在在 `CACHE_VERSION` 的说明上面，移到 `function rolloutDays` 正上方；`CACHE_VERSION` 只保留它自己的说明。

- [ ] **Step 5: 验证并提交**

```bash
npx vitest run
```

然后按「共用操作 › 统计基线比对」运行比对。

Expected: 测试全部通过；`统计结果一致`。

```bash
npm run build
npm run check:pack
git add -A src tests
git status --short
git commit -m "fix: truthful hash comments, required hash argument, landing counts guarded, misplaced doc comments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 两个工具的统计模块去重

**Files:**
- Modify: `src/data/metrics-common.js`、`src/data/claude-code-metrics.js`、`src/data/codex-metrics.js`、`src/collect/codex.js`
- Modify: `tests/metrics-common.test.js`、`tests/codex-metrics.test.js`、`tests/cli.test.js`
- Docs: `AGENTS.md`、`CONTRIBUTING.md`

**Interfaces:**
- Consumes: 任务 3 之后的两个统计模块。
- Produces:
  - `metrics-common.js` 导出 `IDLE_GAP_MS`（30 分钟，毫秒）和 `createComputeProgress(rules, isActive, rulesFile)`，后者返回 `(ledger, badges, today) => 原始进度`。
  - 两个统计模块都导出 `RULES`、`computeProgress`、`aggregateDays`、`mergeLedger`。
  - Codex 的提取函数：`extractRolloutFacts(rec, { hash })`（会话记录的一行）、`extractThreadFacts(row, { hash })`（会话索引库的一行，原名 `threadFacts`）。
  - Codex 的 `aggregateCodexDays` 改名 `aggregateDays`，`mergeCodexLedger` 改名 `mergeLedger`。

- [ ] **Step 1: 写公共函数的测试**

在 `tests/metrics-common.test.js` 末尾加（把 `createComputeProgress` 合进文件顶部从 `metrics-common.js` 的 import）：

```js
describe('createComputeProgress：按规则表算每枚徽章的原始进度', () => {
  const rules = { a: (c, b) => ({ id: b.id, dates: c.dates }), b: () => ({ unlocked: false }) };
  const isActive = (d) => d.n > 0;
  const compute = createComputeProgress(rules, isActive, 'src/data/x-metrics.js');
  const ledger = { days: { '2026-03-01': { n: 1 }, '2026-03-02': { n: 0 } } };

  it('每枚徽章调用自己的规则，规则拿到的上下文只含活跃日', () => {
    expect(compute(ledger, [{ id: 'a' }, { id: 'b' }], '2026-03-05')).toEqual({ a: { id: 'a', dates: ['2026-03-01'] }, b: { unlocked: false } });
  });

  it('缺规则时报错，指出该去哪个文件加', () => {
    expect(() => compute(ledger, [{ id: 'c' }], '2026-03-05')).toThrow('徽章「c」没有统计规则：在 src/data/x-metrics.js 的 RULES 里加一条');
  });
});
```

（`metricsContext` 给规则的上下文里，`dates` 是按 `isActive` 筛过的活跃日列表。）

```bash
npx vitest run tests/metrics-common.test.js
```

Expected: FAIL，`createComputeProgress` 不存在。

- [ ] **Step 2: 实现公共函数和共用的空闲阈值**

`src/data/metrics-common.js`：

1. 把 `/** 协作时长：间隔 ≤ 30 分钟的部分计入，超过的视为离开 */ const ACTIVE_GAP_MS = 30 * MIN;` 改为：

```js
/** 两次活动间隔超过 30 分钟视为离开：会话时长、协作时长都不计这一段。 */
export const IDLE_GAP_MS = 30 * MIN;
```

   文件里其他用到 `ACTIVE_GAP_MS` 的地方改用 `IDLE_GAP_MS`。

2. 在 `metricsContext` 之后加：

```js
/**
 * 由规则表生成 computeProgress(ledger, badges, today)：每枚徽章按自己的规则算出原始进度（交给 normalizeProgress）。
 * @param {Record<string, Function>} rules  徽章 id → 规则 (ctx, badge) => 原始进度
 * @param {(day: object) => boolean} isActive  这一天算不算活跃
 * @param {string} rulesFile  缺规则时报错里指出的文件
 */
export function createComputeProgress(rules, isActive, rulesFile) {
  return (ledger, badges, today) => {
    const ctx = metricsContext(ledger, today, isActive);
    return Object.fromEntries(
      badges.map((b) => {
        const rule = rules[b.id];
        if (!rule) throw new Error(`徽章「${b.id}」没有统计规则：在 ${rulesFile} 的 RULES 里加一条`);
        return [b.id, rule(ctx, b)];
      }),
    );
  };
}
```

```bash
npx vitest run tests/metrics-common.test.js
```

Expected: PASS。

- [ ] **Step 3: 两个工具改用公共函数和共用阈值**

`src/data/claude-code-metrics.js`：
- 从 `metrics-common.js` 的 import 里加上 `createComputeProgress`、`IDLE_GAP_MS`，去掉不再直接使用的 `metricsContext`。
- 删除本地的 `const IDLE_GAP_MS = 30 * 60 * 1000; // …`。
- 文件末尾的 `export function computeProgress(…) { … }` 整段替换为：

```js
/**
 * @param {object} ledger   mergeLedger 的结果
 * @param {object[]} badges 徽章配置（规则从这里读门槛）
 * @param {string} today    YYYY-MM-DD
 * @returns {object} 原始进度（交给 normalizeProgress）
 */
export const computeProgress = createComputeProgress(RULES, isActive, 'src/data/claude-code-metrics.js');
```

`src/data/codex-metrics.js`：
- 同样加 import、删除本地 `const IDLE_GAP_MS = 30 * 60 * 1000;`、去掉不再使用的 `metricsContext`。
- `computeProgress` 整段替换为：

```js
/**
 * @param {object} ledger   mergeLedger 的结果
 * @param {object[]} badges 徽章配置（规则从这里读门槛）
 * @param {string} today    YYYY-MM-DD
 * @returns {object} 原始进度（交给 normalizeProgress）
 */
export const computeProgress = createComputeProgress(RULES, isActive, 'src/data/codex-metrics.js');
```

- 改名：`aggregateCodexDays` → `aggregateDays`，`mergeCodexLedger` → `mergeLedger`，`threadFacts` → `extractThreadFacts`。两个提取函数的说明第一行写清来源：
  - `extractRolloutFacts` 上方：`/** 会话记录（rollout-*.jsonl）的一行 → 白名单事实（null 表示对统计没用）。…*/`
  - `extractThreadFacts` 上方：`/** 会话索引库（state_*.sqlite 的 threads 表，只含白名单列）的一行 → 事实。…*/`
  - 文件内其他注释里出现的旧名字（例如 `applyStreams` 说明里的 `aggregateCodexDays`）一并改掉。

- [ ] **Step 4: 更新调用方**

```bash
grep -rn "aggregateCodexDays\|mergeCodexLedger\|threadFacts\|IDLE_GAP_MS\|ACTIVE_GAP_MS" src tests scripts
```

把 `src/collect/codex.js`、`tests/codex-metrics.test.js`、`tests/cli.test.js` 里的旧名字全部换成新名字（`extractThreadFacts` 已包含 `threadFacts` 这几个字，替换时注意不要改成 `extractextractThreadFacts`）。再运行一次上面的 `grep`。

Expected: 只剩 `metrics-common.js` 和两个统计模块里的 `IDLE_GAP_MS`，以及 `extractThreadFacts`。

```bash
npx vitest run
```

Expected: 全部通过。

- [ ] **Step 5: 同步文档**

AGENTS.md Map 中 `src/data/` 一行：`Per-tool metrics (\`<tool>-metrics.js\`: \`RULES\`, \`computeProgress\`)` 改为 `Per-tool metrics (\`<tool>-metrics.js\`: fact extraction, \`aggregateDays\`, \`mergeLedger\`, \`RULES\`, \`computeProgress\`)`；`shared rules (\`metrics-common.js\`)` 改为 `shared rules and \`createComputeProgress\` (\`metrics-common.js\`)`。

CONTRIBUTING.md「Adding a tool」第 5 步改为：

```
5. `src/data/<id>-metrics.js`: fact extraction (one function per log source, named after it), `aggregateDays` (facts into the daily ledger), `mergeLedger` (fresh days into the saved ledger), `RULES` (one per badge id, built from `COMMON_RULES` and `birthdayRule(brand.launchDate)` in `src/data/metrics-common.js`) and `computeProgress = createComputeProgress(RULES, isActive, '<this file>')`.
```

```bash
npx vitest run tests/docs.test.js
```

Expected: PASS。

- [ ] **Step 6: 验证并提交**

按「共用操作 › 统计基线比对」运行比对（`dump-progress.mjs` 调用的是 `computeProgress`，名字没变）。

Expected: `统计结果一致`。

```bash
npx vitest run
npm run build
npm run check:pack
git add -A src tests AGENTS.md CONTRIBUTING.md
git status --short
git commit -m "refactor: one computeProgress builder and idle gap; same names for the same steps in both tools

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 大数字格式统一为 K/M/B

**Files:**
- Create: `src/data/format.js`、`tests/format.test.js`
- Modify: `package.json`（`files`）、`src/share/card.js`、`src/cli/summary.js`、`src/viewer/i18n.js`、`src/app/inspect.js`、`src/viewer/heatmap.js`、`src/viewer/profile.js`、`src/viewer/poster.js`、`src/viewer/grid.js`
- Modify: `tests/card.test.js`、`tests/daily.test.js`

**Interfaces:**
- Consumes: 任务 2 之后的 `src/share/card.js`、`src/cli/summary.js`。
- Produces: `formatCount(n: number): string`，在 `src/data/format.js`。`formatTokens`（卡片）、`fmt`（终端汇总）、`formatBig`（网页）删除。

- [ ] **Step 1: 写失败测试**

新建 `tests/format.test.js`：

```js
import { describe, expect, it } from 'vitest';
import { formatCount } from '../src/data/format.js';

// 大数字统一写成 K / M / B：网页、卡片、终端都用这一个函数
describe('formatCount', () => {
  it('小于 1000 原样显示', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });
  it('保留一位小数，去掉末尾的 .0', () => {
    expect(formatCount(1000)).toBe('1K');
    expect(formatCount(1234)).toBe('1.2K');
    expect(formatCount(1_234_567)).toBe('1.2M');
    expect(formatCount(9_750_000_000)).toBe('9.8B');
    expect(formatCount(12_000_000_000)).toBe('12B');
  });
  it('四舍五入后满 1000 就进到下一个单位', () => {
    expect(formatCount(999_950)).toBe('1M');
    expect(formatCount(999_950_000)).toBe('1B');
  });
  it('B 是最大的单位', () => {
    expect(formatCount(1.5e12)).toBe('1500B');
  });
});
```

```bash
npx vitest run tests/format.test.js
```

Expected: FAIL，找不到模块 `src/data/format.js`。

- [ ] **Step 2: 实现**

新建 `src/data/format.js`：

```js
// 大数字的显示格式：网页、成就卡片、终端汇总共用，不区分语言。

const UNITS = ['K', 'M', 'B'];

/**
 * 1234 → 1.2K，1234567 → 1.2M，9750000000 → 9.8B；小于 1000 原样显示。
 * 保留一位小数并去掉末尾的 .0；四舍五入后满 1000 就进到下一个单位（999950 → 1M，不是 1000K）。
 */
export function formatCount(n) {
  if (n < 1000) return String(n);
  let unit = 0;
  let v = n / 1000;
  while (unit < UNITS.length - 1 && +v.toFixed(1) >= 1000) {
    v /= 1000;
    unit += 1;
  }
  return `${+v.toFixed(1)}${UNITS[unit]}`;
}
```

`package.json` 的 `files` 里，在 `"src/data/normalize.js",` 之后加 `"src/data/format.js",`。

```bash
npx vitest run tests/format.test.js tests/package-files.test.js
```

Expected: PASS。

- [ ] **Step 3: 卡片和终端改用 `formatCount`**

`src/share/card.js`：删除 `export function formatTokens(n) { … }`；加 `import { formatCount } from '../data/format.js';`；`[formatTokens(s.tokens), L.tokens]` 改为 `[formatCount(s.tokens), L.tokens]`。

`tests/card.test.js`：import 改为 `import { renderCard } from '../src/share/card.js';`；删除第 35–37 行附近只测 `formatTokens` 的断言（如果它们单独成一个 `it`，删除整个 `it`；格式本身由 `tests/format.test.js` 覆盖）。

`src/cli/summary.js`：删除 `const fmt = …;`；加 `import { formatCount } from '../data/format.js';`；`formatSummary` 里两处 `fmt(` 改为 `formatCount(`。

`tests/daily.test.js`「十亿以上用 B」：`expect(formatSummary(s)).toContain('10B Tokens 9.72B/10B');` 改为 `expect(formatSummary(s)).toContain('10B Tokens 9.7B/10B');`。

```bash
npx vitest run
```

Expected: 全部通过。若有其他断言因为新格式失败（例如 1 万以下的数字现在显示为 `8.5K`），按新格式更新期望值，并在任务报告里列出改了哪些断言。

- [ ] **Step 4: 改动前拍图（网页部分动手之前）**

```bash
node scripts/visual.mjs capture .superpowers/sdd/visual/task-5-before
```

Expected: `279 张`。（这一步放在网页改动之前；前面卡片和终端的改动不影响任何截图。）

- [ ] **Step 5: 网页改用 `formatCount`**

`src/viewer/i18n.js`：删除 `formatBig` 函数和它的注释。

下列文件的 import 里去掉 `formatBig`，加上 `import { formatCount } from '../data/format.js';`，函数体里的 `formatBig(` 全部改为 `formatCount(`（`formatBig` 原来的第二个参数 `l` 没有调用方传过，直接去掉即可）：

- `src/app/inspect.js`
- `src/viewer/heatmap.js`
- `src/viewer/profile.js`
- `src/viewer/poster.js`
- `src/viewer/grid.js`

```bash
grep -rn "formatBig\|formatTokens\|toLocaleString" src
```

Expected: 只剩 `src/viewer/i18n.js` 里 `formatDay` 用的 `toLocaleDateString`（不是数字格式）。

- [ ] **Step 6: 文档里的示例**

```bash
grep -rn "万\|亿\|[0-9]\.[0-9][0-9]B\|[0-9],[0-9][0-9][0-9]" README.md README.zh-CN.md skills/badges/SKILL.md src/site/strings.js
```

凡是展示网页、卡片或终端输出数字的示例，按新格式更新（例如两位小数的 `9.72B` 改成 `9.7B`、`1,234` 改成 `1.2K`）。描述门槛的文字（如「100 亿」作为徽章名或门槛说明）不是程序输出，不改。若没有需要改的地方，在报告里写明已检查。

- [ ] **Step 7: 改动后拍图、比对，运行检查**

```bash
npx vitest run
node scripts/visual.mjs capture .superpowers/sdd/visual/task-5-after
node scripts/visual.mjs compare .superpowers/sdd/visual/task-5-before .superpowers/sdd/visual/task-5-after
npm run build
npm run check:browser
npm run check:pack
npm run check:shelf
npm run build:site
npm run check:site
```

Expected:
- 视觉回归：`279 张全部一致`。徽章本身和缩略图没有文字；只有主页图（`shelf--dark.png`）里如果画了受影响的数字才会不同。若出现差异，用 Read 工具打开改动前后的两张图，确认只有数字的写法变了，并在报告里说明。
- 各项检查全部通过。用 Read 工具看一眼 `screenshots/` 里的陈列墙截图，确认方块上的进度数字是 `1.2K / 10K` 这样的写法。

- [ ] **Step 8: 提交**

```bash
git add -A src tests package.json README.md README.zh-CN.md skills
git status --short
git commit -m "feat: one number format (K/M/B) for the web page, card and terminal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 账本和缓存的安全写入

**问题**（已在临时目录复现）：`writeJSON` 直接覆盖文件，写到一半中断时文件被截断；账本被截断后这个工具每次采集都失败，却以退出码 0 结束；进度文件被截断后所有命令都崩溃。

**Files:**
- Modify: `src/collect/common.js`、`src/collect/claude-code.js`、`src/collect/codex.js`、`src/cli/commands/collect.js`
- Create: `tests/storage.test.js`
- Docs: `README.md`、`README.zh-CN.md`、`AGENTS.md`

**Interfaces:**
- Consumes: 任务 4 之后的采集模块。
- Produces（`src/collect/common.js`）：
  - `readJSON(path)`：文件不存在返回 `null`；内容不是合法 JSON 时抛出 `SyntaxError`。
  - `writeJSON(path, data)`：先写同目录临时文件再改名替换。
  - `class CorruptLedgerError extends Error`，字段 `path`（损坏的账本）、`backup`（`<path>.bak` 存在时为它的路径，否则 `null`）。
  - `readLedger(path)`：不存在返回 `null`；损坏时抛出 `CorruptLedgerError`。
  - `readCache(path)`：损坏时当作不存在，返回 `null`。
  - `saveBrand(...)`：覆盖账本前，把当前账本保存为 `<文件名>.bak`。

- [ ] **Step 1: 写失败测试**

新建 `tests/storage.test.js`：

```js
// 账本和缓存的安全写入：写到一半中断不会留下截断的文件；读到损坏的文件时按文件的性质处理。
// 全部在临时目录里用伪造的数据进行。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 只替换 writeFileSync，用来模拟「写到一半磁盘满了」；其余照常
const realFs = await vi.importActual('node:fs');
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal();
  return { ...fs, writeFileSync: vi.fn(fs.writeFileSync) };
});
const { writeFileSync: mockedWrite } = await import('node:fs');
const { CorruptLedgerError, readCache, readLedger, saveBrand, writeJSON } = await import('../src/collect/common.js');
const { collectAll } = await import('../src/collect/index.js');

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'agent-badges-storage-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.mocked(mockedWrite).mockClear();
});

const iso = (h, m = 0) => new Date(`2026-05-02T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();

/** 伪造一个最小的 ~/.claude：一个会话，一轮对话。 */
function fakeClaude() {
  const dir = join(root, 'claude', 'projects', 'p');
  mkdirSync(dir, { recursive: true });
  realFs.writeFileSync(
    join(dir, 's1.jsonl'),
    [
      { type: 'user', sessionId: 's1', timestamp: iso(10), message: { content: 'hi' } },
      { type: 'assistant', sessionId: 's1', timestamp: iso(10, 1), message: { id: 'm1', model: 'claude-opus-5', usage: { input_tokens: 10, output_tokens: 5 }, content: [] } },
    ].map((r) => JSON.stringify(r)).join('\n') + '\n',
  );
  return { CLAUDE_CONFIG_DIR: join(root, 'claude'), CODEX_HOME: join(root, 'no-codex'), AGENT_BADGES_HOME: join(root, 'home') };
}

describe('写入', () => {
  it('写完不留临时文件，内容完整', () => {
    const p = join(root, 'a', 'x.json');
    writeJSON(p, { n: 1 });
    expect(JSON.parse(readFileSync(p, 'utf8'))).toEqual({ n: 1 });
    expect(readdirSync(join(root, 'a'))).toEqual(['x.json']);
  });

  it('写到一半失败：原文件完好，临时文件被清掉，错误照常抛出', () => {
    const p = join(root, 'x.json');
    writeJSON(p, { old: true });
    vi.mocked(mockedWrite).mockImplementationOnce((file, data) => {
      realFs.writeFileSync(file, String(data).slice(0, 5)); // 只写进去一截
      throw new Error('ENOSPC: no space left on device');
    });
    expect(() => writeJSON(p, { old: false, more: 'x'.repeat(100) })).toThrow('ENOSPC');
    expect(JSON.parse(readFileSync(p, 'utf8'))).toEqual({ old: true });
    expect(readdirSync(root)).toEqual(['x.json']);
  });

  it('覆盖账本前把上一版存成 .bak', () => {
    const home = join(root, 'home');
    const ledger = (n) => ({ version: 1, firstSeen: '2026-05-01', days: { '2026-05-01': { tokens: n, turns: n } } });
    saveBrand(home, 't', ledger(1), {}, { turnsField: 'turns' });
    expect(existsSync(join(home, 't.ledger.json.bak'))).toBe(false);
    saveBrand(home, 't', ledger(2), {}, { turnsField: 'turns' });
    expect(JSON.parse(readFileSync(join(home, 't.ledger.json.bak'), 'utf8'))).toEqual(ledger(1));
    expect(JSON.parse(readFileSync(join(home, 't.ledger.json'), 'utf8'))).toEqual(ledger(2));
  });
});

describe('读到损坏的文件', () => {
  it('账本：抛出 CorruptLedgerError，带上路径和备份', () => {
    const p = join(root, 'x.ledger.json');
    realFs.writeFileSync(p, '{"version":1,"da');
    expect(() => readLedger(p)).toThrow(CorruptLedgerError);
    try {
      readLedger(p);
    } catch (e) {
      expect(e.path).toBe(p);
      expect(e.backup).toBeNull();
    }
    realFs.writeFileSync(`${p}.bak`, '{}');
    try {
      readLedger(p);
    } catch (e) {
      expect(e.backup).toBe(`${p}.bak`);
    }
  });

  it('缓存：当作不存在', () => {
    const p = join(root, 'cache.json');
    realFs.writeFileSync(p, '{"version":4,"fi');
    expect(readCache(p)).toBeNull();
    expect(readCache(join(root, 'missing.json'))).toBeNull();
  });

  it('采集时账本损坏：这个工具不采集，账本一个字节都不动', async () => {
    const env = fakeClaude();
    const p = join(env.AGENT_BADGES_HOME, 'claude-code.ledger.json');
    mkdirSync(env.AGENT_BADGES_HOME, { recursive: true });
    realFs.writeFileSync(p, '{"version":1,"da');
    const { results } = await collectAll({ env, home: env.AGENT_BADGES_HOME });
    const r = results.find((x) => x.brandId === 'claude-code');
    expect(r.error).toBeInstanceOf(CorruptLedgerError);
    expect(readFileSync(p, 'utf8')).toBe('{"version":1,"da');
  });
});

describe('命令行', () => {
  const run = (env) => spawnSync(process.execPath, ['bin/agent-badges.mjs', 'collect'], { env: { ...env, LANG: 'en_US.UTF-8', PATH: process.env.PATH }, encoding: 'utf8' });

  it('进度文件损坏：提示是哪个文件，照常采集并重写它，退出码 0', () => {
    const env = fakeClaude();
    const p = join(env.AGENT_BADGES_HOME, 'claude-code.json');
    mkdirSync(env.AGENT_BADGES_HOME, { recursive: true });
    realFs.writeFileSync(p, '{"source":"lo');
    const r = run(env);
    expect(r.status).toBe(0);
    expect(r.stderr).toContain(p);
    expect(JSON.parse(readFileSync(p, 'utf8')).source).toBe('local');
  });

  it('账本损坏：提示路径和从 .bak 恢复的命令，退出码非零', () => {
    const env = fakeClaude();
    const p = join(env.AGENT_BADGES_HOME, 'claude-code.ledger.json');
    mkdirSync(env.AGENT_BADGES_HOME, { recursive: true });
    realFs.writeFileSync(p, '{"version":1,"da');
    realFs.writeFileSync(`${p}.bak`, '{"version":1,"firstSeen":null,"days":{}}');
    const r = run(env);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain(p);
    expect(r.stderr).toContain(`cp "${p}.bak" "${p}"`);
    expect(readFileSync(p, 'utf8')).toBe('{"version":1,"da');
  });

  it('Codex 缓存损坏：当作空缓存重新解析，采集成功', () => {
    const env = { ...fakeClaude(), CODEX_HOME: join(root, 'codex') };
    const day = join(root, 'codex', 'sessions', '2026', '05', '02');
    mkdirSync(day, { recursive: true });
    realFs.writeFileSync(
      join(day, 'rollout-a.jsonl'),
      [
        { type: 'session_meta', timestamp: iso(9), payload: { source: 'cli' } },
        { type: 'event_msg', timestamp: iso(9, 1), payload: { type: 'task_started' } },
      ].map((r) => JSON.stringify(r)).join('\n') + '\n',
    );
    mkdirSync(join(env.AGENT_BADGES_HOME, 'cache'), { recursive: true });
    realFs.writeFileSync(join(env.AGENT_BADGES_HOME, 'cache', 'codex-rollouts.json'), '{"version":4,"fi');
    const r = run(env);
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(env.AGENT_BADGES_HOME, 'cache', 'codex-rollouts.json'), 'utf8')).version).toBe(4);
    expect(existsSync(join(env.AGENT_BADGES_HOME, 'codex.json'))).toBe(true);
  });
});
```

说明：命令行测试用子进程运行，不受本文件 `vi.mock` 的影响；`CODEX_HOME` 指向不存在的目录时，Codex 采集按「没有安装」跳过。如果 `CACHE_VERSION` 已不是 4，把最后一个测试里的 `4` 改成 `src/collect/codex.js` 里的实际值。

```bash
npx vitest run tests/storage.test.js
```

Expected: FAIL（`CorruptLedgerError`、`readLedger`、`readCache` 不存在，写入失败时原文件被截断等）。

- [ ] **Step 2: 实现安全写入和读取**

`src/collect/common.js` 改为：

```js
// 采集模块共用的小工具：数据目录、哈希、读写 JSON。
// 写入都先写临时文件再改名替换：写到一半中断（崩溃、磁盘满）时，原文件保持完好。
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { dailySeries } from '../data/daily.js';

/** 账本和进度的存放目录：默认 ~/.agent-badges，可用 AGENT_BADGES_HOME 覆盖。 */
export function dataHome(env = process.env) {
  return env.AGENT_BADGES_HOME ?? join(homedir(), '.agent-badges');
}

/** MCP 服务名、模型名等的哈希：只用于去重计数，不可逆。 */
export const hash = (s) => createHash('sha256').update(`agent-badges:${s}`).digest('hex').slice(0, 12);

/** 读 JSON：文件不存在返回 null；内容不是合法 JSON 时抛出 SyntaxError，由调用方按文件的性质处理。 */
export const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/** 先写同目录的临时文件，再改名替换（同一磁盘上改名是原子的）。 */
function replaceFile(path, write) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    write(tmp);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

export function writeJSON(path, data) {
  const text = JSON.stringify(data, null, 2);
  replaceFile(path, (tmp) => writeFileSync(tmp, text));
}

/** 账本损坏（不是合法 JSON）。账本里有工具已经清理掉的旧日子，不能覆盖，交给用户从备份恢复。 */
export class CorruptLedgerError extends Error {
  constructor(path) {
    super(`账本文件损坏：${path}`);
    this.name = 'CorruptLedgerError';
    this.path = path;
    this.backup = existsSync(`${path}.bak`) ? `${path}.bak` : null;
  }
}

/** 读账本：不存在返回 null；损坏时抛出 CorruptLedgerError，绝不当作空账本继续（那样会把旧数据覆盖掉）。 */
export function readLedger(path) {
  try {
    return readJSON(path);
  } catch (e) {
    if (e instanceof SyntaxError) throw new CorruptLedgerError(path);
    throw e;
  }
}

/** 读缓存：缓存随时可以重建，损坏时当作不存在。 */
export function readCache(path) {
  try {
    return readJSON(path);
  } catch (e) {
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

/** 写入一个品牌的账本和进度，返回进度文件内容。覆盖账本前，把上一版存为 <文件名>.bak。 */
export function saveBrand(home, brandId, ledger, progress, { turnsField } = {}) {
  if (!turnsField) throw new Error('saveBrand 需要 turnsField（采集模块导出的 TURNS_FIELD）');
  const ledgerPath = join(home, `${brandId}.ledger.json`);
  if (existsSync(ledgerPath)) replaceFile(`${ledgerPath}.bak`, (tmp) => copyFileSync(ledgerPath, tmp));
  writeJSON(ledgerPath, ledger);
  const out = {
    source: 'local',
    generatedAt: new Date().toISOString(),
    days: Object.keys(ledger.days).length,
    progress,
    daily: dailySeries(ledger, turnsField),
  };
  writeJSON(join(home, `${brandId}.json`), out);
  return out;
}
```

（`saveBrand` 只在读账本成功之后才会被调用，所以 `.bak` 里存的一定是一份能解析的账本，不会被损坏的文件覆盖。）

`src/collect/claude-code.js`：import 里 `readJSON` 保留（读 Claude Code 自己的 `stats-cache.json`，行为不变），加上 `readLedger`；`mergeLedger(readJSON(ledgerPath), …)` 改为 `mergeLedger(readLedger(ledgerPath), …)`。

`src/collect/codex.js`：import 里去掉 `readJSON`，加上 `readCache`、`readLedger`；`rolloutDays` 里 `const cache = readJSON(cachePath);` 改为 `const cache = readCache(cachePath);`；`collect` 里 `mergeLedger(readJSON(ledgerPath), …)` 改为 `mergeLedger(readLedger(ledgerPath), …)`。

```bash
npx vitest run tests/storage.test.js
```

Expected: 「写入」「读到损坏的文件」两组通过；「命令行」组里进度文件和账本两个测试仍失败（下一步实现）。

- [ ] **Step 3: 命令行的处理**

`src/cli/commands/collect.js`：

1. 「先记下上次的进度」那两行替换为：

```js
  // 先记下上次的进度，采集完对比出「新解锁」。进度文件只用于这个对比：坏了就当没有，采集后会重写
  const { CorruptLedgerError, dataHome, readJSON } = await import('../../collect/common.js');
  const before = {};
  for (const id of BRAND_IDS) {
    const p = join(dataHome(), `${id}.json`);
    try {
      before[id] = readJSON(p)?.progress ?? null;
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      console.error(t(`! ${p} 已损坏：这次不报告新解锁，采集后会重新生成`, `! ${p} is corrupt: new unlocks are not reported this time; it will be rewritten`));
      before[id] = null;
    }
  }
```

2. 结果循环里，在 `if (r.error) {` 之前加：

```js
    if (r.error instanceof CorruptLedgerError) {
      const { path, backup } = r.error;
      console.error(t(`× ${r.brandId} 的账本已损坏，这次没有采集，文件也没有改动：${path}`, `× ${r.brandId}: the ledger is corrupt, so this tool was skipped and the file was left untouched: ${path}`));
      console.error(
        backup
          ? t(`  用上一版恢复：cp "${backup}" "${path}"`, `  Restore the previous version: cp "${backup}" "${path}"`)
          : t('  没有备份。删掉这个文件会从现有记录重新统计，但工具已经清理掉的旧日子会丢失。', '  No backup exists. Deleting the file rebuilds it from the current logs, but days the tool has already cleaned up are lost.'),
      );
      process.exitCode = 1;
      continue;
    }
```

```bash
npx vitest run
```

Expected: 全部通过。

- [ ] **Step 4: 同步文档**

README.md「Privacy」里 **What is saved.** 一条改为：

```
- **What is saved.** `~/.agent-badges` holds a per-day ledger of numbers, dates and hashes, so badges you earned stay earned even after the tools clean up old logs. Files are written to a temporary file first and then swapped in, so an interrupted run never leaves a half-written ledger, and the previous ledger is kept as `<tool>.ledger.json.bak`. If a ledger is ever damaged, the tool says which file it is and how to restore it from that copy, and never overwrites it.
```

README.zh-CN.md「隐私」里 **保存了什么。** 一条改为：

```
- **保存了什么。** `~/.agent-badges` 里只有按天汇总的账本，内容是数字、日期和哈希。就算工具清理了旧记录，已经拿到的徽章也不会消失。写入时先写临时文件再替换，中途中断也不会留下写了一半的账本；每次更新前，上一版账本会留作 `<工具>.ledger.json.bak`。万一账本损坏，命令会告诉你是哪个文件、怎样用备份恢复，并且不会覆盖它。
```

AGENTS.md「Data boundary」最后一条 `Writes only to …` 末尾、`A new ledger field …` 之前加一句：`Files are written to a temp file and renamed into place; ledgers keep the previous version as \`<tool>.ledger.json.bak\`, and a corrupt ledger is never overwritten (\`tests/storage.test.js\`).`

```bash
npx vitest run tests/docs.test.js
```

Expected: PASS。

- [ ] **Step 5: 验证并提交**

```bash
npx vitest run
npm run build
npm run check:pack
npm run check:shelf
git add -A src tests README.md README.zh-CN.md AGENTS.md
git status --short
git commit -m "fix: atomic writes, ledger backup, and safe handling of corrupt ledger, progress and cache files

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 背面刻字推迟生成

**问题**：陈列墙为拍缩略图组装当前工具的全部徽章并一直保留，每枚背面有 3 张 1024×1024 刻字贴图；按代码推算约 512 MiB 显存加约 384 MiB 画布内存，而缩略图只拍正面。

**Files:**
- Modify: `scripts/visual.mjs`（新增背面截图）
- Modify: `src/engine/engraving.js`、`src/engine/badge.js`、`src/viewer/mount-badge.js`、`src/app/badges.js`、`src/app/inspect.js`
- Modify: `tests/badge.test.js`
- Docs: `AGENTS.md`（约定 17）、`CONTRIBUTING.md`（视觉回归说明）

**Interfaces:**
- Consumes: 无新接口。
- Produces:
  - `placeholderEngraving()`（`src/engine/engraving.js`）：返回所有徽章共用的 `{ map, bumpMap, roughnessMap }`，三张 1×1 贴图，都标 `userData.shared = true`。
  - `buildBadge(config, brand, state, { lang = 'zh', engraving = 1024 })`：`engraving` 是刻字贴图边长；`0` 表示先挂占位贴图。
  - `setEngravingSize(badge, size)`：`size` 为 `0` 时释放刻字、换回占位贴图；从占位贴图换成真刻字时不释放共用的占位贴图。
  - `mountBadge(config, brand, state, { stage, lang, engraving })`：把 `engraving` 直接交给 `buildBadge`，不再先建 1024 再换。

- [ ] **Step 1: 视觉回归加入背面截图（行为不变，先提交）**

`scripts/visual.mjs`：
- 在 `import { BRANDS } …` 之后加：

```js
import { normalizeProgress } from '../src/data/normalize.js';
import { DATA_SOURCES } from '../src/data/progress.js';
```

- 头部「拍什么」注释末尾加 `、单枚查看翻到背面的导出图`。
- 在 `console.log(\`${n} 张 → ${dirA}\`);` 之前加：

```js
  // 单枚查看翻到背面：每个工具挑几种状态（分级、顶级彩蛋、隐藏、未解锁、普通已解锁），中英文各一遍。
  // 钉在背面角度，等刻字换成 2048 的清晰版本后，用导出 PNG 的同一条路径画（单次渲染，不受超采样进度影响）
  for (const { brand, badges } of BRANDS) {
    const st = normalizeProgress(await DATA_SOURCES[brand.id].mock(), badges);
    const picks = [
      badges.find((b) => b.tiers && st[b.id].unlocked && !b.tiers[st[b.id].tier]?.variants),
      badges.find((b) => b.tiers && st[b.id].unlocked && b.tiers[st[b.id].tier]?.variants),
      badges.find((b) => b.hidden && !st[b.id].unlocked),
      badges.find((b) => !b.hidden && !b.tiers && !st[b.id].unlocked),
      badges.find((b) => !b.hidden && !b.tiers && st[b.id].unlocked),
    ].filter(Boolean);
    for (const lang of ['zh', 'en']) {
      const wall = await open(`/?source=mock&lang=${lang}&brand=${brand.id}`, () => window.__badgeApp?.ready);
      for (const { id } of new Set(picks)) {
        await wall.evaluate((id) => window.__badgeApp.open(id, { award: false }), id);
        await wall.evaluate(() => window.__badgeApp.hold(Math.PI));
        await wall.waitForTimeout(2500);
        const { dataURL } = await wall.evaluate(() => window.__badgeApp.exportPNG());
        save(`back--${brand.id}--${id}--${lang}`, dataURL);
        n++;
        await wall.evaluate(() => window.__badgeApp.close());
        await wall.waitForTimeout(500);
      }
      await wall.close();
    }
  }
```

运行两次拍图并比对，确认这些截图在同一份代码下稳定：

```bash
node scripts/visual.mjs capture .superpowers/sdd/visual/task-7-stable-a
node scripts/visual.mjs capture .superpowers/sdd/visual/task-7-stable-b
node scripts/visual.mjs compare .superpowers/sdd/visual/task-7-stable-a .superpowers/sdd/visual/task-7-stable-b
```

Expected: 两次张数相同（279 加上背面截图，每个工具 3 到 5 枚、两种语言），`全部一致`。如果背面截图两次不一致，说明等待不够或有随时间变化的动画：先加长等待并读 `src/viewer/inspector.js` 找出原因，直到稳定。不能用「允许少量差异」绕过。

把 `.superpowers/sdd/visual/task-7-stable-a` 改名为 `task-7-before`，作为本任务的改动前基线：

```bash
mv .superpowers/sdd/visual/task-7-stable-a .superpowers/sdd/visual/task-7-before
rm -rf .superpowers/sdd/visual/task-7-stable-b
git add scripts/visual.mjs
git commit -m "test: visual regression also captures badge backs from the inspector

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: 实测改动前的显存**

临时在 `src/app/badges.js` 的 `createItems` 末尾、`return items;` 之前加一行（只用于测量，不提交）：

```js
  window.__measure = { stage, items };
```

新建 `.superpowers/sdd/measure-wall.mjs`：

```js
// 测量陈列墙全部缩略图完成后的贴图数量和贴图像素占用。用法：node .superpowers/sdd/measure-wall.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
for (const brand of ['claude-code', 'codex']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(`http://localhost:5199/?source=mock&lang=zh&brand=${brand}`);
  await p.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
  const r = await p.evaluate(() => {
    const { stage, items } = window.__measure;
    const seen = new Set();
    let pixels = 0;
    let engraving = 0;
    for (const it of items) {
      it.badge?.traverse((o) => {
        if (!o.isMesh) return;
        for (const [key, v] of Object.entries(o.material)) {
          if (!v?.isTexture || seen.has(v)) continue;
          seen.add(v);
          const w = v.image?.width ?? 0;
          const h = v.image?.height ?? 0;
          pixels += w * h;
          if (o.name === 'back' && ['map', 'bumpMap', 'roughnessMap'].includes(key)) engraving += w * h;
        }
      });
    }
    // 每像素 4 字节，带多级纹理再加约三分之一
    const mib = (px) => +((px * 4 * 4) / 3 / 2 ** 20).toFixed(1);
    return { badges: items.filter((it) => it.badge).length, info: stage.renderer.info.memory, uniqueTextures: seen.size, textureMiB: mib(pixels), engravingMiB: mib(engraving) };
  });
  console.log(brand, JSON.stringify(r));
  await p.close();
}
await b.close();
```

```bash
node .superpowers/sdd/measure-wall.mjs | tee .superpowers/sdd/measure-before.txt
```

把输出写进任务报告（改动前）。`engravingMiB` 应接近 `徽章数 × 16 MiB`；如果和推算差很多，在报告里说明。测量完先不要删 `window.__measure` 这一行，Step 6 还要再测一次。

- [ ] **Step 3: 写失败测试**

`tests/badge.test.js` 末尾加（Node 环境没有画布，测的是尺寸记录；占位贴图和换贴图在浏览器里由 Step 6 验证）：

```js
describe('背面刻字的尺寸', () => {
  it('默认 1024；传 engraving: 0 表示先挂占位贴图', () => {
    const cfg = byId('first-session');
    expect(buildBadge(cfg, brand, unlocked).getObjectByName('back').userData.engravingSize).toBe(1024);
    expect(buildBadge(cfg, brand, unlocked, { engraving: 0 }).getObjectByName('back').userData.engravingSize).toBe(0);
    expect(buildBadge(cfg, brand, unlocked, { engraving: 2048 }).getObjectByName('back').userData.engravingSize).toBe(2048);
  });
});
```

（`byId`、`brand`、`unlocked` 是这个测试文件里已有的辅助变量；名字不同时按文件实际情况改。）

```bash
npx vitest run tests/badge.test.js
```

Expected: FAIL，传 `0` 和 `2048` 时仍记录为 1024。

- [ ] **Step 4: 引擎支持占位贴图**

`src/engine/engraving.js` 末尾加：

```js
let placeholder = null;

/**
 * 还没生成刻字时挂的 1×1 占位贴图，所有徽章共用（userData.shared，disposeBadge 不释放）。
 * 和真刻字一样是三张、色彩空间相同，所以换成真刻字时着色器不用重新编译。
 */
export function placeholderEngraving() {
  if (!placeholder) {
    const make = (srgb) => {
      const tex = canvasTexture(makeCanvas(1), { srgb });
      tex.userData.shared = true;
      return tex;
    };
    placeholder = { map: make(true), bumpMap: make(false), roughnessMap: make(false) };
  }
  return placeholder;
}
```

`src/engine/badge.js`：
1. 从 `./engraving.js` 的 import 里加上 `placeholderEngraving`。
2. `buildBadge` 的签名改为 `export function buildBadge(rawConfig, brand, state, { lang = 'zh', engraving = 1024 } = {})`，JSDoc 加一行 `@param {number} [options.engraving]  背面刻字贴图边长；0 表示先挂共用的占位贴图，打开时再生成（陈列墙用）`。
3. 刻字贴图那几行改为：

```js
  const engravingTex = typeof document === 'undefined' ? {} : engraving ? createEngraving({ ...engravingOpts, size: engraving }) : placeholderEngraving();
  const back = new Mesh(body.back, mat(backType, config.back.color, { ...engravingTex, bumpScale: 1.2, roughness: locked ? 0.85 : 0.62 }));
  back.name = 'back';
  // 近看时用 setEngravingSize 换成更清晰的版本；陈列墙先挂占位贴图，打开时才生成
  back.userData.engraving = engravingOpts;
  back.userData.engravingSize = engraving;
```

4. `setEngravingSize` 改为：

```js
/**
 * 换一套指定分辨率的背面刻字贴图；size 为 0 时释放刻字，换回共用的占位贴图。
 * 陈列墙的徽章平时只挂占位贴图，打开时生成 1024，停稳后换 2048，关闭时换回占位贴图。
 * @returns {boolean} 是否真的换了
 */
export function setEngravingSize(badge, size) {
  const back = badge?.getObjectByName('back');
  const opts = back?.userData.engraving;
  if (!opts || back.userData.engravingSize === size || typeof document === 'undefined') return false;
  const next = size ? createEngraving({ ...opts, size }) : placeholderEngraving();
  const m = back.material;
  for (const key of ['map', 'bumpMap', 'roughnessMap']) {
    if (!m[key]?.userData.shared) m[key]?.dispose();
    m[key] = next[key];
  }
  m.needsUpdate = true;
  back.userData.engravingSize = size;
  return true;
}
```

5. `disposeBadge` 的说明里「共用的（userData.shared：机身几何体、拉丝和底纹贴图）」改为「共用的（userData.shared：机身几何体、拉丝和底纹贴图、占位刻字贴图）」。

`src/viewer/mount-badge.js`：

```js
import { Group } from 'three';
import { buildBadge } from '../engine/badge.js';
```

函数体第一行改为 `const badge = buildBadge(config, brand, state, { lang, engraving });`，删掉 `if (engraving != null) setEngravingSize(badge, engraving);`。说明里 `engraving：背面刻字贴图边长（不传就用默认）` 改为 `engraving：背面刻字贴图边长（不传用 1024；0 表示先挂占位贴图）`。

```bash
npx vitest run
```

Expected: 全部通过。

- [ ] **Step 5: 只有陈列墙先挂占位贴图**

`src/app/badges.js` 的 `ensureBuilt` 改为：

```js
    /** 按需组装 3D 徽章；缩略图和单枚查看共用同一份。背面刻字先挂占位贴图，打开时才生成（缩略图只拍正面）。 */
    ensureBuilt(item) {
      if (item.holder) return item;
      return Object.assign(item, mountBadge(item.config, brand, item.state, { stage, lang, engraving: 0 }));
    },
```

`src/app/inspect.js`：
- `open` 里切换到另一枚时：`setEngravingSize(inspector.current.badge, 1024);` 改为 `setEngravingSize(inspector.current.badge, 0);`
- `open` 里 `ensureBuilt(item);` 之后加一行：`setEngravingSize(item.badge, 1024); // 打开时才生成刻字，停稳后渲染循环再换成 2048`
- `close` 的延时回调里：`setEngravingSize(item.badge, 1024); // 离开近看，换回省显存的版本` 改为 `setEngravingSize(item.badge, 0); // 关上后释放刻字，换回共用的占位贴图`

`src/app/loop.js` 不用改（停稳后换 2048 的逻辑不变）。

- [ ] **Step 6: 验证**

```bash
npx vitest run
node scripts/visual.mjs capture .superpowers/sdd/visual/task-7-after
node scripts/visual.mjs compare .superpowers/sdd/visual/task-7-before .superpowers/sdd/visual/task-7-after
node .superpowers/sdd/measure-wall.mjs | tee .superpowers/sdd/measure-after.txt
```

Expected:
- 视觉回归全部一致，包括缩略图和全部背面截图。
- 改动后 `engravingMiB` 接近 0（只剩占位贴图），`uniqueTextures` 明显减少。把改动前后的数字一起写进任务报告。

然后删掉 `src/app/badges.js` 里的 `window.__measure = { stage, items };`，确认它没有进入提交：

```bash
grep -rn "__measure" src
```

Expected: 没有输出。

```bash
npm run build
npm run check:browser
```

Expected: 全部通过（含打开、导出 PNG 和获得动画）。

- [ ] **Step 7: 同步文档并提交**

AGENTS.md 约定 17 末尾、` — \`tests/badge.test.js\`` 之前加：`; the wall builds badges with a shared placeholder engraving and generates the real one only while a badge is open`。

CONTRIBUTING.md 视觉回归那一条，括号里的列表末尾加 `, badge backs from the inspector`。

```bash
npx vitest run
git add -A src tests AGENTS.md CONTRIBUTING.md
git status --short
git commit -m "perf: wall badges carry a shared placeholder engraving; the real one is made on open and freed on close

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 浏览器检查进入 CI

**问题**：6 个被跟踪的脚本写死了 Mac 上的 Chrome 路径和只在 Mac 有效的显卡参数，页面层的检查无法在 CI 运行。CI 现在只做构建、单元测试和打包检查。

**Files:**
- Create: `scripts/browser.mjs`、`tests/browser.test.js`
- Modify: `scripts/shoot.mjs`、`scripts/visual.mjs`、`scripts/peek.mjs`、`scripts/check-site.mjs`、`scripts/check-shelf.mjs`、`scripts/assets.mjs`
- Modify: `.github/workflows/ci.yml`
- Docs: `AGENTS.md`、`CONTRIBUTING.md`

**Interfaces:**
- Consumes: 任务 7 之后的 `scripts/visual.mjs`。
- Produces（`scripts/browser.mjs`）：
  - `chromePath(env = process.env, platform = process.platform): string`
  - `chromeArgs(env = process.env, platform = process.platform): string[]`
  - `launchChrome(options = {}): Promise<Browser>`

- [ ] **Step 1: 写失败测试**

新建 `tests/browser.test.js`：

```js
import { describe, expect, it } from 'vitest';
import { chromeArgs, chromePath } from '../scripts/browser.mjs';

// 各检查脚本共用的 Chrome 启动参数：Mac 用真实显卡，其他系统（CI 的 Linux）用软件渲染
describe('浏览器启动参数', () => {
  it('CHROME_PATH 优先', () => {
    expect(chromePath({ CHROME_PATH: '/opt/chrome' }, 'linux')).toBe('/opt/chrome');
  });
  it('Mac 用 Metal 显卡', () => {
    expect(chromeArgs({}, 'darwin')).toEqual(['--use-angle=metal', '--enable-gpu']);
  });
  it('Linux 用 SwiftShader 软件渲染', () => {
    expect(chromeArgs({}, 'linux')).toEqual(['--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
  });
  it('CHROME_GL=software 可以在 Mac 上复现 CI 的软件渲染', () => {
    expect(chromeArgs({ CHROME_GL: 'software' }, 'darwin')).toEqual(['--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
  });
});
```

```bash
npx vitest run tests/browser.test.js
```

Expected: FAIL，找不到 `scripts/browser.mjs`。

- [ ] **Step 2: 实现公共启动函数**

新建 `scripts/browser.mjs`：

```js
// 启动无头 Chrome，供检查、截图和素材脚本共用。
// 路径：环境变量 CHROME_PATH 优先，否则按系统查找常见的安装位置。
// 显卡：Mac 用真实显卡（Metal）；其他系统（如 CI 的 Linux）用 SwiftShader 软件渲染。
// CHROME_GL=software 可以在 Mac 上强制软件渲染，用来在本机复现 CI。
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CANDIDATES = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'],
};

export function chromePath(env = process.env, platform = process.platform) {
  if (env.CHROME_PATH) return env.CHROME_PATH;
  const found = (CANDIDATES[platform] ?? []).find((p) => existsSync(p));
  if (!found) throw new Error('没有找到 Google Chrome：安装后重试，或用环境变量 CHROME_PATH 指定路径');
  return found;
}

export function chromeArgs(env = process.env, platform = process.platform) {
  const software = env.CHROME_GL === 'software' || platform !== 'darwin';
  return software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu'];
}

export const launchChrome = (options = {}) => chromium.launch({ executablePath: chromePath(), headless: true, args: chromeArgs(), ...options });
```

```bash
npx vitest run tests/browser.test.js
```

Expected: PASS。

- [ ] **Step 3: 六个脚本改用它**

每个脚本删掉自己的 `chromium.launch({ … })` 和 `CHROME` 常量，改为 `import { launchChrome } from './browser.mjs';` 加 `const browser = await launchChrome();`。如果脚本里不再直接用 `chromium`，把 `import { chromium } from 'playwright-core';` 删掉。

- `scripts/shoot.mjs`（第 13–14 行）
- `scripts/visual.mjs`（第 13、20 行）
- `scripts/peek.mjs`（第 6 行；原来只传 `--use-angle=metal`，统一后多一个 `--enable-gpu`，这是一次性截图工具，可以接受）
- `scripts/check-site.mjs`（第 27–31 行）
- `scripts/check-shelf.mjs`（第 35–39 行）
- `scripts/assets.mjs`（第 16–20 行）

本地未跟踪的 `scripts/promo.mjs` 不在仓库里，不用改。

```bash
grep -rn "Google Chrome.app\|use-angle\|chromium.launch" scripts --include='*.mjs' | grep -v "^scripts/browser.mjs" | grep -v "^scripts/promo"
```

Expected: 没有输出。

- [ ] **Step 4: 本机用真实显卡跑一遍**

```bash
npx vitest run
npm run build
npm run check:browser
npm run check:shelf
npm run build:site
npm run check:site
node scripts/visual.mjs capture .superpowers/sdd/visual/task-8-after
node scripts/visual.mjs compare .superpowers/sdd/visual/task-7-after .superpowers/sdd/visual/task-8-after
```

Expected: 各项检查通过；视觉回归全部一致（启动参数在 Mac 上没有变化）。`task-7-after` 必须是同一天拍的；若已跨日，先在任务 8 开始前的提交上重新拍一份基线再比。

- [ ] **Step 5: 本机用软件渲染复现 CI**

```bash
CHROME_GL=software npm run check:browser
CHROME_GL=software npm run check:site
```

Expected: 通过。若因为软件渲染较慢而超时，只调大对应的等待时间（例如 `waitForFunction` 的 `timeout`），不删减任何检查项；若某项检查在软件渲染下结果确实不同（不是变慢），在报告里列出该检查、现象和原因，交给主控决定。

- [ ] **Step 6: CI 新增页面检查**

`.github/workflows/ci.yml` 在 `jobs:` 下、`test:` 之后加一个任务：

```yaml
  browser:
    # 页面层的冒烟检查：示例数据、软件渲染。像素级的视觉回归依赖真实显卡，只在本机运行（scripts/visual.mjs）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: check:browser
        run: |
          npx vite --port 5199 --strictPort &
          for i in $(seq 1 60); do curl -sf http://localhost:5199/ > /dev/null && break; sleep 1; done
          npm run check:browser
      - run: npm run build:site
      - run: npm run check:site
```

（GitHub 的 `ubuntu-latest` 自带 Google Chrome，位于 `/usr/bin/google-chrome`。）

- [ ] **Step 7: 同步文档并提交**

AGENTS.md：
- Commands 表 `check:browser` 一行结尾 `Needs \`npx vite --port 5199\` running and Google Chrome` 改为 `Needs \`npx vite --port 5199\` running and Google Chrome (found automatically; \`CHROME_PATH\` overrides, \`CHROME_GL=software\` reproduces CI)`。
- Commands 表下方 `npm run dev` 那段之后加一句：`CI runs \`check:browser\` and \`check:site\` on Linux with software rendering; \`scripts/visual.mjs\` compares pixels, needs a real GPU and runs only locally.`
- 确认 AGENTS.md 仍不超过 150 行。

CONTRIBUTING.md：
- 「Requires Node.js 22.15 or later. Browser checks also need Google Chrome.」改为 `Requires Node.js 22.15 or later. Browser checks also need Google Chrome, found automatically (set \`CHROME_PATH\` if it lives elsewhere). Browser scripts launch it through \`scripts/browser.mjs\`.`
- 视觉回归那一条末尾加：`It needs a real GPU, so it runs only locally; CI runs \`check:browser\` and \`check:site\` with software rendering (\`CHROME_GL=software\` reproduces that locally).`

```bash
npx vitest run
git add -A scripts tests .github AGENTS.md CONTRIBUTING.md
git status --short
git commit -m "ci: shared Chrome launcher; check:browser and check:site run in CI with software rendering

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: 停下，交给主控**

不要推送。在任务报告里写明本机两种渲染方式的检查结果，然后结束。主控会征得用户同意后再推送分支，观察 CI 的新任务是否通过；若 CI 失败，由主控另派修复。
