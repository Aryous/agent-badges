import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { badgeTitle, badgeDescription, engravingLines, tierLabel, tierName, upperTitle } from '../src/brands/shared/text.js';
import { resolveTier } from '../src/engine/tiers.js';

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
    expect(badgeTitle(tokens, 'en', 1)).toBe('100M Tokens');
    expect(badgeTitle(tokens, 'en', null)).toBe('10M Tokens');
    expect(badgeTitle(tokens, 'en', 99)).toBe('100B Tokens');
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

  it('分级徽章背面只刻数值和日期，不写金属名；顶级再加抽到的款式名', () => {
    const tokens = BRANDS[0].badges.find((b) => b.id === 'tokens');
    const base = { brandName: 'Claude Code', earnedAt: '2026.07.26', unlocked: true, progress: { current: 1, target: 1 } };
    const gold = resolveTier(tokens, 2);
    expect(engravingLines({ ...base, config: gold, tier: gold.tier, lang: 'zh' })).toEqual(['CLAUDE CODE', 'Token 里程碑', '1B TOKENS', '2026.07.26']);
    expect(engravingLines({ ...base, config: tokens, tier: gold.tier, lang: 'en' })).toEqual(['CLAUDE CODE', '1B Tokens', 'ACHIEVEMENT UNLOCKED', '2026.07.26']);
    const top = resolveTier(tokens, 4, 1);
    const zh = engravingLines({ ...base, config: top, tier: top.tier, lang: 'zh' });
    expect(zh[2]).toBe('100B TOKENS');
    expect(zh[3]).toBe(`${top.tier.variant.name.zh} · 2026.07.26`);
    expect(engravingLines({ ...base, config: tokens, tier: top.tier, lang: 'en' })[3]).toBe(`${top.tier.variant.name.en.toUpperCase()} · 2026.07.26`);
  });

  it('等级名：前几级写金属，有款式的那一级写抽到的款式，还没抽到写「隐藏款」', () => {
    const tokens = BRANDS[0].badges.find((b) => b.id === 'tokens');
    expect(tierLabel(tokens.tiers[1], null, 'zh')).toBe('银级');
    expect(tierLabel(tokens.tiers[1], null, 'en')).toBe('Silver');
    const top = tokens.tiers[4];
    expect(tierLabel(top, 2, 'zh')).toBe(top.variants[2].name.zh);
    expect(tierLabel(top, 2, 'en')).toBe(top.variants[2].name.en);
    expect(tierLabel(top, null, 'zh')).toBe('隐藏款');
    expect(tierLabel(top, null, 'en')).toBe('Secret');
  });
});

describe('upperTitle：英文大写标题由 en.title 转大写', () => {
  const tiered = { title: '会话里程碑', en: { title: '{label} Sessions' }, tiers: [{ label: '10' }, { label: '1K' }] };
  it('普通徽章', () => {
    expect(upperTitle({ title: '程序员节', en: { title: "Programmers' Day" } })).toBe("PROGRAMMERS' DAY");
  });
  it('分级徽章带上等级数值，不传等级时用第一级', () => {
    expect(upperTitle(tiered, 1)).toBe('1K SESSIONS');
    expect(upperTitle(tiered)).toBe('10 SESSIONS');
  });
});
