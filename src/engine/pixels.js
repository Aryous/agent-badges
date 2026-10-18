import { Shape, ShapeUtils, Vector2 } from 'three';

// 像素图 → 轮廓。把字符画（'#' 为实心）的外轮廓和内洞描出来，
// 整体挤出成一块带倒角的浮雕，比逐格堆方块更干净，也没有接缝。

/**
 * @param {string[]} rows   每行一个字符串，'#' 为实心，其他字符为空
 * @param {object}   opts
 * @param {number}   opts.cell    每格边长（徽章单位）
 * @param {number[]} [opts.center=[0,0]]  图案中心
 * @returns {Shape[]}
 */
export function pixelShapes(rows, { cell, center = [0, 0] }) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const filled = (c, r) => r >= 0 && r < h && c >= 0 && c < w && rows[r][c] === '#';

  // 1. 收集边界上的有向边：实心格逆时针绕一圈，只保留与空格相邻的边。
  //    网格坐标：x 向右，y 向上，第 r 行的格子占 y ∈ [-r-1, -r]。
  const edges = new Map(); // key 为起点，值为若干终点
  const add = (x1, y1, x2, y2) => {
    const k = `${x1},${y1}`;
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push([x2, y2]);
  };
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!filled(c, r)) continue;
      const x = c;
      const y = -r;
      if (!filled(c, r + 1)) add(x, y - 1, x + 1, y - 1); // 下
      if (!filled(c + 1, r)) add(x + 1, y - 1, x + 1, y); // 右
      if (!filled(c, r - 1)) add(x + 1, y, x, y); // 上
      if (!filled(c - 1, r)) add(x, y, x, y - 1); // 左
    }
  }

  // 2. 把边串成闭合环。两个格子只在对角相接时，一个顶点会有两条出边，
  //    这时优先左转，保证每个环都不自交。
  const loops = [];
  const take = (k, prevDir) => {
    const outs = edges.get(k);
    if (!outs?.length) return null;
    let i = 0;
    if (outs.length > 1 && prevDir) {
      const [px, py] = k.split(',').map(Number);
      const cross = (o) => prevDir[0] * (o[1] - py) - prevDir[1] * (o[0] - px);
      i = outs.indexOf(outs.reduce((best, o) => (cross(o) > cross(best) ? o : best)));
    }
    const [next] = outs.splice(i, 1);
    if (!outs.length) edges.delete(k);
    return next;
  };
  while (edges.size) {
    const startKey = edges.keys().next().value;
    const start = startKey.split(',').map(Number);
    const loop = [start];
    let cur = start;
    let dir = null;
    for (let guard = 0; guard < 100000; guard++) {
      const next = take(`${cur[0]},${cur[1]}`, dir);
      if (!next) break;
      dir = [next[0] - cur[0], next[1] - cur[1]];
      if (next[0] === start[0] && next[1] === start[1]) break;
      loop.push(next);
      cur = next;
    }
    loops.push(simplify(loop));
  }

  // 3. 网格坐标 → 徽章坐标；逆时针的是外轮廓，顺时针的是洞
  const toWorld = ([gx, gy]) =>
    new Vector2(center[0] + (gx - w / 2) * cell, center[1] + (gy + h / 2) * cell);
  const outers = [];
  const holes = [];
  for (const loop of loops) {
    const pts = loop.map(toWorld);
    (ShapeUtils.area(pts) > 0 ? outers : holes).push(pts);
  }
  const shapes = outers.map((pts) => new Shape(pts));
  for (const hole of holes) {
    const probe = hole[0].clone().add(hole[1]).multiplyScalar(0.5);
    const owner = shapes.find((s) => pointInPolygon(probe, s.getPoints())) ?? shapes[0];
    owner?.holes.push(new Shape(hole));
  }
  return shapes;
}

/** 去掉共线的中间点。 */
function simplify(loop) {
  const n = loop.length;
  return loop.filter((p, i) => {
    const a = loop[(i - 1 + n) % n];
    const b = loop[(i + 1) % n];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
