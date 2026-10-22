// 徽章工作台（仅开发服务器）：window.__studio.render(...) 把一枚徽章渲染成 PNG data URL。
// scripts/assets.mjs 用它生成 README 横幅、动图帧和项目标志。
import { BRANDS, getBrand } from '../../src/brands/index.js';
import { surpriseKeptState } from '../../src/brands/shared/display-states.js';
import { normalizeProgress } from '../../src/data/normalize.js';
import { DATA_SOURCES } from '../../src/data/progress.js';
import { createStage } from '../../src/viewer/scene.js';
import { createBadgeRenderer } from '../../src/viewer/badge-renderer.js';
import { LOGO_STATE, logoBadge, logoBrand } from '../../src/project/logo.js';

/** 覆盖解锁状态或等级时，示例数据里没有获得日期就用这一天。 */
const OVERRIDE_DATE = '2026-05-02';

const renderer = createBadgeRenderer(createStage(document.querySelector('#stage')));

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
    // 展示用：其余都已解锁，分级徽章留住顶级彩蛋的惊喜（见 src/brands/shared/display-states.js）
    if (showcase) state = surpriseKeptState(config, state);
    if (unlocked !== undefined) state = { ...state, unlocked, earnedAt: state.earnedAt ?? OVERRIDE_DATE };
    if (tier !== undefined) state = { ...state, unlocked: true, tier, earnedAt: state.earnedAt ?? OVERRIDE_DATE };
  }
  // 每次都新建一枚徽章，画完就释放；素材脚本会连续渲染几百帧
  return renderer.image(config, brand, state, { lang, engraving, angle, tilt, size, fill, background });
}

window.__studio = { render, brands: BRANDS.map((b) => ({ id: b.brand.id, badges: b.badges.map((x) => x.id) })), ready: true };
