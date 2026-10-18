// 模拟数据：前两枚已解锁，第三枚进行中，用来同时展示两种状态。

export default async function mockClaudeCode() {
  return {
    'first-session': { unlocked: true, earnedAt: '2025-03-02', progress: { current: 1, target: 1 } },
    'seven-day-streak': { unlocked: true, earnedAt: '2025-03-09', progress: { current: 7, target: 7 } },
    'subagent-commander': { unlocked: false, earnedAt: null, progress: { current: 3, target: 5 } },
  };
}
