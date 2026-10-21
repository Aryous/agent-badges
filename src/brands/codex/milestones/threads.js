import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topTierFromLast } from '../../shared/top-tier.js';
import { CODEX_MARK, codexMark } from '../mark.js';

// 线程里程碑：十二边形；数字下方三朵 Codex 云像扇子一样展开——
// 中间是渐变的主云，两侧是金属色的「其他线程」，越开越多。

/** 金属色的 Codex 标志剪影（不带渐变和嵌片），用作陪衬。 */
const ghostMark = ({ size, center, height = 0.038, z = MEDALLION_H }) => ({
  kind: 'path',
  d: CODEX_MARK,
  viewBox: 24,
  scale: size,
  center,
  material: 'polished-metal',
  color: '$metal',
  height,
  z,
  bevel: Math.min(0.01, size * 0.05),
});

const threads = {
  id: 'threads',
  title: '线程里程碑',
  titleEn: '{label} THREADS',
  description: '累计开启的 Codex 会话。一朵云开出一条线，线多了就织成了网。',
  en: { title: '{label} Threads', description: 'Codex threads started. A cloud spins out a thread; enough threads weave a net.' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sand', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'aqua', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'honey', label: '1K' },
    { threshold: 5000, metal: 'platinum', accent: 'lime', label: '5K' },
  ],
  shape: { type: 'polygon', sides: 12, radius: 1.02, cornerRadius: 0.09, rotation: Math.PI / 12, depth: 0.21, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.84, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: '{label} THREADS', radius: 0.71, size: 0.092, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.19, center: [0, 0.2], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.06, z: MEDALLION_H },
    ghostMark({ size: 0.13, center: [-0.25, -0.2] }),
    ghostMark({ size: 0.13, center: [0.25, -0.2] }),
    ...codexMark({ size: 0.2, center: [0, -0.18], height: 0.07 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

export default topTierFromLast(threads, 'codex/threads');
