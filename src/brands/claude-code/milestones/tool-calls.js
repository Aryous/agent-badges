import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topTierFromLast } from '../../shared/top-tier.js';
import { clawd } from '../mascot.js';

// 工具调用里程碑：齿轮外形，深石板色环带；小怪物拎着一把大扳手。

const WRENCH = [
  // 横放的开口扳手：左边是手柄（接在小怪物手上），右边是 C 形开口
  '..........####..',
  '.........######.',
  '.........###....',
  '############....',
  '############....',
  '.........###....',
  '.........######.',
  '..........####..',
];

const toolCalls = {
  id: 'tool-calls',
  title: '工具调用里程碑',
  titleEn: '{label} TOOL CALLS',
  description: '累计的工具调用次数。读文件、跑命令、改代码，小家伙从不嫌活多。',
  en: { title: '{label} Tool Calls', description: 'Tool calls made. Reading files, running commands, editing code: the little guy never minds more work.' },
  criteria: { metric: 'tools.calls' },
  tiers: [
    { threshold: 1000, metal: 'bronze', accent: 'amber', label: '1K' },
    { threshold: 10000, metal: 'silver', accent: 'aqua', label: '10K' },
    { threshold: 100000, metal: 'gold', accent: 'sky', label: '100K' },
    { threshold: 1000000, metal: 'platinum', accent: 'lime', label: '1M' },
  ],
  // 齿少、齿短、倒角小：齿侧的外圈才有足够厚度（引擎按半径内缩，齿侧会变薄）
  shape: { type: 'gear', teeth: 10, radius: 1.04, rootRadius: 0.93, roundness: 0.035, depth: 0.22, bevel: 0.015 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '{label} TOOL CALLS', radius: 0.695, size: 0.08, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.16, center: [0, 0.2], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: MEDALLION_H },
    ...clawd({ cell: 0.018, center: [-0.15, -0.21], height: 0.05 }),
    { kind: 'pixels', rows: WRENCH, cell: 0.021, center: [-0.15 + 0.018 * 8 + 0.021 * 8, -0.21], material: 'polished-metal', color: '$metal', height: 0.045, z: MEDALLION_H, bevel: 0.007 },
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

export default topTierFromLast(toolCalls, 'claude-code/tool-calls');
