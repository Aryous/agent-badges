import { withTopTier } from '../../shared/top-tier.js';
import { label, hourglass } from '../../shared/parts.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 协作时长：平顶八边形，沙漏

const activeHoursBase = {
  id: 'active-hours',
  title: '协作时长',
  description: '和 Codex 一起专注干活的时长。挂着不动不算，几个会话同时开着也只算一次。',
  en: { title: '{label} Together', description: 'Hours of focused work with Codex. Idle time does not count, and parallel sessions count once.' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sand', label: '10H' },
    { threshold: 100, metal: 'silver', accent: 'lavender', label: '100H' },
    { threshold: 1000, metal: 'gold', accent: 'aqua', label: '1000H' },
  ],
  ...medal({
    bottom: '{label} TOGETHER',
    shape: { type: 'polygon', sides: 8, radius: 1.05, cornerRadius: 0.12, rotation: Math.PI / 8, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'violet',
    disc: '$accent',
    art: [
      label('{label}', 0.15, [0, 0.29]),
      ...hourglass([-0.1, -0.12], 0.028, { sand: 'periwinkle' }),
      ...codexMark({ size: 0.12, center: [0.2, -0.2], height: 0.055 }),
    ],
  }),
};

const activeHours = withTopTier(activeHoursBase, { threshold: 5000, label: '5000H' }, 'codex/active-hours');

export default activeHours;
