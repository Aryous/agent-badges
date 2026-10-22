import { dot, px, dialTicks, midnightHands } from '../../shared/parts.js';
import { MOON } from '../../shared/pixel-art.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 跨日夜战：圆形表盘，时针分针在 12 点重合

const midnightCrossing = {
  id: 'midnight-crossing',
  title: '跨日夜战',
  description: '同一个会话从前一天 23 点前一直写到第二天凌晨 2 点后。表针在 12 点重合，日期翻篇，小家伙还在。',
  en: { title: 'Past Midnight', description: 'One session that started before 11 p.m. and was still going after 2 a.m. The hands meet at twelve, the date flips, and the little guy is still here.' },
  criteria: { target: 1 },
  ...medal({
    bottom: 'PAST MIDNIGHT',
    shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
    metal: 'silver',
    band: 'midnight',
    disc: 'navy',
    art: [
      ...dialTicks(),
      ...midnightHands(),
      px(MOON, 0.026, [-0.22, 0.19], 'honey', 'enamel', 0.045),
      ...[[0.2, 0.25, 0.016], [0.26, 0.1, 0.012], [-0.3, 0.02, 0.012]].map(([x, y, r]) => dot([x, y], r, 'snow', 0.02)),
      ...clawd({ cell: 0.018, center: [0, -0.24], height: 0.055 }),
    ],
  }),
};

export default midnightCrossing;
