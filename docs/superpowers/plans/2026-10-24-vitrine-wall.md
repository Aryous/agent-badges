# 徽章墙「陈列柜」重设计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按设计规格 `docs/superpowers/specs/2026-10-24-vitrine-wall-design.md` 把徽章墙页面从「通用深色后台」改成与徽章同一套语言的「陈列柜」：近中性暖深底 + 顶光 + 细颗粒、金色强调、Outfit 字体、细双线与四角星、金属胶囊控件、3D 进度铸币、珐琅刻点热力图、页脚。

**Architecture:** 全部改动在页面层（`index.html`、`src/styles/`、`src/viewer/`、`src/app/`），加一个纯配置函数 `src/engine/coin.js`。铸币是一份普通的徽章配置，交给现有的 `buildBadge` 和统一渲染服务 `createBadgeRenderer().image()` 画成静态 PNG，不新建 WebGL 上下文、不新写几何体。所有颜色、字体、线条、胶囊样式先在 `tokens.css` / `controls.css` 定义成变量和通用类，各组件只引用它们。

**Tech Stack:** 原生 ES 模块、three.js 0.186.1、Vite 8（`vite-plugin-singlefile`，所有资源内联进 `dist/index.html`）、Vitest 5、playwright-core + 本机 Chrome（`scripts/shoot.mjs`、`scripts/visual.mjs`、`scripts/peek.mjs`）。

## Global Constraints

- 设计规格是唯一的需求来源：`docs/superpowers/specs/2026-10-24-vitrine-wall-design.md`。本计划给出的色值、尺寸是起点，评审节点可以微调；微调只改 `tokens.css` 的变量，不改用法。
- 只改页面层和 `src/engine/coin.js`。**不改**：已有徽章的 3D 渲染、缩略图、刻字；`src/viewer/poster.js`、`src/viewer/shelf.js` 的画布绘制；落地页（`landing.html`、`src/site/`）；任何数据、采集、CLI 代码。
- 分层规则不变（`tests/contracts.test.js`）：`engine` 只能依赖 `engine`；`viewer` 可依赖 `viewer, engine, data, brands`。`src/engine/coin.js` 不 import 任何东西。
- 保留浏览器检查依赖的元素标记：`.profile-count`（内含 `<b>` 解锁数）、`.heat-cell`、`data-date`、`.is-unlock`、`.is-pad`、`.is-future`、`.heat-years`、`.heat-brand`、`data-id`、`aria-pressed`、`[data-filter]`、`[data-wall-title]`、`[data-brands]`、`[data-lang-switch]`、`[data-source]`。
- 界面不再使用衬线体；`--serif` 变量删除。字体只用 Outfit（来自已有开发依赖 `@fontsource/outfit`，只打包 `latin` 子集的 500 和 700 两个 `woff2`）加系统中文字体。不引入网络字体、外部图片、新的运行时依赖。
- 金色是唯一的界面强调色：`--accent` 固定等于 `--gold`，不再按工具改写。工具品牌色（`brand.ui.accent`）只用于热力图和工具图例。
- 所有动画在 `prefers-reduced-motion: reduce` 下关闭。
- 正文与次要文字（`--text`、`--muted`）对 `--bg` 的对比度 ≥ 4.5:1。
- 每个任务结束时 `npm test` 全部通过并提交一次；提交信息结尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。不推送。
- 子代理不碰 `~/.agent-badges`、`~/.claude`、`~/.codex`；浏览器检查一律用示例数据（`?source=mock`）。开发服务器用端口 5199（`npx vite --port 5199 --strictPort`），已在运行就复用。
- 截图、对比图放在 scratchpad：`/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/vitrine/`（下文简称 `$S`）。

## 文件结构

| 文件 | 职责 | 任务 |
|---|---|---|
| `src/styles/tokens.css` | 字体声明、颜色/线条/金属变量、背景、全局字体 | 1 |
| `src/styles/controls.css` | 通用类：`.label`、`.rule`、`.star`、`.btn`、`.seg`（胶囊）、`.meter-*` 槽 | 1、2 |
| `src/viewer/seg.js`（新） | 胶囊滑块位置同步 `trackSegThumb` | 2 |
| `index.html` | 页眉标志与语言胶囊容器、页脚 | 2、6 |
| `src/app/topbar.js` | 语言胶囊两个选项；不再改写 `--accent` | 2 |
| `src/styles/topbar.css` | 页眉 | 2 |
| `src/engine/coin.js`（新） | 进度铸币的徽章配置 `coinConfig` | 3 |
| `tests/coin.test.js`（新） | 铸币配置与组装 | 3 |
| `src/viewer/coin.js`（新） | `renderCoin`：用统一渲染服务画铸币 | 4 |
| `src/viewer/profile.js`、`src/styles/profile.css` | 铭牌式概览、铸币与兜底刻度环 | 4 |
| `src/app/thumbnails.js` | 先画铸币再画缩略图 | 4 |
| `scripts/shoot.mjs` | 新增铸币检查 | 4 |
| `src/viewer/heatmap.js`、`src/styles/heatmap.css` | 珐琅刻点 | 5 |
| `src/styles/wall.css`、`src/app/colophon.js`（新）、`vite.config.js` | 分区双线、页脚与版本号 | 6 |
| `src/styles/inspector.css`、`modal.css`、`export.css`、`notice.css`、`responsive.css` | 弹层换变量 | 7 |

## 执行顺序与评审节点

- **第一段**：Task 1 → 2 → 3 → 4，然后 **评审节点 A**（由主控执行，不派实现子代理）：截图 + impeccable `critique` + 交给用户。用户认可后才进入第二段。
- **第二段**：Task 5 → 6 → 7 → 8（最终验证），然后 **评审节点 B**：截图 + impeccable `critique` + 交给用户。
- 合并到 main 和发布都等用户决定。

---

### Task 1: 设计基础（字体、颜色、背景、通用类）与改动前基线

**Files:**
- Modify: `src/styles/tokens.css`（整体替换 `:root` 和 `body` 规则，新增 `@font-face`）
- Modify: `src/styles/controls.css`（`.section-title`、新增 `.label`、`.rule`、`.star`、`.meter-track`/`.meter-fill`）
- Modify: `src/styles/inspector.css:72-85`（删除这里的 `.meter-track`/`.meter-fill`，移到 controls）
- Modify: `src/styles/topbar.css`、`src/styles/wall.css`、`src/styles/inspector.css` 中 `font-family: var(--serif)` 的三处
- Modify: `src/app/topbar.js:30`（删除改写 `--accent` 的一行）

**Interfaces:**
- Produces（后续任务都用）：CSS 变量 `--bg --bg-lift --bg-sunk --text --muted --faint --gold --gold-bright --gold-line --metal-gold --metal-edge --ink-on-metal --accent --line --font --label-track --label-track-zh --gutter`；通用类 `.label`、`.rule`（可带 `.has-star` 与子元素 `.star`）、`.star`、`.meter-track`、`.meter-fill`。

- [ ] **Step 1: 拍改动前的基线（后面所有比对都用它，必须在改任何代码之前、同一天拍）**

```bash
cd /Users/lucas/Documents/Code/agent-badges
S=/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/vitrine
mkdir -p $S
curl -sf http://localhost:5199/ >/dev/null || (nohup npx vite --port 5199 --strictPort > $S/vite.log 2>&1 &)
for i in $(seq 1 30); do curl -sf http://localhost:5199/ >/dev/null && break; sleep 1; done
node scripts/visual.mjs capture $S/visual-before
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/before-desktop.png
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/before-mobile.png "" "" 390 844
```

Expected: `299 张 → …/visual-before`，两张截图生成。记下 `visual.mjs` 的耗时不需要。

- [ ] **Step 2: 替换 `tokens.css` 开头到 `body` 规则结束的部分**

`src/styles/tokens.css` 中 `:root { … }` 和 `body { … }` 两条规则替换为下面的内容（`* {}`、`[hidden]`、`html, body`、`body.is-inspecting`、`#stage` 等其余规则保持不变）。文件第一行注释改为 `/* 设计变量、字体、全局重置、body 背景与 WebGL 画布 */`。

