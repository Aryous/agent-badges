import { MEDALLION_H as Z } from '../../shared/layout.js';
import { withTopTier } from '../../shared/top-tier.js';
import { dot, plane } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 子代理派遣：八芒软星（罗盘），放飞一串纸飞机

const dispatchesBase = {
  id: 'dispatches',
  title: '子代理派遣',
  description: '派出去的子代理次数。一架架纸飞机放出去，带着结果飞回来。',
  en: { title: '{label} Dispatches', description: 'Subagents sent out. Paper plane after paper plane, each one flying back with an answer.' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sky', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'aqua', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'lilac', label: '1K' },
  ],
  ...medal({
    bottom: '{label} DISPATCHES',
    shape: { type: 'starburst', points: 8, radius: 1.08, innerRadius: 0.86, tipRoundness: 0.16, valleyRoundness: 0.16, depth: 0.22, bevel: 0.035 },
    metal: '$metal',
    band: 'cobalt',
    disc: '$accent',
    textSize: 0.088,
    art: [
      { kind: 'text', text: '{label}', size: 0.17, center: [0, 0.26], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      // 航迹点
      ...[[-0.02, -0.13], [0.04, -0.1], [0.1, -0.06]].map((c) => dot(c, 0.016, 'snow', 0.02)),
      ...[[0.2, 0.03, 0.14], [0.35, -0.17, 0.1]].map(([x, y, s]) => plane([x, y], s)),
      ...clawd({ cell: 0.018, center: [-0.17, -0.22], height: 0.055 }),
    ],
  }),
};

const dispatches = withTopTier(dispatchesBase, { threshold: 10000, label: '10K' }, 'claude-code/dispatches');

export default dispatches;
