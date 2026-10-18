import { codexMark, medallion, textRing } from '../helpers.js';

// Codex 里程碑系列：起步与累计用量。分级徽章按 铜 → 银 → 金 → 白金 升级。

const firstThread = {
  id: 'first-thread',
  title: '初次启动',
  titleEn: 'FIRST THREAD',
  description: '在 Codex 里开启第一个会话。光标在云里闪了一下，故事就开始了。',
  criteria: { metric: 'threads.total', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'midnight', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'FIRST THREAD', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.56, color: 'snow', metal: 'polished-metal', metalColor: 'silver' }),
    ...codexMark({ size: 0.36, center: [0, 0] }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

export default [firstThread];
