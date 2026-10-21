import { MEDALLION_H as Z } from '../../shared/layout.js';
import { terminal } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 高产日：软十芒星，身后一叠会话窗口

const productiveDay = {
  id: 'productive-day',
  title: '高产日',
  titleEn: 'PRODUCTIVE DAY',
  description: '一天之内开启 20 个会话。窗口一个叠一个，今天的点子格外多。',
  en: { title: 'Productive Day', description: 'Started 20 sessions in a single day. Window after window: a day full of ideas.' },
  criteria: { target: 20 },
  ...medal({
    bottom: '20 SESSIONS',
    shape: { type: 'starburst', points: 10, radius: 1.07, innerRadius: 0.9, tipRoundness: 0.22, valleyRoundness: 0.12, depth: 0.22, bevel: 0.035 },
    metal: 'gold',
    band: 'teal',
    disc: 'aqua',
    art: [
      ...terminal({ center: [-0.15, 0.2], half: 0.13, panel: 'slate', z: Z }),
      ...terminal({ center: [0, 0.1], half: 0.13, panel: 'navy', z: Z + 0.035 }),
      ...terminal({ center: [0.15, 0], half: 0.13, panel: 'ink', z: Z + 0.07 }),
      ...clawd({ cell: 0.017, center: [-0.12, -0.27], height: 0.055 }),
    ],
  }),
};

export default productiveDay;
