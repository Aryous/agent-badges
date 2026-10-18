import { describe, expect, it } from 'vitest';
import { dailySeries, dailyStats, dailyYears, mockDaily } from '../src/data/daily.js';
import { highlights } from '../src/data/highlights.js';
import { normalizeProgress } from '../src/data/normalize.js';
import badges from '../src/brands/claude-code/badges.js';

describe('按天使用量', () => {
  it('从账本取 Token 和对话轮数，跳过空白日', () => {
    const ledger = {
      days: {
        '2026-05-02': { tokens: 1200.4, humanTurns: 3, sessions: 1 },
        '2026-05-01': { tokens: 0, humanTurns: 0, sessions: 1 },
        '2026-05-03': { tokens: 0, humanTurns: 2 },
      },
    };
    expect(dailySeries('claude-code', ledger)).toEqual({ '2026-05-02': [1200, 3], '2026-05-03': [0, 2] });
    expect(dailySeries('codex', { days: { '2026-05-02': { tokens: 9, turns: 1 } } })).toEqual({ '2026-05-02': [9, 1] });
  });

  it('只输出日期和数字', () => {
    const out = dailySeries('codex', { days: { '2026-05-02': { tokens: 9, turns: 1, models: ['abc123'], hours: Array(24).fill(1) } } });
    expect(JSON.stringify(out)).toBe('{"2026-05-02":[9,1]}');
  });

  it('区间汇总：Token、活跃天数、最长连续', () => {
    const daily = { '2026-01-01': [10, 1], '2026-01-02': [20, 2], '2026-01-04': [5, 1], '2025-12-31': [100, 9] };
    expect(dailyStats(daily, { from: '2026-01-01', to: '2026-12-31' })).toEqual({ tokens: 35, turns: 4, activeDays: 3, longestStreak: 2 });
    expect(dailyStats(daily).longestStreak).toBe(3);
    expect(dailyYears(daily, { '2027-02-01': [1, 1] })).toEqual([2025, 2026, 2027]);
  });

  it('示例数据：同一种子结果相同，范围正确', () => {
    const a = mockDaily({ seed: 3, from: '2026-01-01', to: '2026-03-31' });
    expect(mockDaily({ seed: 3, from: '2026-01-01', to: '2026-03-31' })).toEqual(a);
    const dates = Object.keys(a);
    expect(dates.length).toBeGreaterThan(30);
    expect(dates.every((d) => d >= '2026-01-01' && d <= '2026-03-31')).toBe(true);
  });
});

describe('档案摘要', () => {
  it('最近获得按日期倒序，即将解锁按进度比例，隐藏成就不透露', () => {
    const p = normalizeProgress(
      {
        'first-session': { unlocked: true, earnedAt: '2026-01-01' },
        'night-owl': { unlocked: true, earnedAt: '2026-03-01' },
        sessions: { value: 90, earnedAt: '2026-02-01' }, // 铜 10 → 下一级 100：90%
        connector: { unlocked: false, progress: { current: 1, target: 3 } },
        'model-collector': { unlocked: false, progress: { current: 3, target: 4 } }, // 隐藏
      },
      badges,
    );
    const h = highlights(badges, p);
    expect(h.recent.map((r) => r.badge.id)).toEqual(['night-owl', 'sessions', 'first-session']);
    expect(h.nearMiss[0].badge.id).toBe('sessions');
    expect(h.nearMiss.map((r) => r.badge.id)).not.toContain('model-collector');
  });
});

import { levelOf, levelThresholds, yearWeeks } from '../src/data/calendar.js';

describe('年度日历', () => {
  it('2026 年按周一开头排成 53 列，首尾补空', () => {
    const { weeks, monthStarts } = yearWeeks(2026, 1);
    // 2026-01-01 是周四：第一列前三格为空
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, '2026-01-01']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(365);
    expect(weeks.at(-1).filter(Boolean).at(-1)).toBe('2026-12-31');
    expect(monthStarts).toHaveLength(12);
    expect(monthStarts[0]).toEqual({ month: 0, col: 0 });
  });

  it('周日开头时第一格是周日', () => {
    const { weeks } = yearWeeks(2026, 0);
    expect(new Date(`${weeks[1][0]}T00:00:00`).getDay()).toBe(0);
  });

  it('深浅分档', () => {
    const daily = Object.fromEntries([10, 20, 30, 40, 50, 60, 70, 80].map((t, i) => [`2026-01-0${i + 1}`, [t, 1]]));
    const th = levelThresholds(daily);
    expect(th).toEqual([30, 50, 70]);
    expect(levelOf(undefined, th)).toBe(0);
    expect(levelOf([0, 2], th)).toBe(1);
    expect(levelOf([10, 1], th)).toBe(1);
    expect(levelOf([55, 1], th)).toBe(3);
    expect(levelOf([999, 1], th)).toBe(4);
  });
});

import { summarize } from '../src/collect/summary.js';

describe('CLI 汇总', () => {
  it('即将解锁说的是下一级的名字', () => {
    const s = summarize('claude-code', { 'tool-calls': { value: 8500, earnedAt: '2026-07-26' } }, { lang: 'en' });
    expect(s.nearMiss[0]).toMatchObject({ id: 'tool-calls', title: '10K Tool Calls', current: 8500, target: 10000 });
  });
});

import { newUnlocks } from '../src/collect/summary.js';

describe('新解锁', () => {
  const prev = { 'night-owl': { unlocked: false, progress: { current: 0, target: 1 } }, sessions: { value: 50, earnedAt: '2026-01-01' } };
  it('第一次运行不报告', () => {
    expect(newUnlocks('claude-code', null, prev)).toEqual([]);
  });
  it('新解锁和分级升级都算，没变化的不算', () => {
    const next = { 'night-owl': { unlocked: true, earnedAt: '2026-10-19' }, sessions: { value: 120, earnedAt: '2026-10-18' }, 'first-session': { unlocked: false } };
    const out = newUnlocks('claude-code', prev, next, { lang: 'en' });
    expect(out).toEqual([
      { id: 'sessions', title: '100 Sessions', earnedAt: '2026-10-18', tier: 'silver', upgrade: true },
      { id: 'night-owl', title: 'Night Owl', earnedAt: '2026-10-19' },
    ]);
    expect(newUnlocks('claude-code', next, next)).toEqual([]);
  });
});
