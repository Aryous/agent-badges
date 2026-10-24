# 全解锁徽章（Completionist）设计

日期：2026-10-24 · 分支：`design/vitrine-wall` · 取代「陈列柜」设计文档里概览区的「进度铸币」（第一段 Task 3、4 和修正轮里的铸币部分）。

## 为什么

原来的进度铸币按页面控件的规矩做：主色只有午夜蓝，金色不超过 2%。结果它只有一种颜色加一种金属，没有主次，用户觉得单调，也显得土。

陈列馆里的徽章走的是另一套规则：
- 金属外圈；
- 深色珐琅环带（主色）；
- 金属文字和描边；
- 亮色珐琅圆盘（辅色）；
- 品牌原色的伙伴（点缀）。

全解锁徽章是陈列品，不是控件，所以按徽章的规则来。页面控件仍然按「陈列柜」的克制规矩。

经过六轮原型，用户在浏览器里确认了最终版。参考实现：`.superpowers/sdd/completionist-lab-reference.html`。它是一份原型代码，不能直接搬：里面的临时手法（第二枚徽章翻过来当背面、`#8c867c` 色键、`window.__front`）都要换成下面「实现约束」里的正式做法。

## 概念

**解锁徽章，就是一片片拼出你的伙伴。**
- 圆盘里一直有伙伴的「残影」：浅色、低矮的轮廓，告诉你最终要拼成什么。
- 每解锁一部分徽章，就有一片马赛克亮起，用品牌原色。
- 全部解锁时，伙伴完整，并且戴上王冠。

## 全解锁标准与阶段

- **全部徽章都算，包括限定徽章**（Claude Code 32 枚，Codex 30 枚，以当前品牌 `badges.length` 为准）。
- **阶段金属**按解锁数 k / 总数 n 划分：

  | 解锁数 | 金属 |
  |---|---|
  | k < ⌈n/4⌉ | 锡 `pewter` |
  | 至少 ⌈n/4⌉ | 铜 `bronze` |
  | 至少 ⌈n/2⌉ | 银 `silver` |
  | 至少 ⌈3n/4⌉ | 金 `gold` |
  | k = n | 完成形态：金，星芒外形 |

- **外圈、细线圈、小珠、文字、圆盘描边、月桂、星都是阶段金属，一起变。**

## 颜色

| 角色 | 色板键 | 值 |
|---|---|---|
| 主色：环带、正面背面的底 | `midnight` | `#141F4D`（已有） |
| 辅色：圆盘 | `sand` | 已有 |
| 残影 | `ghost` | `#cdb98f`（新增） |
| 环带上没拿到的戳记 | `dimBand` | `#2a3566`（新增） |
| 锡 | `pewter` | `#8c867b`（新增） |
| 铜、银、金 | `bronze` `silver` `gold` | 已有 |
| Claude Code 点缀 | `primary`（ceramic），眼睛 `ink` | 已有 |
| Codex 点缀 | 点阵按行取官方渐变：`lavender` `#B1A7FF` → `periwinkle` `#7A9DFF` → `electric` `#3941FF`，插值成 16 档 | 新增 `ramp0`…`ramp15`，只加在 Codex 色板 |

新增的键两个品牌都加，`ramp*` 只加在 Codex。品牌色板的契约测试如果要求两边键一致，就按测试的规则处理，并在报告里说明。

## 外形与版式（徽章单位，外接半径 1）

**外形**
- 进行中：`{ type: 'circle', radius: 1, depth: 0.22, bevel: 0.05, reeded: { count: 180, depth: 0.01 } }`
- 完成：`{ type: 'starburst', points: 24, radius: 1.06, innerRadius: 0.985, tipRoundness: 0.05, valleyRoundness: 0.03, depth: 0.24, bevel: 0.05 }`

**底层**
- 外圈：`polished-metal`，阶段金属。
- 环带：`enamel`，`midnight`，`inset: 0.11`，`pattern: 'rings'`。

