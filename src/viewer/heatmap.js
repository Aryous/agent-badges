// 年度热力图：一块午夜蓝珐琅板，一年 365 个凹点，每点是一天的 Token 用量。
// 两个工具叠在一起看：只用了一个就填它的品牌色珐琅，同一天两个都用了就左右各半。
// 那天解锁了徽章，圆点外加一圈细金边；悬停看详情，点金边圆点打开对应徽章。
import { dailyStats, dailyYears } from '../data/daily.js';
import { levelOf, levelThresholds, today, yearWeeks } from '../data/calendar.js';
import { formatDay, lang, t } from './i18n.js';
import { formatCount } from '../data/format.js';
import { describeState } from './describe.js';

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

/** 拼进 HTML 的文字转义（热力图和铸币套装共用）。 */
export const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 左右各半的双色点：左边是第一个工具。 */
export const splitBackground = (left, right) => `linear-gradient(90deg, ${left} 0 50%, ${right} 50% 100%)`;

/** 某一天圆点的背景：0–2 个工具的珐琅色（parts 按工具顺序）。 */
export function cellBackground(parts) {
  if (!parts.length) return enamelColor(SUNK, 0);
  const [a, b] = parts.map((p) => enamelColor(p.color, p.level));
  return b ? splitBackground(a, b) : a;
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

/** 细线箭头（SVG，不用字符）：-1 往左，1 往右。 */
const chevron = (d) =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d < 0 ? 'M10 3.5 5.5 8 10 12.5' : 'M6 3.5 10.5 8 6 12.5'}"/></svg>`;

