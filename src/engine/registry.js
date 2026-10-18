// 引擎能识别的名字。配置校验和构建都以这里为准。

export const SHAPE_TYPES = ['circle', 'polygon', 'starburst'];

export const MATERIAL_TYPES = [
  'enamel',          // 珐琅：有色底 + 清漆高光
  'polished-metal',  // 抛光金属
  'brushed-metal',   // 拉丝金属：同心圆拉丝 + 各向异性高光
  'ceramic',         // 哑光陶瓷
  'locked',          // 未解锁剪影
];

export const RELIEF_KINDS = ['capsule', 'circle', 'ring', 'path'];

export const LAYER_KINDS = ['rim', 'face'];

export const RELIEF_EFFECTS = ['pulse'];
