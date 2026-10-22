import { MEDALLION_H } from '../../shared/layout.js';
import { balloons } from '../../shared/parts.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 生日快乐：八芒软星，云朵牵着气球

const Z = MEDALLION_H;

const BALLOONS = [
  { c: [-0.16, 0.22], r: 0.09, color: 'magenta' },
  { c: [0.04, 0.3], r: 0.095, color: 'honey' },
  { c: [0.2, 0.15], r: 0.085, color: 'lime' },
];

const toolBirthday = {
  id: 'tool-birthday',
  title: '生日快乐',
  description: '4 月 16 日，Codex CLI 的生日（2025 年这天发布）。这天和它一起写代码，云朵牵着气球来道谢。',
  en: { title: "Happy Birthday", description: "April 16 is Codex CLI's birthday (it launched on this day in 2025). Code with it today and the cloud brings balloons to say thanks." },
  criteria: { target: 1 },
  ...medal({
    bottom: 'HAPPY BIRTHDAY',
    shape: { type: 'starburst', points: 8, radius: 1.08, innerRadius: 0.88, tipRoundness: 0.3, valleyRoundness: 0.26, depth: 0.22, bevel: 0.035 },
    metal: 'gold',
    band: 'magenta',
    disc: 'snow',
    art: [
      ...balloons(BALLOONS, [0.12, -0.12], 'steel'),
      { kind: 'text', text: 'APR 16', size: 0.07, center: [-0.21, -0.04], tracking: 0.1, material: 'polished-metal', color: 'gold', height: 0.03, z: Z },
      ...codexMark({ size: 0.17, center: [0.05, -0.25], height: 0.065 }),
    ],
  }),
};

export default toolBirthday;
