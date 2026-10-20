import { clawd, medallion, textRing, MEDALLION_H } from '../helpers.js';

// 功能探索系列：每个 Claude Code 能力一枚。

// 5 个子代理围绕主代理
const SUB_ANGLES = [90, 18, -54, -126, 162].map((d) => (d * Math.PI) / 180);
const subAt = (r) => SUB_ANGLES.map((t) => [Math.cos(t) * r, Math.sin(t) * r]);

const subagentCommander = {
  id: 'subagent-commander',
  title: '子代理指挥官',
  titleEn: 'SUBAGENT COMMANDER',
  description: '在一次会话中同时调度 5 个子代理并行工作。',
  criteria: { metric: 'subagents.parallelMax', target: 5 },
  shape: { type: 'starburst', points: 12, radius: 1.06, innerRadius: 0.8, tipRoundness: 0.1, valleyRoundness: 0.06, depth: 0.2, bevel: 0.03 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'rose' },
    { kind: 'face', material: 'enamel', color: 'violet', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CLAUDE CODE', bottom: 'SUBAGENT COMMANDER', radius: 0.575, size: 0.074, metal: 'polished-metal', color: 'rose' }),
    ...medallion({ radius: 0.47, color: 'lilac', metal: 'polished-metal', metalColor: 'rose' }),
    // 主代理到子代理的连线
    ...SUB_ANGLES.map((t) => ({
      kind: 'capsule',
      from: [Math.cos(t) * 0.2, Math.sin(t) * 0.2],
      to: [Math.cos(t) * 0.25, Math.sin(t) * 0.25],
      width: 0.016, material: 'polished-metal', color: 'rose', height: 0.016, z: MEDALLION_H,
    })),
    ...clawd({ cell: 0.021, center: [0, 0.02] }),
    ...subAt(0.32).flatMap((center) => clawd({ cell: 0.0088, center, color: 'ivory', height: 0.04 })),
  ],
  back: { material: 'brushed-metal', color: 'rose' },
};

// ---------------------------------------------------------------------------
// App 图标家族：圆角方形 + 阳极氧化铝外框 + 深色珐琅底 + 亮色圆角面板 + 像素图标。
// 上边条写品牌，下边条写功能名；小怪物在面板里和图标互动。
// ---------------------------------------------------------------------------

// 方形的视觉面积比同外接半径的圆小，整体放大 S 倍，陈列墙上和圆形徽章看起来一样大
const S = 1.18;
const APP_SHAPE = { type: 'polygon', sides: 4, rotation: Math.PI / 4, radius: 1.12 * S, cornerRadius: 0.34 * S, depth: 0.2, bevel: 0.035 };
const APP_INSET = 0.09;
const PANEL = 0.5; // 面板半边长
const PANEL_Y = 0.0;
const BAND_Y = 0.6; // 上下边条文字的中心高度

/** 圆角矩形面板：直边加圆弧的矢量轮廓，挤出成单个几何体，放大到多近都没有台阶。 */
function roundRect(half, radius, { cy = 0, ...item }) {
  return [{ kind: 'rounded-rect', half, radius, center: [0, cy], ...item }];
}

/** 把一个浮雕基元的平面尺寸放大 k 倍（高度不变）。 */
function scaleItem(item, k) {
  const out = { ...item };
  for (const key of ['center', 'from', 'to']) if (out[key]) out[key] = out[key].map((v) => v * k);
  for (const key of ['cell', 'width', 'radius', 'size', 'half']) if (out[key] !== undefined) out[key] *= k;
  return out;
}

/** 面板上表面高度：图标和小怪物要用 z: PANEL_TOP 抬起来。 */
const PANEL_TOP = 0.03;

/**
 * App 图标徽章骨架。
 * @param {object} o
 * @param {string} o.rim   外框阳极氧化颜色
 * @param {string} o.face  底面深色珐琅
 * @param {string} o.panel 面板亮色珐琅
 * @param {string} o.metal 描边与文字的金属色
 * @param {string} o.name  下边条文字
 */
function appIcon({ id, title, titleEn, description, criteria, rim, face, panel, metal = 'silver', name, art }) {
  return {
    id,
    title,
    titleEn,
    description,
    criteria,
    shape: APP_SHAPE,
    layers: [
      { kind: 'rim', material: 'anodized', color: rim },
      { kind: 'face', material: 'enamel', color: face, inset: APP_INSET, pattern: 'rings' },
    ],
    relief: [
      // 面板金属描边（垫在面板下面，露出一圈）
      // 面板：金属描边垫在下面（比面板低、比面板大一圈），珐琅面板盖在上面
      ...roundRect(PANEL + 0.03, 0.2, { cy: PANEL_Y, material: 'polished-metal', color: metal, height: 0.018, bevel: 0.006 }),
      ...roundRect(PANEL, 0.18, { cy: PANEL_Y, material: 'enamel', color: panel, height: PANEL_TOP, pattern: 'sunburst', bevel: 0.006 }),
      { kind: 'text', text: 'CLAUDE CODE', size: 0.058, center: [0, BAND_Y], tracking: 0.32, material: 'polished-metal', color: metal, height: 0.02, bevel: 0.004 },
      { kind: 'text', text: name, size: 0.064, center: [0, -BAND_Y], tracking: 0.32, material: 'polished-metal', color: metal, height: 0.02, bevel: 0.004 },
      ...art.map((a) => ({ ...a, z: (a.z ?? 0) + PANEL_TOP })),
    ].map((item) => scaleItem(item, S)),
    // 背面拉丝：银色太亮，改用钢灰；金色保留
    back: { material: 'brushed-metal', color: metal === 'silver' ? 'steel' : metal, safeRadius: 0.6 * S },
  };
}

