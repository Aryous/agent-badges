// 年度热力图：一块午夜蓝珐琅板，一年 365 个凹点，每点是一天的 Token 用量。
// 两个工具叠在一起看：只用了一个就填它的品牌色珐琅，同一天两个都用了就左右各半。
// 那天解锁了徽章，圆点外加一圈细金边；悬停看详情，点金边圆点打开对应徽章。
import { dailyStats, dailyYears } from '../data/daily.js';
import { levelOf, levelThresholds, today, yearWeeks } from '../data/calendar.js';
import { formatDay, lang, t } from './i18n.js';
import { formatCount } from '../data/format.js';
import { describeState } from './describe.js';
import { trackSegThumb } from './seg.js';

/** 板上凹点的颜色：没有活动的日子，也是混色的另一端。 */
export const SUNK = '#0d1538';
/** 等级 0–4 → 混色比例：越大越接近品牌色。 */
export const STEP = [0, 0.38, 0.58, 0.8, 1];

const rgbOf = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 某个工具在某个等级的珐琅色：品牌色和凹点色按 STEP 混合。等级 4 就是品牌色，0 是凹点色。 */
export function enamelColor(hex, level) {
  const a = rgbOf(hex);
  const b = rgbOf(SUNK);
  const k = STEP[level] ?? 0;
  return `rgb(${a.map((v, i) => Math.round(v * k + b[i] * (1 - k))).join(', ')})`;
}

/** 左右各半的双色点：左边是第一个工具。 */
export const splitBackground = (left, right) => `linear-gradient(90deg, ${left} 0 50%, ${right} 50% 100%)`;

/** 某一天圆点的背景：0–2 个工具的珐琅色（parts 按工具顺序）。 */
export function cellBackground(parts) {
  if (!parts.length) return enamelColor(SUNK, 0);
  const [a, b] = parts.map((p) => enamelColor(p.color, p.level));
  return b ? splitBackground(a, b) : a;
}

/** 统计行的范围：开着一个工具写它的名字，两个写「两个工具合计」。 */
export function summaryScope(names, l = lang) {
  if (names.length === 1) return names[0];
  return names.length === 2 ? t('heat.scopeBoth', {}, l) : t('heat.scopeAll', { n: names.length }, l);
}

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

