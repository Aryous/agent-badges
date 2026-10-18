import { MEDALLION_H, around, codexMark, medallion, onMark, textRing } from '../helpers.js';

// Codex 限定纪念与隐藏彩蛋系列。
//
// 外形与 Claude Code 的限定系列、以及 Codex 其他系列刻意错开：
//   程序员节  16 瓣软云边（呼应 Codex 云形标志）  全息外圈 + 全息圆盘，{ >_ } 代码括号
//   一周年    滚花边纪念币                        全息外圈 + 戴派对帽的 Codex 标志
//   模型收藏家 平顶六边形（晶体切面）               铂金外圈 + 午夜蓝丝绒托盘上的四颗水晶
//   压缩大师  尖顶八边形                          金色外圈 + 上下两块压板夹住 Codex 标志

// ---------- 像素图 ----------

/** 一对金属尖括号 < >，用胶囊拼出，转角圆润。 */
function angleBrackets({ center: [cx, cy], gap, h, w, width = 0.036 }) {
  const common = { kind: 'capsule', width, material: 'polished-metal', color: 'silver', height: 0.045, z: MEDALLION_H };
  return [-1, 1].flatMap((s) => [
    { ...common, from: [cx + s * gap, cy + h], to: [cx + s * (gap + w), cy] },
    { ...common, from: [cx + s * (gap + w), cy], to: [cx + s * gap, cy - h] },
  ]);
}

/** 派对帽（11 列 × 10 行）：绒球 / 帽身 / 帽檐分开上色，网格尺寸相同以便对齐。 */
const HAT_POM = ['....###....', '....###....', ...Array(8).fill('...........')];
const HAT_CONE = [
  '...........',
  '...........',
  '.....#.....',
  '....###....',
  '....###....',
  '...#####...',
  '...#####...',
  '..#######..',
  '..#######..',
  '...........',
];
const HAT_DOTS = ['...........', '...........', '...........', '...........', '.....#.....', '...........', '...#...#...', '...........', '.....#.....', '...........'];
const HAT_BRIM = [...Array(9).fill('...........'), '.#########.'];

/** 双 V 折线箭头（胶囊拼成）。dir = -1 向下，1 向上。 */
function chevrons({ cx, cy, dir, w = 0.07, h = 0.04, gap = 0.05, color = 'snow' }) {
  const common = { kind: 'capsule', width: 0.026, material: 'enamel', color, height: 0.04, z: MEDALLION_H };
  return [0, 1].flatMap((k) => {
    const y = cy - dir * k * gap; // 第二道离中心更远
    const tip = [cx, y + dir * h * 0.5];
    return [
      { ...common, from: [cx - w, y - dir * h * 0.5], to: tip },
      { ...common, from: tip, to: [cx + w, y - dir * h * 0.5] },
    ];
  });
}

// ---------- 1024 程序员节 ----------

