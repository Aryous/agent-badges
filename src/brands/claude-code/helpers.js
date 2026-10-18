import { CLAWD, CLAWD_EYES, PLUS } from './pixel-art.js';

// Claude Code 徽章的共用构图工具。坐标单位：徽章中心为原点，外接半径为 1。
//
// 统一的结构（由外到内）：
//   金属外圈 → 深色珐琅环带（上弧品牌名、下弧成就名）→ 亮色珐琅圆盘 → 像素图案
// 每枚各用一组主色和一种金属；Claude Code 橙只出现在小怪物身上。

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

/** 像素小怪物：橙色身体 + 墨色眼睛（眼睛比身体低，像嵌在里面）。 */
export function clawd({ cell, center = [0, 0], color = 'primary', height = 0.07, z = MEDALLION_H }) {
  return [
    { kind: 'pixels', rows: CLAWD, cell, center, material: 'ceramic', color, height, z, bevel: Math.min(0.012, cell * 0.3) },
    { kind: 'pixels', rows: CLAWD_EYES, cell, center, material: 'enamel', color: 'ink', height: height * 0.55, z, bevel: cell * 0.2 },
  ];
}

/**
 * 给小怪物加像素配件（睡帽、头带、墨镜……）。
 * 配件网格与小怪物共用格子大小；col/row 是配件左上角落在小怪物网格（16 列 × 10 行）的哪一格，
 * row 可以为负数（头顶上方）。
 *
 *   onClawd({ cell: 0.04, center: [0, 0] }, HAT, { col: 3, row: -3, color: 'ivory', material: 'enamel' })
 */
export function onClawd({ cell, center = [0, 0] }, rows, { col, row, height = 0.05, z = MEDALLION_H, ...rest }) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cx = center[0] + (col + w / 2 - 8) * cell;
  const cy = center[1] + (5 - row - h / 2) * cell;
  return { kind: 'pixels', rows, cell, center: [cx, cy], height, z, bevel: Math.min(0.012, cell * 0.3), ...rest };
}
