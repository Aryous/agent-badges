// 概览区的进度铸币：一枚深色精制币（proof coin）。币面是近黑的镜面金属（与「黑瓷金」同一种蓝黑），外圈和滚花为金；
// 币面外圈一颗凸点代表一枚徽章：已解锁的是磨砂金凸点，未解锁的是低矮的暗色金属点；中央凸起解锁数，下方小字写总数。
// 一暗一亮：镜面的场、磨砂的浮雕，金只占少量面积（铸币没有珐琅，只有裸金属）。
// 输出普通的徽章配置，交给 buildBadge 组装：材质、光照、字形都和徽章同一套。
// 颜色键名取自品牌色板（gold、onyx、slate 两个品牌都有）。

export const COIN_ID = 'progress-coin';

/** 凸点所在圆的半径、凸点半径（徽章单位，外接半径 1）。 */
const DOT_RING = 0.74;
const DOT_RADIUS = 0.036;

/**
 * 三种材质（预设见 materials.js）：
 * - 币面：镜面蓝黑。
 * - 浮雕：阳极氧化的金，细磨砂、整面均匀的蜂蜜色，在镜面上读作「磨砂」；拉丝金的高光太跳，抛光金又和外圈一样亮。
 * - 未解锁点：阳极氧化的岩灰，实心的暗蓝灰小圆，隐约可见；石墨会读成黑洞，铂会读成银点。
 */
const FIELD = { material: 'polished-metal', color: 'onyx' };
const FROST = { material: 'anodized', color: 'gold' };
const DIM = { material: 'anodized', color: 'slate' };

/**
 * @param {{ unlocked: number, total: number }} opts
 * @returns {object} 徽章配置
 */
export function coinConfig({ unlocked, total }) {
  // 输入兜底：非数、负数、小数都按整数规整，解锁数不超过总数
  const n = Math.max(0, Math.floor(total) || 0);
  const lit = Math.max(0, Math.min(Math.floor(unlocked) || 0, n));
  const step = n > 0 ? (Math.PI * 2) / n : 0;
  const dots = Array.from({ length: n }, (_, i) => {
    // 从正上方开始顺时针
    const a = Math.PI / 2 - i * step;
    const on = i < lit;
    return {
      kind: 'circle',
      role: on ? 'lit' : 'dim',
      center: [DOT_RING * Math.cos(a), DOT_RING * Math.sin(a)],
      radius: DOT_RADIUS,
      ...(on ? FROST : DIM),
      height: on ? 0.034 : 0.008,
      bevel: on ? 0.012 : 0.003,
    };
  });
  return {
    id: COIN_ID,
    title: '解锁进度',
    en: { title: 'Progress' },
    shape: { type: 'circle', radius: 1, depth: 0.16, bevel: 0.045, reeded: { count: 180, depth: 0.01 } },
    layers: [
      { kind: 'rim', material: 'polished-metal', color: 'gold' },
      { kind: 'face', ...FIELD, inset: 0.12 },
    ],
    relief: [
      // 凸点圈内外各一道细线，像钱币的珠圈
      { kind: 'ring', radius: DOT_RING + 0.075, width: 0.01, ...FROST, height: 0.012 },
      { kind: 'ring', radius: DOT_RING - 0.075, width: 0.01, ...FROST, height: 0.012 },
      ...dots,
      { kind: 'text', text: String(lit), size: 0.42, center: [0, 0.07], tracking: 0.02, ...FROST, height: 0.06 },
      { kind: 'text', text: `/ ${n}`, size: 0.13, center: [0, -0.3], tracking: 0.12, ...FROST, height: 0.03 },
    ],
    back: { ...FIELD },
  };
}
