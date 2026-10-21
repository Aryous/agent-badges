import { lantern } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 春节：五瓣梅花，一对红灯笼

const springFestival = {
  id: 'spring-festival',
  title: '春节',
  titleEn: 'SPRING FESTIVAL',
  description: '农历正月初一和 Claude Code 一起写代码。灯笼挂起来，新春第一行代码。',
  en: { title: 'Spring Festival', description: 'Coded with Claude Code on Lunar New Year. Lanterns up, the first line of code of the new spring.' },
  criteria: { metric: 'days.springFestival', target: 1 },
  ...medal({
    bottom: 'SPRING FESTIVAL',
    shape: { type: 'flower', petals: 5, radius: 1.1, petal: 0.44, valley: 0.1, depth: 0.22, bevel: 0.04 },
    metal: 'gold',
    band: 'crimson',
    disc: 'honey',
    art: [
      ...lantern(-0.21, 0.1, 0.036),
      ...lantern(0.21, 0.1, 0.036),
      ...clawd({ cell: 0.021, center: [0, -0.27], height: 0.055 }),
    ],
  }),
};

export default springFestival;
