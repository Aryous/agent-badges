import { cap, dot } from '../../shared/parts.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 高产日：盾牌，一列线程清单

const productiveDay = {
  id: 'productive-day',
  title: '高产日',
  titleEn: 'PRODUCTIVE DAY',
  description: '一天之内开启 20 个 Codex 线程。清单一行接一行，今天的点子格外多。',
  en: { title: 'Productive Day', description: 'Started 20 Codex threads in a single day. Line after line on the list: a day full of ideas.' },
  criteria: { metric: 'threads.perDay', target: 20 },
  ...medal({
    bottom: '20 THREADS',
    shape: { type: 'shield', radius: 1, width: 0.9, top: 0.92, shoulder: 0.1, bottom: -1.06, cornerRadius: 0.22, depth: 0.22, bevel: 0.04 },
    metal: 'gold',
    band: 'navy',
    disc: 'sky',
    art: [
      ...codexMark({ size: 0.17, center: [0, 0.25], height: 0.06 }),
      // 线程清单：四行药丸，每行前面一个对勾色点
      ...[0.04, -0.08, -0.2, -0.32].flatMap((y, i) => [
        cap([-0.22, y], [0.24 - (i % 2) * 0.08, y], 0.075, 'snow', 0.035),
        dot([-0.2, y], 0.022, ['lime', 'amber', 'aqua', 'lime'][i], 0.045),
      ]),
    ],
  }),
};

export default productiveDay;