**同心环。** 环带里全部用同心圆，不跟着星芒的起伏走，也不和外形相交、相切。这是用户明确要求的空间感。从外到内：
- 细线圈：`ring`，radius 0.83，width 0.012，height 0.014，bevel 0.002。倒角必须小于半宽，否则内孔会塌成实心圆。
- 小珠：84 颗 `circle`，radius 0.0085，排在半径 0.785 的圆上，height 0.012，bevel 0.003。
- 环形文字：`text-arc`，radius 0.69，size 0.088，tracking 0.22，height 0.024。
- 分隔符在 (±0.69, 0)：
  - Claude Code 用 `PLUS` 像素，cell 0.026，height 0.022；
  - Codex 用 `circle`，radius 0.02，height 0.022。
- 圆盘：`medallion({ radius: 0.56, color: 'sand', metal: 'polished-metal', metalColor: 阶段金属 })`，带 sunburst 底纹和金属描边。

### 正面

- **上弧：** `CLAUDE CODE` / `CODEX`。
- **下弧：** 进行中写 `${k} OF ${n}`；完成写 `COMPLETIONIST`。
- **马赛克：** 亮片数 = round(T × k / n)，T 是总片数。亮片按「从下往上、同一行从左往右」的顺序点亮。
  - **Claude Code：** `CLAWD` 的每个 `#` 是一片，共 108 片。
    - cell 0.04，中心 ((c − 7.5) × cell, 0.05 + (4.5 − r) × cell)。
    - 亮片：`rounded-rect`，half cell×0.44，radius cell×0.12，`ceramic` `primary`，height 0.05，bevel 0.006，z `MEDALLION_H`。
    - 残影：`rounded-rect`，half cell×0.36，radius cell×0.1，`enamel` `ghost`，height 0.008，bevel 0.002，z `MEDALLION_H`。
    - 眼睛 `CLAWD_EYES`：cell 0.04，中心 [0, 0.05]，`enamel` `ink`，height 0.03，bevel 0.004，始终显示。
  - **Codex：** 在 `CODEX_MARK`（viewBox 24，evenodd）上取 21×21 网格。
    - 格点 ((i+0.5)×24/21, (j+0.5)×24/21) 落在图形内（`>_` 的镂空不算）就是一片。
    - 映射到徽章：x = ((px − 12)/24) × 0.62，y = −((py − 12)/24) × 0.62。
    - 亮片：`circle`，radius = (24/21)/24 × 0.62 × 0.44，`enamel`，颜色按行 j 取 `ramp{round(j/20 × 15)}`，height 0.045，bevel 0.008，z `MEDALLION_H`。
    - 残影：radius ×0.8，`enamel` `ghost`，height 0.008，bevel 0.002。
    - brands 层不能用 DOM 或 engine。格点表预先算好，作为常量提交，用测试核对：测试里用 engine 的 `svgShapes` 加奇偶规则的点在多边形内判断，重新算一遍并比对。
- **王冠（仅完成形态）：**
  - Claude Code：像素王冠 `['#..#..#', '##.#.##', '#######', '#######']`，cell 0.028，中心 [0, 0.36]，阶段金属，height 0.05，z `MEDALLION_H`。
  - Codex：矢量王冠，path `M3.2 15.2 2.4 7.4 7.9 11.4 12 4.6 16.1 11.4 21.6 7.4 20.8 15.2Z M3.4 16.6h17.2v2.6H3.4Z`，viewBox 24，scale 0.085，中心 [0, 0.43]，height 0.045，bevel 0.006；三个尖顶上各加一颗 `circle`，radius 0.012，height 0.055，位置在 viewBox 的 (2.4, 6.6)、(12, 3.8)、(21.6, 6.6)。
  - 王冠和伙伴之间要留出明显空隙。用户特别指出过 Codex 的王冠和云重叠。

### 背面（只有浮雕，不用刻字贴图）

