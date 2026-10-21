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
 * 由分级徽章本身的造型生成顶级的三款：换外形和底面材质，去掉纹理和方形外框才需要的四角铆钉，内容内缩。
 * 所有分级徽章的顶级共用这一家族（白瓷金 / 黑瓷金 / 蓝宝石），一眼能认出是顶级。
 * @param {object} base  不含顶级的徽章配置
 */
export function topVariants(base) {
  return TOKEN_TOP.map(({ face, inner, ...v }) => ({
    ...v,
    // 顶级外形的倒角更厚，面层内缩至少要 倒角 × 2 + 0.01
    layers: base.layers.map((l) => (l.kind === 'face' ? withoutPattern({ ...l, ...face, inset: Math.max(l.inset ?? 0, (v.shape.bevel ?? 0.04) * 2 + 0.01) }) : l)),
    relief: base.relief
      .filter((r) => !(r.kind === 'circle' && r.radius < 0.04 && r.color === '$metal'))
      .map((r) => scaleRelief(r.kind === 'circle' && r.color === '$accent' ? withoutPattern(r) : r, inner)),
  }));
}

/** 旧名（Token 徽章最先用上这套顶级款式）。 */
export const tokenTopVariants = topVariants;

/**
 * 分级徽章的顶级：门槛和标签照旧，造型换成三款随机（由达到这一级的日期决定）。
 * @param {object} base   不含顶级的徽章配置
 * @param {object} tier   { threshold, label }
 * @param {string} salt   '<品牌>/<徽章 id>'
 */
export function withTopTier(base, { threshold, label }, salt) {
  return { ...base, tiers: [...base.tiers, { threshold, label, salt, variants: topVariants(base) }] };
}

/** 把已有分级徽章的最后一级换成顶级三款（门槛和标签不变）。 */
export function topTierFromLast(config, salt) {
  const last = config.tiers.at(-1);
  return withTopTier({ ...config, tiers: config.tiers.slice(0, -1) }, last, salt);
}

/**
 * 标准圆章：金属外圈 → 深色珐琅环带（上弧品牌、下弧成就名）→ 亮色圆盘 → 画面。
 * 画面按 k = 1（圆盘半径 0.56）设计，外形内切圆较小时传 k < 1 整体内缩。
 */
export function roundMedal({ brandText, bottom, shape, metal, band, disc, art = [], k = 1, ring = true, textSize = 0.095, extra = [] }) {
  return {
    shape,
    layers: [
      { kind: 'rim', material: 'polished-metal', color: metal },
      { kind: 'face', material: 'enamel', color: band, inset: 0.11, pattern: 'rings' },
    ],
    relief: [
      ...(ring ? [{ kind: 'ring', radius: 0.845 * k, width: 0.012, material: 'polished-metal', color: metal, height: 0.014 }] : []),
      ...extra.map((a) => scaleRelief(a, k)),
      ...textRing({ top: brandText, bottom, radius: 0.715 * k, size: textSize, metal: 'polished-metal', color: metal }),
      ...medallion({ radius: 0.56 * k, color: disc, metal: 'polished-metal', metalColor: metal }),
      ...art.map((a) => scaleRelief(a, k)),
    ],
    back: { material: 'brushed-metal', color: metal },
  };
}
