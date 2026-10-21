import { around, textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topTierFromLast } from '../../shared/top-tier.js';
import { codexMark } from '../mark.js';

// 月度坚持：细齿链轮，一环扣一环；分级换金属与圆盘色

const streakDays = {
  id: 'streak-days',
  title: '月度坚持',
  titleEn: '{label}-DAY STREAK',
  description: '连续使用 Codex 的天数。链条一节扣一节，转起来就停不下。',
  en: { title: '{label}-Day Streak', description: 'Consecutive days with Codex. Link by link, once the chain starts turning it does not stop.' },
  criteria: { metric: 'streak.days' },
  tiers: [
    { threshold: 30, label: '30', metal: 'bronze', accent: 'teal' },
    { threshold: 100, label: '100', metal: 'silver', accent: 'azure' },
    { threshold: 200, label: '200', metal: 'gold', accent: 'emerald' },
    { threshold: 365, label: '365', metal: 'platinum', accent: 'violet' },
  ],
  shape: { type: 'gear', teeth: 20, radius: 1.04, rootRadius: 0.95, roundness: 0.03, depth: 0.2, bevel: 0.015 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.78, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: '{label} DAYS', radius: 0.665, size: 0.088, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.55, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    // 一圈链节
    ...around(16, 0.47).map((center) => ({
      kind: 'circle', center, radius: 0.018, material: 'polished-metal', color: '$metal', height: 0.02, z: MEDALLION_H,
    })),
    ...codexMark({ size: 0.22, center: [0, 0.11] }),
    { kind: 'text', text: '{label}', size: 0.12, center: [0, -0.24], material: 'polished-metal', color: '$metal', height: 0.05, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

export default topTierFromLast(streakDays, 'codex/streak-days');
