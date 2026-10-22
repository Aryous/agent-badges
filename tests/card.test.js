import { describe, expect, it } from 'vitest';
import { formatTokens, renderCard } from '../src/share/card.js';
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
    // 两个工具同一天都用了：画一个斜分的三角
    expect(svg).toMatch(/<path d="M[\d.]+ [\d.]+V[\d.]+H[\d.]+Z" fill="#7A9DFF"/);
  });

  it('名字会转义，不会注入标签', () => {
    const svg = renderCard({ brands, name: '<script>alert(1)</script>', today: '2026-10-19' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('浅色主题和中文', () => {
    const svg = renderCard({ brands, theme: 'light', lang: 'zh', today: '2026-10-19' });
    expect(svg).toContain('#FFFFFF');
    expect(svg).toContain('枚徽章');
  });

  it('Token 缩写', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(59_700_000)).toBe('59.7M');
    expect(formatTokens(2_300_000_000)).toBe('2.3B');
  });

  it('命令行参数', () => {
    expect(parseArgs(['card', '--out', 'x.svg', '--theme', 'light', '--name', 'Lucas', '--lang', 'zh'])).toMatchObject({
      command: 'card', out: 'x.svg', theme: 'light', name: 'Lucas', cardLang: 'zh',
    });
    expect(() => parseArgs(['card', '--theme', 'neon'])).toThrow();
  });
});
