// 引擎能识别的名字。配置校验和构建都以这里为准。

export const SHAPE_TYPES = ['circle', 'polygon', 'starburst', 'shield', 'gear', 'flower'];

export const MATERIAL_TYPES = [
  'enamel',          // 珐琅：有色底 + 清漆高光
  'polished-metal',  // 抛光金属
  'brushed-metal',   // 拉丝金属：同心圆拉丝 + 各向异性高光
  'ceramic',         // 哑光陶瓷
  'holographic',     // 全息镭射
  'anodized',        // 阳极氧化铝
  'crystal',         // 水晶宝石
  'shiny-iris',      // 闪光款：镭射虹彩
  'shiny-pearl',     // 闪光款：珠光贝母
  'shiny-aurora',    // 闪光款：极光
  'locked',          // 未解锁剪影
];

export const RELIEF_KINDS = ['capsule', 'circle', 'ring', 'pixels', 'rounded-rect', 'text-arc', 'text', 'gem', 'path'];

export const LAYER_KINDS = ['rim', 'face'];

export const RELIEF_EFFECTS = ['pulse'];

export const PATTERNS = ['sunburst', 'rings'];
