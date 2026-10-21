import { MEDALLION_H as Z } from '../../shared/layout.js';
import { codexMark } from '../mark.js';
import { featureBadge } from '../feature-frame.js';

// 2. 计划清单：一张待办，两项已勾，一项进行中

const CHECK = ['.....#', '....##', '#..##.', '####..', '.##...'];

const DOT = ['.##.', '####', '####', '.##.'];

const BOX = ['########', '#......#', '#......#', '#......#', '#......#', '#......#', '#......#', '########'];

const plRows = [0.17, 0.04, -0.09];

const planTracker = featureBadge({
  id: 'plan-tracker',
  title: '计划清单',
  titleEn: 'PLAN TRACKER',
  description: '用 update_plan 列过计划。先写清单，再动手，一项一项打勾。',
  en: { title: 'Plan Tracker', description: 'Made a plan with update_plan. Write the list first, then check things off one by one.' },
  target: 1,
  band: 'forest',
  panel: 'lime',
  label: 'PLAN',
  art: [
    // 清单纸：圆角矩形，顶部一条夹子
    {
      kind: 'pixels', rows: Array.from({ length: 23 }, (_, r) => (r === 0 || r === 22 ? '.' + '#'.repeat(18) + '.' : '#'.repeat(20))),
      cell: 0.021, center: [-0.08, 0.05], material: 'enamel', color: 'snow', height: 0.03, z: Z, bevel: 0.008,
    },
    { kind: 'capsule', from: [-0.16, 0.28], to: [0, 0.28], width: 0.05, material: 'polished-metal', color: 'silver', height: 0.024, z: Z + 0.03 },
    ...plRows.flatMap((y, i) => [
      { kind: 'pixels', rows: BOX, cell: 0.011, center: [-0.21, y], material: 'polished-metal', color: 'steel', height: 0.012, z: Z + 0.03 },
      i < 2
        ? { kind: 'pixels', rows: CHECK, cell: 0.016, center: [-0.205, y + 0.008], material: 'enamel', color: 'emerald', height: 0.02, z: Z + 0.03 }
        : { kind: 'pixels', rows: DOT, cell: 0.013, center: [-0.21, y], material: 'enamel', color: 'amber', height: 0.02, z: Z + 0.03 },
      { kind: 'capsule', from: [-0.13, y], to: [i === 1 ? -0.0 : 0.07, y], width: 0.028, material: 'enamel', color: 'steel', height: 0.012, z: Z + 0.03 },
    ]),
    ...codexMark({ size: 0.15, center: [0.2, -0.17], z: Z + 0.03 }),
  ],
});

export default planTracker;
