import { MEDALLION_H, medallion, scaleRelief } from './layout.js';

// 全解锁徽章的共用版式：不进陈列墙，按解锁数生成配置。
// 正面用马赛克一片片拼出品牌伙伴；背面是月桂环和阶段戳记。品牌部件（kit）见各品牌目录的 completionist.js。
//
// 环带由外到内都是同心圆，不跟着星芒的起伏走：细线圈 → 小珠 → 环形文字 → 圆盘。

/** 阶段金属：锡 → 铜 → 银 → 金。 */
export const STAGE_METALS = ['pewter', 'bronze', 'silver', 'gold'];

export const HAIR_R = 0.83;
export const BEAD_R = 0.785;
export const TEXT_R = 0.69;
export const DISC_R = 0.56;

const CIRCLE = { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05, reeded: { count: 180, depth: 0.01 } };
const STARBURST = { type: 'starburst', points: 24, radius: 1.06, innerRadius: 0.985, tipRoundness: 0.05, valleyRoundness: 0.03, depth: 0.24, bevel: 0.05 };

/** 0..3：k 达到 ⌈n/4⌉、⌈n/2⌉、⌈3n/4⌉ 各进一级，全部解锁也是 3。 */
export const stageOf = (unlocked, total) => [0.25, 0.5, 0.75].filter((f) => unlocked >= Math.ceil(total * f)).length;

export const isComplete = (unlocked, total) => total > 0 && unlocked >= total;

/** 亮片数：总片数按解锁比例取整。 */
export const litCount = (tiles, unlocked, total) => (total > 0 ? Math.round((tiles * unlocked) / total) : 0);

// ---------- 环带 ----------

/** 细线圈：倒角要小于半宽，否则内孔会塌成实心圆。 */
const hairline = (look) => ({ kind: 'ring', radius: HAIR_R, width: 0.012, ...look, height: 0.014, bevel: 0.002 });

/** 一圈很细的金属小珠。 */
const beads = (look, count = 84) =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { kind: 'circle', radius: 0.0085, center: [BEAD_R * Math.cos(a), BEAD_R * Math.sin(a)], ...look, height: 0.012, bevel: 0.003 };
  });

const arc = (text, where, look) => ({ kind: 'text-arc', text, arc: where, radius: TEXT_R, size: 0.088, tracking: 0.22, ...look, height: 0.024 });

const countText = (k, n) => (k === n ? 'COMPLETIONIST' : `${k} OF ${n}`);

/** 正反面共用的环带和圆盘：细线圈、小珠、上弧品牌名、左右分隔符、圆盘。 */
const band = (kit, look) => [
  hairline(look),
  ...beads(look),
  arc(kit.name, 'top', look),
  kit.separator(-TEXT_R, look),
  kit.separator(TEXT_R, look),
];

const disc = (look) => medallion({ radius: DISC_R, color: 'sand', metal: look.material, metalColor: look.color });

// ---------- 背面 ----------

