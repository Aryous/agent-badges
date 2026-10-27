// 分享海报：一张竖版 PNG，整张是一块午夜蓝珐琅板，和主页热力图同一套颜色和画法。
// 单个工具：板头（头像、名字、年份）、点阵、铸币和累计数字、徽章墙。
// 两个工具：板头和点阵之后左右分栏，每栏一个工具（铸币、数字、它自己的徽章墙）。
// 全部用 2D Canvas：徽章和铸币用已经截好的图，不再走 3D。版面数字在 poster-layout.js，绘制在 poster-draw.js。
import { t } from './i18n.js';
import { PLATE } from './heatmap.js';
import { DUO_L, IW, IX, MARGIN, SCALE, SINGLE, W, duoLayout, singleLayout } from './poster-layout.js';
import { F, PAGE_BG, avatar, badgeGrid, caps, coin, fitSize, footer, heatGrid, legend, plateBackground, rule, stats, summary, text, trackOf } from './poster-draw.js';

const unlockedOf = (tool) => tool.items.filter((it) => it.state?.unlocked).length;
const badgeCount = (n, total) => t('poster.badges', { n, total });

/** 名字一行：有身份（用户同意后的 GitHub 登录名）就写 @登录名，否则写工具名。副标题是工具名和徽章数。 */
function names(tools, identity) {
  const n = tools.reduce((s, x) => s + unlockedOf(x), 0);
  const total = tools.reduce((s, x) => s + x.items.length, 0);
  const tool = tools.map((x) => x.brand.name).join(' + ');
  const count = badgeCount(n, total);
  return identity ? { title: `@${identity.login}`, sub: `${tool} · ${count}` } : { title: tool, sub: count };
}

function drawHead(g, L, tools, heat, identity) {
  const ar = 52;
  avatar(g, IX + ar, L.head + ar, ar, identity?.avatar ?? null);
  const { title, sub } = names(tools, identity);
  const nx = IX + ar * 2 + 30;
  // 右边留给大号年份；名字太长就缩小字号
  const size = fitSize(g, title, 700, 40, W - IX - 280 - nx);
  text(g, title, nx, L.head + 48, { font: F(700, size), color: PLATE.ink });
  text(g, sub, nx, L.head + 84, { font: F(500, 19), color: PLATE.sub });
  text(g, caps(t('poster.year')), W - IX, L.head + 14, { font: F(500, 14), color: PLATE.month, align: 'right', track: 3 });
  text(g, String(heat.year), W - IX, L.head + 86, { font: F(700, 72), color: PLATE.ink, align: 'right', track: 1 });
  summary(g, heat.yearStats, { x: IX, y: L.summary });
  heatGrid(g, heat.cal, { x: IX, y: L.heat, w: IW });
  legend(g, heat.series, { x: IX, y: L.legend, w: IW });
  rule(g, IX, L.rule, IW);
}

function drawSingle(g, L, tool) {
  const s = SINGLE.coin;
  coin(g, tool.coin, IX + s / 2, L.mid + s / 2, s);
  const sx = IX + s + 56;
  text(g, caps(t('poster.allTime', { badges: badgeCount(unlockedOf(tool), tool.items.length) })), sx, L.mid + 74, { font: F(500, 15), color: PLATE.month, track: trackOf(15) });
  stats(g, tool.all, { x: sx, y: L.mid + 112, w: W - IX - sx, size: 42 });
  rule(g, IX, L.rule2, IW);
  badgeGrid(g, tool.items, { x: IX, y: L.grid, w: IW, cols: SINGLE.cols });
}

/** 一栏的小卡：铸币、工具名、徽章数、三个数字，全部居中。 */
function toolCard(g, x, y, w, tool) {
  const s = DUO_L.coin;
  coin(g, tool.coin, x + w / 2, y + s / 2, s);
  let cy = y + s + 44;
  text(g, tool.brand.name, x + w / 2, cy, { font: F(700, 28), color: PLATE.ink, align: 'center' });
  cy += 32;
  text(g, badgeCount(unlockedOf(tool), tool.items.length), x + w / 2, cy, { font: F(500, 18), color: PLATE.sub, align: 'center' });
  cy += 30;
  stats(g, tool.all, { x, y: cy, w, align: 'center', size: DUO_L.value, labelSize: 13 });
}

function drawDuo(g, L, tools) {
  tools.forEach((tool, i) => {
    const x = IX + i * (L.cw + DUO_L.gap);
    toolCard(g, x, L.top, L.cw, tool);
    badgeGrid(g, tool.items, { x, y: L.grid, w: L.cw, cols: DUO_L.cols });
  });
  // 两栏中间一道竖细线
  g.fillStyle = PLATE.frameInner;
  g.fillRect(IX + L.cw + DUO_L.gap / 2, L.top + 10, 1, L.grid + L.gridH - L.top - 10);
}

/**
 * @param {object} o
 * @param {'single' | 'duo'} o.mode
 * @param {{ brand, coin: HTMLImageElement | null, items: { state, img: HTMLImageElement | null }[], all: { tokens, activeDays, longestStreak } }[]} o.tools
 *   单个工具时只有一个；两个工具时顺序同热力图（第一个在左）
 * @param {{ year: number, cal: object, series: { id, name, color }[], yearStats: { tokens, activeDays, longestStreak } }} o.heat
 *   cal 是 data/calendar.js 的 yearCells 结果
 * @param {{ login: string, avatar: HTMLImageElement | null } | null} o.identity
 * @returns {HTMLCanvasElement}
 */
export function renderPoster({ mode, tools, heat, identity }) {
  const weeks = heat.cal.weeks.length;
  const L = mode === 'duo' ? duoLayout({ weeks, counts: tools.map((x) => x.items.length) }) : singleLayout({ weeks, count: tools[0].items.length });
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = Math.round(L.H * SCALE);
  const g = canvas.getContext('2d');
  g.scale(SCALE, SCALE);
  g.fillStyle = PAGE_BG;
  g.fillRect(0, 0, W, L.H);
  plateBackground(g, MARGIN, MARGIN, W - MARGIN * 2, L.H - MARGIN * 2, { radius: 34 });
  drawHead(g, L, tools, heat, identity);
  if (mode === 'duo') drawDuo(g, L, tools);
  else drawSingle(g, L, tools[0]);
  footer(g, L.foot, { x: IX, w: IW });
  return canvas;
}
