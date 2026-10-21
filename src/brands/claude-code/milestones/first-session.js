import { textRing, medallion } from '../../shared/layout.js';
import { clawd } from '../mascot.js';

// 初次相遇：圆形；小怪物第一次从终端里探出头。

const firstSession = {
  id: 'first-session',
  title: '初次相遇',
  titleEn: 'FIRST SESSION',
  description: '完成第一次 Claude Code 会话。小家伙第一次在终端里探出头来。',
  en: { title: 'First Session', description: 'Your first Claude Code session. The little guy pokes its head out of the terminal for the first time.' },
  criteria: { metric: 'sessions.total', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'cobalt', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'FIRST SESSION', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.56, color: 'azure', metal: 'polished-metal', metalColor: 'gold' }),
    ...clawd({ cell: 0.043, center: [0, -0.01] }),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

export default firstSession;
