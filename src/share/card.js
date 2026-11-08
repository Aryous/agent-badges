// GitHub 主页成就卡片：铸币、用量和最近 34 周的活动。仅使用汇总数据，输出独立 SVG。
import { brandById } from '../brands/index.js';
import { STAGE_METALS, litCount, stageOf } from '../brands/shared/completionist.js';
import { PLATE, enamelColor } from '../brands/shared/enamel.js';
import { addDays, localDate, weekday } from '../data/metrics-common.js';
import { dailyStats } from '../data/daily.js';
import { levelOf, levelThresholds } from '../data/calendar.js';
import { formatCount } from '../data/format.js';

const THEMES = {
  dark: { ground: '#141312', face: PLATE.plate, ink: PLATE.ink, sub: PLATE.sub, rule: '#465071', trim: PLATE.month },
  light: { ground: '#E7E3D9', face: '#F8F5ED', ink: PLATE.plate, sub: '#4D5874', rule: '#C9C4B6', trim: '#77603A' },
};
const LABELS = {
  en: { badges: 'badges', tokens: 'tokens', days: 'active days', streak: 'longest streak', weeks: 'Recent activity' },
  zh: { badges: '枚徽章', tokens: 'Token', days: '活跃天数', streak: '最长连续天数', weeks: '最近的活动' },
};
const WIDTH = 540;
const WEEKS = 34;
const escape = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const f = (n) => Number(n.toFixed(2));

// 币面复用 3D 铸币的品牌图案、点亮顺序和金属阶段；SVG 可在无浏览器的 CLI 环境中生成。
function coin(b, index, y) {
  const entry = brandById(b.id);
  const palette = entry?.brand.palette ?? {};
  const metal = b.total > 0 ? STAGE_METALS[stageOf(b.unlocked, b.total)] : STAGE_METALS[0];
  const rim = palette[metal] ?? '#A0988A';
  const tiles = entry?.completionist.tiles() ?? [];
  const lit = litCount(tiles.length, b.unlocked, b.total);
  const out = [`<g transform="translate(62 ${y})" aria-hidden="true">`,
    `<defs><linearGradient id="metal-${index}" x2="1" y2="1"><stop stop-color="#FBF2D8"/><stop offset=".28" stop-color="${rim}"/><stop offset=".52" stop-color="#615A55"/><stop offset=".76" stop-color="${rim}"/><stop offset="1" stop-color="#F5EBD4"/></linearGradient></defs>`,
    `<circle r="35" cy="1" fill="#0C1127"/><circle r="34.5" fill="url(#metal-${index})"/>`,
    `<circle r="32" fill="url(#coin-face)"/><circle r="30.7" fill="none" stroke="${rim}" stroke-width=".75"/>`,
    `<circle r="27.7" fill="none" stroke="${rim}" stroke-width="1.2" stroke-dasharray=".9 2.5"/>`];
  for (const [i, tile] of tiles.entries()) {
    const part = i < lit ? tile.lit : tile.ghost;
    const paint = `fill="${escape(palette[part.color] ?? b.accent)}" fill-opacity="${i < lit ? 1 : .32}"`;
    const x = tile.center[0] * 56, cy = -tile.center[1] * 56;
    if (part.kind === 'circle') out.push(`<circle cx="${f(x)}" cy="${f(cy)}" r="${f(part.radius * 56)}" ${paint}/>`);
    else {
      const h = part.half * 56;
      out.push(`<rect x="${f(x - h)}" y="${f(cy - h)}" width="${f(2 * h)}" height="${f(2 * h)}" rx="${f(part.radius * 56)}" ${paint}/>`);
    }
  }
  if (!tiles.length) out.push(`<text text-anchor="middle" y="5" font-size="13" fill="${PLATE.ink}">${b.total ? Math.round(100 * b.unlocked / b.total) : 0}%</text>`);
  out.push('</g>');
  return out.join('\n');
}

function brandRow(b, index, y, colors, labels) {
  const stats = dailyStats(b.daily);
  const out = [coin(b, index, y + 42), `<text x="110" y="${y + 39}" font-size="17" font-weight="700" fill="${colors.ink}">${escape(b.name)}</text>`,
    `<text x="110" y="${y + 60}" font-size="12" fill="${colors.sub}"><tspan fill="${colors.ink}" font-weight="600">${b.unlocked}</tspan>/${b.total} ${labels.badges}</text>`];
  const facts = [[formatCount(stats.tokens), labels.tokens], [stats.activeDays, labels.days], [stats.longestStreak, labels.streak]];
  facts.forEach(([value, label], i) => {
    const x = 263 + i * 87;
    out.push(`<text x="${x}" y="${y + 40}" font-size="21" font-weight="600" fill="${colors.ink}">${value}</text>`,
      `<text x="${x}" y="${y + 60}" font-size="11" fill="${colors.sub}">${label}</text>`);
  });
  return out.join('\n');
}

