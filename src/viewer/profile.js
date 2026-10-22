// 成就档案：解锁进度环 + 三个关键数字，旁边是「最近获得」和「即将解锁」。
import { highlights } from '../data/highlights.js';
import { dailyStats } from '../data/daily.js';
import { lang, t } from './i18n.js';
import { formatCount } from '../data/format.js';
import { badgeTitle } from '../brands/shared/text.js';
import { describeState, fmtDate } from './describe.js';

/** 进度环：Apple 健身圆环那样的一圈，按解锁比例填满。 */
function ring(ratio) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return `<svg class="profile-ring" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="${r}" class="ring-track" />
    <circle cx="60" cy="60" r="${r}" class="ring-fill" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - ratio)}" />
  </svg>`;
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
    <div class="profile-main">
      <div class="profile-ring-wrap">
        ${ring(total ? h.unlocked.length / total : 0)}
        <div class="profile-count"><b>${h.unlocked.length}</b><span>/ ${total}</span></div>
      </div>
      <div class="profile-facts">
        <p class="profile-caption">${t('profile.unlocked')}</p>
        <dl class="profile-stats">
          <div><dt>${t('profile.tokens')}</dt><dd>${formatCount(stats.tokens)}</dd></div>
          <div><dt>${t('profile.activeDays')}</dt><dd>${stats.activeDays}</dd></div>
          <div><dt>${t('profile.streak')}</dt><dd>${t('profile.days', { n: stats.longestStreak })}</dd></div>
        </dl>
        <div class="profile-actions">
          <button class="btn btn-primary profile-share" type="button" data-share>${t('profile.share')}</button>
          <button class="btn" type="button" data-shelf>${t('profile.shelf')}</button>
        </div>
      </div>
    </div>
    <div class="profile-col">
      <h3 class="profile-head">${t('profile.recent')}</h3>
      <ul class="profile-list" data-recent></ul>
    </div>
    <div class="profile-col">
      <h3 class="profile-head">${t('profile.next')}</h3>
      <ul class="profile-list" data-next></ul>
    </div>`;
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
  };
}
