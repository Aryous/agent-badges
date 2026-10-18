# Agent Badges：Claude Code 成就徽章 — 设计规格

- 日期：2026-10-18
- 状态：已确认设计，待评审规格
- 项目路径：`~/Documents/Code/agent-badges`

## 1. 目标

用 Three.js 制作 Apple Watch 运动徽章（Activity Awards）风格的 3D 成就徽章。首个品牌是 Claude Code，之后扩展到 Codex 等其他 Agent 工具。

首批交付 3 枚精品徽章，验证以下三件事：

1. **每枚徽章造型各不相同**：形状、材质、浮雕都不同，整套统一在 Claude Code 的品牌色调里。
2. **徽章即配置**：新增一枚徽章或一个品牌时，只写配置，不改引擎。
3. **数据接口已预留**：现阶段使用模拟数据；以后接入本地真实使用记录时，只替换数据层。

## 2. 范围

### 包含

- 3 枚徽章：初次相遇、七日连击、子代理指挥官。
- 陈列墙页面，包含已解锁和未解锁两种状态。
- 单枚查看：拖动旋转、惯性转动、停在正面或背面、获得动画及重播。
- 导出 PNG：2048×2048，背景可选透明或墨色。
- 数据接口，并附带一份模拟数据实现。
- 单文件 HTML 构建产物。

### 不包含（YAGNI）

- 读取 `~/.claude` 的真实日志：只预留接口，不实现。
- Codex 等其他品牌的徽章：只保证结构上能扩展，不做内容。
- 同一枚徽章切换多套风格。
- 移动端专门优化：只要求触摸拖动可用、布局不溢出。
- 音效。

## 3. 技术选型

- **渲染**：three.js（通过 npm 安装，锁定精确版本）。
  - 材质用 `MeshPhysicalMaterial`，按需使用 clearcoat、anisotropy、sheen。
  - 环境反射用 `RoomEnvironment` 经过 `PMREMGenerator` 生成。
- **几何**：
  - 轮廓用 `THREE.Shape` 配合 `ExtrudeGeometry`，开启 bevel。
  - 图标和数字由 SVG path 字符串经 `SVGLoader` 解析后挤出成浮雕。
- **背面刻字**：用 Canvas 2D 以系统中文字体（PingFang SC，回退 sans-serif）绘制文字，生成 `bumpMap` / `roughnessMap`。
- **工具链**：
  - Vite 用于开发服务器和构建。
  - `vite-plugin-singlefile` 用于输出单文件 HTML。
  - Vitest 用于单元测试。
- **语言**：原生 ES Modules（JavaScript），不引入框架。

## 4. 架构

```
agent-badges/
├─ index.html
├─ src/
│  ├─ main.js                 入口：加载品牌包 + 数据 → 启动 viewer
│  ├─ engine/                 只认配置，不含任何品牌信息
│  │  ├─ shapes.js            轮廓生成器：circle / hexagon / starburst
│  │  ├─ materials.js         材质预设：enamel / brushed-metal / polished-metal / ceramic / locked
│  │  ├─ relief.js            SVG path → 浮雕 Mesh
│  │  ├─ engraving.js         背面刻字贴图
│  │  ├─ badge.js             buildBadge(config, brand, state) → THREE.Group
│  │  └─ validate.js          配置校验
│  ├─ brands/
│  │  └─ claude-code/
│  │     ├─ brand.js          色板、字体、刻字模板
│  │     └─ badges.js         3 枚徽章配置
│  ├─ data/
│  │  ├─ progress.js          数据接口 getProgress(brandId) → ProgressMap
│  │  └─ mock-claude-code.js  模拟数据
│  └─ viewer/
│     ├─ scene.js             renderer、相机、灯光、环境
│     ├─ wall.js              陈列墙
│     ├─ inspector.js         单枚查看与交互
│     ├─ award-animation.js   获得动画
│     └─ export.js            PNG 导出
├─ tests/                     Vitest 单元测试
└─ docs/superpowers/specs/    本文档
```