const ROLL = { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' };

/**
 * 结构：section.heat 里一块珐琅板 .heat-plate 和一个悬停浮层。
 * 板上从上到下：标题行（标题、年份步进、统计行），点阵，图例（同时是工具开关）。
 * 板是单独的一个元素，以后可以整体包起来或移动；浮层不在板里，跟着 section 定位。
 * 切换工具只改圆点的颜色变量和类名，不重建；换年份才重建点阵，并淡出淡入。
 * @param {object} opts
 * @param {HTMLElement} opts.root
 * @param {{ id, name, color, daily }[]} opts.series  每个工具的按天用量
 * @param {Record<string, { brandId, brandName, id, title }[]>} opts.markers  每天解锁的徽章
 * @param {(marker) => void} [opts.onMarker]  点击解锁标记
 * @param {boolean} [opts.reducedMotion]  减少动态效果：不淡入淡出、不滚动数字，直接切换
 */
export function createHeatmap({ root, series, markers = {}, onMarker, reducedMotion = false }) {
  const weekStart = lang === 'zh' ? 1 : 0;
  const thresholds = Object.fromEntries(series.map((s) => [s.id, levelThresholds(s.daily)]));
  const enabled = new Set(series.map((s) => s.id));
  const listeners = new Set();
  const now = today();
  const thisYear = Number(now.slice(0, 4));
  const withData = dailyYears(...series.map((s) => s.daily));
  const years = [...new Set([...withData, thisYear])].sort((a, b) => a - b);
  // 默认看有数据的最近一年
  let year = withData.at(-1) ?? thisYear;
  const still = () => reducedMotion || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const sunk = enamelColor(SUNK, 0);

  const el = document.createElement('section');
  el.className = 'heat';
  el.innerHTML = `
    <div class="heat-plate" data-plate>
      <header class="heat-head">
        <h2 class="section-title heat-title">${t('heat.title')}</h2>
        <div class="heat-years" role="group" aria-label="${t('heat.year')}" data-years>
          <button type="button" class="heat-step" data-d="-1" aria-label="${t('heat.prevYear')}">${chevron(-1)}</button>
          <span class="heat-year" data-year aria-live="polite"></span>
          <button type="button" class="heat-step" data-d="1" aria-label="${t('heat.nextYear')}">${chevron(1)}</button>
        </div>
        <p class="heat-summary" data-summary></p>
      </header>
      <div class="heat-mid">
        <div class="heat-scroll" data-scroll>
          <div class="heat-body">
            <div class="heat-months" data-months aria-hidden="true"></div>
            <div class="heat-wd" data-wd aria-hidden="true"></div>
            <div class="heat-grid" data-grid role="img"></div>
          </div>
        </div>
      </div>
      <div class="rule heat-rule" aria-hidden="true"></div>
      <footer class="heat-legend">
        <div class="heat-legend-tools">
          <div class="heat-toggles" role="group" aria-label="${t('heat.tools')}" data-legend></div>
          <span class="heat-legend-both" data-both><i></i>${t('heat.both')}</span>
        </div>
        <span class="heat-legend-unlock"><i></i>${t('heat.unlock')}</span>
      </footer>
    </div>
    <div class="heat-tip" data-tip role="tooltip" hidden></div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const plate = $('[data-plate]');
  const grid = $('[data-grid]');
  const tip = $('[data-tip]');
  const scroll = $('[data-scroll]');
  const summaryEl = $('[data-summary]');

  // 星期标签：只标一、三、五（或 Mon / Wed / Fri）
  const wd = t('weekdays');
  $('[data-wd]').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const day = (weekStart + i) % 7;
    return `<span>${[1, 3, 5].includes(day) ? wd[day] : ''}</span>`;
  }).join('');

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

  const emit = () => {
    const state = { year, enabled: [...enabled] };
    for (const fn of listeners) fn(state);
  };

  // ---------- 年份步进：‹ 2026 ›，只有一年时不显示 ----------
  const yearsEl = $('[data-years]');
  const yearWin = $('[data-year]');
  yearsEl.hidden = years.length < 2;

  /** 年份数字：去年往下滚、明年往上滚，像计数器；到头的一侧变淡、aria-disabled。 */
  function renderYear(dir = 0) {
    yearsEl.dataset.year = year;
    const i = years.indexOf(year);
    yearsEl.querySelector('[data-d="-1"]').setAttribute('aria-disabled', String(i <= 0));
    yearsEl.querySelector('[data-d="1"]').setAttribute('aria-disabled', String(i >= years.length - 1));
    const neu = document.createElement('span');
    neu.textContent = year;
    const old = [...yearWin.children];
    if (!dir || !old.length || still() || typeof neu.animate !== 'function') {
      yearWin.replaceChildren(neu);
      return;
    }
    // 连点时上一轮还没滚完：只留最后一个往外滚
    old.slice(0, -1).forEach((n) => n.remove());
    const out = old.at(-1);
    out.setAttribute('aria-hidden', 'true');
    yearWin.append(neu);
    out.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${dir > 0 ? -100 : 100}%)`, opacity: 0 }], ROLL).onfinish = () => out.remove();
    neu.animate([{ transform: `translateY(${dir > 0 ? 100 : -100}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], ROLL);
  }

  yearsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const d = Number(b.dataset.d);
    const y = years[years.indexOf(year) + d];
    if (y !== undefined) setYear(y);
  });

  // ---------- 图例就是开关：工具名加它自己的四级色阶，整项一个按钮；至少留一个 ----------
  const legendEl = $('[data-legend]');
  const bothEl = $('[data-both]');
  for (const s of series) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'heat-brand';
    b.dataset.id = s.id;
    b.setAttribute('aria-pressed', 'true');
    b.setAttribute('aria-label', t('heat.toggle', { name: s.name }));
    b.innerHTML = `<b class="heat-brand-name">${escape(s.name)}</b><span class="heat-ramp">${[1, 2, 3, 4]
      .map((l, k) => `<i style="--k:${k};--c:${enamelColor(s.color, l)}"></i>`)
      .join('')}</span>`;
    legendEl.appendChild(b);
  }
  // 两个工具同一天都用：左右各半的点；只在两个都开着时出现
  bothEl.querySelector('i').style.background = cellBackground(series.slice(0, 2).map((s) => ({ color: s.color, level: 4 })));
  const both = series.length >= 2;
  bothEl.hidden = !both;

  function paintLegend() {
    for (const b of legendEl.children) b.setAttribute('aria-pressed', String(enabled.has(b.dataset.id)));
    const off = enabled.size < 2;
    bothEl.classList.toggle('is-off', off);
    bothEl.setAttribute('aria-hidden', String(off));
  }

  legendEl.addEventListener('click', (e) => {
    const b = e.target.closest('.heat-brand');
    if (!b) return;
    const id = b.dataset.id;
    if (enabled.has(id) && enabled.size === 1) {
      // 只剩一个：轻轻左右晃一下，状态不变
      b.classList.remove('is-nudge');
      void b.offsetWidth;
      b.classList.add('is-nudge');
      return;
    }
    enabled.has(id) ? enabled.delete(id) : enabled.add(id);
    paintLegend();
    paintCells();
    renderSummary(true);
    hideTip();
    emit();
  });
  legendEl.addEventListener('animationend', (e) => e.target.classList?.remove('is-nudge'));

  // ---------- 点阵 ----------
  /** 换年份：重建这一年的格子（每周一列），颜色由 paintCells 写进去。 */
  function buildGrid() {
    const { weeks, monthStarts } = yearWeeks(year, weekStart);
    el.style.setProperty('--weeks', weeks.length);
    const months = t('months');
    $('[data-months]').innerHTML = monthStarts
      .map(({ month, col }) => `<span style="grid-column-start:${col + 1}">${months[month]}</span>`)
      .join('');
    const html = [];
    weeks.forEach((col, w) => {
      for (const date of col) {
        if (!date) {
          html.push('<span class="heat-cell is-pad"></span>');
          continue;
        }
        // 这天有人（任何工具）解锁了徽章：金边一直在，开关工具只改它的透明度和大小
        const ring = markers[date]?.length ? ' has-ring' : '';
        html.push(`<span class="heat-cell${date > now ? ' is-future' : ''}${ring}" data-date="${date}" style="--w:${w}"></span>`);
      }
    });
    // 新格子直接上色，不过渡
    grid.classList.add('is-still');
    grid.innerHTML = html.join('');
    paintCells();
    void grid.offsetWidth;
    grid.classList.remove('is-still');
    // 看今年时滚到最右边（手机上一屏放不下一整年）
    scroll.scrollLeft = year === thisYear ? scroll.scrollWidth : 0;
  }

  /** 切换工具：只改每个圆点左右两半的颜色变量和类名，不重建，颜色才能淡入淡出、从左往右扫过。 */
  function paintCells() {
    for (const cell of grid.querySelectorAll('.heat-cell[data-date]')) {
      const date = cell.dataset.date;
      if (!cell.classList.contains('is-future')) {
        const parts = partsOf(date);
        const [a, b] = parts.map((p) => enamelColor(p.color, p.level));
        cell.style.setProperty('--a', a ?? sunk);
        cell.style.setProperty('--b', b ?? a ?? sunk);
        cell.classList.toggle('is-lit', parts.length > 0);
      }
      if (cell.classList.contains('has-ring')) {
        // 开着的工具里有人那天解锁：金边亮起，可以点开那枚徽章
        const on = markersOn(date).length > 0;
        cell.classList.toggle('ring-on', on);
        cell.classList.toggle('is-unlock', on);
      }
    }
  }

  // ---------- 统计行：只留数字，范围由图例里的开关说明 ----------
  let summaryTimer = 0;
  function renderSummary(animate = false) {
    const on = series.filter((s) => enabled.has(s.id));
    const all = dailyStats(combineDaily(on.map((s) => s.daily)), { from: `${year}-01-01`, to: `${year}-12-31` });
    const vars = { tokens: formatCount(all.tokens), days: all.activeDays, streak: all.longestStreak };
    grid.setAttribute('aria-label', t('heat.label', { year, summary: t('heat.summary', vars) }));
    // 数字单独提亮；每一段不在中间折行，窄屏上整段换到下一行
    const html = t('heat.summary', Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, `<b>${v}</b>`])))
      .split(' · ')
      .map((part) => `<span>${part}</span>`)
      .join(' · ');
    clearTimeout(summaryTimer);
    const swap = () => {
      summaryEl.innerHTML = html;
      summaryEl.classList.remove('is-swapping');
    };
    if (!animate || still()) return swap();
    // 淡一下再换数字
    summaryEl.classList.add('is-swapping');
    summaryTimer = setTimeout(swap, 180);
  }

  let fadeTimer = 0;
  function setYear(y) {
    if (y === year || !years.includes(y)) return;
    const dir = Math.sign(y - year);
    year = y;
    renderYear(dir);
    renderSummary(true);
    hideTip();
    clearTimeout(fadeTimer);
    if (still()) {
      grid.classList.remove('is-fading');
      buildGrid();
    } else {
      // 点阵整体淡出，换成新的一年再淡入
      grid.classList.add('is-fading');
      fadeTimer = setTimeout(() => {
        buildGrid();
        grid.classList.remove('is-fading');
      }, 160);
    }
    emit();
  }

  // ---------- 悬停详情 ----------
  /** 在 anchor（section 里的任一元素）上方显示某一天的详情，放不下就放到下方。左右不出板子的内容区。 */
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
    // 左右限制在板子的内容区里（板子的左右内边距：电脑 30px、手机 18px），不贴板框
    const p = plate.getBoundingClientRect();
    const cs = getComputedStyle(plate);
    const lo = p.left - host.left + parseFloat(cs.paddingLeft);
    const hi = p.right - host.left - parseFloat(cs.paddingRight) - w;
    const x = Math.max(lo, Math.min(r.left + r.width / 2 - host.left - w / 2, hi));
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
  scroll.addEventListener('scroll', hideTip, { passive: true });
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.heat-cell.is-unlock');
    if (!cell) return;
    const m = markersOn(cell.dataset.date).find((x) => x.openable);
    if (m) onMarker?.(m);
  });

  renderYear();
  paintLegend();
  buildGrid();
  renderSummary();
  return {
    el,
    /** 珐琅板本身（不含浮层） */
    plate,
    series,
    get year() {
      return year;
    },
    get enabled() {
      return [...enabled];
    },
    setYear,
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
