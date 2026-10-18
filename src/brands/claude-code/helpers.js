import { CLAWD, CLAWD_EYES } from './pixel-art.js';
import { MEDALLION_H } from '../shared/medal.js';

// Claude Code 专属构图：像素小怪物和它的配件。共用的奖章构图见 ../shared/medal.js。
export { around, textRing, MEDALLION_H, medallion } from '../shared/medal.js';

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
