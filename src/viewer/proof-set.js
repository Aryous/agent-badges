// 年度铸币套装：藏在热力图珐琅板下面的一只礼盒。左边黄铜铭牌，右边丝绒托盘，每个月一枚「月章」。
// 板子下沿正中一个皮质拉环：往上拖或点一下，板子先抬起，再滑进礼盒上沿；关上时原路返回。
// 取色、当前年份、开着的工具、悬停浮层都用热力图的，不另做一份。
import { enamelColor, SUNK } from './heatmap.js';
import { today } from '../data/calendar.js';
import { formatCount } from '../data/format.js';
import { STAGE_METALS } from '../brands/shared/completionist.js';
import { t } from './i18n.js';

/** 礼盒的尺寸（px）。电脑上铭牌在左、托盘 6 × 2；放不下时铭牌在上、托盘 4 × 3 或 3 × 4。 */
export const CASE = {
  pad: 14, // 礼盒内边距
  side: 190, // 铭牌栏宽
  sideGap: 14, // 铭牌栏和托盘之间
  trayX: 30, // 托盘左右内边距
  trayY: 24, // 托盘上下内边距：打开后拉环垂在托盘上方，和第一排铸币之间留出空
  gap: 16, // 铸币之间
  coinMin: 88, // 再小就看不清珠子和数字
  coinMax: 120, // 竖排时铸币的上限
  stackSide: 104, // 竖排时铭牌那一行的高度（上面留出拉环的位置）
  stackTrayX: 16,
  stackTrayY: 18,
  stackGap: 14,
};

/**
 * 每个月的 Token 和活跃天数（只有对话没有 Token 的日子也算活跃）。
 * @param {Record<string, [number, number]>[]} dailies  开着的工具的按天用量
 * @returns {{ tokens: number, days: number }[]}  12 个月
 */
export function monthStats(dailies, year) {
  const out = Array.from({ length: 12 }, () => ({ tokens: 0, days: 0 }));
  const active = Array.from({ length: 12 }, () => new Set());
  const prefix = `${year}-`;
  for (const daily of dailies) {
    for (const [date, [tokens, turns]] of Object.entries(daily ?? {})) {
      if (!date.startsWith(prefix)) continue;
      const m = Number(date.slice(5, 7)) - 1;
      out[m].tokens += tokens;
      if (tokens > 0 || turns > 0) active[m].add(date);
    }
  }
  active.forEach((s, m) => (out[m].days = s.size));
  return out;
}

/** 每个月的 Token。 */
export const monthSums = (dailies, year) => monthStats(dailies, year).map((s) => s.tokens);

/** 外圈金属 0..3（锡、铜、银、金）：达到这一年最多那个月的 1/4、1/2、3/4 各进一级。 */
export const monthTier = (sum, maxSum) => (maxSum > 0 ? [0.25, 0.5, 0.75].filter((f) => sum >= maxSum * f).length : 0);

const pad2 = (n) => String(n).padStart(2, '0');

/** 有月章的月份（0..11）：有活动，且这个月已经开始。 */
export const mintedMonths = (stats, year, now = today()) =>
  stats.flatMap((s, m) => (s.days > 0 && `${year}-${pad2(m + 1)}-01` <= now ? [m] : []));

/** 铭牌上细线下面的状态：今年还在铸，往年已封存。 */
export const plaqueStatus = (year, minted, now = today()) =>
  year < Number(now.slice(0, 4)) ? 'SEALED · 12.31' : `MINTING · ${minted} / 12`;

/**
 * 礼盒的版式：先按板子的高度排 6 × 2，宽度不够再缩；小于下限就改成铭牌在上的竖排。
 * @returns {{ cols, rows, coin, stacked, height }}  height 是礼盒的高度（6 × 2 时就是板子的高度）
 */
