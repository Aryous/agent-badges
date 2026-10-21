import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { PLUS } from '../../shared/pixel-art.js';
import { CLAWD, onClawd } from '../mascot.js';

// 夜猫子：午夜蓝，月牙和星星，小怪物戴着睡帽、眯着眼。

/** 月牙（朝右开口） */
const MOON = [
  '..###..',
  '.###...',
  '###....',
  '###....',
  '###....',
  '.###...',
  '..###..',
];

/** 睡帽：圆鼓鼓地扣在头上，帽尖往右边耷拉下来，尖上挂一个绒球。从头顶上方 3 行开始。 */
const NIGHTCAP = [
  '.....######.....',
  '...##########...',
  '..#############.',
];

/** 帽尖垂到脑袋右侧（相对小怪物网格：第 14 列、第 -1 行起） */
const NIGHTCAP_TAIL = [
  '##.',
  '.##',
  '.##',
];

const NIGHTCAP_BRIM = ['..############..'];

const POMPOM = ['##', '##'];

/** 眯眼：眼洞上半格用身体颜色补上，只留下半格的墨色，像睡着了。 */
const SLEEPY_LIDS = [
  '................',
  '................',
  '....#......#....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const SLEEPY_EYES = [
  '................',
  '................',
  '................',
  '....#......#....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OWL_CELL = 0.033;

const OWL_CENTER = [-0.02, -0.12];

const owl = { cell: OWL_CELL, center: OWL_CENTER };

const nightOwl = {
  id: 'night-owl',
  title: '夜猫子',
  titleEn: 'NIGHT OWL',
  description: '在凌晨 0–5 点还在和 Claude Code 写代码。帽子都戴上了，就是不肯睡。',
  en: { title: 'Night Owl', description: 'Still coding with Claude Code between midnight and 5 a.m. Nightcap on, still not going to bed.' },
  criteria: { target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'midnight', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'NIGHT OWL', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.56, color: 'navy', metal: 'polished-metal', metalColor: 'silver' }),
    // 月牙与星星
    { kind: 'pixels', rows: MOON, cell: 0.028, center: [0.3, 0.3], material: 'enamel', color: 'honey', height: 0.05, z: MEDALLION_H },
    ...[
      [-0.36, 0.22, 0.02],
      [-0.12, 0.4, 0.016],
      [0.1, 0.37, 0.013],
      [0.42, 0.07, 0.016],
      [-0.42, -0.2, 0.013],
    ].map(([x, y, cell]) => ({ kind: 'pixels', rows: PLUS, cell, center: [x, y], material: 'polished-metal', color: 'honey', height: 0.03, z: MEDALLION_H })),
    // 小怪物（眯眼）
    { kind: 'pixels', rows: CLAWD, cell: OWL_CELL, center: OWL_CENTER, material: 'ceramic', color: 'primary', height: 0.07, z: MEDALLION_H, bevel: 0.009 },
    { kind: 'pixels', rows: SLEEPY_LIDS, cell: OWL_CELL, center: OWL_CENTER, material: 'ceramic', color: 'primary', height: 0.07, z: MEDALLION_H, bevel: 0.006 },
    { kind: 'pixels', rows: SLEEPY_EYES, cell: OWL_CELL, center: OWL_CENTER, material: 'enamel', color: 'ink', height: 0.04, z: MEDALLION_H, bevel: 0.006 },
    // 睡帽
    onClawd(owl, NIGHTCAP, { col: 0, row: -3, material: 'enamel', color: 'sky', height: 0.06 }),
    onClawd(owl, NIGHTCAP_TAIL, { col: 14, row: -1, material: 'enamel', color: 'sky', height: 0.06 }),
    onClawd(owl, NIGHTCAP_BRIM, { col: 0, row: 0, material: 'enamel', color: 'snow', height: 0.085 }),
    onClawd(owl, POMPOM, { col: 15, row: 2, material: 'enamel', color: 'snow', height: 0.075 }),
    // 呼噜：一大一小两个 Z 往左上飘
    { kind: 'text', text: 'Z', size: 0.085, center: [-0.33, 0.05], material: 'polished-metal', color: 'silver', height: 0.028, z: MEDALLION_H },
    { kind: 'text', text: 'Z', size: 0.06, center: [-0.22, 0.17], material: 'polished-metal', color: 'silver', height: 0.024, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

export default nightOwl;
