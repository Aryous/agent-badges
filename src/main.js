import './style.css';
import { Group } from 'three';
import { BRANDS, getBrand } from './brands/index.js';
import { buildBadge, setEngravingSize } from './engine/badge.js';
import { partitionBadges, validateBrand } from './engine/validate.js';
import { loadDaily, loadProgress, sourceInfo } from './data/progress.js';
import { createHeatmap, markersFrom } from './viewer/heatmap.js';
import { createProfile } from './viewer/profile.js';
import { renderPoster } from './viewer/poster.js';
import { renderShelves, shelfGroups } from './viewer/shelf.js';
import { applyStatic, formatBig, lang, t } from './viewer/i18n.js';
import { badgeDescription, badgeTitle, tierKey, tierLabel } from './brands/shared/text.js';
import { createStage, supportsWebGL } from './viewer/scene.js';
import { createGrid, describeState } from './viewer/grid.js';
import { createInspector } from './viewer/inspector.js';
import { playAward } from './viewer/award-animation.js';
import { EXPORT_FILL, downloadDataURL, renderBadgePNG } from './viewer/export.js';
import { createAccumulator, signature } from './viewer/accumulate.js';
import { Tweens } from './viewer/anim.js';
import { nextFrame } from './viewer/frame.js';

const $ = (sel, root = document) => root.querySelector(sel);
const fmtDate = (iso) => (iso ? iso.replaceAll('-', '.') : '');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const THUMB_SIZE = 480;

function showNotice(text) {
  const el = $('#notice');
  el.textContent = text;
  el.hidden = false;
}

function fatal(text) {
  document.body.innerHTML = `<div class="fatal">${text}</div>`;
}

/**
 * 设计预览：?preview=unlocked / locked 临时覆盖全部状态；
 * 分级徽章可再加 &tier=0..3 预览某一级（默认最高级）。
 */
function applyPreview(configs, progress) {
  const preview = params.get('preview');
  if (preview !== 'unlocked' && preview !== 'locked') return;
  const today = new Date().toISOString().slice(0, 10);
  for (const c of configs) {
    const p = progress[c.id];
    p.unlocked = preview === 'unlocked';
    p.earnedAt = p.unlocked ? p.earnedAt ?? today : null;
    if (c.tiers) {
      const want = params.has('tier') ? Number(params.get('tier')) : c.tiers.length - 1;
      const idx = Math.min(Math.max(want, 0), c.tiers.length - 1);
      p.tier = p.unlocked ? idx : null;
      p.value = p.unlocked ? c.tiers[idx].threshold : Math.floor(c.tiers[0].threshold / 2);
      const next = c.tiers[Math.min(idx + 1, c.tiers.length - 1)];
      p.progress = { current: p.value, target: p.unlocked ? next.threshold : c.tiers[0].threshold };
    } else {
      p.progress.current = p.unlocked ? p.progress.target : Math.min(p.progress.current, p.progress.target - 1);
    }
  }
}

const params = new URLSearchParams(location.search);
// 公开版（npx agent-badges profile 生成、放在 GitHub Pages 上给别人看）：文字改成「某某的徽章」
const PUBLIC = window.__AGENT_BADGES_PUBLIC__ ?? null;
// 有本机数据时只列有数据的工具：没装的工具不能用示例数据冒充。
// 只有在线演示（没有本机数据）或 ?source=mock 时才把两个工具的示例数据都列出来
const LOCAL = params.get('source') === 'mock' ? [] : BRANDS.filter((b) => window.__AGENT_BADGES_DATA__?.[b.brand.id]);
const AVAILABLE = LOCAL.length ? LOCAL : BRANDS;
const wantedBrand = params.get('brand');
const { brand, badges: badgeConfigs, series: SERIES } = AVAILABLE.find((b) => b.brand.id === wantedBrand) ?? AVAILABLE[0] ?? getBrand(wantedBrand);

