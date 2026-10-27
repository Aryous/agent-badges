# 分享海报改版：整版珐琅、双工具海报和 GitHub 头像

日期：2026-10-27　分支：`feat/share-poster`（从 main `c958f83` 开）

## 目标

现在的分享海报（`src/viewer/poster.js`）是旧风格。它的问题：

- 方格热力图；
- 珊瑚橙进度环；
- 系统衬线字体；
- 英文界面下周起始日和主页不一致。

改成：

1. 海报的热力图和进度徽章与主页一致：午夜蓝珐琅板点阵、全解锁铸币。
2. 新版式（实验页 `poster-lab.html` 里用户选定的 C 和 D2），带头像。
3. 可以分享单个工具，也可以两个工具一起分享。
4. 头像用 GitHub 头像，必须用户明确同意才取；没同意时显示通用人像轮廓。

## 已定的外观（实验页里用户选定）

实验页的绘制代码在 `lab-assets/poster-draw.js`、`poster-layouts.js`、`poster-duo.js`，正式实现照着搬，尺寸常量照抄。

### 画布

- 宽 1080，输出 2 倍（2160 像素宽），高度按内容算。
- 字体用主页的 Outfit。画之前等字体加载完（`document.fonts.load`），否则 canvas 会悄悄换成系统字体。

### 单个工具：C「整版珐琅」

整张海报就是一块午夜蓝珐琅板：

- 画布底色是 `#141312`，板离边 28，圆角 34；
- 板面有极淡的同心细纹，外框是锡色双线。

从上到下：

1. **板头**
   - 左边：头像（半径 52），右边是名字和副标题。
   - 右边：小字“年度”和大号年份（72px）。
2. **统计行**：这一年的 Token、活跃日、最长连续，数字加粗。文字和主页热力图的统计行相同（`heat.summary`）。
3. **点阵**：月份、星期、圆点（见下面“热力图”）。
4. **图例**：工具名和四级色阶，右边是“解锁徽章”金边。
5. **细线**，然后是**中段**：
   - 左边是全解锁铸币（270）；
   - 右边一行小字“累计 · 27 / 32 枚徽章”，下面是累计的三个数字（Token、活跃天数、最长连续，和主页个人区一致）。
6. **细线**，然后是**徽章墙**：8 列，没解锁的压暗（透明度 0.42），最后一行不满时居中。
7. **页脚**：左边是金色四角星和 agent-badges，右边是 `poster.footer`。

### 两个工具一起：D2「左右分栏」

- 板头、统计行、点阵和图例和 C 相同，但点阵画两个工具，统计行是两个工具的合计。
- 名字下面的副标题写“Claude Code + Codex · 46 / 62 枚徽章”。
- 下面分左右两栏，中间一道竖细线。每栏一个工具：
  - 铸币（210）；
  - 工具名、解锁数；
  - 这个工具累计的三个数字，居中，数字之间有竖细线；
  - 它的徽章墙，5 列。
- 页脚同上。
- 工具顺序和主页热力图一致（第一个工具在左），和点阵的左右分色对应。

### 热力图（单工具和双工具都一样）

照主页 `heatmap.css` 画：

- **没有活动的日子（凹点）**：凹点色，顶部向内的暗影，下缘一道很淡的高光。
- **有活动的日子**：品牌色珐琅（`enamelColor`），顶部高光、底部暗边、底下一点投影。
- **两个工具同一天都用**：左右各半，左边是第一个工具。
- **解锁了徽章的日子**：离圆点 1 像素一圈细金边（`#d9bf86`）。
- **未来的日子和年初的占位格**：只画淡轮廓 `rgba(184,169,130,.16)`。
- **一周从哪天开始**：跟随语言，中文从周一，英文从周日（和 `heatmap.js` 相同）。
- **大小**：圆点直径是列宽的 0.74。阴影和金边按圆点大小等比缩放，不用 `shadowBlur`。

### 头像

- **有头像**：裁成圆形，外面一圈 1.5px 的锡色细边。名字一行写 GitHub 登录名（`@login`），副标题写工具名和徽章数。
- **没有头像**：通用的人像轮廓，画法见 `lab-assets/poster-draw.js` 的 `avatar`：
  - 圆内底色 `#1d2a5c`；
  - 头和肩是 `rgba(154,163,196,.55)`；
  - 同样一圈细边。
  - 名字一行写工具名（两个工具时写“Claude Code + Codex”），副标题写徽章数。
- 头像不做成金属徽章的样子（用户明确否定过）。

## 弹窗：选择分享什么

- 海报弹窗顶部加三段切换：**Claude Code / Codex / 两个一起**。
- 默认选当前所在的工具页。
- 只有一个工具有数据时（`heatSeries` 只有一个），不显示切换。
- 切换时换预览。每种海报画过就缓存，键是 `形式 | 年份 | 语言`，切回来不重画。
- 文案中英文都要有，写进 `i18n`。

### 另一个工具的数据

`app/load.js` 已经读了所有工具的进度（`all`），但只返回当前工具的。