```css
/* 界面字体：徽章外圈用的 Outfit（OFL 1.1），只打包拉丁子集的 500 / 700；中文落到系统字体 */
@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('../../node_modules/@fontsource/outfit/files/outfit-latin-500-normal.woff2') format('woff2');
}

@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('../../node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff2') format('woff2');
}

:root {
  /* 底色：只微微偏暖、接近中性，色彩交给徽章的珐琅 */
  --bg: #141312;
  --bg-lift: #242220;
  --bg-sunk: #0d0c0b; /* 刻进去的槽、凹坑 */
  --text: #efece4;
  --muted: #a39e94;
  --faint: #66625b; /* 只用于不承载信息的装饰 */
  /* 金：界面唯一的强调色。比金级徽章的 #f2c46b 更沉，不和徽章抢 */
  --gold: #c9a45c;
  --gold-bright: #e6c887;
  --gold-line: rgba(201, 164, 92, 0.35);
  /* 金属滑块和主按钮：很轻的拉丝渐变 + 顶边一像素高光，只用于小面积 */
  --metal-gold: linear-gradient(180deg, #e8cd90 0%, #cfaa63 45%, #b38e48 55%, #c9a45c 100%);
  --metal-edge: inset 0 1px 0 rgba(255, 245, 220, 0.55), inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  --ink-on-metal: #1c1710;
  --accent: var(--gold);
  --line: rgba(239, 236, 228, 0.1);
  --font: 'Outfit', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif;
  --sans: var(--font);
  --label-track: 0.18em;
  --label-track-zh: 0.12em;
  --gutter: clamp(16px, 3vw, 32px);
  /* 细颗粒：128px 的平铺图，背景只栅格化一次，不对页面内容施加实时 filter */
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

body {
  /* 从上到下：细颗粒、顶光、四周暗角、底色 */
  background:
    var(--grain),
    radial-gradient(ellipse 70% 55% at 50% -8%, rgba(255, 238, 205, 0.075), transparent 70%),
    radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.35) 100%),
    var(--bg);
  background-color: var(--bg);
  background-attachment: fixed;
  color: var(--text);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: 在 `controls.css` 末尾加通用类，并改 `.section-title`**

`.section-title` 规则替换为：

```css
.section-title {
  margin: 0;
  font-family: var(--font);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
```

文件末尾追加：

```css
/* ---------- 徽章外圈的排法：字距拉开的小字 ---------- */

.label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: var(--label-track);
  text-transform: uppercase;
  color: var(--muted);
}

:lang(zh) .label {
  font-size: 12px;
  letter-spacing: var(--label-track-zh);
}

/* ---------- 细双线（徽章的金属双圈）；.has-star 在正中留出四角星的位置 ---------- */

.rule {
  --rule-gap: 0px;
  position: relative;
  height: 4px;
  background:
    linear-gradient(90deg, var(--gold-line) calc(50% - var(--rule-gap)), transparent calc(50% - var(--rule-gap)) calc(50% + var(--rule-gap)), var(--gold-line) calc(50% + var(--rule-gap))) top / 100% 1px no-repeat,
    linear-gradient(90deg, var(--gold-line) calc(50% - var(--rule-gap)), transparent calc(50% - var(--rule-gap)) calc(50% + var(--rule-gap)), var(--gold-line) calc(50% + var(--rule-gap))) bottom / 100% 1px no-repeat;
}

.rule.has-star {
  --rule-gap: 16px;
}

.rule > .star {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

/* 四角星：和徽章外圈两侧的星号同形 */
.star {
  display: inline-block;
  width: 12px;
  height: 12px;
  background: var(--gold);
  -webkit-mask: var(--star-mask) center / contain no-repeat;
  mask: var(--star-mask) center / contain no-repeat;
}

:root {
  --star-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 0C8.6 5.2 10.8 7.4 16 8 10.8 8.6 8.6 10.8 8 16 7.4 10.8 5.2 8.6 0 8 5.2 7.4 7.4 5.2 8 0Z'/%3E%3C/svg%3E");
}

/* ---------- 进度：刻进去的细槽，已完成部分填金 ---------- */

.meter-track {
  display: block;
  height: 3px;
  border-radius: 3px;
  background: var(--bg-sunk);
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.meter-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--gold);
}
```

- [ ] **Step 4: 删除 `inspector.css` 里原来的 `.meter-track` 和 `.meter-fill` 两条规则（第 72 行起），其他不动**

先确认它们的内容只有尺寸、圆角和颜色：`sed -n 70,90p src/styles/inspector.css`。如果其中有 controls 版本没有的属性（例如单枚查看里的宽度），把那个属性改写成 `.inspector .meter-track { … }` 保留在 inspector.css，其余删除。

- [ ] **Step 5: 去掉衬线体**

```bash
grep -n "var(--serif)" src/styles/*.css
```

把输出的每一处（topbar.css 的 `.brand-tab`、wall.css 的 `.series-title`、inspector.css 的一处）改成 `font-family: var(--font);`，并把同一规则里的 `font-weight` 改成 `700`（没有就加上）。再次 grep 应无输出。

- [ ] **Step 6: `--accent` 不再按工具改写**

`src/app/topbar.js` 删除这一行：

```js
  document.documentElement.style.setProperty('--accent', brand.ui.accent);
```

（保留下一行 `document.documentElement.dataset.brand = brand.id;`。）

- [ ] **Step 7: 验证对比度**

```bash
node -e "
const L=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]};
const r=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
for (const [n,c] of [['text','#efece4'],['muted','#a39e94'],['gold','#c9a45c']]) console.log(n, r(c,'#141312').toFixed(2));"
```

Expected: `text` 和 `muted` ≥ 4.5（`gold` 只用于装饰和大字，记录即可）。

- [ ] **Step 8: 构建、测试、截一张图**

```bash
npm test 2>&1 | grep -E "Tests|FAIL"
npm run build 2>&1 | tail -2 && grep -c "font/woff2" dist/index.html
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t1-desktop.png
```

Expected: 测试全过；`dist/index.html` 里能找到内联的 woff2（计数 ≥ 1）；截图里背景有顶光和暗角，文字是 Outfit（数字的「1」「7」可辨认为几何无衬线），没有衬线字。

- [ ] **Step 9: 提交**

```bash
git add src/styles src/app/topbar.js
git commit -m "style: vitrine foundation — near-neutral ground with top light and grain, gold accent, Outfit type, double rule and star

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 胶囊控件、按钮、页眉

**Files:**
- Create: `src/viewer/seg.js`
- Modify: `src/styles/controls.css`（`.btn`、`.btn-primary`、`.seg` 系列规则整体替换）
- Modify: `index.html:11-21`（页眉）
- Modify: `src/app/topbar.js`（语言切换）
- Modify: `src/viewer/i18n.js`（新增 `nav.lang`）
- Modify: `src/styles/topbar.css`（`.brand-mark`、`.brand-tabs`、`.brand-tab*`、`.brand-sub`、`.source`、`.lang-switch*` 替换）
- Modify: `src/app/wall.js`（筛选接入滑块）、`src/viewer/heatmap.js`（年份接入滑块）
- Modify: `src/styles/responsive.css`（减少动态效果）

**Interfaces:**
- Consumes: Task 1 的变量和 `.label`、`.star`。
- Produces: `trackSegThumb(el: HTMLElement, selector?: string): () => void`（返回手动同步函数）；`.seg` 胶囊（子元素是 `button[role=radio][aria-checked]` 或 `a[aria-current]`）。

- [ ] **Step 1: 新建 `src/viewer/seg.js`**

```js
// 胶囊控件的金属滑块：读出当前选中项的位置和宽度，写进 CSS 变量，滑块用 transition 滑过去。
// 选中项靠 aria-checked（页面内切换）或 aria-current（语言链接）标记。

/**
 * @param {HTMLElement} el  .seg 容器
 * @param {string} [selector]  当前项的选择器
 * @returns {() => void} 手动同步（内容变化后调用；属性变化和尺寸变化会自动同步）
 */