/**
 * 结构：section.heat 里一块珐琅板 .heat-plate（标题、控件、点阵、图例都在板上）和一个悬停浮层。
 * 板是单独的一个元素，以后可以整体包起来或移动；浮层不在板里，跟着 section 定位。
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
  const listeners = new Set();
  const now = today();
  const years = dailyYears(...series.map((s) => s.daily));
  if (!years.includes(Number(now.slice(0, 4)))) years.push(Number(now.slice(0, 4)));
  // 默认看有数据的最近一年
  const withData = dailyYears(...series.map((s) => s.daily));
  let year = withData.at(-1) ?? Number(now.slice(0, 4));

  const el = document.createElement('section');
  el.className = 'heat';
  el.innerHTML = `
    <div class="heat-plate" data-plate>
      <header class="heat-head">
        <h2 class="section-title heat-title">${t('heat.title')}</h2>
        <div class="heat-controls">
          <div class="heat-brands" data-brands></div>
          <div class="seg heat-years" role="radiogroup" aria-label="${t('heat.title')}" data-years></div>
        </div>
        <p class="heat-summary" data-summary></p>
      </header>
      <div class="heat-scroll" data-scroll>
        <div class="heat-body">
          <div class="heat-months" data-months aria-hidden="true"></div>
          <div class="heat-wd" data-wd aria-hidden="true"></div>
          <div class="heat-grid" data-grid role="img"></div>
        </div>
      </div>
      <div class="rule heat-rule" aria-hidden="true"></div>
      <footer class="heat-legend" aria-hidden="true">
        <div class="heat-legend-tools" data-legend></div>
        <div class="heat-scale">
          <span>${t('heat.brighter')}</span>
          <span class="heat-scale-mark"><i class="heat-scale-unlock"></i>${t('heat.unlock')}</span>
        </div>
      </footer>
    </div>
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

  /** 某一天开着的工具里有活动的几个：{ id, color, level }，按工具顺序（左边是第一个）。 */
  function partsOf(date) {
    const parts = [];
    for (const s of series) {
      if (!enabled.has(s.id)) continue;
      const level = levelOf(s.daily?.[date], thresholds[s.id]);
      if (level) parts.push({ id: s.id, color: s.color, level });
    }
    return parts;
  }

  const markersOn = (date) => (markers[date] ?? []).filter((m) => enabled.has(m.brandId));

  // 图例：开着的每个工具一条自己的四级色阶，和点阵用同一个取色函数；两个都开时再放一颗左右各半的点
  function renderLegend() {
    const on = series.filter((s) => enabled.has(s.id));
    const tools = on.map(
      (s) =>
        `<span class="heat-legend-tool"><b>${escape(s.name)}</b><span class="heat-ramp">${[1, 2, 3, 4]
          .map((l) => `<i style="background:${enamelColor(s.color, l)}"></i>`)
          .join('')}</span></span>`,
    );
    if (on.length >= 2) {
      const both = cellBackground(on.slice(0, 2).map((s) => ({ color: s.color, level: 4 })));
      tools.push(`<span class="heat-legend-both"><i style="background:${both}"></i>${t('heat.both')}</span>`);
    }
    $('[data-legend]').innerHTML = tools.join('');
  }

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
        const unlock = markersOn(date).length ? ' is-unlock' : '';
        if (date > now) {
          html.push(`<span class="heat-cell is-future${unlock}" data-date="${date}"></span>`);
          continue;
        }
        const parts = partsOf(date);
        html.push(`<span class="heat-cell${parts.length ? ' is-lit' : ''}${unlock}" data-date="${date}" style="background:${cellBackground(parts)}"></span>`);
      }
    }
    grid.innerHTML = html.join('');

    // 汇总：写明范围（两个工具合计 / 某个工具），数字单独提亮
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const on = series.filter((s) => enabled.has(s.id));
    const all = dailyStats(combineDaily(on.map((s) => s.daily)), { from, to });
    const b = (v) => `<b>${v}</b>`;
    const summaryEl = $('[data-summary]');
    // 每一段不在中间折行，窄屏上整段换到下一行
    summaryEl.innerHTML = t('heat.summary', {
      scope: escape(summaryScope(on.map((s) => s.name))),
      tokens: b(formatCount(all.tokens)),
      days: b(all.activeDays),
      streak: b(all.longestStreak),
    })
      .split(' · ')
      .map((part) => `<span>${part}</span>`)
      .join(' · ');
    grid.setAttribute('aria-label', t('heat.label', { year, summary: summaryEl.textContent }));
    for (const btn of brandsEl.children) {
      const s = series.find((x) => x.id === btn.dataset.id);
      btn.setAttribute('aria-pressed', String(enabled.has(s.id)));
      btn.querySelector('.heat-brand-total').textContent = formatCount(dailyStats(s.daily, { from, to }).tokens);
    }
    renderLegend();
    hideTip();
    // 看今年时滚到最右边（手机上一屏放不下一整年）
    const scroll = $('[data-scroll]');
    scroll.scrollLeft = year === Number(now.slice(0, 4)) ? scroll.scrollWidth : 0;
    const state = { year, enabled: [...enabled] };
    for (const fn of listeners) fn(state);
  }

  // ---------- 悬停详情 ----------
  /** 在 anchor（section 里的任一元素）上方显示某一天的详情，放不下就放到下方。 */
  function showTip(anchor, date) {
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
      ${ms.length ? `<p class="heat-tip-unlock"><i class="heat-ring"></i><span>${t('heat.unlock')}：${ms.map((m) => escape(m.title) + (m.openable ? '' : ` <span class="heat-tip-brand">${escape(m.brandName)}</span>`)).join('、')}</span></p>` : ''}`;
    tip.hidden = false;
    const host = el.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const w = tip.offsetWidth;
    // 左右各留 8px，不贴板边
    const x = Math.min(Math.max(r.left + r.width / 2 - host.left - w / 2, 8), host.width - w - 8);
    let y = r.top - host.top - tip.offsetHeight - 10;
    if (y < 0) y = r.bottom - host.top + 10;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }
  function hideTip() {
    tip.hidden = true;
  }
  grid.addEventListener('pointerover', (e) => {
    const cell = e.target.closest('.heat-cell[data-date]');
    if (cell && !cell.classList.contains('is-future')) showTip(cell, cell.dataset.date);
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
    /** 珐琅板本身（不含浮层） */
    plate: $('[data-plate]'),
    series,
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
    /** 年份或工具开关变了（以及第一次订阅时）回调 { year, enabled }；返回取消订阅 */
    onChange(fn) {
      listeners.add(fn);
      fn({ year, enabled: [...enabled] });
      return () => listeners.delete(fn);
    },
    partsOf,
    markersOn,
    showTip,
    hideTip,
  };
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
