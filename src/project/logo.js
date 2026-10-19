// agent-badges 自己的标志：和徽章同一个家族的奖章，但图案是原创的。
// 金色玫瑰花结外形 + 午夜蓝环带 + 象牙白圆盘，中心一颗四角星：
// 从 Claude 橙渐变到 Codex 蓝，表示「每一个 Agent 的成就」。
import { engravingLines } from '../brands/shared/text.js';
import { MEDALLION_H, medallion, textRing } from '../brands/shared/medal.js';

/** 主星 + 右上角一颗小星（24 × 24 viewBox）。 */
export const SPARKLE =
  'M12 2C12.9 8.4 15.6 11.1 22 12C15.6 12.9 12.9 15.6 12 22C11.1 15.6 8.4 12.9 2 12C8.4 11.1 11.1 8.4 12 2Z' +
  'M19 1.6C19.25 3.5 19.9 4.15 21.8 4.4C19.9 4.65 19.25 5.3 19 7.2C18.75 5.3 18.1 4.65 16.2 4.4C18.1 4.15 18.75 3.5 19 1.6Z';

/** 渐变三色：上 Claude 橙 → 中兰花紫 → 下 Codex 蓝。 */
export const SPARKLE_GRADIENT = ['flame', 'orchid', 'electric'];

export const logoBrand = {
  id: 'agent-badges',
  name: 'Agent Badges',
  palette: {
    background: '#141413',
    primary: '#E8875F',
    flame: '#F2713A',
    orchid: '#C44FD6',
    electric: '#3550FF',
    gold: '#D9B061',
    midnight: '#141F4D',
    navy: '#1E2F6E',
    ivory: '#F3F0E8',
    snow: '#F7F6F2',
    graphite: '#3A3936',
  },
  ui: { accent: '#E8B45A', text: '#F0EEE6', muted: '#8F8B82' },
  engraving: {
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Helvetica Neue", sans-serif',
    lines: engravingLines,
  },
};

export const logoBadge = {
  id: 'logo',
  title: 'Agent Badges',
  titleEn: 'AGENT BADGES',
  description: 'npx agent-badges',
  en: { title: 'Agent Badges', description: 'npx agent-badges' },
  criteria: { metric: 'none', target: 1 },
  shape: { type: 'starburst', points: 16, radius: 1.05, innerRadius: 0.93, tipRoundness: 0.12, valleyRoundness: 0.06, depth: 0.22, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'midnight', inset: 0.13, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'AGENT BADGES', bottom: 'ACHIEVEMENTS', radius: 0.68, size: 0.095, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.54, color: 'ivory', metal: 'polished-metal', metalColor: 'gold' }),
    { kind: 'path', d: SPARKLE, viewBox: 24, scale: 0.42, center: [0, 0], z: MEDALLION_H, material: 'enamel', color: 'primary', gradient: SPARKLE_GRADIENT, height: 0.075, bevel: 0.007 },
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

export const LOGO_STATE = { unlocked: true, earnedAt: null, tier: null, progress: { current: 1, target: 1 } };
