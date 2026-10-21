# 架构定型（第二期）、文档与新徽章 skill — 设计规格

- 日期：2026-10-21
- 状态：设计已确认，待评审规格
- 前置：第一期（一枚徽章一个文件、统计层去重）已完成，见 `2026-10-21-architecture-phase1-design.md`
- 顺序：先代码定型（第 1–3 节），再文档与 skill（第 4–5 节）

## 目标

README 和代码是一个整体：文档里写下的每条约定，都有代码结构或测试保证它成立。具体来说：

- 每个事实只写一处：工具列表、徽章门槛。
- 大文件按职责拆开：页面主程序、命令行、样式表。
- 一份给 AI 的 `AGENTS.md`、一份给人的 `CONTRIBUTING.md`、一份只给用户的 README。
- 一个仓库内的 `add-badge` skill，让任何贡献者（人或 AI）按同一套规范加徽章。

外观、统计结果、命令行输出、自动化接口全部不变。

## 0. 审计结论（动机）

| 问题 | 后果 |
| --- | --- |
| README「新增一枚徽章」没写要在统计模块加规则 | 照做的徽章永远锁着，不报错（`normalize.js` 把缺数据当 0） |
| 工具 id 列表手写在约 9 处：`bin` 两处、`summary.js`、`vite.config.js`、`progress.js` 三张表、`studio.js`、`assets.mjs` | README「新增一个工具」漏掉约 8 处；漏了 `BRAND_INFO` 会在 `summarize` 里报 TypeError |
| 每个门槛数字最多写 6 次：配置、统计代码、中英说明、圆环刻字、示例数据、README 表 | 配置里的 `criteria.target` 实际没人读，只作缺数据时的兜底 |
| 全勤月配置写 22，真实门槛是当月工作日数 | 只是碰巧和 2026 年 10 月一致 |
| `data/normalize.js` 引用 `engine/tiers.js`；`daily.js` 有 `TURNS_FIELD`；`metrics-common.js` 有 `LAUNCH_DATES` | 分层越界；品牌知识写进了通用层 |

今天 62 枚徽章的 id 在配置、统计、示例数据三处一致，但没有任何测试保证。

## 1. 约定收口

### 1.1 工具列表只有一份

- 根注册表：`src/brands/index.js` 的 `BRANDS`。它不依赖 three，已经在 `files` 里，命令行可以加载。新增导出 `BRAND_IDS`、`brandById(id)`。
- 每个 `brand.js` 新增 `launchDate`（Claude Code `2025-02-24`，Codex `2025-04-16`），取代 `metrics-common.js` 的 `LAUNCH_DATES`。
- 由注册表推出，不再手写：
  - `collect/summary.js` 的 `BRAND_INFO`：`Object.fromEntries(BRANDS.map(e => [e.brand.id, e]))`，继续从这里导出。
  - 命令行 `--brand` 校验和帮助文本里的 `<claude-code|codex>`。
  - collect 命令的「采集前快照」。
  - `vite.config.js` 开发服务器的数据注入。
  - `scripts/assets.mjs`。
- 各层仍保留自己的、按 id 索引的表，都不向上引用：
  - collect：`COLLECTORS`。每个采集模块导出 `BRAND_ID`、`turnsField`、`collect()`。
  - data（浏览器端）：`progress.js` 的三张表合并为一个 `DATA_SOURCES = { [id]: { mock, mockDaily, source } }` 并导出；`project/studio.js` 和 `assets.mjs` 改为引用它。
- 由测试保证 `BRANDS`、`COLLECTORS`、`DATA_SOURCES`、`BRAND_INFO` 的 id 集合完全相同。

### 1.2 徽章门槛只写在配置里（规则按 id 登记）

- 每个统计模块导出 `RULES`：键是徽章 id，值是 `(ctx, badge) => progress`。
  - `ctx` 提供预先算好的 `dates`、`days`、`today`、`ledger`、`brand`，以及 `first`、`maxOf`、`cumulative` 等辅助函数。
  - 规则从 `badge.criteria.target` 或 `badge.tiers` 读门槛，不写数字字面量。
