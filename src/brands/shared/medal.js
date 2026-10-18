import { PLUS } from './pixel-art.js';

// 各品牌共用的奖章构图。坐标单位：徽章中心为原点，外接半径为 1。
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