- 把海报需要的部分一起返回：另一个工具的品牌、徽章配置、进度。
- 双工具海报要另一个工具的徽章缩略图和铸币截图。它们在打开这个形式时才画：
  - 用共用的舞台和 `createBadgeRenderer`，逐帧画（`forEachFrame`）；
  - 画好留在内存里。
- 实测参考：30 枚约 2 秒，铸币约 0.2 秒。画的时候预览处显示“正在生成…”。

## 性能

- **导出**：用 `canvas.toBlob` 加 `URL.createObjectURL`，不再用 `toDataURL`。旧做法会生成约 10 MB 的 base64 字符串，还要再解码一次。
  - 实测 PNG 编码约 0.12–0.25 秒，文件 4–7 MB。
- **预览**：显示一张缩小的图（宽 720），从同一张 canvas 画下来。下载时才用原尺寸的 blob。
- **第一次点开**：仍然要等陈列墙缩略图全部画完（`await thumbsDone`）。缩略图在页面加载后立刻开始画，通常早已画完，所以不另加“催一下”。没画完时，预览处显示进度（“正在生成… 12 / 32”），不是一句不动的文字。
- **自动化接口**：`window.__badgeApp.posterURL` 保留，仍然是 PNG 的 data URL，因为 `scripts/shoot.mjs` 按 base64 拆它。
  - 只有在这个 getter 被读取时，才从缓存的 blob 转成 data URL，平时不生成。
  - 新增 `posterMode` 和 `setPosterMode(mode)` 给浏览器检查用。

## 代码结构

### 共用的“一年点阵”：`yearCells`

放在 `src/data/calendar.js`，是纯函数：

```js
yearCells({ year, weekStart, series, markers, enabled, now })
// → { weekStart, monthStarts, weeks: (null | { date, future, parts: [{ id, color, level }], unlocked })[][] }
```

- `series`：`[{ id, color, daily }]`，`levelThresholds` 在里面按每个工具的全部数据算（和现在一样）。
- `markers`：`markersFrom` 的结果；`enabled` 是开着的工具 id 集合。`unlocked` = 不是未来，且那天有开着的工具的解锁标记。
- 三处使用：
  - **热力图**：`partsOf`、`markersOn` 改成从它取，对外接口不变，月章和铸币套装继续用。
  - **月章**：`monthMedalData` 继续拿 `partsOf`、`markersOn`，不改。
  - **海报**：直接用。

### 珐琅板颜色：`PLATE`

- `src/viewer/heatmap.js` 导出一个对象：`plate`、`sunk`、`frame`、`frameInner`、`ink`、`sub`、`month`、`dim`、`name`、`ring`、`outline`。`SUNK` 保留，等于 `PLATE.sunk`。
- 加一个测试：读 `src/styles/heatmap.css`，`--plate-*` 和两个 `@property` 的初始值必须等于 `PLATE` 里对应的值。
- `month-medal.js:47`、`proof-set.js:139` 里写死的 `#0d1538`、`#141f4d`、`#d9bf86` 改成引用 `PLATE`。月章导出图不能因此变化。
- 海报不读 `getComputedStyle`，直接用 `PLATE`。

### 海报绘制

- `src/viewer/poster.js` 重写，导出 `renderPoster({ mode, tools, heat, identity })`，返回 canvas：
  - `mode`：`'single'` 或 `'duo'`；
  - `tools`：`[{ brand, items(含缩略图), coin, all }]`，单工具时只有一个；
  - `heat`：`{ year, cal, series, yearStats }`；
  - `identity`：`{ login, avatar }` 或 `null`。
- 绘制的小工具（文字、圆点、板底、头像、铸币、数字、徽章墙）可以拆到 `src/viewer/poster-draw.js`，每个文件只管一件事。
- 分层规则：viewer 只引用 viewer、engine、data、brands。

### 铸币截图

- 用 `completionistItem(kit, items)` 得到当前阶段的静态铸币，`createBadgeRenderer(ctx.stage).image(...)` 截一张 900 像素的图，按工具缓存。
- 单枚查看里那枚铸币是另一个 item，不受影响。

## 头像

### 取头像（命令行）

- **何时问**：第一次在终端里运行 `npx agent-badges` 时，问一次“要在分享海报上显示你的 GitHub 头像吗？[y/N]”，并说明会通过 gh 访问 GitHub。
  - 记住回答，以后不再问。
  - 非终端环境（插件、Agent、脚本）一律不问、不取。
  - 没装 gh 或没登录 gh：不问，直接用示意头像。
- **新命令 `agent-badges avatar`**：
  - 不带参数：在终端里问 `[y/N]`，同意后（重新）取头像。非终端时只打印说明并退出，带 `--yes` 才取。
  - `--remove`：删除已存的头像和登录名，回到示意头像，并记住“不要”。
