# 架构整理（第一期）：徽章与统计层 — 设计规格

- 日期：2026-10-21
- 状态：已确认
- 第二期（另行设计）：拆分 `src/main.js`、`bin/agent-badges.mjs`、`src/style.css`

## 目标

以后加一枚徽章时，要碰的地方少而明确；同一件事只有一份实现；徽章外观完全不变。

## 1. 徽章目录：一枚徽章一个文件

```
src/brands/
  index.js              品牌注册表
  shared/
    layout.js           标准圆章、文字环、圆盘、around、缩放、MEDALLION_H
    top-tier.js         顶级三款（topVariants、withTopTier、topTierFromLast）
    parts.js            画面零件（终端、烟花、灯笼、日历、沙漏、纸飞机、气球、表盘……）
    pixel-art.js        共用像素图（十字、月牙、雪花）
    fit.js              不依赖 three 的内切半径
    text.js             中英文字选择、刻字
  claude-code/
    brand.js            色板与刻字
    mascot.js           像素小怪物与配件（原 helpers.js + pixel-art.js）
    app-icon.js         功能系列的 App 图标骨架（从 features.js 抽出）
    <系列>/index.js     系列名（中英）+ 徽章顺序
    <系列>/<徽章 id>.js 一枚徽章：配置 + 专属像素图 + 英文文案（config.en）
    index.js            汇总各系列：export SERIES、export default badges
  codex/
    brand.js
    mark.js             Codex 标志与配件（原 helpers.js + icons.js）
    <系列>/…            同上
    index.js
```

- 删除：`series/more.js`、`series/*.js`（拆成目录）、`en.js`、`helpers.js`、`badges.js`、`shared/medal.js`、`shared/art.js`。
- 英文文案写在徽章自己的文件里（`en: { title, description }`），系列的英文名写在系列的 `index.js`。
- 新增一枚徽章：在系列目录里新建一个文件，再在该目录的 `index.js` 里加一行。

## 2. 统计层去重

- `src/data/hash.js`：唯一的 FNV-1a 实现，导出 `hash32`（数字）和 `fnv1a`（8 位十六进制）。`normalize.js`、两个统计模块都从这里取。
- `claude-code-metrics.js` 改用 `metrics-common.js` 的 `localDate`、`addDays`、`weekday`、`cumulative`、`firstDate`、`streaks`、`once`、`tiered`，删除自己的重复实现。
- `codex-metrics.js` 不再从 `claude-code-metrics.js` 导入。
- 清理闪光款残留：`firstAt` 字段、`normalizeProgress` 的品牌参数、`tokenTopVariants` 别名。

## 3. 保证不变

- **外观**：改造前把两个品牌所有徽章、每一级、每一款 `resolveTier` 后的完整配置（含中英文案、系列信息）导出为 JSON，改造后再导出，必须完全一致。
- **统计**：原有统计测试全部通过；在同一份本地数据副本上，改造前后的账本和进度完全一致。
- **打包**：新增常驻测试，从命令行入口出发沿静态 import 走一遍，所有被加载的文件都必须在 `package.json` 的 `files` 清单里，且不引用 three。

## 4. 测试与文档

- 测试按模块命名：`new-badges-metrics.test.js` 拆进 `metrics-common.test.js` 与两个品牌的统计测试；`top-tiers-and-shapes.test.js` 拆进 `tiers.test.js`、`shapes.test.js`、`layout.test.js`。
- 重写 README（中英）「新增一枚徽章」：目录约定、标准圆章、零件库、设计原则与版式检查。

## 不包含

- 旧徽章的外形调整（19 枚不合规清单，逐个决定后另做）。
- 页面、命令行、样式表的拆分（第二期）。
