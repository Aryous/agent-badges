// 成就档案：一块铭牌。左栏是进度铸币（兜底刻度环，下方写「已解锁徽章」）和三个关键数字，旁边是「最近获得」和「即将解锁」。
import { highlights } from '../data/highlights.js';
import { dailyStats } from '../data/daily.js';
import { lang, t } from './i18n.js';
import { formatCount } from '../data/format.js';
import { badgeTitle } from '../brands/shared/text.js';
import { describeState, fmtDate } from './describe.js';

/** 兜底的刻度环：铸币画不出来时显示。120 道径向刻度，按解锁比例点亮。 */
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
 * @param {() => void} opts.onShare
 * @param {() => void} opts.onShelf   生成 GitHub 主页徽章图
 */
export function createProfile({ root, items, daily, onSelect, onShare, onShelf }) {
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
        <figure class="profile-coin" data-coin>
          ${tickRing(total ? h.unlocked.length / total : 0)}
          <img alt="" draggable="false" hidden />
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
    stats,
    unlocked: h.unlocked.length,
    total,
    setThumbnail(id, src) {
      el.querySelectorAll(`.profile-item[data-id="${id}"] img`).forEach((img) => (img.src = src));
    },
    /** 铸币画好后换掉兜底的刻度环。币面已经写着解锁数：下方的数字只留给检查脚本，读屏只读图片的替代文字。 */
    setCoin(src) {
      const fig = el.querySelector('[data-coin]');
      const img = fig.querySelector('img');
      img.src = src;
      img.alt = t('profile.coinAlt', { n: h.unlocked.length, total });
      img.hidden = false;
      fig.querySelector('.profile-count').setAttribute('aria-hidden', 'true');
      fig.classList.add('has-coin');
    },
  };
}
