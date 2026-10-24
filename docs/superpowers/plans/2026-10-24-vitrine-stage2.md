# 陈列柜第二段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成陈列柜重设计的第二段：
- 热力图做成午夜蓝珐琅板；
- 板子下面藏一只年度铸币套装（抽屉式滑盖、皮质拉环）；
- 徽章分区标题改成细双线，加页脚；
- 弹层换成新的变量。

**Architecture:** 只改样式和少量模板，不改数据和交互。
- 热力图：改 `src/viewer/heatmap.js` 的取色和模板，以及 `src/styles/heatmap.css`。
- 分区和页脚：按原计划 Task 6。
- 弹层：按原计划 Task 7。

**Spec:** `docs/superpowers/specs/2026-10-24-vitrine-wall-design.md`。最后一节「修正：第二段开工前」优先，其次是第 4–7 节。

**原计划：** `docs/superpowers/plans/2026-10-24-vitrine-wall.md` 的 Task 5–8。下面每个任务写明沿用哪一段、改哪些地方。

**参考实现（都不提交）：**
- `.superpowers/sdd/heatmap-lab-reference.html`：方案 B，以及方案 C 的月章和 `centerStack`；
- `.superpowers/sdd/proof-set-lab-reference.html`：方案 (c) 和 `case2`；
- `.superpowers/sdd/pull-lab-reference.html`：方案 5，皮质拉环。

## Global Constraints

- 已删除的变量不能再用：`--gold-line` → `--pewter-line`；`--gold-bright` → `--gold`；`--metal-gold`、`--metal-edge`、`--ink-on-metal`、`--bg-sunk` 不再出现（胶囊、按钮由 `controls.css` 统一处理）。
- 热力图保留元素标记：`.heat-cell`、`data-date`、`.is-unlock`、`.heat-years`、`.heat-brand`、`data-id`、`aria-pressed`。交互不变：悬停看详情，点金边圆点打开徽章，年份切换，工具开关至少留一个。
- 手机：热力图在板内横向滚动，看今年时滚到最右；页面本身不出现横向滚动。
- 不改徽章渲染。
- `npm test`、`npm run check:browser` 全部通过；不放宽功能判断。
- 不碰 `~/.agent-badges`、`~/.claude`、`~/.codex`。`git add` 只写具体文件；`coin-lab.html`、`heat-lab.html`、`.superpowers/`、`.impeccable/` 不提交。
- 提交信息末尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。不推送。

---

### Task 1: 热力图 · 午夜蓝珐琅板

**Files:**
- Modify: `src/viewer/heatmap.js`：取色、模板、图例、统计行的范围文字。
- Modify: `src/styles/heatmap.css`、`src/styles/responsive.css`。
- Modify: `src/viewer/i18n.js`：统计行的范围，比如「两个工具合计」/「Both tools」，以及单个工具时写工具名。
- Test: `tests/heatmap.test.js`（新建）。

**Interfaces:**
- `cellBackground(parts)` 改为在品牌色和板上的凹点色 `#0d1538` 之间混色：
  - 混色比例按等级取 `[0, 0.38, 0.58, 0.8, 1]`；
  - 一个工具时返回纯色；
  - 两个工具时返回 `linear-gradient(90deg, A 0 50%, B 50% 100%)`；
  - 没有活动时返回凹点色。

  输出的颜色格式由你定（rgb 或 hex），测试按你的格式写。

- [ ] **Step 1:** 先写失败的测试：
  - 等级 4 的单个工具等于品牌色本身；
  - 等级 1 明显更接近凹点色；
  - 两个工具时是 90° 的左右各半；
  - 空的时候是凹点色；
  - 统计行的范围文字：两个工具都开、只开一个时各是什么。
- [ ] **Step 2:** 跑测试，确认失败。
- [ ] **Step 3:** 实现：
  - 板、点阵、图例、控件按 spec「修正：第二段开工前 · 热力图」做，数值照参考实现方案 B；
  - 点阵撑满板宽：电脑上圆点 14px、间距 5px（spec「热力图的尺寸」）；
  - 图例：每个工具显示它自己的色阶，和点阵用同一个取色函数；不用中性色阶；
  - 年份胶囊和工具开关在板上要看得清（spec 里有原则）；
  - 悬停浮层换颜色；
  - 原计划 Task 5 里仍然适用的部分照做，比如未来日子和占位格的处理、`.heat-scale-unlock` 图例、浮层里的解锁标记，但颜色一律按新的。
