import { describe, expect, it } from 'vitest';
import { makeOutline } from '../src/engine/shapes.js';
import ccBadges from '../src/brands/claude-code/badges.js';
import codexBadges from '../src/brands/codex/badges.js';

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

import { layoutIssues } from '../src/engine/layout.js';
import { resolveTier } from '../src/engine/tiers.js';

/** 每枚徽章的每一级、每一款都展开检查 */
function issuesOf(b) {
  const out = [];
  const levels = b.tiers ? b.tiers.flatMap((t, i) => (t.variants ? t.variants.map((_, v) => [i, v]) : [[i, 0]])) : [[0, 0]];
  for (const [i, v] of levels) for (const msg of layoutIssues(resolveTier(b, i, v))) out.push(`${b.tiers ? `第 ${i + 1} 级${b.tiers[i].variants ? ` 第 ${v + 1} 款` : ''}：` : ''}${msg}`);
  return out;
}

const NEW = {
  'claude-code': ['midnight-crossing', 'productive-day', 'multitasker', 'perfect-month', 'active-hours', 'dispatches', 'web-research', 'file-edits', 'autopilot', 'new-year', 'spring-festival', 'tool-birthday', 'christmas'],
  codex: ['midnight-crossing', 'productive-day', 'multitasker', 'perfect-month', 'active-hours', 'dispatches', 'new-year', 'spring-festival', 'tool-birthday', 'christmas'],
};

describe('版式：内外呼应、留够呼吸距离', () => {
  for (const [brand, list] of [['claude-code', ccBadges], ['codex', codexBadges]]) {
    for (const id of NEW[brand]) {
      it(`${brand} ${id}`, () => expect(issuesOf(list.find((b) => b.id === id))).toEqual([]));
    }
  }

  it('旧徽章的不合规清单（逐个决定后从这里移除）', () => {
    const report = {};
    for (const [brand, list] of [['claude-code', ccBadges], ['codex', codexBadges]]) {
      for (const b of list) {
        if (NEW[brand].includes(b.id)) continue;
        const issues = issuesOf(b);
        if (issues.length) report[`${brand}/${b.id}`] = [...new Set(issues.map((x) => x.replace(/^第 \d+ 级( 第 \d+ 款)?：/, '')))];
      }
    }
    console.log(JSON.stringify(report, null, 2));
    expect(report).toBeTypeOf('object');
  });
});