- **怎么取**：`createGitHub().user()` 已经调用 `gh api user`，在返回值里多带一个 `avatar_url`。下载用 Node 自带的 `fetch`，地址加 `s=256`。只接受 `image/png` 或 `image/jpeg`，大小不超过 1 MB。
- **存在哪**：数据目录（`~/.agent-badges`，可用 `AGENT_BADGES_HOME` 修改）下：
  - `avatar.png` 或 `avatar.jpg`；
  - `identity.json`：`{ consent: true | false, login, file, fetchedAt }`。
- **失败**：网络或 gh 出错时，打印一行说明，用示意头像，不影响页面打开。

### 交给页面

- `src/share/inject.js` 加 `identityScript(identity)`，生成 `window.__AGENT_BADGES_IDENTITY__ = { login, avatar }`。
  - `avatar` 是图片的 data URL，页面不发任何网络请求，canvas 也不会因为跨域而无法导出。
  - 只有 `consent: true` 且文件在时才注入。
- 不和 `__AGENT_BADGES_PUBLIC__` 混用：那个变量会把页面切成“给别人看”的样子。
- **本机页面**（`open`、`export`）：注入。
- **公开主页**（`profile`、`publish`）：同样注入。publish 本来就知道登录名，海报按钮在公开页上也有。
- **开发服务器**（`vite.config.js`）：不注入头像，用示意头像；想看效果用实验页。
- **在线演示站**：只用示例数据。`scripts/build-site.mjs` 的检查加上 `__AGENT_BADGES_IDENTITY__ =`，混进来就报错。

### 页面上

- `app/context.js` 读 `window.__AGENT_BADGES_IDENTITY__`，交给海报。
- 本机页面上没有头像时，弹窗底部加一行小字：“运行 `npx agent-badges avatar` 可以在海报上显示你的 GitHub 头像”。公开页和演示站不显示这行。

### 文档里的隐私说明

- `README.md` 和 `README.zh-CN.md` 的 Local only 一条改成：

  > The page makes no network calls. The CLI touches the network only for `publish` and the optional avatar fetch, both through gh.

- `AGENTS.md` 第 3 行同样加上取头像这一条。
- 插件技能里不预先批准 `avatar`（和 `publish` 一样，要用户自己同意）。
- 如果有测试检查这些文字，同一个提交里一起改。

## 测试

- **单元测试**
  - `yearCells`：
    - 周日起始和周一起始的列数正确；
    - 未来的日子和占位格正确；
    - 一个工具、两个工具的 `parts`；
    - 关掉的工具的解锁不算；
    - `unlocked` 不包括未来的日子。
  - `PLATE` 和 `heatmap.css` 的值一致。
  - `identityScript`：转义 `<`；没同意或没文件时返回空。
  - `avatar` 命令：
    - 非终端不取；
    - `--yes` 才取；
    - `--remove` 删除文件并记住“不要”；
    - gh 不可用时不报错。
    - gh 和 fetch 都用替身，不联网。
  - 第一次运行时的询问：
    - 只在终端里出现，只问一次，回答被记住；
    - 插件里不出现。
  - 公开页面里，同意了才有身份脚本；没同意就没有。
  - `build-site` 的检查能拦住身份脚本。
- **浏览器检查（`scripts/shoot.mjs`）**
  - 点开分享海报，`posterURL` 是 2160 像素宽的 PNG（原有检查保留）。
  - 有两个工具的数据时，弹窗里有三段切换，默认是当前工具。切到“两个一起”后生成新海报，宽度不变，高度和单工具不同；再切回来不重画（看缓存命中计数）。
  - 只有一个工具时没有切换。
  - 预览图是缩小的图，下载用原尺寸。
  - 控制台没有报错。真实显卡和软件渲染都要过。
- **徽章导出图（`scripts/visual.mjs compare`）**：第一步重构前后各跑一次，299 张逐像素一致。之后每一步也跑。
- **月章和热力图的浏览器检查**：重构后全部照旧通过。

## 实施顺序（三步，每步单独可验证、单独提交）

1. **重构**：`yearCells`、`PLATE`、CSS 一致性测试，以及热力图、月章、铸币套装改用它们。外观不变，用徽章导出图比对和浏览器检查证明。
2. **新海报和弹窗**：`renderPoster` 重写（C 和 D2），弹窗切换，另一个工具的缩略图和铸币，`toBlob`，缩小预览，缓存，“催一下”，`posterURL` 保留。这一步先只用示意头像。
3. **头像**：命令行询问和 `avatar` 命令、身份注入（本机页和公开页）、页面读取、弹窗提示行、演示站检查、隐私说明文字。

## 不做的事

- 自定义上传头像。
- 海报的其他版式（实验页里的 A、B、D1、D3）。
- 海报动画、背面、视频。
- 年终总结。
- 定期自动刷新头像（重新运行 `agent-badges avatar` 即可）。

## 约束

- 实验页文件（`poster-lab.html`、`lab-assets/`、各种 `*-lab*.html`）不提交。
- 子代理只用临时目录或示例数据，不碰 `~/.agent-badges`、`~/.claude`、`~/.codex`。头像相关测试用临时的 `AGENT_BADGES_HOME`。
- 实现和审查都用 Opus。
- 发版只走 GitHub Actions（打标签），不手动 `npm publish`。