### 模块边界

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `engine/*` | 把一份配置变成 3D 对象 | three |
| `brands/*` | 品牌主题和徽章配置（纯对象，可含刻字模板这类小函数） | 无 |
| `data/*` | 给出每枚徽章的解锁状态和进度 | 无 |
| `viewer/*` | 场景、布局、交互、导出 | engine、three |

引擎不得引用任何品牌文件。新增品牌时，只需新增 `brands/<id>/` 和一份数据实现。

## 5. 数据约定

### 5.1 品牌配置（brand.js）

```js
export default {
  id: 'claude-code',
  name: 'Claude Code',
  palette: {
    background: '#141413',   // 暖墨色
    primary:    '#D97757',   // 陶土橙
    ivory:      '#F0EEE6',
    gold:       '#C9A36A',   // 暖金
    copper:     '#B87355',
    graphite:   '#3A3936',   // 未解锁剪影
  },
  engraving: {
    fontFamily: '"PingFang SC", "Helvetica Neue", sans-serif',
    // 背面刻字模板：标题 / 英文标题 / 获得日期
    lines: ({ title, titleEn, earnedAt }) => [title, titleEn, earnedAt],
  },
};
```

### 5.2 徽章配置（badges.js）

```js
{
  id: 'first-session',
  title: '初次相遇',
  titleEn: 'FIRST SESSION',
  description: '完成第一次 Claude Code 会话',
  criteria: { metric: 'sessions.total', target: 1 },   // 供未来数据层使用
  shape:   { type: 'circle', radius: 1, depth: 0.18, bevel: 0.06 },
  layers: [                                            // 由外到内叠放
    { kind: 'rim',  material: 'polished-metal', color: 'gold',    inset: 0 },
    { kind: 'face', material: 'enamel',         color: 'primary', inset: 0.12 },
  ],
  relief: [
    { svgPath: '...', material: 'ceramic', color: 'ivory', scale: 0.5, height: 0.05,
      effect: 'pulse' },                               // 可选：光标呼吸
  ],
  back: { material: 'brushed-metal', color: 'gold' },
}
```

- `color` 引用品牌色板的键名，不写死色值，以便同一套配置换品牌时自动换色。
- `validate.js` 负责校验必填字段、`shape.type` 和 `material` 是否在注册表内、`color` 键是否存在于色板，校验失败时抛出带徽章 id 的错误。

### 5.3 进度数据（ProgressMap）

```js
{
  'first-session':    { unlocked: true,  earnedAt: '2025-03-02', progress: { current: 1, target: 1 } },
  'seven-day-streak': { unlocked: true,  earnedAt: '2025-03-09', progress: { current: 7, target: 7 } },
  'subagent-commander': { unlocked: false, earnedAt: null,       progress: { current: 3, target: 5 } },
}
```

- `getProgress(brandId)` 返回 `Promise<ProgressMap>`，异步签名为以后读文件或请求接口预留。
- 某枚徽章缺少数据时，按「未解锁、进度 0」处理，不报错。

## 6. 三枚徽章

| | 初次相遇 `first-session` | 七日连击 `seven-day-streak` | 子代理指挥官 `subagent-commander` |
|---|---|---|---|
| 解锁条件 | 第一次会话 | 连续 7 天使用 | 同时启动 5 个子代理 |
| 轮廓 | 圆形，厚倒角 | 六边形，圆角 | 12 道圆头星芒（参考 Claude 星芒的感觉重新绘制，不复制官方标志） |
| 外圈 | 抛光暖金 | 无单独外圈，靠倒角高光 | 金色描边 |
| 主体 | 陶土橙珐琅，带清漆 | 拉丝铜，带各向异性高光 | 象牙白哑光陶瓷 |
| 正面浮雕 | 象牙色 `>_`，光标呼吸发光 | 大号「7」，外圈 7 个橙色珐琅圆点 | 中心节点连出 5 个子节点，节点用橙色珐琅 |
| 背面 | 拉丝金，刻字 | 拉丝铜，刻字 | 象牙陶瓷，刻字 |
| 模拟状态 | 已解锁 | 已解锁 | 未解锁 3/5 |

