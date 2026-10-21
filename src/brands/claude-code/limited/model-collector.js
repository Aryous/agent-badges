import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { PLUS } from '../../shared/pixel-art.js';
import { clawd } from '../mascot.js';

// 模型收藏家（隐藏）

const GEMS = [
  ['ruby', 150],
  ['sapphire', 110],
  ['topaz', 70],
  ['amethyst', 30],
];

const modelCollector = {
  id: 'model-collector',
  hidden: true,
  title: '模型收藏家',
  titleEn: 'MODEL COLLECTOR',
  description: 'Opus、Sonnet、Haiku、Fable，四位都请来干过活。宝石集齐，收藏柜满了。',
  en: { title: 'Model Collector', description: 'Opus, Sonnet, Haiku and Fable have all clocked in. Every gem collected, the cabinet is full.' },
  criteria: { metric: 'models.distinct', target: 4 },
  shape: { type: 'polygon', sides: 4, radius: 1.1, cornerRadius: 0.14, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'platinum' },
    { kind: 'face', material: 'enamel', color: 'navy', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CLAUDE CODE', bottom: 'MODEL COLLECTOR', radius: 0.575, size: 0.066, metal: 'polished-metal', color: 'platinum' }),
    ...medallion({ radius: 0.46, color: 'snow', metal: 'polished-metal', metalColor: 'platinum' }),
    // 四颗水晶排成一道弧，悬在小怪物头顶
    ...GEMS.map(([color, deg]) => {
      const t = (deg * Math.PI) / 180;
      return {
        kind: 'gem',
        center: [Math.cos(t) * 0.28, Math.sin(t) * 0.28 - 0.06],
        radius: 0.085,
        material: 'crystal',
        color,
        height: 0.07,
        z: MEDALLION_H,
      };
    }),
    // 闪光
    ...[
      [-0.31, 0.3],
      [0.33, 0.27],
      [0.0, 0.36],
    ].map((center) => ({
      kind: 'pixels', rows: PLUS, cell: 0.016, center, material: 'polished-metal', color: 'gold', height: 0.03, z: MEDALLION_H,
    })),
    ...clawd({ cell: 0.02, center: [0, -0.2], height: 0.055 }),
  ],
  back: { material: 'brushed-metal', color: 'platinum' },
};

export default modelCollector;
