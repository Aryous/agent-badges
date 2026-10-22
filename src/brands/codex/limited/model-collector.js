import { around, textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark } from '../mark.js';

// 模型收藏家（隐藏）

/** 四颗水晶摆成 X 形，围着中间的 Codex 标志。颜色只是珠宝配色，不对应任何官方模型色。 */
const GEMS = around(4, 0.31, Math.PI / 4).map((center, i) => ({
  kind: 'gem', center, radius: 0.082, material: 'crystal', color: ['aqua', 'magenta', 'amber', 'lime'][i], height: 0.07, z: MEDALLION_H,
}));

const modelCollector = {
  id: 'model-collector',
  title: '模型收藏家',
  description: '在 Codex 里用过 4 种不同的模型。每一颗都有自己的脾气，你都摸透了。',
  en: { title: 'Model Collector', description: 'Used 4 different models in Codex. Each one has its own temper, and you have figured them all out.' },
  criteria: { target: 4 },
  hidden: true,
  shape: { type: 'polygon', sides: 6, radius: 1.06, cornerRadius: 0.12, rotation: 0, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'platinum' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.765, width: 0.012, material: 'polished-metal', color: 'platinum', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'MODEL COLLECTOR', radius: 0.655, size: 0.078, metal: 'polished-metal', color: 'platinum' }),
    // 午夜蓝丝绒托盘
    ...medallion({ radius: 0.53, color: 'midnight', metal: 'polished-metal', metalColor: 'platinum' }),
    // 托盘上的四个金属爪托
    ...around(4, 0.31, Math.PI / 4).map((center) => ({
      kind: 'ring', center, radius: 0.098, width: 0.02, material: 'polished-metal', color: 'platinum', height: 0.03, z: MEDALLION_H,
    })),
    ...GEMS,
    ...codexMark({ size: 0.17, center: [0, 0] }),
  ],
  back: { material: 'brushed-metal', color: 'platinum' },
};

export default modelCollector;