export function trackSegThumb(el, selector = '[aria-checked="true"]') {
  const sync = () => {
    const on = el.querySelector(selector);
    if (!on || el.hidden) {
      el.style.setProperty('--thumb-on', '0');
      return;
    }
    el.style.setProperty('--thumb-x', `${on.offsetLeft}px`);
    el.style.setProperty('--thumb-w', `${on.offsetWidth}px`);
    el.style.setProperty('--thumb-on', '1');
  };
  new MutationObserver(sync).observe(el, { subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-current'] });
  new ResizeObserver(sync).observe(el);
  el.classList.add('is-tracked');
  sync();
  // 第一次定位不播动画，之后的切换才滑动
  requestAnimationFrame(() => el.classList.add('is-ready'));
  return sync;
}
```

- [ ] **Step 2: 替换 `controls.css` 里的 `.btn`、`.btn:hover`、`.btn-primary`、`.btn-primary:hover`、`.seg`、`.seg button`、`.seg button:hover`、`.seg button[aria-checked='true']` 八条规则**

```css
.btn {
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--gold-line);
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, filter 0.2s ease;
}

.btn:hover {
  border-color: var(--gold);
  background: rgba(201, 164, 92, 0.08);
}

.btn-primary {
  border-color: transparent;
  background: var(--metal-gold);
  box-shadow: var(--metal-edge), 0 2px 6px rgba(0, 0, 0, 0.35);
  color: var(--ink-on-metal);
  font-weight: 700;
}

.btn-primary:hover {
  border-color: transparent;
  background: var(--metal-gold);
  filter: brightness(1.07);
}

/* 胶囊：刻在面板上的一道槽，当前项下面垫一块金属滑块（位置由 seg.js 写入） */
.seg {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  height: 32px;
  padding: 3px;
  border: 1px solid var(--gold-line);
  border-radius: 999px;
  background: var(--bg-sunk);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
}

.seg::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: 3px;
  bottom: 3px;
  left: var(--thumb-x, 3px);
  width: var(--thumb-w, 0px);
  border-radius: 999px;
  background: var(--metal-gold);
  box-shadow: var(--metal-edge), 0 1px 3px rgba(0, 0, 0, 0.4);
  opacity: var(--thumb-on, 0);
}

.seg.is-ready::before {
  transition: left 0.22s cubic-bezier(0.2, 0.7, 0.2, 1), width 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.seg button,
.seg a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: none;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--muted);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.seg button:hover,
.seg a:hover {
  color: var(--text);
}

.seg button[aria-checked='true'],
.seg a[aria-current] {
  color: var(--ink-on-metal);
  font-weight: 700;
}

.seg button[aria-checked='true'] .seg-count {
  opacity: 0.7;
}

/* 没接入滑块的胶囊（例如导出面板的背景选择）：选中项自己垫金属，不滑动 */
.seg:not(.is-tracked) button[aria-checked='true'] {
  background: var(--metal-gold);
  box-shadow: var(--metal-edge);
}
```

页面里一共三处 `.seg`：徽章筛选（`index.html` 的 `[data-filter]`）、热力图年份（`heatmap.js`）、导出面板的背景选择（`index.html` 第 96 行附近）。前两处在 Step 7 接入滑块；导出面板在弹层里、打开前是隐藏的，不接入，靠上面这条规则显示选中项。

并把同文件里 `.btn:focus-visible, .seg button:focus-visible, .btn-back:focus-visible` 这条规则的选择器补上 `.seg a:focus-visible`。

- [ ] **Step 3: 页眉标记**

`index.html` 第 11–21 行替换为：

```html
    <header class="topbar">
      <div class="brand">
        <i class="star brand-mark" aria-hidden="true"></i>
        <nav class="brand-tabs" data-brands data-i18n-aria="nav.brands"></nav>
        <span class="brand-sub label" data-i18n="app.sub"></span>
      </div>
      <div class="topbar-right">
        <span class="source label" data-source></span>
        <nav class="seg lang-seg" data-lang-switch></nav>
      </div>
    </header>
```

- [ ] **Step 4: `i18n.js` 两种语言各加一条（与 `nav.brands` 相邻）**

```js
    'nav.lang': '切换语言',
```

```js
    'nav.lang': 'Language',
```

- [ ] **Step 5: `topbar.js` 的语言切换改成两个选项**

在文件顶部加 `import { trackSegThumb } from '../viewer/seg.js';`，把「语言切换：链接到同一页面的另一种语言」那一段（`const sw = …` 到 `sw.lang = …;`）替换为：

```js
  // 语言切换：胶囊里并排「中」和「EN」，当前语言垫金属滑块；点另一侧跳到同一页面的另一种语言
  const sw = $('[data-lang-switch]');
  sw.setAttribute('aria-label', t('nav.lang'));
  for (const [code, label, hreflang] of [['zh', '中', 'zh-CN'], ['en', 'EN', 'en']]) {
    const a = document.createElement('a');
    const q = new URLSearchParams(location.search);
    q.set('lang', code);
    a.href = `?${q}${location.hash}`;
    a.textContent = label;
    a.lang = hreflang;
    if (code === lang) a.setAttribute('aria-current', 'true');
    sw.appendChild(a);
  }
  trackSegThumb(sw, '[aria-current]');
```

- [ ] **Step 6: `topbar.css` 替换品牌与语言相关规则**

删除 `.brand-mark`、`.brand-tabs`、`.brand-tab`、`.brand-tab:hover`、`.brand-tab.is-active`、`.brand-tab:focus-visible`、`.brand-sub`、`.source`、`.lang-switch`、`.lang-switch:hover` 这些规则，换成：

```css
.brand-mark {
  width: 14px;
  height: 14px;
  align-self: center;
}

.brand-tabs {
  display: flex;
  gap: 18px;
  pointer-events: auto;
}

.brand-tab {
  position: relative;
  padding: 2px 0 7px;
  font-family: var(--font);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--faint);
  text-decoration: none;
  transition: color 0.2s ease;
}

.brand-tab:hover {
  color: var(--muted);
}

.brand-tab.is-active {
  color: var(--text);
}

/* 当前工具：下面一道短金线 */
.brand-tab.is-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 18px;
  height: 1px;
  background: var(--gold);
  transform: translateX(-50%);
}

.brand-tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.brand-sub {
  align-self: center;
}

.source {
  color: var(--faint);
}
```

`.brand` 规则里的 `align-items: baseline` 改为 `align-items: center`，`gap: 10px` 改为 `gap: 14px`。`.topbar` 规则里的 `background` 改为 `linear-gradient(var(--bg) 55%, rgba(20, 19, 18, 0))`。`.source-link` 规则保留（颜色已经是 `var(--accent)`，即金色）。

- [ ] **Step 7: 筛选和年份接入滑块**

`src/app/wall.js`：顶部加 `import { trackSegThumb } from '../viewer/seg.js';`，在 `setFilter('all');` 这一行之后加：

```js
  trackSegThumb(filterEl);
```

`src/viewer/heatmap.js`：顶部加 `import { trackSegThumb } from './seg.js';`，在年份按钮循环（`for (const y of years) { … }`）结束之后加：

```js
  trackSegThumb(yearsEl);
```

- [ ] **Step 8: 减少动态效果**

`src/styles/responsive.css` 里 `@media (prefers-reduced-motion: reduce)` 块的选择器列表末尾加 `.seg.is-ready::before`，即：

```css
@media (prefers-reduced-motion: reduce) {
  .export-frame,
  .inspector .info,
  .inspector .btn-back,
  .seg.is-ready::before {
    transition: none;
  }
}
```

同文件 `@media (max-width: 640px)` 里 `.brand-tab` 规则改为：

```css
  .brand-tab {
    font-size: 16px;
    padding: 2px 0 6px;
  }
