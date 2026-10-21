import { appIcon, mascot, px } from '../app-icon.js';

// 深思熟虑：App 图标家族；夹着勾选清单的剪贴板。

// 剪贴板：板身、夹子、勾选、文字行分层上色
const BOARD = [
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
];

const CLIP = ['.#####.', '#######'];

const CHECKS = [
  '...........',
  '...........',
  '.....#.....',
  '.#..#......',
  '..##.......',
  '...........',
  '.....#.....',
  '.#..#......',
  '..##.......',
  '...........',
  '...........',
  '...........',
];

const LINES = [
  '...........',
  '...........',
  '...........',
  '......####.',
  '...........',
  '...........',
  '...........',
  '......####.',
  '...........',
  '.###..####.',
  '...........',
  '...........',
];

const planMode = appIcon({
  id: 'plan-mode',
  title: '深思熟虑',
  titleEn: 'PLAN MODE',
  description: '用过 Plan 模式。先想清楚，再动手。',
  en: { title: 'Plan Mode', description: 'Used Plan mode. Think it through, then build.' },
  criteria: { target: 1 },
  rim: 'forest',
  face: 'forest',
  panel: 'lime',
  name: 'PLAN MODE',
  art: [
    px(BOARD, 0.032, [0, 0.11], 'sand', 'enamel', 0.04),
    px(CHECKS, 0.032, [0, 0.11], 'forest', 'enamel', 0.06),
    px(LINES, 0.032, [0, 0.11], 'steel', 'enamel', 0.055),
    px(CLIP, 0.032, [0, 0.11 + 0.032 * 6.5], 'silver', 'polished-metal', 0.07),
    ...mascot(0.021, [0, -0.32]),
  ],
});

export default planMode;
