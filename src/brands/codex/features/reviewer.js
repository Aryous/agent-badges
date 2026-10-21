import { MEDALLION_H as Z } from '../../shared/layout.js';
import { codexMark } from '../mark.js';
import { featureBadge } from '../feature-frame.js';

// 5. 审查官：放大镜底下一行行代码

const LENS_C = [0.06, 0.1];

const LENS_R = 0.17;

const CODE_LINES = [
  [0.27, -0.3, 0.06, 'steel'],
  [0.13, -0.3, 0.18, 'sky'],
  [-0.01, -0.22, 0.02, 'steel'],
  [-0.15, -0.3, 0.12, 'lilac'],
  [-0.29, -0.22, 0.08, 'steel'],
];

const reviewer = featureBadge({
  id: 'reviewer',
  title: '审查官',
  titleEn: 'REVIEWER',
  description: '用过自动代码审查。再小的问题，也逃不过这片放大镜。',
  en: { title: 'Reviewer', description: 'Used automatic code review. No issue is too small for this magnifying glass.' },
  metric: 'features.autoReview',
  target: 1,
  band: 'navy',
  panel: 'snow',
  label: 'REVIEW',
  art: [
    ...CODE_LINES.map(([y, x0, x1, color]) => ({
      kind: 'capsule', from: [x0, y], to: [x1, y], width: 0.04, material: 'enamel', color, height: 0.014, z: Z,
    })),
    // 放大镜
    { kind: 'capsule', from: [LENS_C[0] + 0.13, LENS_C[1] - 0.13], to: [0.33, -0.21], width: 0.07, material: 'polished-metal', color: 'steel', height: 0.05, z: Z },
    { kind: 'circle', center: LENS_C, radius: LENS_R - 0.01, material: 'enamel', color: 'snow', height: 0.016, z: Z },
    ...codexMark({ size: 0.13, center: LENS_C, height: 0.04, z: Z + 0.016 }),
    { kind: 'ring', center: LENS_C, radius: LENS_R, width: 0.04, material: 'polished-metal', color: 'silver', height: 0.07, z: Z },
  ],
});

export default reviewer;