```

- [ ] **Step 9: 验证**

```bash
npm test 2>&1 | grep -E "Tests|FAIL"
npm run check:browser 2>&1 | grep -E "FAIL|通过"
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t2-desktop.png
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=en" $S/t2-desktop-en.png
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t2-mobile.png "" "" 390 844
```

Expected: 测试和浏览器检查全部通过；截图里页眉左侧是金色四角星，当前工具下有短金线，右侧语言胶囊当前语言垫金属滑块；「全部 / 已获得 / 未解锁」和年份切换是同一种胶囊；手机截图无横向溢出。打开 `t2-desktop.png` 和 `t2-mobile.png` 确认后再提交。

- [ ] **Step 10: 提交**

```bash
git add src/viewer/seg.js src/styles index.html src/app/topbar.js src/app/wall.js src/viewer/heatmap.js src/viewer/i18n.js
git commit -m "style: metal-thumb capsule controls, capsule buttons, header with star mark and language capsule

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 进度铸币的配置（`coinConfig`）

**Files:**
- Create: `src/engine/coin.js`
- Test: `tests/coin.test.js`

**Interfaces:**
- Produces: `coinConfig({ unlocked: number, total: number }): object`，返回一份可交给 `buildBadge(config, brand, state, { engraving: 0 })` 的徽章配置。凸点是 `relief` 里带 `role: 'lit' | 'dim'` 的 `circle` 项，数量等于 `total`，`lit` 的数量等于 `min(unlocked, total)`。`COIN_ID = 'progress-coin'`。

- [ ] **Step 1: 写失败的测试 `tests/coin.test.js`**

```js
import { describe, expect, it } from 'vitest';
import brand from '../src/brands/claude-code/brand.js';
import { buildBadge, disposeBadge } from '../src/engine/badge.js';
import { COIN_ID, coinConfig } from '../src/engine/coin.js';

const dots = (c) => c.relief.filter((r) => r.role);
const state = (unlocked, total) => ({ unlocked: true, earnedAt: null, progress: { current: unlocked, target: total } });

describe('进度铸币', () => {
  it('一枚徽章一个凸点，点亮的数量等于解锁数', () => {
    const c = coinConfig({ unlocked: 27, total: 32 });
    expect(c.id).toBe(COIN_ID);
    expect(dots(c)).toHaveLength(32);
    expect(dots(c).filter((d) => d.role === 'lit')).toHaveLength(27);
  });

  it('凸点从正上方开始顺时针排，已解锁的排在前面', () => {
    const d = dots(coinConfig({ unlocked: 3, total: 30 }));
    expect(d[0].center[0]).toBeCloseTo(0, 6);
    expect(d[0].center[1]).toBeGreaterThan(0);
    expect(d[1].center[0]).toBeGreaterThan(0); // 顺时针：第二颗在右边
    expect(d.slice(0, 3).every((x) => x.role === 'lit')).toBe(true);
    expect(d.slice(3).every((x) => x.role === 'dim')).toBe(true);
  });

  it('中央写解锁数，下方写总数', () => {
    const c = coinConfig({ unlocked: 27, total: 32 });
    const texts = c.relief.filter((r) => r.kind === 'text').map((r) => r.text);
    expect(texts).toEqual(['27', '/ 32']);
  });

  it('边界：全没解锁、全部解锁、解锁数超过总数时按总数算', () => {
    expect(dots(coinConfig({ unlocked: 0, total: 30 })).filter((d) => d.role === 'lit')).toHaveLength(0);
    expect(dots(coinConfig({ unlocked: 30, total: 30 })).filter((d) => d.role === 'dim')).toHaveLength(0);
    expect(dots(coinConfig({ unlocked: 40, total: 30 })).filter((d) => d.role === 'lit')).toHaveLength(30);
  });

  it('能用徽章引擎组装：外圈、滚花、正面、背面加上全部浮雕', () => {
    const c = coinConfig({ unlocked: 27, total: 32 });
    const g = buildBadge(c, brand, state(27, 32), { engraving: 0 });
    const names = g.children.map((m) => m.name);
    expect(names).toEqual(expect.arrayContaining(['rim', 'reeding', 'face', 'back']));
    expect(g.children.length).toBe(4 + c.relief.length);
    disposeBadge(g);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/coin.test.js`
Expected: FAIL，提示找不到 `../src/engine/coin.js`。

- [ ] **Step 3: 实现 `src/engine/coin.js`**

```js
// 概览区的进度铸币：一枚朴素的金币，边缘滚花；币面外圈一颗凸点代表一枚徽章，
// 已解锁的抛光凸起、未解锁的是暗色低点；中央凸起解锁数，下方小字写总数。
// 输出普通的徽章配置，交给 buildBadge 组装：材质、光照、字形都和徽章同一套。
// 颜色键名取自品牌色板（gold、onyx 两个品牌都有）。

export const COIN_ID = 'progress-coin';

/** 凸点所在圆的半径、凸点半径（徽章单位，外接半径 1）。 */
const DOT_RING = 0.74;
const DOT_RADIUS = 0.036;

/**
 * @param {{ unlocked: number, total: number }} opts
 * @returns {object} 徽章配置
 */
export function coinConfig({ unlocked, total }) {
  const lit = Math.max(0, Math.min(unlocked, total));
  const dots = Array.from({ length: total }, (_, i) => {
    // 从正上方开始顺时针
    const a = Math.PI / 2 - (i / total) * Math.PI * 2;
    const on = i < lit;
    return {
      kind: 'circle',
      role: on ? 'lit' : 'dim',
      center: [DOT_RING * Math.cos(a), DOT_RING * Math.sin(a)],
      radius: DOT_RADIUS,
      material: on ? 'polished-metal' : 'enamel',
      color: on ? 'gold' : 'onyx',
      height: on ? 0.034 : 0.008,
      bevel: on ? 0.012 : 0.003,
    };
  });
  return {
    id: COIN_ID,
    title: '解锁进度',
    en: { title: 'Progress' },
    shape: { type: 'circle', radius: 1, depth: 0.2, bevel: 0.045, reeded: { count: 180, depth: 0.01 } },
    layers: [
      { kind: 'rim', material: 'polished-metal', color: 'gold' },
      { kind: 'face', material: 'brushed-metal', color: 'gold', inset: 0.12, pattern: 'rings' },
    ],
    relief: [
      // 凸点圈内外各一道细线，像钱币的珠圈
      { kind: 'ring', radius: DOT_RING + 0.075, width: 0.01, material: 'polished-metal', color: 'gold', height: 0.012 },
      { kind: 'ring', radius: DOT_RING - 0.075, width: 0.01, material: 'polished-metal', color: 'gold', height: 0.012 },
      ...dots,
      { kind: 'text', text: String(lit), size: 0.42, center: [0, 0.07], tracking: 0.02, material: 'polished-metal', color: 'gold', height: 0.06 },
      { kind: 'text', text: `/ ${total}`, size: 0.13, center: [0, -0.3], tracking: 0.12, material: 'polished-metal', color: 'gold', height: 0.03 },
    ],
    back: { material: 'brushed-metal', color: 'gold' },
  };
}
```

- [ ] **Step 4: 运行，确认通过；再跑全部测试（含分层规则）**

Run: `npx vitest run tests/coin.test.js && npm test 2>&1 | grep -E "Tests|FAIL"`
Expected: coin 5 项通过；全部测试通过。若「能用徽章引擎组装」失败在 `pattern: 'rings'`（正面板不支持这个底纹），改成 `inset` 不变、去掉 `pattern`，再跑。

- [ ] **Step 5: 提交**

```bash
git add src/engine/coin.js tests/coin.test.js
git commit -m "feat(engine): progress coin config — one raised dot per badge, unlocked count in relief

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 铭牌式概览区与 3D 铸币

**Files:**
- Create: `src/viewer/coin.js`
- Modify: `src/viewer/profile.js`（标记结构、`ring` 改为 `tickRing`、新增 `setCoin`）
- Modify: `src/styles/profile.css`（整体替换）
- Modify: `src/app/thumbnails.js`（先画铸币）
- Modify: `src/viewer/i18n.js`（`profile.coinAlt`）
- Modify: `src/styles/responsive.css`（概览区的窄屏规则）
- Modify: `scripts/shoot.mjs`（铸币检查）

**Interfaces:**
- Consumes: `coinConfig`（Task 3）；`createBadgeRenderer(stage).image(config, brand, state, { lang, engraving, size, fill, angle, tilt })`（已有，`src/viewer/badge-renderer.js`）；`.label`、`.rule`、`.star`、`.meter-*`（Task 1）。
- Produces: `renderCoin(renderer, brand, { unlocked, total, lang }): string`（PNG data URL）；`createProfile(...)` 返回值新增 `setCoin(src: string): void`；DOM：`figure.profile-coin[data-coin]`（成功后带 `.has-coin`），内含 `svg.profile-ticks`、`img`、`figcaption.profile-count`。

- [ ] **Step 1: 新建 `src/viewer/coin.js`**

```js
// 用统一渲染服务把进度铸币画成一张静态 PNG：不新建 WebGL 上下文，不做实时动画。
import { coinConfig } from '../engine/coin.js';

