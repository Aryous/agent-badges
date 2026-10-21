// GitHub 主页徽章陈列图：用离屏 3D 舞台把每枚已解锁徽章渲染成小图，再用 2D Canvas 排版。
// 透明背景。按 GitHub 的深浅主题各出一张（字色不同），主页 README 用 <picture> 自动切换。
import { Group } from 'three';
import { BRANDS } from '../brands/index.js';
import { buildBadge } from '../engine/badge.js';
import { partitionBadges } from '../engine/validate.js';
import { loadProgress, sourceInfo } from '../data/progress.js';
import { SHELF, pickShelf, shelfCount, shelfLabel, shelfLayout } from '../data/shelf.js';
import { createStage } from './scene.js';
import { renderBadgePNG } from './export.js';
import { nextFrame } from './frame.js';

const SERIF = `'Iowan Old Style', 'Palatino Linotype', 'Songti SC', Georgia, serif`;
const SANS = `system-ui, -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif`;
/** 两种主题的字色，取自 GitHub 自己的文字色。 */
export const SHELF_THEMES = {
  dark: { title: '#D1D7E0', meta: '#9198A1', count: '#9198A1', line: 'rgba(145, 152, 161, 0.35)', accent: (b) => b.ui.accent },
  light: { title: '#1F2328', meta: '#59636E', count: '#59636E', line: 'rgba(89, 99, 110, 0.3)', accent: (b) => b.ui.accentLight ?? b.ui.accent },
};
const THUMB = 256; // 徽章小图边长（显示 104，输出 2 倍即 208）

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('badge image failed to load'));
    img.src = src;
  });

/** 读取各工具的进度，挑出要陈列的徽章。only：只放某个工具；forceMock：和页面一样用示例数据。 */
export async function shelfGroups({ only = null, forceMock = false } = {}) {
  const entries = [];
  for (const b of BRANDS) {
    if (only && b.brand.id !== only) continue;
    const { valid } = partitionBadges(b.badges, b.brand);
    const { progress } = await loadProgress(b.brand.id, valid, undefined, { forceMock });
    entries.push({ brand: b.brand, badges: valid, progress, local: sourceInfo(b.brand.id, { forceMock }).kind === 'local' });
  }
  return pickShelf(entries);
}

// 离屏舞台只建一次：反复生成时不必每次新开 WebGL 上下文
let stage = null;
function offscreenStage() {
  if (stage) return stage;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(canvas);
  stage = createStage(canvas);
  return stage;
}

async function badgeImage(config, brand, state, lang) {
  const s = offscreenStage();
  const badge = buildBadge(config, brand, state, { lang });
  s.applyEnvironment(badge);
  const holder = new Group();
  const pivot = new Group();
  pivot.add(badge);
  holder.add(pivot);
  s.scene.add(holder);
  // renderBadgePNG 用 === 判断显示哪一枚，items 里必须是同一个对象
  const item = { holder };
  const src = renderBadgePNG({ stage: s, items: [item], item, size: THUMB, fill: 0.92 });
  s.scene.remove(holder);
  badge.traverse((o) => o.isMesh && o.geometry.dispose());
  await nextFrame();
  return loadImage(src);
}

/** 文字放不下时先缩小字号，还放不下就截断加省略号。 */
function fitText(g, text, maxW, size, weight, minSize = 11) {
  let s = size;
  for (; s > minSize; s -= 0.5) {
    g.font = `${weight} ${s}px ${SANS}`;
    if (g.measureText(text).width <= maxW) return text;
  }
  g.font = `${weight} ${minSize}px ${SANS}`;
  let out = text;
  while (out.length > 1 && g.measureText(out + '…').width > maxW) out = out.slice(0, -1);
  return out === text ? text : out + '…';
}

/**
 * @param {{ brand, items: { config, state }[] }[]} groups  shelfGroups() 的结果
 * @param {{ lang: 'en' | 'zh', themes?: string[], onProgress?: (done, total) => void }} opts
 * @returns {Promise<Record<string, HTMLCanvasElement>>}  每种主题一张；徽章小图只渲染一次
 */
export async function renderShelves(groups, { lang = 'en', themes = ['dark', 'light'], onProgress } = {}) {
  const L = SHELF;
  const layout = shelfLayout(groups, L);
  const total = groups.reduce((n, gr) => n + gr.items.length, 0);
  let done = 0;
  const images = new Map();
  for (const group of layout.groups) {
    for (const it of group.items) {
      images.set(it, await badgeImage(it.config, group.brand, it.state, lang));
      onProgress?.(++done, total);
    }
  }
  const out = {};
  for (const theme of themes) out[theme] = drawShelf(layout, images, SHELF_THEMES[theme], lang);
  return out;
}

/** 只要一张（默认深色）。 */
export async function renderShelf(groups, opts = {}) {
  return (await renderShelves(groups, { ...opts, themes: ['dark'] })).dark;
}

function drawShelf(layout, images, C, lang) {
  const L = SHELF;
  const canvas = document.createElement('canvas');
  canvas.width = layout.width * L.scale;
  canvas.height = layout.height * L.scale;
  const g = canvas.getContext('2d');
  g.scale(L.scale, L.scale);
  g.textBaseline = 'alphabetic';

  for (const group of layout.groups) {
    const { brand } = group;
    // 组标题：品牌色的工具名，右侧灰色的已解锁数量，下面一条细线
    const base = group.y + 28;
    g.fillStyle = C.accent(brand);
    g.font = `500 24px ${SERIF}`;
    g.textAlign = 'left';
    g.fillText(brand.name, L.pad, base);
    g.fillStyle = C.count;
    g.font = `500 14px ${SANS}`;
    g.textAlign = 'right';
    g.fillText(shelfCount(group.items.length, lang), layout.width - L.pad, base);
    g.fillStyle = C.line;
    g.fillRect(L.pad, base + 12, layout.width - L.pad * 2, 1);

    g.textAlign = 'center';
    for (const it of group.items) {
      g.drawImage(images.get(it), it.x, it.y, L.badge, L.badge);
      const cx = it.x + L.badge / 2;
      const maxW = layout.cell - 10;
      const { title, meta } = shelfLabel(it.config, it.state, lang);
      g.fillStyle = C.title;
      const name = fitText(g, title, maxW, 14, 600);
      g.fillText(name, cx, it.y + L.badge + 22);
      if (meta) {
        g.fillStyle = C.meta;
        const m = fitText(g, meta, maxW, 12, 400);
        g.fillText(m, cx, it.y + L.badge + 40);
      }
    }
  }
  return canvas;
}
