import { MEDALLION_H, codexMark } from '../helpers.js';

// Codex 功能探索系列：每个 Codex 能力一枚。
//
// 家族语言（与 Claude Code 的「圆角方形 App 图标」区分开）：
//   平顶圆角六边形「工牌」：拉丝钛外框 → 深色珐琅底 → 顶部 CODEX 字样
//   → 居中的亮色放射纹圆盘（Codex 标志和功能图标在这里互动）
//   → 底部一块抛光金属铭牌，刻着功能名。
// 六枚共用外框和铭牌，只换一组主色和中间的图案。

const PLATE_Y = -0.655;
const PANEL_C = [0, 0.05];
const PANEL_R = 0.52;
const Z = MEDALLION_H;

// 图案按 0.47 半径的圆盘设计，统一放大到实际圆盘大小
const ART_K = PANEL_R / 0.47;
const sp = ([x, y]) => [PANEL_C[0] + (x - PANEL_C[0]) * ART_K, PANEL_C[1] + (y - PANEL_C[1]) * ART_K];
/** 把一组浮雕绕圆盘中心等比放大（只改平面尺寸，不改高度）。 */
function scaleArt(items) {
  return items.map((it) => {
    const o = { ...it };
    if (o.center) o.center = sp(o.center);
    if (o.from) o.from = sp(o.from);
    if (o.to) o.to = sp(o.to);
    for (const k of ['radius', 'width', 'cell', 'scale', 'size']) if (typeof o[k] === 'number') o[k] *= ART_K;
    if (o.kind === 'path' && o.center === undefined) o.center = sp([0, 0]);
    return o;
  });
}

/** 成套的外框、文字、圆盘和铭牌。 */
function featureBadge({ id, title, titleEn, description, metric, target, band, panel, label, art }) {
  return {
    id,
    title,
    titleEn,
    description,
    criteria: { metric, target },
    shape: { type: 'polygon', sides: 6, rotation: 0, radius: 1.1, cornerRadius: 0.3, depth: 0.2, bevel: 0.04 },
    layers: [
      { kind: 'rim', material: 'brushed-metal', color: 'silver' },
      { kind: 'face', material: 'enamel', color: band, inset: 0.11, pattern: 'rings' },
    ],
    relief: [
      // 顶部品牌字
      { kind: 'text', text: 'CODEX', size: 0.074, center: [0, 0.69], tracking: 0.42, material: 'polished-metal', color: 'silver', height: 0.022 },
      // 中央圆盘
      { kind: 'circle', center: PANEL_C, radius: PANEL_R, material: 'enamel', color: panel, height: Z, pattern: 'sunburst' },
      { kind: 'ring', center: PANEL_C, radius: PANEL_R + 0.006, width: 0.028, material: 'polished-metal', color: 'silver', height: 0.034 },
      // 底部铭牌 + 刻字
      { kind: 'capsule', from: [-0.38, PLATE_Y], to: [0.38, PLATE_Y], width: 0.17, material: 'polished-metal', color: 'silver', height: 0.03 },
      { kind: 'text', text: label, size: 0.06, center: [0, PLATE_Y], tracking: 0.24, material: 'enamel', color: 'ink', height: 0.012, z: 0.03 },
      ...scaleArt(art),
    ],
    back: { material: 'brushed-metal', color: 'silver', safeRadius: 0.62 },
  };
}

// ---------- 1. 多智能体：主标志派生出三朵小云 ----------

const SUBS = [
  [-0.28, -0.17],
  [0.28, -0.17],
  [0, -0.27],
];

const multiAgent = featureBadge({
  id: 'multi-agent',
  title: '多智能体',
  titleEn: 'MULTI-AGENT',
  description: '派生过子代理，让几朵小云分头干活。一个人，一支队伍。',
  metric: 'features.spawnAgent',
  target: 1,
  band: 'teal',
  panel: 'aqua',
  label: 'MULTI-AGENT',
  art: [
    // 连线
    ...SUBS.map(([x, y]) => ({
      kind: 'capsule', from: [x * 0.35, 0.02 + y * 0.35], to: [x * 0.82, y * 0.82 + 0.02],
      width: 0.016, material: 'polished-metal', color: 'silver', height: 0.016, z: Z,
    })),
    ...codexMark({ size: 0.2, center: [0, 0.12] }),
    ...SUBS.flatMap(([x, y]) => codexMark({ size: 0.085, center: [x, y], height: 0.045, inlay: 'snow' })),
  ],
});

