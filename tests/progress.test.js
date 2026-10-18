import { describe, expect, it } from 'vitest';
import badges from '../src/brands/claude-code/badges.js';
import { loadProgress, normalizeProgress } from '../src/data/progress.js';

describe('normalizeProgress', () => {
  it('没有数据的徽章按未解锁、进度 0 处理', () => {
    const p = normalizeProgress({}, badges);
    expect(p['seven-day-streak']).toEqual({ unlocked: false, earnedAt: null, progress: { current: 0, target: 7 } });
  });

  it('当前进度不超过目标', () => {
    const p = normalizeProgress({ 'seven-day-streak': { unlocked: true, earnedAt: '2025-01-01', progress: { current: 12, target: 7 } } }, badges);
    expect(p['seven-day-streak'].progress.current).toBe(7);
  });

  it('未解锁时不保留获得日期', () => {
    const p = normalizeProgress({ 'first-session': { unlocked: false, earnedAt: '2025-01-01' } }, badges);
    expect(p['first-session'].earnedAt).toBeNull();
  });
});

describe('loadProgress', () => {
  it('读取模拟数据：两枚已解锁，一枚 3/5', async () => {
    const { progress, error } = await loadProgress('claude-code', badges);
    expect(error).toBeNull();
    expect(Object.values(progress).filter((p) => p.unlocked)).toHaveLength(2);
    expect(progress['subagent-commander'].progress).toEqual({ current: 3, target: 5 });
  });

  it('数据源失败时全部按未解锁处理并返回错误', async () => {
    const sources = { 'claude-code': async () => { throw new Error('boom'); } };
    const { progress, error } = await loadProgress('claude-code', badges, sources);
    expect(error.message).toBe('boom');
    expect(Object.values(progress).every((p) => !p.unlocked)).toBe(true);
  });

  it('未知品牌返回错误', async () => {
    const { error } = await loadProgress('codex', badges);
    expect(error.message).toMatch(/codex/);
  });
});
