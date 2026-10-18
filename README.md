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
- `?preview=unlocked&tier=0`：分级徽章预览指定等级（0 铜、1 银、2 金、3 白金），不写 `tier` 时默认显示最高级。

交互：拖动可以旋转，快速甩动会带惯性；按方向键也能转动，按 Esc 返回。

导出：在单枚查看界面点「导出图片」打开面板，可以选择透明或墨色背景。面板打开时，徽章后面会显示导出的取景范围；导出的是徽章当前朝向（正面或背面）。

## 陈列墙

按系列分组：里程碑、连续与习惯、功能探索、限定与彩蛋，共 19 枚。

- 墙上的徽章是页面加载时用同一个 3D 引擎渲染的静态图，悬停时用 CSS 做倾斜和高光。
- 点开某一枚后才进入实时 3D，关闭后渲染循环会停下。

## 结构

```
src/
├─ engine/     徽章引擎：只认配置，不含任何品牌信息
├─ brands/     品牌包：色板、刻字模板、徽章配置
│  └─ claude-code/
│     ├─ helpers.js     共用构图：文字环、中心圆盘、小怪物、配件定位
│     ├─ pixel-art.js   小怪物等共用像素图
│     └─ series/        每个系列一个文件
├─ data/       进度数据接口（目前是模拟数据）
└─ viewer/     场景、陈列墙、单枚查看、获得动画、PNG 导出
```

## 新增一枚徽章

在 `src/brands/<品牌>/series/` 下对应系列的文件里加一份配置即可，不用改引擎。

- **轮廓**：`circle`（可加 `reeded` 滚花边）、`polygon`（八边形、圆角方形等）、`starburst`、`shield`、`gear`
- **材质**：`enamel`、`polished-metal`、`brushed-metal`、`ceramic`、`anodized`（阳极氧化铝）、`holographic`（全息镭射）、`crystal`（水晶宝石）
- **浮雕基元**：
  - `capsule`：胶囊形线条
  - `circle`：圆片，可用作中心圆盘
  - `ring`：圆环
  - `pixels`：像素图，用字符画描述，`'#'` 为实心
  - `text-arc`：沿上弧或下弧排布的立体文字
  - `text`：水平排布的立体文字，用于中心的大数字
  - `gem`：多面切割的宝石
  - `path`：SVG 路径
- **底纹**：在 `face` 层或浮雕上加 `pattern: 'sunburst' | 'rings'`，珐琅下面就会有放射纹或同心细纹。
- **叠放**：浮雕上的 `z` 表示在正面板之上再抬高多少，用于把图案放在中心圆盘上。
- **分级**：写 `tiers: [{ threshold, metal, label, accent? }]`。造型里用占位符：
  - `'$metal'`：当前等级的金属色
  - `'$accent'`：当前等级的珐琅色
  - `'{label}'`：当前等级的文字

  引擎会按数据算出等级，并逐级校验配置。
- **隐藏**：`hidden: true`。未解锁时正面只显示像素问号，标题显示为 `???`。

设计时的截图工具：

```bash
node scripts/peek.mjs "http://localhost:5199/?preview=unlocked" out.png <徽章id> [角度]
```

- 角度传 `3.14159` 截背面。
- 角度传 `hold:0.6` 会把徽章钉在斜角，用来检查全息等材质的侧面效果。
- **坐标**：以徽章中心为原点，外接半径约为 1。
- **颜色**：写品牌色板里的键名，不要直接写色值。

配置会在启动时校验，写错的字段会在开发模式下直接显示在页面上。

## 新增一个品牌（如 Codex）

1. 新建 `src/brands/codex/brand.js`（色板和刻字模板），以及 `badges.js`。
2. 在 `src/data/progress.js` 的 `SOURCES` 里注册它的数据源。
3. 在 `src/main.js` 里切换要加载的品牌。

## 文字环字体

文字环的字形来自 [Outfit](https://fonts.google.com/specimen/Outfit) Bold（SIL Open Font License 1.1），由 `node scripts/build-font.mjs` 提取成 `src/engine/fonts/ring-font.json`。

- 要换字体或补充字符，改这个脚本后重新运行即可。
- 配置里用了字体里没有的字符时，校验会直接报错。

## 品牌素材

Claude Code 像素小怪物按 [simple-icons](https://simpleicons.org/) 中的 Claude Code 图标逐格还原（`src/brands/claude-code/pixel-art.js`）。商标归 Anthropic 所有，本项目仅用于个人成就展示；公开发布前请先查看品牌使用规范。

## 接入真实数据

只需实现一个返回 `ProgressMap` 的异步函数，并替换 `src/data/progress.js` 里对应品牌的 source。格式见该文件顶部的注释。