// ---------- 2. 计划清单：一张待办，两项已勾，一项进行中 ----------

const CHECK = ['.....#', '....##', '#..##.', '####..', '.##...'];
const DOT = ['.##.', '####', '####', '.##.'];
const BOX = ['########', '#......#', '#......#', '#......#', '#......#', '#......#', '#......#', '########'];
const plRows = [0.17, 0.04, -0.09];

const planTracker = featureBadge({
  id: 'plan-tracker',
  title: '计划清单',
  titleEn: 'PLAN TRACKER',
  description: '用 update_plan 列过计划。先写清单，再动手，一项一项打勾。',
  metric: 'features.updatePlan',
  target: 1,
  band: 'forest',
  panel: 'lime',
  label: 'PLAN',
  art: [
    // 清单纸：圆角矩形，顶部一条夹子
    {
      kind: 'pixels', rows: Array.from({ length: 23 }, (_, r) => (r === 0 || r === 22 ? '.' + '#'.repeat(18) + '.' : '#'.repeat(20))),
      cell: 0.021, center: [-0.08, 0.05], material: 'enamel', color: 'snow', height: 0.03, z: Z, bevel: 0.008,
    },
    { kind: 'capsule', from: [-0.16, 0.28], to: [0, 0.28], width: 0.05, material: 'polished-metal', color: 'silver', height: 0.024, z: Z + 0.03 },
    ...plRows.flatMap((y, i) => [
      { kind: 'pixels', rows: BOX, cell: 0.011, center: [-0.21, y], material: 'polished-metal', color: 'steel', height: 0.012, z: Z + 0.03 },
      i < 2
        ? { kind: 'pixels', rows: CHECK, cell: 0.016, center: [-0.205, y + 0.008], material: 'enamel', color: 'emerald', height: 0.02, z: Z + 0.03 }
        : { kind: 'pixels', rows: DOT, cell: 0.013, center: [-0.21, y], material: 'enamel', color: 'amber', height: 0.02, z: Z + 0.03 },
      { kind: 'capsule', from: [-0.13, y], to: [i === 1 ? -0.0 : 0.07, y], width: 0.028, material: 'enamel', color: 'steel', height: 0.012, z: Z + 0.03 },
    ]),
    ...codexMark({ size: 0.15, center: [0.2, -0.17], z: Z + 0.03 }),
  ],
});

// ---------- 3. 深度思考：推理强度表盘拉到最右 ----------

const GAUGE_C = [0, 0.02];
const GAUGE_R = 0.3;
const GAUGE_COLORS = ['mint', 'mint', 'lime', 'amber', 'amber', 'scarlet', 'ruby'];
const gaugeSegs = GAUGE_COLORS.map((color, i) => {
  const a0 = Math.PI - (i / GAUGE_COLORS.length) * Math.PI - 0.06;
  const a1 = Math.PI - ((i + 1) / GAUGE_COLORS.length) * Math.PI + 0.06;
  const p = (a) => [GAUGE_C[0] + Math.cos(a) * GAUGE_R, GAUGE_C[1] + Math.sin(a) * GAUGE_R];
  return { kind: 'capsule', from: p(a0 - 0.08), to: p(a1 + 0.08), width: 0.055, material: 'enamel', color, height: 0.03, z: Z };
});
const NEEDLE_A = 0.22;

