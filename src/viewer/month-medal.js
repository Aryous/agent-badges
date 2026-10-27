// 月章：年度铸币套装里每个月一枚，全解锁徽章的「小兄弟」。不进徽章注册表，配置按当月数据生成。
// 正面：一圈抛光金属环（外圈同款阶段金属），每天一个孔。有活动的日子镶一颗火珐琅珠（两个工具左右各半），
// 没活动是暗色珐琅，未来的日子一个小暗点，解锁了徽章的日子嵌一圈金边；中间写月份和 Token。
// 背面：环带 + 月桂环抱月份数字（和全解锁徽章背面同一套月桂）。
// 颜色用 medal: 前缀的色板键，由 medalPalette 按热力图的系列生成，组装时并进品牌色板。
import { BEAD_R, HAIR_R, P, SMALL, STAGE_METALS, STAR, TEXT_R, laurel, pathItem } from '../brands/shared/completionist.js';
import { RING_FONT, hasGlyph } from '../engine/text.js';
import { formatCount } from '../data/format.js';
import { PLATE } from './heatmap.js';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const MONTHS_LONG = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const pad2 = (n) => String(n).padStart(2, '0');

// ---------- 颜色 ----------

const hex2 = (v) => Math.round(v).toString(16).padStart(2, '0');
const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 宝石色：品牌色的色相，饱和度拉到 0.85（比热力图的珐琅鲜）；档位越低越浅，4 档最浓。 */
export function gemHex(hex, level) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const L = [0, 0.7, 0.62, 0.55, 0.48][level] ?? 0.48;
  const S = 0.85;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  const [x, y, z] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return '#' + [x, y, z].map((v) => hex2((v + m) * 255)).join('');
}

export const gemKey = (series, level) => `medal:${series}:${level}`;

/**
 * 月章的色板键。凹点色和热力图的 SUNK 相同，金边和热力图的解锁圈同色。
 * @param {{ color: string }[]} series  热力图的系列（顺序就是左右顺序）
 */
export function medalPalette(series) {
  const out = { 'medal:sunk': PLATE.sunk, 'medal:future': '#222c5c', 'medal:unlock': PLATE.ring, 'medal:label': '#d6c49a' };
  series.forEach((s, i) => {
    for (let l = 1; l <= 4; l++) out[gemKey(i, l)] = gemHex(s.color, l);
  });
  return out;
}

// ---------- 数据 ----------

/**
 * 一个月的月章数据。partsOf / markersOn 用热力图的同名函数（只算开着的工具）。
 * @param {{ year: number, month: number, tokens: number, activeDays: number, series: { id: string }[],
 *   partsOf: (date: string) => { id: string, level: number }[], markersOn: (date: string) => unknown[], now: string }} o
 */
export function monthMedalData({ year, month, tokens, activeDays, series, partsOf, markersOn, now }) {
  const n = new Date(year, month + 1, 0).getDate();
  const index = new Map(series.map((s, i) => [s.id, i]));
  const tools = new Set();
  const days = Array.from({ length: n }, (_, i) => {
    const date = `${year}-${pad2(month + 1)}-${pad2(i + 1)}`;
    if (date > now) return { date, future: true, parts: [], unlocks: 0 };
    const parts = partsOf(date).map((p) => ({ series: index.get(p.id), level: p.level }));
    for (const p of parts) tools.add(p.series);
    return { date, future: false, parts, unlocks: markersOn(date).length };
  });
  return {
    year,
    month,
    tokens,
    active: activeDays,
    unlocks: days.reduce((k, d) => k + d.unlocks, 0),
    tools: [...tools].sort((a, b) => a - b),
    days,
  };
}

// ---------- 几何 ----------

const CIRCLE = { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05, reeded: { count: 180, depth: 0.01 } };
const INSET = 0.11; // 正面板内缩：和全解锁徽章一样
export const RB = 0.755; // 珠子圆心所在的半径
const FUT = 0.026; // 未来的日子：一个很小的暗点
const ROUND = { curve: 16, bevel: 5 }; // 放大看也不出棱角
const INNER_R = 0.6; // 中间文字外面的一圈细线
export const TRACK_H = 0.03; // 金属环的高度
const TOP = { height: TRACK_H + 0.002, bevel: 0.003 }; // 珠子：从正面板一直到顶面，和金属环齐平