/** 略微倾斜，让滚花和侧光可见。 */
const ANGLE = 0.42;
const TILT = -0.26;

/**
 * @param {{ image: Function }} renderer  createBadgeRenderer 的结果
 * @param {object} brand
 * @param {{ unlocked: number, total: number, lang: 'zh' | 'en' }} opts
 * @returns {string} PNG data URL
 */
export function renderCoin(renderer, brand, { unlocked, total, lang }) {
  const state = { unlocked: true, earnedAt: null, progress: { current: unlocked, target: total } };
  return renderer.image(coinConfig({ unlocked, total }), brand, state, { lang, engraving: 0, size: 320, fill: 0.9, angle: ANGLE, tilt: TILT });
}
```

- [ ] **Step 2: `i18n.js` 两种语言各加一条（与 `profile.unlocked` 相邻）**

```js
    'profile.coinAlt': '已解锁 {n} / {total}',
```

```js
    'profile.coinAlt': '{n} of {total} unlocked',
```

- [ ] **Step 3: 改 `profile.js`**

把 `ring(ratio)` 函数整体替换为：

```js
/** 兜底的刻度环：铸币画不出来时显示。120 道径向刻度，按解锁比例点亮。 */
function tickRing(ratio, n = 120) {
  const lit = Math.round(ratio * n);
  const ticks = Array.from({ length: n }, (_, i) => {
    const long = i % 10 === 0;
    return `<line x1="60" y1="3" x2="60" y2="${long ? 13 : 10}" transform="rotate(${(i / n) * 360} 60 60)"${i < lit ? ' class="is-lit"' : ''} />`;
  }).join('');
  return `<svg class="profile-ticks" viewBox="0 0 120 120" aria-hidden="true">${ticks}</svg>`;
}
```

把 `el.innerHTML = \`…\`` 的模板整体替换为（类名 `profile-main`、`profile-col`、`profile-count`、`data-recent`、`data-next`、`data-share`、`data-shelf` 保持不变）：

```js
  el.innerHTML = `
    <div class="rule has-star"><i class="star"></i></div>
    <div class="profile-plate">
      <div class="profile-main">
        <figure class="profile-coin" data-coin>
          ${tickRing(total ? h.unlocked.length / total : 0)}
          <img alt="" draggable="false" hidden />
          <figcaption class="profile-count"><b>${h.unlocked.length}</b><span>/ ${total}</span></figcaption>
        </figure>
        <div class="profile-facts">
          <p class="profile-caption label">${t('profile.unlocked')}</p>
          <dl class="profile-stats">
            <div><dt class="label">${t('profile.tokens')}</dt><dd>${formatCount(stats.tokens)}</dd></div>
            <div><dt class="label">${t('profile.activeDays')}</dt><dd>${stats.activeDays}</dd></div>
            <div><dt class="label">${t('profile.streak')}</dt><dd>${t('profile.days', { n: stats.longestStreak })}</dd></div>
          </dl>
          <div class="profile-actions">
            <button class="btn btn-primary profile-share" type="button" data-share>${t('profile.share')}</button>
            <button class="btn" type="button" data-shelf>${t('profile.shelf')}</button>
          </div>
        </div>
      </div>
      <div class="profile-col">
        <h3 class="profile-head label">${t('profile.recent')}</h3>
        <ul class="profile-list" data-recent></ul>
      </div>
      <div class="profile-col">
        <h3 class="profile-head label">${t('profile.next')}</h3>
        <ul class="profile-list" data-next></ul>
      </div>
    </div>
    <div class="rule"></div>`;
```

在返回对象里 `setThumbnail(id, src) { … },` 之后加：

```js
    /** 铸币画好后换掉兜底的刻度环。 */
    setCoin(src) {
      const fig = el.querySelector('[data-coin]');
      const img = fig.querySelector('img');
      img.src = src;
      img.alt = t('profile.coinAlt', { n: h.unlocked.length, total });
      img.hidden = false;
      fig.classList.add('has-coin');
    },
```

- [ ] **Step 4: `thumbnails.js` 先画铸币**

顶部加 `import { renderCoin } from '../viewer/coin.js';`，在 `const renderer = createBadgeRenderer(ctx.stage);` 之后加：

```js
  // 进度铸币排在缩略图前面：它在第一屏。画不出来就留着兜底的刻度环
  try {
    profile.setCoin(renderCoin(renderer, ctx.brand, { unlocked: profile.unlocked, total: profile.total, lang: ctx.lang }));
  } catch (err) {
    console.warn('进度铸币渲染失败，改用刻度环', err);
  }
```

先确认 `ctx.brand` 和 `ctx.lang` 存在：`grep -n "brand,\|lang," src/app/context.js`。如果名字不同，按 `context.js` 里的实际字段改。

- [ ] **Step 5: 整体替换 `src/styles/profile.css`**

```css
/* 成就档案：一块铭牌。上下细双线，三栏用竖向细线隔开；左栏是进度铸币和三个数字 */

.profile {
  margin-bottom: 64px;
}

.profile-plate {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
  padding: 28px 0;
}

.profile-plate > * {
  min-width: 0;
  padding: 0 32px;
}

.profile-plate > :first-child {
  padding-left: 4px;
}

.profile-plate > * + * {
  border-left: 1px solid var(--gold-line);
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 28px;
}

/* 铸币：画好前显示兜底刻度环，数字叠在环中间；画好后数字作为币下方的小字 */
.profile-coin {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 152px;
  margin: 0;
}

.profile-coin img,
.profile-ticks {
  display: block;
  width: 152px;
  height: 152px;
}

.profile-coin img {
  filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.55));
}

.profile-coin.has-coin .profile-ticks {
  display: none;
}

.profile-ticks line {
  stroke: rgba(239, 236, 228, 0.14);
  stroke-width: 1.2;
  stroke-linecap: round;
}

.profile-ticks line.is-lit {
  stroke: var(--gold);
}

.profile-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.profile-count b {
  font-size: 14px;
  font-weight: 700;
}

.profile-count span {
  font-size: 12px;
  color: var(--muted);
}

.profile-coin:not(.has-coin) .profile-count {
  position: absolute;
  top: 0;
  left: 0;
  width: 152px;
  height: 152px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.profile-coin:not(.has-coin) .profile-count b {
  font-size: 40px;
}

.profile-facts {
  min-width: 0;
}

.profile-caption {
  margin: 0;
}

.profile-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 28px;
  margin: 14px 0 22px;
}

.profile-stats dd {
  margin: 6px 0 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

.profile-head {
  margin: 0 0 12px;
}

.profile-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.profile-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 6px 8px 6px 4px;
  margin-left: -4px;
  border: 0;
  border-radius: 12px;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.profile-item:hover {
  background: rgba(201, 164, 92, 0.06);
}

.profile-item:focus-visible {
  outline: 2px solid var(--accent);
}

.profile-item img {
  flex: none;
  width: 46px;
  height: 46px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
}

.profile-item img:not([src]) {
  visibility: hidden;
}

.profile-item.is-locked img {
  opacity: 0.55;
}

.profile-item-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.profile-item-title {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-item-meta {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.profile-item-meter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-item-meter .meter-track {
  width: 64px;
}

.profile-empty {
  padding: 8px 0;
  font-size: 13px;
  color: var(--muted);
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

- [ ] **Step 6: `responsive.css` 的概览区窄屏规则**

删除 `@media (max-width: 960px)` 里的 `.profile` 和 `.profile-main` 两条规则，换成：

```css
@media (max-width: 960px) {
  .profile-plate {
    grid-template-columns: 1fr 1fr;
    row-gap: 24px;
  }

  .profile-plate > :first-child {
    grid-column: 1 / -1;
    padding: 0 4px 24px;
    border-bottom: 1px solid var(--gold-line);
  }

  .profile-plate > :nth-child(2) {
    border-left: 0;
    padding-left: 4px;
  }
}
```

`@media (max-width: 640px)` 那一大块里：删除 `.profile`、`.profile-main`、`.profile-ring-wrap`、`.profile-count b` 四条规则，以及 `.profile-main, .profile-col, .heat { padding: 18px 16px; }` 这一条；加入：

```css
  .profile-plate {
    grid-template-columns: 1fr;
  }

  .profile-plate > * {
    padding: 20px 4px 0;
    border-left: 0;
  }

  .profile-plate > * + * {
    border-top: 1px solid var(--gold-line);
    margin-top: 20px;
  }

  .profile-plate > :first-child {
    padding-top: 0;
    border-bottom: 0;
  }

  .profile-main {
    flex-wrap: wrap;
    gap: 18px;
  }

  .profile-coin,
  .profile-coin img,
  .profile-ticks,
  .profile-coin:not(.has-coin) .profile-count {
    width: 120px;
  }

  .profile-coin img,
  .profile-ticks,
  .profile-coin:not(.has-coin) .profile-count {
    height: 120px;
  }

  .profile-stats dd {
    font-size: 22px;
  }
