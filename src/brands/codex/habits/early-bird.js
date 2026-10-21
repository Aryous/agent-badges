import { around, textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark } from '../mark.js';

// 早起鸟：十六芒太阳，太阳从云后升起

const SUN_C = [0.13, 0.15];

const earlyBird = {
  id: 'early-bird',
  title: '早起鸟',
  titleEn: 'EARLY BIRD',
  description: '早上五到七点就开工。太阳刚从云后面探出头，Codex 已经在跑测试了。',
  en: { title: 'Early Bird', description: 'Started work between 5 and 7 a.m. The sun just peeked out from behind the cloud, and Codex is already running tests.' },
  criteria: { target: 1 },
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

export default earlyBird;