export function caseLayout({ width, plateHeight }) {
  const c = CASE;
  const byHeight = Math.floor((plateHeight - 2 * c.pad - 2 * c.trayY - c.gap) / 2);
  const byWidth = Math.floor((width - 2 * c.pad - c.side - c.sideGap - 2 * c.trayX - 5 * c.gap) / 6);
  const coin = Math.min(byHeight, byWidth);
  if (coin >= c.coinMin) return { cols: 6, rows: 2, coin, stacked: false, height: plateHeight };
  for (const cols of [4, 3]) {
    const fit = Math.min(c.coinMax, Math.floor((width - 2 * c.pad - 2 * c.stackTrayX - (cols - 1) * c.stackGap) / cols));
    if (fit < c.coinMin && cols > 3) continue;
    const rows = 12 / cols;
    const height = 2 * c.pad + c.stackSide + c.sideGap + 2 * c.stackTrayY + rows * fit + (rows - 1) * c.stackGap;
    return { cols, rows, coin: fit, stacked: true, height: Math.max(height, plateHeight) };
  }
}

// ---------- 月章（SVG，160 × 160） ----------

/**
 * 竖排的几行字按「视觉」居中：每行占它的字高（拉丁大写约字号 × 0.7，汉字约 × 0.82），行间留固定空隙，
 * 整块的中心放在 cy 上方 1 个单位（人眼觉得几何中心偏低）。
 * 加了字距的行，text-anchor 居中时末尾多算了一份字距，往右补回半份。
 * @param {[cls: string, text: string, size: number, track?: number][]} lines  track 是字距（em）
 */
export function centerStack(lines, cx, cy, gap = 6) {
  const caps = lines.map(([, text, size]) => size * (/[^\x00-\x7f]/.test(text) ? 0.82 : 0.7));
  const total = caps.reduce((a, b) => a + b, 0) + gap * (lines.length - 1);
  let y = cy - total / 2 - 1;
  return lines
    .map(([cls, text, size, track = 0], i) => {
      y += caps[i];
      const x = cx + (size * track) / 2;
      const out = `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" class="${cls}">${text}</text>`;
      y += gap;
      return out;
    })
    .join('');
}

/**
 * 一枚月章：外圈金属，午夜蓝珐琅，一圈珠子（每颗是当月的一天），中间写月份和当月 Token。
 * @param {object} o
 * @param {number} o.year
 * @param {number} o.month  0..11
 * @param {string} o.rim  外圈金属色
 * @param {string} o.label  月份
 * @param {number} o.tokens
 * @param {(date: string) => { color, level }[]} o.partsOf  热力图的同名函数
 * @param {(date: string) => unknown[]} o.markersOn  热力图的同名函数：那天解锁了徽章
 * @param {string} o.now
 */
export function medalSvg({ year, month, rim, label, tokens, partsOf, markersOn, now }) {
  const days = new Date(year, month + 1, 0).getDate();
  const R = 80;
  const ring = 64;
  const beads = Array.from({ length: days }, (_, i) => {
    const date = `${year}-${pad2(month + 1)}-${pad2(i + 1)}`;
    const a = -Math.PI / 2 + (i / days) * Math.PI * 2;
    const x = (R + ring * Math.cos(a)).toFixed(2);
    const y = (R + ring * Math.sin(a)).toFixed(2);
    if (date > now) return `<circle cx="${x}" cy="${y}" r="4.2" class="proof-bead is-future"/>`;
    const unlock = markersOn(date).length ? `<circle cx="${x}" cy="${y}" r="6.2" class="proof-ring"/>` : '';
    const cs = partsOf(date).map((p) => enamelColor(p.color, p.level));
    if (!cs.length) return `${unlock}<circle cx="${x}" cy="${y}" r="4.2" fill="${SUNK}" class="proof-bead" data-date="${date}"/>`;
    const body =
      cs.length === 1
        ? `<circle cx="${x}" cy="${y}" r="4.6" fill="${cs[0]}" class="proof-bead is-lit" data-date="${date}"/>`
        : // 两个工具：左半第一个，右半第二个，和热力图的圆点一样
          `<g class="proof-bead is-lit" data-date="${date}"><path d="M${x} ${(+y - 4.6).toFixed(2)}A4.6 4.6 0 0 0 ${x} ${(+y + 4.6).toFixed(2)}Z" fill="${cs[0]}"/><path d="M${x} ${(+y - 4.6).toFixed(2)}A4.6 4.6 0 0 1 ${x} ${(+y + 4.6).toFixed(2)}Z" fill="${cs[1]}"/></g>`;
    return unlock + body;
  }).join('');
  return `<svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
    <circle cx="80" cy="80" r="79" fill="${rim}"/>
    <circle cx="80" cy="80" r="75.5" fill="#141f4d"/>
    <circle cx="80" cy="80" r="73" fill="none" stroke="rgba(160,152,138,.35)" stroke-width=".8"/>
    <circle cx="80" cy="80" r="52" fill="#101a44" stroke="rgba(184,169,130,.38)" stroke-width="1"/>
    ${beads}
    ${centerStack(
      [
        ['proof-mname', escape(label), 11, 0.2],
        ['proof-mval', formatCount(tokens), 17],
        ['proof-munit', 'TOKEN', 9, 0.14],
      ],
      80,
      80,
    )}
  </svg>`;
}

