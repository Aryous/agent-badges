import { MEDALLION_H as Z } from '../../shared/layout.js';
import { codexMark } from '../mark.js';
import { featureBadge } from '../feature-frame.js';

// 4. 全自动：标志坐上火箭

const ROCKET = [
  '.....##.....',
  '....####....',
  '...######...',
  '...######...',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '..########..',
  '.##########.',
  '############',
  '###.####.###',
  '##..####..##',
  '#...####...#',
];

const FLAME = ['.######.', '.######.', '..####..', '..####..', '...##...'];

const FLAME_CORE = ['.##.', '.##.', '..#.'];

const ROCKET_C = [0.04, 0.1];

const ROCKET_CELL = 0.03;

const ROCKET_BOTTOM = ROCKET_C[1] - (ROCKET.length / 2) * ROCKET_CELL;

const PORT_C = [ROCKET_C[0], ROCKET_C[1] + 0.07];

const fullAuto = featureBadge({
  id: 'full-auto',
  title: '全自动',
  description: '在无需审批的模式下放手让 Codex 干活。系好安全带，点火。',
  en: { title: 'Full Auto', description: 'Let Codex work with no approvals needed. Seatbelt on, ignition.' },
  target: 1,
  band: 'crimson',
  panel: 'sand',
  label: 'FULL AUTO',
  art: [
    // 速度线
    ...[-0.1, 0.02, 0.14].map((dy, i) => ({
      kind: 'capsule', from: [-0.36 + i * 0.03, ROCKET_C[1] + dy - 0.08], to: [-0.2, ROCKET_C[1] + dy - 0.08],
      width: 0.022, material: 'enamel', color: 'steel', height: 0.012, z: Z,
    })),
    // 尾焰：紧贴箭体底部
    { kind: 'pixels', rows: FLAME, cell: ROCKET_CELL * 0.9, center: [ROCKET_C[0], ROCKET_BOTTOM - FLAME.length * ROCKET_CELL * 0.45 + 0.01], material: 'enamel', color: 'amber', height: 0.024, z: Z },
    { kind: 'pixels', rows: FLAME_CORE, cell: ROCKET_CELL * 0.8, center: [ROCKET_C[0], ROCKET_BOTTOM - 0.04], material: 'enamel', color: 'snow', height: 0.03, z: Z },
    { kind: 'pixels', rows: ROCKET, cell: ROCKET_CELL, center: ROCKET_C, material: 'enamel', color: 'scarlet', height: 0.035, z: Z },
    // 舷窗里坐着 Codex
    { kind: 'circle', center: PORT_C, radius: 0.085, material: 'enamel', color: 'snow', height: 0.012, z: Z + 0.035 },
    { kind: 'ring', center: PORT_C, radius: 0.09, width: 0.02, material: 'polished-metal', color: 'silver', height: 0.022, z: Z + 0.035 },
    ...codexMark({ size: 0.068, center: PORT_C, height: 0.03, z: Z + 0.047, inlay: 'snow' }),
  ],
});

export default fullAuto;
