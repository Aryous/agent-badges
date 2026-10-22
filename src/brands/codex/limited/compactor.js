import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark } from '../mark.js';

// 压缩大师：尖顶八边形，金色外圈；上下两块压板夹住 Codex 标志。

/** 双 V 折线箭头（胶囊拼成）。dir = -1 向下，1 向上。 */
function chevrons({ cx, cy, dir, w = 0.07, h = 0.04, gap = 0.05, color = 'snow' }) {
  const common = { kind: 'capsule', width: 0.026, material: 'enamel', color, height: 0.04, z: MEDALLION_H };
  return [0, 1].flatMap((k) => {
    const y = cy - dir * k * gap; // 第二道离中心更远
    const tip = [cx, y + dir * h * 0.5];
    return [
      { ...common, from: [cx - w, y - dir * h * 0.5], to: tip },
      { ...common, from: tip, to: [cx + w, y - dir * h * 0.5] },
    ];
  });
}

// 压缩大师（隐藏）

const MARK_C = { size: 0.18, center: [0, 0] };

const compactor = {
  id: 'compactor',
  title: '压缩大师',
  description: '上下文压缩了 20 次。再长的对话，也能被压成刚刚好的一小块。',
  en: { title: 'Context Compactor', description: 'Context compacted 20 times. Even the longest conversation can be squeezed down to just the right size.' },
  criteria: { target: 20 },
  hidden: true,
  shape: { type: 'polygon', sides: 8, radius: 1.05, cornerRadius: 0.11, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'teal', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'COMPACTED · 20', radius: 0.685, size: 0.085, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.55, color: 'aqua', metal: 'polished-metal', metalColor: 'gold' }),
    // 上下两块压板
    { kind: 'capsule', from: [-0.29, 0.215], to: [0.29, 0.215], width: 0.05, material: 'polished-metal', color: 'gold', height: 0.05, z: MEDALLION_H },
    { kind: 'capsule', from: [-0.29, -0.215], to: [0.29, -0.215], width: 0.05, material: 'polished-metal', color: 'gold', height: 0.05, z: MEDALLION_H },
    // 压板外侧的双折线箭头，往中间压
    ...chevrons({ cx: 0, cy: 0.33, dir: -1 }),
    ...chevrons({ cx: 0, cy: -0.33, dir: 1 }),
    // 被压扁前留下的「长文本」：两侧几道折痕
    ...[-1, 1].flatMap((s) => [0.07, 0, -0.07].map((y) => ({
      kind: 'capsule', from: [s * 0.24, y], to: [s * 0.31, y], width: 0.022, material: 'enamel', color: 'snow', height: 0.024, z: MEDALLION_H,
    }))),
    ...codexMark(MARK_C),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

export default compactor;
