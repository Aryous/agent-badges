// 分享海报的绘制小工具（2D Canvas）。颜色取珐琅板的 PLATE，和主页热力图一致；
// 字体是主页的 Outfit，只加载了 500 和 700 两个字重。版面数字在 poster-layout.js。
import { PLATE, enamelColor } from './heatmap.js';
import { formatCount } from '../data/format.js';
import { lang, t } from './i18n.js';
import { WD, heatStep } from './poster-layout.js';

export const PAGE_BG = '#141312'; // 主页底色（tokens.css 的 --bg）
const FONT = `Outfit, -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif`;
export const F = (weight, size) => `${weight} ${size}px ${FONT}`;

/** 英文的小标签用大写，中文不变。 */
export const caps = (s) => (lang === 'zh' ? s : s.toUpperCase());
/** 小标签的字距：中文 2px，英文随字号。 */
export const trackOf = (size) => (lang === 'zh' ? 2 : size * 0.17);

/** canvas 不会等字体：画之前把两个字重载好，否则会悄悄换成系统字体。 */
export const loadPosterFonts = () => Promise.all([500, 700].map((w) => document.fonts.load(F(w, 40)))).then(() => document.fonts.ready);

// ---------- 基本图形 ----------

export function text(g, str, x, y, { font, color, align = 'left', track = 0, base = 'alphabetic' }) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = base;
  g.letterSpacing = `${track}px`;
  // letterSpacing 会在末尾多留一格：居中、右对齐时补回去
  const fix = align === 'center' ? track / 2 : align === 'right' ? track : 0;
  g.fillText(str, x + fix, y);
  g.letterSpacing = '0px';
}

export function widthOf(g, str, font, track = 0) {
  g.font = font;
  g.letterSpacing = `${track}px`;
  const w = g.measureText(str).width - track;
  g.letterSpacing = '0px';
  return w;
}

/** 放不下就把字号往下减，最小 min。返回用的字号。 */
export function fitSize(g, str, weight, size, maxW, min = 24) {
  let s = size;
  while (s > min && widthOf(g, str, F(weight, s)) > maxW) s -= 2;
  return s;
}

function circle(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
}

function fillCircle(g, x, y, r, color) {
  circle(g, x, y, r);
  g.fillStyle = color;
  g.fill();
}

/** 四角星（页面上的 ✦ 标记）。 */
export function star(g, x, y, R, color) {
  const r = R * 0.22;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 ? r : R;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

/** 板上的分隔细线。 */
export function rule(g, x, y, w) {
  g.fillStyle = PLATE.frameInner;
  g.fillRect(x, y, w, 1);
}

// ---------- 珐琅板 ----------

/** 珐琅板的底：午夜蓝、极淡的同心细纹、锡色双线框。 */
export function plateBackground(g, x, y, w, h, { radius = 34 } = {}) {
  g.beginPath();
  g.roundRect(x, y, w, h, radius);
  g.fillStyle = PLATE.plate;
  g.fill();
  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, radius);
  g.clip();
  g.strokeStyle = 'rgba(255, 255, 255, 0.022)';
  g.lineWidth = 1;
  const ox = x + w / 2;
  const oy = y - h * 0.4;
  const far = Math.hypot(w / 2, h * 1.4);
  for (let rr = 4; rr < far; rr += 4) {
    circle(g, ox, oy, rr);
    g.stroke();
  }
  g.restore();
  g.lineWidth = 1;
  g.strokeStyle = PLATE.frame;
  g.beginPath();
  g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, radius);
  g.stroke();
  g.strokeStyle = PLATE.frameInner;
  g.beginPath();
  g.roundRect(x + 6.5, y + 6.5, w - 13, h - 13, radius - 6);
  g.stroke();
}

/**
 * 一颗圆点（主页 heatmap.css 的画法）。k：相对主页 11px 圆点的倍数，阴影和金边按它缩放。
 * cell：yearCells 的格子；null 是年初年末的占位格。
 */
