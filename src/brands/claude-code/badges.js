// Claude Code 首批 3 枚徽章。坐标单位：徽章中心为原点，外接半径为 1。

/** 圆周上均匀分布的点。 */
const around = (n, radius, start = Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const t = start - (i / n) * Math.PI * 2;
    return [Math.cos(t) * radius, Math.sin(t) * radius];
  });

const firstSession = {
  id: 'first-session',
  title: '初次相遇',
  titleEn: 'FIRST SESSION',
  description: '完成第一次 Claude Code 会话。一切从一个提示符开始。',
  criteria: { metric: 'sessions.total', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'primary', inset: 0.13 },
  ],
  relief: [
    // 细金线内圈
    { kind: 'ring', radius: 0.76, width: 0.022, material: 'polished-metal', color: 'gold', height: 0.018 },
    // 「>」
    { kind: 'capsule', from: [-0.4, 0.21], to: [-0.12, 0], width: 0.13, material: 'ceramic', color: 'ivory', height: 0.055 },
    { kind: 'capsule', from: [-0.12, 0], to: [-0.4, -0.21], width: 0.13, material: 'ceramic', color: 'ivory', height: 0.055 },
    // 「_」光标，会呼吸发光
    { kind: 'capsule', from: [0.03, -0.21], to: [0.36, -0.21], width: 0.13, material: 'ceramic', color: 'ivory', height: 0.055, effect: 'pulse' },
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

const sevenDayStreak = {
  id: 'seven-day-streak',
  title: '七日连击',
  titleEn: '7-DAY STREAK',
  description: '连续 7 天使用 Claude Code。习惯已经养成。',
  criteria: { metric: 'streak.days', target: 7 },
  shape: { type: 'polygon', sides: 6, radius: 1.04, cornerRadius: 0.16, depth: 0.2, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'copper' },
    { kind: 'face', material: 'brushed-metal', color: 'copper', inset: 0.1 },
  ],
  relief: [
    // 大号「7」：顶横 + 斜笔
    { kind: 'capsule', from: [-0.23, 0.29], to: [0.24, 0.29], width: 0.15, material: 'polished-metal', color: 'champagne', height: 0.06 },
    { kind: 'capsule', from: [0.24, 0.29], to: [-0.04, -0.33], width: 0.15, material: 'polished-metal', color: 'champagne', height: 0.06 },
    // 外圈 7 个珐琅圆点，一天一个
    ...around(7, 0.63).map((center) => ({
      kind: 'circle', center, radius: 0.055, material: 'enamel', color: 'primary', height: 0.03,
    })),
  ],
  back: { material: 'brushed-metal', color: 'copper' },
};

const satellites = around(5, 0.44);

const subagentCommander = {
  id: 'subagent-commander',
  title: '子代理指挥官',
  titleEn: 'SUBAGENT COMMANDER',
  description: '在一次会话中同时调度 5 个子代理并行工作。',
  criteria: { metric: 'subagents.parallelMax', target: 5 },
  shape: { type: 'starburst', points: 12, radius: 1.06, innerRadius: 0.8, tipRoundness: 0.1, valleyRoundness: 0.05, depth: 0.2, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'ceramic', color: 'ivory', inset: 0.07 },
  ],
  relief: [
    // 连线（金）
    ...satellites.map((to) => ({
      kind: 'capsule', from: [0, 0], to, width: 0.035, material: 'polished-metal', color: 'gold', height: 0.022,
    })),
    // 主节点
    { kind: 'ring', radius: 0.2, width: 0.03, material: 'polished-metal', color: 'gold', height: 0.05 },
    { kind: 'circle', radius: 0.15, material: 'enamel', color: 'primary', height: 0.06 },
    // 5 个子节点
    ...satellites.map((center) => ({
      kind: 'circle', center, radius: 0.085, material: 'enamel', color: 'primary', height: 0.045,
    })),
  ],
  back: { material: 'ceramic', color: 'ivory' },
};

export default [firstSession, sevenDayStreak, subagentCommander];