- 底：`enamel` `midnight`，不带刻字贴图（刻字占位贴图会发黑）。
- 细线圈、小珠、分隔符：同正面。上弧写品牌名。
- **四枚阶段戳记，放在环带下弧**（半径 0.69，角度 −90° ± 4.5°、± 13.5°，从左到右依次是铜、银、金、宝石）：
  - 前三枚：已达到的是 `rounded-rect`，half 0.033，radius 0.01，`polished-metal` 对应金属，height 0.026，bevel 0.008；没达到的同样大小，`enamel` `dimBand`，height 0.008。
  - 第四枚：完成时是 `gem`，radius 0.04，`enamel`（不用 `crystal`：透明材质透出深蓝环带会发黑），颜色用品牌点缀色（Claude Code `primary`，Codex `ramp7`），height 0.045；没完成是 `circle`，radius 0.033，`dimBand`。
- **圆盘：**
  - **月桂环（矢量）：** 左右各一枝，阶段金属，z `MEDALLION_H`。
    - 茎：沿半径 0.405 的圆弧生长。角度 θ(t) = −π/2 + side × (0.2 + t × 0.6π)，t 从 0 到 1。茎宽从 0.007 收到 0.0028，height 0.02。
    - 叶：7 对，位置 t = 0.06 + i/7 × 0.86。杏仁形，两段二次贝塞尔曲线，与茎的夹角 0.62 rad。外侧长 0.12×s，内侧长 0.1×s，半宽 0.026×s，其中 s = 1 − 0.45t。height 0.028。
    - 梢头一片顶叶，长 0.085，半宽 0.018。
    - 每片叶子是一个单独的浮雕件。不能把叶子拼进同一条 evenodd 路径，重叠的地方会被挖空。
    - 参考实现里的 `laurel()` 可以照搬几何算法。
  - **结：** `circle`，radius 0.026，中心 [0, −0.41]，品牌点缀材质，height 0.034。
  - **顶：**
    - 进行中：五角星 path（外半径 10、内半径 4.2，viewBox 24），scale 0.042，中心 [0, 0.39]，阶段金属，height 0.03。
    - 完成：王冠缩小到 0.8 倍，中心在 y = 0.36 附近。
  - **伙伴：**
    - Claude Code：`CLAWD`，cell 0.021，中心 [0, 0.02]，`ceramic` `primary`，height 0.05；眼睛 `ink`，height 0.028。
    - Codex：`codexMark({ size: 0.15, center: [0, 0.01], height: 0.05 })`，用官方渐变。

## 交互：概览区的实时铸币

- 概览区原来的 `<img>` 铸币，换成一个实时 3D 画布，大小不变（桌面 184px，640px 以下 140px）。
- 画布有自己的 WebGL 舞台，按落地页首屏 `src/site/main.js` 的做法。
- **进场动画：** 铸币第一次进入视野时播放，之后不再自动播放。
  1. 浮现：缩放从 0.9 到 1，0.6 秒，outCubic。
  2. 推进：以 ⌈n/4⌉、⌈n/2⌉、⌈3n/4⌉ 和 k 为分段点。每段时长 0.35 + 枚数 × 0.085 秒，用 inOutSine，也就是慢、快、慢。新亮的马赛克片用 outBack 弹出，0.34 秒，相邻片错开 0.012 秒；下弧文字跟着换。
  3. 升级（每跨过一个分段点）：
     - 撒一圈 50 颗火花，颜色是新金属、新金属、品牌点缀色，散开幅度 0.7；
     - 扫一道光，0.9 秒，峰值 30；
     - 铸币轻跳：缩放 1 + sin(πt) × 0.045，0.6 秒；
     - 阶段金属的材质颜色在 0.55 秒内从上一级渐变到下一级（inOutCubic），之后停 0.25 秒。
  4. 铸成（k = n）：
     - 停 0.35 秒；
     - 缩小到 0.05（0.28 秒，三次方缓入）；
     - 换成完成形态；
     - 撒 140 颗火花（金、品牌点缀色、象牙色），散开幅度 1.2；
     - 扫光 1.1 秒，峰值 36；
     - 用 outBack 放大回来，0.8 秒。
