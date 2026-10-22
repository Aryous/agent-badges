import { MEDALLION_H as Z } from '../../shared/layout.js';
import { balloons } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 生日快乐：八瓣花，小怪物牵着一串气球

const BALLOONS = [
  { c: [-0.14, 0.2], r: 0.09, color: 'scarlet' },
  { c: [0.06, 0.28], r: 0.095, color: 'amber' },
  { c: [0.2, 0.12], r: 0.085, color: 'aqua' },
];

const HAND = [0.17, -0.17];

const toolBirthday = {
  id: 'tool-birthday',
  title: '生日快乐',
  description: '2 月 24 日，Claude Code 的生日（2025 年这天发布）。这天和它一起写代码，小家伙牵着气球来道谢。',
  en: { title: "Happy Birthday", description: "February 24 is Claude Code's birthday (it launched on this day in 2025). Code with it today and the little guy brings balloons to say thanks." },
  criteria: { target: 1 },
  ...medal({
    bottom: 'HAPPY BIRTHDAY',
    shape: { type: 'flower', petals: 8, radius: 1.07, petal: 0.3, valley: 0.08, depth: 0.22, bevel: 0.04 },
    metal: 'rose',
    band: 'teal',
    disc: 'sky',
    art: [
      ...balloons(BALLOONS, HAND),
      { kind: 'text', text: 'FEB 24', size: 0.07, center: [-0.2, -0.04], tracking: 0.1, material: 'polished-metal', color: 'rose', height: 0.03, z: Z },
      ...clawd({ cell: 0.018, center: [0.03, -0.25], height: 0.055 }),
    ],
  }),
};

export default toolBirthday;
