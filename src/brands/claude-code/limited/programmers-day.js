import { textRing, MEDALLION_H } from '../../shared/layout.js';
import { clawd } from '../mascot.js';

// 1024 程序员节：十边形（1024 = 2^10），全息镭射外圈 + 全息圆盘。

/** 3×5 像素数字，拼成「1024」。 */
const DIGITS = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
};

const pixelNumber = (str) => Array.from({ length: 5 }, (_, r) => [...str].map((d) => DIGITS[d][r]).join('.'));

const N1024 = pixelNumber('1024');

/** 二进制刻度：1024 = 1 后面跟 10 个 0，共 11 位。 */
const BITS = '10000000000';

// 1024 程序员节

const programmersDay = {
  id: 'programmers-day',
  title: '1024 程序员节',
  titleEn: 'PROGRAMMERS DAY',
  description: '在 10 月 24 日这天和 Claude Code 一起写代码。2 的 10 次方，属于我们的节日。',
  en: { title: "Programmers' Day", description: "Coded with Claude Code on October 24. Two to the tenth power: a holiday that belongs to us." },
  criteria: { target: 1 },
  shape: { type: 'polygon', sides: 10, radius: 1.04, cornerRadius: 0.08, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'holographic', color: 'snow' },
    { kind: 'face', material: 'enamel', color: 'teal', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.835, width: 0.012, material: 'polished-metal', color: 'platinum', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'OCT 24 · 1024', radius: 0.71, size: 0.088, metal: 'polished-metal', color: 'platinum' }),
    // 全息圆盘
    { kind: 'circle', radius: 0.565, material: 'holographic', color: 'snow', height: MEDALLION_H, pattern: 'sunburst' },
    { kind: 'ring', radius: 0.571, width: 0.03, material: 'polished-metal', color: 'platinum', height: 0.034 },
    // 二进制刻度：第一位亮起，其余 10 位是 0
    ...[...BITS].map((b, i) => {
      // 最高位在左：从左往右读 1 0000000000
      const t = Math.PI / 2 - ((i - 5) / 11) * Math.PI * 0.9;
      return {
        kind: 'circle',
        center: [Math.cos(t) * 0.47, Math.sin(t) * 0.47],
        radius: b === '1' ? 0.026 : 0.016,
        material: 'enamel',
        color: b === '1' ? 'lime' : 'navy',
        height: 0.02,
        z: MEDALLION_H,
      };
    }),
    { kind: 'pixels', rows: N1024, cell: 0.042, center: [0, 0.08], material: 'enamel', color: 'navy', height: 0.06, z: MEDALLION_H, bevel: 0.01 },
    ...clawd({ cell: 0.018, center: [0, -0.27], height: 0.05 }),
  ],
  back: { material: 'holographic', color: 'snow' },
};

export default programmersDay;
