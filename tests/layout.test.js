import { describe, expect, it } from 'vitest';
import ccBadges from '../src/brands/claude-code/index.js';
import codexBadges from '../src/brands/codex/index.js';
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

  // 已有徽章里按新原则不合规的（多是非圆外形里的圆形细描边）。逐个决定、修好后从这里删掉。
  const LEGACY = [
    'claude-code/sessions', 'claude-code/tool-calls', 'claude-code/seven-day-streak', 'claude-code/streak-days',
    'claude-code/weekend-warrior', 'claude-code/marathon', 'claude-code/programmers-day', 'claude-code/anniversary',
    'claude-code/model-collector', 'claude-code/bash-maniac',
    'codex/threads', 'codex/tokens', 'codex/seven-day-streak', 'codex/streak-days', 'codex/early-bird',
    'codex/marathon', 'codex/programmers-day', 'codex/model-collector', 'codex/compactor',
  ];

  it('已有徽章：不合规的正好是待定清单里的这些', () => {
    const failing = [];
    for (const [brand, list] of [['claude-code', ccBadges], ['codex', codexBadges]]) {
      for (const b of list) if (!NEW[brand].includes(b.id) && issuesOf(b).length) failing.push(`${brand}/${b.id}`);
    }
    expect(failing.sort()).toEqual([...LEGACY].sort());
  });
});
