// 徽章工作台（仅开发服务器）：window.__studio.render(...) 把一枚徽章渲染成 PNG data URL。
// scripts/assets.mjs 用它生成 README 横幅、动图帧和项目标志。
import { Group } from 'three';
import { BRANDS, getBrand } from '../brands/index.js';
import { buildBadge, setEngravingSize } from '../engine/badge.js';
import { normalizeProgress } from '../data/normalize.js';
import mockClaudeCode from '../data/mock-claude-code.js';
import mockCodex from '../data/mock-codex.js';
import { createStage } from '../viewer/scene.js';
import { renderBadgePNG } from '../viewer/export.js';
import { LOGO_STATE, logoBadge, logoBrand } from './logo.js';

const stage = createStage(document.querySelector('#stage'));

/** 展示用的等级：最高一级；最高一级是随机款式的彩蛋时，展示它下面一级，留住惊喜。 */
const showcaseTier = (tiers) => (tiers.at(-1).variants ? tiers.length - 2 : tiers.length - 1);
const MOCKS = { 'claude-code': mockClaudeCode, codex: mockCodex };

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
async function render({ brand: brandId, id, angle = 0, tilt = 0, size = 1024, lang = 'en', unlocked, tier, shiny, showcase = false, fill = 0.92, background = null, engraving = 2048 }) {
  let brand, config, state;
  if (brandId === 'logo') {
    brand = logoBrand;
    config = logoBadge;
    state = LOGO_STATE;
  } else {
    const b = getBrand(brandId);
    brand = b.brand;
    config = b.badges.find((x) => x.id === id);
    state = normalizeProgress(await MOCKS[brandId](), b.badges, brandId)[id];
    // 展示用：分级徽章看最高级，隐藏徽章保持神秘，其余都已解锁
    if (showcase) {
      state = config.hidden
        ? { ...state, unlocked: false, earnedAt: null, tier: null }
        : { ...state, unlocked: true, earnedAt: state.earnedAt ?? '2026-10-24', tier: config.tiers ? showcaseTier(config.tiers) : null };
    }
    if (unlocked !== undefined) state = { ...state, unlocked, earnedAt: state.earnedAt ?? '2026-05-02' };
    if (tier !== undefined) state = { ...state, unlocked: true, tier, earnedAt: state.earnedAt ?? '2026-05-02' };
    if (shiny !== undefined) state = { ...state, shiny };
  }
  const badge = buildBadge(config, brand, state, { lang });
  setEngravingSize(badge, engraving);
  stage.applyEnvironment(badge);
  const pivot = new Group();
  const holder = new Group();
  pivot.add(badge);
  holder.add(pivot);
  pivot.rotation.set(tilt, angle, 0);
  stage.scene.add(holder);
  const item = { holder, pivot, badge };
  try {
    return renderBadgePNG({ stage, items: [item], item, size, fill, background });
  } finally {
    stage.scene.remove(holder);
    // 每次都新建一枚徽章，用完就释放；素材脚本会连续渲染几百帧
    badge.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      for (const m of [o.material].flat()) {
        for (const [k, v] of Object.entries(m)) if (v?.isTexture && k !== 'envMap' && !v.userData?.shared) v.dispose(); // 环境贴图属于整个场景
        m.dispose();
      }
    });
  }
}

window.__studio = { render, brands: BRANDS.map((b) => ({ id: b.brand.id, badges: b.badges.map((x) => x.id) })), ready: true };