/** 小怪物（放在面板上）。 */
const mascot = (cell, center) => clawd({ cell, center, z: 0, height: 0.055 });

// ---------- 像素图标 ----------

// 鱼钩：顶部挂环 + 竖杆 + J 形弯钩 + 倒刺
const HOOK = [
  '........####..',
  '.......##..##.',
  '.......##..##.',
  '........####..',
  '.........##...',
  '.........##...',
  '.........##...',
  '.........##...',
  '.........##...',
  '##.......##...',
  '###......##...',
  '.##......##...',
  '.##.....###...',
  '.###...###....',
  '..#######.....',
  '...#####......',
];

// 插头：两根插脚 + 插头体 + 电线
const PLUG = [
  '##########',
  '##########',
  '##########',
  '##########',
  '##########',
  '.########.',
  '...####...',
  '...####...',
];
const PLUG_PINS = [
  '.##....##.',
  '.##....##.',
  '.##....##.',
];

// 闪电
const BOLT = [
  '.....#####',
  '....#####.',
  '...#####..',
  '..#####...',
  '.#########',
  '#########.',
  '....####..',
  '...####...',
  '..####....',
  '.###......',
  '##........',
];

// 剪贴板：板身、夹子、勾选、文字行分层上色
const BOARD = [
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
];
const CLIP = ['.#####.', '#######'];
const CHECKS = [
  '...........',
  '...........',
  '.....#.....',
  '.#..#......',
  '..##.......',
  '...........',
  '.....#.....',
  '.#..#......',
  '..##.......',
  '...........',
  '...........',
  '...........',
];
const LINES = [
  '...........',
  '...........',
  '...........',
  '......####.',
  '...........',
  '...........',
  '...........',
  '......####.',
  '...........',
  '.###..####.',
  '...........',
  '...........',
];

const px = (rows, cell, center, color, material = 'enamel', height = 0.05) => ({
  kind: 'pixels', rows, cell, center, material, color, height, bevel: Math.min(0.012, cell * 0.3),
});

const hooksSmith = appIcon({
  id: 'hooks-smith',
  title: '钩子匠人',
  titleEn: 'HOOKS SMITH',
  description: '配置了第一个 Hook。从此每次提交前，都有人替你把关。',
  criteria: { metric: 'features.hooks', target: 1 },
  rim: 'teal',
  face: 'teal',
  panel: 'aqua',
  name: 'HOOKS',
  art: [
    // 钩子从上方垂下来，钩尖正好够到小怪物头顶
    px(HOOK, 0.03, [0.045, 0.16], 'silver', 'polished-metal', 0.06),
    ...mascot(0.021, [0, -0.3]),
  ],
});

const connector = appIcon({
  id: 'connector',
  title: '连接者',
  titleEn: 'MCP CONNECTOR',
  description: '接入 3 个 MCP 服务。小家伙的插座越来越多了。',
  criteria: { metric: 'features.mcpServers', target: 3 },
  rim: 'magenta',
  face: 'plum',
  panel: 'scarlet',
  name: 'MCP',
  art: [
    // 插头 + 插脚
    // 插头 + 插脚，电线垂下来被小怪物抱住
    px(PLUG, 0.032, [0, 0.12], 'snow', 'enamel', 0.06),
    px(PLUG_PINS, 0.032, [0, 0.12 + 0.032 * 5.5], 'silver', 'polished-metal', 0.07),
    { kind: 'capsule', from: [0, -0.01], to: [0, -0.2], width: 0.03, material: 'enamel', color: 'snow', height: 0.035 },
    ...mascot(0.021, [0, -0.3]),
  ],
});

const skillMaster = appIcon({
  id: 'skill-master',
  title: '技能大师',
  titleEn: 'SKILL MASTER',
  description: '调用 Skill 50 次。会的招式多了，出手就快了。',
  criteria: { metric: 'features.skillCalls', target: 50 },
  rim: 'sapphire',
  face: 'navy',
  panel: 'sky',
  metal: 'gold',
  name: 'SKILLS',
  art: [
    px(BOLT, 0.034, [0.01, 0.13], 'topaz', 'enamel', 0.065),
    ...mascot(0.021, [0, -0.3]),
  ],
});

const planMode = appIcon({
  id: 'plan-mode',
  title: '深思熟虑',
  titleEn: 'PLAN MODE',
  description: '用过 Plan 模式。先想清楚，再动手。',
  criteria: { metric: 'features.planMode', target: 1 },
  rim: 'forest',
  face: 'forest',
  panel: 'lime',
  name: 'PLAN MODE',
  art: [
    px(BOARD, 0.032, [0, 0.11], 'sand', 'enamel', 0.04),
    px(CHECKS, 0.032, [0, 0.11], 'forest', 'enamel', 0.06),
    px(LINES, 0.032, [0, 0.11], 'steel', 'enamel', 0.055),
    px(CLIP, 0.032, [0, 0.11 + 0.032 * 6.5], 'silver', 'polished-metal', 0.07),
    ...mascot(0.021, [0, -0.32]),
  ],
});

export default [subagentCommander, hooksSmith, connector, skillMaster, planMode];
