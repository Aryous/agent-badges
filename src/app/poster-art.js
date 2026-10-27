import { createBadgeRenderer } from '../viewer/badge-renderer.js';
import { completionistItem } from '../viewer/completionist.js';
import { forEachFrame } from '../viewer/frame.js';

const THUMB = 360; // 另一个工具的缩略图：海报上一格最大约 230 像素
const COIN = 900;

export const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * 海报要的图：每个工具的全解锁铸币截图和徽章缩略图，按工具缓存。
 * 当前工具的缩略图直接用陈列墙画好的（等 thumbsDone，等的时候报进度）；另一个工具的在这里现画，一帧一枚。
 * 都用页面共用的舞台（ctx.stage），整页仍只有一个 WebGL 上下文给缩略图。
 * @param {object} ctx
 * @param {{ thumbsDone: Promise<void> }} deps
 */
export function createPosterArt(ctx, { thumbsDone }) {
  const cache = new Map();
  let renderer = null;
  const shoot = (config, brand, state, size, fill) => (renderer ??= createBadgeRenderer(ctx.stage)).image(config, brand, state, { size, fill, engraving: 0 });

  async function build(tool, onProgress) {
    let urls;
    if (tool.brand.id === ctx.brand.id) {
      const total = ctx.items.length;
      const tick = () => onProgress(ctx.items.filter((it) => it.thumb).length, total);
      tick();
      const timer = setInterval(tick, 200);
      try {
        await thumbsDone;
      } finally {
        clearInterval(timer);
      }
      urls = ctx.items.map((it) => it.thumb);
    } else {
      urls = [];
      await forEachFrame(tool.items, (it) => {
        urls.push(shoot(it.config, tool.brand, it.state, THUMB, 0.92));
        onProgress(urls.length, tool.items.length);
      });
    }
    const c = completionistItem(tool.kit, tool.items);
    const coinURL = shoot(c.config, tool.brand, c.state, COIN, 0.94);
    const [coin, ...imgs] = await Promise.all([coinURL, ...urls].map((u) => (u ? loadImage(u) : null)));
    return { coin, items: tool.items.map((it, i) => ({ state: it.state, img: imgs[i] })) };
  }

  return {
    /**
     * @param {{ brand, kit, items: { config, state }[] }} tool
     * @param {(n: number, total: number) => void} [onProgress]
     * @returns {Promise<{ coin: HTMLImageElement | null, items: { state, img }[] }>}
     */
    get(tool, onProgress = () => {}) {
      if (!cache.has(tool.brand.id)) {
        cache.set(
          tool.brand.id,
          build(tool, onProgress).catch((e) => {
            cache.delete(tool.brand.id); // 下次再试
            throw e;
          }),
        );
      }
      return cache.get(tool.brand.id);
    },
  };
}
