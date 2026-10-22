import { burst } from '../../shared/parts.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 元旦：十芒软星，烟花

const newYear = {
  id: 'new-year',
  title: '元旦',
  description: '1 月 1 日和 Codex 一起写代码。新年的第一个补丁，云朵后面在放烟花。',
  en: { title: "New Year", description: "Coded with Codex on January 1. The year's first patch, with fireworks behind the cloud." },
  criteria: { target: 1 },
  ...medal({
    bottom: 'HAPPY NEW YEAR',
    shape: { type: 'starburst', points: 10, radius: 1.07, innerRadius: 0.9, tipRoundness: 0.16, valleyRoundness: 0.12, depth: 0.22, bevel: 0.035 },
    metal: 'silver',
    band: 'plum',
    disc: 'violet',
    art: [
      ...burst([-0.19, 0.2], 0.19, 12, 'honey', 0.03),
      ...burst([0.22, 0.25], 0.13, 10, 'aqua', 0.026),
      ...burst([0.27, -0.05], 0.1, 8, 'magenta', 0.024),
      ...codexMark({ size: 0.2, center: [-0.06, -0.2], height: 0.065 }),
    ],
  }),
};

export default newYear;