- `computeProgress(ledger, badges, today)` 签名不变，改成遍历 `badges`，逐个调用 `RULES[badge.id]`。
  - 某枚徽章没有对应规则：抛错。
  - 有规则但没有这枚徽章：由测试拦下。
- 删除 `criteria.metric`，它一直没被使用。`criteria` 只保留 `target`，以及可选的 `unit`（例如马拉松 `{ target: 4, unit: 'h' }`，规则内部换算成分钟）。
- 门槛随时间变化的徽章写 `criteria: { target: 22, dynamic: true }`，`target` 只作显示兜底，真实门槛由规则计算。目前只有全勤月。`validate.js` 接受这个字段。
- 周年和工具生日的参数分别取自 `criteria`（365 天）和 `brand.launchDate`。
- 示例数据可以省略 `target`，由 `normalize` 从配置补齐。

### 1.3 分层归位

| 改动 | 原因 |
| --- | --- |
| `tierIndexFor` 从 `engine/tiers.js` 移到 `src/data/tiers.js`（引擎自身不用它，只有 `normalize.js` 和测试用），`tests/tiers.test.js` 跟着改引用 | data 不再依赖 engine；`files` 不再需要带上 `src/engine/tiers.js` |
| 删除 `engine/tiers.js` 的 `TIER_NAMES` | 没人用，和 `brands/shared/text.js` 重复 |
| `daily.js` 的 `TURNS_FIELD` 删除，由采集器经 `saveBrand(..., { turnsField })` 传入，`dailySeries(ledger, field)` | 通用模块里不放品牌知识 |
| `metrics-common.js` 的 `LAUNCH_DATES` 删除，改用 `brand.launchDate` | 同上 |
| 更新 `brands/index.js` 里过时的「如何加工具」注释，改为指向 CONTRIBUTING | 文档与代码一致 |

允许的依赖方向（AGENTS.md 的分层表也照此写）：

| 层 | 可以引用 |
| --- | --- |
| `engine/` | engine、three、json |
| `brands/` | brands |
| `data/` | data、brands（只取配置） |
| `collect/` | collect、data、brands |
| `cli/` | cli、collect、data、brands |
| `viewer/` | viewer、engine、data、brands、three |
| `app/`、`site/`、`project/`、`tools/` | 任意（入口层） |

### 1.4 契约测试：`tests/contracts.test.js`

1. **徽章覆盖**：每个品牌 `Object.keys(RULES)` 的集合等于徽章 id 的集合；空账本上 `computeProgress` 返回的 key 也等于这个集合。
2. **注册表一致**：`BRANDS`、`COLLECTORS`、`DATA_SOURCES`、`BRAND_INFO` 的 id 集合相同；每个品牌都有 `launchDate`。
3. **门槛一致**：对每枚一次性的非 `dynamic` 徽章，在刚好达到 `criteria.target` 的构造账本上解锁，差 1 时不解锁；`progress.target === criteria.target`；中英文说明里都出现这个数字（按 `unit` 换算后）。布尔型徽章（target 1）只测解锁。
4. **分层**：沿静态 import 遍历，检查 1.3 的依赖方向表。
5. **不手写 id**：`src/`、`bin/`、`vite.config.js` 中，除 `brands/<id>/`、`collect/<id>.js` 和带 `// showcase` 标记的展示文件外，不出现 `'claude-code'` 或 `'codex'` 字面量。
6. **展示列表有效**：site、promo、`assets.mjs` 里挑选的 `{ brand, id }` 都存在。

文档同步类测试见第 5 节。

## 2. 拆分大文件

### 2.1 页面主程序 `src/main.js` → `src/app/`

