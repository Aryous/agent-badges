# 全解锁徽章 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一枚按陈列馆徽章规则设计的「全解锁徽章」，替换概览区的进度铸币。它是实时 3D 的：进场时一片片拼出品牌伙伴，跨过阶段时外圈金属升级、撒花，可以拖动翻到背面，点开能看详情。

**Architecture:**
- engine：新增两项通用能力（背面浮雕、不带刻字的背面板），材质记下自己的色板键。
- brands：用陈列馆的版式部件生成全解锁徽章的配置（静态版和动画版）。
- viewer：新增一个自带舞台的实时铸币组件。
- app：接到概览区和单枚查看。

**Tech Stack:** vanilla ES modules, three.js 0.186.1, Vite 8, Vitest, playwright-core（`scripts/browser.mjs`）。

**Spec:** `docs/superpowers/specs/2026-10-24-completionist-badge-design.md`。

**参考实现：** `.superpowers/sdd/completionist-lab-reference.html`。这是用户在浏览器里确认过的原型，几何、常量、动画节奏都以它为准，但它的临时手法要换成 spec「实现约束」里的正式做法。

## Global Constraints

- 分层：`engine → engine`；`brands → brands`（只能用 Node 自带模块，不能用 DOM）；`viewer → viewer, engine, data, brands`；app 可以用 viewer。由 `tests/contracts.test.js` 检查。
- 全解锁标准：当前品牌全部徽章（含限定），n = 该品牌 `badges.length`。
- 阶段：k ≥ ⌈n/4⌉ 铜，≥ ⌈n/2⌉ 银，≥ ⌈3n/4⌉ 金，k = n 完成（星芒外形）；更少是锡。
- 主色 `midnight`，辅色 `sand`，点缀为品牌原色，金属为阶段金属（外圈、细线圈、小珠、文字、圆盘描边、月桂、星、王冠都随阶段变）。
- 环带里只用同心圆，不跟着外形起伏，不和外形相交、相切：细线圈 0.83 → 小珠 0.785 → 文字 0.69 → 圆盘 0.56。
- 细的 `ring` 倒角必须小于半宽。
- 不碰 `~/.agent-badges`、`~/.claude`、`~/.codex`；只用示例数据或临时目录。
- `coin-lab.html` 和 `.superpowers/` 不提交，`git add` 只写具体文件。
- 提交信息末尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。不推送。

---

### Task 1: engine — 背面浮雕、不带刻字的背面板、材质的色板键

**Files:**
- Modify: `src/engine/badge.js`
- Modify: `src/engine/validate.js`
- Test: `tests/`（在现有 engine 测试旁边加，或新建 `tests/back-relief.test.js`）

**Interfaces:**
- Produces:
  - `config.backRelief?: ReliefItem[]`：和 `relief` 同格式，装在背面，从背面看方向正确（参考实现里的做法是绕 y 轴转 π，几何上等价于镜像）。
  - `config.back.engraving === false`：背面板不挂刻字贴图（包括占位贴图），只用 `mat(config.back.material, config.back.color)`。
  - 每个由色板键生成的材质（外圈、面层、背面板、浮雕）都有 `material.userData.colorKey = <色板键>`。共用的材质同样标记。
  - `validateBadge` 用检查 `relief` 的规则检查 `backRelief`，包括底纹、材质、颜色键是否存在。
  - `disposeBadge` 也释放背面浮雕。
  - 锁定状态下背面浮雕的处理和正面浮雕一致（用 locked 材质）。

- [ ] **Step 1:** 先写失败的测试：
  - 带 `backRelief` 的配置组装后，背面多出对应数量的网格，并且位于背面一侧（z < 0）；
  - `back.engraving: false` 时背面板材质没有 `map` / `bumpMap` 刻字贴图；
  - 外圈和浮雕材质的 `userData.colorKey` 等于配置里的色板键；
  - `validateBadge` 能报出 `backRelief` 里未注册的颜色键。
- [ ] **Step 2:** 跑测试，确认失败。
- [ ] **Step 3:** 实现。把浮雕的组装抽成一个函数，正面和背面共用，不要复制一份循环。
- [ ] **Step 4:** `npm test` 全部通过；现有徽章的渲染不受影响（不带新字段时行为完全不变）。
- [ ] **Step 5:** 提交：`feat(engine): back relief, plain back plate, materials remember their palette key`。

