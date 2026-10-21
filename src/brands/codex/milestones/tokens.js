import { around, textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topVariants } from '../../shared/top-tier.js';
import { codexMark } from '../mark.js';

// Token 里程碑：圆角菱形（像一枚筹码）；中心圆盘只放数值和一个小的 Codex 图标，留足呼吸空间。

const tokensBase = {
  id: 'tokens',
  title: 'Token 里程碑',
  titleEn: '{label} TOKENS',
  description: '累计消耗的 Token。云里一直在下雨，下的全是字。',
  en: { title: '{label} Tokens', description: 'Tokens used. It never stops raining in the cloud, and every drop is a word.' },
  tiers: [
    { threshold: 10_000_000, metal: 'bronze', accent: 'amber', label: '10M' },
    { threshold: 100_000_000, metal: 'silver', accent: 'sky', label: '100M' },
    { threshold: 1_000_000_000, metal: 'gold', accent: 'aqua', label: '1B' },
    { threshold: 10_000_000_000, metal: 'platinum', accent: 'magenta', label: '10B' },
  ],
  shape: { type: 'polygon', sides: 4, radius: 1.13, cornerRadius: 0.26, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    // 四个角上的铆钉
    ...around(4, 0.8).map((center) => ({
      kind: 'circle', center, radius: 0.028, material: 'polished-metal', color: '$metal', height: 0.022,
    })),
    ...textRing({ top: 'CODEX', bottom: '{label} TOKENS', radius: 0.66, size: 0.085, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.53, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    // 圆盘里只放数字和一个小一些的 Codex 图标，上下居中，四周留白
    { kind: 'text', text: '{label}', size: 0.16, center: [0, 0.15], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: MEDALLION_H },
    ...codexMark({ size: 0.14, center: [0, -0.16], height: 0.06 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// 顶级 100B：三款彩蛋随机解锁一款（白瓷金 / 黑瓷金 / 蓝宝石），由达到这一级的日期决定
const tokens = {
  ...tokensBase,
  tiers: [...tokensBase.tiers, { threshold: 100_000_000_000, label: '100B', salt: 'codex/tokens', variants: topVariants(tokensBase) }],
};

export default tokens;
