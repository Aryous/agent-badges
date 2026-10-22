import { onClawd } from '../mascot.js';
import { appIcon, mascot } from '../app-icon.js';

// 自动驾驶：App 图标家族；∞ 循环箭头转个不停，小怪物戴上墨镜歇一会儿。

// 墨镜（小怪物网格第 2–3 行，盖住眼睛）
const SHADES = ['..############..', '...####..####...'];

const autopilot = appIcon({
  id: 'autopilot',
  title: '自动驾驶',
  description: '用过 /loop、定时任务或 Workflow 编排。循环转起来，小家伙戴上墨镜歇一会儿。',
  en: { title: 'Autopilot', description: 'Used /loop, a scheduled task or a Workflow. The loop keeps turning, so the little guy puts on shades and takes a break.' },
  criteria: { target: 1 },
  rim: 'azure',
  face: 'cobalt',
  panel: 'sky',
  name: 'AUTOPILOT',
  art: [
    // ∞ 循环：两个相切的圆环 + 两个箭头
    { kind: 'ring', center: [-0.115, 0.14], radius: 0.11, width: 0.04, material: 'enamel', color: 'snow', height: 0.05, bevel: 0.01 },
    { kind: 'ring', center: [0.115, 0.14], radius: 0.11, width: 0.04, material: 'enamel', color: 'snow', height: 0.05, bevel: 0.01 },
    { kind: 'capsule', from: [-0.17, 0.27], to: [-0.12, 0.25], width: 0.035, material: 'enamel', color: 'amber', height: 0.06 },
    { kind: 'capsule', from: [-0.12, 0.25], to: [-0.16, 0.21], width: 0.035, material: 'enamel', color: 'amber', height: 0.06 },
    { kind: 'capsule', from: [0.17, 0.01], to: [0.12, 0.03], width: 0.035, material: 'enamel', color: 'amber', height: 0.06 },
    { kind: 'capsule', from: [0.12, 0.03], to: [0.16, 0.07], width: 0.035, material: 'enamel', color: 'amber', height: 0.06 },
    ...mascot(0.021, [0, -0.3]),
    onClawd({ cell: 0.021, center: [0, -0.3] }, SHADES, { col: 0, row: 2, material: 'enamel', color: 'ink', height: 0.075, z: 0 }),
  ],
});

export default autopilot;