### Task 2: brands — 全解锁徽章的配置

**Files:**
- Create: `src/brands/shared/completionist.js`：共用版式，包括同心环、文字、分隔符位置、戳记、月桂、星、阶段划分、配置生成。
- Create: `src/brands/claude-code/completionist.js`：马赛克（`CLAWD`）、眼睛、像素王冠、`PLUS` 分隔符、背面伙伴、点缀材质。
- Create: `src/brands/codex/completionist.js`：点阵格点表常量、点阵马赛克、矢量王冠、圆点分隔符、背面伙伴（`codexMark`）、点缀材质。
- Modify: `src/brands/claude-code/brand.js`、`src/brands/codex/brand.js`：新增色板键（`pewter`、`ghost`、`dimBand`、`stage`；Codex 另加 `ramp0`…`ramp15`）。
- Modify: `src/brands/index.js`：`BRANDS` 每项加 `completionist`（品牌部件）。
- Test: `tests/completionist.test.js`。

**Interfaces:**
- Produces:
  - `STAGE_METALS = ['pewter', 'bronze', 'silver', 'gold']`。
  - `stageOf(unlocked, total) → 0..3`：完成也返回 3。
  - `isComplete(unlocked, total)`。
  - `completionistConfig(kit, { unlocked, total, metal?, anim? = false }) → { config, parts? }`：
    - `kit` 是 `BRANDS[i].completionist`；
    - `metal` 默认 `STAGE_METALS[stageOf(...)]`；
    - 静态版：按 k 只放该显示的亮片或残影，下弧写 `${k} OF ${n}`，完成时用星芒外形加王冠、写 `COMPLETIONIST`；
    - `anim: true`：圆形外形，亮片和残影各放全套，下弧文字 0..unlocked 各放一份，`parts = { lit: number[], ghost: number[], counts: number[], tileCenters: [x, y][] }`，都是 `config.relief` 里的下标。亮片的几何在原点生成，中心记在 `tileCenters`，方便原地缩放弹出。
  - 配置带 `id: 'completionist'`、`title: '全解锁'`、`en: { title: 'Completionist' }`、`description`、`en.description`（文案见 spec）、`backRelief`、`back: { material: 'enamel', color: 'midnight', engraving: false }`。
  - 品牌部件 `kit` 的字段，名字由你定，在报告里列出：`id`、`name`（弧形文字）、`tiles()`、`eyes?()`、`crown(y)`、`separator(x)`、`hero()`、`accent`（材质 + 颜色键）。

- [ ] **Step 1:** 先写失败的测试：
  - 两个品牌 × 阶段 0..3 × 完成形态，`validateBadge` 都通过；
  - Claude Code 马赛克 108 片；
  - Codex 格点表和用 engine `svgShapes` 加奇偶规则点在多边形内判断重新算的结果一致；
  - `stageOf` 的边界：n = 32 时 7→0、8→1、16→2、24→3、32→3；n = 30 时 7→0、8→1、15→2、23→3；
  - 动画版的 `parts` 下标指向的条目种类和数量正确；
  - 静态版亮片数 = round(T × k / n)；
  - 环带的同心环半径和 spec 一致，细线圈的 bevel 小于半宽。
- [ ] **Step 2:** 跑测试，确认失败。
- [ ] **Step 3:** 实现。几何照参考实现里的 `clawdTiles`、`codexTiles`、`laurel`、`leaf`、`crown`、`backRelief`、`frontConfig`。用 Task 1 的 `backRelief` 和 `back.engraving: false`，不要再造第二枚徽章翻过来当背面。可以复用 `medallion`、`MEDALLION_H`，`textRing` 的分隔符写法也可以参照。
- [ ] **Step 4:** `npm test` 全部通过，包括分层契约测试。
- [ ] **Step 5:** 提交：`feat(brands): completionist badge config (mosaic companion, stage metals, laurel back)`。

### Task 3: viewer + app — 概览区的实时铸币

