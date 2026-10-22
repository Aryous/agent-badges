import { appIcon, mascot, px } from '../app-icon.js';

// 技能大师：App 图标家族；一道闪电。

// 闪电
const BOLT = [
  '.....#####',
  '....#####.',
  '...#####..',
  '..#####...',
  '.#########',
  '#########.',
  '....####..',
  '...####...',
  '..####....',
  '.###......',
  '##........',
];

const skillMaster = appIcon({
  id: 'skill-master',
  title: '技能大师',
  description: '调用 Skill 50 次。会的招式多了，出手就快了。',
  en: { title: 'Skill Master', description: 'Invoked Skills 50 times. The more moves you know, the faster you strike.' },
  criteria: { target: 50 },
  rim: 'sapphire',
  face: 'navy',
  panel: 'sky',
  metal: 'gold',
  name: 'SKILLS',
  art: [
    px(BOLT, 0.034, [0.01, 0.13], 'topaz', 'enamel', 0.065),
    ...mascot(0.021, [0, -0.3]),
  ],
});

export default skillMaster;
