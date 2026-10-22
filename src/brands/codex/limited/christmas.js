import { px } from '../../shared/parts.js';
import { SNOWFLAKE } from '../../shared/pixel-art.js';
import { codexMark, onMark } from '../mark.js';
import { medal } from '../medal.js';

// 圣诞节：六瓣花（雪晶），戴圣诞帽的云朵

/** 圣诞帽（Codex 标志网格 16 × 16，从标志上方开始） */
const SANTA_HAT = [
  '.......#####....',
  '.....#########..',
  '....##########..',
  '...######...###.',
  '..#######.......',
];

const SANTA_BRIM = ['.############...'];

const XMAS = { size: 0.22, center: [0, -0.1] };

const christmas = {
  id: 'christmas',
  title: '圣诞节',
  description: '12 月 25 日和 Codex 一起写代码。云朵戴上圣诞帽，今天的礼物是一个干净的补丁。',
  en: { title: "Christmas", description: "Coded with Codex on December 25. The cloud puts on a Santa hat; today's present is a clean patch." },
  criteria: { target: 1 },
  ...medal({
    bottom: 'MERRY CHRISTMAS',
    shape: { type: 'flower', petals: 6, radius: 1.08, petal: 0.36, valley: 0.12, depth: 0.22, bevel: 0.04 },
    metal: 'silver',
    band: 'emerald',
    disc: 'ivory',
    art: [
      ...[[-0.3, 0.22, 0.026], [0.3, 0.3, 0.02], [-0.37, -0.12, 0.018], [0.37, -0.06, 0.018], [0.0, 0.4, 0.014]].map(([x, y, c]) => px(SNOWFLAKE, c, [x, y], 'sky', 'enamel', 0.03)),
      ...codexMark(XMAS),
      onMark(XMAS, SANTA_HAT, { col: 1, row: -4, material: 'enamel', color: 'ruby', height: 0.075 }),
      onMark(XMAS, SANTA_BRIM, { col: 1, row: 1, material: 'enamel', color: 'snow', height: 0.085 }),
      onMark(XMAS, ['###', '###'], { col: 13, row: -1, material: 'enamel', color: 'snow', height: 0.085 }),
    ],
  }),
};

export default christmas;
