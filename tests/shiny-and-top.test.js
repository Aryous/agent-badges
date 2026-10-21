import { describe, expect, it } from 'vitest';
import { SHINY_ODDS, normalizeProgress, pickShiny } from '../src/data/normalize.js';
import { engravingLines } from '../src/brands/shared/text.js';
import { makeOutline } from '../src/engine/shapes.js';
import ccBadges from '../src/brands/claude-code/badges.js';
import codexBadges from '../src/brands/codex/badges.js';
import { newUnlocks } from '../src/collect/summary.js';

describe('闪光款', () => {
  it('同样的输入永远得到同样的结果', () => {
    for (let i = 0; i < 50; i++) expect(pickShiny('codex', 'night-owl', `2026-05-${10 + (i % 18)}`)).toBe(pickShiny('codex', 'night-owl', `2026-05-${10 + (i % 18)}`));
    expect(pickShiny('codex', 'night-owl', null)).toBe(false);
  });

  it('大样本上约为 1/20', () => {
    let hits = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const d = new Date(Date.UTC(2025, 0, 1) + (i % 3650) * 86400000).toISOString().slice(0, 10);
      if (pickShiny('claude-code', `b${Math.floor(i / 3650)}`, d)) hits += 1;
    }
    expect(hits / N).toBeGreaterThan(0.8 / SHINY_ODDS);
    expect(hits / N).toBeLessThan(1.2 / SHINY_ODDS);
  });

  it('分级徽章升级后闪光不变（按第一级的达成日期）', () => {
    const badges = ccBadges.filter((b) => b.id === 'sessions');
    // 找一个会抽中闪光的第一级日期
    let first = null;
    for (let i = 0; i < 400 && !first; i++) {
      const d = new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10);
      if (pickShiny('claude-code', 'sessions', d)) first = d;
    }
    const low = normalizeProgress({ sessions: { value: 12, earnedAt: first, firstAt: first } }, badges, 'claude-code').sessions;
    const high = normalizeProgress({ sessions: { value: 1200, earnedAt: '2026-09-01', firstAt: first } }, badges, 'claude-code').sessions;
    expect(low.shiny).toBe(true);
    expect(high.shiny).toBe(true);
  });

  it('不传品牌、未解锁都不会是闪光', () => {
    const badges = ccBadges.filter((b) => b.id === 'night-owl');
    expect(normalizeProgress({ 'night-owl': { unlocked: false } }, badges, 'claude-code')['night-owl'].shiny).toBe(false);
    expect(normalizeProgress({ 'night-owl': { unlocked: true, earnedAt: '2026-01-01', shiny: true } }, badges)['night-owl'].shiny).toBe(true);
  });

  it('背面刻字加「闪光」，与隐藏款叠加', () => {
    const base = { brandName: 'Codex', config: { title: '夜猫子', titleEn: 'NIGHT OWL' }, earnedAt: '2026.05.03', unlocked: true, progress: {} };
    expect(engravingLines({ ...base, shiny: true }).at(-1)).toBe('闪光 · 2026.05.03');
    const tier = { variant: { name: { zh: '白瓷金', en: 'Ivory Gold' } } };
    expect(engravingLines({ ...base, shiny: true, tier }).at(-1)).toBe('闪光 · 白瓷金 · 2026.05.03');
    expect(engravingLines({ ...base, shiny: true, tier, lang: 'en' }).at(-1)).toBe('SHINY · IVORY GOLD · 2026.05.03');
  });

  it('新解锁提示标出闪光', () => {
    const next = { 'night-owl': { unlocked: true, earnedAt: '2026-05-03', shiny: true } };
    const r = newUnlocks('codex', {}, next, { lang: 'zh' }).find((x) => x.id === 'night-owl');
    expect(r).toMatchObject({ shiny: true });
    expect(r.title).toContain('闪光');
  });
});

describe('顶级三款', () => {
  it('所有分级徽章的最高一级都是三款随机，门槛不变', () => {
    const expect4 = { sessions: 5000, 'tool-calls': 1000000, 'streak-days': 365, 'active-hours': 5000, dispatches: 10000, 'web-research': 10000, 'file-edits': 100000, threads: 5000, patches: 10000 };
    for (const b of [...ccBadges, ...codexBadges].filter((x) => x.tiers)) {
      const top = b.tiers.at(-1);
      expect(top.variants?.length, b.id).toBe(3);
      expect(top.salt, b.id).toMatch(new RegExp(`/${b.id}$`));
      if (expect4[b.id]) expect(top.threshold).toBe(expect4[b.id]);
    }
  });
});

describe('花形外形', () => {
  it('凹口在外接半径以内，内缩后仍是闭合轮廓', () => {
    const cfg = { type: 'flower', petals: 5, radius: 1.1, petal: 0.45 };
    for (const inset of [0, 0.1]) {
      const pts = makeOutline(cfg, inset).getPoints(40);
      const r = pts.map((p) => Math.hypot(p.x, p.y));
      expect(Math.max(...r)).toBeCloseTo(1.1 - inset, 2);
      expect(Math.min(...r)).toBeGreaterThan(0.75 - inset);
    }
  });
});
