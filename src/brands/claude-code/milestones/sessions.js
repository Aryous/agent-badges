import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topTierFromLast } from '../../shared/top-tier.js';
import { clawd } from '../mascot.js';

// 会话里程碑：八边形，平顶；中心是立体大数字，小怪物站在数字下面。

const sessions = {
  id: 'sessions',
  title: '会话里程碑',
  titleEn: '{label} SESSIONS',
  description: '累计开启的 Claude Code 会话。每一次 claude 回车，都是一次新的结伴出发。',
  en: { title: '{label} Sessions', description: 'Claude Code sessions started. Every claude + Enter is a new trip together.' },
  criteria: { metric: 'sessions.total' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'aqua', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'sky', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'amethyst', label: '1K' },
    { threshold: 5000, metal: 'platinum', accent: 'magenta', label: '5K' },
  ],
  shape: { type: 'polygon', sides: 8, radius: 1.03, cornerRadius: 0.13, rotation: Math.PI / 2 + Math.PI / 8, depth: 0.21, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'teal', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '{label} SESSIONS', radius: 0.695, size: 0.088, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.2, center: [0, 0.13], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.06, z: MEDALLION_H },
    ...clawd({ cell: 0.024, center: [0, -0.27], height: 0.055 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

export default topTierFromLast(sessions, 'claude-code/sessions');
