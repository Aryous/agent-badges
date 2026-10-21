import { px } from '../../shared/parts.js';
import { SNOWFLAKE } from '../../shared/pixel-art.js';
import { clawd, onClawd } from '../mascot.js';
import { medal } from '../medal.js';

// 圣诞节：六芒软星，戴圣诞帽的小怪物 + 雪花

/** 圣诞帽：帽身往右上斜，帽尖垂到右边。从头顶上方 5 行开始。 */
const SANTA_HAT = [
  '........#####...',
  '......#########.',
  '.....##########.',
  '....######...###',
  '...#######......',
];

const SANTA_BRIM = ['..############..'];

const XMAS = { cell: 0.03, center: [0, -0.16] };

const christmas = {
  id: 'christmas',
  title: '圣诞节',
  titleEn: 'CHRISTMAS',
  description: '12 月 25 日和 Claude Code 一起写代码。圣诞帽戴好，今天的礼物是一个通过的测试。',
  en: { title: "Christmas", description: "Coded with Claude Code on December 25. Santa hat on; today's present is a passing test." },
  criteria: { metric: 'days.christmas', target: 1 },
  ...medal({
    bottom: 'MERRY CHRISTMAS',
    shape: { type: 'starburst', points: 6, radius: 1.1, innerRadius: 0.84, tipRoundness: 0.3, valleyRoundness: 0.2, depth: 0.22, bevel: 0.04 },
    metal: 'silver',
    band: 'forest',
    disc: 'snow',
    art: [
      ...[[-0.3, 0.2, 0.026], [0.3, 0.28, 0.02], [-0.36, -0.14, 0.018], [0.37, -0.04, 0.018], [-0.02, 0.38, 0.016]].map(([x, y, c]) => px(SNOWFLAKE, c, [x, y], 'sky', 'enamel', 0.03)),
      ...clawd({ ...XMAS, height: 0.06 }),
      onClawd(XMAS, SANTA_HAT, { col: 1, row: -5, material: 'enamel', color: 'ruby', height: 0.065 }),
      onClawd(XMAS, SANTA_BRIM, { col: 0, row: -1, material: 'enamel', color: 'ivory', height: 0.08 }),
      onClawd(XMAS, ['###', '###'], { col: 13, row: -3, material: 'enamel', color: 'ivory', height: 0.075 }),
    ],
  }),
};

export default christmas;
