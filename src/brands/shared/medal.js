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

/** 把一个浮雕的平面尺寸缩放 k 倍（高度不变）。 */
export function scaleRelief(item, k) {
  const out = { ...item };
  for (const key of ['center', 'from', 'to']) if (out[key]) out[key] = out[key].map((v) => v * k);
  for (const key of ['cell', 'width', 'radius', 'size', 'scale', 'half']) if (typeof out[key] === 'number') out[key] *= k;
  return out;
}

// ---------------------------------------------------------------------------
// Token 徽章的顶级（100B）：三款彩蛋，随机解锁一款（由达到这一级的日期决定，见 data/normalize.js）。
// 延续 Apple Watch 运动徽章的克制：不镶钻、不堆装饰，靠异形外轮廓 + 特殊材质区分。
// 顶级更安静：底面和圆盘不加纹理，里面的内容整体内缩，给花边 / 星芒的凹口留出呼吸空间。

const TOKEN_TOP = [
  {
    id: 'ivory-gold',
    name: { zh: '白瓷金', en: 'Ivory Gold' },
    metal: 'gold',
    accent: 'navy',
    shape: { type: 'starburst', points: 24, radius: 1.05, innerRadius: 0.985, tipRoundness: 0.05, valleyRoundness: 0.03, depth: 0.26, bevel: 0.05 },
    face: { material: 'ceramic', color: 'ivory' },
    inner: 0.93,
  },
  {
    id: 'onyx-gold',
    name: { zh: '黑瓷金', en: 'Onyx Gold' },
    metal: 'gold',
    accent: 'forest',
    shape: { type: 'polygon', sides: 8, radius: 1.06, cornerRadius: 0.12, rotation: Math.PI / 8, depth: 0.26, bevel: 0.05 },
    // 亮面的蓝黑（不用纯黑：纯黑金属像锅底）
    face: { material: 'enamel', color: 'onyx' },
    inner: 0.94,
  },
  {
    id: 'sapphire',
    name: { zh: '蓝宝石', en: 'Sapphire' },
    metal: 'silver',
    accent: 'cobalt',
    shape: { type: 'starburst', points: 16, radius: 1.08, innerRadius: 0.95, tipRoundness: 0.09, valleyRoundness: 0.05, depth: 0.26, bevel: 0.05 },
    face: { material: 'enamel', color: 'midnight' },
    inner: 0.9,
  },
];

const withoutPattern = ({ pattern: _p, ...rest }) => rest;

/**
 * 由 Token 徽章本身的造型生成顶级的三款：换外形和底面材质，去掉纹理和方形外框才需要的四角铆钉，内容内缩。
 * @param {object} base  不含顶级的 Token 徽章配置
 */
export function tokenTopVariants(base) {
  return TOKEN_TOP.map(({ face, inner, ...v }) => ({
    ...v,
    layers: base.layers.map((l) => (l.kind === 'face' ? withoutPattern({ ...l, ...face }) : l)),
    relief: base.relief
      .filter((r) => !(r.kind === 'circle' && r.radius < 0.04 && r.color === '$metal'))
      .map((r) => scaleRelief(r.kind === 'circle' && r.color === '$accent' ? withoutPattern(r) : r, inner)),
  }));
}
