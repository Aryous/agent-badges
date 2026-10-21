import { MEDALLION_H, around, clawd, onClawd } from '../helpers.js';
import { roundMedal, withTopTier } from '../../shared/medal.js';
import { MOON, SNOWFLAKE, balloons, burst, calendar, cap, dialTicks, dot, hourglass, label, lantern, midnightHands, plane, px, rect, ring, terminal } from '../../shared/art.js';

// 0.5 新增的 Claude Code 徽章（按系列分组，由 badges.js 并入各系列）。
// 画面按圆盘半径 0.56 设计（k = 1），外形内切圆较小时由 roundMedal 整体内缩。

const BRAND = 'CLAUDE CODE';
const Z = MEDALLION_H;
const medal = (o) => roundMedal({ brandText: BRAND, ...o });

// ===========================================================================
// 习惯

// ---------- 跨日夜战：十二边形表盘，时针分针在 12 点重合 ----------

const midnightCrossing = {
  id: 'midnight-crossing',
  title: '跨日夜战',
  titleEn: 'PAST MIDNIGHT',
  description: '同一个会话从前一天 23 点前一直写到第二天凌晨 2 点后。表针在 12 点重合，日期翻篇，小家伙还在。',
  criteria: { metric: 'session.midnight', target: 1 },
  ...medal({
    bottom: 'PAST MIDNIGHT',
    shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
    metal: 'silver',
    band: 'midnight',
    disc: 'navy',
    art: [
      ...dialTicks(),
      ...midnightHands(),
      px(MOON, 0.026, [-0.22, 0.19], 'honey', 'enamel', 0.045),
      ...[[0.2, 0.25, 0.016], [0.26, 0.1, 0.012], [-0.3, 0.02, 0.012]].map(([x, y, r]) => dot([x, y], r, 'snow', 0.02)),
      ...clawd({ cell: 0.018, center: [0, -0.24], height: 0.055 }),
    ],
  }),
};

// ---------- 高产日：软十芒星，身后一叠会话窗口 ----------

const productiveDay = {
  id: 'productive-day',
  title: '高产日',
  titleEn: 'PRODUCTIVE DAY',
  description: '一天之内开启 20 个会话。窗口一个叠一个，今天的点子格外多。',
  criteria: { metric: 'sessions.perDay', target: 20 },
  ...medal({
    bottom: '20 SESSIONS',
    shape: { type: 'starburst', points: 10, radius: 1.07, innerRadius: 0.9, tipRoundness: 0.22, valleyRoundness: 0.12, depth: 0.22, bevel: 0.035 },
    metal: 'gold',
    band: 'teal',
    disc: 'aqua',
    art: [
      ...terminal({ center: [-0.15, 0.2], half: 0.13, panel: 'slate', z: Z }),
      ...terminal({ center: [0, 0.1], half: 0.13, panel: 'navy', z: Z + 0.035 }),
      ...terminal({ center: [0.15, 0], half: 0.13, panel: 'ink', z: Z + 0.07 }),
      ...clawd({ cell: 0.017, center: [-0.12, -0.27], height: 0.055 }),
    ],
  }),
};

// ---------- 多线并行：九边形，三个终端三只小怪物 ----------

const multitasker = {
  id: 'multitasker',
  title: '多线并行',
  titleEn: 'MULTITASKER',
  description: '同一时刻有 3 个会话一起在跑。三块屏幕三只小家伙，各干各的，互不打扰。',
  criteria: { metric: 'sessions.parallel', target: 3 },
  ...medal({
    bottom: 'MULTITASKER',
    shape: { type: 'polygon', sides: 6, radius: 1.08, cornerRadius: 0.16, rotation: 0, depth: 0.22, bevel: 0.045 },
    metal: 'rose',
    band: 'plum',
    disc: 'lilac',
    art: [-0.27, 0, 0.27].flatMap((x, i) => [
      ...terminal({ center: [x, 0.1 + (i === 1 ? 0.04 : 0)], half: 0.1, prompt: ['lime', 'amber', 'aqua'][i] }),
      ...clawd({ cell: 0.0135, center: [x, -0.13 + (i === 1 ? 0.04 : 0)], height: 0.05 }),
    ]),
  }),
};

// ---------- 全勤月：十六边形，圆盘上一页日历，工作日全部打勾 ----------