/** 第 i 天（0 起）的位置：1 号在正上方，顺时针。 */
export const beadAt = (i, n, r = RB) => {
  const a = Math.PI / 2 - (i / n) * Math.PI * 2;
  return [r * Math.cos(a), r * Math.sin(a)];
};

/** 整圆子路径：大圆分八段（放大时不出折线），小圆两段。 */
function circleD(cx, cy, r, parts = r > 0.3 ? 8 : 2) {
  let d = `M${P([cx + r, cy])}`;
  for (let i = 1; i <= parts; i++) {
    const a = (i / parts) * Math.PI * 2;
    d += `A${r.toFixed(4)} ${r.toFixed(4)} 0 0 0 ${P([cx + r * Math.cos(a), cy + r * Math.sin(a)])}`;
  }
  return d + 'Z';
}
/** 半圆：side −1 左半，1 右半（左边是第一个工具，和热力图一样）。 */
const halfD = (cx, cy, r, side) => `M${P([cx, cy + r])}A${r.toFixed(4)} ${r.toFixed(4)} 0 0 ${side < 0 ? 0 : 1} ${P([cx, cy - r])}Z`;

/** 一颗珠子：没活动是暗色珐琅；一个工具一整颗火珐琅；两个工具左右各半（按最多两个工具设计，第三个不会出现在珠子上）。 */
function bead(day, [x, y], r) {
  if (!day.parts.length) return [{ kind: 'circle', radius: r, center: [x, y], material: 'enamel-matte', color: 'medal:sunk', ...TOP, segments: ROUND }];
  const key = (p) => gemKey(p.series, p.level);
  if (day.parts.length === 1) return [{ kind: 'circle', radius: r, center: [x, y], material: 'fired-enamel', color: key(day.parts[0]), ...TOP, segments: ROUND }];
  return [-1, 1].map((side, k) => pathItem(halfD(x, y, r, side), { material: 'fired-enamel', color: key(day.parts[k]), ...TOP }));
}

const UNLOCK_HOLE = 0.079; // 解锁的日子开大的孔

/** 解锁金边：嵌在开大了的孔里，k 是孔缩小的比例。 */
const unlockRing = (center, k) => ({ kind: 'ring', radius: 0.0665 * k, width: 0.013 * k, center, material: 'polished-metal', color: 'medal:unlock', height: TRACK_H + 0.003, bevel: 0.004, segments: ROUND });

/** 正面 C：金属环上每天一个孔，珠子嵌在孔里；解锁的日子孔开大一点，嵌一圈金边。 */
function track(medal, metal) {
  const n = medal.days.length;
  // 相邻两个解锁孔不能碰：孔叠在一起时 svgShapes 会把孔当成实心。孔放不下就连金边、珠子一起缩，中间至少留 0.008 的金属
  const pitch = 2 * RB * Math.sin(Math.PI / n);
  const holeR = Math.min(UNLOCK_HOLE, pitch / 2 - 0.004);
  const k = holeR / UNLOCK_HOLE;
  let d = circleD(0, 0, 0.858) + circleD(0, 0, 0.652);
  const fills = [];
  medal.days.forEach((day, i) => {
    const at = beadAt(i, n);
    if (day.future) {
      d += circleD(at[0], at[1], FUT + 0.004);
      fills.push({ kind: 'circle', radius: FUT, center: at, material: 'enamel-matte', color: 'medal:future', ...TOP, segments: ROUND });
      return;
    }
    if (day.unlocks) {
      d += circleD(at[0], at[1], holeR);
      fills.push(unlockRing(at, k), ...bead(day, at, 0.052 * k));
    } else {
      d += circleD(at[0], at[1], 0.057);
      fills.push(...bead(day, at, 0.0555));
    }
  });
  return [pathItem(d, { material: 'polished-metal', color: metal, height: TRACK_H, bevel: 0.005 }), ...fills];
}

// ---------- 文字 ----------

/** 水平文字的宽度（徽章单位），用来防止长数字顶到圈。 */
function textWidth(text, size, tracking) {
  const em = size / RING_FONT.capHeight;
  return [...text].reduce((w, ch) => w + RING_FONT.glyphs[ch].advance * em + tracking * size, 0) - tracking * size;
}
const safe = (s) => [...s].filter(hasGlyph).join('');