function dot(g, cx, cy, r, cell, k) {
  if (!cell || cell.future) {
    g.lineWidth = k;
    g.strokeStyle = PLATE.outline;
    circle(g, cx, cy, r - k / 2);
    g.stroke();
    return;
  }
  if (!cell.parts.length) {
    // 凹点：下缘一道很淡的高光，顶部向内的暗影
    fillCircle(g, cx, cy + k, r, 'rgba(255, 255, 255, 0.05)');
    fillCircle(g, cx, cy, r, PLATE.sunk);
    g.save();
    circle(g, cx, cy, r);
    g.clip();
    const sh = g.createLinearGradient(0, cy - r, 0, cy + r);
    sh.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    sh.addColorStop(0.32, 'rgba(0, 0, 0, 0)');
    g.fillStyle = sh;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  } else {
    // 凸起的珐琅：底下一点投影，左右两半各填一个工具的颜色，顶部高光、底部暗边
    fillCircle(g, cx, cy + k, r, 'rgba(0, 0, 0, 0.4)');
    const [a, b] = cell.parts.map((p) => enamelColor(p.color, p.level));
    g.save();
    circle(g, cx, cy, r);
    g.clip();
    g.fillStyle = a;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (b) {
      g.fillStyle = b;
      g.fillRect(cx, cy - r, r, r * 2);
    }
    const hl = g.createLinearGradient(0, cy - r, 0, cy + r);
    hl.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    hl.addColorStop(0.16, 'rgba(255, 255, 255, 0)');
    hl.addColorStop(0.78, 'rgba(0, 0, 0, 0)');
    hl.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    g.fillStyle = hl;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  }
  if (cell.unlocked) {
    g.lineWidth = k;
    g.strokeStyle = PLATE.ring;
    circle(g, cx, cy, r + k * 1.5);
    g.stroke();
  }
}

/** 月份 + 星期 + 点阵。cal 是 yearCells 的结果。 */
export function heatGrid(g, cal, { x, y, w }) {
  const step = heatStep(cal.weeks.length, w);
  const gx = x + WD;
  const r = (step * 0.74) / 2;
  const k = (r * 2) / 11;
  const months = t('months');
  for (const { month, col } of cal.monthStarts) {
    text(g, caps(months[month]), gx + col * step + step * 0.13, y + 13, { font: F(500, 13), color: PLATE.month, track: lang === 'zh' ? 1 : 2.2 });
  }
  const top = y + 28;
  const wd = t('weekdays');
  for (let i = 0; i < 7; i++) {
    const day = (cal.weekStart + i) % 7;
    if ([1, 3, 5].includes(day)) text(g, caps(wd[day]), x, top + i * step + step / 2, { font: F(500, 12), color: PLATE.dim, track: 1.2, base: 'middle' });
  }
  cal.weeks.forEach((col, c) => col.forEach((cell, i) => dot(g, gx + c * step + step / 2, top + i * step + step / 2, r, cell, k)));
}

/** 图例：每个工具的名字和四级色阶；两个工具时加「同一天都用」；右边「解锁徽章」金边。 */
export function legend(g, series, { x, y, w }) {
  const r = 6.5;
  const k = (r * 2) / 11;
  const cy = y + 9;
  let cx = x;
  for (const s of series) {
    text(g, s.name, cx, cy, { font: F(500, 15), color: PLATE.name, base: 'middle' });
    cx += widthOf(g, s.name, F(500, 15)) + 12;
    for (let l = 1; l <= 4; l++) {
      dot(g, cx + r, cy, r, { future: false, unlocked: false, parts: [{ color: s.color, level: l }] }, k);
      cx += r * 2 + 5;
    }
    cx += 22;
  }
  if (series.length > 1) {
    dot(g, cx + r, cy, r, { future: false, unlocked: false, parts: series.slice(0, 2).map((s) => ({ color: s.color, level: 4 })) }, k);
    text(g, t('heat.both'), cx + r * 2 + 10, cy, { font: F(500, 15), color: PLATE.dim, base: 'middle' });
  }
  const label = t('heat.unlock');
  const lw = widthOf(g, label, F(500, 15));
  text(g, label, x + w, cy, { font: F(500, 15), color: PLATE.dim, align: 'right', base: 'middle' });
  g.lineWidth = 1.4;
  g.strokeStyle = PLATE.ring;
  circle(g, x + w - lw - 18, cy, r + 1);
  g.stroke();
}