```
src/app/
  context.js        createContext()：固定值（params, lang, PUBLIC, forceMock, available, brand, configs, series, task）
                    + 运行时（items, progress, stage, tweens, accum, ensureBuilt, $）+ on/emit
  preview.js        applyPreview(configs, progress, { preview, tier })，纯函数
  brand-select.js   selectBrand(params, data)
  topbar.js         mountTopbar(ctx, source)：品牌标签、语言切换、数据来源
  load.js           loadAll(ctx) → { valid, progress, heatSeries, markers, currentDaily, notices }
  badges.js         createItems(ctx, valid, progress)
  overview.js       mount(ctx) → { profile, heatmap }
  wall.js           mount(ctx) → { grid, setFilter }
  thumbnails.js     renderThumbnails(ctx, { grid, profile, inspect }) → Promise
  modal.js          createModal(el, closeBtn)：打开关闭、Esc、遮罩、焦点恢复（海报、陈列图共用）
  poster.js         mount(ctx, { thumbsDone, profile, heatmap, heatSeries, markers }) → { open, get url }
  shelf.js          mount(ctx) → { open, get url }，含 ?task=shelf 握手
  inspect.js        mount(ctx, { exportPanel, loop }) → { open, close, get current }
  export-panel.js   mount(ctx, inspector) → { set, isOpen, place, exportCurrent }
  loop.js           createLoop(ctx, inspector) → { start, stop }
  automation.js     expose(ctx, parts)：window.__badgeApp
src/main.js         约 60 行，按原顺序组装
```

- 面板之间只通过 `ctx.emit('open' | 'close' | 'poster' | 'shelf')` 通信，不互相 import。当前打开的徽章由检视器持有，通过 `ctx.inspect.current` 暴露。
- viewer 层顺手修：
  - `fmtDate` 只留一份。
  - `describeState` 从 `viewer/grid.js` 移到 `viewer/describe.js`。
  - 「把徽章装进 pivot/holder」重复了 6 处，抽成 `viewer/mount-badge.js`。
  - 删掉检视器里 `items` 的死循环。
  - `export.js` 拆成 `snapshot.js`（`renderBadgePNG`）和下载两部分。
  - `viewer/shelf.js` 和 `app/load.js` 的「加载所有品牌进度」共用 data 层的一个函数。
- 必须保持：
  - 时序：先创建 `thumbsDone` 再挂海报；按 hash 打开和按任务打开陈列图放在 `__badgeApp` 设置之后；缩略图完成后才设 `ready`。
  - 三个 `window keydown` 监听和一个 `document pointerdown` 监听，数量与注册顺序不变。
  - `__badgeApp` 的 15 个成员不变：`ready`、`ids`、`open`、`close`、`setAngle`、`hold`、`face`、`spin`、`exportPNG`、`openPoster`、`posterURL`、`openShelf`、`shelfURL`、`setFilter`、`heatmap`。其中 URL 类成员仍是 getter。
  - 陈列图握手：`shelfBusy ??=` 只执行一次；`brand` 参数覆盖 `only`；总是带上深色主题；后台标签页也能完成。
  - 公开页隐藏 `[data-shelf]`。

### 2.2 命令行 `bin/agent-badges.mjs` → `src/cli/`

```
bin/agent-badges.mjs        约 15 行：屏蔽 SQLite 实验警告，import { main, parseArgs } from '../src/cli/main.js'，
                            转发导出 parseArgs，isMain 守卫
src/cli/i18n.js             lang、t(zh, en)、detectLang(env)
src/cli/paths.js            ROOT、APP、pkg
src/cli/args.js             parseArgs、HELP（所有 flag 字面量都在这里）
src/cli/runtime.js          checkRuntime
src/cli/server.js           serve、openBrowser
src/cli/app.js              appTemplate、appHtml、publicPage、PROJECT_SITE
src/cli/main.js             main()：help/version → checkRuntime → collect → 分派
src/cli/commands/{collect,open,card,shelf,profile,publish}.js
```

