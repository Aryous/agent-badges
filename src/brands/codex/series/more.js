import { MEDALLION_H, around, codexMark, onMark } from '../helpers.js';
import { roundMedal, withTopTier } from '../../shared/medal.js';
import { MOON, SNOWFLAKE, balloons, burst, calendar, cap, dialTicks, dot, hourglass, label, lantern, midnightHands, plane, px, terminal } from '../../shared/art.js';

// 0.5 新增的 Codex 徽章（按系列分组，由 badges.js 并入各系列）。
// 题材和 Claude Code 的同名徽章一致，主角换成 Codex 云形标志；外形、配色都和 Claude Code 错开。

const Z = MEDALLION_H;
const medal = (o) => roundMedal({ brandText: 'CODEX', ...o });

// ===========================================================================
// 习惯

// ---------- 跨日夜战：十边形表盘 ----------

const midnightCrossing = {
  id: 'midnight-crossing',
  title: '跨日夜战',
  titleEn: 'PAST MIDNIGHT',
  description: '同一个会话从前一天 23 点前一直聊到第二天凌晨 2 点后。指针在 12 点重合，云朵还亮着。',
  criteria: { metric: 'session.midnight', target: 1 },
  ...medal({
    bottom: 'PAST MIDNIGHT',
    shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
    metal: 'platinum',
    band: 'violet',
    disc: 'midnight',
    art: [
      ...dialTicks(0.49, 'platinum', 'lilac'),
      ...midnightHands('platinum', 0.04),
      px(MOON, 0.026, [-0.22, 0.2], 'honey', 'enamel', 0.045),
      ...[[0.2, 0.26, 0.016], [0.27, 0.1, 0.012], [-0.3, 0.02, 0.012]].map(([x, y, r]) => dot([x, y], r, 'snow', 0.02)),
      ...codexMark({ size: 0.15, center: [0, -0.25], height: 0.06 }),
    ],
  }),
};

// ---------- 高产日：盾牌，一列线程清单 ----------

const productiveDay = {
  id: 'productive-day',
  title: '高产日',
  titleEn: 'PRODUCTIVE DAY',
  description: '一天之内开启 20 个 Codex 线程。清单一行接一行，今天的点子格外多。',
  criteria: { metric: 'threads.perDay', target: 20 },
  ...medal({
    bottom: '20 THREADS',
    shape: { type: 'shield', radius: 1, width: 0.9, top: 0.92, shoulder: 0.1, bottom: -1.06, cornerRadius: 0.22, depth: 0.22, bevel: 0.04 },
    metal: 'gold',
    band: 'navy',
    disc: 'sky',
    art: [
      ...codexMark({ size: 0.17, center: [0, 0.25], height: 0.06 }),
      // 线程清单：四行药丸，每行前面一个对勾色点
      ...[0.04, -0.08, -0.2, -0.32].flatMap((y, i) => [
        cap([-0.22, y], [0.24 - (i % 2) * 0.08, y], 0.075, 'snow', 0.035),
        dot([-0.2, y], 0.022, ['lime', 'amber', 'aqua', 'lime'][i], 0.045),
      ]),
    ],
  }),
};

// ---------- 多线并行：尖顶六边形，三个终端 ----------

