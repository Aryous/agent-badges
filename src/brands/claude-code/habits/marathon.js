import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { px } from '../../shared/parts.js';
import { CLAWD, CLAWD_EYES, onClawd } from '../mascot.js';

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
  en: { title: 'Marathon', description: 'A single session over 4 hours. Fueled by coffee, paced by Claude, the finish line is the next commit.' },
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

export default marathon;
