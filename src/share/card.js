// 个人成就卡片：一张独立的 SVG，可以放进 GitHub 个人主页的 README。
// 只含解锁数、Token 总量、活跃天数、最长连续和最近半年的热力格子，不含任何具体内容。
import { addDays, localDate, weekday } from '../data/metrics-common.js';
import { dailyStats } from '../data/daily.js';
import { levelOf, levelThresholds } from '../data/calendar.js';

const THEMES = {
  dark: { bg: '#141413', border: '#2B2926', text: '#F0EEE6', muted: '#8F8B82', faint: '#5D5A54', empty: '#24221F', track: '#2B2926' },
  light: { bg: '#FFFFFF', border: '#E4E1DA', text: '#1F1E1C', muted: '#6E6A62', faint: '#A7A39A', empty: '#EFEDE8', track: '#EFEDE8' },
};
const ALPHA = [0, 0.3, 0.5, 0.74, 1];
const WEEKS = 34; // 正好铺满卡片宽度

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function formatTokens(n) {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return String(n);
}

const LABELS = {
  en: { badges: 'badges', tokens: 'tokens', days: 'active days', streak: 'day streak', weeks: 'Recent activity', title: 'Agent Badges' },
  zh: { badges: '枚徽章', tokens: 'Token', days: '活跃天数', streak: '最长连续天数', weeks: '最近的活动', title: 'Agent Badges' },
};

/**
 * @param {object} o
 * @param {{ id, name, accent, unlocked, total, daily }[]} o.brands
 * @param {string} [o.name]   卡片标题里的名字（可选）
 * @param {'dark'|'light'} [o.theme]
 * @param {'en'|'zh'} [o.lang]
 * @param {string} [o.today]  YYYY-MM-DD
 */
export function renderCard({ brands, name = '', theme = 'dark', lang = 'en', today = localDate(Date.now()) }) {
  const c = THEMES[theme] ?? THEMES.dark;
  const L = LABELS[lang] ?? LABELS.en;
  const W = 540;
  const rowH = 46;
  const top = 64;
  const heatTop = top + brands.length * rowH + 14;
  const gap = 3;
  const cell = (W - 48 - (WEEKS - 1) * gap) / WEEKS;
  const H = heatTop + 18 + 7 * (cell + gap) + 30;
  const font = `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"`;

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(L.title)}">`);
  out.push(`<defs><linearGradient id="ab-spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2713A"/><stop offset=".5" stop-color="#C44FD6"/><stop offset="1" stop-color="#3550FF"/></linearGradient></defs>`);
  out.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${c.bg}" stroke="${c.border}"/>`);
  // 标题：小四角星 + 名字
  out.push(`<path transform="translate(24 20) scale(1.05)" d="M12 2C12.9 8.4 15.6 11.1 22 12C15.6 12.9 12.9 15.6 12 22C11.1 15.6 8.4 12.9 2 12C8.4 11.1 11.1 8.4 12 2Z" fill="url(#ab-spark)"/>`);
  const title = name ? `${name} · ${L.title}` : L.title;
  out.push(`<text x="58" y="40" ${font} font-size="17" font-weight="600" fill="${c.text}">${esc(title)}</text>`);

  // 每个工具一行：名字、解锁进度条、三个数字
  brands.forEach((b, i) => {
    const y = top + i * rowH;
    const s = dailyStats(b.daily);
    const ratio = b.total ? b.unlocked / b.total : 0;
    out.push(`<rect x="24" y="${y + 6}" width="8" height="8" rx="2" fill="${b.accent}"/>`);
    out.push(`<text x="40" y="${y + 15}" ${font} font-size="13" font-weight="600" fill="${c.text}">${esc(b.name)}</text>`);
    out.push(`<text x="40" y="${y + 34}" ${font} font-size="12" fill="${c.muted}"><tspan fill="${c.text}" font-weight="600">${b.unlocked}</tspan>/${b.total} ${esc(L.badges)}</text>`);
    out.push(`<rect x="150" y="${y + 6}" width="110" height="6" rx="3" fill="${c.track}"/>`);
    out.push(`<rect x="150" y="${y + 6}" width="${Math.max(6, 110 * ratio).toFixed(1)}" height="6" rx="3" fill="${b.accent}"/>`);
    const facts = [
      [formatTokens(s.tokens), L.tokens],
      [String(s.activeDays), L.days],
      [String(s.longestStreak), L.streak],
    ];
    facts.forEach(([v, label], k) => {
      const x = 290 + k * 84;
      out.push(`<text x="${x}" y="${y + 15}" ${font} font-size="14" font-weight="600" fill="${c.text}">${esc(v)}</text>`);
      out.push(`<text x="${x}" y="${y + 32}" ${font} font-size="11" fill="${c.muted}">${esc(label)}</text>`);
    });
  });

  // 最近 34 周的热力格子（周一开头），两个工具同一天都用了就斜分两色
  out.push(`<text x="24" y="${heatTop + 8}" ${font} font-size="11" fill="${c.faint}">${esc(L.weeks)}</text>`);
  const th = Object.fromEntries(brands.map((b) => [b.id, levelThresholds(b.daily)]));
  const endMonday = addDays(today, -((weekday(today) + 6) % 7));
  const start = addDays(endMonday, -7 * (WEEKS - 1));
  const gridTop = heatTop + 18;
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > today) continue;
      const x = +(24 + w * (cell + gap)).toFixed(2);
      const y = +(gridTop + d * (cell + gap)).toFixed(2);
      const parts = brands.map((b) => ({ color: b.accent, level: levelOf(b.daily?.[date], th[b.id]) })).filter((p) => p.level);
      if (!parts.length) {
        out.push(`<rect x="${x}" y="${y}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="2.5" fill="${c.empty}"/>`);
        continue;
      }
      out.push(`<rect x="${x}" y="${y}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="2.5" fill="${parts[0].color}" fill-opacity="${ALPHA[parts[0].level]}"/>`);
      if (parts[1]) {
        out.push(`<path d="M${+(x + cell).toFixed(2)} ${y}V${+(y + cell).toFixed(2)}H${x}Z" fill="${parts[1].color}" fill-opacity="${ALPHA[parts[1].level]}"/>`);
      }
    }
  }
  out.push(`<text x="${W - 24}" y="${H - 16}" ${font} font-size="11" fill="${c.faint}" text-anchor="end">npx agent-badges</text>`);
  out.push('</svg>');
  return out.join('\n') + '\n';
}
