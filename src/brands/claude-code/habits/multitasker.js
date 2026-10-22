import { terminal } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 多线并行：平顶六边形，三个终端三只小怪物

const multitasker = {
  id: 'multitasker',
  title: '多线并行',
  description: '同一时刻有 3 个会话一起在跑。三块屏幕三只小家伙，各干各的，互不打扰。',
  en: { title: 'Multitasker', description: 'Ran 3 sessions at the same moment. One screen each, three little guys, each minding its own work.' },
  criteria: { target: 3 },
  ...medal({
    bottom: 'MULTITASKER',
    shape: { type: 'polygon', sides: 6, radius: 1.08, cornerRadius: 0.16, rotation: 0, depth: 0.22, bevel: 0.045 },
    metal: 'rose',
    band: 'plum',
    disc: 'lilac',
    art: [-0.27, 0, 0.27].flatMap((x, i) => [
      ...terminal({ center: [x, 0.1 + (i === 1 ? 0.04 : 0)], half: 0.1, prompt: ['lime', 'amber', 'aqua'][i] }),
      ...clawd({ cell: 0.0135, center: [x, -0.13 + (i === 1 ? 0.04 : 0)], height: 0.05 }),
    ]),
  }),
};

export default multitasker;
