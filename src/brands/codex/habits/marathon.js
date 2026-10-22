import { around, textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark } from '../mark.js';

// 马拉松：十二边形秒表盘，4 小时

const marathon = {
  id: 'marathon',
  title: '马拉松',
  description: '一次会话连续活跃超过 4 小时。表针走了四格，Codex 还没喊累。',
  en: { title: 'Marathon', description: 'One session active for over 4 hours. The clock hand moved four ticks and Codex still is not tired.' },
  criteria: { target: 4, unit: 'h' },
  shape: { type: 'polygon', sides: 12, radius: 1.04, cornerRadius: 0.1, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'platinum' },
    { kind: 'face', material: 'enamel', color: 'forest', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.81, width: 0.012, material: 'polished-metal', color: 'platinum', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'MARATHON', radius: 0.7, size: 0.09, metal: 'polished-metal', color: 'platinum' }),
    ...medallion({ radius: 0.58, color: 'snow', metal: 'polished-metal', metalColor: 'platinum' }),
    // 表盘刻度：12 格，前 4 格（4 小时）点亮
    ...around(12, 0.49).map(([x, y], i) => {
      const t = Math.atan2(y, x);
      const long = i % 3 === 0;
      const r0 = long ? 0.43 : 0.455;
      return {
        kind: 'capsule',
        from: [Math.cos(t) * r0, Math.sin(t) * r0],
        to: [Math.cos(t) * 0.51, Math.sin(t) * 0.51],
        width: long ? 0.03 : 0.022,
        material: 'enamel', color: i >= 1 && i <= 4 ? 'lime' : 'steel', height: 0.025, z: MEDALLION_H,
      };
    }),
    ...codexMark({ size: 0.25, center: [0, -0.07] }),
    { kind: 'text', text: '4H', size: 0.1, center: [0, 0.27], material: 'polished-metal', color: 'forest', height: 0.04, z: MEDALLION_H },
  ],
  back: { material: 'brushed-metal', color: 'platinum' },
};

export default marathon;
