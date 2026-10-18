import { CLAWD, CLAWD_EYES, PLUS, SEVEN } from './pixel-art.js';

// Claude Code 首批 3 枚徽章。坐标单位：徽章中心为原点，外接半径为 1。
//
// 统一的结构（由外到内）：
//   金属外圈 → 深色珐琅环带（上弧品牌名、下弧成就名）→ 亮色珐琅圆盘 → 像素图案
// 三枚各用一组主色和一种金属；Claude Code 橙只出现在小怪物身上。

/** 圆周上均匀分布的点（从正上方开始，顺时针）。 */
const around = (n, radius, start = Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const t = start - (i / n) * Math.PI * 2;
    return [Math.cos(t) * radius, Math.sin(t) * radius];
  });

/** 文字环：上弧 + 下弧 + 左右两个像素十字分隔符。 */
function textRing({ top, bottom, radius, size, metal, color }) {
  const common = { radius, size, material: metal, color, height: 0.024, tracking: 0.22 };
  const sep = (x) => ({ kind: 'pixels', rows: PLUS, cell: size * 0.26, center: [x, 0], material: metal, color, height: 0.022 });
  return [
    { kind: 'text-arc', text: top, arc: 'top', ...common },
    { kind: 'text-arc', text: bottom, arc: 'bottom', ...common },
    sep(-radius),
    sep(radius),
  ];
}

/** 中心圆盘 + 金属描边。返回圆盘上表面的高度，供上面的图案使用。 */
const MEDALLION_H = 0.014;
function medallion({ radius, color, metal, metalColor }) {
  return [
    { kind: 'circle', radius, material: 'enamel', color, height: MEDALLION_H, pattern: 'sunburst' },
    { kind: 'ring', radius: radius + 0.006, width: 0.03, material: metal, color: metalColor, height: 0.034 },
  ];
}

/** 像素小怪物：橙色身体 + 墨色眼睛（眼睛比身体低，像嵌在里面）。 */
function clawd({ cell, center = [0, 0], color = 'primary', height = 0.07, z = MEDALLION_H }) {
  return [
    { kind: 'pixels', rows: CLAWD, cell, center, material: 'ceramic', color, height, z, bevel: Math.min(0.012, cell * 0.3) },
    { kind: 'pixels', rows: CLAWD_EYES, cell, center, material: 'enamel', color: 'ink', height: height * 0.55, z, bevel: cell * 0.2 },
  ];
}

const firstSession = {
  id: 'first-session',
  title: '初次相遇',
  titleEn: 'FIRST SESSION',
  description: '完成第一次 Claude Code 会话。小家伙第一次在终端里探出头来。',
  criteria: { metric: 'sessions.total', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'cobalt', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'FIRST SESSION', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.56, color: 'azure', metal: 'polished-metal', metalColor: 'gold' }),
    ...clawd({ cell: 0.043, center: [0, -0.01] }),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

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

// 5 个子代理围绕主代理
const SUB_ANGLES = [90, 18, -54, -126, 162].map((d) => (d * Math.PI) / 180);
const subAt = (r) => SUB_ANGLES.map((t) => [Math.cos(t) * r, Math.sin(t) * r]);

const subagentCommander = {
  id: 'subagent-commander',
  title: '子代理指挥官',
  titleEn: 'SUBAGENT COMMANDER',
  description: '在一次会话中同时调度 5 个子代理并行工作。',
  criteria: { metric: 'subagents.parallelMax', target: 5 },
  shape: { type: 'starburst', points: 12, radius: 1.06, innerRadius: 0.8, tipRoundness: 0.1, valleyRoundness: 0.06, depth: 0.2, bevel: 0.03 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'rose' },
    { kind: 'face', material: 'enamel', color: 'violet', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CLAUDE CODE', bottom: 'SUBAGENT COMMANDER', radius: 0.575, size: 0.074, metal: 'polished-metal', color: 'rose' }),
    ...medallion({ radius: 0.47, color: 'lilac', metal: 'polished-metal', metalColor: 'rose' }),
    // 主代理到子代理的连线
    ...SUB_ANGLES.map((t) => ({
      kind: 'capsule',
      from: [Math.cos(t) * 0.2, Math.sin(t) * 0.2],
      to: [Math.cos(t) * 0.25, Math.sin(t) * 0.25],
      width: 0.016, material: 'polished-metal', color: 'rose', height: 0.016, z: MEDALLION_H,
    })),
    ...clawd({ cell: 0.021, center: [0, 0.02] }),
    ...subAt(0.32).flatMap((center) => clawd({ cell: 0.0088, center, color: 'ivory', height: 0.04 })),
  ],
  back: { material: 'brushed-metal', color: 'rose' },
};

export default [firstSession, sevenDayStreak, subagentCommander];
