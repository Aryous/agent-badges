import { scaleRelief } from './layout.js';

// 分级徽章的顶级：三款彩蛋（白瓷金 / 黑瓷金 / 蓝宝石），随机解锁一款（由达到这一级的日期决定，见 data/normalize.js）。
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
  const faceInset = base.layers.find((l) => l.kind === 'face')?.inset ?? 0.1;
  return TOKEN_TOP.map(({ face, inner, ...v }) => {
    // 顶级外形的倒角更厚，面层内缩至少要 倒角 × 2 + 0.01
    const inset = Math.max(faceInset, (v.shape.bevel ?? 0.04) * 2 + 0.01);
    const isEdgeLine = (r) => r.kind === 'ring' && !r.center && r.width <= 0.02 && r.radius > 0.75;
    return {
      ...v,
      layers: base.layers.map((l) => (l.kind === 'face' ? withoutPattern({ ...l, ...face, inset }) : l)),
      relief: base.relief
        .filter((r) => !(r.kind === 'circle' && r.radius < 0.04 && r.color === '$metal'))
        // 贴边的圆形细描边换成沿外形的描边：外形变成星芒、八角后，描边跟着走
        .map((r) => (isEdgeLine(r) ? { kind: 'contour', inset: inset + 0.045, width: r.width, material: r.material, color: r.color, height: r.height, bevel: 0.004 } : r))
        .map((r) => (r.kind === 'contour' ? r : scaleRelief(r.kind === 'circle' && r.color === '$accent' ? withoutPattern(r) : r, inner))),
    };
  });
}

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