function activity(brands, today, top, labels) {
  const step = (WIDTH - 68) / WEEKS;
  const r = 4.8;
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  const start = addDays(monday, -7 * (WEEKS - 1));
  const thresholds = brands.map((b) => levelThresholds(b.daily));
  const out = [`<rect x="17" y="${top}" width="506" height="153" rx="12" fill="${PLATE.plate}" stroke="#515875"/>`,
    `<rect x="21" y="${top + 4}" width="498" height="145" rx="9" fill="none" stroke="#374362"/>`,
    `<defs><linearGradient id="dot-glaze" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFFFFF" stop-opacity=".15"/><stop offset=".6" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".21"/></linearGradient><circle id="glaze" r="${r}" fill="url(#dot-glaze)"/></defs>`,
    `<text x="35" y="${top + 26}" font-size="13" font-weight="600" fill="${PLATE.ink}">${labels.weeks}</text>`,
    `<text x="505" y="${top + 26}" text-anchor="end" font-size="10.5" fill="${PLATE.month}">${start} – ${today}</text>`];
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > today) continue;
      const x = f(34 + (w + .5) * step), y = f(top + 46 + d * step);
      const colors = [];
      brands.forEach((b, i) => {
        const level = levelOf(b.daily?.[date], thresholds[i]);
        if (level) colors.push(enamelColor(b.accent, level));
      });
      out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${colors[0] ?? PLATE.sunk}"/>`);
      if (colors[1]) out.push(`<path d="M${x} ${f(y - r)}a${r} ${r} 0 0 1 0 ${2 * r}Z" fill="${colors[1]}"/>`);
      if (colors.length) out.push(`<use href="#glaze" x="${x}" y="${y}"/>`);
    }
  }
  return out.join('\n');
}

/** 将指定工具的公开统计渲染为 SVG；theme、lang、name 与 card 命令行选项对应。 */
export function renderCard({ brands, name = '', theme = 'dark', lang = 'en', today = localDate(Date.now()) }) {
  const c = THEMES[theme] ?? THEMES.dark;
  const labels = LABELS[lang] ?? LABELS.en;
  const top = name ? 93 : 73;
  const heatTop = top + brands.length * 87 + 7;
  const height = heatTop + 184;
  const title = name ? `${name} · Agent Badges` : 'Agent Badges';
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escape(title)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`,
    `<title>${escape(title)}</title><defs><radialGradient id="coin-face" cx=".32" cy=".18" r=".9"><stop stop-color="#30447B"/><stop offset="1" stop-color="${PLATE.sunk}"/></radialGradient><clipPath id="owner"><rect x="30" y="44" width="480" height="30"/></clipPath></defs>`,
    `<rect width="540" height="${height}" rx="17" fill="${c.ground}"/><rect x="3.5" y="3.5" width="533" height="${height - 7}" rx="14" stroke="${c.trim}" fill="${c.face}"/>`,
    `<rect x="8" y="8" width="524" height="${height - 16}" rx="10" stroke="${c.rule}" fill="none"/>`,
    `<path d="M41 23Q43 34 53 35Q43 37 41 47Q39 37 29 35Q39 34 41 23Z" fill="${c.trim}"/>`,
    `<text x="64" y="44" fill="${c.ink}" font-size="25" font-weight="700">Agent Badges</text>`,
    `<text x="506" y="41" text-anchor="end" fill="${c.sub}" font-size="12">${today}</text>`];
  if (name) out.push(`<text x="32" y="67" clip-path="url(#owner)" font-size="13" fill="${c.sub}">${escape(name)}</text>`);
  out.push(`<path d="M32 ${top - 9}H508" stroke="${c.rule}"/>`);
  brands.forEach((b, index) => {
    const y = top + index * 87;
    if (index) out.push(`<path d="M110 ${y}H508" stroke="${c.rule}"/>`);
    out.push(brandRow(b, index, y, c, labels));
  });
  out.push(activity(brands, today, heatTop, labels), `<text x="505" y="${height - 16}" text-anchor="end" font-size="10.5" fill="${c.sub}">npx agent-badges</text>`, '</svg>');
  return out.join('\n') + '\n';
}