- **火花**和陈列馆获得徽章时的 `burst` 是同一种效果（`src/viewer/award-animation.js`）。抽成共用函数，不要复制一份。
- **平时：**
  - 轻轻摆动：绕 x 轴 0.04 + sin(0.55t) × 0.07，绕 y 轴 0.18 + sin(0.37t) × 0.22。摆动在进场开始 1.5 秒后，用 2.5 秒慢慢加进来。
  - 每 9 秒一道很淡的扫光，峰值 12。
- **拖动：** 左右拖动可以转动，松手后带惯性滑行，再吸附到最近的正面或背面。
- **减少动态效果**（`prefers-reduced-motion`）：直接显示最终状态，没有动画、摆动和扫光，仍然可以拖动。
- **不可见时停止渲染：** 用 IntersectionObserver，和落地页首屏一样。
- **没有 WebGL：** 保留现有的刻度环 SVG 兜底。
- **无障碍：** 画布 `aria-hidden`；外面的 figure 可以点开，所以带 `role="button"` 和 `tabindex="0"`（Enter / 空格打开），aria-label 写「全解锁徽章：已解锁 k / n，当前阶段：银」，英文同理。
- **点击铸币：** 打开单枚查看。

  | 项目 | 内容 |
  |---|---|
  | 标题 | 「全解锁」/ Completionist |
  | 说明 | 收集这个工具的全部徽章（含限定），每解锁一部分，就拼上伙伴的一片。全部解锁时伙伴完整，戴上王冠。 |
  | 进度条 | k / n，后面注明「下一阶段：银，还差 x 枚」；已完成时显示完成日期，没有日期就不写 |
  | 3D 模型 | 当前阶段的静态配置，背面是月桂 |

  它不进陈列墙，也不算进总数。

## 删除

- `src/engine/coin.js`、`tests/coin.test.js`、`src/viewer/coin.js`，以及 `thumbnails.js` 里渲染铸币的那一段。
- 文档、测试、检查脚本里引用旧铸币的地方，同步改掉。

## 实现约束

- **分层不变**（`tests/contracts.test.js`）：
  - 徽章配置生成放在 brands 层：共用版式在 `src/brands/shared/`，伙伴、马赛克、王冠、分隔符这些品牌部件在各品牌目录。
  - engine 只加通用能力：背面浮雕，不带刻字的背面板，材质记下自己的色板键。
  - viewer 管舞台和动画，app 管接线。
- **engine 新增两项通用能力（要有测试）：**
  - `config.backRelief`：背面的浮雕，按镜像装到背面板上，从背面看文字方向正确；`validateBadge` 用同样的规则检查它。
  - `config.back.engraving === false`：背面板不挂刻字贴图，只用 `config.back` 的材质。
- **找阶段金属材质：** `buildBadge` 生成的材质记下自己的色板键（`material.userData.colorKey`）。动画里按这个键找到阶段金属的材质，直接改颜色，外圈、文字、月桂一起变。不能再用参考实现里「多一个色阶的色值」那种临时手法。
  - 做法：配置生成函数接受 `metal` 参数，默认按阶段算。动画版传入一个只给全解锁徽章用的色板键 `stage`（值同锡色），避免和戳记的铜、银、金共用材质。
- **测试：**
  - 两个品牌的四个阶段加完成形态，都能通过 `validateBadge`；
  - 马赛克片数：Claude Code 108 片，Codex 和格点表一致；
  - 阶段划分的边界值；
  - Codex 格点表的核对；
  - 动画版的亮片、残影、文字索引正确；
  - 不显示的东西不进配置（静态版只放该显示的）。
- **浏览器检查**（`scripts/shoot.mjs` 或 `check:browser`）：概览区有画布；aria-label 里的 k 和页面解锁数一致；点开后能看到标题「全解锁」。
- `coin-lab.html` 和参考实现都不提交。