const programmersDay = {
  id: 'programmers-day',
  title: '1024 程序员节',
  titleEn: 'PROGRAMMERS DAY',
  description: '10 月 24 日当天和 Codex 一起写代码。2 的 10 次方，属于每一个敲下回车的人。',
  criteria: { metric: 'days.1024', target: 1 },
  shape: { type: 'starburst', points: 16, radius: 1.05, innerRadius: 0.93, tipRoundness: 0.17, valleyRoundness: 0.1, depth: 0.22, bevel: 0.035 },
  layers: [
    { kind: 'rim', material: 'holographic', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'navy', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.785, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'OCT 24 · 1024', radius: 0.67, size: 0.085, metal: 'polished-metal', color: 'silver' }),
    // 全息圆盘
    { kind: 'circle', radius: 0.53, material: 'holographic', color: 'snow', height: MEDALLION_H, pattern: 'sunburst' },
    { kind: 'ring', radius: 0.536, width: 0.03, material: 'polished-metal', color: 'silver', height: 0.034 },
    // 1024 大字
    { kind: 'text', text: '1024', size: 0.15, center: [0, 0.22], tracking: 0.06, material: 'enamel', color: 'navy', height: 0.05, z: MEDALLION_H },
    // < >_ >：Codex 标志被一对尖括号包住，像一个代码标签
    ...angleBrackets({ center: [0, -0.12], gap: 0.29, h: 0.13, w: 0.07 }),
    ...codexMark({ size: 0.19, center: [0, -0.12] }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

// ---------- 一周年 ----------

const MARK_A = { size: 0.25, center: [0, -0.15] };
const CONFETTI = [
  { center: [-0.34, 0.22], color: 'aqua' },
  { center: [0.32, 0.3], color: 'scarlet' },
  { center: [-0.3, -0.33], color: 'lime' },
  { center: [0.38, -0.12], color: 'amber' },
  { center: [-0.42, -0.05], color: 'snow' },
  { center: [0.24, 0.42], color: 'lime' },
  { center: [-0.22, 0.4], color: 'scarlet' },
  { center: [0.3, -0.36], color: 'snow' },
];

const anniversary = {
  id: 'anniversary',
  title: '一周年',
  titleEn: 'ONE YEAR',
  description: '和 Codex 相识满一年。云朵戴上派对帽：再来一年，继续把想法变成代码。',
  criteria: { metric: 'account.years', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.24, bevel: 0.05, reeded: { count: 150, depth: 0.012 } },
  layers: [
    { kind: 'rim', material: 'holographic', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'ONE YEAR · 365 DAYS', radius: 0.715, size: 0.088, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.56, color: 'honey', metal: 'polished-metal', metalColor: 'gold' }),
    // 彩色纸屑
    ...CONFETTI.map(({ center, color }, i) => ({
      kind: 'pixels', rows: i % 2 ? ['##'] : ['#', '#'], cell: 0.03, center, material: 'enamel', color, height: 0.024, z: MEDALLION_H, bevel: 0.006,
    })),
    ...codexMark(MARK_A),
    // 派对帽：帽檐坐在云朵顶上
    onMark(MARK_A, HAT_CONE, { col: 3, row: -9, material: 'enamel', color: 'magenta', height: 0.05 }),
    onMark(MARK_A, HAT_DOTS, { col: 3, row: -9, material: 'enamel', color: 'snow', height: 0.056 }),
    onMark(MARK_A, HAT_BRIM, { col: 3, row: -9, material: 'enamel', color: 'snow', height: 0.056 }),
    onMark(MARK_A, HAT_POM, { col: 3, row: -9, material: 'enamel', color: 'amber', height: 0.06 }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

// ---------- 模型收藏家（隐藏） ----------

/** 四颗水晶摆成 X 形，围着中间的 Codex 标志。颜色只是珠宝配色，不对应任何官方模型色。 */
const GEMS = around(4, 0.31, Math.PI / 4).map((center, i) => ({
  kind: 'gem', center, radius: 0.082, material: 'crystal', color: ['aqua', 'magenta', 'amber', 'lime'][i], height: 0.07, z: MEDALLION_H,
}));

const modelCollector = {
  id: 'model-collector',
  title: '模型收藏家',
  titleEn: 'MODEL COLLECTOR',
  description: '在 Codex 里用过 4 种不同的模型。每一颗都有自己的脾气，你都摸透了。',
  criteria: { metric: 'models.distinct', target: 4 },
  hidden: true,
  shape: { type: 'polygon', sides: 6, radius: 1.06, cornerRadius: 0.12, rotation: 0, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'platinum' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.765, width: 0.012, material: 'polished-metal', color: 'platinum', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'MODEL COLLECTOR', radius: 0.655, size: 0.078, metal: 'polished-metal', color: 'platinum' }),
    // 午夜蓝丝绒托盘
    ...medallion({ radius: 0.53, color: 'midnight', metal: 'polished-metal', metalColor: 'platinum' }),
    // 托盘上的四个金属爪托
    ...around(4, 0.31, Math.PI / 4).map((center) => ({
      kind: 'ring', center, radius: 0.098, width: 0.02, material: 'polished-metal', color: 'platinum', height: 0.03, z: MEDALLION_H,
    })),
    ...GEMS,
    ...codexMark({ size: 0.17, center: [0, 0] }),
  ],
  back: { material: 'brushed-metal', color: 'platinum' },
};

// ---------- 压缩大师（隐藏） ----------

const MARK_C = { size: 0.18, center: [0, 0] };

const compactor = {
  id: 'compactor',
  title: '压缩大师',
  titleEn: 'CONTEXT COMPACTOR',
  description: '上下文压缩了 20 次。再长的对话，也能被压成刚刚好的一小块。',
  criteria: { metric: 'events.compacted', target: 20 },
  hidden: true,
  shape: { type: 'polygon', sides: 8, radius: 1.05, cornerRadius: 0.11, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'teal', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'COMPACTED · 20', radius: 0.685, size: 0.085, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.55, color: 'aqua', metal: 'polished-metal', metalColor: 'gold' }),
    // 上下两块压板
    { kind: 'capsule', from: [-0.29, 0.215], to: [0.29, 0.215], width: 0.05, material: 'polished-metal', color: 'gold', height: 0.05, z: MEDALLION_H },
    { kind: 'capsule', from: [-0.29, -0.215], to: [0.29, -0.215], width: 0.05, material: 'polished-metal', color: 'gold', height: 0.05, z: MEDALLION_H },
    // 压板外侧的双折线箭头，往中间压
    ...chevrons({ cx: 0, cy: 0.33, dir: -1 }),
    ...chevrons({ cx: 0, cy: -0.33, dir: 1 }),
    // 被压扁前留下的「长文本」：两侧几道折痕
    ...[-1, 1].flatMap((s) => [0.07, 0, -0.07].map((y) => ({
      kind: 'capsule', from: [s * 0.24, y], to: [s * 0.31, y], width: 0.022, material: 'enamel', color: 'snow', height: 0.024, z: MEDALLION_H,
    }))),
    ...codexMark(MARK_C),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

export default [programmersDay, anniversary, modelCollector, compactor];
