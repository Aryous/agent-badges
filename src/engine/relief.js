import { ExtrudeGeometry, Mesh, Shape } from 'three';
import { smoothBevels } from './normals.js';
import { pixelShapes } from './pixels.js';
import { arcTextGeometry, textGeometry } from './text.js';
import { BadgeUV } from './uv.js';
import { svgShapes } from './svgpath.js';

// 正面浮雕：用几何基元拼出图案和文字。
// 坐标与徽章轮廓同一套单位：中心为原点，外接半径约 1。
//
//   capsule   胶囊（两端圆头的粗线）
//   circle    圆片（也可用作中心圆盘）
//   ring      圆环（细线装饰、圆盘描边）
//   pixels    像素图（Claude Code 小怪物、像素数字）
//   rounded-rect  圆角正方形（App 图标面板）
//   text-arc  沿圆弧排布的立体文字
//   text      水平排布的立体文字（中心大数字）
//   gem       多面切割的宝石
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

/** 圆角正方形：half 为半边长，radius 为圆角半径。四条直边 + 四段圆弧，没有台阶。 */
function roundedRect({ center = [0, 0], half, radius }) {
  const [cx, cy] = center;
  const r = Math.min(radius, half);
  const k = half - r;
  const s = new Shape();
  s.moveTo(cx + k, cy - half);
  s.absarc(cx + k, cy - k, r, -Math.PI / 2, 0, false);
  s.absarc(cx + k, cy + k, r, 0, Math.PI / 2, false);
  s.absarc(cx - k, cy + k, r, Math.PI / 2, Math.PI, false);
  s.absarc(cx - k, cy - k, r, Math.PI, Math.PI * 1.5, false);
  s.closePath();
  return [s];
}

function pixels({ rows, cell, center = [0, 0] }) {
  return pixelShapes(rows, { cell, center });
}

/**
 * SVG 路径（evenodd）：d 以正方形 viewBox 描述（默认 24，y 轴向下）；
 * scale 为图案半宽（徽章单位），center 为图案中心。
 */
function path({ d, scale = 0.5, viewBox = 24, center = [0, 0], holesOnly = false }) {
  const shapes = svgShapes(d, { viewBox, scale, center, steps: 14 });
  // holesOnly：把镂空部分本身做成实心，用来往洞里垫一层嵌片
  return holesOnly ? shapes.flatMap((s) => s.holes.map((h) => new Shape(h.getPoints()))) : shapes;
}

const PRIMITIVES = { capsule, circle, ring, pixels, path, 'rounded-rect': roundedRect };

export function reliefShapes(item) {
  const make = PRIMITIVES[item.kind];
  if (!make) throw new Error(`未知浮雕类型：${item.kind}`);
  return make(item);
}

/** 浮雕几何体：底面在 z=0，向 +z 凸起 height。 */
export function reliefGeometry(item) {
  const height = item.height ?? 0.04;
  if (item.kind === 'text-arc') {
    return smoothBevels(arcTextGeometry({ ...item, height }), Math.PI / 5);
  }
  if (item.kind === 'text') {
    return smoothBevels(textGeometry({ ...item, height }), Math.PI / 5);
  }
  if (item.kind === 'gem') {
    // 八边形台面 + 一圈单段倒角 = 切割宝石的冠部刻面；不平滑法线，保留刻面的硬光
    const { center = [0, 0], radius, sides = 8 } = item;
    const s = new Shape();
    for (let i = 0; i < sides; i++) {
      const t = Math.PI / 2 + (i / sides) * Math.PI * 2;
      const fn = i === 0 ? 'moveTo' : 'lineTo';
      s[fn](center[0] + Math.cos(t) * radius, center[1] + Math.sin(t) * radius);
    }
    s.closePath();
    const geo = new ExtrudeGeometry(s, {
      depth: height * 0.3,
      bevelEnabled: true,
      bevelThickness: height * 0.35,
      bevelSize: radius * 0.38,
      bevelOffset: -radius * 0.38,
      bevelSegments: 1,
      UVGenerator: BadgeUV,
    });
    geo.translate(0, 0, height * 0.35);
    return geo;
  }
  const bevel = Math.min(height * 0.45, item.bevel ?? 0.014);
  const raw = new ExtrudeGeometry(reliefShapes(item), {
    depth: Math.max(0.001, height - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8,
    bevelSegments: 4,
    curveSegments: 30,
    UVGenerator: BadgeUV,
  });
  // 平滑倒角上的逐面法线，顶面保持纯平
  const geo = smoothBevels(raw, Math.PI / 6);
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
