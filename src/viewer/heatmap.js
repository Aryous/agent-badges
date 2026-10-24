// 年度热力图：一年 365 格，每格是一天的 Token 用量。
// 两个工具叠在一起看：只用了一个就是它的品牌色，同一天两个都用了就斜着一分为二。
// 那天解锁了徽章，格子中间加一个小圆点；悬停看详情，点圆点打开对应徽章。
import { dailyStats, dailyYears } from '../data/daily.js';
import { levelOf, levelThresholds, today, yearWeeks } from '../data/calendar.js';
import { formatDay, lang, t } from './i18n.js';
import { formatCount } from '../data/format.js';
import { describeState } from './describe.js';
import { trackSegThumb } from './seg.js';

const ALPHA = [0, 0.3, 0.5, 0.74, 1];
const EMPTY = 'rgba(240, 238, 230, 0.06)';

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * 每天解锁了哪些徽章（热力图上的小圆点）。
 * @param {{ brand, badges, progress }[]} list  各工具的徽章配置和归一化进度
 * @param {string|null} current  当前页面的工具：只有它的徽章可以点开
 */
export function markersFrom(list, current = null) {
  const markers = {};
  for (const { brand, badges, progress } of list) {
    for (const config of badges) {
      const st = progress[config.id];
      if (!st?.unlocked || !st.earnedAt) continue;
      const d = describeState(config, st);
      (markers[st.earnedAt] ??= []).push({
        brandId: brand.id,
        brandName: brand.name,
        id: config.id,
        title: d.tier ? `${d.title} · ${d.meta}` : d.title,
        openable: brand.id === current,
      });
    }
  }
  return markers;
}

/** 几个工具按天相加，用于汇总（活跃天数、连续天数按「任一工具有活动」算）。 */
export function combineDaily(list) {
  const out = {};
  for (const daily of list) {
    for (const [date, [tokens, turns]] of Object.entries(daily ?? {})) {
      const o = (out[date] ??= [0, 0]);
      o[0] += tokens;
      o[1] += turns;
    }
  }
  return out;
}

