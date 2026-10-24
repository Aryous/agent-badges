// 用统一渲染服务把进度铸币画成一张静态 PNG：不新建 WebGL 上下文，不做实时动画。
import { coinConfig } from '../engine/coin.js';

/** 略微倾斜，让滚花和侧光可见。 */
const ANGLE = 0.42;
const TILT = -0.26;

/**
 * @param {{ image: Function }} renderer  createBadgeRenderer 的结果
 * @param {object} brand
 * @param {{ unlocked: number, total: number, lang: 'zh' | 'en' }} opts
 * @returns {string} PNG data URL
 */
export function renderCoin(renderer, brand, { unlocked, total, lang }) {
  const state = { unlocked: true, earnedAt: null, progress: { current: unlocked, target: total } };
  return renderer.image(coinConfig({ unlocked, total }), brand, state, { lang, engraving: 0, size: 320, fill: 0.9, angle: ANGLE, tilt: TILT });
}
