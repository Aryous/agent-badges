// Codex 示例数据：覆盖各种状态，方便设计和测试。
//   分级徽章给 value（引擎按门槛算等级），普通徽章给 unlocked / progress。

export const BRAND_ID = 'codex';

/** 示例数据的按天使用量：从 2026 年 4 月开始，和 Claude Code 重叠的日子在热力图上显示双色。 */
export const MOCK_DAILY = { seed: 11, from: '2026-04-10', to: '2026-10-15', base: 60_000_000, restRate: 0.45 };

export default async function mockCodex() {
  return {
    // 里程碑
    'first-thread': { unlocked: true, earnedAt: '2026-04-10', progress: { current: 1, target: 1 } },
    threads: { value: 420, earnedAt: '2026-06-02' }, // 银（100）
    tokens: { value: 12_000_000_000, earnedAt: '2026-08-15' }, // 白金（100 亿），下一级是顶级彩蛋
    patches: { value: 64, earnedAt: '2026-05-01' }, // 铜（10）
    'active-hours': { value: 502, earnedAt: '2026-07-20' }, // 银（100 小时）
    dispatches: { value: 489, earnedAt: '2026-08-11' }, // 银（100）

    // 连续与习惯
    'seven-day-streak': { unlocked: true, earnedAt: '2026-04-20', progress: { current: 7, target: 7 } },
    'streak-days': { value: 31, earnedAt: '2026-05-12' }, // 铜（30）
    'night-owl': { unlocked: true, earnedAt: '2026-05-03' },
    'early-bird': { unlocked: false, progress: { current: 0, target: 1 } },
    'weekend-warrior': { unlocked: true, earnedAt: '2026-04-26' },
    marathon: { unlocked: false, progress: { current: 2, target: 4 } },
    'midnight-crossing': { unlocked: false, progress: { current: 0, target: 1 } },
    'productive-day': { unlocked: false, progress: { current: 15, target: 20 } },
    multitasker: { unlocked: true, earnedAt: '2026-05-06' },
    'perfect-month': { unlocked: true, earnedAt: '2026-08-31' },

    // 功能探索
    'multi-agent': { unlocked: true, earnedAt: '2026-06-18' },
    'plan-tracker': { unlocked: true, earnedAt: '2026-05-09' },
    'deep-thinker': { unlocked: true, earnedAt: '2026-07-01' },
    'full-auto': { unlocked: true, earnedAt: '2026-04-12' },
    reviewer: { unlocked: false, progress: { current: 0, target: 1 } },
    'ide-buddy': { unlocked: true, earnedAt: '2026-04-10' },

    // 限定与彩蛋
    'programmers-day': { unlocked: false, progress: { current: 0, target: 1 } },
    anniversary: { unlocked: false, progress: { current: 0, target: 1 } },
    'model-collector': { unlocked: true, earnedAt: '2026-09-02' }, // 隐藏，已解锁
    compactor: { unlocked: false, progress: { current: 12, target: 20 } }, // 隐藏，未解锁
    'new-year': { unlocked: false, progress: { current: 0, target: 1 } },
    'spring-festival': { unlocked: false, progress: { current: 0, target: 1 } },
    'tool-birthday': { unlocked: true, earnedAt: '2026-04-16' },
    christmas: { unlocked: false, progress: { current: 0, target: 1 } },
  };
}
