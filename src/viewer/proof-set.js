// 年度铸币套装：藏在热力图珐琅板下面的一只礼盒。左边黄铜铭牌，右边丝绒托盘，每个月一枚「月章」。
// 板子下沿正中一个皮质拉环：往上拖或点一下，板子先抬起，再滑进礼盒上沿；关上时原路返回。
// 取色、当前年份、开着的工具、悬停浮层都用热力图的，不另做一份。
import { PLATE, enamelColor, escape, SUNK } from './heatmap.js';
import { today } from '../data/calendar.js';
import { formatCount } from '../data/format.js';
import { STAGE_METALS } from '../brands/shared/completionist.js';
import { t } from './i18n.js';
import { beadAt, monthMedalData } from './month-medal.js';

/**
 * 礼盒的尺寸（px）。托盘永远 6 × 2；礼盒永远和板子一样高，放不下 6 枚时托盘横向滑动。
 * 托盘上下内边距 40：打开后皮质拉环（板子下沿往下 32px）垂在托盘上方，和第一排铸币之间留 16px。
 */
export const CASE = {
  pad: 14, // 礼盒内边距
  side: 190, // 铭牌栏宽
  sideGap: 14, // 铭牌栏和托盘之间
  trayX: 30, // 托盘左右内边距
  trayY: 40, // 托盘上下内边距
  gap: 16, // 铸币之间
  coinMax: 120, // 铸币直径的上限
  narrowAt: 700, // 礼盒窄于这个宽度时，铭牌栏收成竖条
  narrowSide: 54, // 竖条宽
  narrowSideGap: 10,
  narrowTrayX: 22,
};

/** 板子的最小高度：铸币 120px 时礼盒的高度。由 createProofSet 写到板子的 --plate-min 上。 */
export const PLATE_MIN = 2 * CASE.pad + 2 * CASE.trayY + CASE.gap + 2 * CASE.coinMax;

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

/** 往年的套装已经封存。铭牌和读屏名字共用这一条判断，两处不会分叉。 */
export const isSealed = (year, now = today()) => year < Number(now.slice(0, 4));

/** 铭牌上细线下面的状态：今年还在铸，往年已封存。 */
export const plaqueStatus = (year, minted, now = today()) =>
  isSealed(year, now) ? 'SEALED · 12.31' : `MINTING · ${minted} / 12`;

/**
 * 礼盒的版式：高度就是板子的高度，铸币直径按高度算，不超过 120；宽度只决定铭牌栏是不是竖条。
 * @returns {{ coin: number, narrow: boolean }}
 */
