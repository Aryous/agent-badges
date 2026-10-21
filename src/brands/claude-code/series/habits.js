import { CLAWD, CLAWD_EYES, PLUS, SEVEN } from '../pixel-art.js';
import { MEDALLION_H, around, clawd, medallion, onClawd, textRing } from '../helpers.js';
import { topTierFromLast } from '../../shared/medal.js';

// 连续与习惯系列：坚持、作息和节奏。小怪物会按主题换装。

const sevenDayStreak = {
  id: 'seven-day-streak',
  title: '七日连击',
  titleEn: '7-DAY STREAK',
  description: '连续 7 天使用 Claude Code。习惯已经养成。',
  criteria: { metric: 'streak.days', target: 7 },
  shape: { type: 'polygon', sides: 6, radius: 1.04, cornerRadius: 0.16, depth: 0.2, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'emerald', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    // 六个角上的铆钉
    ...around(6, 0.8).map((center) => ({
      kind: 'circle', center, radius: 0.032, material: 'polished-metal', color: 'silver', height: 0.024,
    })),
    { kind: 'ring', radius: 0.735, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '7-DAY STREAK', radius: 0.635, size: 0.088, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.52, color: 'mint', metal: 'polished-metal', metalColor: 'silver' }),
    { kind: 'pixels', rows: SEVEN, cell: 0.046, center: [0.01, 0.1], material: 'enamel', color: 'ivory', height: 0.07, z: MEDALLION_H, bevel: 0.012 },
    ...clawd({ cell: 0.02, center: [0, -0.31], height: 0.05 }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

// ---------------------------------------------------------------------------
// 月度坚持：盾牌 + 撕页日历，日历上印着坚持的天数。分级换金属和圆盘颜色。

const CAL_HEADER = [
  '.############.',
  '##############',
  '##############',
];
const CAL_PAGE = [
  '..............',
  '..............',
  '..............',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '.############.',
];
/** 日历顶上的两个装订环 */
const CAL_RINGS = [
  '...#......#...',
  '...#......#...',
];

const CAL_CELL = 0.033;
const CAL_CENTER = [0, 0.08];

const streakDays = {
  id: 'streak-days',
  title: '月度坚持',
  titleEn: '{label}-DAY STREAK',
  description: '连续使用 Claude Code 的天数。日历一页页撕下去，小家伙一天也没落下。',
  criteria: { metric: 'streak.days' },
  tiers: [
    { threshold: 30, label: '30', metal: 'bronze', accent: 'aqua' },
    { threshold: 100, label: '100', metal: 'silver', accent: 'sky' },
    { threshold: 200, label: '200', metal: 'gold', accent: 'lime' },
    { threshold: 365, label: '365', metal: 'platinum', accent: 'amethyst' },
  ],
  shape: { type: 'shield', radius: 1, depth: 0.2, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.7, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '{label} DAYS', radius: 0.6, size: 0.078, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.48, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    // 日历：白纸页 + 红色页眉 + 金属装订环 + 印在纸上的天数
    { kind: 'pixels', rows: CAL_PAGE, cell: CAL_CELL, center: CAL_CENTER, material: 'enamel', color: 'snow', height: 0.045, z: MEDALLION_H, bevel: 0.008 },
    { kind: 'pixels', rows: [...CAL_HEADER, ...Array(8).fill('..............')], cell: CAL_CELL, center: CAL_CENTER, material: 'enamel', color: 'ruby', height: 0.055, z: MEDALLION_H, bevel: 0.008 },
    { kind: 'pixels', rows: [...CAL_RINGS, ...Array(9).fill('..............')], cell: CAL_CELL, center: [CAL_CENTER[0], CAL_CENTER[1] + CAL_CELL * 1.2], material: 'polished-metal', color: '$metal', height: 0.075, z: MEDALLION_H, bevel: 0.008 },
    { kind: 'text', text: '{label}', size: 0.11, center: [0, CAL_CENTER[1] - CAL_CELL * 1.6], material: 'enamel', color: 'ink', height: 0.03, z: MEDALLION_H + 0.045, tracking: 0.06 },
    ...clawd({ cell: 0.018, center: [0, -0.29], height: 0.05 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// ---------------------------------------------------------------------------
// 夜猫子：午夜蓝，月牙和星星，小怪物戴着睡帽、眯着眼。

/** 月牙（朝右开口） */
const MOON = [
  '..###..',
  '.###...',
  '###....',
  '###....',
  '###....',
  '.###...',
  '..###..',
];

/** 睡帽：圆鼓鼓地扣在头上，帽尖往右边耷拉下来，尖上挂一个绒球。从头顶上方 3 行开始。 */
const NIGHTCAP = [
  '.....######.....',
  '...##########...',
  '..#############.',
];
/** 帽尖垂到脑袋右侧（相对小怪物网格：第 14 列、第 -1 行起） */
const NIGHTCAP_TAIL = [
  '##.',
  '.##',
  '.##',
];
const NIGHTCAP_BRIM = ['..############..'];
const POMPOM = ['##', '##'];

/** 眯眼：眼洞上半格用身体颜色补上，只留下半格的墨色，像睡着了。 */
const SLEEPY_LIDS = [
  '................',
  '................',
  '....#......#....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];
const SLEEPY_EYES = [
  '................',
  '................',
  '................',
  '....#......#....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OWL_CELL = 0.033;
const OWL_CENTER = [-0.02, -0.12];
const owl = { cell: OWL_CELL, center: OWL_CENTER };

const nightOwl = {
  id: 'night-owl',
  title: '夜猫子',
  titleEn: 'NIGHT OWL',
  description: '在凌晨 0–5 点还在和 Claude Code 写代码。帽子都戴上了，就是不肯睡。',
  criteria: { metric: 'hours.night', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'midnight', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'NIGHT OWL', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.56, color: 'navy', metal: 'polished-metal', metalColor: 'silver' }),
    // 月牙与星星
    { kind: 'pixels', rows: MOON, cell: 0.028, center: [0.3, 0.3], material: 'enamel', color: 'honey', height: 0.05, z: MEDALLION_H },
    ...[
      [-0.36, 0.22, 0.02],
      [-0.12, 0.4, 0.016],
      [0.1, 0.37, 0.013],
      [0.42, 0.07, 0.016],
      [-0.42, -0.2, 0.013],
    ].map(([x, y, cell]) => ({ kind: 'pixels', rows: PLUS, cell, center: [x, y], material: 'polished-metal', color: 'honey', height: 0.03, z: MEDALLION_H })),
    // 小怪物（眯眼）
    { kind: 'pixels', rows: CLAWD, cell: OWL_CELL, center: OWL_CENTER, material: 'ceramic', color: 'primary', height: 0.07, z: MEDALLION_H, bevel: 0.009 },
    { kind: 'pixels', rows: SLEEPY_LIDS, cell: OWL_CELL, center: OWL_CENTER, material: 'ceramic', color: 'primary', height: 0.07, z: MEDALLION_H, bevel: 0.006 },
    { kind: 'pixels', rows: SLEEPY_EYES, cell: OWL_CELL, center: OWL_CENTER, material: 'enamel', color: 'ink', height: 0.04, z: MEDALLION_H, bevel: 0.006 },
    // 睡帽
    onClawd(owl, NIGHTCAP, { col: 0, row: -3, material: 'enamel', color: 'sky', height: 0.06 }),
    onClawd(owl, NIGHTCAP_TAIL, { col: 14, row: -1, material: 'enamel', color: 'sky', height: 0.06 }),
    onClawd(owl, NIGHTCAP_BRIM, { col: 0, row: 0, material: 'enamel', color: 'snow', height: 0.085 }),
    onClawd(owl, POMPOM, { col: 15, row: 2, material: 'enamel', color: 'snow', height: 0.075 }),
    // 呼噜：一大一小两个 Z 往左上飘
    { kind: 'text', text: 'Z', size: 0.085, center: [-0.33, 0.05], material: 'polished-metal', color: 'silver', height: 0.028, z: MEDALLION_H },
    { kind: 'text', text: 'Z', size: 0.06, center: [-0.22, 0.17], material: 'polished-metal', color: 'silver', height: 0.024, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

// ---------------------------------------------------------------------------
// 早起鸟：黎明紫环带 + 蜂蜜色朝阳圆盘，小怪物端着一杯冒热气的咖啡。

const MUG = [
  '####..',
  '#####.',
  '####.#',
  '#####.',
  '####..',
];
const COFFEE = ['####'];

const BIRD_CELL = 0.028;
const BIRD_CENTER = [-0.04, -0.16];
const bird = { cell: BIRD_CELL, center: BIRD_CENTER };
const SUN_CENTER = [0, 0.18];

const earlyBird = {
  id: 'early-bird',
  title: '早起鸟',
  titleEn: 'EARLY BIRD',
  description: '早上 5–7 点就开工。太阳刚露头，咖啡还冒着热气，第一个提示已经发出去了。',
  criteria: { metric: 'hours.morning', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'rose' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'rose', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'EARLY BIRD', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'rose' }),
    ...medallion({ radius: 0.56, color: 'honey', metal: 'polished-metal', metalColor: 'rose' }),
    // 朝阳：圆盘 + 上半圈光芒
    { kind: 'circle', center: SUN_CENTER, radius: 0.16, material: 'enamel', color: 'amber', height: 0.025, z: MEDALLION_H },
    ...Array.from({ length: 7 }, (_, i) => {
      const t = Math.PI * (0.08 + (i / 6) * 0.84);
      const c = Math.cos(t);
      const s = Math.sin(t);
      return {
        kind: 'capsule',
        from: [SUN_CENTER[0] + c * 0.21, SUN_CENTER[1] + s * 0.21],
        to: [SUN_CENTER[0] + c * 0.29, SUN_CENTER[1] + s * 0.29],
        width: 0.035, material: 'enamel', color: 'amber', height: 0.025, z: MEDALLION_H,
      };
    }),
    // 地平线
    { kind: 'capsule', from: [-0.46, 0.02], to: [0.46, 0.02], width: 0.018, material: 'polished-metal', color: 'rose', height: 0.02, z: MEDALLION_H },
    // 小怪物 + 咖啡杯
    ...clawd({ cell: BIRD_CELL, center: BIRD_CENTER, height: 0.07 }),
    onClawd(bird, MUG, { col: 15, row: 2, material: 'enamel', color: 'snow', height: 0.085 }),
    onClawd(bird, COFFEE, { col: 15, row: 2, material: 'enamel', color: 'ink', height: 0.088 }),
    // 两缕热气（之字形的细胶囊）
    ...[0.215, 0.27].flatMap((x) => {
      const pts = [[x, -0.07], [x + 0.018, -0.04], [x, -0.01], [x + 0.018, 0.02]];
      return pts.slice(1).map((p, i) => ({
        kind: 'capsule', from: pts[i], to: p, width: 0.014, material: 'enamel', color: 'snow', height: 0.03, z: MEDALLION_H,
      }));
    }),
  ],
  back: { material: 'brushed-metal', color: 'rose' },
};

// ---------------------------------------------------------------------------
// 周末战士：绯红盾牌，小怪物绑着头带、守着笔记本电脑。

/** 头带：横过额头（小怪物网格第 1 行）。 */
const HEADBAND = ['..############..'];

const WW_CELL = 0.034;
const WW_CENTER = [0.03, -0.04];
const ww = { cell: WW_CELL, center: WW_CENTER };
/** 小怪物网格坐标 → 徽章坐标（格子中心） */
const wwAt = (col, row) => [WW_CENTER[0] + (col + 0.5 - 8) * WW_CELL, WW_CENTER[1] + (5 - row - 0.5) * WW_CELL];
const KNOT = wwAt(1.6, 1);

const weekendWarrior = {
  id: 'weekend-warrior',
  title: '周末战士',
  titleEn: 'WEEKEND WARRIOR',
  description: '周六、周日都在和 Claude Code 写代码。头带一绑，周末就是主场。',
  criteria: { metric: 'days.weekend', target: 1 },
  shape: { type: 'shield', radius: 1, width: 0.88, top: 0.88, shoulder: 0.05, bottom: -1.04, cornerRadius: 0.2, depth: 0.2, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'crimson', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.7, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'SAT · SUN', radius: 0.6, size: 0.085, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.48, color: 'scarlet', metal: 'polished-metal', metalColor: 'gold' }),
    ...clawd({ cell: WW_CELL, center: WW_CENTER, height: 0.07 }),
    onClawd(ww, HEADBAND, { col: 0, row: 1, material: 'enamel', color: 'snow', height: 0.085 }),
    // 头带在脑后打结，两条绸带往左后方飘
    ...[
      [[KNOT[0] - 0.09, KNOT[1] + 0.05], [KNOT[0] - 0.16, KNOT[1] + 0.035]],
      [[KNOT[0] - 0.08, KNOT[1] - 0.03], [KNOT[0] - 0.14, KNOT[1] - 0.08]],
    ].flatMap(([mid, end]) => [
      { kind: 'capsule', from: KNOT, to: mid, width: 0.042, material: 'enamel', color: 'snow', height: 0.06, z: MEDALLION_H },
      { kind: 'capsule', from: mid, to: end, width: 0.036, material: 'enamel', color: 'snow', height: 0.06, z: MEDALLION_H },
    ]),
    // 汗珠：圆底 + 尖顶（三段渐细的胶囊）
    { kind: 'circle', center: wwAt(15, -0.6), radius: 0.04, material: 'enamel', color: 'sky', height: 0.045, z: MEDALLION_H },
    { kind: 'capsule', from: wwAt(15, -0.6), to: wwAt(15, -1.6), width: 0.05, material: 'enamel', color: 'sky', height: 0.045, z: MEDALLION_H },
    { kind: 'capsule', from: wwAt(15, -1.6), to: wwAt(15, -2.3), width: 0.026, material: 'enamel', color: 'sky', height: 0.045, z: MEDALLION_H },
    // 干劲闪光
    ...[
      [0.33, 0.3, 0.02],
      [0.4, 0.14, 0.014],
      [-0.36, -0.25, 0.016],
    ].map(([x, y, cell]) => ({ kind: 'pixels', rows: PLUS, cell, center: [x, y], material: 'polished-metal', color: 'gold', height: 0.03, z: MEDALLION_H })),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

// ---------------------------------------------------------------------------
// 马拉松：玫瑰花结形奖牌（24 瓣扇贝边），月桂枝环抱奔跑的小怪物。

/** 奔跑姿态：身体同 CLAWD，腿迈开 */
const CLAWD_RUN = [
  ...CLAWD.slice(0, 8),
  '...#.#....#.#...',
  '..#.#......#.#..',
];

const RUN_CELL = 0.026;
const RUN_CENTER = [0.03, -0.06];
const runner = { cell: RUN_CELL, center: RUN_CENTER };

/** 速度线 */
const SPEED = [
  '####',
  '....',
  '.###',
  '....',
  '..##',
];

/**
 * 月桂枝：一根沿圆弧向上生长的枝干，两侧交替长出成对的叶片。
 * side = 1 为右枝，-1 为左枝（镜像）。
 */
function laurel({ radius, from, to, count, side }) {
  const mat = { material: 'polished-metal', color: 'gold', z: MEDALLION_H };
  const pt = (t, r = radius) => [side * Math.cos(t) * r, Math.sin(t) * r];
  const out = [];
  // 枝干
  for (let i = 0; i < count; i++) {
    const t0 = from + ((to - from) * i) / count;
    const t1 = from + ((to - from) * (i + 1)) / count;
    out.push({ kind: 'capsule', from: pt(t0), to: pt(t1), width: 0.014, height: 0.02, ...mat });
  }
  // 叶片：每节一对，朝生长方向斜伸，一片向外一片向内
  const len = 0.085;
  for (let i = 0; i < count; i++) {
    const t = from + ((to - from) * (i + 0.5)) / count;
    const [px, py] = pt(t);
    const tangent = [side * -Math.sin(t), Math.cos(t)]; // 生长方向（角度增大）
    const normal = [side * Math.cos(t), Math.sin(t)];
    for (const k of [1, -1]) {
      const dx = tangent[0] * 0.75 + normal[0] * 0.66 * k;
      const dy = tangent[1] * 0.75 + normal[1] * 0.66 * k;
      out.push({ kind: 'capsule', from: [px, py], to: [px + dx * len, py + dy * len], width: 0.04, height: 0.032, ...mat });
    }
  }
  // 枝头一片
  const [ex, ey] = pt(to);
  out.push({ kind: 'capsule', from: [ex, ey], to: [ex + side * -Math.sin(to) * 0.075, ey + Math.cos(to) * 0.075], width: 0.04, height: 0.032, ...mat });
  return out;
}

const marathon = {
  id: 'marathon',
  title: '马拉松',
  titleEn: 'MARATHON',
  description: '单次会话超过 4 小时。补给靠咖啡，配速靠 Claude，终点线在下一个 commit。',
  criteria: { metric: 'session.longestHours', target: 4 },
  shape: { type: 'starburst', points: 24, radius: 1.04, innerRadius: 0.94, tipRoundness: 0.06, valleyRoundness: 0.02, depth: 0.2, bevel: 0.035 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'teal', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'MARATHON', radius: 0.68, size: 0.095, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.54, color: 'aqua', metal: 'polished-metal', metalColor: 'gold' }),
    // 月桂枝
    ...laurel({ radius: 0.42, from: -Math.PI * 0.4, to: Math.PI * 0.08, count: 5, side: 1 }),
    ...laurel({ radius: 0.42, from: -Math.PI * 0.4, to: Math.PI * 0.08, count: 5, side: -1 }),
    // 4H
    { kind: 'text', text: '4H', size: 0.12, center: [0, 0.27], material: 'polished-metal', color: 'gold', height: 0.04, z: MEDALLION_H, tracking: 0.08 },
    // 奔跑的小怪物 + 速度线
    { kind: 'pixels', rows: CLAWD_RUN, cell: RUN_CELL, center: RUN_CENTER, material: 'ceramic', color: 'primary', height: 0.07, z: MEDALLION_H, bevel: 0.008 },
    { kind: 'pixels', rows: CLAWD_EYES, cell: RUN_CELL, center: RUN_CENTER, material: 'enamel', color: 'ink', height: 0.04, z: MEDALLION_H, bevel: 0.005 },
    onClawd(runner, SPEED, { col: -5, row: 2, material: 'enamel', color: 'snow', height: 0.03 }),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

export default [sevenDayStreak, topTierFromLast(streakDays, 'claude-code/streak-days'), nightOwl, earlyBird, weekendWarrior, marathon];
