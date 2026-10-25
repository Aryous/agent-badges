// 成就档案：一块铭牌。左栏是全解锁徽章（实时 3D，兜底刻度环，下方写「已解锁徽章」；点开看单枚）和三个关键数字，旁边是「最近获得」和「即将解锁」。
import { highlights } from '../data/highlights.js';
import { dailyStats } from '../data/daily.js';
import { lang, t } from './i18n.js';
import { formatCount } from '../data/format.js';
import { badgeTitle } from '../brands/shared/text.js';
import { describeState, fmtDate } from './describe.js';
import { STAGE_METALS, isComplete, stageOf } from '../brands/shared/completionist.js';

/** 兜底的刻度环：全解锁徽章画不出来时显示。120 道径向刻度，按解锁比例点亮。 */
function tickRing(ratio, n = 120) {
  const lit = Math.round(ratio * n);
  const ticks = Array.from({ length: n }, (_, i) => {
    const long = i % 10 === 0;
    return `<line x1="60" y1="3" x2="60" y2="${long ? 13 : 10}" transform="rotate(${(i / n) * 360} 60 60)"${i < lit ? ' class="is-lit"' : ''} />`;
  }).join('');
  return `<svg class="profile-ticks" viewBox="0 0 120 120" aria-hidden="true">${ticks}</svg>`;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root
 * @param {object[]} opts.items  [{ config, state }]
 * @param {object} opts.daily    当前工具的按天用量
 * @param {(item) => void} opts.onSelect
 * @param {(viaKeyboard: boolean) => void} [opts.onCoin]  点开全解锁徽章；不给时铸币不是按钮（没有徽章时）
 * @param {() => void} opts.onShare
 * @param {() => void} opts.onShelf   生成 GitHub 主页徽章图
 */
export function createProfile({ root, items, daily, onSelect, onCoin, onShare, onShelf }) {
  const badges = items.map((it) => it.config);
  const progress = Object.fromEntries(items.map((it) => [it.config.id, it.state]));
  const h = highlights(badges, progress);
  const stats = dailyStats(daily);
  const total = items.length;
  const byId = new Map(items.map((it) => [it.config.id, it]));

  const el = document.createElement('section');
  el.className = 'profile';
  el.innerHTML = `
    <div class="rule has-star"><i class="star"></i></div>
    <div class="profile-plate">
      <div class="profile-main">
        <figure class="profile-coin is-pending" data-coin${onCoin ? ' role="button" tabindex="0"' : ''}>
          ${tickRing(total ? h.unlocked.length / total : 0)}
          <canvas aria-hidden="true" hidden></canvas>
          <div class="profile-count"><b>${h.unlocked.length}</b><span>/ ${total}</span></div>
          <figcaption class="profile-caption label">${t('profile.unlocked')}</figcaption>
        </figure>
        <div class="profile-facts">
          <dl class="profile-stats">
            <div><dt class="label">${t('profile.tokens')}</dt><dd>${formatCount(stats.tokens)}</dd></div>
            <div><dt class="label">${t('profile.activeDays')}</dt><dd>${stats.activeDays}</dd></div>
            <div><dt class="label">${t('profile.streak')}</dt><dd>${t('profile.days', { n: stats.longestStreak })}</dd></div>
          </dl>
          <div class="profile-actions">
            <button class="btn btn-primary profile-share" type="button" data-share>${t('profile.share')}</button>
            <button class="btn" type="button" data-shelf>${t('profile.shelf')}</button>
          </div>
        </div>
      </div>
      <div class="profile-col">
        <h3 class="profile-head label">${t('profile.recent')}</h3>
        <ul class="profile-list" data-recent></ul>
      </div>
      <div class="profile-col">
        <h3 class="profile-head label">${t('profile.next')}</h3>
        <ul class="profile-list" data-next></ul>
      </div>
    </div>
    <div class="rule"></div>`;
  root.appendChild(el);

  // 读屏只读 figure 的说明：解锁数和当前阶段（兜底刻度环也适用）
  const fig = el.querySelector('[data-coin]');
  const k = h.unlocked.length;
  const stageName = isComplete(k, total) ? 'complete' : STAGE_METALS[stageOf(k, total)];
  fig.setAttribute('aria-label', t('profile.coinLabel', { n: k, total, stage: t(`completionist.${stageName}`) }));
  let coin = null;
  // 暂停状态单独记：单枚查看可能在铸币挂上之前就打开（比如从 #徽章 链接进来），挂上时要照样停着
  let coinPaused = false;

  // 点开全解锁徽章。铸币同时可以拖动：按下后移动超过几像素算拖动，不打开
  let press = null;
  fig.addEventListener('pointerdown', (e) => (press = { x: e.clientX, y: e.clientY, moved: false }));
  fig.addEventListener('pointermove', (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) press.moved = true;
  });
  fig.addEventListener('click', (e) => {
    const dragged = press?.moved;
    press = null;
    if (!dragged) onCoin?.(e.detail === 0);
  });
  fig.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); // 空格不滚动页面
    onCoin?.(true);
  });

  const row = (entry, kind) => {
    const item = byId.get(entry.badge.id);
    const d = describeState(item.config, item.state);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'profile-item' + (kind === 'next' && !entry.state.unlocked ? ' is-locked' : '');
    btn.dataset.id = entry.badge.id;
    const meta =
      kind === 'recent'
        ? `<span class="profile-item-meta">${d.tier ? `${d.meta} · ` : ''}${fmtDate(entry.state.earnedAt)}</span>`
        : `<span class="profile-item-meter"><span class="meter-track"><span class="meter-fill" style="width:${Math.round(entry.ratio * 100)}%"></span></span>
           <span class="profile-item-meta">${formatCount(entry.state.progress.current)} / ${formatCount(entry.state.progress.target)}</span></span>`;
    btn.innerHTML = `<img alt="" draggable="false" /><span class="profile-item-text"><span class="profile-item-title"></span>${meta}</span>`;
    // 即将解锁说的是下一级：已是 10M、正在冲 100M，就写 100M Tokens
    const title = kind === 'next' && !d.masked && item.config.tiers ? badgeTitle(item.config, lang, (item.state.tier ?? -1) + 1) : d.title;
    btn.querySelector('.profile-item-title').textContent = title;
    btn.addEventListener('click', (e) => onSelect(item, e.detail === 0));
    li.appendChild(btn);
    return li;
  };
  const fill = (sel, list, kind, empty) => {
    const ul = el.querySelector(sel);
    if (!list.length) ul.innerHTML = `<li class="profile-empty">${empty}</li>`;
    for (const entry of list) ul.appendChild(row(entry, kind));
  };
  fill('[data-recent]', h.recent, 'recent', t('profile.noneRecent'));
  fill('[data-next]', h.nearMiss, 'next', t('profile.noneNext'));
  el.querySelector('[data-share]').addEventListener('click', onShare);
  el.querySelector('[data-shelf]').addEventListener('click', onShelf);

  return {
    el,
    /** 全解锁徽章所在的 figure：单枚查看关上后焦点回到这里。 */
    coinEl: fig,
    stats,
    unlocked: h.unlocked.length,
    total,
    setThumbnail(id, src) {
      el.querySelectorAll(`.profile-item[data-id="${id}"] img`).forEach((img) => (img.src = src));
    },
    /**
     * 挂上实时的全解锁徽章。挂之前位置空着（is-pending），不先露刻度环，免得打开时闪一下。create({ canvas, target, onLost }) 返回 { pause, resume, dispose }；
     * 画不出来（比如拿不到 WebGL 上下文）就留着刻度环；画着画着上下文丢了（onLost）也换回刻度环。
     * 下方的数字只留给检查脚本。
     */
    mountCoin(create) {
      const canvas = fig.querySelector('canvas');
      canvas.hidden = false;
      try {
        coin = create({ canvas, target: fig, onLost: () => this.disposeCoin() });
        if (coinPaused) coin.pause();
        fig.classList.add('has-coin');
        fig.querySelector('.profile-count').setAttribute('aria-hidden', 'true');
      } catch (err) {
        canvas.hidden = true;
        console.warn('全解锁徽章渲染失败，改用刻度环', err);
      }
      // 等待结束：挂上了就是铸币，挂不上才露出刻度环
      fig.classList.remove('is-pending');
    },
    /** 单枚查看挡住概览区时停下全解锁徽章，关上后接着画。 */
    pauseCoin() {
      coinPaused = true;
      coin?.pause();
    },
    resumeCoin() {
      coinPaused = false;
      coin?.resume();
    },
    /** 卸下全解锁徽章（交还 WebGL 上下文），换回刻度环。上下文丢了时由 mountCoin 的 onLost 调用。 */
    disposeCoin() {
      coin?.dispose();
      coin = null;
      fig.classList.remove('has-coin');
      fig.querySelector('canvas').hidden = true;
      fig.querySelector('.profile-count').removeAttribute('aria-hidden');
    },
  };
}
