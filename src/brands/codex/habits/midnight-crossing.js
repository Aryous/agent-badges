import { dot, px, dialTicks, midnightHands } from '../../shared/parts.js';
import { MOON } from '../../shared/pixel-art.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 跨日夜战：圆形表盘，指针在 12 点重合

const midnightCrossing = {
  id: 'midnight-crossing',
  title: '跨日夜战',
  titleEn: 'PAST MIDNIGHT',
  description: '同一个会话从前一天 23 点前一直聊到第二天凌晨 2 点后。指针在 12 点重合，云朵还亮着。',
  en: { title: 'Past Midnight', description: 'One session that started before 11 p.m. and was still going after 2 a.m. The hands meet at twelve and the cloud is still lit.' },
  criteria: { metric: 'session.midnight', target: 1 },
  ...medal({
    bottom: 'PAST MIDNIGHT',
    shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
    metal: 'platinum',
    band: 'violet',
    disc: 'midnight',
    art: [
      ...dialTicks(0.49, 'platinum', 'lilac'),
      ...midnightHands('platinum', 0.04),
      px(MOON, 0.026, [-0.22, 0.2], 'honey', 'enamel', 0.045),
      ...[[0.2, 0.26, 0.016], [0.27, 0.1, 0.012], [-0.3, 0.02, 0.012]].map(([x, y, r]) => dot([x, y], r, 'snow', 0.02)),
      ...codexMark({ size: 0.15, center: [0, -0.25], height: 0.06 }),
    ],
  }),
};

export default midnightCrossing;
