/**
 * 珐琅板的颜色（= heatmap.css 的 --plate-*，tests/heatmap.test.js 保证两边一致）。
 * 热力图、月章、分享海报和 SVG 成就卡片共用这套颜色。
 */
export const PLATE = {
  plate: '#141f4d', // 板面，和徽章的 midnight 同色
  sunk: '#0d1538', // 凹点：没有活动的日子，也是混色的另一端
  frame: 'rgba(160, 152, 138, 0.42)', // 锡色外框
  frameInner: 'rgba(160, 152, 138, 0.22)', // 内框线、板上的分隔线
  ink: '#f3ead6', // 标题、数字、年份
  sub: '#9aa3c4', // 统计行
  month: '#b8a982', // 沙金色月份
  dim: '#8d96b8', // 星期、图例文字
  name: '#e6dcc4', // 图例里的工具名
  ring: '#d9bf86', // 解锁日的金边
  outline: 'rgba(184, 169, 130, 0.16)', // 未来日和占位格的淡轮廓
};
/** 板上凹点的颜色：没有活动的日子，也是混色的另一端。 */
export const SUNK = PLATE.sunk;
/** 等级 0–4 → 混色比例：越大越接近品牌色。 */
export const STEP = [0, 0.38, 0.58, 0.8, 1];

const rgbOf = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 某个工具在某个等级的珐琅色：品牌色和凹点色按 STEP 混合。等级 4 就是品牌色，0 是凹点色。 */
export function enamelColor(hex, level) {
  const a = rgbOf(hex);
  const b = rgbOf(SUNK);
  const k = STEP[level] ?? 0;
  return `rgb(${a.map((v, i) => Math.round(v * k + b[i] * (1 - k))).join(', ')})`;
}
