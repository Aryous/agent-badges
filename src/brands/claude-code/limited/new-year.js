import { dot, burst } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 元旦：十二芒软星，三簇烟花

const newYear = {
  id: 'new-year',
  title: '元旦',
  description: '1 月 1 日和 Claude Code 一起写代码。新年第一个提交，小家伙仰头看烟花。',
  en: { title: "New Year", description: "Coded with Claude Code on January 1. The year's first commit, and the little guy looks up at the fireworks." },
  criteria: { target: 1 },
  ...medal({
    bottom: 'HAPPY NEW YEAR',
    shape: { type: 'starburst', points: 12, radius: 1.07, innerRadius: 0.9, tipRoundness: 0.14, valleyRoundness: 0.12, depth: 0.22, bevel: 0.035 },
    metal: 'gold',
    band: 'midnight',
    disc: 'navy',
    art: [
      ...burst([-0.17, 0.17], 0.2, 12, 'amber', 0.03),
      ...burst([0.22, 0.24], 0.14, 10, 'scarlet', 0.026),
      ...burst([0.22, -0.06], 0.11, 8, 'aqua', 0.024),
      ...[[-0.33, -0.05], [0.36, 0.1], [-0.05, 0.38]].map((c) => dot(c, 0.012, 'snow', 0.02)),
      ...clawd({ cell: 0.018, center: [-0.06, -0.26], height: 0.055 }),
    ],
  }),
};

export default newYear;
