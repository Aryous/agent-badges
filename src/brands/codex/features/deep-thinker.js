import { MEDALLION_H as Z } from '../../shared/layout.js';
import { codexMark } from '../mark.js';
import { featureBadge } from '../feature-frame.js';

// 3. 深度思考：推理强度表盘拉到最右

const GAUGE_C = [0, 0.02];

const GAUGE_R = 0.3;

const GAUGE_COLORS = ['mint', 'mint', 'lime', 'amber', 'amber', 'scarlet', 'ruby'];

const gaugeSegs = GAUGE_COLORS.map((color, i) => {
  const a0 = Math.PI - (i / GAUGE_COLORS.length) * Math.PI - 0.06;
  const a1 = Math.PI - ((i + 1) / GAUGE_COLORS.length) * Math.PI + 0.06;
  const p = (a) => [GAUGE_C[0] + Math.cos(a) * GAUGE_R, GAUGE_C[1] + Math.sin(a) * GAUGE_R];
  return { kind: 'capsule', from: p(a0 - 0.08), to: p(a1 + 0.08), width: 0.055, material: 'enamel', color, height: 0.03, z: Z };
});

const NEEDLE_A = 0.22;

const deepThinker = featureBadge({
  id: 'deep-thinker',
  title: '深度思考',
  titleEn: 'DEEP THINKER',
  description: '把推理强度开到 xhigh 或 ultra。多想一会儿，答案会更好。',
  en: { title: 'Deep Thinker', description: 'Turned reasoning effort up to xhigh or ultra. Think a little longer, get a better answer.' },
  target: 1,
  band: 'plum',
  panel: 'honey',
  label: 'ULTRA',
  art: [
    ...gaugeSegs,
    // 指针拉到最右
    {
      kind: 'capsule', from: GAUGE_C, to: [GAUGE_C[0] + Math.cos(NEEDLE_A) * 0.25, GAUGE_C[1] + Math.sin(NEEDLE_A) * 0.25],
      width: 0.03, material: 'polished-metal', color: 'silver', height: 0.05, z: Z,
    },
    { kind: 'circle', center: GAUGE_C, radius: 0.045, material: 'polished-metal', color: 'silver', height: 0.06, z: Z },
    ...codexMark({ size: 0.15, center: [0, -0.22] }),
  ],
});

export default deepThinker;