const deepThinker = featureBadge({
  id: 'deep-thinker',
  title: '深度思考',
  titleEn: 'DEEP THINKER',
  description: '把推理强度开到 xhigh 或 ultra。多想一会儿，答案会更好。',
  metric: 'features.highEffort',
  target: 1,
  band: 'plum',
  panel: 'honey',
  label: 'ULTRA',
  art: [
    ...gaugeSegs,
    // 指针拉到最右
    {
      kind: 'capsule', from: GAUGE_C, to: [GAUGE_C[0] + Math.cos(NEEDLE_A) * 0.25, GAUGE_C[1] + Math.sin(NEEDLE_A) * 0.25],
      width: 0.03, material: 'polished-metal', color: 'silver', height: 0.05, z: Z,
    },
    { kind: 'circle', center: GAUGE_C, radius: 0.045, material: 'polished-metal', color: 'silver', height: 0.06, z: Z },
    ...codexMark({ size: 0.15, center: [0, -0.22] }),
  ],
});

// ---------- 4. 全自动：标志坐上火箭 ----------

const ROCKET = [
  '.....##.....',
  '....####....',
  '...######...',
  '...######...',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '.##########.',
  '############',
  '###.####.###',
  '##..####..##',
  '#...####...#',
];
const FLAME = ['.######.', '.######.', '..####..', '..####..', '...##...'];
const FLAME_CORE = ['.##.', '.##.', '..#.'];
const ROCKET_C = [0.04, 0.1];
const ROCKET_CELL = 0.03;
const ROCKET_BOTTOM = ROCKET_C[1] - (ROCKET.length / 2) * ROCKET_CELL;
const PORT_C = [ROCKET_C[0], ROCKET_C[1] + 0.07];

const fullAuto = featureBadge({
  id: 'full-auto',
  title: '全自动',
  titleEn: 'FULL AUTO',
  description: '在无需审批的模式下放手让 Codex 干活。系好安全带，点火。',
  metric: 'features.fullAuto',
  target: 1,
  band: 'crimson',
  panel: 'sand',
  label: 'FULL AUTO',
  art: [
    // 速度线
    ...[-0.1, 0.02, 0.14].map((dy, i) => ({
      kind: 'capsule', from: [-0.36 + i * 0.03, ROCKET_C[1] + dy - 0.08], to: [-0.2, ROCKET_C[1] + dy - 0.08],
      width: 0.022, material: 'enamel', color: 'steel', height: 0.012, z: Z,
    })),
    // 尾焰：紧贴箭体底部
    { kind: 'pixels', rows: FLAME, cell: ROCKET_CELL * 0.9, center: [ROCKET_C[0], ROCKET_BOTTOM - FLAME.length * ROCKET_CELL * 0.45 + 0.01], material: 'enamel', color: 'amber', height: 0.024, z: Z },
    { kind: 'pixels', rows: FLAME_CORE, cell: ROCKET_CELL * 0.8, center: [ROCKET_C[0], ROCKET_BOTTOM - 0.04], material: 'enamel', color: 'snow', height: 0.03, z: Z },
    { kind: 'pixels', rows: ROCKET, cell: ROCKET_CELL, center: ROCKET_C, material: 'enamel', color: 'scarlet', height: 0.035, z: Z },
    // 舷窗里坐着 Codex
    { kind: 'circle', center: PORT_C, radius: 0.085, material: 'enamel', color: 'snow', height: 0.012, z: Z + 0.035 },
    { kind: 'ring', center: PORT_C, radius: 0.09, width: 0.02, material: 'polished-metal', color: 'silver', height: 0.022, z: Z + 0.035 },
    ...codexMark({ size: 0.068, center: PORT_C, height: 0.03, z: Z + 0.047, inlay: 'snow' }),
  ],
});

// ---------- 5. 审查官：放大镜底下一行行代码 ----------

const LENS_C = [0.06, 0.1];
const LENS_R = 0.17;
const CODE_LINES = [
  [0.27, -0.3, 0.06, 'steel'],
  [0.13, -0.3, 0.18, 'sky'],
  [-0.01, -0.22, 0.02, 'steel'],
  [-0.15, -0.3, 0.12, 'lilac'],
  [-0.29, -0.22, 0.08, 'steel'],
];