**Files:**
- Create: `src/viewer/completionist.js`：`createCompletionistCoin({ canvas, kit, brand, unlocked, total, reducedMotion }) → { dispose() }`。它自带舞台（`createStage`），负责进场时间轴、阶段金属渐变、火花、扫光、摆动、拖动和吸附、IntersectionObserver 启停，以及减少动态效果时的处理。
- Modify: `src/viewer/award-animation.js`：把 `burst` 抽成导出的共用函数，参数是 `stage, tweens, { x, y, r }, colors, { count, spread }`。获得动画改用它，行为不变。
- Modify: `src/viewer/profile.js`、`src/styles/profile.css`、`src/styles/responsive.css`：figure 里放画布，保留刻度环兜底；去掉 `setCoin(src)`，换成挂画布的接口；figure 加 `role="img"` 和 aria-label。
- Modify: `src/app/thumbnails.js` 或 `src/app/overview.js`：去掉旧铸币，在概览区挂上实时铸币。挂在哪里由你判断，并说明理由。
- Modify: `src/viewer/i18n.js`：aria-label、阶段名的中英文。
- Delete: `src/engine/coin.js`、`tests/coin.test.js`、`src/viewer/coin.js`。
- Modify: `scripts/shoot.mjs` 的铸币检查：画布存在；aria-label 里的 k 等于页面上的解锁数。
- 文档里引用旧铸币的地方同步改掉（先 grep）。

**Interfaces:**
- Consumes: Task 2 的 `completionistConfig`、`stageOf`、`STAGE_METALS`、`BRANDS[i].completionist`；Task 1 的 `material.userData.colorKey`。
- 动画参数全部照 spec「交互」一节和参考实现。
- 动画版用 `metal: 'stage'` 组装，按 `userData.colorKey === 'stage'` 找材质并改颜色。
- 完成时换成静态完成形态（`metal: 'gold'`）。

- [ ] **Step 1:** 抽出 `burst`；跑现有测试，确认获得动画没有变化。
- [ ] **Step 2:** 写 `createCompletionistCoin`。
- [ ] **Step 3:** 接到概览区，删除旧铸币；切换品牌时按新品牌重建（看现有的品牌切换方式）。
- [ ] **Step 4:** 更新 shoot.mjs。`npm test` 和 `npm run check:browser` 全部通过。
- [ ] **Step 5:** 截图存到 `$S/completionist/`，`$S` = `/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/vitrine`：
  - 桌面中文首屏：进场中一张，结束后一张；
  - 手机 390px 宽中文首屏；
  - 英文首屏；
  - 2 倍放大的铸币。

  对照参考实现逐项看：同心环不相交、马赛克、阶段金属、下弧文字。用 `?source=mock`。
- [ ] **Step 6:** 提交：`feat: live completionist coin in the overview (mosaic intro, stage upgrades, sparks, drag to flip)`。

### Task 4: 点开全解锁徽章

**Files:**
- Modify: `src/app/inspect.js`（以及需要的 `src/viewer/describe.js`、`src/viewer/i18n.js`）。
- Modify: 概览区：点击铸币或键盘 Enter / Space 时发出打开事件。
- Modify: `scripts/shoot.mjs`：点开铸币后，标题是「全解锁」。

**Interfaces:**
- Consumes: Task 2 的静态配置；Task 3 的概览区画布和 figure。
- 单枚查看里，全解锁徽章是一个临时 item：
  - `config` = 当前阶段的静态配置；
  - `state = { unlocked: k > 0, earnedAt: 完成时为最后一枚的解锁日期，否则 null, tier: null, progress: { current: k, target: n } }`。
  - 不进陈列墙的 items，也不算进总数。
- 显示内容：
  - 标题「全解锁」/ Completionist；
  - 说明（spec 文案）；
  - 进度条 k / n，后面加「· 下一阶段：银，还差 x 枚」，英文同理；
  - 已完成时进度条隐藏，副标题写完成日期；
  - 「重播」按钮播放获得动画。
- 不能破坏现有徽章的单枚查看。

- [ ] **Step 1:** 先写失败的测试（describe 或文案层能测的部分）。
- [ ] **Step 2:** 实现。
- [ ] **Step 3:** `npm test`、`npm run check:browser` 全部通过，截图打开后的单枚查看，看正面和背面。
- [ ] **Step 4:** 提交：`feat: open the completionist badge in the inspector`。