/** 这一年的统计行（和主页热力图同一句话），数字加粗提亮。 */
export function summary(g, st, { x, y }) {
  const wrap = (v) => `\u0001${v}\u0002`;
  const s = caps(t('heat.summary', { tokens: wrap(formatCount(st.tokens)), days: wrap(st.activeDays), streak: wrap(st.longestStreak) }));
  const track = lang === 'zh' ? 1.5 : 2.2;
  let cx = x;
  for (const part of s.split(/(\u0001[^\u0002]*\u0002)/).filter(Boolean)) {
    const bold = part[0] === '\u0001';
    const str = bold ? part.slice(1, -1) : part;
    const font = F(bold ? 700 : 500, 15);
    text(g, str, cx, y, { font, color: bold ? PLATE.ink : PLATE.sub, track });
    cx += widthOf(g, str, font, track) + track;
  }
}

// ---------- 头像、铸币、数字、徽章墙、页脚 ----------

/**
 * 头像：就是一张圆形头像，不做成金属徽章。
 * 有图（用户同意后取的 GitHub 头像）就裁成圆；没有就画通用的人像轮廓（头和肩）。外面一圈细边。
 */
export function avatar(g, cx, cy, r, img) {
  g.save();
  circle(g, cx, cy, r);
  g.clip();
  if (img) {
    g.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    g.fillStyle = '#1d2a5c';
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.fillStyle = 'rgba(154, 163, 196, 0.55)';
    circle(g, cx, cy - r * 0.2, r * 0.34);
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy + r * 0.86, r * 0.66, r * 0.56, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.lineWidth = 1.5;
  g.strokeStyle = PLATE.frame;
  circle(g, cx, cy, r + 0.75);
  g.stroke();
}

/** 全解锁铸币（3D 截图），下面一团很软的影子（整张海报只有两三处，shadowBlur 可以用）。 */
export function coin(g, img, cx, cy, size) {
  if (!img) return;
  g.save();
  g.shadowColor = 'rgba(0, 0, 0, 0.55)';
  g.shadowBlur = size * 0.08;
  g.shadowOffsetY = size * 0.04;
  g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  g.restore();
}

/** 累计的三个数字：小标签在上，数字在下。align: left 每列左对齐；center 每列居中，列间一道竖线。 */
export function stats(g, all, { x, y, w, align = 'left', size = 42, labelSize = 15 }) {
  const cols = [
    [t('profile.tokens'), formatCount(all.tokens)],
    [t('profile.activeDays'), String(all.activeDays)],
    [t('profile.streak'), t('profile.days', { n: all.longestStreak })],
  ];
  const cw = w / 3;
  cols.forEach(([label, value], i) => {
    const cx = align === 'center' ? x + cw * i + cw / 2 : x + cw * i;
    text(g, caps(label), cx, y + 16, { font: F(500, labelSize), color: PLATE.sub, track: trackOf(labelSize), align });
    text(g, value, cx, y + 34 + size * 0.86, { font: F(700, size), color: PLATE.ink, align });
    if (align === 'center' && i) {
      g.fillStyle = PLATE.frameInner;
      g.fillRect(x + cw * i, y + 4, 1, size + 30);
    }
  });
}

/** 徽章墙：未解锁的压暗；最后一行不满时居中。items: { state, img }。 */
export function badgeGrid(g, items, { x, y, w, cols, fill = 0.9, lockedAlpha = 0.42 }) {
  const cell = w / cols;
  const rows = Math.ceil(items.length / cols);
  items.forEach((it, i) => {
    if (!it.img) return;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = row === rows - 1 ? items.length - row * cols : cols;
    const off = ((cols - inRow) * cell) / 2;
    const s = cell * fill;
    g.globalAlpha = it.state?.unlocked ? 1 : lockedAlpha;
    g.drawImage(it.img, x + off + col * cell + (cell - s) / 2, y + row * cell + (cell - s) / 2, s, s);
  });
  g.globalAlpha = 1;
}

/** 页脚：左边金色四角星和 agent-badges，右边一句「用 npx agent-badges 生成你的徽章墙」。 */
export function footer(g, y, { x, w }) {
  star(g, x + 9, y - 7, 9, PLATE.ring);
  text(g, 'agent-badges', x + 28, y, { font: F(700, 21), color: PLATE.ink });
  text(g, t('poster.footer'), x + w, y, { font: F(500, 18), color: PLATE.dim, align: 'right' });
}
