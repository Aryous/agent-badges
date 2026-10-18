import { describe, expect, it } from 'vitest';
import badges from '../src/brands/claude-code/badges.js';
import { loadProgress, normalizeProgress } from '../src/data/progress.js';

describe('normalizeProgress', () => {
  it('没有数据的徽章按未解锁、进度 0 处理', () => {
    const p = normalizeProgress({}, badges);
    expect(p['seven-day-streak']).toMatchObject({ unlocked: false, earnedAt: null, tier: null, progress: { current: 0, target: 7 } });
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
    expect(progress['first-session'].unlocked).toBe(true);
    expect(progress['seven-day-streak'].unlocked).toBe(true);
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

describe('分级徽章', () => {
  const tiered = [{ id: 'sessions', criteria: { metric: 'sessions.total' }, tiers: [
    { threshold: 10, metal: 'bronze', label: '10' },
    { threshold: 100, metal: 'silver', label: '100' },
    { threshold: 1000, metal: 'gold', label: '1K' },
  ] }];

  it('按数值算出等级，进度目标是下一级门槛', () => {
    const p = normalizeProgress({ sessions: { value: 240, earnedAt: '2025-06-01' } }, tiered).sessions;
    expect(p).toMatchObject({ unlocked: true, tier: 1, value: 240, earnedAt: '2025-06-01', progress: { current: 240, target: 1000 } });
  });

  it('还没到第一级：未解锁，目标是第一级门槛', () => {
    const p = normalizeProgress({ sessions: { value: 4 } }, tiered).sessions;
    expect(p).toMatchObject({ unlocked: false, tier: null, earnedAt: null, progress: { current: 4, target: 10 } });
  });

  it('满级后目标停在最后一级', () => {
    const p = normalizeProgress({ sessions: { value: 5000 } }, tiered).sessions;
    expect(p).toMatchObject({ tier: 2, progress: { target: 1000 } });
  });

  it('普通徽章也可以只给数值', () => {
    const plain = [{ id: 'x', criteria: { metric: 'm', target: 5 } }];
    expect(normalizeProgress({ x: { value: 7, earnedAt: '2025-01-01' } }, plain).x).toMatchObject({ unlocked: true, progress: { current: 5, target: 5 } });
    expect(normalizeProgress({ x: { value: 2 } }, plain).x).toMatchObject({ unlocked: false, progress: { current: 2, target: 5 } });
  });
});
