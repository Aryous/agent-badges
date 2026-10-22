import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { clawd, onClawd } from '../mascot.js';

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
  description: '早上 5–7 点就开工。太阳刚露头，咖啡还冒着热气，第一个提示已经发出去了。',
  en: { title: 'Early Bird', description: 'Started work between 5 and 7 a.m. The sun is barely up, the coffee is still steaming, and the first prompt is already sent.' },
  criteria: { target: 1 },
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

export default earlyBird;
