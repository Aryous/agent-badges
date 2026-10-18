# Agent Badges

Apple Watch 运动徽章风格的 3D 成就徽章，用 three.js 程序化生成。首个品牌是 Claude Code。

## 运行

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # 输出单文件 dist/index.html，可直接双击打开
npm test               # 单元测试
npm run check:browser  # 浏览器实测（需先 npm run dev -- --port 5199），截图在 screenshots/
```

页面参数：

- `#first-session`：打开后直接查看某一枚徽章。
- `?preview=unlocked` / `?preview=locked`：临时把全部徽章显示为已解锁或未解锁，方便设计时预览。

交互：拖动可以旋转，快速甩动会带惯性；按方向键也能转动，按 Esc 返回。

## 结构

```
src/
├─ engine/     徽章引擎：只认配置，不含任何品牌信息
├─ brands/     品牌包：色板、刻字模板、徽章配置
├─ data/       进度数据接口（目前是模拟数据）
└─ viewer/     场景、陈列墙、单枚查看、获得动画、PNG 导出
```

## 新增一枚徽章

在 `src/brands/<品牌>/badges.js` 里加一份配置即可，不用改引擎。

- **轮廓**：`circle` / `polygon` / `starburst`
- **材质**：`enamel` / `polished-metal` / `brushed-metal` / `ceramic`
- **浮雕基元**：`capsule` / `circle` / `ring` / `path`（SVG 路径）
- **坐标**：以徽章中心为原点，外接半径约为 1。
- **颜色**：写品牌色板里的键名，不要直接写色值。

配置会在启动时校验，写错的字段会在开发模式下直接显示在页面上。

## 新增一个品牌（如 Codex）

1. 新建 `src/brands/codex/brand.js`（色板和刻字模板），以及 `badges.js`。
2. 在 `src/data/progress.js` 的 `SOURCES` 里注册它的数据源。
3. 在 `src/main.js` 里切换要加载的品牌。

## 接入真实数据

只需实现一个返回 `ProgressMap` 的异步函数，并替换 `src/data/progress.js` 里对应品牌的 source。格式见该文件顶部的注释。
