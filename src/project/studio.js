// 徽章工作台（仅开发服务器）：window.__studio.render(...) 把一枚徽章渲染成 PNG data URL。
// scripts/assets.mjs 用它生成 README 横幅、动图帧和项目标志。
import { BRANDS, getBrand } from '../brands/index.js';
import { surpriseKeptState } from '../brands/shared/showcase.js';
import { normalizeProgress } from '../data/normalize.js';
import { DATA_SOURCES } from '../data/progress.js';
import { createStage } from '../viewer/scene.js';
import { renderBadgePNG } from '../viewer/snapshot.js';
import { mountBadge } from '../viewer/mount-badge.js';
import { disposeBadge } from '../engine/badge.js';
import { LOGO_STATE, logoBadge, logoBrand } from './logo.js';

const stage = createStage(document.querySelector('#stage'));

/**
 * @param {object} o
 * @param {string} o.brand   品牌 id，或 'logo'
 * @param {string} [o.id]    徽章 id
 * @param {number} [o.angle] 绕 Y 轴角度（弧度）
 * @param {number} [o.tilt]  绕 X 轴角度
 * @param {number} [o.size]  输出像素
 * @param {string} [o.lang]
 * @param {boolean} [o.unlocked] 覆盖解锁状态（默认用示例数据）
 * @param {number} [o.engraving]  背面刻字贴图边长（默认 2048，素材都按近看的清晰度出）
 */
async function render({ brand: brandId, id, angle = 0, tilt = 0, size = 1024, lang = 'en', unlocked, tier, showcase = false, fill = 0.92, background = null, engraving = 2048 }) {
  let brand, config, state;
  if (brandId === 'logo') {
    brand = logoBrand;
    config = logoBadge;
    state = LOGO_STATE;
  } else {
    const b = getBrand(brandId);
    brand = b.brand;
    config = b.badges.find((x) => x.id === id);
    state = normalizeProgress(await DATA_SOURCES[brandId].mock(), b.badges)[id];
    // 展示用：其余都已解锁，分级徽章留住顶级彩蛋的惊喜（见 brands/shared/showcase.js）
    if (showcase) state = surpriseKeptState(config, state);
    if (unlocked !== undefined) state = { ...state, unlocked, earnedAt: state.earnedAt ?? '2026-05-02' };
    if (tier !== undefined) state = { ...state, unlocked: true, tier, earnedAt: state.earnedAt ?? '2026-05-02' };
  }
  const item = mountBadge(config, brand, state, { stage, lang, engraving });
  const { badge, pivot, holder } = item;
  pivot.rotation.set(tilt, angle, 0);
  stage.scene.add(holder);
  try {
    return renderBadgePNG({ stage, items: [item], item, size, fill, background });
  } finally {
    stage.scene.remove(holder);
    // 每次都新建一枚徽章，用完就释放；素材脚本会连续渲染几百帧
    disposeBadge(badge);
  }
}

window.__studio = { render, brands: BRANDS.map((b) => ({ id: b.brand.id, badges: b.badges.map((x) => x.id) })), ready: true };
