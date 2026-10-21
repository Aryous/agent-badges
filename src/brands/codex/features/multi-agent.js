import { MEDALLION_H as Z } from '../../shared/layout.js';
import { codexMark } from '../mark.js';
import { featureBadge } from '../feature-frame.js';

// 1. 多智能体：主标志派生出三朵小云

const SUBS = [
  [-0.28, -0.17],
  [0.28, -0.17],
  [0, -0.27],
];

const multiAgent = featureBadge({
  id: 'multi-agent',
  title: '多智能体',
  titleEn: 'MULTI-AGENT',
  description: '派生过子代理，让几朵小云分头干活。一个人，一支队伍。',
  en: { title: 'Multi-Agent', description: 'Spawned subagents and sent little clouds off to work in parallel. One person, one team.' },
  metric: 'features.spawnAgent',
  target: 1,
  band: 'teal',
  panel: 'aqua',
  label: 'MULTI-AGENT',
  art: [
    // 连线
    ...SUBS.map(([x, y]) => ({
      kind: 'capsule', from: [x * 0.35, 0.02 + y * 0.35], to: [x * 0.82, y * 0.82 + 0.02],
      width: 0.016, material: 'polished-metal', color: 'silver', height: 0.016, z: Z,
    })),
    ...codexMark({ size: 0.2, center: [0, 0.12] }),
    ...SUBS.flatMap(([x, y]) => codexMark({ size: 0.085, center: [x, y], height: 0.045, inlay: 'snow' })),
  ],
});

export default multiAgent;
