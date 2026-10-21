import { MEDALLION_H as Z } from '../../shared/layout.js';
import { withTopTier } from '../../shared/top-tier.js';
import { cap, px, rect } from '../../shared/parts.js';
import { clawd } from '../mascot.js';
import { medal } from '../medal.js';

// 文件编辑：五边形，铅笔压在 +/− 差异行上

const PLUS = ['.#.', '###', '.#.'];

const MINUS = ['...', '###', '...'];

const fileEditsBase = {
  id: 'file-edits',
  title: '文件编辑',
  titleEn: '{label} EDITS',
  description: '改过、写过的文件次数。一行加，一行减，代码就是这样一点点变好的。',
  en: { title: '{label} Edits', description: 'Files edited and written. A line added, a line removed: that is how code gets better.' },
  criteria: { metric: 'tools.edits' },
  tiers: [
    { threshold: 100, metal: 'bronze', accent: 'sand', label: '100' },
    { threshold: 1000, metal: 'silver', accent: 'sky', label: '1K' },
    { threshold: 10000, metal: 'gold', accent: 'lilac', label: '10K' },
  ],
  ...medal({
    bottom: '{label} EDITS',
    shape: { type: 'polygon', sides: 5, radius: 1.1, cornerRadius: 0.2, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'slate',
    disc: '$accent',
    art: [
      { kind: 'text', text: '{label}', size: 0.16, center: [0, 0.28], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      rect(0.24, 0.05, [-0.04, -0.12], 'snow', 0.03),
      // 小怪物趴在差异卡片右上角
      ...clawd({ cell: 0.012, center: [0.21, 0.085], height: 0.045 }),
      // 四行差异：+ 绿、− 红
      ...[['mint', PLUS, 0.03], ['scarlet', MINUS, -0.05], ['mint', PLUS, -0.13], ['mint', PLUS, -0.21]].flatMap(([color, sign, y], i) => [
        px(sign, 0.018, [-0.22, y], color, 'enamel', 0.05, Z + 0.03),
        cap([-0.16, y], [[0.12, 0.02, 0.08, -0.02][i], y], 0.026, color, 0.045, 'enamel', Z + 0.03),
      ]),
      // 铅笔：斜着压在右下
      cap([0.08, -0.36], [0.33, -0.11], 0.07, 'amber', 0.08, 'enamel', Z + 0.04),
      cap([0.27, -0.17], [0.33, -0.11], 0.07, 'rose', 0.085, 'polished-metal', Z + 0.04),
      cap([0.05, -0.39], [0.08, -0.36], 0.04, 'ink', 0.07, 'enamel', Z + 0.04),
    ],
  }),
};

const fileEdits = withTopTier(fileEditsBase, { threshold: 100000, label: '100K' }, 'claude-code/file-edits');

export default fileEdits;
