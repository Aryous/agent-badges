// 外形内缩之后到中心的最近距离（内切半径），用于标准圆章自动缩放内容。
// 纯数学、不依赖 three：徽章配置也会在命令行里加载，而 npm 包不带 3D 引擎。
// 和引擎的精确算法（engine/shapes.js 的 innerRadius）一致或略小（更保守），由测试保证。

/** 三次贝塞尔上的点 */
const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
};

/** 盾形：两侧竖边、平顶，下半部两段贝塞尔收成尖底（与 engine/shapes.js 的 shield 相同）。 */
function shieldInner({ radius = 1, width = 0.86, top = 0.9, shoulder = 0.12, bottom = -1.02 }, inset) {
  const k = (radius - inset) / radius;
  const w = width * radius * k;
  const t = top * radius * k;
  const y1 = shoulder * radius * k;
  const b = bottom * radius * k;
  let min = Math.min(w, t); // 两侧竖边、平顶
  for (let i = 0; i <= 64; i++) {
    const [x, y] = cubic([w, y1], [w, y1 + (b - y1) * 0.5], [w * 0.45, b + (y1 - b) * 0.12], [0, b], i / 64);
    min = Math.min(min, Math.hypot(x, y));
  }
  return min;
}

export function innerRadiusOf(shape, inset = 0) {
  switch (shape.type) {
    case 'circle':
      return (shape.radius ?? 1) - inset;
    case 'polygon':
      // 圆角只削掉顶点，不影响边到中心的距离
      return (shape.radius ?? 1) * Math.cos(Math.PI / (shape.sides ?? 6)) - inset;
    case 'starburst':
      // 凹口的圆角让轮廓离中心更远，这里按尖凹口算，偏保守
      return (shape.innerRadius ?? 0.72) - inset;
    case 'gear':
      return (shape.rootRadius ?? 0.84) - inset;
    case 'flower': {
      const R = shape.radius ?? 1;
      const c = R * (1 - (shape.petal ?? 0.44));
      const p = R * (shape.petal ?? 0.44) - inset;
      const f = R * (shape.valley ?? 0.08) + inset;
      const h = Math.PI / (shape.petals ?? 5);
      const d = c * Math.cos(h) + Math.sqrt(Math.max(0, (p + f) ** 2 - (c * Math.sin(h)) ** 2));
      return d - f; // 凹口圆角最靠里的一点
    }
    case 'shield':
      return shieldInner(shape, inset);
    default:
      throw new Error(`innerRadiusOf：不认识的外形 ${shape.type}`);
  }
}