```

（`.heat-head, .wall-bar` 和 `.heat-scale-mark` 两条保留。热力图原来的卡片内边距在 Task 5 处理。）

- [ ] **Step 7: `scripts/shoot.mjs` 加铸币检查**

在「档案的解锁数与陈列墙一致」那条 `check(...)` 之后加：

```js
  await waitUntil(page, '进度铸币渲染', () => document.querySelector('[data-coin]')?.classList.contains('has-coin'));
  const coin = await page.evaluate(() => {
    const fig = document.querySelector('[data-coin]');
    const img = fig?.querySelector('img');
    return { has: fig?.classList.contains('has-coin'), loaded: !!img?.naturalWidth, alt: img?.alt ?? '' };
  });
  check('概览区的铸币已渲染，替代文字里的解锁数与陈列墙一致', coin.has && coin.loaded && coin.alt.includes(String(unlockedTiles)), JSON.stringify(coin));
```

（`waitUntil` 和 `unlockedTiles` 都是该文件里已有的名字；先 `grep -n "unlockedTiles\|async function waitUntil" scripts/shoot.mjs` 确认。）

- [ ] **Step 8: 验证**

```bash
npm test 2>&1 | grep -E "Tests|FAIL"
npm run check:browser 2>&1 | grep -E "FAIL|铸币|通过"
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t4-desktop.png
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=en" $S/t4-desktop-en.png
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t4-mobile.png "" "" 390 844
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh&brand=codex" $S/t4-codex.png
```

Expected: 全部通过，含新的铸币检查。打开截图确认：概览区没有卡片，上下细双线、上方正中四角星、三栏竖线分隔；左栏是一枚真实渲染的金币，滚花、凸点（亮 = 已解锁，暗 = 未解锁）、中央数字清晰可读；Codex 页凸点为 30 颗；手机上三栏上下排列，无横向溢出。

- [ ] **Step 9: 兜底检查（不提交这一步的临时改动）**

临时在 `src/viewer/coin.js` 的 `renderCoin` 第一行加 `throw new Error('test');`，截图 `$S/t4-fallback.png`，确认显示 120 道刻度的环、数字叠在环中、布局不乱；然后撤销这行改动（`git diff src/viewer/coin.js` 应为空）。

说明：设计规格写的是「禁用 WebGL 的条件下」验证兜底。实际上 WebGL 不可用时整个页面会显示「当前浏览器不支持 WebGL」，进不到概览区；有意义的兜底场景是铸币渲染本身抛错，所以这里用抛错来验证。

- [ ] **Step 10: 提交**

```bash
git add src/viewer/coin.js src/viewer/profile.js src/styles/profile.css src/styles/responsive.css src/app/thumbnails.js src/viewer/i18n.js scripts/shoot.mjs
git commit -m "feat: overview as a single plate with a real 3D progress coin; tick-ring fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### 评审节点 A（主控执行）

不派实现子代理。主控：

1. 截图到 `$S/review-a/`：电脑中英文各一张（1440×900 整页）、手机一张（390×844）、Codex 页一张，另把概览区左栏铸币裁出放大一张（用 Python PIL 从电脑截图裁剪）。逐张打开确认无空白、无半加载状态。
2. 按 impeccable 的 `critique` 流程审 `index.html`（`?source=mock`）：设计评审和 `impeccable detect` 各由一个 Opus 子代理独立完成，主控综合。
3. 把截图路径、铸币放大图、评审结论交给用户，等用户认可或给出调整意见。调整意见改完、用户认可后才进入 Task 5。

---

### Task 5: 热力图（珐琅刻点）

**Files:**
- Modify: `src/viewer/heatmap.js`（`EMPTY`、`cellBackground`、图例标记）
- Modify: `src/styles/heatmap.css`
- Modify: `src/styles/responsive.css`

**Interfaces:**
- Consumes: Task 1 的变量与 `.label`；Task 2 的 `.seg` 与 `trackSegThumb`（年份已接入）。
- Produces: `cellBackground(parts)` 两个工具时返回左右各半的 `linear-gradient(90deg, …)`。

- [ ] **Step 1: 写失败的测试（追加到 `tests/coin.test.js` 之外的新文件 `tests/heatmap.test.js`）**

```js
import { describe, expect, it } from 'vitest';
import { cellBackground } from '../src/viewer/heatmap.js';

describe('热力图格子', () => {
  it('两个工具同一天都用了：左右各半', () => {
    const bg = cellBackground([{ color: '#D97757', level: 4 }, { color: '#7A9DFF', level: 2 }]);
    expect(bg.startsWith('linear-gradient(90deg,')).toBe(true);
    expect(bg).toContain('0 50%');
    expect(bg).toContain('50% 100%');
  });

  it('没有活动：凹坑底色；一个工具：它的颜色', () => {
    expect(cellBackground([])).toBe('rgba(0, 0, 0, 0.34)');
    expect(cellBackground([{ color: '#D97757', level: 4 }])).toBe('rgba(217, 119, 87, 1)');
  });
});
```

Run: `npx vitest run tests/heatmap.test.js`
Expected: FAIL（现在是 `135deg`，空格颜色也不同）。若因为 `heatmap.js` 顶层引用 `location`/`navigator` 而在 node 下报错，先确认 `i18n.js` 已对 `typeof location` 做了判断（它已经判断了），报错再按实际信息处理。

- [ ] **Step 2: 改 `heatmap.js`**

```js
const EMPTY = 'rgba(0, 0, 0, 0.34)';
```

`cellBackground` 的最后一行改为：

```js
  return `linear-gradient(90deg, ${rgba(a.color, ALPHA[a.level])} 0 50%, ${rgba(b.color, ALPHA[b.level])} 50% 100%)`;
```

文件头注释第 2 行改为 `// 两个工具叠在一起看：只用了一个就是它的品牌色，同一天两个都用了就左右各半。`；第 3 行改为 `// 那天解锁了徽章，圆点外加一圈细金边；悬停看详情，点金边圆点打开对应徽章。`

图例模板里这两段：

```js
        ${ALPHA.map((a, i) => `<i style="background:${i ? `rgba(240,238,230,${a * 0.85})` : EMPTY}"></i>`).join('')}
```

```js
        <span class="heat-scale-mark"><i class="dot"></i>${t('heat.unlock')}</span>
```

分别改为：

```js
        ${ALPHA.map((a, i) => `<i style="background:${i ? `rgba(230,200,135,${a * 0.9})` : EMPTY}"></i>`).join('')}
```

