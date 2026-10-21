import { MEDALLION_H, around, codexMark, medallion, onMark, textRing } from '../helpers.js';
import { topTierFromLast } from '../../shared/medal.js';

// Codex 连续与习惯系列：坚持、作息和节奏。
// 与 Claude Code 同主题徽章错开外形：七边形、链轮、八角星、太阳、五边形、表盘。

// ---------- 像素图 ----------

/** 月牙（开口朝右） */
const MOON = [
  '..###.',
  '.##...',
  '##....',
  '##....',
  '##....',
  '.##...',
  '..###.',
];

/** 墨镜：两片镜片 + 鼻梁（在 16×16 的标志网格里约占 12 格宽） */
const SHADES = [
  '############',
  '.####..####.',
  '..##....##..',
];

// ---------- 七日连击：七边形，一周七格全点亮 ----------

const sevenDayStreak = {
  id: 'seven-day-streak',
  title: '七日连击',
  titleEn: '7-DAY STREAK',
  description: '连续 7 天打开 Codex。一周七格，格格都亮着。',
  criteria: { metric: 'streak.days', target: 7 },
  shape: { type: 'polygon', sides: 7, radius: 1.06, cornerRadius: 0.16, depth: 0.2, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'navy', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.745, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: '7-DAY STREAK', radius: 0.645, size: 0.088, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.53, color: 'sky', metal: 'polished-metal', metalColor: 'gold' }),
    ...codexMark({ size: 0.25, center: [0, 0.09] }),
    // 一周七格
    ...Array.from({ length: 7 }, (_, i) => ({
      kind: 'circle', center: [-0.27 + i * 0.09, -0.28], radius: 0.033,
      material: 'enamel', color: 'lime', height: 0.03, z: MEDALLION_H,
    })),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

// ---------- 月度坚持：细齿链轮，一环扣一环；分级换金属与圆盘色 ----------

