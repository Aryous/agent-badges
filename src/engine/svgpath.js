import { Shape, ShapeUtils, Vector2 } from 'three';

// SVG 路径 → 轮廓。不依赖浏览器 DOM，Node 单元测试里也能用。
// 支持 M L H V C S Q T A Z（大小写都支持），按 evenodd 规则区分实心和镂空：
// 被奇数层包住的子路径是洞，偶数层是实心（与 SVG 的 fill-rule="evenodd" 一致）。

const CMD = /[MmLlHhVvCcSsQqTtAaZz]/;

/**
 * 逐字符扫描：数字可以紧挨着写（如 ".5.5"、"-1-2"），
 * 圆弧的两个标志位常与后面的数字连写（如 "0 00.107.029"），要按单个字符读。
 */
function scanner(d) {
  let p = 0;
  const skip = () => {
    while (p < d.length && /[\s,]/.test(d[p])) p++;
  };
  return {
    done() {
      skip();
      return p >= d.length;
    },
    peekCmd() {
      skip();
      return CMD.test(d[p] ?? '') ? d[p] : null;
    },
    cmd() {
      skip();
      return d[p++];
    },
    num() {
      skip();
      const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(d.slice(p));
      if (!m) throw new Error(`SVG 路径解析失败：位置 ${p}`);
      p += m[0].length;
      return parseFloat(m[0]);
    },
    flag() {
      skip();
      return d[p++] === '1';
    },
  };
}

/** 圆弧（端点参数）→ 采样点，按 SVG 规范 F.6.5 换算成圆心参数。 */
function arcPoints(x1, y1, rx, ry, phi, fa, fs, x2, y2, steps) {
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let k = Math.sqrt(Math.max(0, num / den));
  if (fa === fs) k = -k;
  const cxp = (k * rx * y1p) / ry;
  const cyp = (-k * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= Math.PI * 2;
  if (fs && dt < 0) dt += Math.PI * 2;
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = t1 + (dt * i) / steps;
    pts.push([cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos]);
  }
  return pts;
}

/**
 * 解析 path 的 d 属性，返回若干闭合子路径（每个是 [x, y] 点数组，SVG 坐标，y 轴向下）。
 * @param {number} steps 每段曲线的采样数
 */
export function parseSvgPath(d, steps = 12) {
  const sc = scanner(d);
  const subpaths = [];
  let cur = null;
  let x = 0, y = 0, sx = 0, sy = 0;
  let lastCtrl = null; // 上一段曲线的控制点（用于 S / T 的反射）
  let lastCmd = '';
  let cmd = '';
  const n = () => sc.num();
  const flag = () => sc.flag();
  const start = () => {
    cur = [[x, y]];
    subpaths.push(cur);
  };
  const line = (nx, ny) => {
    if (!cur) start();
    cur.push([nx, ny]);
    x = nx;
    y = ny;
  };

  while (!sc.done()) {
    if (sc.peekCmd()) cmd = sc.cmd();
    else if (!cmd) throw new Error('SVG 路径必须以命令开头');
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;

    switch (C) {
      case 'M': {
        x = ox + n();
        y = oy + n();
        sx = x;
        sy = y;
        start();
        // M 后面紧跟的坐标按 L 处理
        cmd = rel ? 'l' : 'L';
        lastCtrl = null;
        break;
      }
      case 'L':
        line(ox + n(), oy + n());
        lastCtrl = null;
        break;
      case 'H':
        line(ox + n(), y);
        lastCtrl = null;
        break;
      case 'V':
        line(x, oy + n());
        lastCtrl = null;
        break;
      case 'C':
      case 'S': {
        let c1x, c1y;
        if (C === 'C') {
          c1x = ox + n();
          c1y = oy + n();
        } else {
          const reflect = /[CcSs]/.test(lastCmd) && lastCtrl;
          c1x = reflect ? 2 * x - lastCtrl[0] : x;
          c1y = reflect ? 2 * y - lastCtrl[1] : y;
        }
        const c2x = ox + n(), c2y = oy + n(), ex = ox + n(), ey = oy + n();
        const x0 = x, y0 = y;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps, u = 1 - t;
          line(
            u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
            u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
          );
        }
        lastCtrl = [c2x, c2y];
        break;
      }
      case 'Q':
      case 'T': {
        let cx, cy;
        if (C === 'Q') {
          cx = ox + n();
          cy = oy + n();
        } else {
          const reflect = /[QqTt]/.test(lastCmd) && lastCtrl;
          cx = reflect ? 2 * x - lastCtrl[0] : x;
          cy = reflect ? 2 * y - lastCtrl[1] : y;
        }
        const ex = ox + n(), ey = oy + n();
        const x0 = x, y0 = y;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps, u = 1 - t;
          line(u * u * x0 + 2 * u * t * cx + t * t * ex, u * u * y0 + 2 * u * t * cy + t * t * ey);
        }
        lastCtrl = [cx, cy];
        break;
      }
      case 'A': {
        const rx = n(), ry = n(), rot = (n() * Math.PI) / 180;
        const fa = flag(), fs = flag();
        const ex = ox + n(), ey = oy + n();
        for (const [px, py] of arcPoints(x, y, rx, ry, rot, fa, fs, ex, ey, steps)) line(px, py);
        x = ex;
        y = ey;
        lastCtrl = null;
        break;
      }
      case 'Z':
        x = sx;
        y = sy;
        cur = null;
        lastCtrl = null;
        break;
      default:
        throw new Error(`不支持的 SVG 命令：${cmd}`);
    }
    lastCmd = cmd;
  }
  // 去掉闭合时与起点重复的终点、以及点数不足的子路径
  return subpaths
    .map((p) => {
      const [fx, fy] = p[0];
      const [lx, ly] = p[p.length - 1];
      return Math.hypot(fx - lx, fy - ly) < 1e-9 ? p.slice(0, -1) : p;
    })
    .filter((p) => p.length >= 3);
}

function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/**
 * SVG 路径 → three 的 Shape 数组（evenodd）。
 * @param {string} d
 * @param {object} opts
 * @param {number} opts.viewBox  正方形 viewBox 边长（默认 24）
 * @param {number} opts.scale    图案半宽（徽章单位）
 * @param {number[]} opts.center 图案中心
 */
export function svgShapes(d, { viewBox = 24, scale = 0.5, center = [0, 0], steps = 12 } = {}) {
  const half = viewBox / 2;
  const k = scale / half;
  const polys = parseSvgPath(d, steps).map((p) =>
    p.map(([px, py]) => new Vector2(center[0] + (px - half) * k, center[1] + (half - py) * k)),
  );
  // 嵌套深度：被几个其他子路径包住
  const depth = polys.map((p, i) => polys.reduce((n, q, j) => n + (i !== j && inside(p[0], q) ? 1 : 0), 0));
  const area = polys.map((p) => Math.abs(ShapeUtils.area(p)));
  const solids = [];
  polys.forEach((p, i) => {
    if (depth[i] % 2 === 0) solids.push({ i, shape: new Shape(p) });
  });
  polys.forEach((p, i) => {
    if (depth[i] % 2 === 0) return;
    // 洞归给「包住它的最小实心路径」
    const owner = solids
      .filter((s) => s.i !== i && inside(p[0], polys[s.i]))
      .sort((a, b) => area[a.i] - area[b.i])[0];
    owner?.shape.holes.push(new Shape(p));
  });
  return solids.map((s) => s.shape);
}
