import { lantern } from '../../shared/parts.js';
import { codexMark } from '../mark.js';
import { medal } from '../medal.js';

// 春节：平顶八边形（窗棂），一对灯笼

const springFestival = {
  id: 'spring-festival',
  title: '春节',
  titleEn: 'SPRING FESTIVAL',
  description: '农历正月初一和 Codex 一起写代码。灯笼挂上云头，新春第一个补丁。',
  en: { title: 'Spring Festival', description: 'Coded with Codex on Lunar New Year. Lanterns hung by the cloud, the first patch of the new spring.' },
  criteria: { metric: 'days.springFestival', target: 1 },
  ...medal({
    bottom: 'SPRING FESTIVAL',
    shape: { type: 'polygon', sides: 8, radius: 1.06, cornerRadius: 0.16, rotation: Math.PI / 8, depth: 0.22, bevel: 0.045 },
    metal: 'gold',
    band: 'crimson',
    disc: 'sand',
    art: [
      ...lantern(-0.24, 0.12, 0.034),
      ...lantern(0.24, 0.12, 0.034),
      ...codexMark({ size: 0.2, center: [0, -0.18], height: 0.065 }),
    ],
  }),
};

export default springFestival;
