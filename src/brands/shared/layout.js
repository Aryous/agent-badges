import { PLUS } from './pixel-art.js';
import { innerRadiusOf } from './fit.js';

// 各品牌共用的奖章版式。坐标单位：徽章中心为原点，外接半径为 1。
//
// 统一的结构（由外到内）：
//   金属外圈 → 深色珐琅环带（上弧品牌名、下弧成就名）→ 亮色珐琅圆盘 → 品牌锚点图案

/** 圆周上均匀分布的点（从正上方开始，顺时针）。 */
export const around = (n, radius, start = Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const t = start - (i / n) * Math.PI * 2;
    return [Math.cos(t) * radius, Math.sin(t) * radius];
  });

/** 文字环：上弧 + 下弧 + 左右两个像素十字分隔符。 */
export function textRing({ top, bottom, radius, size, metal, color }) {
  const common = { radius, size, material: metal, color, height: 0.024, tracking: 0.22 };
  const sep = (x) => ({ kind: 'pixels', rows: PLUS, cell: size * 0.26, center: [x, 0], material: metal, color, height: 0.022 });
  return [
    { kind: 'text-arc', text: top, arc: 'top', ...common },
    { kind: 'text-arc', text: bottom, arc: 'bottom', ...common },
    sep(-radius),
    sep(radius),
  ];
}

/** 中心圆盘的高度：放在圆盘上的图案要用 z: MEDALLION_H 抬起来。 */
export const MEDALLION_H = 0.014;

/** 中心圆盘 + 金属描边。 */
export function medallion({ radius, color, metal, metalColor, pattern = 'sunburst' }) {
  return [
    { kind: 'circle', radius, material: 'enamel', color, height: MEDALLION_H, pattern },
    { kind: 'ring', radius: radius + 0.006, width: 0.03, material: metal, color: metalColor, height: 0.034 },
  ];
}

/** 把一个浮雕的平面尺寸缩放 k 倍（高度不变）。 */
export function scaleRelief(item, k) {
  const out = { ...item };
  for (const key of ['center', 'from', 'to']) if (out[key]) out[key] = out[key].map((v) => v * k);
  for (const key of ['cell', 'width', 'radius', 'size', 'scale', 'half']) if (typeof out[key] === 'number') out[key] *= k;
  return out;
}

/** 标准圆章的版式常量（k = 1 时）。 */
const FACE_INSET = 0.11;
const CONTOUR_GAP = 0.045; // 贴边描边离面板外缘的距离
const CONTOUR_W = 0.012;
const TEXT_R = 0.715;
const TEXT_OUTER = (size) => TEXT_R + size * 0.5;
const BREATH = 0.065; // 比版式检查的下限（0.06）多留一点

/**
 * 标准圆章：金属外圈 → 深色珐琅面板 → 沿外形的细描边 → 环形文字（上品牌、下成就名）→ 亮色圆盘 → 画面。
 * 画面按 k = 1（圆盘半径 0.56）设计；k 默认由外形自动算出：文字环外缘离描边内沿留够呼吸距离，
 * 所以星形、花形、盾形这类内切圆较小的外形会整体内缩，不会贴边。
 */
export function roundMedal({ brandText, bottom, shape, metal, band, disc, art = [], k, textSize = 0.095, extra = [], contour = true }) {
  const edge = innerRadiusOf(shape, FACE_INSET + CONTOUR_GAP + CONTOUR_W);
  const fit = Math.min(1, (edge - BREATH) / TEXT_OUTER(textSize));
  const kk = Math.min(k ?? 1, fit);
  return {
    shape,
    layers: [
      { kind: 'rim', material: 'polished-metal', color: metal },
      { kind: 'face', material: 'enamel', color: band, inset: FACE_INSET, pattern: 'rings' },
    ],
    relief: [
      ...(contour ? [{ kind: 'contour', inset: FACE_INSET + CONTOUR_GAP, width: CONTOUR_W, material: 'polished-metal', color: metal, height: 0.014, bevel: 0.004 }] : []),
      ...extra.map((a) => scaleRelief(a, kk)),
      ...textRing({ top: brandText, bottom, radius: TEXT_R * kk, size: textSize * kk, metal: 'polished-metal', color: metal }),
      ...medallion({ radius: 0.56 * kk, color: disc, metal: 'polished-metal', metalColor: metal }),
      ...art.map((a) => scaleRelief(a, kk)),
    ],
    back: { material: 'brushed-metal', color: metal },
  };
}
