<p align="center">
  <img src="assets/banner.png" alt="Agent Badges：Claude Code 和 Codex 的 3D 成就徽章" width="880" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/agent-badges"><img src="https://img.shields.io/npm/v/agent-badges?color=e8b45a&label=npm" alt="npm 版本" /></a>
  <a href="https://github.com/Aryous/agent-badges/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Aryous/agent-badges/ci.yml?branch=main&label=CI" alt="CI 状态" /></a>
  <img src="https://img.shields.io/node/v/agent-badges?color=5b8def" alt="Node.js 版本" />
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/agent-badges?color=8f8b82" alt="MIT 许可" /></a>
  <a href="https://aryous.github.io/agent-badges/demo/?lang=zh"><img src="https://img.shields.io/badge/demo-在线演示-e8b45a" alt="在线演示" /></a>
  <a href="https://github.com/Aryous/agent-badges/stargazers"><img src="https://img.shields.io/github/stars/Aryous/agent-badges?style=flat&color=f0eee6" alt="GitHub stars" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <b>简体中文</b> · <a href="https://aryous.github.io/agent-badges/?lang=zh">官网</a> · <a href="https://aryous.github.io/agent-badges/demo/?lang=zh">在线演示</a>
</p>

把你的 Claude Code 和 Codex 使用记录变成可收藏的 3D 成就徽章，像 Apple Watch 健身徽章那样。全程在本机运行，不上传任何内容。

```bash
npx agent-badges
```