export function caseLayout({ width, plateHeight }) {
  const c = CASE;
  const coin = Math.min(c.coinMax, Math.floor((plateHeight - 2 * c.pad - 2 * c.trayY - c.gap) / 2));
  return { coin, narrow: width < c.narrowAt };
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
    <circle cx="80" cy="80" r="75.5" fill="${PLATE.plate}"/>
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

/** 月章截图时，徽章（含 1.06 的余量）占画布的比例。托盘图片、命中区、飞出飞回都按它对齐。 */
export const MEDAL_FILL = 0.94;

/** 3D 图片的缓存键：年份 + 开着的工具（排序后）。 */
export const artKey = (year, enabled) => `${year}|${[...enabled].sort().join(',')}`;

/**
 * 盖在 3D 图片上的透明命中区：每个不是未来的日子一个圆，带 data-date，接热力图的悬停浮层。
 * 坐标和 3D 珠子同一套（beadAt）；徽章半径是 1，图片边长对应 2 × 1.06 / fill（截图时的余量）。
 */
export function medalHitSvg(medal, fill) {
  const half = 1.06 / fill;
  const n = medal.days.length;
  const dots = medal.days
    .map((d, i) => {
      if (d.future) return '';
      const [x, y] = beadAt(i, n);
      return `<circle cx="${x.toFixed(4)}" cy="${(-y).toFixed(4)}" r="0.062" data-date="${d.date}"/>`;
    })
    .join('');
  const v = (-half).toFixed(4);
  const s = (2 * half).toFixed(4);
  return `<svg class="proof-hit" viewBox="${v} ${v} ${s} ${s}" aria-hidden="true" focusable="false">${dots}</svg>`;
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
 * @param {{ request: (key: string, medals: { month: number, tier: number, data: object }[]) => Promise<(string|null)[] | null>, hurry: () => void }} [opts.art]
 *   3D 图片：request 按缓存键要一组图片地址，和 medals（按月份从小到大）一一对应，画不出来给 null；hurry 是抽屉打开时催一下
 * @param {(o: { slot: HTMLElement, medal: { month: number, tier: number, data: object }, viaKeyboard: boolean, art: boolean }) => void} [opts.onOpen]
 *   点开一枚月章（单枚查看）。art 表示当时托盘显示的是不是 3D 图片。不给时月章只是图片，不能点开
 */
export function createProofSet({ heatmap, palette, reducedMotion = false, art = null, onOpen = null }) {
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
  // 板子的最小高度保证铸币是 120px；礼盒的各个尺寸也从 CASE 来，CSS 里不另写一份
  plate.style.setProperty('--plate-min', `${PLATE_MIN}px`);
  const px = { pad: CASE.pad, side: CASE.side, 'side-gap': CASE.sideGap, 'tray-x': CASE.trayX, 'tray-y': CASE.trayY, gap: CASE.gap };
  const narrowPx = { side: CASE.narrowSide, 'side-gap': CASE.narrowSideGap, 'tray-x': CASE.narrowTrayX };
  const setSizes = (narrow) => {
    for (const [k, v] of Object.entries({ ...px, ...(narrow ? narrowPx : {}) })) box.style.setProperty(`--case-${k}`, `${v}px`);
  };
  setSizes(false);

  let open = false;
  let busy = false;
  let year = heatmap.year;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const still = () => reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let spoken = ''; // 读屏名字里的状态：铭牌上写英文，这里按界面语言写
  function labels() {
    // 窄版不显示铭牌上的状态，读屏名字里总是带上
    caseEl.setAttribute('aria-label', t('proof.region', { year, status: spoken }));
    pull.setAttribute('aria-label', t(open ? 'proof.close' : 'proof.open', { year }));
  }

  // ---------- 内容：跟着热力图的年份和工具开关 ----------
  let medals = []; // 当前年份和工具下铸好的月章：{ month, tier, data }，按月份排
  let artToken = 0;
  let artWarned = false; // 画不出来只提示一次

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
    medals = [...minted]
      .sort((a, b) => a - b)
      .map((m) => ({
        month: m,
        tier: monthTier(stats[m].tokens, max),
        data: monthMedalData({ year, month: m, tokens: stats[m].tokens, activeDays: stats[m].days, series: heatmap.series, partsOf: heatmap.partsOf, markersOn: heatmap.markersOn, now }),
      }));
    tray.classList.remove('has-art', 'is-fading', 'is-instant');
    tray.innerHTML = stats
      .map((s, m) => {
        if (!minted.has(m)) {
          return `<div class="proof-slot is-empty" role="img" aria-label="${escape(t('proof.empty', { month: monthName(m) }))}" style="--i:${m}"><span>${escape(months[m])}</span></div>`;
        }
        const tier = monthTier(s.tokens, max);
        const metal = t(`completionist.${STAGE_METALS[tier]}`);
        const label = t('proof.medal', { month: monthName(m), tokens: formatCount(s.tokens), days: s.days, metal });
        const svg = medalSvg({ year, month: m, rim: rims[tier], label: months[m], tokens: s.tokens, partsOf: heatmap.partsOf, markersOn: heatmap.markersOn, now });
        // 能点开时是按钮（Enter、Space 打开）；落地页这类不能点开的地方仍是图片
        const role = onOpen ? 'role="button" tabindex="0"' : 'role="img"';
        return `<div class="proof-slot" ${role} aria-label="${escape(label)}" data-m="${m}" style="--i:${m}"><div class="proof-medal" data-tier="${tier}">${svg}</div><div class="proof-art" aria-hidden="true"></div></div>`;
      })
      .join('');
    box.querySelector('[data-year]').textContent = year;
    box.querySelector('[data-status]').textContent = plaqueStatus(year, minted.size, now);
    spoken = isSealed(year, now) ? t('proof.sealed') : t('proof.minting', { n: minted.size });
    labels();
    requestArt(enabled);
  }

  /** 要 3D 图片：全部画好、解码好以后一次换上；中途换了年份或工具就作废。画不出来就一直用 SVG。 */
  async function requestArt(enabled) {
    const token = ++artToken; // 先作废旧的请求，哪怕这次不要图片
    if (!art || !medals.length) return;
    const list = medals;
    let imgs;
    try {
      const urls = await art.request(artKey(year, enabled), list);
      if (token !== artToken) return;
      // 缺一张就整盘不换：12 枚要么一起是 3D，要么一起是 SVG
      if (!urls || urls.length !== list.length || urls.some((src) => !src)) return;
      imgs = urls.map((src) => {
        const img = new Image();
        img.alt = '';
        img.draggable = false;
        img.src = src;
        return img;
      });
      await Promise.all(imgs.map((img) => img.decode()));
    } catch (err) {
      // 已经作废的请求失败了不算数
      if (token === artToken && !artWarned) {
        console.warn('月章 3D 图片不可用，继续用 SVG', err);
        artWarned = true;
      }
      return;
    }
    if (token !== artToken) return;
    list.forEach((md, i) => {
      const host = tray.querySelector(`.proof-slot[data-m="${md.month}"] .proof-art`);
      if (!host) return;
      host.replaceChildren(imgs[i]);
      host.insertAdjacentHTML('beforeend', medalHitSvg(md.data, MEDAL_FILL));
    });
    // 抽屉关着、或者不要动画时直接换；开着时淡入（12 枚一起），不重播落定动画
    const fade = open && !still();
    tray.classList.toggle('is-instant', !fade);
    tray.classList.toggle('is-fading', fade);
    // 先停掉落定动画（SVG 停在不透明、图片停在透明），再换上，交叉淡化才有起点
    if (fade) void tray.offsetWidth;
    tray.classList.add('has-art');
  }

  // ---------- 尺寸：礼盒就是板子的高度，铸币按它排；宽度只决定铭牌栏是不是竖条 ----------
  let narrow = null;
  function fit() {
    const plateHeight = plate.offsetHeight;
    const width = box.clientWidth;
    if (!plateHeight || !width) return;
    const l = caseLayout({ width, plateHeight });
    if (l.narrow !== narrow) {
      narrow = l.narrow;
      box.classList.toggle('is-narrow', narrow);
      setSizes(narrow);
    }
    box.style.setProperty('--plate-h', `${plateHeight}px`);
    box.style.setProperty('--coin', `${l.coin}px`);
  }

  /** 放不下 6 枚时托盘横向滑动：看今年就滑到当前月份（窄屏上会被居中吸附），看往年从 1 月开始。 */
  function scrollToMonth() {
    const now = today();
    const slot = year === Number(now.slice(0, 4)) ? tray.children[Number(now.slice(5, 7)) - 1] : null;
    if (!slot) {
      tray.scrollLeft = 0;
      return;
    }
    const r = slot.getBoundingClientRect();
    const tr = tray.getBoundingClientRect();
    const right = r.right - tr.left + tray.scrollLeft + parseFloat(getComputedStyle(tray).paddingRight);
    tray.scrollLeft = Math.max(0, right - tray.clientWidth);
  }
  // 板子和盒子同宽：窗口宽度一变，板子的尺寸跟着变，这一个 ResizeObserver 就够了
  new ResizeObserver(fit).observe(plate);

  // ---------- 滑盖：打开是 抬起 → 滑上去 → 铸币落定；关上倒过来，先滑回来再放下 ----------
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
      art?.hurry();
      caseEl.inert = false;
      scrollToMonth();
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
      // 下次打开时 3D 图片也跟着落定
      const done = () => {
        box.classList.remove('is-shown', 'is-revealing');
        tray.classList.remove('is-fading');
        for (const slot of tray.querySelectorAll('.proof-slot.is-settled')) slot.classList.remove('is-settled');
      };
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

  // 点开一枚月章：交给 onOpen（单枚查看）。托盘横向滑动时的点击不受影响：滑动不会触发 click
  function openSlot(slot, viaKeyboard) {
    const medal = medals.find((md) => md.month === Number(slot.dataset.m));
    if (!onOpen || !medal) return;
    heatmap.hideTip();
    onOpen({ slot, medal, viaKeyboard, art: tray.classList.contains('has-art') });
  }
  tray.addEventListener('click', (e) => {
    const slot = e.target.closest('.proof-slot[data-m]');
    if (slot) openSlot(slot, e.detail === 0);
  });
  tray.addEventListener('keydown', (e) => {
    if (!onOpen || e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
    const slot = e.target.closest?.('.proof-slot[data-m]');
    if (!slot) return;
    e.preventDefault(); // 空格不滚动页面
    openSlot(slot, true);
  });

  // 落定动画播完就摘掉：之后抬起、飞回再去掉类名时，不会把它重新播一遍
  tray.addEventListener('animationend', (e) => {
    if (e.animationName === 'proof-settle') e.target.closest('.proof-slot')?.classList.add('is-settled');
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
    get medals() {
      return medals;
    },
  };
}

/** 「1 月」/「January」 */
const monthName = (m) => t('proof.months')[m] ?? String(m + 1);
