import { ExtrudeGeometry, Mesh, Shape } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// 正面浮雕：用几个几何基元（胶囊、圆点、圆环、SVG 路径）拼出图标和数字。
// 坐标与徽章轮廓同一套单位：中心为原点，外接半径约 1。

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

/** SVG 路径：d 以 100×100 画布描述，(50, 50) 为中心，y 轴向下。 */
function path({ d, scale = 1 }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${d}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const k = scale / 50;
  return shapes.map((sh) => {
    const map = (pts) => pts.map((p) => p.set((p.x - 50) * k, (50 - p.y) * k));
    const out = new Shape(map(sh.getPoints(12)));
    out.holes = sh.holes.map((h) => new Shape(map(h.getPoints(12))));
    return out;
  });
}

const PRIMITIVES = { capsule, circle, ring, path };

export function reliefShapes(item) {
  const make = PRIMITIVES[item.kind];
  if (!make) throw new Error(`未知浮雕类型：${item.kind}`);
  return make(item);
}

/**
 * 生成一个浮雕 Mesh，底面放在 baseZ，向 +z 凸起 height。
 */
export function buildRelief(item, material, baseZ) {
  const height = item.height ?? 0.04;
  const bevel = Math.min(height * 0.45, item.bevel ?? 0.014);
  const geo = new ExtrudeGeometry(reliefShapes(item), {
    depth: Math.max(0.001, height - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8,
    bevelSegments: 4,
    curveSegments: 24,
  });
  // ExtrudeGeometry 的 z 范围是 [-bevel, depth + bevel]，把底部对齐到 baseZ
  geo.translate(0, 0, baseZ + bevel);
  const mesh = new Mesh(geo, material);
  mesh.castShadow = true;
  if (item.effect === 'pulse') mesh.userData.pulse = true;
  return mesh;
}