/** 五角星（外半径 10、内半径 4.2，viewBox 24）。 */
const STAR = (() => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 4.2 : 10;
    return `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 - r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
})();

// 月桂直接用徽章坐标画，换算成 viewBox 2 的路径
const P = ([x, y]) => `${(x + 1).toFixed(4)} ${(1 - y).toFixed(4)}`;
const pathItem = (d, look) => ({ kind: 'path', d, viewBox: 2, scale: 1, center: [0, 0], ...look });

/** 杏仁形叶片：两段二次贝塞尔。 */
function leaf(base, dir, len, w) {
  const tip = [base[0] + dir[0] * len, base[1] + dir[1] * len];
  const nor = [-dir[1], dir[0]];
  const m = [base[0] + dir[0] * len * 0.45, base[1] + dir[1] * len * 0.45];
  const a = [m[0] + nor[0] * w, m[1] + nor[1] * w];
  const b = [m[0] - nor[0] * w, m[1] - nor[1] * w];
  return `M${P(base)}Q${P(a)} ${P(tip)}Q${P(b)} ${P(base)}Z`;
}

/**
 * 一枝月桂（side = −1 左，1 右）：细茎沿圆弧生长，7 对叶片越往梢头越小，梢头一片顶叶。
 * 每片叶子单独一个浮雕件，拼进同一条 evenodd 路径的话重叠处会被挖空。
 */
function laurel(side, look) {
  const r0 = 0.405;
  const th = (t) => -Math.PI / 2 + side * (0.2 + t * Math.PI * 0.6);
  const at = (t) => [r0 * Math.cos(th(t)), r0 * Math.sin(th(t))];
  const tan = (t) => [-Math.sin(th(t)) * side, Math.cos(th(t)) * side];
  const nor = (t) => [Math.cos(th(t)), Math.sin(th(t))];
  // 茎：沿弧的细带，往梢头收细
  const steps = 28;
  const outer = [];
  const inner = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = at(t);
    const n = nor(t);
    const w = 0.007 * (1 - t * 0.6);
    outer.push([p[0] + n[0] * w, p[1] + n[1] * w]);
    inner.push([p[0] - n[0] * w, p[1] - n[1] * w]);
  }
  const stem = `M${outer.map(P).join('L')}L${inner.reverse().map(P).join('L')}Z`;
  const leafLook = { ...look, height: 0.028, bevel: 0.005 };
  const items = [pathItem(stem, { ...look, height: 0.02, bevel: 0.003 })];
  const pairs = 7;
  const phi = 0.62; // 叶片和茎的夹角
  for (let i = 0; i < pairs; i++) {
    const t = 0.06 + (i / pairs) * 0.86;
    const p = at(t);
    const tg = tan(t);
    const nr = nor(t);
    const size = 1 - t * 0.45;
    for (const out of [1, -1]) {
      const d = [tg[0] * Math.cos(phi) + nr[0] * Math.sin(phi) * out, tg[1] * Math.cos(phi) + nr[1] * Math.sin(phi) * out];
      const len = (out > 0 ? 0.12 : 0.1) * size;
      items.push(pathItem(leaf(p, d, len, 0.026 * size), leafLook));
    }
  }
  items.push(pathItem(leaf(at(1), tan(1), 0.085, 0.018), leafLook));
  return items;
}

/** 环带下弧四枚戳记，从左到右：铜、银、金、品牌色宝石。没达到的是暗色珐琅。 */
function stamps(kit, unlocked, total) {
  const reached = stageOf(unlocked, total);
  return [-13.5, -4.5, 4.5, 13.5].map((deg, i) => {
    const a = -Math.PI / 2 + (deg * Math.PI) / 180;
    const center = [TEXT_R * Math.cos(a), TEXT_R * Math.sin(a)];
    const dim = { material: 'enamel', color: 'dimBand', height: 0.008, bevel: 0.002 };
    if (i < 3) {
      const look = reached > i ? { material: 'polished-metal', color: STAGE_METALS[i + 1], height: 0.026, bevel: 0.008 } : dim;
      return { kind: 'rounded-rect', half: 0.033, radius: 0.01, center, ...look };
    }
    return isComplete(unlocked, total)
      ? { kind: 'gem', radius: 0.04, center, material: 'crystal', color: kit.accent.color, height: 0.045 }
      : { kind: 'circle', radius: 0.033, center, ...dim };
  });
}

/** 圆盘顶上：进行中一颗星，完成后换成缩小的王冠。 */
function top(kit, done, look) {
  if (!done) return [{ kind: 'path', d: STAR, viewBox: 24, scale: 0.042, center: [0, 0.39], ...look, height: 0.03, z: MEDALLION_H, bevel: 0.005 }];
  return kit
    .crown(look, 0)
    .map((r) => scaleRelief(r, 0.8))
    .map((r) => ({ ...r, center: [r.center[0], r.center[1] + 0.36] }));
}

/** 背面：环带上弧品牌名、下弧戳记；圆盘里月桂环抱着伙伴，开口处星或王冠，底部一个品牌色的结。 */
function backRelief(kit, unlocked, total, look) {
  const wreath = { ...look, z: MEDALLION_H };
  return [
    ...band(kit, look),
    ...stamps(kit, unlocked, total),
    ...disc(look),
    ...laurel(-1, wreath),
    ...laurel(1, wreath),
    { kind: 'circle', radius: 0.026, center: [0, -0.41], ...kit.accent, height: 0.034, z: MEDALLION_H },
    ...top(kit, isComplete(unlocked, total), look),
    ...kit.hero(),
  ];
}

// ---------- 组装 ----------

const COPY = {
  description: '收集这个工具的全部徽章（含限定），每解锁一部分，就拼上伙伴的一片。全部解锁时伙伴完整，戴上王冠。',
  en: 'Collect every badge for this tool, limited ones included. Each batch you unlock adds a piece of your companion; unlock them all and it is whole, wearing a crown.',
};

/**
 * 全解锁徽章的配置。
 * - 静态版：按 k 只放该显示的亮片或残影；完成时星芒外形、戴王冠、下弧写 COMPLETIONIST。
 * - anim：圆形外形，亮片和残影各放全套，下弧文字 0..unlocked 各一份，由动画切换显示；
 *   亮片在原点生成，中心记在 parts.tileCenters，方便原地缩放弹出。
 *
 * @param {object} kit  品牌部件（BRANDS[i].completionist）
 * @returns {{ config: object, parts?: { lit: number[], ghost: number[], counts: number[], tileCenters: number[][] } }}
 */
export function completionistConfig(kit, { unlocked: rawUnlocked, total: rawTotal, metal, anim = false }) {
  // 输入兜底：取整、不为负，解锁数不超过总数（数据里残留已删除徽章的 id 时可能超出）
  const total = Math.max(0, Math.floor(rawTotal) || 0);
  const unlocked = Math.min(Math.max(0, Math.floor(rawUnlocked) || 0), total);
  const look = { material: 'polished-metal', color: metal ?? STAGE_METALS[stageOf(unlocked, total)] };
  const done = !anim && isComplete(unlocked, total);
  const tiles = kit.tiles();
  const head = [...band(kit, look), ...disc(look), ...(kit.eyes?.() ?? []), ...(done ? kit.crown(look) : [])];
  const config = {
    id: 'completionist',
    title: '全解锁',
    description: COPY.description,
    en: { title: 'Completionist', description: COPY.en },
    // 只为通过 validateBadge：这枚徽章不进陈列墙，进度由调用方直接给，不按 criteria 计算
    criteria: { target: total },
    shape: done ? STARBURST : CIRCLE,
    layers: [
      { kind: 'rim', ...look },
      { kind: 'face', material: 'enamel', color: 'midnight', inset: 0.11, pattern: 'rings' },
    ],
    relief: head,
    backRelief: backRelief(kit, unlocked, total, look),
    back: { material: 'enamel', color: 'midnight', engraving: false },
  };
  const place = (t) => ({ ...t.lit, center: t.center });

  if (!anim) {
    const m = litCount(tiles.length, unlocked, total);
    config.relief = [...head, ...tiles.map((t, i) => (i < m ? place(t) : t.ghost)), arc(countText(unlocked, total), 'bottom', look)];
    return { config };
  }

  const range = (from, n) => Array.from({ length: n }, (_, i) => from + i);
  const T = tiles.length;
  config.relief = [
    ...head,
    ...tiles.map((t) => t.lit),
    ...tiles.map((t) => t.ghost),
    ...Array.from({ length: unlocked + 1 }, (_, j) => arc(countText(j, total), 'bottom', look)),
  ];
  const parts = {
    lit: range(head.length, T),
    ghost: range(head.length + T, T),
    counts: range(head.length + 2 * T, unlocked + 1),
    tileCenters: tiles.map((t) => t.center),
  };
  return { config, parts };
}
