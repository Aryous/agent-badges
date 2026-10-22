// 分享海报：一张竖版 PNG，徽章墙 + 三个关键数字 + 当年热力图。
// 全部用 2D Canvas 画：徽章直接用陈列墙已经渲染好的缩略图，不再走 3D。
import { levelOf, levelThresholds, today, yearWeeks } from '../data/calendar.js';
import { t } from './i18n.js';
import { formatCount } from '../data/format.js';

const W = 1080;
const PAD = 72;
const SCALE = 2; // 输出 2160 像素宽
const SERIF = `'Iowan Old Style', 'Palatino Linotype', 'Songti SC', Georgia, serif`;
const SANS = `system-ui, -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif`;
const ALPHA = [0, 0.3, 0.5, 0.74, 1];

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** 徽章网格的列数：让行数尽量少、每枚又不至于太小。 */
const columnsFor = (n) => (n <= 12 ? 4 : 5);

/**
 * @param {object} o
 * @param {object} o.brand
 * @param {{ config, state, thumb }[]} o.items   thumb 是缩略图 data URL
 * @param {{ tokens, activeDays, longestStreak }} o.stats
 * @param {{ year: number, series: { id, color, daily }[], markers: object }} o.heat
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderPoster({ brand, items, stats, heat }) {
  const cols = columnsFor(items.length);
  const rows = Math.ceil(items.length / cols);
  const cell = (W - PAD * 2) / cols;
  const gridTop = 300;
  const gridH = rows * cell;
  const statsTop = gridTop + gridH + 40;
  const heatTop = statsTop + 150;
  const { weeks } = yearWeeks(heat.year, 1);
  const step = (W - PAD * 2) / weeks.length;
  const heatH = step * 7;
  const H = Math.round(heatTop + 48 + heatH + 120);

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const g = canvas.getContext('2d');
  g.scale(SCALE, SCALE);
  const accent = brand.ui.accent;

  // 背景：墨色 + 顶部一团品牌色光晕
  g.fillStyle = brand.palette.background;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 120, 0, W / 2, 120, W * 0.9);
  glow.addColorStop(0, rgba(accent, 0.22));
  glow.addColorStop(1, rgba(accent, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // 标题
  const unlocked = items.filter((it) => it.state.unlocked).length;
  g.fillStyle = '#F0EEE6';
  g.textBaseline = 'alphabetic';
  g.font = `500 68px ${SERIF}`;
  g.fillText(brand.name, PAD, 150);
  g.fillStyle = '#8F8B82';
  g.font = `400 26px ${SANS}`;
  g.fillText(t('poster.badges', { n: unlocked, total: items.length }), PAD, 200);

  // 右上角：解锁进度环
  const cx = W - PAD - 70;
  const cy = 140;
  g.lineWidth = 14;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(240, 238, 230, 0.1)';
  g.beginPath();
  g.arc(cx, cy, 64, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = accent;
  g.beginPath();
  g.arc(cx, cy, 64, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (unlocked / Math.max(1, items.length)));
  g.stroke();
  g.fillStyle = '#F0EEE6';
  g.textAlign = 'center';
  g.font = `600 40px ${SANS}`;
  g.fillText(String(unlocked), cx, cy + 8);
  g.fillStyle = '#8F8B82';
  g.font = `400 18px ${SANS}`;
  g.fillText(`/ ${items.length}`, cx, cy + 34);
  g.textAlign = 'left';

  // 徽章网格：未解锁的压暗
  const images = await Promise.all(items.map((it) => (it.thumb ? loadImage(it.thumb) : null)));
  items.forEach((it, i) => {
    const img = images[i];
    if (!img) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    // 最后一行不满时居中
    const inRow = row === rows - 1 ? items.length - row * cols : cols;
    const offset = ((cols - inRow) * cell) / 2;
    const size = cell * 0.9;
    const x = PAD + offset + col * cell + (cell - size) / 2;
    const y = gridTop + row * cell + (cell - size) / 2;
    g.globalAlpha = it.state.unlocked ? 1 : 0.32;
    g.drawImage(img, x, y, size, size);
  });
  g.globalAlpha = 1;

  // 三个数字
  const facts = [
    [formatCount(stats.tokens), t('profile.tokens')],
    [String(stats.activeDays), t('profile.activeDays')],
    [t('profile.days', { n: stats.longestStreak }), t('profile.streak')],
  ];
  g.strokeStyle = 'rgba(240, 238, 230, 0.12)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(PAD, statsTop);
  g.lineTo(W - PAD, statsTop);
  g.stroke();
  const colW = (W - PAD * 2) / 3;
  facts.forEach(([value, label], i) => {
    const x = PAD + i * colW;
    g.fillStyle = '#F0EEE6';
    g.font = `600 46px ${SANS}`;
    g.fillText(value, x, statsTop + 76);
    g.fillStyle = '#8F8B82';
    g.font = `400 22px ${SANS}`;
    g.fillText(label, x, statsTop + 112);
  });

  // 当年热力图
  g.fillStyle = '#8F8B82';
  g.font = `500 22px ${SANS}`;
  g.fillText(`${heat.year}`, PAD, heatTop + 24);
  const th = Object.fromEntries(heat.series.map((s) => [s.id, levelThresholds(s.daily)]));
  const now = today();
  const size = step * 0.8;
  const top = heatTop + 48;
  weeks.forEach((col, c) => {
    col.forEach((date, r) => {
      if (!date) return;
      const x = PAD + c * step;
      const y = top + r * step;
      if (date > now) {
        // 今年还没到的日子：只留一个很淡的格子，让一整年的形状完整
        roundRect(g, x, y, size, size, 2.5);
        g.fillStyle = 'rgba(240, 238, 230, 0.025)';
        g.fill();
        return;
      }
      const parts = heat.series
        .map((s) => ({ color: s.color, level: levelOf(s.daily?.[date], th[s.id]) }))
        .filter((p) => p.level);
      roundRect(g, x, y, size, size, 2.5);
      g.save();
      g.clip();
      if (!parts.length) {
        g.fillStyle = 'rgba(240, 238, 230, 0.06)';
        g.fillRect(x, y, size, size);
      } else {
        g.fillStyle = rgba(parts[0].color, ALPHA[parts[0].level]);
        g.fillRect(x, y, size, size);
        if (parts[1]) {
          // 两个工具同一天都用了：右下半边换成第二个颜色
          g.fillStyle = rgba(parts[1].color, ALPHA[parts[1].level]);
          g.beginPath();
          g.moveTo(x + size, y);
          g.lineTo(x + size, y + size);
          g.lineTo(x, y + size);
          g.closePath();
          g.fill();
        }
      }
      g.restore();
      if (heat.markers[date]?.length) {
        g.fillStyle = '#F7F6F2';
        g.beginPath();
        g.arc(x + size / 2, y + size / 2, size * 0.17, 0, Math.PI * 2);
        g.fill();
      }
    });
  });

  // 页脚
  g.fillStyle = '#5D5A54';
  g.font = `400 20px ${SANS}`;
  g.fillText(t('poster.footer'), PAD, H - 56);
  g.textAlign = 'right';
  g.font = `600 20px ${SANS}`;
  g.fillStyle = '#8F8B82';
  g.fillText('agent-badges', W - PAD, H - 56);
  g.textAlign = 'left';
  return canvas;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