/** 顶栏的品牌切换：切换时保留其他参数（如 preview），去掉锚点。 */
function renderBrandSwitch() {
  const nav = $('[data-brands]');
  for (const b of AVAILABLE) {
    const a = document.createElement('a');
    const p = new URLSearchParams(location.search);
    p.set('brand', b.brand.id);
    p.set('lang', lang);
    a.href = `?${p}`;
    a.textContent = b.brand.name;
    a.className = 'brand-tab' + (b.brand.id === brand.id ? ' is-active' : '');
    if (b.brand.id === brand.id) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }
  // 语言切换：链接到同一页面的另一种语言
  const sw = $('[data-lang-switch]');
  const other = lang === 'zh' ? 'en' : 'zh';
  const q = new URLSearchParams(location.search);
  q.set('lang', other);
  sw.href = `?${q}${location.hash}`;
  sw.textContent = other === 'zh' ? '中文' : 'EN';
  sw.lang = other === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.style.setProperty('--accent', brand.ui.accent);
  document.documentElement.dataset.brand = brand.id;
}

async function main() {
  applyStatic();
  renderBrandSwitch();
  if (!supportsWebGL()) {
    fatal(t('app.noWebGL'));
    return;
  }

  validateBrand(brand);
  const { valid, errors } = partitionBadges(badgeConfigs, brand);
  const notices = [];
  if (errors.length) {
    errors.forEach((e) => console.error(e));
    if (import.meta.env.DEV) notices.push(...errors.map((e) => e.message));
  }

  const forceMock = params.get('source') === 'mock';
  const { progress, error } = await loadProgress(brand.id, valid, undefined, { forceMock });
  const source = sourceInfo(brand.id, { forceMock });
  applyPreview(valid, progress);
  if (error) {
    console.error(error);
    notices.push(t('app.progressFailed'));
  }
  if (notices.length) showNotice(notices.join('\n'));

  document.title = PUBLIC ? t('app.publicTitle', { name: PUBLIC.name || 'Agent Badges', brand: brand.name }) : t('app.title', { brand: brand.name });
  const sourceEl = $('[data-source]');
  if (PUBLIC) {
    // 公开版只带日期（YYYY-MM-DD），按本地日期解析，避免时区把日子挪一天
    const at = new Date(`${source.generatedAt}T00:00:00`);
    sourceEl.textContent = t('source.public', {
      name: PUBLIC.name || 'Agent Badges',
      m: at.getMonth() + 1,
      d: at.getDate(),
      date: at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });
    const a = document.createElement('a');
    a.href = PUBLIC.home;
    a.className = 'source-link';
    a.textContent = t('source.getYours');
    sourceEl.append(' · ', a);
  } else if (source.kind === 'local') {
    const at = new Date(source.generatedAt);
    const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    sourceEl.textContent = t('source.local', {
      m: at.getMonth() + 1,
      d: at.getDate(),
      date: at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time,
    });
  } else {
    sourceEl.textContent = t('source.mock');
    sourceEl.title = t('source.mockHint');
    // 在线演示（GitHub Pages 的 /demo/）：给一个回到首页、看怎么装的入口
    if (location.pathname.includes('/demo/')) {
      const a = document.createElement('a');
      a.href = `../?lang=${lang}`;
      a.className = 'source-link';
      a.textContent = t('source.getYours');
      sourceEl.append(' · ', a);
    }
  }

  const stage = createStage($('#stage'));
  const accum = createAccumulator(stage, $('#stage-accum'));
  const tweens = new Tweens();
  const items = valid.map((config) => ({ config, state: progress[config.id], badge: null, pivot: null, holder: null }));

  /** 按需组装 3D 徽章；缩略图和单枚查看共用同一份。 */
  function ensureBuilt(item) {
    if (item.holder) return item;
    item.badge = buildBadge(item.config, brand, item.state, { lang });
    stage.applyEnvironment(item.badge);
    item.pivot = new Group();
    item.holder = new Group();
    item.pivot.add(item.badge);
    item.holder.add(item.pivot);
    return item;
  }

  // ---------- 档案 + 热力图 ----------
  // 热力图把所有工具叠在一起看，所以每个工具的按天用量和解锁日期都要读
  const others = await Promise.all(
    AVAILABLE.map(async (b) => {
      const isCurrent = b.brand.id === brand.id;
      const list = isCurrent ? valid : partitionBadges(b.badges, b.brand).valid;
      const p = isCurrent ? progress : (await loadProgress(b.brand.id, list, undefined, { forceMock })).progress;
      const daily = await loadDaily(b.brand.id, { forceMock });
      return { b, list, p, daily };
    }),
  );
  const markers = markersFrom(others.map((o) => ({ brand: o.b.brand, badges: o.list, progress: o.p })), brand.id);
  const heatSeries = others
    .filter((o) => Object.keys(o.daily).length || o.b.brand.id === brand.id)
    .map((o) => ({ id: o.b.brand.id, name: o.b.brand.name, color: o.b.brand.ui.accent, daily: o.daily }));
  const currentDaily = others.find((o) => o.b.brand.id === brand.id).daily;

  const select = (item, viaKeyboard) => open(item, { viaKeyboard });
  const profile = createProfile({
    root: $('#profile-slot'),
    items,
    daily: currentDaily,
    onSelect: select,
    onShare: (e) => openPoster({ viaKeyboard: e?.detail === 0 }),
    onShelf: (e) => openShelf({ viaKeyboard: e?.detail === 0 }),
  });
  // 「GitHub 主页图」是给本人用的，公开版不显示
  if (PUBLIC) profile.el.querySelector('[data-shelf]').hidden = true;
  const heatmap = createHeatmap({
    root: $('#heat-slot'),
    series: heatSeries,
    markers,
    onMarker: (m) => open(items.find((it) => it.config.id === m.id)),
  });

  // ---------- 陈列墙 ----------
  const grid = createGrid({
    root: $('#series'),
    series: SERIES,
    items,
    onSelect: select,
  });

  // 筛选：全部 / 已获得 / 未解锁
  const unlockedCount = items.filter((it) => it.state.unlocked).length;
  const FILTERS = [
    ['all', t('filter.all'), items.length],
    ['unlocked', t('filter.unlocked'), unlockedCount],
    ['locked', t('filter.locked'), items.length - unlockedCount],
  ];
  $('[data-wall-title]').textContent = t('wall.title');
  const filterEl = $('[data-filter]');
  filterEl.setAttribute('aria-label', t('filter.label'));
  for (const [mode, label, n] of FILTERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.filter = mode;
    b.innerHTML = `${label}<span class="seg-count">${n}</span>`;
    b.addEventListener('click', () => setFilter(mode));
    filterEl.appendChild(b);
  }
  function setFilter(mode) {
    const shown = grid.setFilter(mode);
    filterEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === mode)));
    const empty = $('[data-wall-empty]');
    empty.hidden = shown > 0;
    empty.textContent = t('filter.empty');
  }
  setFilter('all');

  // ---------- 分享海报 ----------
  const posterEl = $('#poster');
  const posterDownload = $('[data-poster-download]');
  let posterURL = null;
  $('[data-poster-title]').textContent = t('poster.title');
  $('[data-poster-close]').setAttribute('aria-label', t('poster.close'));
  posterDownload.textContent = t('poster.download');
  let posterOpener = null;

  async function openPoster({ viaKeyboard = false } = {}) {
    posterOpener = document.activeElement;
    posterEl.hidden = false;
    document.body.classList.add('is-modal');
    const preview = $('[data-poster-preview]');
    preview.innerHTML = `<p class="poster-making">${t('poster.making')}</p>`;
    posterDownload.disabled = true;
    if (viaKeyboard) $('[data-poster-close]').focus({ preventScroll: true });
    await thumbsDone;
    const canvas = await renderPoster({
      brand,
      items: items.map((it) => ({ ...it, thumb: it.thumb })),
      stats: profile.stats,
      // 海报是单个工具的成绩单，热力图也只画这个工具
      heat: {
        year: heatmap.year,
        series: heatSeries.filter((x) => x.id === brand.id),
        markers: Object.fromEntries(
          Object.entries(markers)
            .map(([d, ms]) => [d, ms.filter((m) => m.brandId === brand.id)])
            .filter(([, ms]) => ms.length),
        ),
      },
    });
    posterURL = canvas.toDataURL('image/png');
    const img = new Image();
    img.alt = t('poster.title');
    img.src = posterURL;
    preview.replaceChildren(img);
    posterDownload.disabled = false;
  }
  function closePoster() {
    if (posterEl.hidden) return;
    posterEl.hidden = true;
    document.body.classList.remove('is-modal');
    posterOpener?.focus?.({ preventScroll: true });
  }
  $('[data-poster-close]').addEventListener('click', closePoster);
  posterEl.addEventListener('click', (e) => e.target === posterEl && closePoster());
  posterDownload.addEventListener('click', () => {
    if (posterURL) downloadDataURL(posterURL, `${brand.id}-badges-${heatmap.year}.png`);
  });
  window.addEventListener('keydown', (e) => e.key === 'Escape' && closePoster());

  // ---------- GitHub 主页徽章图 ----------
  // npx agent-badges shelf 会带着 ?task=shelf&nonce=… 打开页面：自动生成，再交回命令行保存
  const shelfEl = $('#shelf');
  const shelfDownload = $('[data-shelf-download]');
  const shelfStatus = $('[data-shelf-status]');
  // themes：命令行要哪几张（主页图要深色、浅色两张）
  const task = params.get('task') === 'shelf' ? { nonce: params.get('nonce') ?? '', themes: (params.get('themes') ?? 'dark').split(',').filter((x) => ['dark', 'light'].includes(x)) } : null;
  const shelfLang = ['en', 'zh'].includes(params.get('shelfLang')) ? params.get('shelfLang') : lang;
  let shelfURL = null;
  let shelfBusy = null;
  let shelfOpener = null;
  $('[data-shelf-title]').textContent = t('shelf.title');
  $('[data-shelf-close]').setAttribute('aria-label', t('poster.close'));
  shelfDownload.textContent = t('poster.download');

  async function sendShelf(canvases) {
    shelfStatus.textContent = t('shelf.sending');
    try {
      let body = {};
      // 依次交回；命令行收齐所有主题后才回复最后一张
      for (const theme of task.themes) {
        const blob = await new Promise((r) => canvases[theme].toBlob(r, 'image/png'));
        const res = await fetch(`/__agent-badges/shelf?nonce=${encodeURIComponent(task.nonce)}&theme=${theme}`, {
          method: 'POST',
          headers: { 'content-type': 'image/png' },
          body: blob,
        });
        body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      shelfStatus.textContent = t('shelf.saved', { file: body.file });
    } catch (e) {
      shelfStatus.textContent = t('shelf.failed', { msg: e.message });
    }
  }

  async function makeShelf() {
    const preview = $('[data-shelf-preview]');
    const making = document.createElement('p');
    making.className = 'poster-making';
    preview.replaceChildren(making);
    shelfDownload.disabled = true;
    shelfStatus.textContent = '';
    const groups = await shelfGroups({ only: task ? params.get('brand') : null, forceMock });
    if (!groups.length) {
      making.textContent = t('shelf.empty');
      return;
    }
    const canvases = await renderShelves(groups, {
      lang: shelfLang,
      themes: task ? [...new Set(['dark', ...task.themes])] : ['dark'],
      onProgress: (done, total) => (making.textContent = t('shelf.making', { done, total })),
    });
    shelfURL = canvases.dark.toDataURL('image/png');
    const img = new Image();
    img.alt = t('shelf.title');
    img.src = shelfURL;
    preview.replaceChildren(img);
    shelfDownload.disabled = false;
    if (task) await sendShelf(canvases);
    else shelfStatus.textContent = t('shelf.hint');
  }

  async function openShelf({ viaKeyboard = false } = {}) {
    shelfOpener = document.activeElement;
    shelfEl.hidden = false;
    document.body.classList.add('is-modal');
    if (viaKeyboard) $('[data-shelf-close]').focus({ preventScroll: true });
    // 生成过就直接显示；命令行交付只做一次
    shelfBusy ??= makeShelf().catch((e) => {
      console.error(e);
      shelfBusy = null;
      shelfStatus.textContent = t('app.loadFailed', { msg: e.message });
    });
    await shelfBusy;
  }
  function closeShelf() {
    if (shelfEl.hidden) return;
    shelfEl.hidden = true;
    document.body.classList.remove('is-modal');
    shelfOpener?.focus?.({ preventScroll: true });
  }
  $('[data-shelf-close]').addEventListener('click', closeShelf);
  shelfEl.addEventListener('click', (e) => e.target === shelfEl && closeShelf());
  shelfDownload.addEventListener('click', () => shelfURL && downloadDataURL(shelfURL, 'agent-badges-shelf.png'));
  window.addEventListener('keydown', (e) => e.key === 'Escape' && closeShelf());

  /** 逐枚渲染缩略图，每枚之间让出一帧，页面不会卡住。 */
  async function renderThumbnails() {
    for (const item of items) {
      ensureBuilt(item);
      if (mode === 'inspect' && inspector.current === item) continue;
      item.holder.position.set(0, 0, 0);
      item.holder.scale.setScalar(1);
      item.pivot.rotation.set(0, 0, 0);
      // 正在单枚查看的徽章也在场景里，渲染缩略图时先藏起来
      const live = inspector.current?.holder;
      if (live) live.visible = false;
      stage.scene.add(item.holder);
      const src = renderBadgePNG({ stage, items: [item], item, size: THUMB_SIZE, fill: 0.92 });
      stage.scene.remove(item.holder);
      if (live) live.visible = true;
      grid.setThumbnail(item, src);
      profile.setThumbnail(item.config.id, src);
      item.thumb = src;
      await nextFrame();
    }
  }

  // ---------- 单枚查看 ----------
  const overlay = $('#overlay');
  const inspectorEl = $('#inspector');
  const inspector = createInspector({ stage, items: [] });
  let mode = 'wall';
  let exportBg = 'transparent';
  let awardRunning = false;
  let closeTimer = null;

  async function runAward() {
    if (awardRunning || !inspector.current?.state.unlocked) return;
    awardRunning = true;
    $('[data-replay]').disabled = true;
    try {
      await playAward({ stage, tweens, inspector, palette: brand.palette, reducedMotion });
    } finally {
      awardRunning = false;
      $('[data-replay]').disabled = !inspector.current?.state.unlocked;
    }
  }

  function fillInfo(item) {
    const { config, state } = item;
    const d = describeState(config, state);
    const kicker = $('[data-kicker]');
    if (d.masked) kicker.textContent = t('state.hidden');
    else if (state.unlocked) kicker.textContent = `${d.tier ? d.meta : t('state.earned')} · ${fmtDate(state.earnedAt)}`;
    else kicker.textContent = t('state.locked');
    kicker.style.color = state.unlocked ? '' : 'var(--muted)';
    $('[data-title]').textContent = d.title;
    // 中文界面在标题下面再写一行英文；英文界面不需要
    const titleEn = $('[data-title-en]');
    titleEn.hidden = lang !== 'zh';
    titleEn.textContent = d.masked ? 'HIDDEN ACHIEVEMENT' : config.titleEn.replaceAll('{label}', d.tier?.label ?? config.tiers?.[0].label ?? '');
    $('[data-desc]').textContent = d.masked ? t('inspect.hiddenDesc', { brand: brand.name }) : badgeDescription(config, lang);
    // 顶级彩蛋：告诉用户这一级有几款、抽到了哪一款（没抽到的不展示）
    const topTier = config.tiers?.[state.tier ?? -1];
    if (!d.masked && topTier?.variants && state.variant != null) {
      $('[data-desc]').textContent += t('inspect.variant', { n: topTier.variants.length, name: tierLabel(topTier, state.variant, lang) });
    }

    // 等级阶梯
    const ladder = $('[data-tiers]');
    ladder.hidden = !config.tiers || d.masked;
    ladder.innerHTML = '';
    for (const [i, tier] of (config.tiers ?? []).entries()) {
      const li = document.createElement('li');
      const earned = state.tier !== null && i <= state.tier;
      // 有款式的那一级：抽到了写款式名，还没到写「隐藏款」
      const variant = i === state.tier ? state.variant : null;
      li.dataset.metal = tierKey(tier, variant);
      li.className = (earned ? 'is-earned' : '') + (i === state.tier ? ' is-current' : '');
      li.innerHTML = `<span class="dot"></span><span>${tierLabel(tier, variant, lang).replace(/级$/, '')}</span><span>${tier.label}</span>`;
      ladder.appendChild(li);
    }

    // 进度条：未解锁的普通徽章，或还没满级的分级徽章
    const maxed = config.tiers && state.tier === config.tiers.length - 1;
    const showMeter = !d.masked && (config.tiers ? !maxed : !state.unlocked);
    const meter = $('[data-meter]');
    meter.hidden = !showMeter;
    if (showMeter) {
      const { current, target } = state.progress;
      $('[data-meter-fill]').style.width = `${Math.min(100, (current / target) * 100)}%`;
      $('[data-meter-text]').textContent = `${formatBig(current)} / ${formatBig(target)}${config.tiers && state.unlocked ? t('inspect.toNext') : ''}`;
    }
    $('[data-replay]').hidden = !state.unlocked;
  }

  /** 顶栏 + 返回按钮、底部信息区各占多少像素，徽章放在中间。 */
  function measureReserve() {
    const info = inspectorEl.querySelector('.info').getBoundingClientRect();
    const back = $('[data-close]').getBoundingClientRect();
    return { top: back.bottom + 16, bottom: window.innerHeight - info.top + 20 };
  }

  function open(item, { award = true, viaKeyboard = false } = {}) {
    if (mode === 'inspect' && inspector.current === item) return;
    clearTimeout(closeTimer);
    if (inspector.current && inspector.current !== item) {
      stage.scene.remove(inspector.current.holder);
      setEngravingSize(inspector.current.badge, 1024);
    }
    ensureBuilt(item);
    mode = 'inspect';
    document.body.classList.add('is-inspecting');
    overlay.hidden = false;
    fillInfo(item);
    stage.resize();
    inspector.layoutChanged(measureReserve());

    item.pivot.rotation.set(0, 0, 0);
    const { layout } = inspector;
    item.holder.position.set(layout.x, layout.y, 0);
    item.holder.scale.setScalar(layout.scale * 0.6);
    stage.scene.add(item.holder);
    inspector.open(item);
    setExportPanel(false);
    startLoop();
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      inspectorEl.classList.add('is-open');
    });
    history.replaceState(null, '', `#${item.config.id}`);
    // 只有用键盘打开时才把焦点移进来，避免鼠标用户看到焦点框
    if (viaKeyboard) $('[data-close]').focus({ preventScroll: true });
    if (award && item.state.unlocked) runAward();
  }

  function close() {
    if (mode !== 'inspect') return;
    tweens.cancel('award');
    awardRunning = false;
    stage.sweep.intensity = 0;
    const item = inspector.current;
    inspector.close();
    mode = 'wall';
    overlay.classList.remove('is-open');
    inspectorEl.classList.remove('is-open');
    setExportPanel(false);
    document.body.classList.remove('is-inspecting');
    history.replaceState(null, '', location.pathname + location.search);
    closeTimer = setTimeout(() => {
      overlay.hidden = true;
      if (item) {
        stage.scene.remove(item.holder);
        setEngravingSize(item.badge, 1024); // 离开近看，换回省显存的版本
      }
      stopLoop();
    }, 320);
    item?.tile.focus({ preventScroll: true });
  }

  $('[data-close]').addEventListener('click', close);
  $('[data-replay]').addEventListener('click', runAward);

  // ---------- 导出面板 ----------
  // 背景选项只影响导出文件，所以收在面板里；面板打开时才显示导出取景框。
  const exportFrame = $('#export-frame');
  const exportPanel = $('#export-panel');
  const exportToggle = $('[data-export-toggle]');
  const FACE_LABEL = { front: t('export.front'), back: t('export.back') };

  function setExportPanel(open) {
    exportPanel.hidden = !open;
    exportToggle.setAttribute('aria-expanded', String(open));
    exportFrame.classList.toggle('is-visible', open);
    if (open) {
      placeExportFrame();
      $('[data-export-face]').textContent = FACE_LABEL[inspector.face];
    }
  }
  exportToggle.addEventListener('click', () => setExportPanel(exportPanel.hidden));
  inspector.onFaceChange((face) => ($('[data-export-face]').textContent = FACE_LABEL[face]));
  // 点面板以外的界面元素时收起；拖动画布旋转徽章不收起，方便转到背面再导出
  document.addEventListener('pointerdown', (e) => {
    if (exportPanel.hidden || e.target.closest('.export') || e.target.id === 'stage') return;
    setExportPanel(false);
  });

  for (const b of inspectorEl.querySelectorAll('[data-bg]')) {
    b.addEventListener('click', () => {
      exportBg = b.dataset.bg;
      exportFrame.dataset.bg = exportBg;
      inspectorEl.querySelectorAll('[data-bg]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    });
  }

  /** 把预览框放到导出 PNG 的取景范围上（以单枚查看的最终位置为准）。 */
  function placeExportFrame() {
    const { layout } = inspector;
    const { view } = stage;
    const pxPerUnit = view.height / 2 / view.halfH;
    const half = (layout.r / EXPORT_FILL) * pxPerUnit;
    const cx = view.width / 2 + layout.x * pxPerUnit;
    const cy = view.height / 2 - layout.y * pxPerUnit;
    exportFrame.style.width = exportFrame.style.height = `${half * 2}px`;
    exportFrame.style.transform = `translate(${cx - half}px, ${cy - half}px)`;
    exportFrame.style.borderRadius = `${Math.round(half * 0.12)}px`;
  }
  $('[data-export]').addEventListener('click', () => {
    exportCurrent(exportBg);
    setExportPanel(false);
  });

  function exportCurrent(bg = 'transparent', { download = true } = {}) {
    const item = inspector.current;
    if (!item) return null;
    const dataURL = renderBadgePNG({
      stage,
      items: [item],
      item,
      background: bg === 'ink' ? brand.palette.background : null,
    });
    const tier = item.config.tiers && item.state.tier !== null ? `-${item.config.tiers[item.state.tier].metal}` : '';
    const filename = `${brand.id}-${item.config.id}${tier}-${inspector.face}.png`;
    if (download) downloadDataURL(dataURL, filename);
    return { dataURL, filename };
  }

  window.addEventListener('keydown', (e) => {
    if (mode !== 'inspect') return;
    if (e.key === 'Escape') {
      if (!exportPanel.hidden) setExportPanel(false);
      else close();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      inspector.spin.snapping = false;
      inspector.spin.vel += e.key === 'ArrowRight' ? 7 : -7;
    }
  });

  window.addEventListener('resize', () => {
    if (mode !== 'inspect') return;
    stage.resize();
    inspector.layoutChanged(measureReserve());
    if (!exportPanel.hidden) placeExportFrame();
  });

  // ---------- 渲染循环：只在单枚查看时运行 ----------
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    tweens.step(dt);
    inspector.update(dt);
    const t = now / 1000;
    const current = inspector.current;
    for (const m of current?.badge.userData.pulses ?? []) {
      m.emissiveIntensity = 0.06 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3.4));
    }
    // 静止时超采样；呼吸发光不算移动
    const { camera, sweep } = stage;
    const h = current?.holder;
    const still = accum.render(
      signature([
        ...(h ? [h.position.x, h.position.y, h.position.z, h.scale.x, current.pivot.rotation.x, current.pivot.rotation.y] : []),
        camera.position.x, camera.position.y, camera.position.z, camera.zoom,
        sweep.intensity, sweep.position.x, sweep.position.y,
      ]),
    );
    // 停稳一小会儿后，背面刻字换成 2048 的清晰版本。上传大贴图会卡一下，静止时看不出来
    if (still === 12 && current && setEngravingSize(current.badge, 2048)) accum.restart();
  }
  function startLoop() {
    lastT = performance.now();
    stage.renderer.setAnimationLoop(loop);
  }
  function stopLoop() {
    stage.renderer.setAnimationLoop(null);
    accum.reset();
  }

  // 供自动化验证使用的小接口
  const thumbsDone = renderThumbnails();
  window.__badgeApp = {
    ready: false,
    ids: items.map((it) => it.config.id),
    open: (id, opts) => open(items.find((it) => it.config.id === id), opts),
    close,
    setAngle(a) {
      inspector.spin.angle = a;
      inspector.spin.vel = 0;
    },
    /** 把徽章钉在某个角度（不吸附），用于检查斜角下的材质。 */
    hold(angle, tilt = 0) {
      inspector.override.active = true;
      inspector.override.z = 0;
      inspector.override.scaleMul = 1;
      inspector.spin.angle = angle;
      inspector.spin.tilt = tilt;
    },
    get face() {
      return inspector.face;
    },
    get spin() {
      return { ...inspector.spin };
    },
    exportPNG: (bg) => exportCurrent(bg, { download: false }),
    openPoster,
    get posterURL() {
      return posterURL;
    },
    openShelf,
    get shelfURL() {
      return shelfURL;
    },
    setFilter,
    heatmap,
  };

  // 支持通过 #徽章id 直接打开某一枚
  const fromHash = items.find((it) => `#${it.config.id}` === location.hash);
  if (fromHash) open(fromHash);
  if (task) openShelf();

  await thumbsDone;
  window.__badgeApp.ready = true;
}

main().catch((e) => {
  console.error(e);
  fatal(t('app.loadFailed', { msg: e.message }));
});
