// 模拟数据：覆盖各种状态，方便设计和测试。
//   分级徽章给 value（引擎按门槛算等级），普通徽章给 unlocked / progress。
// 接入真实数据后，这份文件只用于 ?source=mock 预览。

export default async function mockClaudeCode() {
  return {
    // 里程碑
    'first-session': { unlocked: true, earnedAt: '2025-03-02', progress: { current: 1, target: 1 } },
    sessions: { value: 327, earnedAt: '2025-06-18' }, // 银（100），下一级 1000
    tokens: { value: 48_000_000, earnedAt: '2025-08-02' }, // 银（1000 万），下一级 1 亿
    'tool-calls': { value: 12_400, earnedAt: '2025-09-11' }, // 银（1 万）

    // 连续与习惯
    'seven-day-streak': { unlocked: true, earnedAt: '2025-03-09', progress: { current: 7, target: 7 } },
    'streak-days': { value: 42, earnedAt: '2025-05-20' }, // 铜（30 天）
    'night-owl': { unlocked: true, earnedAt: '2025-04-12' },
    'early-bird': { unlocked: false, progress: { current: 0, target: 1 } },
    'weekend-warrior': { unlocked: true, earnedAt: '2025-04-06' },
    marathon: { unlocked: true, earnedAt: '2025-07-23' },

    // 功能探索
    'subagent-commander': { unlocked: false, progress: { current: 3, target: 5 } },
    'hooks-smith': { unlocked: true, earnedAt: '2025-05-02' },
    connector: { unlocked: false, progress: { current: 2, target: 3 } },
    'skill-master': { unlocked: true, earnedAt: '2025-10-03' },
    'plan-mode': { unlocked: true, earnedAt: '2025-04-28' },

    // 限定与彩蛋
    'programmers-day': { unlocked: true, earnedAt: '2025-10-24' },
    anniversary: { unlocked: true, earnedAt: '2026-03-02' },
    'model-collector': { unlocked: false, progress: { current: 3, target: 4 } }, // 隐藏，未解锁
    'bash-maniac': { unlocked: true, earnedAt: '2025-11-19' }, // 隐藏，已解锁
  };
}
