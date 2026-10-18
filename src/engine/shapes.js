import { Shape, Vector2 } from 'three';

// 所有轮廓以原点为中心，外接半径约为 1 个单位。

/**
 * 按顶点列表生成圆角多边形。radii 可以是统一数值，也可以是逐顶点数组。
 */
export function roundedPolygon(vertices, radii) {
  const n = vertices.length;
  const shape = new Shape();
  const r = (i) => (Array.isArray(radii) ? radii[i] : radii) || 0;

  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    const prev = vertices[(i - 1 + n) % n];
    const next = vertices[(i + 1) % n];
    const toPrev = prev.clone().sub(v);
    const toNext = next.clone().sub(v);
    // 圆角不能超过相邻边长的一半，否则会自交
    const rr = Math.min(r(i), toPrev.length() / 2, toNext.length() / 2);
    const a = v.clone().add(toPrev.normalize().multiplyScalar(rr));
    const b = v.clone().add(toNext.normalize().multiplyScalar(rr));
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    if (rr > 0) shape.quadraticCurveTo(v.x, v.y, b.x, b.y);
  }
  shape.closePath();
  return shape;
}

function circle({ radius = 1 }, inset) {
  const shape = new Shape();
  shape.absarc(0, 0, radius - inset, 0, Math.PI * 2, false);
  return shape;
}

function polygon({ sides = 6, radius = 1, cornerRadius = 0.12, rotation = Math.PI / 2 }, inset) {
  // 内缩距离是垂直于边的距离，换算成外接半径要除以 cos(π/n)
  const R = radius - inset / Math.cos(Math.PI / sides);
  const verts = [];
  for (let i = 0; i < sides; i++) {
    const t = rotation + (i / sides) * Math.PI * 2;
    verts.push(new Vector2(Math.cos(t) * R, Math.sin(t) * R));
  }
  return roundedPolygon(verts, Math.max(0, cornerRadius - inset * 0.5));
}

function starburst(
  { points = 12, radius = 1, innerRadius = 0.72, tipRoundness = 0.12, valleyRoundness = 0.05, rotation = Math.PI / 2 },
  inset,
) {
  const outer = radius - inset;
  const inner = innerRadius - inset;
  const verts = [];
  const radii = [];
  for (let i = 0; i < points * 2; i++) {
    const isTip = i % 2 === 0;
    const t = rotation + (i / (points * 2)) * Math.PI * 2;
    const R = isTip ? outer : inner;
    verts.push(new Vector2(Math.cos(t) * R, Math.sin(t) * R));
    radii.push(isTip ? tipRoundness : valleyRoundness);
  }
  return roundedPolygon(verts, radii);
}

/**
 * 盾牌：平顶圆角，两侧竖直，下半部收成尖底。
 * 内缩按比例缩放（盾牌近似凸形，效果接近等距内缩）。
 */
function shield({ radius = 1, width = 0.86, top = 0.9, shoulder = 0.12, bottom = -1.02, cornerRadius = 0.14 }, inset) {
  const k = (radius - inset) / radius;
  const w = width * radius * k;
  const t = top * radius * k;
  const y1 = shoulder * radius * k;
  const b = bottom * radius * k;
  const r = cornerRadius * radius * k;
  const s = new Shape();
  s.moveTo(-w + r, t);
  s.lineTo(w - r, t);
  s.quadraticCurveTo(w, t, w, t - r);
  s.lineTo(w, y1);
  s.bezierCurveTo(w, y1 + (b - y1) * 0.5, w * 0.45, b + (y1 - b) * 0.12, 0, b);
  s.bezierCurveTo(-w * 0.45, b + (y1 - b) * 0.12, -w, y1 + (b - y1) * 0.5, -w, y1);
  s.lineTo(-w, t - r);
  s.quadraticCurveTo(-w, t, -w + r, t);
  return s;
}

/** 齿轮：梯形齿，齿根之间留一段圆弧。 */
function gear({ teeth = 12, radius = 1, rootRadius = 0.84, roundness = 0.025, rotation = Math.PI / 2 }, inset) {
  const R = radius - inset;
  const r = rootRadius - inset;
  const p = (Math.PI * 2) / teeth;
  const verts = [];
  const at = (rad, t) => new Vector2(Math.cos(t) * rad, Math.sin(t) * rad);
  for (let i = 0; i < teeth; i++) {
    const c = rotation + i * p;
    verts.push(at(r, c - p * 0.3), at(R, c - p * 0.19), at(R, c + p * 0.19), at(r, c + p * 0.3), at(r, c + p * 0.5));
  }
  return roundedPolygon(verts, Math.max(0.005, roundness - inset * 0.2));
}

const BUILDERS = { circle, polygon, starburst, shield, gear };

/**
 * 根据轮廓配置生成 Shape。inset 为向内收缩的距离，用于生成内层。
 */
export function makeOutline(shapeCfg, inset = 0) {
  const build = BUILDERS[shapeCfg.type];
  if (!build) throw new Error(`未知轮廓类型：${shapeCfg.type}`);
  return build(shapeCfg, inset);
}

/** 不同轮廓推荐的曲线细分数：圆形整条是一段弧，需要更多细分。 */
export function outlineSegments(shapeCfg) {
  if (shapeCfg.type === 'circle') return 64;
  if (shapeCfg.type === 'shield') return 24;
  return 10;
}

/**
 * 钱币边缘的竖纹（滚花）：一圈交替凸凹的细齿，套在外圈侧壁的中段。
 * 只用于圆形轮廓。
 */
export function reededOutline(radius, { count = 160, depth = 0.012 } = {}) {
  const verts = [];
  for (let i = 0; i < count * 2; i++) {
    const t = (i / (count * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? radius + depth * 0.4 : radius - depth * 0.6;
    verts.push(new Vector2(Math.cos(t) * rr, Math.sin(t) * rr));
  }
  return new Shape(verts);
}

/** 用另一条轮廓在 shape 上挖洞（返回新的 Shape）。 */
export function withHole(outer, hole, segments = 10) {
  const shape = new Shape(outer.getPoints(segments));
  shape.holes.push(new Shape(hole.getPoints(segments)));
  return shape;
}