```js
        <span class="heat-scale-mark"><i class="heat-scale-unlock"></i>${t('heat.unlock')}</span>
```

模板里 `<p class="heat-summary" data-summary></p>` 改为 `<p class="heat-summary label" data-summary></p>`。

Run: `npx vitest run tests/heatmap.test.js`
Expected: PASS。

- [ ] **Step 3: 改 `heatmap.css`**

替换这些规则（其余不动）：

```css
/* 不再是卡片：标题、刻点板、图例直接放在页面上 */
.heat {
  position: relative;
  margin-bottom: 64px;
}

.heat-summary {
  margin: 8px 0 0;
  font-variant-numeric: tabular-nums;
}

.heat-body {
  --gap: 4px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 10px;
  row-gap: 8px;
  min-width: 700px;
}

.heat-months {
  grid-column: 2;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.heat-wd {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  row-gap: var(--gap);
  font-size: 10px;
  letter-spacing: 0.1em;
  line-height: 1;
  color: var(--faint);
}

/* 珐琅降一点饱和度，退到徽章后面 */
.heat-grid {
  grid-template-rows: repeat(7, auto);
  grid-auto-flow: column;
  row-gap: var(--gap);
  filter: saturate(0.8);
}

/* 刻点：金属板上的凹坑。没有活动是暗坑，有活动填珐琅色 */
.heat-cell {
  position: relative;
  aspect-ratio: 1;
  min-width: 9px;
  border-radius: 50%;
  box-shadow: inset 0 1px 1.5px rgba(0, 0, 0, 0.55), 0 1px 0 rgba(255, 255, 255, 0.04);
}

/* 年初的占位格和未来的日子：比空点更淡的轮廓点，仍然占位 */
.heat-cell.is-pad,
.heat-cell.is-future {
  visibility: visible;
  background: none;
  box-shadow: inset 0 0 0 1px rgba(239, 236, 228, 0.05);
}

.heat-cell.is-pad {
  box-shadow: inset 0 0 0 1px rgba(239, 236, 228, 0.03);
}

/* 解锁徽章的日子：外加一圈细金边，像镶了一颗小宝石 */
.heat-cell.is-unlock::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  box-shadow: 0 0 0 1.25px var(--gold-bright);
}

.heat-cell:not(.is-pad):not(.is-future):hover {
  outline: none;
  box-shadow: 0 0 0 1.5px var(--text);
}

.heat-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--gold-line);
  border-radius: 999px;
  background: var(--bg-sunk);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease, opacity 0.15s ease;
}

.heat-brand i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.35);
}

/* 打开的工具：垫金属滑块 */
.heat-brand[aria-pressed='true'] {
  border-color: transparent;
  background: var(--metal-gold);
  box-shadow: var(--metal-edge), 0 1px 3px rgba(0, 0, 0, 0.4);
  color: var(--ink-on-metal);
  font-weight: 700;
}

.heat-brand[aria-pressed='true'] .heat-brand-total {
  color: var(--ink-on-metal);
  opacity: 0.7;
}

.heat-brand[aria-pressed='false'] {
  opacity: 0.7;
}

.heat-brand[aria-pressed='false'] i {
  background: none;
  box-shadow: inset 0 0 0 1.5px var(--c);
}

.heat-scale > i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: inset 0 1px 1.5px rgba(0, 0, 0, 0.5);
}

.heat-scale-unlock {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.34);
  box-shadow: 0 0 0 1.25px var(--gold-bright);
}
```

再把 `.heat-tip` 规则里的背景、边框、文字颜色改成变量：`background: var(--bg-lift)`、`border: 1px solid var(--gold-line)`、文字 `var(--text)` / 次要 `var(--muted)`（先 `sed -n 200,272p src/styles/heatmap.css` 看现有写法，只替换颜色值，不改尺寸和定位）。`.heat-tip-unlock .dot` 改为与 `.heat-scale-unlock` 相同的金边圆点样式。

- [ ] **Step 4: `responsive.css`**

在 `@media (max-width: 640px)` 里确认已没有 `.heat { padding: … }`（Task 4 删除了合并的那条）。若 `.heat-cell` 在 390 宽下小于 9px，热力图横向滚动区本来就有 `min-width: 700px`，每格约 11px，满足要求；不需要改。

- [ ] **Step 5: 验证**

```bash
npm test 2>&1 | grep -E "Tests|FAIL"
npm run check:browser 2>&1 | grep -E "FAIL|热力图|通过"
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t5-desktop.png
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t5-mobile.png "" "" 390 844
```

Expected: 全部通过（热力图 365/366 格、年份切换、解锁标记可点、工具开关、手机无横向溢出）。从 `t5-desktop.png` 裁出热力图放大一张 `$S/t5-heat-zoom.png`，确认：圆点、暗坑、左右双色在实际尺寸下能分辨两种颜色、金边清楚、未来日子是淡轮廓。

- [ ] **Step 6: 提交**

```bash
git add src/viewer/heatmap.js src/styles/heatmap.css src/styles/responsive.css tests/heatmap.test.js
git commit -m "style: heatmap as enamel-filled dots — sunk empties, left/right split, gold ring on unlock days

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 徽章墙分区与页脚

**Files:**
- Modify: `src/styles/wall.css`（`.series-head`、`.series-title`、`.series-count`、`.tile-title`、新增 `.colophon`）
- Modify: `index.html`（`<main>` 末尾加页脚）
- Create: `src/app/colophon.js`
- Modify: `src/main.js`（调用）
- Modify: `vite.config.js`（`define`）

**Interfaces:**
- Consumes: `.rule`、`.star`、`.label`（Task 1）。
- Produces: 全局常量 `__APP_VERSION__`（构建时替换为 `package.json` 的版本字符串）；`mountColophon(ctx)`。

- [ ] **Step 1: `wall.css`**

`.series-head` 规则替换为（底部一道细双线代替单线）：

```css
.series-head {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 16px;
  margin-bottom: 10px;
}

.series-head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  border-top: 1px solid var(--gold-line);
  border-bottom: 1px solid var(--gold-line);
}
```

`.series-title` 里 `font-size: 22px; font-weight: 500;` 改为 `font-size: 20px; font-weight: 700;`（字体在 Task 1 已改）。`.series-sub` 加上 `letter-spacing: 0.06em;`。`.series-count` 改为：

```css
.series-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.series-count b {
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
}
```

`.tile-title` 的 `font-weight: 600` 改为 `700`；`.tile:hover` 的背景改为 `rgba(201, 164, 92, 0.05)`；`.tile.is-loading .tile-art::before` 渐变里的 `rgba(240, 238, 230, …)` 三处改为 `rgba(239, 236, 228, …)`（数值不变）。

文件末尾追加：

```css
/* ---------- 页脚：藏品图录的版权页 ---------- */

.colophon {
  margin-top: 96px;
}

.colophon-line {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 22px 0 0;
}

/* 版本号保持小写 v，不跟着 .label 转大写 */
.colophon-line [data-version] {
  text-transform: none;
}

.colophon-line a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid var(--gold-line);
}

.colophon-line a:hover {
  color: var(--text);
  border-color: var(--gold);
}
```

- [ ] **Step 2: `index.html` 页脚**

在 `<p class="wall-empty" data-wall-empty hidden></p>` 之后、`</main>` 之前加：

```html
      <footer class="colophon">
        <div class="rule has-star"><i class="star"></i></div>
        <p class="colophon-line label">
          <span>Agent Badges</span><span aria-hidden="true">·</span><span data-version></span><span aria-hidden="true">·</span><a href="https://github.com/Aryous/agent-badges" target="_blank" rel="noopener">GitHub</a>
        </p>
      </footer>
