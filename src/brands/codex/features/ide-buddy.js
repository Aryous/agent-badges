import { MEDALLION_H as Z } from '../../shared/layout.js';
import { codexMark } from '../mark.js';
import { featureBadge } from '../feature-frame.js';

// 6. 编辑器搭档：编辑器窗口旁的 Codex

const WIN_C = [-0.06, 0.08];

const WIN_W = 0.5;

const WIN_H = 0.38;

const BRACE_L = ['..##', '.#..', '.#..', '#...', '.#..', '.#..', '..##'];

const BRACE_R = BRACE_L.map((r) => [...r].reverse().join(''));

const ideBuddy = featureBadge({
  id: 'ide-buddy',
  title: '编辑器搭档',
  titleEn: 'IDE BUDDY',
  description: '在 VS Code 里用过 Codex。代码在左，搭档在右，配合默契。',
  en: { title: 'IDE Buddy', description: 'Used Codex inside VS Code. Code on the left, partner on the right, perfectly in sync.' },
  metric: 'features.vscode',
  target: 1,
  band: 'slate',
  panel: 'sky',
  label: 'VS CODE',
  art: [
    // 窗口
    {
      kind: 'pixels',
      rows: Array.from({ length: 19 }, () => '#'.repeat(25)),
      cell: WIN_W / 25, center: WIN_C, material: 'enamel', color: 'snow', height: 0.026, z: Z, bevel: 0.008,
    },
    // 标题栏
    {
      kind: 'pixels', rows: Array.from({ length: 3 }, () => '#'.repeat(25)),
      cell: WIN_W / 25, center: [WIN_C[0], WIN_C[1] + WIN_H / 2 - 0.03], material: 'enamel', color: 'slate', height: 0.012, z: Z + 0.026,
    },
    ...['scarlet', 'amber', 'mint'].map((color, i) => ({
      kind: 'circle', center: [WIN_C[0] - WIN_W / 2 + 0.05 + i * 0.045, WIN_C[1] + WIN_H / 2 - 0.03], radius: 0.013,
      material: 'enamel', color, height: 0.012, z: Z + 0.038,
    })),
    // { } 和代码行
    { kind: 'pixels', rows: BRACE_L, cell: 0.018, center: [WIN_C[0] - 0.17, WIN_C[1] - 0.04], material: 'enamel', color: 'electric', height: 0.014, z: Z + 0.026 },
    { kind: 'pixels', rows: BRACE_R, cell: 0.018, center: [WIN_C[0] + 0.17, WIN_C[1] - 0.04], material: 'enamel', color: 'electric', height: 0.014, z: Z + 0.026 },
    ...[
      [0.03, -0.09, 0.05, 'lilac'],
      [-0.04, -0.06, 0.09, 'sky'],
      [-0.11, -0.09, 0.02, 'steel'],
    ].map(([dy, x0, x1, color]) => ({
      kind: 'capsule', from: [WIN_C[0] + x0, WIN_C[1] + dy - 0.04], to: [WIN_C[0] + x1, WIN_C[1] + dy - 0.04],
      width: 0.026, material: 'enamel', color, height: 0.01, z: Z + 0.026,
    })),
    // 搭档：Codex 坐在窗口右下角
    ...codexMark({ size: 0.15, center: [0.23, -0.18], z: Z + 0.026 }),
  ],
});

export default ideBuddy;