- [ ] **Step 4:** `npm test` 和 `npm run check:browser` 全部通过。
- [ ] **Step 5:** 截图存到 `$S/stage2/`，`$S` = `/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/vitrine`：
  - 桌面中文、英文的热力图区域；
  - 热力图 2 倍放大；
  - 手机 390px 宽；
  - 只开一个工具时；
  - 悬停浮层；
  - Codex 页面。

  逐张对照参考实现方案 B 看，确认：
  - 左右双色在实际尺寸下分得清；
  - 金边清楚但不拥挤；
  - 控件在板上看得清。

  用 `?source=mock`。
- [ ] **Step 6:** 提交：`style: heatmap as a midnight enamel plate (sunk dots, enamel fills, left/right split, gold ring on unlock days)`。

### Task 2: 年度铸币套装（抽屉式滑盖 + 皮质拉环）

**Files:**
- Create: `src/viewer/proof-set.js`：月章（SVG）、礼盒、滑盖交互。
- Modify: `src/viewer/heatmap.js`：在板子下面挂上礼盒；共用取色函数、当前年份、开着的工具和悬停浮层；拉环。
- Modify: `src/styles/heatmap.css`，或者新建 `src/styles/proof-set.css` 并接入入口样式，二选一，说明理由。
- Modify: `src/styles/responsive.css`、`src/viewer/i18n.js`：月章的文字说明、礼盒名、拉环的开 / 关文字、月份。
- Test: `tests/proof-set.test.js`（新建）。

**Interfaces:**
- 纯函数，放在 viewer 或 data 层，能在 node 下测：
  - `monthSums(daily[], year)`：每个月的 Token；
  - `monthTier(sum, maxSum)`：返回 0..3，以当年最多那个月的 1/4、1/2、3/4 为界；
  - `mintedMonths(...)`：有活动且已经开始的月份；
  - 铭牌状态文字：今年 `MINTING · n / 12`，往年 `SEALED · 12.31`。
- 取色和热力图共用一个函数（Task 1 的 `cellBackground` 或者它背后的混色），不复制一份。

- [ ] **Step 1:** 先写失败的测试：
  - 分级的边界；
  - 空月份不铸币；
  - 今年和往年的铭牌文字；
  - 只开一个工具时只算那个工具；
  - 铸币直径的计算：按高度算，有下限，电脑上的典型高度约 120px。
- [ ] **Step 2:** 跑测试，确认失败。
- [ ] **Step 3:** 实现：
  - 版式、尺寸、交互、无障碍、减少动态效果全部按 spec「年度铸币套装」；
  - 打开、关上走同一条路（先抬起再滑，收回时先滑回再放下）；
  - 只裁上沿；
  - 月章中间文字用视觉居中；
  - 礼盒和板子一样高；
  - 留足呼吸。
- [ ] **Step 4:** `npm test` 和 `npm run check:browser` 全部通过。在 `scripts/shoot.mjs` 里加一项：点拉环后礼盒展开，`aria-expanded="true"`，月章数和有活动的月份数一致；再点一下，原路关上。
- [ ] **Step 5:** 截图存到 `$S/stage2/proof-set/`：
  - 电脑：关着、打开中、打开后；
  - 手机 390px：关着、打开；
  - 往年（2025）；
  - 只开一个工具；
  - 月章 2 倍放大。

  逐张看，对照参考实现：铸币清楚、留白够、两者一样高、拉环像皮革。
- [ ] **Step 6:** 提交：`feat: yearly proof set under the heatmap plate (leather pull, slide-out drawer, month medals)`。

### Task 2b: 热力图第二版与礼盒修正

按 spec「热力图第二版与礼盒修正」做。参考实现：`.superpowers/sdd/heat-lab2-reference.html`，用户选的组合是：年份 A 步进、统计行保留一行、午夜蓝、金边收细。实验页里的取色、年份数据、`#console` 都是实验用的，不要照搬。

**Files:**
- Modify: `src/viewer/heatmap.js`：标题行、年份步进、图例开关、圆点原地更新、统计行。
- Modify: `src/styles/heatmap.css`、`src/styles/responsive.css`。
- Modify: `src/viewer/proof-set.js`、`src/styles/proof-set.css`：去掉竖排，礼盒永远和板子一样高；托盘横向滑动；窄铭牌竖条。
- Modify: `src/viewer/i18n.js`：删掉不用的 `heat.brighter`、`heat.scopeBoth`、`heat.scopeAll`、`heat.sub`（如果确实没人用）；`heat.summary` 去掉 `{scope}`；加上一年 / 下一年的按钮名字、工具开关组的名字。
- Modify: `src/site/strings.js`：落地页说明里的「小圆点」/「a dot」改成金边圆圈，「一格两色」写明左右各半。
- Modify: `scripts/shoot.mjs`：检查跟着新结构改，不放宽判断。
- Test: `tests/heatmap.test.js`、`tests/proof-set.test.js`。

