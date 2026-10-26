import { describe, expect, it } from 'vitest';
import { medalInfo } from '../src/app/medals.js';
import { gemKey, medalPalette } from '../src/viewer/month-medal.js';

const series = [
  { id: 'claude-code', name: 'Claude Code', color: '#D97757' },
  { id: 'codex', name: 'Codex', color: '#7A9DFF' },
];
const palette = medalPalette(series);
const data = { year: 2026, month: 3, tokens: 1.1e9, active: 25, unlocks: 6, tools: [0, 1], days: [] };

describe('单枚查看里的月章信息', () => {
  it('数字和图例；两个工具时有左右各半的色块', () => {
    expect(medalInfo(data, 2, series, palette)).toEqual({
      year: 2026,
      month: 3,
      tier: 2,
      tokens: 1.1e9,
      active: 25,
      unlocks: 6,
      legend: [
        { name: 'Claude Code', color: palette[gemKey(0, 4)] },
        { name: 'Codex', color: palette[gemKey(1, 4)] },
      ],
      both: [palette[gemKey(0, 4)], palette[gemKey(1, 4)]],
    });
  });

  it('只用了一个工具：图例只有它，没有半色块', () => {
    const info = medalInfo({ ...data, tools: [1] }, 0, series, palette);
    expect(info.legend).toEqual([{ name: 'Codex', color: palette[gemKey(1, 4)] }]);
    expect(info.both).toBeNull();
  });
});