未解锁时的表现：
- 整枚徽章换成 `locked` 材质，即石墨色哑光、无清漆。
- 轮廓和浮雕保留，表现为剪影。
- 背面不显示获得日期，改为显示「未解锁」及进度。

## 7. 交互

### 陈列墙
- 墨色背景，顶部显示品牌名和已解锁数量，例如「2 / 3」。
- 徽章横排，各自带轻微悬浮和摆动，相位错开。
- 每枚徽章下方显示名称；未解锁的显示进度，例如「3 / 5」。
- 鼠标悬停时徽章轻微放大，并朝鼠标方向倾斜。
- 窄屏时改为纵向排列。

### 单枚查看
- 点击徽章后，它飞到画面中央并放大，其余徽章淡出。
- 交互：
  - 水平拖动：绕 Y 轴自由旋转。
  - 松手后：带惯性继续转动，阻尼衰减。
  - 速度低于阈值时：弹簧吸附到最近的正面（0°）或背面（180°）。
  - 垂直拖动：绕 X 轴倾斜，限制在 ±20°，松手回正。
- 支持鼠标和触摸（Pointer Events）。
- 界面元素：标题、描述、获得日期或进度、「重播动画」按钮、「导出 PNG」按钮（可选透明或墨色背景）、返回按钮。按 Esc 也可以返回。

### 获得动画
- 仅已解锁徽章有此动画。
- 徽章从远处飞入，同时快速旋转（约 2.5 圈，ease-out），停在正面后，一道高光扫过表面。
- 进入单枚查看时自动播放一次，之后可以手动重播。

### 导出 PNG
- 新建一个 2048×2048 的离屏 render target，以当前角度渲染。
- 背景可选透明（alpha）或墨色。
- 文件名格式为 `<brand>-<badge>-<front|back>.png`，通过 `<a download>` 保存。

## 8. 错误处理

- 浏览器不支持 WebGL 时，显示提示文案「当前浏览器不支持 WebGL」，不出现白屏。
- 配置校验失败时：
  - 开发模式下，在页面和控制台显示具体错误。
  - 构建产物中，跳过出错的徽章，其余徽章正常展示，同时输出 console.error。
- 数据接口 reject 时，所有徽章按未解锁展示，并显示提示「进度数据加载失败」。

## 9. 验证

1. **单元测试（Vitest）**：
   - `validate.js`：合法配置通过；缺少字段、未知材质、未知色键都要抛出错误。
   - `progress.js`：缺少数据时的默认值；reject 时的降级处理。
   - `shapes.js`：各种轮廓都能生成封闭的 Shape，星芒的数量参数生效。
2. **构建**：`npm run build` 成功，产出单文件 `dist/index.html`。
3. **浏览器实测**（截图存放在 `screenshots/`，不提交）：
   - 陈列墙：已解锁和未解锁状态都正确。
   - 每枚徽章的正面和背面，背面中文刻字清晰。
   - 拖动、惯性、吸附行为符合第 7 节描述。
   - 导出的 PNG 能正常打开，透明背景确实透明。
   - 控制台无报错。
4. **扩展性自检**：临时加一个只有色板不同的假品牌，确认 3 枚徽章不改配置就能自动换色。验证后删除。

## 10. 里程碑

1. 脚手架：Vite、three、Vitest、单文件构建。
2. 引擎：轮廓、材质、浮雕、刻字、组装、校验，附单元测试。
3. 3 枚徽章配置与陈列墙。
4. 单枚查看交互与获得动画。
5. PNG 导出与错误处理。
6. 浏览器全面验证与打磨。

每个里程碑验证通过后提交一次。
