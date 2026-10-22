import { around, MEDALLION_H as Z } from '../../shared/layout.js';
import { withTopTier } from '../../shared/top-tier.js';
import { cap, hourglass } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 协作时长：圆形表圈 60 道刻度，沙漏

const HG = [-0.04, -0.13];

const activeHoursBase = {
  id: 'active-hours',
  title: '协作时长',
  description: '和 Claude Code 一起专注干活的时长。挂着不动不算，几个会话同时开着也只算一次。',
  en: { title: '{label} Together', description: 'Hours of focused work with Claude Code. Idle time does not count, and parallel sessions count once.' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'amber', label: '10H' },
    { threshold: 100, metal: 'silver', accent: 'sky', label: '100H' },
    { threshold: 1000, metal: 'gold', accent: 'aqua', label: '1000H' },
  ],
  ...medal({
    bottom: '{label} TOGETHER',
    shape: { type: 'circle', radius: 1, depth: 0.24, bevel: 0.05 },
    metal: '$metal',
    band: 'navy',
    disc: '$accent',
    contour: false,
    // 表圈：60 道刻度
    extra: around(60, 1).map(([c, s], i) => cap([c * (i % 5 ? 0.85 : 0.83), s * (i % 5 ? 0.85 : 0.83)], [c * 0.875, s * 0.875], i % 5 ? 0.008 : 0.014, '$metal', 0.016, 'polished-metal', 0)),
    art: [
      { kind: 'text', text: '{label}', size: 0.15, center: [0, 0.29], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      ...hourglass(HG, 0.03),
      ...clawd({ cell: 0.0125, center: [0.24, -0.25], height: 0.045 }),
    ],
  }),
};

const activeHours = withTopTier(activeHoursBase, { threshold: 5000, label: '5000H' }, 'claude-code/active-hours');

export default activeHours;