- 分工：终端输出、文案、进程和 HTTP 服务只在 `cli/`；`collect/` 保持纯逻辑（不用 `console`，不用 `t()`）。
- `profile.js` 改用 `collect/publish.js` 已导出的 `SHELF_FILE`、`SHELF_LIGHT_FILE`。
- 命令模块用字面量路径 `import('./commands/x.js')`，打包检查的 import 遍历才能看到它们；采集器保持懒加载，Node 版本过低时才能显示友好提示。
- `package.json` 的 `files` 加 `src/cli/`。
- 测试改为从 `src/cli/args.js` 引用；`plugin.test.js` 改读 `src/cli/args.js` 检查 flag。
- 中英文 `--help` 输出改造前后逐字节一致。

### 2.3 样式表 `src/style.css` → `src/styles/`

- `src/style.css` 保留为唯一入口（`site/main.js` 引用它），内容改成按顺序 `@import`：
  `tokens.css`、`controls.css`、`topbar.css`、`profile.css`、`heatmap.css`、`wall.css`、`inspector.css`、`export.css`、`modal.css`、`notice.css`、`responsive.css`。
- 删除无用样式：`.labels`、`.label*`、`.tally`、`.is-hover`。
- 合并重复规则：`.heat`、`.heat-grid`、`.ring-fill`、`#stage-accum`、`.modal-foot`。合并时保持原来的层叠结果。
- 用 `scripts/shoot.mjs` 在改造前后截图做像素对比，差异必须为零。

## 3. 根目录与过时文字

- 移到 `tools/`：`studio.html`、`promo.html`、`src/promo/`。同时更新 `scripts/assets.mjs`、`scripts/promo.mjs`、`scripts/promo-audio.mjs` 里的路径和 `../` 引用。
- 留在原位：
  - `index.html`、`landing.html`：构建入口。
  - `plugin.json`、`.claude-plugin/`、`.agents/plugins/`、`skills/`、`assets/`：挪走会改变已安装用户的路径。
  - `vite.config.js`、`vite.site.config.js`。
- 修正过时文字：
  - `site/strings.js`：「铜到白金 / bronze to platinum」改为符合四级加顶级三款的说法。
  - `main.js` 注释里的 `tier=0..3`。
  - `collect/codex.js` 文件头补上 `archived_sessions`。

## 4. 文档

三份新文档（`AGENTS.md`、`CONTRIBUTING.md`、skill）只写英文一份。README 保持中英两份。

### 4.1 `AGENTS.md`（给 AI，150 行以内）

`CLAUDE.md` 只有一行 `@AGENTS.md`。结构：

1. 项目一句话说明，以及命令速查。
2. 地图：目录、职责和允许的依赖，即 1.3 的表。
3. 契约：编号列出，每条注明守护它的测试文件。例如「Tool list lives in `src/brands/index.js` — `tests/contracts.test.js`」。
4. 工作流：
   - 加徽章：使用 `add-badge` skill。
   - 加工具：按注册表逐项列出。
   - 发版：改四处版本号，提交 `release: X`，打 tag，推送，由 GitHub Actions 发布；不手动 `npm publish`。
   - 不同改动对应的检查矩阵。
5. 数据边界：只读工具名、事件类型、时间戳和用量；不读对话内容、命令参数、文件路径；不读凭证和历史文件（逐个列出）。
6. 硬规矩：不提交视频；里程碑完成就提交。

### 4.2 `CONTRIBUTING.md`（给人）

承接 README 现有的开发内容并更新：

- 安装与 npm 命令。
- 浏览器检查的前提（开发服务器端口 5199）。
- 页面调试参数。
- 目录树。
- 加徽章：步骤摘要，并指向 skill。
- 加工具。
- 设计原则。
- 提交前的检查清单。

### 4.3 README（中英两份，只给用户）

新顺序：

1. 能得到什么
2. 隐私摘要（三句话，前置）
3. 安装
4. 快速开始
5. 展示到 GitHub 主页
6. 计数规则
7. 贡献（一行，链接到 CONTRIBUTING）
8. 致谢、免责声明、许可

