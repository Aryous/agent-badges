import './style.css';
import { Group } from 'three';
import { BRANDS, getBrand } from './brands/index.js';
import { buildBadge } from './engine/badge.js';
import { partitionBadges, validateBrand } from './engine/validate.js';
import { TIER_NAMES } from './engine/tiers.js';
import { loadProgress, sourceInfo } from './data/progress.js';
import { createStage, supportsWebGL } from './viewer/scene.js';
import { createGrid, describeState, formatCount } from './viewer/grid.js';
import { createInspector } from './viewer/inspector.js';
import { playAward } from './viewer/award-animation.js';
import { EXPORT_FILL, downloadDataURL, renderBadgePNG } from './viewer/export.js';
import { Tweens } from './viewer/anim.js';

const $ = (sel, root = document) => root.querySelector(sel);
const fmtDate = (iso) => (iso ? iso.replaceAll('-', '.') : '');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
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
const { brand, badges: badgeConfigs, series: SERIES } = getBrand(params.get('brand'));

/** 顶栏的品牌切换：切换时保留其他参数（如 preview），去掉锚点。 */
function renderBrandSwitch() {
  const nav = $('[data-brands]');
  for (const b of BRANDS) {
    const a = document.createElement('a');
    const p = new URLSearchParams(location.search);
    p.set('brand', b.brand.id);
    a.href = `?${p}`;
    a.textContent = b.brand.name;
    a.className = 'brand-tab' + (b.brand.id === brand.id ? ' is-active' : '');
    if (b.brand.id === brand.id) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }
  document.documentElement.style.setProperty('--accent', brand.ui.accent);
  document.documentElement.dataset.brand = brand.id;
}

async function main() {
  renderBrandSwitch();
  if (!supportsWebGL()) {
    fatal('当前浏览器不支持 WebGL，无法显示 3D 徽章。');
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
    notices.push('进度数据加载失败，徽章暂按未解锁展示。');
  }
  if (notices.length) showNotice(notices.join('\n'));

  document.title = `${brand.name} 成就徽章`;
  const unlockedCount = valid.filter((c) => progress[c.id].unlocked).length;
  $('[data-tally]').innerHTML = `<b>${unlockedCount}</b> / ${valid.length} 已解锁`;
  const sourceEl = $('[data-source]');
  if (source.kind === 'local') {
    const t = new Date(source.generatedAt);
    sourceEl.textContent = `本机数据 · 更新于 ${t.getMonth() + 1} 月 ${t.getDate()} 日 ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  } else {
    sourceEl.textContent = '示例数据';
    sourceEl.title = `运行 npm run collect 生成本机数据`;
  }

  const stage = createStage($('#stage'));
  const tweens = new Tweens();
  const items = valid.map((config) => ({ config, state: progress[config.id], badge: null, pivot: null, holder: null }));

  /** 按需组装 3D 徽章；缩略图和单枚查看共用同一份。 */
  function ensureBuilt(item) {
    if (item.holder) return item;
    item.badge = buildBadge(item.config, brand, item.state);
    stage.applyEnvironment(item.badge);
    item.pivot = new Group();
    item.holder = new Group();
    item.pivot.add(item.badge);
    item.holder.add(item.pivot);
    return item;
  }

  // ---------- 陈列墙 ----------
  const grid = createGrid({
    root: $('#wall'),
    series: SERIES,
    items,
    onSelect: (item, viaKeyboard) => open(item, { viaKeyboard }),
  });

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
    if (d.masked) kicker.textContent = '隐藏成就';
    else if (state.unlocked) kicker.textContent = d.tier ? `${d.meta} · ${fmtDate(state.earnedAt)}` : `已获得 · ${fmtDate(state.earnedAt)}`;
    else kicker.textContent = '未解锁';
    kicker.style.color = state.unlocked ? '' : 'var(--muted)';
    $('[data-title]').textContent = d.title;
    $('[data-title-en]').textContent = d.masked ? 'HIDDEN ACHIEVEMENT' : config.titleEn.replaceAll('{label}', d.tier?.label ?? config.tiers?.[0].label ?? '');
    $('[data-desc]').textContent = d.masked
      ? `这是一枚隐藏成就。继续探索 ${brand.name}，它会在某个时刻揭晓。`
      : config.description;

    // 等级阶梯
    const ladder = $('[data-tiers]');
    ladder.hidden = !config.tiers || d.masked;
    ladder.innerHTML = '';
    for (const [i, t] of (config.tiers ?? []).entries()) {
      const li = document.createElement('li');
      li.dataset.metal = t.metal;
      const earned = state.tier !== null && i <= state.tier;
      li.className = (earned ? 'is-earned' : '') + (i === state.tier ? ' is-current' : '');
      li.innerHTML = `<span class="dot"></span><span>${TIER_NAMES[t.metal] ?? t.metal}</span><span>${t.label}</span>`;
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
      $('[data-meter-text]').textContent = `${formatCount(current)} / ${formatCount(target)}${config.tiers && state.unlocked ? ' 距下一级' : ''}`;
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
    if (inspector.current && inspector.current !== item) stage.scene.remove(inspector.current.holder);
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
      if (item) stage.scene.remove(item.holder);
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
  const FACE_LABEL = { front: '正面', back: '背面' };

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
    for (const m of inspector.current?.badge.userData.pulses ?? []) {
      m.emissiveIntensity = 0.06 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3.4));
    }
    stage.renderer.render(stage.scene, stage.camera);
  }
  function startLoop() {
    lastT = performance.now();
    stage.renderer.setAnimationLoop(loop);
  }
  function stopLoop() {
    stage.renderer.setAnimationLoop(null);
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
  };

  // 支持通过 #徽章id 直接打开某一枚
  const fromHash = items.find((it) => `#${it.config.id}` === location.hash);
  if (fromHash) open(fromHash);

  await thumbsDone;
  window.__badgeApp.ready = true;
}

main().catch((e) => {
  console.error(e);
  fatal(`加载失败：${e.message}`);
});
