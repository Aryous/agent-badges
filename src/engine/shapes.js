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

/**
 * 花形：n 片圆形花瓣围成一圈（如五瓣梅花）。
 * radius 为外接半径；petal 为花瓣半径占外接半径的比例；
 * valley 为凹口圆角半径（占外接半径的比例），凹口是一段内凹的圆弧，不出现尖角。
 * 内缩时花瓣半径减小、凹口圆角同步变大，是准确的等距内缩。
 */
function flower({ petals = 5, radius = 1, petal = 0.44, valley = 0.08, rotation = Math.PI / 2 }, inset) {
  const c = radius * (1 - petal); // 花瓣圆心到中心的距离
  const p = radius * petal - inset;
  const f = radius * valley + inset;
  const h = Math.PI / petals;
  // 凹口圆角的圆心：在两片花瓣的角平分线上，与两片花瓣外切
  const d = c * Math.cos(h) + Math.sqrt(Math.max(0, (p + f) ** 2 - (c * Math.sin(h)) ** 2));
  const petalAt = (i) => {
    const t = rotation + i * 2 * h;
    return [Math.cos(t) * c, Math.sin(t) * c];
  };
  const filletAt = (i) => {
    const t = rotation + (2 * i + 1) * h;
    return [Math.cos(t) * d, Math.sin(t) * d];
  };
  const angle = (from, to) => Math.atan2(to[1] - from[1], to[0] - from[0]);
  const shape = new Shape();
  for (let i = 0; i < petals; i++) {
    const P = petalAt(i);
    const Fprev = filletAt(i - 1);
    const Fnext = filletAt(i);
    // 花瓣：从上一个凹口的切点逆时针走到下一个凹口的切点
    const a0 = angle(P, Fprev);
    let a1 = angle(P, Fnext);
    while (a1 <= a0) a1 += Math.PI * 2;
    shape.absarc(P[0], P[1], p, a0, a1, false);
    // 凹口：在圆角圆上顺时针走到下一片花瓣
    const Pn = petalAt(i + 1);
    const b0 = angle(Fnext, P);
    let b1 = angle(Fnext, Pn);
    while (b1 >= b0) b1 -= Math.PI * 2;
    shape.absarc(Fnext[0], Fnext[1], f, b0, b1, true);
  }
  shape.closePath();
  return shape;
}

const BUILDERS = { circle, polygon, starburst, shield, gear, flower };

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
  if (shapeCfg.type === 'flower') return 40;
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

/** 轮廓（内缩 inset 之后）到中心的最近距离：内容不能超过这个半径。沿轮廓均匀取点计算。 */
export function innerRadius(shapeCfg, inset = 0) {
  const pts = makeOutline(shapeCfg, inset).getSpacedPoints(720);
  return Math.min(...pts.map((p) => Math.hypot(p.x, p.y)));
}
