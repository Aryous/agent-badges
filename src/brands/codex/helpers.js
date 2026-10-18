import { CODEX_MARK } from './icons.js';
import { MEDALLION_H } from '../shared/medal.js';

// Codex 专属构图：Codex 标志和它的配件。共用的奖章构图见 ../shared/medal.js。
export { around, textRing, MEDALLION_H, medallion } from '../shared/medal.js';

/** 官方彩色版的渐变（上 → 下），对应色板里的三个键。 */
export const CODEX_GRADIENT_KEYS = ['lavender', 'periwinkle', 'electric'];

/**
 * Codex 标志：云形外轮廓 + 镂空的 >_。
 * - 外轮廓用竖向渐变珐琅，和官方彩色版一致；
 * - inlay：往 >_ 的镂空里垫一层嵌片（默认雪白），比外轮廓低，像嵌在里面；传 null 则露出底下的圆盘。
 *
 * @param {number} size  标志半宽（徽章单位）
 */
export function codexMark({
  size = 0.3,
  center = [0, 0],
  height = 0.065,
  z = MEDALLION_H,
  gradient = CODEX_GRADIENT_KEYS,
  material = 'enamel',
  inlay = 'snow',
} = {}) {
  const common = { kind: 'path', d: CODEX_MARK, viewBox: 24, scale: size, center, z };
  return [
    { ...common, material, color: 'primary', gradient, height, bevel: Math.min(0.014, size * 0.045) },
    ...(inlay ? [{ ...common, holesOnly: true, material: 'enamel', color: inlay, height: height * 0.55, bevel: Math.min(0.006, size * 0.02) }] : []),
  ];
}

/**
 * 给 Codex 标志加像素配件。标志所在的正方形（边长 2 × size）被划成 16 × 16 格，
 * col / row 是配件左上角落在哪一格（row 可为负，表示标志上方）。
 *
 *   onMark({ size: 0.3, center: [0, 0] }, HAT, { col: 4, row: -4, color: 'ivory', material: 'enamel' })
 */
export function onMark({ size, center = [0, 0] }, rows, { col, row, height = 0.05, z = MEDALLION_H, ...rest }) {
  const cell = (size * 2) / 16;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cx = center[0] - size + (col + w / 2) * cell;
  const cy = center[1] + size - (row + h / 2) * cell;
  return { kind: 'pixels', rows, cell, center: [cx, cy], height, z, bevel: Math.min(0.012, cell * 0.3), ...rest };
}