**必须保留的标记：**
- `.heat-cell`、`data-date`、`.is-unlock`（当前开着的工具里有人那天解锁）；
- `.heat-years`：放在年份步进的外层；
- `.heat-brand`、`data-id`、`aria-pressed`、`.heat-brand-name`：放在图例开关按钮上。

**Interfaces:**
- 删掉 `summaryScope` 和它的测试。
- `caseLayout({ width, plateHeight })` 改为返回 `{ coin, narrow }`：
  - `coin = min(120, floor((plateHeight − 2·pad − 2·trayY − gap) / 2))`；
  - `narrow = width < 700`；
  - 不再有 `stacked`、`cols`、`rows`、`height`。
- 板子的最小高度由 `CASE` 算出（铸币 120px 时的高度），作为 CSS 变量给板子用，不要在 CSS 里另写一个魔法数字。
- 热力图对外的接口（`plate`、`partsOf`、`markersOn`、`onChange`、`showTip`、`hideTip`）不变。

- [ ] **Step 1:** 先写失败的测试：
  - `caseLayout` 在 1440、820、390 宽度下礼盒高度都等于板子（也就是只返回 coin 和 narrow）；
  - coin 不超过 120；
  - `heat.summary` 不再带范围。
- [ ] **Step 2:** 跑测试，确认失败。
- [ ] **Step 3:** 实现，照 spec 和参考实现：
  - 圆点用 `@property --a / --b`，切换工具只改变量和类名，不重建 `innerHTML`；换年份才重建，并淡出淡入；
  - 金边收细：点阵、图例、浮层同时改；
  - 浮层左右不再贴板框：限制在板子内容区里（电脑 30px、手机 18px），不是 8px。
- [ ] **Step 4:** `npm test`、`npm run check:browser`、`npm run check:site`、`npm run build:site` 全部通过。`shoot.mjs` 里：
  - 年份：点步进切到 2025 再切回；到头的一侧 `aria-disabled="true"`；
  - 工具开关：在图例里点，至少留一个；
  - 切换工具前后同一个圆点还是同一个 DOM 节点（证明没有重建）；
  - 铸币套装：1440、820、390 三个宽度，打开中途和打开后盒子高度都等于板子高度，托盘 6 列；820 和 390 下托盘可以横向滑动，页面不横向溢出；
  - 原来那条「手机 3 列、比板子高」的检查删掉，换成上面这条；
  - 减少动态效果时，盒子高度没有过渡。
- [ ] **Step 5:** 截图存到 `$S/stage2/heat-v2/`：电脑中英文、只开一个工具、切换工具的过程中（约 0.25 秒）、年份 2025、820 和 390 宽度关着和打开、浮层。逐张对照参考实现，确认：
  - 金边不叠；
  - 拉环和第一排铸币之间至少 16px；
  - 标题行不再臃肿。
- [ ] **Step 6:** 提交：`feat: heatmap v2 (legend toggles, year stepper, fading dots, finer rings); proof set always matches the plate`。

### Task 3: 徽章分区与页脚

照原计划 Task 6 做（`docs/superpowers/plans/2026-10-24-vitrine-wall.md` 第 1487 行起），改动如下：
- `.series-head::after` 的双线用 `var(--pewter-line)`；
- 页脚链接的下划线用 `var(--pewter-line)`，悬停用 `var(--gold)`；
- `.tile:hover` 的背景用 `rgba(239, 236, 228, 0.04)`，不用金色；
- 原计划里其余引用旧变量的地方，同样按 Global Constraints 换掉。

页脚要像一页的结尾：最后一排徽章之后留足空白，然后是细双线、正中四角星，下面一行版权页式的小字。

验证照原计划 Step 4，外加 `npm run check:browser`。

提交：`style: series heads on a double rule; colophon footer with build-time version`。

### Task 4: 弹层换成新的变量

照原计划 Task 7 做（第 1638 行起），改动如下：
- 表格里的 `var(--gold-line)` 一律换成 `var(--pewter-line)`；
- 单枚查看里 `.tier-ladder li`、`.title-en`、`.hint` 的 `--faint` 改成 `--dim`；
- 全解锁徽章的单枚查看要一起看：标题、副标题、进度条后面的「下一阶段」文字。

验证照原计划 Step 5，截图单枚查看（普通徽章和全解锁徽章各一）、导出面板、海报弹窗。

提交：`style: dialogs, inspector and export panel use the vitrine tokens`。

### 评审节点 B（主控执行）

1. 本地服务开着，把页面在浏览器里打开给用户预览（用户偏好）。
2. 按原计划 Task 8 做最终验证。徽章渲染零变化那一项改为：全解锁徽章以外的 299 张和基线一致；基线要重拍，因为日期变了。
3. impeccable `critique`，两个 Opus 子代理。
4. 合并和发布由用户决定。
