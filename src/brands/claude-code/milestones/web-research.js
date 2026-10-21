import { MEDALLION_H as Z } from '../../shared/layout.js';
import { withTopTier } from '../../shared/top-tier.js';
import { cap, dot, ring } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 联网检索：平顶八边形，地球 + 放大镜

/** 椭圆经线环（24 格 viewBox） */
const MERIDIAN = 'M12 2 A5 10 0 1 0 12 22 A5 10 0 1 0 12 2 Z M12 3.8 A3.2 8.2 0 1 1 12 20.2 A3.2 8.2 0 1 1 12 3.8 Z';

const GLOBE = [0.02, -0.06];

const GLOBE_R = 0.2;

const webResearchBase = {
  id: 'web-research',
  title: '联网检索',
  titleEn: '{label} SEARCHES',
  description: '让 Claude Code 联网搜索、抓取网页的次数。不知道的，就去全世界找答案。',
  en: { title: '{label} Searches', description: 'Web searches and page fetches. What you do not know, go find out from the whole world.' },
  criteria: { metric: 'tools.web' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sky', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'lime', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'aqua', label: '1K' },
  ],
  ...medal({
    bottom: '{label} SEARCHES',
    shape: { type: 'polygon', sides: 8, radius: 1.05, cornerRadius: 0.12, rotation: Math.PI / 8, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'forest',
    disc: '$accent',
    art: [
      { kind: 'text', text: '{label}', size: 0.15, center: [0, 0.3], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      dot(GLOBE, GLOBE_R, 'azure', 0.03),
      ring(GLOBE, GLOBE_R, 0.024, '$metal', 0.05),
      { kind: 'path', d: MERIDIAN, viewBox: 24, scale: GLOBE_R, center: GLOBE, material: 'polished-metal', color: '$metal', height: 0.045, z: Z, bevel: 0.004 },
      cap([GLOBE[0] - GLOBE_R, GLOBE[1]], [GLOBE[0] + GLOBE_R, GLOBE[1]], 0.016, '$metal', 0.045, 'polished-metal'),
      ...[-1, 1].map((s) => {
        const y = GLOBE[1] + s * GLOBE_R * 0.5;
        const w = GLOBE_R * Math.sqrt(1 - 0.25) - 0.01;
        return cap([GLOBE[0] - w, y], [GLOBE[0] + w, y], 0.012, '$metal', 0.04, 'polished-metal');
      }),
      // 放大镜压在地球右下
      dot([0.22, -0.2], 0.085, 'snow', 0.06, 'enamel'),
      ring([0.22, -0.2], 0.095, 0.032, '$metal', 0.075),
      cap([0.29, -0.27], [0.36, -0.34], 0.05, 'ink', 0.07),
      // 小怪物在地球左下角探头
      ...clawd({ cell: 0.0135, center: [-0.24, -0.27], height: 0.05 }),
    ],
  }),
};

const webResearch = withTopTier(webResearchBase, { threshold: 10000, label: '10K' }, 'claude-code/web-research');

export default webResearch;