`Development`、`Adding a badge`、`Adding a tool` 三节移出 README。

## 5. 新徽章 skill：`add-badge`

- 正本：`.agents/skills/add-badge/`（Codex 读取）。`.claude/skills/add-badge` 是指向它的相对软链接（Claude Code 读取）。由测试确认软链接解析到正本。
- 只给本仓库贡献者：不在 `package.json` 的 `files` 里，不进 `skills/`（那是随插件发布的用户 skill）。
- `SKILL.md` 的流程：
  1. 定系列和 id，查重。
  2. 确认数据来源：信号是否已在每日账本中，是否在隐私边界内。需要新字段时，连带改采集器、账本字段、泄露测试。
  3. 照模板写 `src/brands/<tool>/<series>/<id>.js`，使用 `medal()` 和 `shared/parts.js`。
  4. 在系列的 `index.js` 登记顺序。
  5. 在 `src/data/<tool>-metrics.js` 的 `RULES` 加规则，门槛从 `badge.criteria` 或 `badge.tiers` 读。
  6. 补 `DATA_SOURCES` 里的示例数据。
  7. 写中英文案，说明里的数字和门槛一致。
  8. 对照设计原则自查：用 `?preview=unlocked` 预览页和 `peek.mjs` 截图，交给人评审，评审通过才算完成。
  9. 运行 `npm test`、`npm run build`、`npm run check:browser`。
  10. 更新 README 计数规则表（数字由测试核对）。
- 附带：
  - `references/template.js`：一枚完整的标准徽章。
  - `references/parts.md`：形状、材质、浮雕、零件清单。
  - `references/design-principles.md`：四条原则，附正反例（来自 0.5.0 的评审：圆环和花瓣重叠、圆弧尖角混用、描边贴边）。

### 5.1 文档同步测试（`tests/docs.test.js`）

1. AGENTS.md 里每条契约引用的测试文件都存在。
2. AGENTS.md 和 CONTRIBUTING 里的目录树与实际 `src/` 下的目录一致。
3. README 中英两份里的徽章总数、各品牌数量，与注册表一致。
4. README 计数规则表里的工具生日日期等于 `brand.launchDate`。
5. CONTRIBUTING「加工具」列出的注册表与 1.4 第 2 条检查的表一致。
6. `.claude/skills/add-badge` 软链接有效，`SKILL.md` 提到的文件路径都存在。

## 6. 验证

每一步都按下面的方式确认「行为不变」：

- **配置快照**：62 枚徽章、每一级、每一款 `resolveTier` 后的完整配置，改造前后 JSON 完全一致。
  - 允许的差异：删掉的 `criteria.metric`、新增的 `dynamic` 和 `unit`。
- **统计结果**：在同一份本地数据副本上，改造前后的账本和进度完全一致。用 git worktree 跑旧代码对比。
- **界面**：截图像素对比；`__badgeApp` 成员清单不变；`--help` 输出逐字节一致。
- **检查全部通过**：`npm test`、`npm run build`、`npm run check:pack`、`npm run check:shelf`、`npm run check:browser`、`npm run build:site && npm run check:site`。

## 7. 执行顺序

每一步都单独可验证，完成即提交。

1. 注册表与分层归位（1.1、1.3），以及契约测试 2、4、5、6。
2. 规则按 id 登记（1.2），以及契约测试 1、3。
3. 命令行拆分（2.2）。
4. 页面主程序拆分与 viewer 修整（2.1）。
5. 样式表拆分（2.3）。
6. 根目录与过时文字（3）。
7. AGENTS.md、CLAUDE.md、CONTRIBUTING.md、README 重排（4）。
8. `add-badge` skill（5），以及文档同步测试（5.1）。

## 不包含

- 19 枚旧徽章的外形调整（版式检查里的 LEGACY 清单，逐个决定后另做）。
- 闪光款。
- 插件目录迁移、scripts 分组、`landing.html` 改名、合并两份 vite 配置。
- 新徽章或新工具。