const perfectMonth = {
  id: 'perfect-month',
  title: '全勤月',
  titleEn: 'PERFECT MONTH',
  description: '一个月里每个工作日都和 Claude Code 见了面。日历上一格不落，全是勾。',
  criteria: { metric: 'days.perfectMonth', target: 22 },
  ...medal({
    bottom: 'PERFECT MONTH',
    shape: { type: 'polygon', sides: 6, radius: 1.08, cornerRadius: 0.16, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
    metal: 'gold',
    band: 'forest',
    disc: 'lime',
    art: [
      ...calendar(),
    ],
  }),
};

// ===========================================================================
// 里程碑（铜 / 银 / 金，顶级三款随机）

// ---------- 协作时长：圆形表圈 60 道刻度，沙漏 ----------

const HG = [-0.04, -0.13];
const activeHoursBase = {
  id: 'active-hours',
  title: '协作时长',
  titleEn: '{label} TOGETHER',
  description: '和 Claude Code 一起专注干活的时长。挂着不动不算，几个会话同时开着也只算一次。',
  criteria: { metric: 'time.activeHours' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'amber', label: '10H' },
    { threshold: 100, metal: 'silver', accent: 'sky', label: '100H' },
    { threshold: 1000, metal: 'gold', accent: 'aqua', label: '1000H' },
  ],
  ...medal({
    bottom: '{label} TOGETHER',
    shape: { type: 'circle', radius: 1, depth: 0.24, bevel: 0.05 },
    metal: '$metal',
    band: 'navy',
    disc: '$accent',
    contour: false,
    // 表圈：60 道刻度
    extra: around(60, 1).map(([c, s], i) => cap([c * (i % 5 ? 0.85 : 0.83), s * (i % 5 ? 0.85 : 0.83)], [c * 0.875, s * 0.875], i % 5 ? 0.008 : 0.014, '$metal', 0.016, 'polished-metal', 0)),
    art: [
      { kind: 'text', text: '{label}', size: 0.15, center: [0, 0.29], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      ...hourglass(HG, 0.03),
      ...clawd({ cell: 0.0125, center: [0.24, -0.25], height: 0.045 }),
    ],
  }),
};
const activeHours = withTopTier(activeHoursBase, { threshold: 5000, label: '5000H' }, 'claude-code/active-hours');

// ---------- 子代理派遣：八芒罗盘星，放飞一串纸飞机 ----------

const dispatchesBase = {
  id: 'dispatches',
  title: '子代理派遣',
  titleEn: '{label} DISPATCHES',
  description: '派出去的子代理次数。一架架纸飞机放出去，带着结果飞回来。',
  criteria: { metric: 'subagents.dispatched' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sky', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'aqua', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'lilac', label: '1K' },
  ],
  ...medal({
    bottom: '{label} DISPATCHES',
    shape: { type: 'starburst', points: 8, radius: 1.08, innerRadius: 0.86, tipRoundness: 0.16, valleyRoundness: 0.16, depth: 0.22, bevel: 0.035 },
    metal: '$metal',
    band: 'cobalt',
    disc: '$accent',
    textSize: 0.088,
    art: [
      { kind: 'text', text: '{label}', size: 0.17, center: [0, 0.26], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      // 航迹点
      ...[[-0.02, -0.13], [0.04, -0.1], [0.1, -0.06]].map((c) => dot(c, 0.016, 'snow', 0.02)),
      ...[[0.2, 0.03, 0.14], [0.35, -0.17, 0.1]].map(([x, y, s]) => plane([x, y], s)),
      ...clawd({ cell: 0.018, center: [-0.17, -0.22], height: 0.055 }),
    ],
  }),
};
const dispatches = withTopTier(dispatchesBase, { threshold: 10000, label: '10K' }, 'claude-code/dispatches');

// ---------- 联网检索：细齿圆边，地球 + 放大镜 ----------

/** 椭圆经线环（24 格 viewBox） */
const MERIDIAN = 'M12 2 A5 10 0 1 0 12 22 A5 10 0 1 0 12 2 Z M12 3.8 A3.2 8.2 0 1 1 12 20.2 A3.2 8.2 0 1 1 12 3.8 Z';
const GLOBE = [0.02, -0.06];
const GLOBE_R = 0.2;

const webResearchBase = {
  id: 'web-research',
  title: '联网检索',
  titleEn: '{label} SEARCHES',
  description: '让 Claude Code 联网搜索、抓取网页的次数。不知道的，就去全世界找答案。',
  criteria: { metric: 'tools.web' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sky', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'lime', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'aqua', label: '1K' },
  ],
  ...medal({
    bottom: '{label} SEARCHES',
    shape: { type: 'polygon', sides: 8, radius: 1.05, cornerRadius: 0.12, rotation: Math.PI / 8, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'forest',
    disc: '$accent',
    art: [
      { kind: 'text', text: '{label}', size: 0.15, center: [0, 0.3], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      dot(GLOBE, GLOBE_R, 'azure', 0.03),
      ring(GLOBE, GLOBE_R, 0.024, '$metal', 0.05),
      { kind: 'path', d: MERIDIAN, viewBox: 24, scale: GLOBE_R, center: GLOBE, material: 'polished-metal', color: '$metal', height: 0.045, z: Z, bevel: 0.004 },
      cap([GLOBE[0] - GLOBE_R, GLOBE[1]], [GLOBE[0] + GLOBE_R, GLOBE[1]], 0.016, '$metal', 0.045, 'polished-metal'),
      ...[-1, 1].map((s) => {
        const y = GLOBE[1] + s * GLOBE_R * 0.5;
        const w = GLOBE_R * Math.sqrt(1 - 0.25) - 0.01;
        return cap([GLOBE[0] - w, y], [GLOBE[0] + w, y], 0.012, '$metal', 0.04, 'polished-metal');
      }),
      // 放大镜压在地球右下
      dot([0.22, -0.2], 0.085, 'snow', 0.06, 'enamel'),
      ring([0.22, -0.2], 0.095, 0.032, '$metal', 0.075),
      cap([0.29, -0.27], [0.36, -0.34], 0.05, 'ink', 0.07),
      // 小怪物在地球左下角探头
      ...clawd({ cell: 0.0135, center: [-0.24, -0.27], height: 0.05 }),
    ],
  }),
};
const webResearch = withTopTier(webResearchBase, { threshold: 10000, label: '10K' }, 'claude-code/web-research');

// ---------- 文件编辑：五边形，铅笔压在 +/− 差异行上 ----------

const PLUS = ['.#.', '###', '.#.'];
const MINUS = ['...', '###', '...'];

const fileEditsBase = {
  id: 'file-edits',
  title: '文件编辑',
  titleEn: '{label} EDITS',
  description: '改过、写过的文件次数。一行加，一行减，代码就是这样一点点变好的。',
  criteria: { metric: 'tools.edits' },
  tiers: [
    { threshold: 100, metal: 'bronze', accent: 'sand', label: '100' },
    { threshold: 1000, metal: 'silver', accent: 'sky', label: '1K' },
    { threshold: 10000, metal: 'gold', accent: 'lilac', label: '10K' },
  ],
  ...medal({
    bottom: '{label} EDITS',
    shape: { type: 'polygon', sides: 5, radius: 1.1, cornerRadius: 0.2, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'slate',
    disc: '$accent',
    art: [
      { kind: 'text', text: '{label}', size: 0.16, center: [0, 0.28], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: Z },
      rect(0.24, 0.05, [-0.04, -0.12], 'snow', 0.03),
      // 小怪物趴在差异卡片右上角
      ...clawd({ cell: 0.012, center: [0.21, 0.085], height: 0.045 }),
      // 四行差异：+ 绿、− 红
      ...[['mint', PLUS, 0.03], ['scarlet', MINUS, -0.05], ['mint', PLUS, -0.13], ['mint', PLUS, -0.21]].flatMap(([color, sign, y], i) => [
        px(sign, 0.018, [-0.22, y], color, 'enamel', 0.05, Z + 0.03),
        cap([-0.16, y], [[0.12, 0.02, 0.08, -0.02][i], y], 0.026, color, 0.045, 'enamel', Z + 0.03),
      ]),
      // 铅笔：斜着压在右下
      cap([0.08, -0.36], [0.33, -0.11], 0.07, 'amber', 0.08, 'enamel', Z + 0.04),
      cap([0.27, -0.17], [0.33, -0.11], 0.07, 'rose', 0.085, 'polished-metal', Z + 0.04),
      cap([0.05, -0.39], [0.08, -0.36], 0.04, 'ink', 0.07, 'enamel', Z + 0.04),
    ],
  }),
};
const fileEdits = withTopTier(fileEditsBase, { threshold: 100000, label: '100K' }, 'claude-code/file-edits');

// ===========================================================================
// 节日限定

// ---------- 元旦：十八芒星，三簇烟花 ----------

const newYear = {
  id: 'new-year',
  title: '元旦',
  titleEn: 'NEW YEAR',
  description: '1 月 1 日和 Claude Code 一起写代码。新年第一个提交，小家伙仰头看烟花。',
  criteria: { metric: 'days.newYear', target: 1 },
  ...medal({
    bottom: 'HAPPY NEW YEAR',
    shape: { type: 'starburst', points: 12, radius: 1.07, innerRadius: 0.9, tipRoundness: 0.14, valleyRoundness: 0.12, depth: 0.22, bevel: 0.035 },
    metal: 'gold',
    band: 'midnight',
    disc: 'navy',
    art: [
      ...burst([-0.17, 0.17], 0.2, 12, 'amber', 0.03),
      ...burst([0.22, 0.24], 0.14, 10, 'scarlet', 0.026),
      ...burst([0.22, -0.06], 0.11, 8, 'aqua', 0.024),
      ...[[-0.33, -0.05], [0.36, 0.1], [-0.05, 0.38]].map((c) => dot(c, 0.012, 'snow', 0.02)),
      ...clawd({ cell: 0.018, center: [-0.06, -0.26], height: 0.055 }),
    ],
  }),
};

// ---------- 春节：五瓣梅花，一对红灯笼 ----------

const springFestival = {
  id: 'spring-festival',
  title: '春节',
  titleEn: 'SPRING FESTIVAL',
  description: '农历正月初一和 Claude Code 一起写代码。灯笼挂起来，新春第一行代码。',
  criteria: { metric: 'days.springFestival', target: 1 },
  ...medal({
    bottom: 'SPRING FESTIVAL',
    shape: { type: 'flower', petals: 5, radius: 1.1, petal: 0.44, valley: 0.1, depth: 0.22, bevel: 0.04 },
    metal: 'gold',
    band: 'crimson',
    disc: 'honey',
    art: [
      ...lantern(-0.21, 0.1, 0.036),
      ...lantern(0.21, 0.1, 0.036),
      ...clawd({ cell: 0.021, center: [0, -0.27], height: 0.055 }),
    ],
  }),
};

// ---------- 生日快乐：七边形，小怪物牵着一串气球 ----------

const BALLOONS = [
  { c: [-0.14, 0.2], r: 0.09, color: 'scarlet' },
  { c: [0.06, 0.28], r: 0.095, color: 'amber' },
  { c: [0.2, 0.12], r: 0.085, color: 'aqua' },
];
const HAND = [0.17, -0.17];

const toolBirthday = {
  id: 'tool-birthday',
  title: '生日快乐',
  titleEn: 'HAPPY BIRTHDAY',
  description: '2 月 24 日，Claude Code 的生日（2025 年这天发布）。这天和它一起写代码，小家伙牵着气球来道谢。',
  criteria: { metric: 'days.toolBirthday', target: 1 },
  ...medal({
    bottom: 'HAPPY BIRTHDAY',
    shape: { type: 'flower', petals: 8, radius: 1.07, petal: 0.3, valley: 0.08, depth: 0.22, bevel: 0.04 },
    metal: 'rose',
    band: 'teal',
    disc: 'sky',
    art: [
      ...balloons(BALLOONS, HAND),
      { kind: 'text', text: 'FEB 24', size: 0.07, center: [-0.2, -0.04], tracking: 0.1, material: 'polished-metal', color: 'rose', height: 0.03, z: Z },
      ...clawd({ cell: 0.018, center: [0.03, -0.25], height: 0.055 }),
    ],
  }),
};

// ---------- 圣诞节：六芒软星，戴圣诞帽的小怪物 + 雪花 ----------

/** 圣诞帽：帽身往右上斜，帽尖垂到右边。从头顶上方 5 行开始。 */
const SANTA_HAT = [
  '........#####...',
  '......#########.',
  '.....##########.',
  '....######...###',
  '...#######......',
];
const SANTA_BRIM = ['..############..'];
const XMAS = { cell: 0.03, center: [0, -0.16] };

const christmas = {
  id: 'christmas',
  title: '圣诞节',
  titleEn: 'CHRISTMAS',
  description: '12 月 25 日和 Claude Code 一起写代码。圣诞帽戴好，今天的礼物是一个通过的测试。',
  criteria: { metric: 'days.christmas', target: 1 },
  ...medal({
    bottom: 'MERRY CHRISTMAS',
    shape: { type: 'starburst', points: 6, radius: 1.1, innerRadius: 0.84, tipRoundness: 0.3, valleyRoundness: 0.2, depth: 0.22, bevel: 0.04 },
    metal: 'silver',
    band: 'forest',
    disc: 'snow',
    art: [
      ...[[-0.3, 0.2, 0.026], [0.3, 0.28, 0.02], [-0.36, -0.14, 0.018], [0.37, -0.04, 0.018], [-0.02, 0.38, 0.016]].map(([x, y, c]) => px(SNOWFLAKE, c, [x, y], 'sky', 'enamel', 0.03)),
      ...clawd({ ...XMAS, height: 0.06 }),
      onClawd(XMAS, SANTA_HAT, { col: 1, row: -5, material: 'enamel', color: 'ruby', height: 0.065 }),
      onClawd(XMAS, SANTA_BRIM, { col: 0, row: -1, material: 'enamel', color: 'ivory', height: 0.08 }),
      onClawd(XMAS, ['###', '###'], { col: 13, row: -3, material: 'enamel', color: 'ivory', height: 0.075 }),
    ],
  }),
};

export const moreMilestones = [activeHours, dispatches, webResearch, fileEdits];
export const moreHabits = [midnightCrossing, productiveDay, multitasker, perfectMonth];
export const moreLimited = [newYear, springFestival, toolBirthday, christmas];
