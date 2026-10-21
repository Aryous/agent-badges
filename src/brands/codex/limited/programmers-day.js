import { textRing, MEDALLION_H } from '../../shared/layout.js';
import { codexMark } from '../mark.js';

// 1024 程序员节：16 瓣软云边（呼应 Codex 云形标志），全息外圈 + 全息圆盘；{ >_ } 代码括号。

/** 一对金属尖括号 < >，用胶囊拼出，转角圆润。 */
function angleBrackets({ center: [cx, cy], gap, h, w, width = 0.036 }) {
  const common = { kind: 'capsule', width, material: 'polished-metal', color: 'silver', height: 0.045, z: MEDALLION_H };
  return [-1, 1].flatMap((s) => [
    { ...common, from: [cx + s * gap, cy + h], to: [cx + s * (gap + w), cy] },
    { ...common, from: [cx + s * (gap + w), cy], to: [cx + s * gap, cy - h] },
  ]);
}

// 1024 程序员节

const programmersDay = {
  id: 'programmers-day',
  title: '1024 程序员节',
  titleEn: 'PROGRAMMERS DAY',
  description: '10 月 24 日当天和 Codex 一起写代码。2 的 10 次方，属于每一个敲下回车的人。',
  en: { title: "Programmers' Day", description: "Coded with Codex on October 24. Two to the tenth power: a holiday for everyone who hits Enter." },
  criteria: { target: 1 },
  shape: { type: 'starburst', points: 16, radius: 1.05, innerRadius: 0.93, tipRoundness: 0.17, valleyRoundness: 0.1, depth: 0.22, bevel: 0.035 },
  layers: [
    { kind: 'rim', material: 'holographic', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'navy', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.785, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'OCT 24 · 1024', radius: 0.67, size: 0.085, metal: 'polished-metal', color: 'silver' }),
    // 全息圆盘
    { kind: 'circle', radius: 0.53, material: 'holographic', color: 'snow', height: MEDALLION_H, pattern: 'sunburst' },
    { kind: 'ring', radius: 0.536, width: 0.03, material: 'polished-metal', color: 'silver', height: 0.034 },
    // 1024 大字
    { kind: 'text', text: '1024', size: 0.15, center: [0, 0.22], tracking: 0.06, material: 'enamel', color: 'navy', height: 0.05, z: MEDALLION_H },
    // < >_ >：Codex 标志被一对尖括号包住，像一个代码标签
    ...angleBrackets({ center: [0, -0.12], gap: 0.29, h: 0.13, w: 0.07 }),
    ...codexMark({ size: 0.19, center: [0, -0.12] }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

export default programmersDay;
