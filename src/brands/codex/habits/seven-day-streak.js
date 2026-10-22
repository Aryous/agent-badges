import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark } from '../mark.js';

// 七日连击：七边形，一周七格全点亮

const sevenDayStreak = {
  id: 'seven-day-streak',
  title: '七日连击',
  description: '连续 7 天打开 Codex。一周七格，格格都亮着。',
  en: { title: '7-Day Streak', description: 'Opened Codex 7 days in a row. Seven boxes in a week, every one lit up.' },
  criteria: { target: 7 },
  shape: { type: 'polygon', sides: 7, radius: 1.06, cornerRadius: 0.16, depth: 0.2, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'navy', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.745, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: '7-DAY STREAK', radius: 0.645, size: 0.088, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.53, color: 'sky', metal: 'polished-metal', metalColor: 'gold' }),
    ...codexMark({ size: 0.25, center: [0, 0.09] }),
    // 一周七格
    ...Array.from({ length: 7 }, (_, i) => ({
      kind: 'circle', center: [-0.27 + i * 0.09, -0.28], radius: 0.033,
      material: 'enamel', color: 'lime', height: 0.03, z: MEDALLION_H,
    })),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

export default sevenDayStreak;
