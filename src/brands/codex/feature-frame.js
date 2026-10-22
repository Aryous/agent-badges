import { MEDALLION_H as Z } from '../shared/layout.js';

// Codex 功能探索系列：每个 Codex 能力一枚。
//
// 家族语言（与 Claude Code 的「圆角方形 App 图标」区分开）：
//   平顶圆角六边形「工牌」：拉丝钛外框 → 深色珐琅底 → 顶部 CODEX 字样
//   → 居中的亮色放射纹圆盘（Codex 标志和功能图标在这里互动）
//   → 底部一块抛光金属铭牌，刻着功能名。
// 六枚共用外框和铭牌，只换一组主色和中间的图案。

const PLATE_Y = -0.655;

const PANEL_C = [0, 0.05];

const PANEL_R = 0.52;

// 图案按 0.47 半径的圆盘设计，统一放大到实际圆盘大小
const ART_K = PANEL_R / 0.47;

const sp = ([x, y]) => [PANEL_C[0] + (x - PANEL_C[0]) * ART_K, PANEL_C[1] + (y - PANEL_C[1]) * ART_K];

/** 把一组浮雕绕圆盘中心等比放大（只改平面尺寸，不改高度）。 */
function scaleArt(items) {
  return items.map((it) => {
    const o = { ...it };
    if (o.center) o.center = sp(o.center);
    if (o.from) o.from = sp(o.from);
    if (o.to) o.to = sp(o.to);
    for (const k of ['radius', 'width', 'cell', 'scale', 'size']) if (typeof o[k] === 'number') o[k] *= ART_K;
    if (o.kind === 'path' && o.center === undefined) o.center = sp([0, 0]);
    return o;
  });
}

/** 成套的外框、文字、圆盘和铭牌。 */
export function featureBadge({ id, title, description, en, target, band, panel, label, art }) {
  return {
    id,
    title,
    description,
    en,
    criteria: { target },
    shape: { type: 'polygon', sides: 6, rotation: 0, radius: 1.1, cornerRadius: 0.3, depth: 0.2, bevel: 0.04 },
    layers: [
      { kind: 'rim', material: 'brushed-metal', color: 'silver' },
      { kind: 'face', material: 'enamel', color: band, inset: 0.11, pattern: 'rings' },
    ],
    relief: [
      // 顶部品牌字
      { kind: 'text', text: 'CODEX', size: 0.074, center: [0, 0.69], tracking: 0.42, material: 'polished-metal', color: 'silver', height: 0.022 },
      // 中央圆盘
      { kind: 'circle', center: PANEL_C, radius: PANEL_R, material: 'enamel', color: panel, height: Z, pattern: 'sunburst' },
      { kind: 'ring', center: PANEL_C, radius: PANEL_R + 0.006, width: 0.028, material: 'polished-metal', color: 'silver', height: 0.034 },
      // 底部铭牌 + 刻字
      { kind: 'capsule', from: [-0.38, PLATE_Y], to: [0.38, PLATE_Y], width: 0.17, material: 'polished-metal', color: 'silver', height: 0.03 },
      { kind: 'text', text: label, size: 0.06, center: [0, PLATE_Y], tracking: 0.24, material: 'enamel', color: 'ink', height: 0.012, z: 0.03 },
      ...scaleArt(art),
    ],
    back: { material: 'brushed-metal', color: 'silver', safeRadius: 0.62 },
  };
}
