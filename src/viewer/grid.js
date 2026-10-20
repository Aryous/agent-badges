import { badgeTitle, seriesSubtitle, seriesTitle, tierKey, tierLabel } from '../brands/shared/text.js';
import { formatBig, lang, t } from '../i18n.js';

// 陈列墙：按系列分组的网格。徽章是预先渲染好的静态图，
// 悬停时用 CSS 3D 倾斜 + 高光模拟立体感；点开后才进入实时 3D。

const fmtDate = (iso) => (iso ? iso.replaceAll('-', '.') : '');

/** 陈列墙和详情里共用的状态文字。 */
export function describeState(config, state) {
  const masked = config.hidden && !state.unlocked;
  if (masked) return { title: '???', meta: t('state.hidden'), masked };
  const title = badgeTitle(config, lang, state.tier);
  if (config.tiers && state.unlocked) {
    const raw = config.tiers[state.tier];
    const tier = { ...raw, metal: tierKey(raw, state.variant) };
    // 英文标题里已经带着数值（100 Sessions），只写等级名；顶级写抽到的款式
    const name = tierLabel(raw, state.variant, lang);
    const meta = lang === 'zh' ? `${name} · ${tier.label}` : name;
    return { title, meta, tier, masked };
  }
  if (state.unlocked) return { title, meta: fmtDate(state.earnedAt), masked };
  return { title, meta: null, masked };
}

export function createGrid({ root, series, items, onSelect }) {
  const byId = new Map(items.map((it) => [it.config.id, it]));
  const sections = [];

  for (const s of series) {
    const members = s.badges.map((b) => byId.get(b.id)).filter(Boolean);
    if (!members.length) continue;
    const unlocked = members.filter((it) => it.state.unlocked).length;
    const section = document.createElement('section');
    section.className = 'series';
    section.innerHTML = `
      <header class="series-head">
        <h2 class="series-title"></h2>
        <span class="series-sub"></span>
        <span class="series-count"><b>${unlocked}</b> / ${members.length}</span>
      </header>
      <div class="tiles"></div>`;
    section.querySelector('.series-title').textContent = seriesTitle(s, lang);
    section.querySelector('.series-sub').textContent = seriesSubtitle(s, lang) ?? '';
    const tiles = section.querySelector('.tiles');
    for (const item of members) tiles.appendChild(makeTile(item));
    root.appendChild(section);
    sections.push({ section, members });
  }

  function makeTile(item) {
    const { config, state } = item;
    const d = describeState(config, state);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tile is-loading' + (state.unlocked ? '' : ' is-locked');
    el.dataset.id = config.id;
    el.setAttribute('aria-label', t('tile.aria', { title: d.title, state: t(state.unlocked ? 'state.earned' : 'state.locked') }));
    const { current, target } = state.progress;
    const pct = Math.min(100, (current / target) * 100);
    const meta = d.meta
      ? `<span class="tile-meta"></span>`
      : `<span class="mini-meter"><span class="meter-track"><span class="meter-fill" style="width:${pct}%"></span></span>
         <span class="tile-meta">${formatBig(current)} / ${formatBig(target)}</span></span>`;
    el.innerHTML = `
      <span class="tile-art"><img alt="" draggable="false" /><span class="tile-glare"></span></span>
      <span class="tile-title"></span>
      ${meta}`;
    el.querySelector('.tile-title').textContent = d.title;
    if (d.meta) el.querySelector('.tile-meta').textContent = d.meta;
    if (d.tier) el.dataset.metal = d.tier.metal;

    // 悬停倾斜：指针在哪，徽章就朝哪边翻一点，高光跟着走
    const art = el.querySelector('.tile-art');
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      art.style.setProperty('--ry', `${x * 22}deg`);
      art.style.setProperty('--rx', `${-y * 22}deg`);
      art.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
      art.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    });
    el.addEventListener('pointerleave', () => {
      art.style.setProperty('--rx', '0deg');
      art.style.setProperty('--ry', '0deg');
    });
    // detail 为 0 表示由键盘（回车/空格）触发
    el.addEventListener('click', (e) => onSelect(item, e.detail === 0));
    item.tile = el;
    return el;
  }

  return {
    /** 筛选：all 全部 / unlocked 已获得 / locked 未解锁（含未满级以外的未解锁）。返回可见数量。 */
    setFilter(mode) {
      let shown = 0;
      for (const { section, members } of sections) {
        let n = 0;
        for (const it of members) {
          const visible = mode === 'all' || (mode === 'unlocked') === it.state.unlocked;
          it.tile.hidden = !visible;
          if (visible) n += 1;
        }
        section.hidden = n === 0;
        shown += n;
      }
      return shown;
    },
    setThumbnail(item, src) {
      const img = item.tile.querySelector('img');
      img.src = src;
      // 高光只叠在徽章本身（用缩略图的透明通道做遮罩）
      item.tile.querySelector('.tile-art').style.setProperty('--mask', `url(${src})`);
      img.decode?.().catch(() => {}).finally(() => item.tile.classList.remove('is-loading'));
    },
  };
}
