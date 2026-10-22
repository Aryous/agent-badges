import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark, onMark } from '../mark.js';

// 周末战士：五边形，戴上墨镜的周末

/** 墨镜：两片镜片 + 鼻梁（在 16×16 的标志网格里约占 12 格宽） */
const SHADES = [
  '############',
  '.####..####.',
  '..##....##..',
];

const WK = { size: 0.26, center: [0, -0.02] };

const weekendWarrior = {
  id: 'weekend-warrior',
  title: '周末战士',
  description: '周六和周日都在用 Codex。墨镜戴上了，补丁也没停下。',
  en: { title: 'Weekend Warrior', description: 'Used Codex on both Saturday and Sunday. Sunglasses on, patches still flowing.' },
  criteria: { target: 1 },
  shape: { type: 'polygon', sides: 5, radius: 1.1, cornerRadius: 0.2, rotation: Math.PI / 2, depth: 0.2, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'rose' },
    { kind: 'face', material: 'enamel', color: 'magenta', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CODEX', bottom: 'SAT · SUN', radius: 0.6, size: 0.085, metal: 'polished-metal', color: 'rose' }),
    ...medallion({ radius: 0.48, color: 'amber', metal: 'polished-metal', metalColor: 'rose' }),
    ...codexMark(WK),
    onMark(WK, SHADES, { col: 2, row: 2, material: 'enamel', color: 'ink', height: 0.085, z: MEDALLION_H }),
    // 两颗闪光
    { kind: 'pixels', rows: ['.#.', '###', '.#.'], cell: 0.022, center: [0.3, 0.24], material: 'enamel', color: 'snow', height: 0.03, z: MEDALLION_H },
    { kind: 'pixels', rows: ['.#.', '###', '.#.'], cell: 0.016, center: [-0.32, 0.2], material: 'enamel', color: 'snow', height: 0.03, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: 'rose' },
};

export default weekendWarrior;
