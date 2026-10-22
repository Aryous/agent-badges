import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { clawd, onClawd } from '../mascot.js';

// Bash 狂人：16 齿锯齿章（爆炸贴纸），钢色外圈 + 终端绿；小怪物在冒烟的键盘上狂敲。

/** 键盘：18 列 × 4 行，键帽之间留缝。 */
const KEYBOARD = [
  '##################',
  '#.#.#.#.#.#.#.#.##',
  '##.#.#.#.#.#.#.#.#',
  '##################',
];

// Bash 狂人（隐藏）

const BASH_MASCOT = { cell: 0.025, center: [0, -0.16] };

const bashManiac = {
  id: 'bash-maniac',
  hidden: true,
  title: 'Bash 狂人',
  description: '一天之内让 Claude Code 敲了 500 次 Bash。键盘冒烟了，终端还在滚。',
  en: { title: 'Bash Maniac', description: 'Had Claude Code run Bash 500 times in one day. The keyboard is smoking and the terminal is still scrolling.' },
  criteria: { target: 500 },
  shape: { type: 'starburst', points: 14, radius: 1.06, innerRadius: 0.88, tipRoundness: 0.05, valleyRoundness: 0.1, depth: 0.22, bevel: 0.03 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'steel' },
    { kind: 'face', material: 'enamel', color: 'ink', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.775, width: 0.012, material: 'polished-metal', color: 'lime', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '500 BASH / DAY', radius: 0.665, size: 0.08, metal: 'enamel', color: 'lime' }),
    ...medallion({ radius: 0.53, color: 'slate', metal: 'polished-metal', metalColor: 'steel', pattern: 'rings' }),
    // >_ 提示符
    { kind: 'capsule', from: [-0.24, 0.36], to: [-0.1, 0.26], width: 0.07, material: 'enamel', color: 'lime', height: 0.05, z: MEDALLION_H },
    { kind: 'capsule', from: [-0.1, 0.26], to: [-0.24, 0.16], width: 0.07, material: 'enamel', color: 'lime', height: 0.05, z: MEDALLION_H },
    { kind: 'capsule', from: [-0.02, 0.16], to: [0.2, 0.16], width: 0.07, material: 'enamel', color: 'lime', height: 0.05, z: MEDALLION_H, effect: 'pulse' },
    // 小怪物 + 键盘（键盘在前面，挡住腿）
    ...clawd({ ...BASH_MASCOT, height: 0.05 }),
    onClawd(BASH_MASCOT, KEYBOARD, { col: -1, row: 7, material: 'polished-metal', color: 'steel', height: 0.07 }),
    // 冒烟的速度线
    ...[
      [-0.3, -0.08],
      [0.3, -0.08],
    ].map(([x, y]) => ({
      kind: 'capsule', from: [x, y], to: [x + Math.sign(x) * 0.06, y + 0.03], width: 0.018, material: 'enamel', color: 'lime', height: 0.025, z: MEDALLION_H,
    })),
  ],
  back: { material: 'brushed-metal', color: 'steel' },
};

export default bashManiac;