/** 竖排几行字按视觉居中（同 proof-set.js 的 centerStack）：整块的中心比几何中心高一点点。 */
function stack(lines, { gap = 0.085, lift = 0.012, maxW = 0.9 } = {}) {
  const fitted = lines.map(([text, size, tracking, look]) => {
    const w = textWidth(text, size, tracking);
    return [text, w > maxW ? (size * maxW) / w : size, tracking, look];
  });
  const total = fitted.reduce((a, [, s]) => a + s, 0) + gap * (fitted.length - 1);
  let y = total / 2 + lift;
  return fitted.map(([text, size, tracking, look]) => {
    const item = { kind: 'text', text, size, tracking, center: [0, y - size / 2], ...look };
    y -= size + gap;
    return item;
  });
}

function front(medal, metal) {
  return [
    ...track(medal, metal),
    { kind: 'ring', radius: INNER_R, width: 0.012, material: 'polished-metal', color: metal, height: 0.016, bevel: 0.002, segments: { curve: 48 } },
    ...stack(
      [
        // 月份用浅香槟色、数字用象牙白：锡、铜外圈的金属字在深蓝上太暗
        [MONTHS[medal.month], 0.12, 0.26, { material: 'enamel-matte', color: 'medal:label', height: 0.026, bevel: 0.006 }],
        [safe(formatCount(medal.tokens)), 0.23, 0.04, { material: 'enamel-matte', color: 'ivory', height: 0.036, bevel: 0.008 }],
      ],
      { gap: 0.085, maxW: 0.86 },
    ),
  ];
}

// ---------- 背面 B3 ----------

const arc = (text, where, look) => ({ kind: 'text-arc', text: safe(text), arc: where, radius: TEXT_R, size: 0.088, tracking: 0.22, ...look, height: 0.024 });

function back(medal, look) {
  // 结：只用了一个工具是它的 4 档宝石色，两个工具是金边色
  const knot = medal.tools.length === 1 ? gemKey(medal.tools[0], 4) : 'medal:unlock';
  const knotMaterial = medal.tools.length === 1 ? 'fired-enamel' : 'polished-metal';
  return [
    { kind: 'ring', radius: HAIR_R, width: 0.012, ...look, height: 0.014, bevel: 0.002, segments: { curve: 48 } },
    ...Array.from({ length: 84 }, (_, i) => {
      const a = (i / 84) * Math.PI * 2;
      return { kind: 'circle', radius: 0.0085, center: [BEAD_R * Math.cos(a), BEAD_R * Math.sin(a)], ...look, height: 0.012, bevel: 0.003, segments: SMALL };
    }),
    arc(MONTHS_LONG[medal.month], 'top', look),
    arc(String(medal.year), 'bottom', look),
    ...[-TEXT_R, TEXT_R].map((x) => ({ kind: 'circle', radius: 0.02, center: [x, 0], ...look, height: 0.022 })),
    ...laurel(-1, look),
    ...laurel(1, look),
    { kind: 'path', d: STAR, viewBox: 24, scale: 0.042, center: [0, 0.39], ...look, height: 0.03, bevel: 0.005 },
    { kind: 'circle', radius: 0.026, center: [0, -0.41], material: knotMaterial, color: knot, height: 0.034 },
    ...stack([[String(medal.month + 1), 0.3, 0.02, { ...look, height: 0.045, bevel: 0.01 }]], { lift: 0 }),
  ];
}

// ---------- 组装 ----------

/**
 * 月章的引擎配置。
 * @param {ReturnType<typeof monthMedalData>} medal
 * @param {{ tier: 0|1|2|3 }} opts  外圈金属：锡、铜、银、金（monthTier 的结果）
 */
export function monthMedalConfig(medal, { tier }) {
  const metal = STAGE_METALS[tier];
  const look = { material: 'polished-metal', color: metal };
  return {
    id: `medal-${medal.year}-${pad2(medal.month + 1)}`,
    title: MONTHS[medal.month],
    // description、en、criteria 只为通过 validateBadge：月章不进陈列墙，不按 criteria 计算
    description: `${medal.year} 年 ${medal.month + 1} 月的月章`,
    en: { title: `${MONTHS_LONG[medal.month]} ${medal.year}`, description: `Month medal for ${MONTHS_LONG[medal.month]} ${medal.year}` },
    criteria: { target: 1 },
    shape: CIRCLE,
    layers: [
      { kind: 'rim', ...look },
      { kind: 'face', material: 'enamel-matte', color: 'midnight', inset: INSET, pattern: 'rings' },
    ],
    relief: front(medal, metal),
    backRelief: back(medal, look),
    back: { material: 'enamel-matte', color: 'midnight', engraving: false },
  };
}
