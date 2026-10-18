import './style.css';
import { Group } from 'three';
import brand from './brands/claude-code/brand.js';
import badgeConfigs from './brands/claude-code/badges.js';
import { buildBadge } from './engine/badge.js';
import { partitionBadges, validateBrand } from './engine/validate.js';
import { loadProgress } from './data/progress.js';
import { createStage, supportsWebGL } from './viewer/scene.js';
import { createWall } from './viewer/wall.js';
import { createInspector } from './viewer/inspector.js';
import { playAward } from './viewer/award-animation.js';
import { downloadDataURL, renderBadgePNG } from './viewer/export.js';
import { Tweens } from './viewer/anim.js';

const $ = (sel, root = document) => root.querySelector(sel);
const fmtDate = (iso) => (iso ? iso.replaceAll('-', '.') : '');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showNotice(text) {
  const el = $('#notice');
  el.textContent = text;
  el.hidden = false;
}

function fatal(text) {
  document.body.innerHTML = `<div class="fatal">${text}</div>`;
}

function makeLabel(cfg, state) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'label' + (state.unlocked ? '' : ' is-locked');
  el.setAttribute('aria-label', `${cfg.title}，${state.unlocked ? '已获得' : '未解锁'}，查看详情`);
  const { current, target } = state.progress;
  el.innerHTML = state.unlocked
    ? `<span class="label-title"></span><span class="label-meta">${fmtDate(state.earnedAt)}</span>`
    : `<span class="label-title"></span>
       <span class="mini-meter"><span class="meter-track"><span class="meter-fill" style="display:block;width:${(current / target) * 100}%"></span></span>
       <span class="label-meta">${current} / ${target}</span></span>`;
  el.querySelector('.label-title').textContent = cfg.title;
  return el;
}

async function main() {
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

  const { progress, error } = await loadProgress(brand.id, valid);

  // 设计预览：?preview=unlocked 或 ?preview=locked 临时覆盖全部状态
  const preview = new URLSearchParams(location.search).get('preview');
  if (preview === 'unlocked' || preview === 'locked') {
    for (const c of valid) {
      const p = progress[c.id];
      p.unlocked = preview === 'unlocked';
      p.earnedAt = p.unlocked ? p.earnedAt ?? new Date().toISOString().slice(0, 10) : null;
      p.progress.current = p.unlocked ? p.progress.target : Math.min(p.progress.current, p.progress.target - 1);
    }
  }
  if (error) {
    console.error(error);
    notices.push('进度数据加载失败，徽章暂按未解锁展示。');
  }
  if (notices.length) showNotice(notices.join('\n'));

  $('[data-brand-name]').textContent = brand.name;
  document.title = `${brand.name} 成就徽章`;
  const unlockedCount = valid.filter((c) => progress[c.id].unlocked).length;
  $('[data-tally]').innerHTML = `<b>${unlockedCount}</b> / ${valid.length} 已解锁`;

  const stage = createStage($('#stage'));
  const labelsEl = $('#labels');
  const tweens = new Tweens();

  const items = valid.map((config) => {
    const state = progress[config.id];
    const badge = buildBadge(config, brand, state);
    stage.applyEnvironment(badge);
    const pivot = new Group();
    const holder = new Group();
    pivot.add(badge);
    holder.add(pivot);
    holder.scale.setScalar(0.001);
    stage.scene.add(holder);
    const label = makeLabel(config, state);
    labelsEl.appendChild(label);
    return { config, state, badge, pivot, holder, label };
  });

  // ---------- 单枚查看 ----------
  const inspectorEl = $('#inspector');
  const inspector = createInspector({ stage, items });
  let mode = 'wall';
  let exportBg = 'transparent';
  let awardRunning = false;

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
    $('[data-kicker]').textContent = state.unlocked ? `已获得 · ${fmtDate(state.earnedAt)}` : '未解锁';
    $('[data-kicker]').style.color = state.unlocked ? '' : 'var(--muted)';
    $('[data-title]').textContent = config.title;
    $('[data-title-en]').textContent = config.titleEn;
    $('[data-desc]').textContent = config.description;
    const meter = $('[data-meter]');
    meter.hidden = state.unlocked;
    if (!state.unlocked) {
      const { current, target } = state.progress;
      $('[data-meter-fill]').style.width = `${(current / target) * 100}%`;
      $('[data-meter-text]').textContent = `${current} / ${target}`;
    }
    $('[data-replay]').hidden = !state.unlocked;
  }

  function open(item, { award = true } = {}) {
    if (mode === 'inspect' && inspector.current === item) return;
    mode = 'inspect';
    wall.setActive(false);
    inspector.open(item);
    fillInfo(item);
    inspectorEl.hidden = false;
    requestAnimationFrame(() => inspectorEl.classList.add('is-open'));
    history.replaceState(null, '', `#${item.config.id}`);
    $('[data-close]').focus({ preventScroll: true });
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
    inspectorEl.classList.remove('is-open');
    inspectorEl.hidden = true;
    wall.setActive(true);
    history.replaceState(null, '', location.pathname + location.search);
    item?.label.focus({ preventScroll: true });
  }

  const wall = createWall({ stage, items, labelsEl, onSelect: (item) => open(item) });

  $('[data-close]').addEventListener('click', close);
  $('[data-replay]').addEventListener('click', runAward);
  for (const b of inspectorEl.querySelectorAll('[data-bg]')) {
    b.addEventListener('click', () => {
      exportBg = b.dataset.bg;
      inspectorEl.querySelectorAll('[data-bg]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    });
  }
  $('[data-export]').addEventListener('click', () => exportCurrent(exportBg));

  function exportCurrent(bg = 'transparent', { download = true } = {}) {
    const item = inspector.current;
    if (!item) return null;
    const dataURL = renderBadgePNG({
      stage,
      items,
      item,
      background: bg === 'ink' ? brand.palette.background : null,
    });
    const filename = `${brand.id}-${item.config.id}-${inspector.face}.png`;
    if (download) downloadDataURL(dataURL, filename);
    return { dataURL, filename };
  }

  window.addEventListener('keydown', (e) => {
    if (mode !== 'inspect') return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      inspector.spin.snapping = false;
      inspector.spin.vel += e.key === 'ArrowRight' ? 7 : -7;
    }
  });

  window.addEventListener('resize', () => {
    stage.resize();
    wall.layout();
    inspector.layoutChanged();
  });

  // ---------- 渲染循环 ----------
  let lastT = performance.now();
  stage.renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    const t = now / 1000;
    tweens.step(dt);
    if (mode === 'wall') wall.update(dt, t);
    else inspector.update(dt);
    for (const item of items) {
      for (const m of item.badge.userData.pulses) {
        m.emissiveIntensity = 0.06 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3.4));
      }
    }
    stage.renderer.render(stage.scene, stage.camera);
  });

  // 支持通过 #徽章id 直接打开某一枚
  const fromHash = items.find((it) => `#${it.config.id}` === location.hash);
  if (fromHash) setTimeout(() => open(fromHash), 400);

  // 供自动化验证使用的小接口
  window.__badgeApp = {
    ready: true,
    ids: items.map((it) => it.config.id),
    open: (id, opts) => open(items.find((it) => it.config.id === id), opts),
    close,
    setAngle(a) {
      inspector.spin.angle = a;
      inspector.spin.vel = 0;
    },
    get face() {
      return inspector.face;
    },
    get spin() {
      return { ...inspector.spin };
    },
    exportPNG: (bg) => exportCurrent(bg, { download: false }),
  };
}

main().catch((e) => {
  console.error(e);
  fatal(`加载失败：${e.message}`);
});