const reviewer = featureBadge({
  id: 'reviewer',
  title: '审查官',
  titleEn: 'REVIEWER',
  description: '用过自动代码审查。再小的问题，也逃不过这片放大镜。',
  metric: 'features.autoReview',
  target: 1,
  band: 'navy',
  panel: 'snow',
  label: 'REVIEW',
  art: [
    ...CODE_LINES.map(([y, x0, x1, color]) => ({
      kind: 'capsule', from: [x0, y], to: [x1, y], width: 0.04, material: 'enamel', color, height: 0.014, z: Z,
    })),
    // 放大镜
    { kind: 'capsule', from: [LENS_C[0] + 0.13, LENS_C[1] - 0.13], to: [0.33, -0.21], width: 0.07, material: 'polished-metal', color: 'steel', height: 0.05, z: Z },
    { kind: 'circle', center: LENS_C, radius: LENS_R - 0.01, material: 'enamel', color: 'snow', height: 0.016, z: Z },
    ...codexMark({ size: 0.13, center: LENS_C, height: 0.04, z: Z + 0.016 }),
    { kind: 'ring', center: LENS_C, radius: LENS_R, width: 0.04, material: 'polished-metal', color: 'silver', height: 0.07, z: Z },
  ],
});

// ---------- 6. 编辑器搭档：编辑器窗口旁的 Codex ----------

const WIN_C = [-0.06, 0.08];
const WIN_W = 0.5;
const WIN_H = 0.38;
const BRACE_L = ['..##', '.#..', '.#..', '#...', '.#..', '.#..', '..##'];
const BRACE_R = BRACE_L.map((r) => [...r].reverse().join(''));

const ideBuddy = featureBadge({
  id: 'ide-buddy',
  title: '编辑器搭档',
  titleEn: 'IDE BUDDY',
  description: '在 VS Code 里用过 Codex。代码在左，搭档在右，配合默契。',
  metric: 'features.vscode',
  target: 1,
  band: 'slate',
  panel: 'sky',
  label: 'VS CODE',
  art: [
    // 窗口
    {
      kind: 'pixels',
      rows: Array.from({ length: 19 }, () => '#'.repeat(25)),
      cell: WIN_W / 25, center: WIN_C, material: 'enamel', color: 'snow', height: 0.026, z: Z, bevel: 0.008,
    },
    // 标题栏
    {
      kind: 'pixels', rows: Array.from({ length: 3 }, () => '#'.repeat(25)),
      cell: WIN_W / 25, center: [WIN_C[0], WIN_C[1] + WIN_H / 2 - 0.03], material: 'enamel', color: 'slate', height: 0.012, z: Z + 0.026,
    },
    ...['scarlet', 'amber', 'mint'].map((color, i) => ({
      kind: 'circle', center: [WIN_C[0] - WIN_W / 2 + 0.05 + i * 0.045, WIN_C[1] + WIN_H / 2 - 0.03], radius: 0.013,
      material: 'enamel', color, height: 0.012, z: Z + 0.038,
    })),
    // { } 和代码行
    { kind: 'pixels', rows: BRACE_L, cell: 0.018, center: [WIN_C[0] - 0.17, WIN_C[1] - 0.04], material: 'enamel', color: 'electric', height: 0.014, z: Z + 0.026 },
    { kind: 'pixels', rows: BRACE_R, cell: 0.018, center: [WIN_C[0] + 0.17, WIN_C[1] - 0.04], material: 'enamel', color: 'electric', height: 0.014, z: Z + 0.026 },
    ...[
      [0.03, -0.09, 0.05, 'lilac'],
      [-0.04, -0.06, 0.09, 'sky'],
      [-0.11, -0.09, 0.02, 'steel'],
    ].map(([dy, x0, x1, color]) => ({
      kind: 'capsule', from: [WIN_C[0] + x0, WIN_C[1] + dy - 0.04], to: [WIN_C[0] + x1, WIN_C[1] + dy - 0.04],
      width: 0.026, material: 'enamel', color, height: 0.01, z: Z + 0.026,
    })),
    // 搭档：Codex 坐在窗口右下角
    ...codexMark({ size: 0.15, center: [0.23, -0.18], z: Z + 0.026 }),
  ],
});

export default [multiAgent, planTracker, deepThinker, fullAuto, reviewer, ideBuddy];