const streakDays = {
  id: 'streak-days',
  title: '月度坚持',
  titleEn: '{label}-DAY STREAK',
  description: '连续使用 Codex 的天数。链条一节扣一节，转起来就停不下。',
  criteria: { metric: 'streak.days' },
  tiers: [
    { threshold: 30, label: '30', metal: 'bronze', accent: 'teal' },
    { threshold: 100, label: '100', metal: 'silver', accent: 'azure' },
    { threshold: 200, label: '200', metal: 'gold', accent: 'emerald' },
    { threshold: 365, label: '365', metal: 'platinum', accent: 'violet' },
  ],
  shape: { type: 'gear', teeth: 20, radius: 1.04, rootRadius: 0.95, roundness: 0.03, depth: 0.2, bevel: 0.015 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.78, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: '{label} DAYS', radius: 0.665, size: 0.088, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.55, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    // 一圈链节
    ...around(16, 0.47).map((center) => ({
      kind: 'circle', center, radius: 0.018, material: 'polished-metal', color: '$metal', height: 0.02, z: MEDALLION_H,
    })),
    ...codexMark({ size: 0.22, center: [0, 0.11] }),
    { kind: 'text', text: '{label}', size: 0.12, center: [0, -0.24], material: 'polished-metal', color: '$metal', height: 0.05, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// ---------- 夜猫子：八角星，紫夜里云上挂着月牙 ----------

const STAR_DOTS = [
  [-0.3, 0.26, 0.022], [0.3, 0.3, 0.016], [-0.36, -0.06, 0.014], [0.38, -0.02, 0.02],
  [-0.2, -0.33, 0.016], [0.24, -0.3, 0.014], [0.05, 0.38, 0.014],
];

const nightOwl = {
  id: 'night-owl',
  title: '夜猫子',
  titleEn: 'NIGHT OWL',
  description: '凌晨零点到五点还在和 Codex 对话。月亮都挂到云上了。',
  criteria: { metric: 'hours.night', target: 1 },
  shape: { type: 'starburst', points: 8, radius: 1.06, innerRadius: 0.84, tipRoundness: 0.16, valleyRoundness: 0.1, depth: 0.2, bevel: 0.035 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CODEX', bottom: 'NIGHT OWL', radius: 0.62, size: 0.085, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.5, color: 'violet', metal: 'polished-metal', metalColor: 'silver' }),
    ...STAR_DOTS.map(([x, y, r]) => ({ kind: 'circle', center: [x, y], radius: r, material: 'enamel', color: 'snow', height: 0.02, z: MEDALLION_H })),
    ...codexMark({ size: 0.27, center: [-0.03, -0.04] }),
    onMark({ size: 0.27, center: [-0.03, -0.04] }, MOON, { col: 12, row: -3, material: 'enamel', color: 'honey', height: 0.07 }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

// ---------- 早起鸟：十六芒太阳，太阳从云后升起 ----------

const SUN_C = [0.13, 0.15];

const earlyBird = {
  id: 'early-bird',
  title: '早起鸟',
  titleEn: 'EARLY BIRD',
  description: '早上五到七点就开工。太阳刚从云后面探出头，Codex 已经在跑测试了。',
  criteria: { metric: 'hours.morning', target: 1 },
  shape: { type: 'starburst', points: 16, radius: 1.05, innerRadius: 0.92, tipRoundness: 0.08, valleyRoundness: 0.06, depth: 0.2, bevel: 0.035 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'azure', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'EARLY BIRD', radius: 0.69, size: 0.09, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.57, color: 'sand', metal: 'polished-metal', metalColor: 'gold' }),
    // 太阳：圆 + 一圈光芒（先放，好被云挡住一部分）
    ...around(12, 0.235).map(([x, y], i) => {
      const len = i % 2 === 0 ? 0.07 : 0.045;
      const r0 = 0.235;
      const t = Math.atan2(y, x);
      return {
        kind: 'capsule',
        from: [SUN_C[0] + Math.cos(t) * r0, SUN_C[1] + Math.sin(t) * r0],
        to: [SUN_C[0] + Math.cos(t) * (r0 + len), SUN_C[1] + Math.sin(t) * (r0 + len)],
        width: 0.032, material: 'enamel', color: 'amber', height: 0.03, z: MEDALLION_H,
      };
    }),
    { kind: 'circle', center: SUN_C, radius: 0.18, material: 'enamel', color: 'topaz', height: 0.04, z: MEDALLION_H },
    ...codexMark({ size: 0.25, center: [-0.08, -0.1], height: 0.075 }),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

// ---------- 周末战士：五边形，戴上墨镜的周末 ----------

const WK = { size: 0.26, center: [0, -0.02] };

const weekendWarrior = {
  id: 'weekend-warrior',
  title: '周末战士',
  titleEn: 'WEEKEND WARRIOR',
  description: '周六和周日都在用 Codex。墨镜戴上了，补丁也没停下。',
  criteria: { metric: 'days.weekend', target: 1 },
  shape: { type: 'polygon', sides: 5, radius: 1.1, cornerRadius: 0.2, rotation: Math.PI / 2, depth: 0.2, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'rose' },
    { kind: 'face', material: 'enamel', color: 'magenta', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CODEX', bottom: 'SAT · SUN', radius: 0.6, size: 0.085, metal: 'polished-metal', color: 'rose' }),
    ...medallion({ radius: 0.48, color: 'amber', metal: 'polished-metal', metalColor: 'rose' }),
    ...codexMark(WK),
    onMark(WK, SHADES, { col: 2, row: 2, material: 'enamel', color: 'ink', height: 0.085, z: MEDALLION_H }),
    // 两颗闪光
    { kind: 'pixels', rows: ['.#.', '###', '.#.'], cell: 0.022, center: [0.3, 0.24], material: 'enamel', color: 'snow', height: 0.03, z: MEDALLION_H },
    { kind: 'pixels', rows: ['.#.', '###', '.#.'], cell: 0.016, center: [-0.32, 0.2], material: 'enamel', color: 'snow', height: 0.03, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: 'rose' },
};

// ---------- 马拉松：十二边形秒表盘，4 小时 ----------

const marathon = {
  id: 'marathon',
  title: '马拉松',
  titleEn: 'MARATHON',
  description: '一次会话连续活跃超过 4 小时。表针走了四格，Codex 还没喊累。',
  criteria: { metric: 'session.longestHours', target: 4 },
  shape: { type: 'polygon', sides: 12, radius: 1.04, cornerRadius: 0.1, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'platinum' },
    { kind: 'face', material: 'enamel', color: 'forest', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.81, width: 0.012, material: 'polished-metal', color: 'platinum', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'MARATHON', radius: 0.7, size: 0.09, metal: 'polished-metal', color: 'platinum' }),
    ...medallion({ radius: 0.58, color: 'snow', metal: 'polished-metal', metalColor: 'platinum' }),
    // 表盘刻度：12 格，前 4 格（4 小时）点亮
    ...around(12, 0.49).map(([x, y], i) => {
      const t = Math.atan2(y, x);
      const long = i % 3 === 0;
      const r0 = long ? 0.43 : 0.455;
      return {
        kind: 'capsule',
        from: [Math.cos(t) * r0, Math.sin(t) * r0],
        to: [Math.cos(t) * 0.51, Math.sin(t) * 0.51],
        width: long ? 0.03 : 0.022,
        material: 'enamel', color: i >= 1 && i <= 4 ? 'lime' : 'steel', height: 0.025, z: MEDALLION_H,
      };
    }),
    ...codexMark({ size: 0.25, center: [0, -0.07] }),
    { kind: 'text', text: '4H', size: 0.1, center: [0, 0.27], material: 'polished-metal', color: 'forest', height: 0.04, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: 'platinum' },
};

export default [sevenDayStreak, topTierFromLast(streakDays, 'codex/streak-days'), nightOwl, earlyBird, weekendWarrior, marathon];
