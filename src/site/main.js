// 落地页：首屏一枚实时旋转的 3D 徽章，下面是徽章画廊、年度热力图（示例数据）、隐私说明。
// showcase: 手工挑选的展示徽章，id 由 tests/contracts.test.js 核对
import '../style.css';
import './site.css';
import { Group } from 'three';
import { BRANDS } from '../brands/index.js';
import { buildBadge } from '../engine/badge.js';
import { badgeTitle } from '../brands/shared/text.js';
import { loadAllProgress } from '../data/brand-progress.js';
import { addStrings, applyStatic, lang, t } from '../viewer/i18n.js';
import { createStage, supportsWebGL } from '../viewer/scene.js';
import { renderBadgePNG } from '../viewer/snapshot.js';
import { mountBadge } from '../viewer/mount-badge.js';
import { createHeatmap, markersFrom } from '../viewer/heatmap.js';
import { LOGO_STATE, logoBadge, logoBrand } from '../project/logo.js';
import STRINGS from './strings.js';

addStrings(STRINGS);
const $ = (s) => document.querySelector(s);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// 开发服务器里演示页就是首页；发布后在 ./demo/
const DEMO = import.meta.env.DEV ? '/' : './demo/';
const demoURL = (brand, id) => {
  const q = new URLSearchParams({ lang });
  if (brand) q.set('brand', brand);
  return `${DEMO}?${q}${id ? `#${id}` : ''}`;
};

/** 展示用的状态：分级徽章看最高级，隐藏徽章保持神秘。 */
function showcaseState(config) {
  if (config.hidden) return { unlocked: false, earnedAt: null, tier: null, value: 0, progress: { current: 0, target: 1 } };
  const tier = config.tiers ? config.tiers.length - 1 : null;
  return { unlocked: true, earnedAt: '2026-10-24', tier, value: 0, progress: { current: 1, target: 1 } };
}

function setupText() {
  applyStatic();
  document.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  document.title = t('site.title');
  document.querySelector('meta[name="description"]').content = t('site.desc');
  document.querySelectorAll('[data-demo-link]').forEach((a) => (a.href = demoURL()));
  const sw = $('[data-lang-switch]');
  const other = lang === 'zh' ? 'en' : 'zh';
  sw.href = `?lang=${other}`;
  sw.textContent = other === 'zh' ? '中文' : 'EN';
  // 复制按钮：data-copy 有值就复制它，没有就复制首屏命令
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy || 'npx agent-badges');
        btn.textContent = t('hero.copied');
        setTimeout(() => (btn.textContent = t('hero.copy')), 1600);
      } catch {
        // 剪贴板不可用时什么也不做，命令本身就在旁边
      }
    });
  });
}

// ---------- 首屏：轮流展示几枚徽章，可拖动 ----------

const HERO = [
  { brand: 'logo' },
  { brand: 'claude-code', id: 'first-session' },
  { brand: 'codex', id: 'tokens' },
  { brand: 'claude-code', id: 'marathon' },
  { brand: 'codex', id: 'night-owl' },
  { brand: 'claude-code', id: 'tokens' },
];

function heroItem(entry) {
  let brand, config, state;
  if (entry.brand === 'logo') {
    brand = logoBrand;
    config = logoBadge;
    state = LOGO_STATE;
  } else {
    const b = BRANDS.find((x) => x.brand.id === entry.brand);
    brand = b.brand;
    config = b.badges.find((x) => x.id === entry.id);
    state = showcaseState(config);
  }
  return { brand, config, state };
}

