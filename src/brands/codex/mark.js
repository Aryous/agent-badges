import { MEDALLION_H } from '../shared/layout.js';

// Codex 标志的矢量路径（24×24 viewBox，fill-rule: evenodd）。
//
// 来源：LobeHub Icons（https://github.com/lobehub/lobe-icons，MIT 许可），
//       @lobehub/icons-static-svg@1.95.1 的 icons/codex.svg 与 codex-color.svg。
// MIT 许可只覆盖代码；Codex 标志本身是 OpenAI 的商标，这里仅作个人成就徽章使用。
//
// 结构：外轮廓是一朵柔和的「云」，里面镂空出 > 和 _ 两个子路径。

export const CODEX_MARK = 'M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z';


// Codex 标志的配件与构图。共用的奖章版式见 ../shared/layout.js。

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