/** 某一天格子的背景：0–2 个工具的颜色。 */
export function cellBackground(parts) {
  if (!parts.length) return EMPTY;
  if (parts.length === 1) return rgba(parts[0].color, ALPHA[parts[0].level]);
  const [a, b] = parts;
  return `linear-gradient(135deg, ${rgba(a.color, ALPHA[a.level])} 0 50%, ${rgba(b.color, ALPHA[b.level])} 50% 100%)`;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root
 * @param {{ id, name, color, daily }[]} opts.series  每个工具的按天用量
 * @param {Record<string, { brandId, brandName, id, title }[]>} opts.markers  每天解锁的徽章
 * @param {(marker) => void} [opts.onMarker]  点击解锁标记
 */
export function createHeatmap({ root, series, markers = {}, onMarker }) {
  const weekStart = lang === 'zh' ? 1 : 0;
  const thresholds = Object.fromEntries(series.map((s) => [s.id, levelThresholds(s.daily)]));
  const enabled = new Set(series.map((s) => s.id));
  const now = today();
  const years = dailyYears(...series.map((s) => s.daily));
  if (!years.includes(Number(now.slice(0, 4)))) years.push(Number(now.slice(0, 4)));
  // 默认看有数据的最近一年
  const withData = dailyYears(...series.map((s) => s.daily));
  let year = withData.at(-1) ?? Number(now.slice(0, 4));

  const el = document.createElement('section');
  el.className = 'heat';
  el.innerHTML = `
    <header class="heat-head">
      <div>
        <h2 class="section-title">${t('heat.title')}</h2>
        <p class="heat-summary" data-summary></p>
      </div>
      <div class="seg heat-years" role="radiogroup" aria-label="${t('heat.title')}" data-years></div>
    </header>
    <div class="heat-scroll" data-scroll>
      <div class="heat-body">
        <div class="heat-months" data-months aria-hidden="true"></div>
        <div class="heat-wd" data-wd aria-hidden="true"></div>
        <div class="heat-grid" data-grid role="img"></div>
      </div>
    </div>
    <footer class="heat-foot">
      <div class="heat-brands" data-brands></div>
      <div class="heat-scale" aria-hidden="true">
        <span>${t('heat.less')}</span>
        ${ALPHA.map((a, i) => `<i style="background:${i ? `rgba(240,238,230,${a * 0.85})` : EMPTY}"></i>`).join('')}
        <span>${t('heat.more')}</span>
        <span class="heat-scale-mark"><i class="dot"></i>${t('heat.unlock')}</span>
      </div>
    </footer>
    <div class="heat-tip" data-tip role="tooltip" hidden></div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);

  // 星期标签：只标一、三、五（或 Mon / Wed / Fri）
  const wd = t('weekdays');
  $('[data-wd]').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const day = (weekStart + i) % 7;
    return `<span>${[1, 3, 5].includes(day) ? wd[day] : ''}</span>`;
  }).join('');

  // 年份切换（只有一年时不显示）
  const yearsEl = $('[data-years]');
  yearsEl.hidden = years.length < 2;
  for (const y of years) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.textContent = y;
    b.addEventListener('click', () => {
      year = y;
      render();
    });
    yearsEl.appendChild(b);
  }
  trackSegThumb(yearsEl);

  // 工具开关：至少留一个
  const brandsEl = $('[data-brands]');
  for (const s of series) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'heat-brand';
    b.dataset.id = s.id;
    b.style.setProperty('--c', s.color);
    b.setAttribute('aria-label', t('heat.toggle', { name: s.name }));
    b.innerHTML = `<i></i><span class="heat-brand-name"></span><span class="heat-brand-total"></span>`;
    b.querySelector('.heat-brand-name').textContent = s.name;
    b.addEventListener('click', () => {
      if (enabled.has(s.id) && enabled.size === 1) return;
      enabled.has(s.id) ? enabled.delete(s.id) : enabled.add(s.id);
      render();
    });
    brandsEl.appendChild(b);
  }

  const grid = $('[data-grid]');
  const tip = $('[data-tip]');

  function partsOf(date) {
    const parts = [];
    for (const s of series) {
      if (!enabled.has(s.id)) continue;
      const level = levelOf(s.daily?.[date], thresholds[s.id]);
      if (level) parts.push({ color: s.color, level });
    }
    return parts;
  }

  const markersOn = (date) => (markers[date] ?? []).filter((m) => enabled.has(m.brandId));

  function render() {
    const { weeks, monthStarts } = yearWeeks(year, weekStart);
    el.style.setProperty('--weeks', weeks.length);
    yearsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(Number(b.textContent) === year)));

    const months = t('months');
    $('[data-months]').innerHTML = monthStarts
      .map(({ month, col }) => `<span style="grid-column-start:${col + 1}">${months[month]}</span>`)
      .join('');

    const html = [];
    for (const col of weeks) {
      for (const date of col) {
        if (!date) {
          html.push('<span class="heat-cell is-pad"></span>');
          continue;
        }
        const future = date > now;
        const bg = future ? 'transparent' : cellBackground(partsOf(date));
        const unlock = markersOn(date).length ? ' is-unlock' : '';
        html.push(`<span class="heat-cell${future ? ' is-future' : ''}${unlock}" data-date="${date}" style="background:${bg}"></span>`);
      }
    }
    grid.innerHTML = html.join('');

    // 汇总
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const on = series.filter((s) => enabled.has(s.id));
    const all = dailyStats(combineDaily(on.map((s) => s.daily)), { from, to });
    const summary = t('heat.summary', { tokens: formatCount(all.tokens), days: all.activeDays, streak: all.longestStreak });
    $('[data-summary]').textContent = summary;
    grid.setAttribute('aria-label', t('heat.label', { year, summary }));
    for (const b of brandsEl.children) {
      const s = series.find((x) => x.id === b.dataset.id);
      b.setAttribute('aria-pressed', String(enabled.has(s.id)));
      b.querySelector('.heat-brand-total').textContent = formatCount(dailyStats(s.daily, { from, to }).tokens);
    }
    hideTip();
    // 看今年时滚到最右边（手机上一屏放不下一整年）
    const scroll = $('[data-scroll]');
    scroll.scrollLeft = year === Number(now.slice(0, 4)) ? scroll.scrollWidth : 0;
  }

  // ---------- 悬停详情 ----------
  function showTip(cell) {
    const date = cell.dataset.date;
    const rows = series
      .filter((s) => enabled.has(s.id) && s.daily?.[date])
      .map((s) => {
        const [tokens, turns] = s.daily[date];
        return `<li><i style="background:${s.color}"></i><b>${escape(s.name)}</b><span>${formatCount(tokens)} Token${turns ? ` · ${t('heat.turns', { n: turns })}` : ''}</span></li>`;
      });
    const ms = markersOn(date);
    tip.innerHTML = `
      <p class="heat-tip-date">${formatDay(date)}</p>
      ${rows.length ? `<ul>${rows.join('')}</ul>` : `<p class="heat-tip-none">${t('heat.none')}</p>`}
      ${ms.length ? `<p class="heat-tip-unlock"><i class="dot"></i>${t('heat.unlock')}：${ms.map((m) => escape(m.title) + (m.openable ? '' : ` <span class="heat-tip-brand">${escape(m.brandName)}</span>`)).join('、')}</p>` : ''}`;
    tip.hidden = false;
    const host = el.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    const w = tip.offsetWidth;
    const x = Math.min(Math.max(r.left + r.width / 2 - host.left - w / 2, 0), host.width - w);
    let y = r.top - host.top - tip.offsetHeight - 8;
    if (y < 0) y = r.bottom - host.top + 8;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }
  function hideTip() {
    tip.hidden = true;
  }
  grid.addEventListener('pointerover', (e) => {
    const cell = e.target.closest('.heat-cell[data-date]');
    if (cell && !cell.classList.contains('is-future')) showTip(cell);
    else hideTip();
  });
  grid.addEventListener('pointerleave', hideTip);
  $('[data-scroll]').addEventListener('scroll', hideTip, { passive: true });
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.heat-cell.is-unlock');
    if (!cell) return;
    const m = markersOn(cell.dataset.date).find((x) => x.openable);
    if (m) onMarker?.(m);
  });

  render();
  return {
    el,
    get year() {
      return year;
    },
    get enabled() {
      return [...enabled];
    },
    setYear(y) {
      year = y;
      render();
    },
  };
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
