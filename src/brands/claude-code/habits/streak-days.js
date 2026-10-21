import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topTierFromLast } from '../../shared/top-tier.js';
import { clawd } from '../mascot.js';

// 月度坚持：盾牌 + 撕页日历，日历上印着坚持的天数。分级换金属和圆盘颜色。

const CAL_HEADER = [
  '.############.',
  '##############',
  '##############',
];

const CAL_PAGE = [
  '..............',
  '..............',
  '..............',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '##############',
  '.############.',
];

/** 日历顶上的两个装订环 */
const CAL_RINGS = [
  '...#......#...',
  '...#......#...',
];

const CAL_CELL = 0.033;

const CAL_CENTER = [0, 0.08];

const streakDays = {
  id: 'streak-days',
  title: '月度坚持',
  titleEn: '{label}-DAY STREAK',
  description: '连续使用 Claude Code 的天数。日历一页页撕下去，小家伙一天也没落下。',
  en: { title: '{label}-Day Streak', description: 'Consecutive days with Claude Code. Page after page off the calendar, and not a single day missed.' },
  tiers: [
    { threshold: 30, label: '30', metal: 'bronze', accent: 'aqua' },
    { threshold: 100, label: '100', metal: 'silver', accent: 'sky' },
    { threshold: 200, label: '200', metal: 'gold', accent: 'lime' },
    { threshold: 365, label: '365', metal: 'platinum', accent: 'amethyst' },
  ],
  shape: { type: 'shield', radius: 1, depth: 0.2, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.7, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '{label} DAYS', radius: 0.6, size: 0.078, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.48, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    // 日历：白纸页 + 红色页眉 + 金属装订环 + 印在纸上的天数
    { kind: 'pixels', rows: CAL_PAGE, cell: CAL_CELL, center: CAL_CENTER, material: 'enamel', color: 'snow', height: 0.045, z: MEDALLION_H, bevel: 0.008 },
    { kind: 'pixels', rows: [...CAL_HEADER, ...Array(8).fill('..............')], cell: CAL_CELL, center: CAL_CENTER, material: 'enamel', color: 'ruby', height: 0.055, z: MEDALLION_H, bevel: 0.008 },
    { kind: 'pixels', rows: [...CAL_RINGS, ...Array(9).fill('..............')], cell: CAL_CELL, center: [CAL_CENTER[0], CAL_CENTER[1] + CAL_CELL * 1.2], material: 'polished-metal', color: '$metal', height: 0.075, z: MEDALLION_H, bevel: 0.008 },
    { kind: 'text', text: '{label}', size: 0.11, center: [0, CAL_CENTER[1] - CAL_CELL * 1.6], material: 'enamel', color: 'ink', height: 0.03, z: MEDALLION_H + 0.045, tracking: 0.06 },
    ...clawd({ cell: 0.018, center: [0, -0.29], height: 0.05 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

export default topTierFromLast(streakDays, 'claude-code/streak-days');
