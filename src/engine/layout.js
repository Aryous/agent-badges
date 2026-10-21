import { innerRadius } from './shapes.js';

// 版式检查（设计原则的可执行部分）：
//   1. 内外呼应：非圆外形里，贴边的细描边要沿外形走（contour），不能是一个圆环；
//   2. 呼吸距离：文字环、圆盘这些居中的内容，离外框（或贴边描边）的内沿至少留 BREATHING。
// 只检查居中的大件；圆盘上的小图案由圆盘本身兜住。

/** 最小呼吸距离：徽章外接半径的 6%。 */
export const BREATHING = 0.06;
const THIN = 0.02;

const centered = (r) => !r.center || (Math.abs(r.center[0]) < 1e-6 && Math.abs(r.center[1]) < 1e-6);

/** 居中内容的外缘半径；不是居中大件返回 null。 */
function outerOf(r) {
  if (!centered(r)) return null;
  if (r.kind === 'text-arc') return r.radius + r.size * 0.5;
  if ((r.kind === 'circle' || r.kind === 'ring') && (r.width ?? 1) > THIN) return r.radius + (r.width ?? 0) / 2;
  return null;
}

/**
 * @param {object} config  已经按等级展开的配置（resolveTier 之后）
 * @returns {string[]} 问题列表，空数组表示合格
 */
export function layoutIssues(config) {
  const issues = [];
  const { shape } = config;
  const face = config.layers.find((l) => l.kind === 'face');
  const relief = config.relief ?? [];
  if (shape.type !== 'circle' && relief.some((r) => r.kind === 'ring' && centered(r) && r.width <= THIN)) {
    issues.push('非圆外形里用了圆形细描边，应改用沿外形的描边（contour）');
  }
  const contour = relief.filter((r) => r.kind === 'contour').sort((a, b) => b.inset - a.inset)[0];
  const edge = innerRadius(shape, contour ? contour.inset + contour.width : face.inset);
  const outer = Math.max(0, ...relief.map(outerOf).filter((x) => x !== null));
  const margin = edge - outer;
  if (outer > 0 && margin < BREATHING - 1e-9) issues.push(`内容离外框太近：留白 ${margin.toFixed(3)}，至少 ${BREATHING}`);
  return issues;
}
