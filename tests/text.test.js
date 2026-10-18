import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { badgeTitle, badgeDescription, engravingLines, tierName } from '../src/brands/shared/text.js';

describe('中英文文字', () => {
  it('每枚徽章、每个系列都有英文名和英文说明', () => {
    for (const { brand, badges, series } of BRANDS) {
      for (const b of badges) {
        expect(b.en?.title, `${brand.id}/${b.id}`).toBeTruthy();
        expect(b.en?.description, `${brand.id}/${b.id}`).toBeTruthy();
        expect(/[一-鿿]/.test(b.en.title + b.en.description), `${brand.id}/${b.id} 英文里混了中文`).toBe(false);
        if (b.tiers) expect(b.en.title).toContain('{label}');
      }
      for (const s of series) expect(s.en?.title, `${brand.id}/${s.id}`).toBeTruthy();
    }
  });

  it('分级徽章的英文名带当前等级数值', () => {
    const tokens = BRANDS[0].badges.find((b) => b.id === 'tokens');
    expect(badgeTitle(tokens, 'en', 1)).toBe('10M Tokens');
    expect(badgeTitle(tokens, 'en', null)).toBe('1M Tokens');
    expect(badgeTitle(tokens, 'en', 99)).toBe('1B Tokens');
    expect(badgeTitle(tokens, 'zh', 1)).toBe('Token 里程碑');
    expect(badgeDescription(tokens, 'en')).toMatch(/^Tokens processed/);
    expect(tierName('gold', 'zh')).toBe('金级');
    expect(tierName('gold', 'en')).toBe('Gold');
  });

  it('背面刻字按语言输出', () => {
    const night = BRANDS[0].badges.find((b) => b.id === 'night-owl');
    const base = { brandName: 'Claude Code', config: night, earnedAt: '2026.05.02', unlocked: true, progress: { current: 1, target: 1 } };
    expect(engravingLines({ ...base, lang: 'zh' })).toEqual(['CLAUDE CODE', '夜猫子', 'NIGHT OWL', '2026.05.02']);
    expect(engravingLines({ ...base, lang: 'en' })).toEqual(['CLAUDE CODE', 'Night Owl', 'ACHIEVEMENT UNLOCKED', '2026.05.02']);
    expect(engravingLines({ ...base, lang: 'en', unlocked: false, progress: { current: 0, target: 1 } })[3]).toBe('0 / 1');
    expect(engravingLines({ ...base, lang: 'en', hidden: true })[3]).toBe('KEEP EXPLORING');
  });
});
