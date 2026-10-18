import { ExtrudeGeometry, Mesh, Shape } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { pixelShapes } from './pixels.js';
import { arcTextGeometry } from './text.js';
import { BadgeUV } from './uv.js';

// 正面浮雕：用几何基元拼出图案和文字。
// 坐标与徽章轮廓同一套单位：中心为原点，外接半径约 1。
//
//   capsule   胶囊（两端圆头的粗线）
//   circle    圆片（也可用作中心圆盘）
//   ring      圆环（细线装饰、圆盘描边）
//   pixels    像素图（Claude Code 小怪物、像素数字）
//   text-arc  沿圆弧排布的立体文字
//   path      SVG 路径
//
// 每个基元都可以带 z：在正面板之上再抬高多少（用于叠在圆盘上的图案）。

function capsule({ from, to, width }) {
  const [ax, ay] = from;
  const [bx, by] = to;
  const r = width / 2;
  const t = Math.atan2(by - ay, bx - ax);
  const s = new Shape();
  s.absarc(bx, by, r, t - Math.PI / 2, t + Math.PI / 2, false);
  s.absarc(ax, ay, r, t + Math.PI / 2, t + Math.PI * 1.5, false);
  s.closePath();
  return [s];
}

function circle({ center = [0, 0], radius }) {
  const s = new Shape();
  s.absarc(center[0], center[1], radius, 0, Math.PI * 2, false);
  return [s];
}

function ring({ center = [0, 0], radius, width }) {
  const outer = new Shape();
  outer.absarc(center[0], center[1], radius + width / 2, 0, Math.PI * 2, false);
  const hole = new Shape();
  hole.absarc(center[0], center[1], radius - width / 2, 0, Math.PI * 2, true);
  outer.holes.push(hole);
  return [outer];
}

function pixels({ rows, cell, center = [0, 0] }) {
  return pixelShapes(rows, { cell, center });
}

/** SVG 路径：d 以 viewBox（默认 100×100）描述，y 轴向下；scale 为图案半宽。 */
function path({ d, scale = 1, viewBox = 100, center = [0, 0] }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}"><path d="${d}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const half = viewBox / 2;
  const k = scale / half;
  const map = (pts) => pts.map((p) => p.set(center[0] + (p.x - half) * k, center[1] + (half - p.y) * k));
  return shapes.map((sh) => {
    const out = new Shape(map(sh.getPoints(12)));
    out.holes = sh.holes.map((h) => new Shape(map(h.getPoints(12))));
    return out;
  });
}

const PRIMITIVES = { capsule, circle, ring, pixels, path };

export function reliefShapes(item) {
  const make = PRIMITIVES[item.kind];
  if (!make) throw new Error(`未知浮雕类型：${item.kind}`);
  return make(item);
}

/** 浮雕几何体：底面在 z=0，向 +z 凸起 height。 */
export function reliefGeometry(item) {
  const height = item.height ?? 0.04;
  if (item.kind === 'text-arc') {
    return toCreasedNormals(arcTextGeometry({ ...item, height }), Math.PI / 5);
  }
  const bevel = Math.min(height * 0.45, item.bevel ?? 0.014);
  const raw = new ExtrudeGeometry(reliefShapes(item), {
    depth: Math.max(0.001, height - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8,
    bevelSegments: 4,
    curveSegments: 24,
    UVGenerator: BadgeUV,
  });
  // 平滑倒角上的逐面法线，保留顶面与侧面之间的硬边
  const geo = toCreasedNormals(raw, Math.PI / 6);
  raw.dispose();
  // ExtrudeGeometry 的 z 范围是 [-bevel, depth + bevel]，把底部对齐到 0
  geo.translate(0, 0, bevel);
  return geo;
}

/** 生成浮雕 Mesh，底面放在 baseZ + item.z。 */
export function buildRelief(item, material, baseZ) {
  const geo = reliefGeometry(item);
  geo.translate(0, 0, baseZ + (item.z ?? 0));
  const mesh = new Mesh(geo, material);
  if (item.effect === 'pulse') mesh.userData.pulse = true;
  return mesh;
}
