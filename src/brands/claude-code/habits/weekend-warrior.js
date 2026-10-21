import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { PLUS } from '../../shared/pixel-art.js';
import { clawd, onClawd } from '../mascot.js';

// 周末战士：绯红盾牌，小怪物绑着头带、守着笔记本电脑。

/** 头带：横过额头（小怪物网格第 1 行）。 */
const HEADBAND = ['..############..'];

const WW_CELL = 0.034;

const WW_CENTER = [0.03, -0.04];

const ww = { cell: WW_CELL, center: WW_CENTER };

/** 小怪物网格坐标 → 徽章坐标（格子中心） */
const wwAt = (col, row) => [WW_CENTER[0] + (col + 0.5 - 8) * WW_CELL, WW_CENTER[1] + (5 - row - 0.5) * WW_CELL];

const KNOT = wwAt(1.6, 1);

const weekendWarrior = {
  id: 'weekend-warrior',
  title: '周末战士',
  titleEn: 'WEEKEND WARRIOR',
  description: '周六、周日都在和 Claude Code 写代码。头带一绑，周末就是主场。',
  en: { title: 'Weekend Warrior', description: 'Coded with Claude Code on both Saturday and Sunday. Headband on, the weekend is home turf.' },
  criteria: { target: 1 },
  shape: { type: 'shield', radius: 1, width: 0.88, top: 0.88, shoulder: 0.05, bottom: -1.04, cornerRadius: 0.2, depth: 0.2, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'crimson', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.7, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'SAT · SUN', radius: 0.6, size: 0.085, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.48, color: 'scarlet', metal: 'polished-metal', metalColor: 'gold' }),
    ...clawd({ cell: WW_CELL, center: WW_CENTER, height: 0.07 }),
    onClawd(ww, HEADBAND, { col: 0, row: 1, material: 'enamel', color: 'snow', height: 0.085 }),
    // 头带在脑后打结，两条绸带往左后方飘
    ...[
      [[KNOT[0] - 0.09, KNOT[1] + 0.05], [KNOT[0] - 0.16, KNOT[1] + 0.035]],
      [[KNOT[0] - 0.08, KNOT[1] - 0.03], [KNOT[0] - 0.14, KNOT[1] - 0.08]],
    ].flatMap(([mid, end]) => [
      { kind: 'capsule', from: KNOT, to: mid, width: 0.042, material: 'enamel', color: 'snow', height: 0.06, z: MEDALLION_H },
      { kind: 'capsule', from: mid, to: end, width: 0.036, material: 'enamel', color: 'snow', height: 0.06, z: MEDALLION_H },
    ]),
    // 汗珠：圆底 + 尖顶（三段渐细的胶囊）
    { kind: 'circle', center: wwAt(15, -0.6), radius: 0.04, material: 'enamel', color: 'sky', height: 0.045, z: MEDALLION_H },
    { kind: 'capsule', from: wwAt(15, -0.6), to: wwAt(15, -1.6), width: 0.05, material: 'enamel', color: 'sky', height: 0.045, z: MEDALLION_H },
    { kind: 'capsule', from: wwAt(15, -1.6), to: wwAt(15, -2.3), width: 0.026, material: 'enamel', color: 'sky', height: 0.045, z: MEDALLION_H },
    // 干劲闪光
    ...[
      [0.33, 0.3, 0.02],
      [0.4, 0.14, 0.014],
      [-0.36, -0.25, 0.016],
    ].map(([x, y, cell]) => ({ kind: 'pixels', rows: PLUS, cell, center: [x, y], material: 'polished-metal', color: 'gold', height: 0.03, z: MEDALLION_H })),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

export default weekendWarrior;
