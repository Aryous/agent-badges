import { SEVEN } from '../pixel-art.js';
import { MEDALLION_H, around, clawd, medallion, textRing } from '../helpers.js';

// 连续与习惯系列：坚持、作息和节奏。小怪物会按主题换装。

const sevenDayStreak = {
  id: 'seven-day-streak',
  title: '七日连击',
  titleEn: '7-DAY STREAK',
  description: '连续 7 天使用 Claude Code。习惯已经养成。',
  criteria: { metric: 'streak.days', target: 7 },
  shape: { type: 'polygon', sides: 6, radius: 1.04, cornerRadius: 0.16, depth: 0.2, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'emerald', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    // 六个角上的铆钉
    ...around(6, 0.8).map((center) => ({
      kind: 'circle', center, radius: 0.032, material: 'polished-metal', color: 'silver', height: 0.024,
    })),
    { kind: 'ring', radius: 0.735, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '7-DAY STREAK', radius: 0.635, size: 0.088, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.52, color: 'mint', metal: 'polished-metal', metalColor: 'silver' }),
    { kind: 'pixels', rows: SEVEN, cell: 0.046, center: [0.01, 0.1], material: 'enamel', color: 'ivory', height: 0.07, z: MEDALLION_H, bevel: 0.012 },
    ...clawd({ cell: 0.02, center: [0, -0.31], height: 0.05 }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

export default [sevenDayStreak];
