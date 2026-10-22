import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { clawd } from '../mascot.js';

// 子代理指挥官：十二芒星；主代理居中，5 个子代理围成一圈。

// 5 个子代理围绕主代理
const SUB_ANGLES = [90, 18, -54, -126, 162].map((d) => (d * Math.PI) / 180);

const subAt = (r) => SUB_ANGLES.map((t) => [Math.cos(t) * r, Math.sin(t) * r]);

const subagentCommander = {
  id: 'subagent-commander',
  title: '子代理指挥官',
  description: '在一次会话中同时调度 5 个子代理并行工作。',
  en: { title: 'Subagent Commander', description: 'Ran 5 subagents in parallel in a single session.' },
  criteria: { target: 5 },
  shape: { type: 'starburst', points: 12, radius: 1.06, innerRadius: 0.8, tipRoundness: 0.1, valleyRoundness: 0.06, depth: 0.2, bevel: 0.03 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'rose' },
    { kind: 'face', material: 'enamel', color: 'violet', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CLAUDE CODE', bottom: 'SUBAGENT COMMANDER', radius: 0.575, size: 0.074, metal: 'polished-metal', color: 'rose' }),
    ...medallion({ radius: 0.47, color: 'lilac', metal: 'polished-metal', metalColor: 'rose' }),
    // 主代理到子代理的连线
    ...SUB_ANGLES.map((t) => ({
      kind: 'capsule',
      from: [Math.cos(t) * 0.2, Math.sin(t) * 0.2],
      to: [Math.cos(t) * 0.25, Math.sin(t) * 0.25],
      width: 0.016, material: 'polished-metal', color: 'rose', height: 0.016, z: MEDALLION_H,
    })),
    ...clawd({ cell: 0.021, center: [0, 0.02] }),
    ...subAt(0.32).flatMap((center) => clawd({ cell: 0.0088, center, color: 'ivory', height: 0.04 })),
  ],
  back: { material: 'brushed-metal', color: 'rose' },
};

export default subagentCommander;