```

页脚文字（产品名、版本号、GitHub）在中英文下相同，不进 i18n 字典。

- [ ] **Step 3: 版本号**

`vite.config.js`：顶部 import 区加 `const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));`（`readFileSync` 已从 `node:fs` 导入），`defineConfig({ … })` 里加一项：

```js
  // 页脚的版本号：构建时从 package.json 读入，不写死
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
```

新建 `src/app/colophon.js`：

```js
/* global __APP_VERSION__ */
/** 页脚：版本号由构建时注入（vite.config.js 的 define）。 */
export function mountColophon(ctx) {
  ctx.$('[data-version]').textContent = `v${__APP_VERSION__}`;
}
```

`src/main.js`：加 `import { mountColophon } from './app/colophon.js';`，在 `mountTopbar(ctx)` 调用的下一行加 `mountColophon(ctx);`（先 `grep -n "mountTopbar" src/main.js` 确认位置和 `ctx` 已创建）。

- [ ] **Step 4: 验证**

```bash
npm test 2>&1 | grep -E "Tests|FAIL"
npm run build 2>&1 | tail -1 && grep -o 'v0\.5\.[0-9]*' dist/index.html | head -1
npm run check:pack 2>&1 | tail -1
npm run check:browser 2>&1 | grep -E "FAIL|通过"
node scripts/peek.mjs "http://localhost:5199/?source=mock&lang=zh" $S/t6-desktop.png
```

Expected: 测试通过；构建产物里能找到 `v0.5.2`（当前版本）；`pack OK`；浏览器检查全部通过。打开截图的底部：最后一排徽章之后有足够留白，细双线正中四角星，下面一行「AGENT BADGES · v0.5.2 · GITHUB」（`.label` 把文字转成大写，版本号单独保持小写 v）；各分类标题下是细双线、计数为 Outfit 粗体数字。

- [ ] **Step 5: 提交**

```bash
git add src/styles/wall.css index.html src/app/colophon.js src/main.js vite.config.js
git commit -m "style: series heads on a double rule; colophon footer with build-time version

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 弹层换成新的变量

**Files:**
- Modify: `src/styles/inspector.css`、`src/styles/modal.css`、`src/styles/export.css`、`src/styles/notice.css`、`src/styles/controls.css`、`src/styles/topbar.css`

**Interfaces:**
- Consumes: Task 1 的变量与 `.label`；Task 2 的 `.btn`、`.seg`（弹层里的按钮和分段控件已经自动换成胶囊）。

- [ ] **Step 1: 列出写死的颜色**

```bash
grep -n "rgba(240, 238, 230\|#141413\|#f0eee6\|rgba(20, 20, 19\|#f7f6f2" src/styles/*.css
```

- [ ] **Step 2: 按下表替换（只换颜色，不改尺寸、布局、结构）**

| 原值 | 换成 |
|---|---|
| `#141413`、`rgba(20, 20, 19, 1)` 作为底色 | `var(--bg)`；弹窗卡片和面板的底色用 `var(--bg-lift)` |
| `rgba(20, 20, 19, a)`（a < 1，遮罩、渐隐） | `rgba(20, 19, 18, a)`（同样的 a） |
| `#f0eee6`、`#f7f6f2` 作为文字或圆点 | `var(--text)` |
| `rgba(240, 238, 230, a)`，a ≤ 0.14，作为边框 | `var(--line)`；弹窗卡片外框用 `var(--gold-line)` |
| `rgba(240, 238, 230, a)`，作为背景提亮 | `rgba(239, 236, 228, a)`（同样的 a） |
| `rgba(240, 238, 230, a)`，a ≥ 0.3，作为文字 | `var(--muted)` |

`[data-bg='transparent'] > .swatch` 的棋盘格颜色是导出背景的示意，保持原值不换。

- [ ] **Step 3: 标题和小标签**

- `modal.css` 里 `.modal-title`：`font-family: var(--font); font-weight: 700;`。
- `index.html` 里导出面板的 `<span class="panel-label" …>` 两处加上 `label` 类：`class="panel-label label"`。
- `inspector.css` 里单枚查看的徽章名标题（Task 1 Step 5 已改字体）确认 `font-weight: 700`。
- `.modal-card` 若有 `border-radius` 大于 20px，保持；外框改为 `1px solid var(--gold-line)`。

- [ ] **Step 4: 再列一次，确认只剩有意保留的**

```bash
grep -n "rgba(240, 238, 230\|#141413\|#f0eee6\|rgba(20, 20, 19\|#f7f6f2" src/styles/*.css
```

Expected: 只剩 `controls.css` 里 `.swatch` 棋盘格两处（`#8f8b82`、`#f0eee6`），其余为空。

- [ ] **Step 5: 验证**

```bash
npm test 2>&1 | grep -E "Tests|FAIL"
npm run check:browser 2>&1 | grep -E "FAIL|通过"
```

Expected: 全部通过。从 `check:browser` 的截图目录里（`grep -n "const out" scripts/shoot.mjs` 查路径）打开单枚查看正面、导出面板、海报弹窗三张，确认底色、细线、按钮、字体与主视图一致，没有残留的珊瑚橙。

- [ ] **Step 6: 提交**

```bash
git add src/styles index.html
git commit -m "style: dialogs, inspector and export panel use the vitrine tokens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 最终验证

**Files:** 无代码改动（发现问题就回到对应任务修）。

- [ ] **Step 1: 徽章渲染零变化**

```bash
node scripts/visual.mjs capture $S/visual-after
node scripts/visual.mjs compare $S/visual-before $S/visual-after
```

Expected: `299/299 张一致`，退出码 0。注意：基线必须是同一天拍的（示例数据日期跟着当天走）；如果跨了日期，先用 `git stash` 不适用（改动已提交），改为在一个临时 worktree 检出 Task 1 之前的提交、起 5203 端口拍基线，再比对。

- [ ] **Step 2: 全部检查**

```bash
npm test 2>&1 | grep -E "Tests|FAIL"
npm run check:pack 2>&1 | tail -1
npm run check:browser 2>&1 | grep -E "FAIL|通过"
CHROME_GL=software npm run check:browser 2>&1 | grep -E "FAIL|通过"
npm run build:site >/dev/null 2>&1 && npm run check:site 2>&1 | tail -1
```

Expected: 全部通过（软件渲染那次用来模拟 CI，可能较慢）。

- [ ] **Step 3: 加载时间对比**

用同一条命令在改动前（临时 worktree 检出 Task 1 之前的提交，5203 端口）和改动后各测一次，从打开页面到 `window.__badgeApp.ready` 的时间：

```bash
node -e "
import('./scripts/browser.mjs').then(async ({ launchChrome }) => {
  const url = process.argv[1];
  const b = await launchChrome();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const t0 = Date.now();
  await p.goto(url);
  await p.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 120000 });
  console.log('ready ms', Date.now() - t0);
  await b.close();
});" "http://localhost:5199/?source=mock&lang=zh"
```

Expected: 改动后不比改动前慢 20% 以上；两次数字写进交付说明。

- [ ] **Step 4: 截图一组交给评审节点 B**

电脑中英文、手机、Codex 页、热力图放大、铸币放大、单枚查看、海报弹窗，放在 `$S/review-b/`，逐张打开确认有效。

---

### 评审节点 B（主控执行）

1. 按 impeccable 的 `critique` 流程审最终页面（两个 Opus 子代理独立做设计评审和 `impeccable detect`，主控综合）。
2. 把截图、Task 8 的验证结果（含加载时间两次的数字）、评审结论交给用户。
3. 合并和发布由用户决定。

---

## 自检记录

- 规格覆盖：第 1 节 → Task 1、2；第 2 节 → Task 2；第 3 节 → Task 3、4；第 4 节 → Task 5；第 5 节 → Task 6（筛选胶囊在 Task 2）；第 6 节 → Task 6；第 7 节 → Task 7；评审节点与验收标准 → 评审节点 A/B、Task 8。
- 与规格的两处有意差异，已在对应步骤说明：
  - 兜底验证用「铸币渲染抛错」代替「禁用 WebGL」（Task 4 Step 9）；
  - 页脚文字在中英文下相同，不进 i18n 字典（Task 6 Step 2）。
- 名称一致：`trackSegThumb`、`coinConfig`、`COIN_ID`、`renderCoin`、`setCoin`、`mountColophon`、`__APP_VERSION__`、`.profile-coin`、`.has-coin`、`.profile-ticks`、`.rule`、`.has-star`、`.star`、`.label`、`.heat-scale-unlock` 在各任务中写法一致。
