import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BRANDS } from '../src/brands/index.js';
import { DATA_SOURCES, loadDaily } from '../src/data/progress.js';
import { summarize } from '../src/cli/summary.js';
import { renderCard } from '../src/share/card.js';
import { parseArgs } from '../src/cli/args.js';

const brands = [
  { id: 'claude-code', name: 'Claude Code', accent: '#D97757', unlocked: 12, total: 19, daily: { '2026-10-01': [1000, 2], '2026-10-02': [5000, 4] } },
  { id: 'codex', name: 'Codex', accent: '#7A9DFF', unlocked: 18, total: 20, daily: { '2026-10-02': [9000, 1] } },
];

describe('成就卡片', () => {
  it('输出完整的 SVG，包含两个工具的解锁数', () => {
    const svg = renderCard({ brands, today: '2026-10-19' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('>12</tspan>/19');
    expect(svg).toContain('>18</tspan>/20');
    expect(svg).toContain('6K'); // Claude Code 的 Token 总数
    // 样例只有一天同时使用两个工具，对应一个品牌色半圆。
    expect(svg.match(/a4\.8 4\.8 0 0 1 0 9\.6Z" fill="rgb\(122, 157, 255\)"/g)).toHaveLength(1);
  });

  it('名字会转义，不会注入标签', () => {
    const svg = renderCard({ brands, name: '<script>alert(1)</script>', today: '2026-10-19' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('浅色主题和中文', () => {
    const svg = renderCard({ brands, theme: 'light', lang: 'zh', today: '2026-10-19' });
    expect(svg).not.toBe(renderCard({ brands, theme: 'dark', lang: 'zh', today: '2026-10-19' }));
    expect(svg).toContain('枚徽章');
  });

  it('两种主题的 README 示例都与当前生成器输出一致', async () => {
    const samples = await Promise.all(BRANDS.map(async ({ brand }) => {
      const { unlocked, total } = summarize(brand.id, await DATA_SOURCES[brand.id].mock());
      return { ...brand, accent: brand.ui.accent, unlocked, total, daily: await loadDaily(brand.id, { forceMock: true }) };
    }));
    for (const theme of ['dark', 'light']) {
      const sample = readFileSync(new URL(`../assets/card-${theme}.svg`, import.meta.url), 'utf8');
      expect(renderCard({ brands: samples, theme, today: '2026-10-15' })).toBe(sample);
    }
  });

  it('命令行参数', () => {
    expect(parseArgs(['card', '--out', 'x.svg', '--theme', 'light', '--name', 'Lucas', '--lang', 'zh'])).toMatchObject({
      command: 'card', out: 'x.svg', theme: 'light', name: 'Lucas', cardLang: 'zh',
    });
    expect(() => parseArgs(['card', '--theme', 'neon'])).toThrow();
  });
});
