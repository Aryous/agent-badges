import { withTopTier } from '../../shared/top-tier.js';
import { dot, label, plane } from '../../shared/parts.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 子代理派遣：五边形（像向上发射），云朵放出纸飞机

const dispatchesBase = {
  id: 'dispatches',
  title: '子代理派遣',
  description: '派出去的子代理次数。云朵放出一架架纸飞机，各自去把活干完。',
  en: { title: '{label} Dispatches', description: 'Subagents sent out. The cloud launches paper plane after paper plane, and each one finishes its job.' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'aqua', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'sky', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'lime', label: '1K' },
  ],
  ...medal({
    bottom: '{label} DISPATCHES',
    shape: { type: 'polygon', sides: 5, radius: 1.1, cornerRadius: 0.2, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'midnight',
    disc: '$accent',
    textSize: 0.088,
    art: [
      label('{label}', 0.17, [0, 0.27]),
      ...[[-0.02, -0.08], [0.05, -0.04], [0.12, 0.0]].map((c) => dot(c, 0.016, 'snow', 0.02)),
      plane([0.22, 0.06], 0.13),
      plane([0.34, -0.15], 0.09),
      ...codexMark({ size: 0.17, center: [-0.17, -0.18], height: 0.06 }),
    ],
  }),
};

const dispatches = withTopTier(dispatchesBase, { threshold: 10000, label: '10K' }, 'codex/dispatches');

export default dispatches;