**也可以直接问你的 Agent。** 在 Claude Code 或 Codex 里[装上技能](#让-agent-帮你看)，然后说「看看我的徽章」。

<p align="center">
  <img src="assets/spin.gif" alt="三枚旋转的徽章：Claude Code 初次相遇、Agent Badges 标志、Codex 初次启动" width="720" />
</p>

## 有什么

- **两个工具，39 枚徽章。** Claude Code 19 枚，Codex 20 枚：里程碑、连续打卡、功能探索，还有几枚隐藏彩蛋。分级徽章从铜到白金逐级升级。
- **真 3D。** 每枚徽章都由 three.js 按一份配置程序化生成，材质有珐琅、抛光金属、拉丝金属、陶瓷、全息镭射、水晶。可以拖动旋转，翻到背面看刻字。
- **成就档案。** 解锁进度环、累计 Token、活跃天数、最长连续，最近获得了什么、离哪几枚最近。
- **年度热力图。** 每天的 Token 用量排成日历，两个工具叠在一起看：同一天都用了就一格两色；解锁徽章的日子有一个小圆点。
- **可以分享。** 任意一枚导出 2048 像素 PNG（透明或墨色背景），一键生成整面墙的分享海报，或者把成就卡片放到 GitHub 个人主页。
- **中英双语。** 页面跟随浏览器语言，顶栏可以切换。

![徽章墙：成就档案、年度热力图和第一排徽章](assets/screenshot-wall.png)

<details>
<summary><b>全部徽章</b></summary>

**Claude Code**

![全部 Claude Code 徽章](assets/gallery-claude-code.png)

**Codex**

![全部 Codex 徽章](assets/gallery-codex.png)

每排最后的两个 `???` 是隐藏成就，获得之后才会揭晓。

</details>

## 让 Agent 帮你看

Agent Badges 带有一个给 Claude Code 和 Codex 用的技能（Skill）。直接用平常的话问，比如「看看我的徽章」「我刚解锁了什么」或 "check my badges"。Agent 会在你的电脑上运行命令行，然后告诉你新解锁了什么、总共解锁了多少、离哪几枚最近。

```text
> 看看我的徽章

上次之后新解锁：Bash 狂人。
Claude Code：已解锁 15 / 19。
快解锁了：连接者 2 / 3 · 子代理指挥官 3 / 5 · Token 里程碑 48M / 100M。

要我打开 3D 徽章墙，或者生成一张 GitHub 个人主页的成就卡片吗？
```

<sub>回复示例，用示例数据生成。</sub>

### 安装

**Claude Code**

```text
/plugin install agent-badges --marketplace Aryous/agent-badges
```

较旧的版本需要先添加市场：`/plugin marketplace add Aryous/agent-badges`，再运行 `/plugin install agent-badges@agent-badges`。

**Codex**

```bash
codex plugin marketplace add Aryous/agent-badges
codex plugin add agent-badges@agent-badges
```

只想装技能、不装插件的话，在 Codex 里说：

```text
$skill-installer install https://github.com/Aryous/agent-badges/tree/main/skills/badges
```

装好后新开一个 Codex 会话，它才会加载这个技能。

**其他 Agent**

这个技能就是一个标准的 [Agent Skills](https://agentskills.io) 目录：[`skills/badges`](skills/badges)。可以把它复制到任何支持 `SKILL.md` 的 Agent 里，也可以让 Agent 直接调用命令行、读取 [JSON 输出](#json-输出)。

### 怎么运作

| | Claude Code | Codex |
| --- | --- | --- |
| 怎么用 | 问起你的徽章，或者输入 `/agent-badges:badges` | 问起你的徽章，或者输入 `$` 选择 `agent-badges:badges`（只装了技能的话是 `$badges`） |
| 运行什么 | `npx -y agent-badges@latest collect --json` | 同左 |
| 权限 | 技能只预先放行只读的命令（`collect`，以及不带 `--yes` 的 `publish`）。发布到主页这类会改动东西的命令照常先问你 | 命令在 Codex 的沙箱里运行。npx 要联网下载，命令行要写入 `~/.agent-badges`，所以 Codex 通常会请你批准这条命令 |

- Agent 只汇报命令行输出的内容，不会编造徽章、日期或数字。
- 打开徽章墙、生成主页图片、导出网页，Agent 只会提议，不会擅自执行。提交或推送你的主页仓库之前也会先问你。
- 技能总是运行 npm 上的最新版本，新徽章上线后不用重装任何东西。

### JSON 输出

给脚本或者没装技能的 Agent 用：

```bash
npx agent-badges collect --json --lang zh
```

```json
{
  "home": "/Users/you/.agent-badges",
  "brands": [
    {
      "id": "claude-code",
      "brand": "Claude Code",
      "unlocked": 15,
      "total": 19,
      "newUnlocks": [{ "id": "bash-maniac", "title": "Bash 狂人", "earnedAt": "2025-11-19" }],
      "recent": [{ "id": "anniversary", "title": "一周年", "earnedAt": "2026-03-02" }],
      "nearMiss": [{ "id": "tokens", "title": "Token 里程碑", "current": 48000000, "target": 100000000 }]
    }
  ]
}
```

- `newUnlocks`：上次运行之后新获得的徽章，第一次运行时为空。分级徽章还带有 `tier`（`bronze`、`silver`、`gold`、`platinum`），升级时 `upgrade` 为 `true`。
- `recent`：最近获得的三枚。
- `nearMiss`：最接近解锁的最多三枚。
- 没装的工具不会出现在结果里。`--brand codex` 只看一个工具，`--lang en` 输出英文名称。

## 快速开始

需要 **Node.js 22.15 或更高版本**（用到了 Node 内置的 zstd 解压和 SQLite）。在 macOS 上开发，CI 在 Linux 上测试；Windows 理论上可用，但还没实际试过。

```bash
npx agent-badges                    # 采集本机数据，打开徽章墙
npx agent-badges collect            # 只采集，在终端打印汇总
npx agent-badges collect --json     # 同样的汇总，JSON 格式
npx agent-badges export ./my-wall   # 导出可离线打开的静态网页（含你的统计数字）
npx agent-badges publish            # 把徽章放到 GitHub 个人主页（会先问你）
npx agent-badges shelf              # 把已解锁的徽章保存成 PNG，放进 GitHub 个人主页
npx agent-badges card               # 生成成就卡片 SVG，放进 GitHub 个人主页
```

| 选项 | |
| --- | --- |
| `--brand claude-code\|codex` | 只看某个工具 |
| `--port <端口>` | 本地页面端口（默认 4747，被占用时自动往后找） |
| `--no-open` | 不自动打开浏览器 |
| `--json` | 以 JSON 输出汇总（`collect`） |
| `--lang en\|zh` | 汇总、陈列图和卡片的语言（汇总默认跟随系统，陈列图和卡片默认英文） |
| `--out <文件>` | `shelf` 或 `card` 的保存位置 |
| `--yes` | `publish`：不再询问，直接执行（看过计划之后再用） |
| `--name <名字>` | 卡片和公开版徽章墙上的名字（默认用你的 GitHub 用户名） |
| `--theme dark\|light` | 卡片配色 |

| 环境变量 | 默认值 |
| --- | --- |
| `AGENT_BADGES_HOME` | `~/.agent-badges`（账本和缓存的位置） |
| `CLAUDE_CONFIG_DIR` | `~/.claude` |
| `CODEX_HOME` | `~/.codex` |

第一次运行要读完全部会话记录，Codex 记录有几 GB 的话需要一些时间；之后只处理新增或变化的文件。

## 放到 GitHub 个人主页

跟 Agent 说「把我的徽章放到 GitHub 主页」，或者运行：

```bash
npx agent-badges publish --lang zh
```

主页上会出现一张徽章图，点它打开你在 GitHub Pages 上的 3D 徽章墙。实际效果：[github.com/Aryous](https://github.com/Aryous) → [aryous.github.io/Aryous](https://aryous.github.io/Aryous/)。

它会先检查一遍、列出计划，问过你再动手。你同意后它会：

1. 如果你还没有主页仓库（`<用户名>/<用户名>`），新建一个公开仓库；
2. 在浏览器标签页里渲染你已解锁的徽章；
3. 写入公开版徽章墙和徽章图，并把图片加进 README 里 `<!-- agent-badges:start -->` 和 `<!-- agent-badges:end -->` 之间。已经有主页 README 的话，徽章加在最后，其他内容一个字不动；
4. 提交、推送、开启 GitHub Pages，等网页能打开。

想更新徽章时再运行一次就行。它在 `~/.agent-badges/profile/` 里自己管理一份仓库副本，你不需要克隆任何东西。

**需要** [GitHub 命令行工具 gh](https://cli.github.com)，并用 `gh auth login` 登录。它只在自己的 git 命令里临时使用 gh 的凭证，不改你的 git 设置。

**会公开什么：** 已解锁的徽章和等级、徽章进度和解锁日期、每天的 Token 用量和对话轮数（热力图）。网页里只放页面上看得到的东西：未解锁的隐藏徽章不放，更新时间只到日期，详细账本（一天中几点在用、工具调用、模型名字）不会离开你的电脑。旧版本会留在仓库的 git 历史里。

如果主页仓库是私有的、GitHub Pages 已经设置成从别处发布，或者根目录已有不是它生成的 `index.html`，它会停下来告诉你，不做改动。

想自己管理仓库的话，`npx agent-badges profile 路径/<用户名>` 只往那个目录写入徽章图和网页，并打印 README 里要写的一行，不会替你提交。

### 只要徽章图

```bash
npx agent-badges shelf --out 路径/<用户名>/agent-badges-shelf.png --lang zh
```

3D 徽章要用 WebGL 渲染，所以这条命令会在你的浏览器里打开一个标签页，画出你已解锁的全部徽章，把 PNG 交回终端保存后退出。图片背景透明，GitHub 深浅两种主题下都能看清。图里只有已解锁的徽章、名字和等级，没有日期，也没有用量数字。在徽章墙上点「GitHub 主页图」按钮也能生成。

```html
<img src="./agent-badges-shelf.png" alt="Agent Badges" width="720">
```

<p align="center">
  <img src="assets/shelf-example.png" alt="徽章陈列图示例（示例数据）" width="600" />
</p>

### 成就卡片

```bash
npx agent-badges card --name "你的名字" --lang zh
```

会生成 `agent-badges-card.svg`：解锁数、累计数字、最长连续和最近的活动格子。不需要浏览器，在远程服务器上也能用。

```markdown
![Agent Badges](./agent-badges-card.svg)
```

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/card-light.svg" />
    <img src="assets/card-dark.svg" alt="成就卡片示例（示例数据）" width="540" />
  </picture>
</p>

卡片里只有数字。

## 隐私

它读的是你本机上工具自己写下的记录，所以规则定得很死，并且有测试保证。

- **只在本机。** 读取 `~/.claude` 和 `~/.codex`，结果写到 `~/.agent-badges`。页面只监听 `127.0.0.1`，局域网里的其他设备也访问不到。没有网络请求，没有统计。
- **只读元数据。** 每一行记录解析后立刻只保留白名单字段：时间戳、Token 计数、工具名、模式取值。对话内容、代码、工具参数和结果当场丢弃，从不保存。可能透露你在做什么的名字（MCP 服务名、Codex 的模型名）会哈希；Claude 的模型名只保留家族名（opus、sonnet、haiku、fable）。
- **从不打开的文件。** Claude Code：`settings.json`、`.credentials.json`、MCP 配置、`history.jsonl`、`shell-snapshots`、`session-env`、`paste-cache`、`file-history`。Codex：`auth.json`、`config.toml`、`*.env`、`history.jsonl`、`transcription-history.jsonl`、`thread_history*.sqlite`、`logs*.sqlite`、`memories*`、`shell_snapshots`。
- **Codex 会话索引库。** `state_*.sqlite` 以只读方式打开，只 SELECT 六列：创建时间、来源、会话类型、模型、推理强度、审批策略。标题、首条消息、预览、路径、git 信息、账号 id 一律不读。
- **保存了什么。** `~/.agent-badges` 里是按天汇总的账本，只有数字、日期和哈希。工具清理旧记录之后，已经拿到的徽章也不会消失。
- **有测试。** 测试会在伪造的 `~/.claude` 和 `~/.codex` 里塞入假密钥、对话、路径和会话标题，真跑一遍采集和导出，确认它们不会出现在任何输出里。

在线演示和 npm 包里都没有任何个人数据。只有 `export`、`card`、`shelf` 和 `profile` 会写出和你使用情况有关的文件，而且只写到你指定的位置。`publish` 和 `profile` 生成的网页就是用来公开的，[里面有什么](#放到-github-个人主页)写在上面。

## 统计口径

| | Claude Code | Codex |
| --- | --- | --- |
| 会话 / 线程 | Claude Code 记录里的会话（子代理记录不计） | 你自己发起的线程（VS Code、CLI、`exec`），子代理和自动审查不计 |
| Token | 输入 + 输出 + 缓存写入 + 缓存命中（与 ccusage 一致），含子代理记录；同一条消息只计一次，取最完整的数字 | 输入（含缓存命中）+ 输出，同一次响应只计一次；分叉或子代理线程从父线程复制来的记录只计一次 |
| 工具调用 | 只算主会话（子代理的调用不计） | — |
| 夜猫子 / 早起鸟 | 你发消息时的本地时间（0–5 点 / 5–7 点） | 你发起一轮对话的本地时间 |
| 马拉松 | 单个会话的活跃时长，两条记录间隔超过 30 分钟不计 | 同左 |
| 连续天数 | 有任何活动的连续天数 | 同左 |

徽章定义在 [`src/brands`](src/brands)，各工具的统计逻辑在 `src/data/<工具>-metrics.js`。

## 开发

```bash
npm install
npm run collect          # 采集本机数据到 ~/.agent-badges，开发服务器会自动注入
npm run dev              # http://localhost:5173（徽章墙）
npm test                 # 单元测试 + CLI 端到端测试
npm run build            # dist/index.html：单文件、不含个人数据
npm run build:site       # dist-site/：落地页 + 在线演示（示例数据）
npm run check:pack       # 打包、装进临时目录、真跑一次 CLI
```

浏览器检查需要先启动开发服务器（`npx vite --port 5199`）并装有 Google Chrome：`npm run check:browser` 检查徽章墙，`npm run check:site` 检查构建好的站点。`node scripts/assets.mjs` 用示例数据重新生成 README 里的图片。

徽章墙的页面参数：`?source=mock`（示例数据）、`?lang=en|zh`、`?brand=codex`、`#<徽章 id>`（直接打开某一枚）、`?preview=unlocked&tier=2`（把所有徽章预览成某一级的已解锁状态）。

```
src/
├─ engine/    徽章引擎：轮廓、材质、浮雕、文字、分级（不含任何品牌信息）
├─ brands/    每个工具一个目录：色板、徽章配置、英文文字
├─ data/      统计口径、按天数据、示例数据
├─ collect/   本机采集、汇总、成就卡片（CLI 使用）
├─ viewer/    舞台、陈列墙、单枚查看、热力图、海报、导出
├─ site/      落地页
└─ project/   Agent Badges 标志和素材工作台
bin/          命令行
skills/       Agent 技能，Claude Code 和 Codex 共用
.claude-plugin/              Claude Code 插件和市场
plugin.json、.agents/plugins/  Codex 插件和市场
```

### 新增一枚徽章

在 `src/brands/<工具>/series/` 对应系列的文件里加一份配置，再在 `src/brands/<工具>/en.js` 里写上英文名和说明，不用改引擎。

- **轮廓**：`circle`（可加 `reeded` 滚花边）、`polygon`（八边形、圆角方形等）、`starburst`、`shield`、`gear`
- **材质**：`enamel`、`polished-metal`、`brushed-metal`、`ceramic`、`anodized`（阳极氧化铝）、`holographic`（全息镭射）、`crystal`（水晶宝石）
- **浮雕基元**：`capsule` 胶囊线条、`circle` 圆片、`ring` 圆环、`pixels` 像素图（字符画，`'#'` 为实心）、`text-arc` 弧形立体文字、`text` 水平立体文字、`gem` 宝石、`path` SVG 路径
- **底纹**：在 `face` 层或浮雕上加 `pattern: 'sunburst' | 'rings'`
- **叠放**：浮雕的 `z` 表示在正面板之上再抬高多少，用于把图案放在中心圆盘上
- **分级**：写 `tiers: [{ threshold, metal, label, accent? }]`，造型里用 `'$metal'`、`'$accent'`、`'{label}'` 占位，引擎按数据算出等级并逐级校验
- **隐藏**：`hidden: true`，未解锁时正面只显示像素问号，标题显示为 `???`
- **坐标和颜色**：以徽章中心为原点、外接半径约为 1；颜色写品牌色板里的键名，不直接写色值

配置会在启动时校验，写错的字段会在开发模式下直接显示在页面上。设计时可以用截图工具：

```bash
node scripts/peek.mjs "http://localhost:5199/?preview=unlocked" out.png <徽章id> [角度]
```

角度传 `3.14159` 截背面；传 `hold:0.6` 会把徽章钉在斜角，用来检查全息等材质的侧面效果。

### 新增一个工具

新建 `src/brands/<id>/`（色板、构图工具、徽章配置、`en.js`），在 `src/brands/index.js` 登记，在 `src/data/progress.js` 加上数据源和示例数据，再在 `src/collect/` 写一个采集器并配上泄漏测试。欢迎 PR。

## 致谢

- 文字环字形来自 [Outfit](https://fonts.google.com/specimen/Outfit) Bold（SIL Open Font License 1.1），由 `node scripts/build-font.mjs` 提取。
- Codex 标志路径来自 [LobeHub Icons](https://github.com/lobehub/lobe-icons)（MIT）。
- Claude Code 像素小怪物按 [Simple Icons](https://simpleicons.org/) 中的 Claude Code 图标逐格还原。
- 渲染使用 [three.js](https://threejs.org/)。

## 免责声明

Agent Badges 是一个非官方、非商业的兴趣项目，与 Anthropic、OpenAI 没有关联，也未获得其认可或赞助。Claude、Claude Code、Codex 及相关标志是各自所有者的商标，这里仅用于标明每枚徽章对应的工具。MIT 许可只覆盖本项目的代码，不授予这些商标的任何权利。

## 许可

[MIT](LICENSE) © 2026 Aryous