function startHero() {
  const canvas = $('#hero-stage');
  const stage = createStage(canvas);
  // 首屏只有一枚徽章，一直在转，用不上静止超采样；直接按 2 倍像素渲染，普通屏幕上边缘也细腻
  stage.renderer.setPixelRatio(2);
  stage.resize();
  const caption = $('[data-hero-caption]');
  const holder = new Group();
  const pivot = new Group();
  holder.add(pivot);
  stage.scene.add(holder);
  const built = new Map();
  let index = 0;
  let current = null;

  const spin = { angle: 0, vel: 0.55, dragging: false, lastX: 0, lastT: 0 };
  const swap = { t: 1, from: null }; // t: 0 → 1，换下一枚时的缩放过渡

  function show(i) {
    const entry = HERO[i % HERO.length];
    const key = `${entry.brand}/${entry.id ?? ''}`;
    if (!built.has(key)) {
      const { brand, config, state } = heroItem(entry);
      const badge = buildBadge(config, brand, state, { lang });
      stage.applyEnvironment(badge);
      built.set(key, { badge, brand, config, state });
    }
    const next = built.get(key);
    if (current) pivot.remove(current.badge);
    pivot.add(next.badge);
    current = next;
    caption.textContent =
      entry.brand === 'logo' ? 'Agent Badges' : `${next.brand.name} · ${badgeTitle(next.config, lang, next.state.tier)}`;
  }

  function fit() {
    stage.resize();
    holder.scale.setScalar(stage.view.halfH * 0.78);
  }

  canvas.addEventListener('pointerdown', (e) => {
    spin.dragging = true;
    spin.lastX = e.clientX;
    spin.lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!spin.dragging) return;
    const now = performance.now();
    const dx = e.clientX - spin.lastX;
    spin.angle += dx * 0.012;
    spin.vel = (dx * 0.012) / Math.max(0.008, (now - spin.lastT) / 1000);
    spin.lastX = e.clientX;
    spin.lastT = now;
  });
  const release = () => (spin.dragging = false);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  window.addEventListener('resize', fit);

  show(0);
  fit();
  let last = performance.now();
  let shownFor = 0;
  const HOLD = 6; // 每枚展示几秒
  stage.renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!spin.dragging) {
      // 被甩动后慢慢回到匀速
      const cruise = reducedMotion ? 0 : 0.55;
      spin.vel += (cruise - spin.vel) * Math.min(1, dt * 1.5);
      spin.angle += spin.vel * dt;
    }
    if (!reducedMotion && !spin.dragging) {
      shownFor += dt;
      if (shownFor > HOLD && swap.t >= 1) {
        swap.t = 0;
        shownFor = 0;
      }
    }
    // 换场：前半段缩小，中点换徽章，后半段放大
    if (swap.t < 1) {
      const before = swap.t;
      swap.t = Math.min(1, swap.t + dt / 0.7);
      if (before < 0.5 && swap.t >= 0.5) show(++index);
      const k = swap.t < 0.5 ? 1 - swap.t * 2 : (swap.t - 0.5) * 2;
      const ease = 1 - Math.pow(1 - k, 3);
      pivot.scale.setScalar(Math.max(0.001, ease));
    } else {
      pivot.scale.setScalar(1);
    }
    pivot.rotation.set(Math.sin(now / 1700) * 0.08, spin.angle, 0);
    stage.renderer.render(stage.scene, stage.camera);
  });
}

// ---------- 画廊：两个工具的全部徽章 ----------

function startGallery() {
  const stage = createStage($('#thumb-stage'));
  const root = $('[data-gallery]');
  const tabs = $('[data-gallery-tabs]');
  const cache = new Map();
  let token = 0;

  async function render(b) {
    const my = ++token;
    root.style.setProperty('--accent-tab', b.brand.ui.accent);
    root.innerHTML = '';
    const cells = b.badges.map((config) => {
      const state = showcaseState(config);
      const a = document.createElement('a');
      a.className = 'gallery-item' + (state.unlocked ? '' : ' is-locked');
      a.href = demoURL(b.brand.id, config.id);
      a.title = t('gallery.open');
      a.innerHTML = `<span class="gallery-art"><img alt="" /></span><span class="gallery-name"></span>`;
      a.querySelector('.gallery-name').textContent = config.hidden ? '???' : badgeTitle(config, lang, state.tier);
      root.appendChild(a);
      return { a, config, state };
    });
    for (const { a, config, state } of cells) {
      const key = `${b.brand.id}/${config.id}`;
      if (!cache.has(key)) {
        const item = mountBadge(config, b.brand, state, { stage, lang });
        stage.scene.add(item.holder);
        cache.set(key, renderBadgePNG({ stage, items: [item], item, size: 360, fill: 0.92 }));
        stage.scene.remove(item.holder);
        await nextFrame();
        if (my !== token) return; // 中途切换了标签
      }
      const img = a.querySelector('img');
      img.src = cache.get(key);
      img.decode?.().catch(() => {}).finally(() => a.classList.add('is-ready'));
    }
  }

  for (const b of BRANDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.textContent = `${b.brand.name}`;
    btn.innerHTML += `<span class="seg-count">${b.badges.length}</span>`;
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', String(x === btn)));
      tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === btn)));
      render(b);
    });
    tabs.appendChild(btn);
  }
  // 画廊滚到附近再开始渲染，不和首屏抢资源
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      tabs.querySelector('button').click();
    },
    { rootMargin: '400px' },
  );
  io.observe(root);
}

// ---------- 年度热力图（示例数据） ----------

async function startHeatmap() {
  const list = await loadAllProgress({ forceMock: true });
  createHeatmap({
    root: $('[data-heat]'),
    series: list.map(({ brand, daily }) => ({ id: brand.id, name: brand.name, color: brand.ui.accent, daily })),
    markers: markersFrom(list, null),
  });
}

setupText();
if (supportsWebGL()) {
  startHero();
  startGallery();
} else {
  document.body.classList.add('no-webgl');
}
startHeatmap();
window.__site = { ready: true };
