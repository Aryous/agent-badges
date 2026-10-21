// 公开版徽章墙（profile）：放到 GitHub Pages 的数据只能是页面上看得到的。
import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli/args.js';
import { BRAND_INFO } from '../src/collect/summary.js';
import { injectData } from '../src/collect/inject.js';
import { pagesFromRemote, publicData } from '../src/collect/public.js';

const badges = BRAND_INFO['claude-code'].badges;
const hiddenIds = badges.filter((b) => b.hidden).map((b) => b.id);
const plain = badges.find((b) => !b.hidden && !b.tiers);
const [hiddenLocked, hiddenUnlocked] = hiddenIds;

const raw = {
  'claude-code': {
    source: 'local',
    generatedAt: '2026-10-19T14:11:23.340Z',
    days: 51,
    progress: {
      [plain.id]: { unlocked: true, earnedAt: '2026-04-05', progress: { current: 1, target: 1 } },
      [hiddenLocked]: { unlocked: false, earnedAt: null, progress: { current: 3, target: 10 } },
      [hiddenUnlocked]: { unlocked: true, earnedAt: '2026-05-01', progress: { current: 1, target: 1 } },
    },
    daily: { '2026-04-05': [1200, 30] },
    ledger: { secret: 'should not be here' },
  },
};

describe('公开版数据', () => {
  it('至少有两枚隐藏徽章可以测试', () => expect(hiddenIds.length).toBeGreaterThanOrEqual(2));

  const out = publicData(raw)['claude-code'];

  it('未解锁的隐藏徽章不放，已解锁的隐藏徽章保留', () => {
    expect(out.progress).not.toHaveProperty(hiddenLocked);
    expect(out.progress).toHaveProperty(hiddenUnlocked);
    expect(out.progress).toHaveProperty(plain.id);
  });

  it('更新时间只到日期，每天的用量保留', () => {
    expect(out.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.daily).toEqual({ '2026-04-05': [1200, 30] });
  });

  it('只保留页面用到的字段', () => {
    expect(Object.keys(out).sort()).toEqual(['daily', 'generatedAt', 'progress', 'source']);
  });

  it('不认识的工具不放', () => {
    expect(publicData({ gemini: { progress: {} } })).toEqual({});
  });

  it('网页里带上公开版标记，名字里的特殊字符不会破坏页面', () => {
    const html = injectData('<html><head></head><body></body></html>', publicData(raw), { name: "$& </script><b>x", home: 'https://x/' });
    expect(html).toContain('__AGENT_BADGES_PUBLIC__');
    expect(html).not.toContain('</script><b>');
    expect(html.match(/<\/head>/g)).toHaveLength(1);
    expect(html).not.toContain('should not be here');
  });
});

describe('GitHub Pages 网址', () => {
  it('https、ssh、带 .git 都能解析', () => {
    expect(pagesFromRemote('https://github.com/Aryous/Aryous.git')).toEqual({ owner: 'Aryous', repo: 'Aryous', url: 'https://aryous.github.io/Aryous/' });
    expect(pagesFromRemote('git@github.com:Aryous/Aryous.git\n').url).toBe('https://aryous.github.io/Aryous/');
    expect(pagesFromRemote('https://github.com/me/notes').url).toBe('https://me.github.io/notes/');
  });

  it('<owner>.github.io 仓库是用户站点', () => {
    expect(pagesFromRemote('https://github.com/Me/me.github.io.git').url).toBe('https://me.github.io/');
  });

  it('远端里带的令牌不会出现在结果里', () => {
    const r = pagesFromRemote('https://x-access-token:ghp_SECRET@github.com/me/me.git');
    expect(r.url).toBe('https://me.github.io/me/');
    expect(JSON.stringify(r)).not.toContain('SECRET');
  });

  it('不是 GitHub 的远端返回 null', () => {
    expect(pagesFromRemote('https://gitlab.com/me/me.git')).toBeNull();
    expect(pagesFromRemote('')).toBeNull();
  });
});

describe('profile 参数', () => {
  it('需要目录', () => {
    expect(parseArgs(['profile', './me', '--name', 'Me'])).toMatchObject({ command: 'profile', dir: './me', name: 'Me' });
    expect(() => parseArgs(['profile'])).toThrow();
  });
});