const multitasker = {
  id: 'multitasker',
  title: '多线并行',
  titleEn: 'MULTITASKER',
  description: '同一时刻有 3 个 Codex 会话一起在跑。三块屏幕同时滚动，云朵在中间调度。',
  criteria: { metric: 'threads.parallel', target: 3 },
  ...medal({
    bottom: 'MULTITASKER',
    shape: { type: 'polygon', sides: 6, radius: 1.08, cornerRadius: 0.18, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
    metal: 'silver',
    band: 'teal',
    disc: 'aqua',
    art: [
      ...codexMark({ size: 0.15, center: [0, 0.24], height: 0.06 }),
      ...[-0.27, 0, 0.27].flatMap((x, i) => terminal({ center: [x, -0.13], half: 0.1, panel: 'midnight', prompt: ['lime', 'amber', 'lavender'][i] })),
      // 云朵到三块屏幕的连线
      ...[-0.27, 0, 0.27].map((x) => cap([x * 0.35, 0.1], [x, -0.01], 0.014, 'silver', 0.02, 'polished-metal')),
    ],
  }),
};

// ---------- 全勤月：二十四齿印章边 ----------

const perfectMonth = {
  id: 'perfect-month',
  title: '全勤月',
  titleEn: 'PERFECT MONTH',
  description: '一个月里每个工作日都打开过 Codex。日历一格不落，盖个全勤章。',
  criteria: { metric: 'days.perfectMonth', target: 22 },
  ...medal({
    bottom: 'PERFECT MONTH',
    shape: { type: 'flower', petals: 8, radius: 1.07, petal: 0.3, valley: 0.08, depth: 0.22, bevel: 0.04 },
    metal: 'rose',
    band: 'cobalt',
    disc: 'periwinkle',
    art: [...calendar({ header: 'electric', ticks: 'electric', binder: 'rose' })],
  }),
};

// ===========================================================================
// 里程碑（铜 / 银 / 金，顶级三款随机）

// ---------- 协作时长：四十齿表圈，沙漏 ----------

const activeHoursBase = {
  id: 'active-hours',
  title: '协作时长',
  titleEn: '{label} TOGETHER',
  description: '和 Codex 一起专注干活的时长。挂着不动不算，几个会话同时开着也只算一次。',
  criteria: { metric: 'time.activeHours' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sand', label: '10H' },
    { threshold: 100, metal: 'silver', accent: 'lavender', label: '100H' },
    { threshold: 1000, metal: 'gold', accent: 'aqua', label: '1000H' },
  ],
  ...medal({
    bottom: '{label} TOGETHER',
    shape: { type: 'polygon', sides: 8, radius: 1.05, cornerRadius: 0.12, rotation: Math.PI / 8, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'violet',
    disc: '$accent',
    art: [
      label('{label}', 0.15, [0, 0.29]),
      ...hourglass([-0.1, -0.12], 0.028, { sand: 'periwinkle' }),
      ...codexMark({ size: 0.12, center: [0.2, -0.2], height: 0.055 }),
    ],
  }),
};
const activeHours = withTopTier(activeHoursBase, { threshold: 5000, label: '5000H' }, 'codex/active-hours');

// ---------- 子代理派遣：六芒星，云朵放出纸飞机 ----------

const dispatchesBase = {
  id: 'dispatches',
  title: '子代理派遣',
  titleEn: '{label} DISPATCHES',
  description: '派出去的子代理次数。云朵放出一架架纸飞机，各自去把活干完。',
  criteria: { metric: 'subagents.dispatched' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'aqua', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'sky', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'lime', label: '1K' },
  ],
  ...medal({
    bottom: '{label} DISPATCHES',
    shape: { type: 'polygon', sides: 5, radius: 1.1, cornerRadius: 0.2, depth: 0.22, bevel: 0.045 },
    metal: '$metal',
    band: 'midnight',
    disc: '$accent',
    textSize: 0.088,
    art: [
      label('{label}', 0.17, [0, 0.27]),
      ...[[-0.02, -0.08], [0.05, -0.04], [0.12, 0.0]].map((c) => dot(c, 0.016, 'snow', 0.02)),
      plane([0.22, 0.06], 0.13),
      plane([0.34, -0.15], 0.09),
      ...codexMark({ size: 0.17, center: [-0.17, -0.18], height: 0.06 }),
    ],
  }),
};
const dispatches = withTopTier(dispatchesBase, { threshold: 10000, label: '10K' }, 'codex/dispatches');

// ===========================================================================
// 节日限定

// ---------- 元旦：十二芒星，烟花 ----------

const newYear = {
  id: 'new-year',
  title: '元旦',
  titleEn: 'NEW YEAR',
  description: '1 月 1 日和 Codex 一起写代码。新年的第一个补丁，云朵后面在放烟花。',
  criteria: { metric: 'days.newYear', target: 1 },
  ...medal({
    bottom: 'HAPPY NEW YEAR',
    shape: { type: 'starburst', points: 10, radius: 1.07, innerRadius: 0.9, tipRoundness: 0.16, valleyRoundness: 0.12, depth: 0.22, bevel: 0.035 },
    metal: 'silver',
    band: 'plum',
    disc: 'violet',
    art: [
      ...burst([-0.19, 0.2], 0.19, 12, 'honey', 0.03),
      ...burst([0.22, 0.25], 0.13, 10, 'aqua', 0.026),
      ...burst([0.27, -0.05], 0.1, 8, 'magenta', 0.024),
      ...codexMark({ size: 0.2, center: [-0.06, -0.2], height: 0.065 }),
    ],
  }),
};

// ---------- 春节：平顶八边形（窗棂），一对灯笼 ----------

const springFestival = {
  id: 'spring-festival',
  title: '春节',
  titleEn: 'SPRING FESTIVAL',
  description: '农历正月初一和 Codex 一起写代码。灯笼挂上云头，新春第一个补丁。',
  criteria: { metric: 'days.springFestival', target: 1 },
  ...medal({
    bottom: 'SPRING FESTIVAL',
    shape: { type: 'polygon', sides: 8, radius: 1.06, cornerRadius: 0.16, rotation: Math.PI / 8, depth: 0.22, bevel: 0.045 },
    metal: 'gold',
    band: 'crimson',
    disc: 'sand',
    art: [
      ...lantern(-0.24, 0.12, 0.034),
      ...lantern(0.24, 0.12, 0.034),
      ...codexMark({ size: 0.2, center: [0, -0.18], height: 0.065 }),
    ],
  }),
};

// ---------- 生日快乐：软十芒星，云朵牵着气球 ----------

const BALLOONS = [
  { c: [-0.16, 0.22], r: 0.09, color: 'magenta' },
  { c: [0.04, 0.3], r: 0.095, color: 'honey' },
  { c: [0.2, 0.15], r: 0.085, color: 'lime' },
];

const toolBirthday = {
  id: 'tool-birthday',
  title: '生日快乐',
  titleEn: 'HAPPY BIRTHDAY',
  description: '4 月 16 日，Codex CLI 的生日（2025 年这天发布）。这天和它一起写代码，云朵牵着气球来道谢。',
  criteria: { metric: 'days.toolBirthday', target: 1 },
  ...medal({
    bottom: 'HAPPY BIRTHDAY',
    shape: { type: 'starburst', points: 8, radius: 1.08, innerRadius: 0.88, tipRoundness: 0.3, valleyRoundness: 0.26, depth: 0.22, bevel: 0.035 },
    metal: 'gold',
    band: 'magenta',
    disc: 'snow',
    art: [
      ...balloons(BALLOONS, [0.12, -0.12], 'steel'),
      { kind: 'text', text: 'APR 16', size: 0.07, center: [-0.21, -0.04], tracking: 0.1, material: 'polished-metal', color: 'gold', height: 0.03, z: Z },
      ...codexMark({ size: 0.17, center: [0.05, -0.25], height: 0.065 }),
    ],
  }),
};

// ---------- 圣诞节：十二齿雪晶边，戴圣诞帽的云朵 ----------

/** 圣诞帽（Codex 标志网格 16 × 16，从标志上方开始） */
const SANTA_HAT = [
  '.......#####....',
  '.....#########..',
  '....##########..',
  '...######...###.',
  '..#######.......',
];
const SANTA_BRIM = ['.############...'];
const XMAS = { size: 0.22, center: [0, -0.1] };

const christmas = {
  id: 'christmas',
  title: '圣诞节',
  titleEn: 'CHRISTMAS',
  description: '12 月 25 日和 Codex 一起写代码。云朵戴上圣诞帽，今天的礼物是一个干净的补丁。',
  criteria: { metric: 'days.christmas', target: 1 },
  ...medal({
    bottom: 'MERRY CHRISTMAS',
    shape: { type: 'flower', petals: 6, radius: 1.08, petal: 0.36, valley: 0.12, depth: 0.22, bevel: 0.04 },
    metal: 'silver',
    band: 'emerald',
    disc: 'ivory',
    art: [
      ...[[-0.3, 0.22, 0.026], [0.3, 0.3, 0.02], [-0.37, -0.12, 0.018], [0.37, -0.06, 0.018], [0.0, 0.4, 0.014]].map(([x, y, c]) => px(SNOWFLAKE, c, [x, y], 'sky', 'enamel', 0.03)),
      ...codexMark(XMAS),
      onMark(XMAS, SANTA_HAT, { col: 1, row: -4, material: 'enamel', color: 'ruby', height: 0.075 }),
      onMark(XMAS, SANTA_BRIM, { col: 1, row: 1, material: 'enamel', color: 'snow', height: 0.085 }),
      onMark(XMAS, ['###', '###'], { col: 13, row: -1, material: 'enamel', color: 'snow', height: 0.085 }),
    ],
  }),
};

export const moreMilestones = [activeHours, dispatches];
export const moreHabits = [midnightCrossing, productiveDay, multitasker, perfectMonth];
export const moreLimited = [newYear, springFestival, toolBirthday, christmas];
