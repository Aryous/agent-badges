import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark, onMark } from '../mark.js';

// 夜猫子：八角星，紫夜里云上挂着月牙

/** 月牙（开口朝右） */
const MOON = [
  '..###.',
  '.##...',
  '##....',
  '##....',
  '##....',
  '.##...',
  '..###.',
];

const STAR_DOTS = [
  [-0.3, 0.26, 0.022], [0.3, 0.3, 0.016], [-0.36, -0.06, 0.014], [0.38, -0.02, 0.02],
  [-0.2, -0.33, 0.016], [0.24, -0.3, 0.014], [0.05, 0.38, 0.014],
];

const nightOwl = {
  id: 'night-owl',
  title: '夜猫子',
  titleEn: 'NIGHT OWL',
  description: '凌晨零点到五点还在和 Codex 对话。月亮都挂到云上了。',
  en: { title: 'Night Owl', description: 'Still talking to Codex between midnight and 5 a.m. The moon is hanging on the cloud.' },
  criteria: { target: 1 },
  shape: { type: 'starburst', points: 8, radius: 1.06, innerRadius: 0.84, tipRoundness: 0.16, valleyRoundness: 0.1, depth: 0.2, bevel: 0.035 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CODEX', bottom: 'NIGHT OWL', radius: 0.62, size: 0.085, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.5, color: 'violet', metal: 'polished-metal', metalColor: 'silver' }),
    ...STAR_DOTS.map(([x, y, r]) => ({ kind: 'circle', center: [x, y], radius: r, material: 'enamel', color: 'snow', height: 0.02, z: MEDALLION_H })),
    ...codexMark({ size: 0.27, center: [-0.03, -0.04] }),
    onMark({ size: 0.27, center: [-0.03, -0.04] }, MOON, { col: 12, row: -3, material: 'enamel', color: 'honey', height: 0.07 }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

export default nightOwl;
