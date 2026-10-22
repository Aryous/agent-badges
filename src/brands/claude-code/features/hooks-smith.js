import { appIcon, mascot, px } from '../app-icon.js';

// 钩子匠人：App 图标家族；钩子从上方垂下，钩尖够到小怪物头顶。

// 鱼钩：顶部挂环 + 竖杆 + J 形弯钩 + 倒刺
const HOOK = [
  '........####..',
  '.......##..##.',
  '.......##..##.',
  '........####..',
  '.........##...',
  '.........##...',
  '.........##...',
  '.........##...',
  '.........##...',
  '##.......##...',
  '###......##...',
  '.##......##...',
  '.##.....###...',
  '.###...###....',
  '..#######.....',
  '...#####......',
];

const hooksSmith = appIcon({
  id: 'hooks-smith',
  title: '钩子匠人',
  description: '配置了第一个 Hook。从此每次提交前，都有人替你把关。',
  en: { title: 'Hooks Smith', description: 'Set up your first hook. From now on, something checks your work before every commit.' },
  criteria: { target: 1 },
  rim: 'teal',
  face: 'teal',
  panel: 'aqua',
  name: 'HOOKS',
  art: [
    // 钩子从上方垂下来，钩尖正好够到小怪物头顶
    px(HOOK, 0.03, [0.045, 0.16], 'silver', 'polished-metal', 0.06),
    ...mascot(0.021, [0, -0.3]),
  ],
});

export default hooksSmith;