// ---------- 礼盒和滑盖 ----------

let uid = 0;

/**
 * 把热力图的板子包进一个抽屉：板子在上（照常排版，决定盒子的高度），礼盒在下面。
 * 悬停浮层仍在 section.heat 里、抽屉外面，板子滑走时不会被裁掉。
 * @param {object} opts
 * @param {ReturnType<import('./heatmap.js').createHeatmap>} opts.heatmap
 * @param {Record<string, string>} opts.palette  品牌色板：取阶段金属（锡、铜、银、金）
 * @param {boolean} [opts.reducedMotion]
 */
export function createProofSet({ heatmap, palette, reducedMotion = false }) {
  const id = `proof-set-${++uid}`;
  const rims = STAGE_METALS.map((k) => palette[k]);
  const plate = heatmap.plate;

  const box = document.createElement('div');
  box.className = 'proof';
  box.innerHTML = `
    <div class="proof-case" id="${id}" role="region" inert>
      <div class="proof-side">
        <div class="proof-brass">
          <b data-year></b>
          <span>PROOF SET</span>
          <em data-status></em>
        </div>
      </div>
      <div class="proof-tray" data-tray></div>
    </div>
    <div class="proof-sheet" data-sheet></div>`;
  const sheet = box.querySelector('[data-sheet]');
  const caseEl = box.querySelector('.proof-case');
  const tray = box.querySelector('[data-tray]');
  const pull = document.createElement('button');
  pull.type = 'button';
  pull.className = 'proof-pull';
  pull.setAttribute('aria-controls', id);
  pull.setAttribute('aria-expanded', 'false');
  // 搬动元素会把横向滚动清零（今年的点阵原本滚在最右边），搬完再放回去
  const scrolled = [...plate.querySelectorAll('*')].filter((n) => n.scrollLeft > 0).map((n) => [n, n.scrollLeft]);
  plate.replaceWith(box);
  sheet.append(plate, pull);
  for (const [n, left] of scrolled) n.scrollLeft = left;

  let open = false;
  let busy = false;
  let year = heatmap.year;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function labels() {
    caseEl.setAttribute('aria-label', t('proof.region', { year }));
    pull.setAttribute('aria-label', t(open ? 'proof.close' : 'proof.open', { year }));
  }

  // ---------- 内容：跟着热力图的年份和工具开关 ----------
  function render({ year: y, enabled }) {
    year = y;
    const now = today();
    const on = heatmap.series.filter((s) => enabled.includes(s.id));
    const stats = monthStats(
      on.map((s) => s.daily),
      year,
    );
    const minted = new Set(mintedMonths(stats, year, now));
    const max = Math.max(0, ...[...minted].map((m) => stats[m].tokens));
    const months = t('months');
    tray.innerHTML = stats
      .map((s, m) => {
        if (!minted.has(m)) {
          return `<div class="proof-slot is-empty" role="img" aria-label="${escape(t('proof.empty', { month: monthName(m) }))}" style="--i:${m}"><span>${escape(months[m])}</span></div>`;
        }
        const tier = monthTier(s.tokens, max);
        const metal = t(`completionist.${STAGE_METALS[tier]}`);
        const label = t('proof.medal', { month: monthName(m), tokens: formatCount(s.tokens), days: s.days, metal });
        const svg = medalSvg({ year, month: m, rim: rims[tier], label: months[m], tokens: s.tokens, partsOf: heatmap.partsOf, markersOn: heatmap.markersOn, now });
        return `<div class="proof-slot" role="img" aria-label="${escape(label)}" style="--i:${m}"><div class="proof-medal" data-tier="${tier}">${svg}</div></div>`;
      })
      .join('');
    box.querySelector('[data-year]').textContent = year;
    box.querySelector('[data-status]').textContent = plaqueStatus(year, minted.size, now);
    labels();
  }

  // ---------- 尺寸：先量板子的自然高度，再按它排铸币 ----------
  function fit() {
    const plateHeight = plate.offsetHeight;
    const width = box.clientWidth;
    if (!plateHeight || !width) return;
    const l = caseLayout({ width, plateHeight });
    box.classList.toggle('is-stacked', l.stacked);
    box.style.setProperty('--plate-h', `${plateHeight}px`);
    box.style.setProperty('--case-h', `${l.height}px`);
    box.style.setProperty('--coin', `${l.coin}px`);
    box.style.setProperty('--cols', l.cols);
    box.style.setProperty('--rows', l.rows);
  }
  new ResizeObserver(fit).observe(plate);
  window.addEventListener('resize', fit);

  // ---------- 滑盖：打开是 抬起 → 滑上去 → 铸币落定；关上倒过来，先滑回来再放下 ----------
  const still = () => reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function settle() {
    box.classList.remove('is-revealing');
    void tray.offsetWidth; // 重新触发落定动画
    box.classList.add('is-revealing');
  }

  function toggle() {
    if (busy) return;
    open = !open;
    pull.setAttribute('aria-expanded', String(open));
    labels();
    heatmap.hideTip();
    timers.splice(0).forEach(clearTimeout);
    // 打开时板子上的控件被盖住：不能再用 Tab 走进去；礼盒关着时读屏也读不到里面
    plate.inert = open;
    if (open) {
      caseEl.inert = false;
      box.classList.add('is-shown');
      if (still()) {
        box.classList.add('is-lifted', 'is-open');
        return;
      }
      busy = true;
      box.classList.add('is-lifted');
      later(() => {
        box.classList.add('is-open');
        later(settle, 200);
      }, 230);
      later(() => (busy = false), 1000);
    } else {
      caseEl.inert = true;
      const done = () => box.classList.remove('is-shown', 'is-revealing');
      if (still()) {
        box.classList.remove('is-open', 'is-lifted');
        done();
        return;
      }
      busy = true;
      box.classList.remove('is-open');
      later(() => box.classList.remove('is-lifted'), 760);
      later(() => {
        done();
        busy = false;
      }, 1000);
    }
  }

  // 拖动：往上（关着时）或往下（开着时）超过 24px 就切换；按下后移动超过 6px 算拖动，之后的 click 不再算点击
  let y0 = null;
  let dragged = false;
  pull.addEventListener('pointerdown', (e) => {
    y0 = e.clientY;
    dragged = false;
    pull.setPointerCapture?.(e.pointerId);
  });
  pull.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    if (Math.abs(dy) > 6) dragged = true;
    if ((!open && dy < -24) || (open && dy > 24)) {
      y0 = null;
      toggle();
    }
  });
  const release = () => (y0 = null);
  pull.addEventListener('pointerup', release);
  pull.addEventListener('pointercancel', release);
  // 点一下、Enter、Space 都走 click（键盘的 click 没有 detail，不受拖动影响）
  pull.addEventListener('click', (e) => {
    if (dragged && e.detail !== 0) {
      dragged = false;
      return;
    }
    toggle();
  });

  // 悬停珠子：和热力图一样显示当天详情
  tray.addEventListener('pointerover', (e) => {
    const bead = e.target.closest?.('[data-date]');
    if (bead) heatmap.showTip(bead, bead.dataset.date);
    else heatmap.hideTip();
  });
  tray.addEventListener('pointerleave', () => heatmap.hideTip());

  heatmap.onChange(render);
  fit();

  return {
    el: box,
    pull,
    get open() {
      return open;
    },
    toggle,
  };
}

/** 「1 月」/「January」 */
const monthName = (m) => t('proof.months')[m] ?? String(m + 1);

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
