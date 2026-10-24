import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BRANDS } from '../src/brands/index.js';
import { tierKey } from '../src/brands/shared/text.js';
import { STAGE_METALS, completionistConfig } from '../src/brands/shared/completionist.js';
import claudeBrand from '../src/brands/claude-code/brand.js';
import { layoutIssues } from '../src/engine/layout.js';
import { validateBadge } from '../src/engine/validate.js';

// 文档和代码是一个整体：文档里写到的测试、目录、数字都要和仓库实际情况一致。

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const srcDirs = () => readdirSync(join(root, 'src')).filter((d) => statSync(join(root, 'src', d)).isDirectory()).sort();

function filesUnder(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) return filesUnder(rel);
    return /\.(m?js|md|html)$/.test(name) ? [rel] : [];
  });
}

// GitHub 的标题锚点：小写，去掉标点，空格换成连字符（中文保留）
const slug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const anchorsOf = (file) => new Set([...read(file).matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1])));

describe('AGENTS.md', () => {
  it('每条契约引用的测试文件都存在', () => {
    const refs = [...read('AGENTS.md').matchAll(/`(tests\/[\w./-]+\.test\.js)`/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(5);
    expect(refs.filter((f) => !existsSync(join(root, f)))).toEqual([]);
  });

  it('地图列出了 src/ 下的每个目录，且没有多余的', () => {
    const listed = [...read('AGENTS.md').matchAll(/^\|\s*`src\/([\w-]+)\/`/gm)].map((m) => m[1]).sort();
    expect(listed).toEqual(srcDirs());
  });

  it('不超过 150 行', () => {
    expect(read('AGENTS.md').trimEnd().split('\n').length).toBeLessThanOrEqual(150);
  });

  it('CLAUDE.md 引入 AGENTS.md', () => {
    expect(read('CLAUDE.md')).toMatch(/^@AGENTS\.md/m);
  });
});

describe('CONTRIBUTING.md', () => {
  it('目录树列出了 src/ 下的每个目录', () => {
    const tree = read('CONTRIBUTING.md');
    for (const d of srcDirs()) expect(tree, d).toMatch(new RegExp(`[├└]─ ${d}/`));
  });

  it('「Adding a tool」列出了每一张按工具 id 索引的表', () => {
    // 这一节读到下一个 `##` 标题为止，所以它自己不能再有 `###` 以外的子标题（`##` 开头的行都会截断）
    const section = read('CONTRIBUTING.md').split(/^### Adding a tool/m)[1]?.split(/^##/m)[0] ?? '';
    for (const place of ['src/brands/index.js', 'src/collect/index.js', 'src/data/progress.js', 'src/data/mock-', '-metrics.js', 'package.json', 'tests/contracts.test.js', 'launchDate', 'TURNS_FIELD', 'completionist.js']) {
      expect(section, place).toContain(place);
    }
  });

  it('「Adding a tool」写全了全解锁徽章共用版式要的色板键', () => {
    const section = read('CONTRIBUTING.md').split(/^### Adding a tool/m)[1]?.split(/^##/m)[0] ?? '';
    // 共用版式用到的颜色 = 整枚徽章的颜色 − 品牌部件自己的颜色；再加上铸币火花用的 primary、ivory
    const colors = (items) => new Set(items.flatMap((r) => [r.color, ...(r.gradient ?? [])]).filter(Boolean));
    for (const { badges, completionist: kit } of BRANDS) {
      const n = badges.length;
      const look = { material: 'polished-metal', color: 'gold' };
      const own = colors([...kit.tiles().flatMap((t) => [t.lit, t.ghost]), ...kit.crown(look), kit.separator(0, look), ...kit.hero(), kit.accent, ...(kit.eyes?.() ?? [])]);
      const used = new Set(['stage', 'primary', 'ivory']);
      for (const k of [0, n]) {
        const { config } = completionistConfig(kit, { unlocked: k, total: n });
        for (const c of colors([...config.layers, ...config.relief, ...config.backRelief, config.back])) if (!own.has(c) || STAGE_METALS.includes(c)) used.add(c);
      }
      for (const key of used) expect(section, key).toContain(`\`${key}\``);
    }
  });
});

describe('README', () => {
  const total = BRANDS.reduce((n, e) => n + e.badges.length, 0);
  // JSON 输出里 tier 可能出现的每个值：各级金属，以及顶级三款的 id
  const tierKeys = [...new Set(BRANDS.flatMap((e) => e.badges.flatMap((b) => (b.tiers ?? []).flatMap((t) => (t.variants ? t.variants.map((_, v) => tierKey(t, v)) : [tierKey(t)])))))];

  for (const file of ['README.md', 'README.zh-CN.md']) {
    it(`${file}：徽章数量和代码一致`, () => {
      const text = read(file);
      // 匹配 README 里真正写数量的那句话，不是随便出现的数字（如「30 minutes」「27 / 32」）
      const zh = file.includes('zh');
      expect(text).toContain(zh ? `${total} 枚徽章` : `**${total} badges across`);
      for (const { brand, badges } of BRANDS) {
        expect(text, brand.id).toContain(zh ? `${brand.name} ${badges.length} 枚` : `${badges.length} for ${brand.name}`);
      }
    });

    it(`${file}：工具生日的日期和配置一致`, () => {
      const text = read(file);
      for (const { brand } of BRANDS) {
        const [, m, d] = brand.launchDate.split('-').map(Number);
        const en = new Date(2000, m - 1, d).toLocaleString('en-US', { month: 'long', day: 'numeric' });
        expect(file.includes('zh') ? text.includes(`${m} 月 ${d} 日`) || text.includes(`${m}月${d}日`) : text.includes(en), brand.id).toBe(true);
      }
    });

    it(`${file}：JSON 输出说明列出了 tier 的每个取值`, () => {
      const text = read(file);
      expect(tierKeys.length).toBeGreaterThan(3);
      for (const k of tierKeys) expect(text, k).toContain(`\`${k}\``);
    });

    it(`${file}：页内锚点都指向存在的标题`, () => {
      const text = read(file);
      const missing = [...text.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]).filter((a) => !anchorsOf(file).has(a));
      expect(missing).toEqual([]);
    });

    it(`${file}：开发内容已移到 CONTRIBUTING`, () => {
      expect(read(file)).not.toMatch(/^### Adding a badge|^### 新增一枚徽章/m);
      expect(read(file)).toContain('CONTRIBUTING.md');
    });
  }

  // 统计口径表里写了数字门槛的一次性徽章：id -> 表里的哪一行、那一句话怎么写（数字换成 {n}）。
  // 表里的数字必须等于配置的 target；新增这类徽章并在表里写了数字时，在这里补一条。
  // 其余一次性徽章（马拉松 4 小时、连续 7 天等）表里没写数字，不在此列。
  const COUNTED_ROWS = {
    'README.md': {
      'productive-day': { row: '| Productive Day / Multitasker |', phrase: '{n} sessions started in one day' },
      multitasker: { row: '| Productive Day / Multitasker |', phrase: '{n} sessions active at the same moment' },
    },
    'README.zh-CN.md': {
      'productive-day': { row: '| 高产日 / 多线并行 |', phrase: '一天开启 {n} 个会话' },
      multitasker: { row: '| 高产日 / 多线并行 |', phrase: '同一时刻 {n} 个会话' },
    },
  };
  const isOneTimeCounted = (b) => !b.tiers && b.criteria.target > 1 && !b.criteria.dynamic;

  for (const file of Object.keys(COUNTED_ROWS)) {
    it(`${file}：统计口径表里写的门槛和徽章配置的 target 一致`, () => {
      const lines = read(file).split('\n');
      const mapped = Object.entries(COUNTED_ROWS[file]);
      expect(mapped.length).toBeGreaterThan(0);
      for (const [id, { row, phrase }] of mapped) {
        const line = lines.find((l) => l.startsWith(row));
        expect(line, `${file} 缺统计口径行 ${row}`).toBeDefined();
        const cells = line.split('|').map((c) => c.trim()); // ['', 行名, Claude Code, Codex, '']
        let hit = 0;
        for (const [i, { brand, badges }] of BRANDS.entries()) {
          const badge = badges.find((b) => b.id === id);
          if (!badge) continue;
          hit++;
          expect(isOneTimeCounted(badge), `${brand.id}/${id} 不再是带数字门槛的一次性徽章，更新 COUNTED_ROWS`).toBe(true);
          // 「Same / 同左」列沿用第一个工具那一列的写法
          let cell = cells[2 + i] ?? '';
          if (/^(Same|同左)/.test(cell)) cell = cells[2];
          const re = new RegExp(phrase.split('{n}').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(`(?<!\\d)${badge.criteria.target}(?!\\d)`));
          expect(cell, `${file}: ${brand.id}/${id} 的门槛应为 ${badge.criteria.target}`).toMatch(re);
        }
        expect(hit, id).toBeGreaterThan(0);
      }
    });
  }

  it('落地页、技能和插件清单里链到 README 某一节的链接都有效', () => {
    const files = [...filesUnder('src'), ...filesUnder('skills'), 'landing.html', 'plugin.json', '.claude-plugin/plugin.json'];
    const bad = [];
    for (const f of files) {
      for (const [, zh, anchor] of read(f).matchAll(/github\.com\/Aryous\/agent-badges(?:\/blob\/main\/README(\.zh-CN)?\.md)?#([^"'\s)<>]+)/g)) {
        if (!anchorsOf(zh ? 'README.zh-CN.md' : 'README.md').has(decodeURIComponent(anchor))) bad.push(`${f}: #${anchor}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('add-badge skill', () => {
  const dir = '.agents/skills/add-badge';

  it('Claude Code 的入口是指向正本的相对软链接', () => {
    const link = join(root, '.claude/skills/add-badge');
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe('../../.agents/skills/add-badge');
    expect(realpathSync(link)).toBe(realpathSync(join(root, dir)));
  });

  it('SKILL.md 有 name 和 description，提到的仓库路径都存在', () => {
    const skill = read(`${dir}/SKILL.md`);
    expect(skill).toMatch(/^---\nname: add-badge\ndescription: .+\n---/);
    const paths = [...skill.matchAll(/`((?:src|tests|scripts|references)\/[\w./<>-]+)`/g)].map((m) => m[1]).filter((p) => !p.includes('<'));
    expect(paths.length).toBeGreaterThan(5);
    expect(paths.filter((p) => !existsSync(join(root, p.startsWith('references/') ? `${dir}/${p}` : p)))).toEqual([]);
  });

  it('SKILL.md 和参考文件提到的仓库路径都存在', () => {
    for (const f of ['SKILL.md', 'references/parts.md', 'references/design-principles.md']) {
      const text = read(`${dir}/${f}`);
      const paths = [...text.matchAll(/`((?:src|tests|scripts|references)\/[\w./<>-]+)`/g)].map((m) => m[1]).filter((p) => !p.includes('<'));
      expect(paths.filter((p) => !existsSync(join(root, p.startsWith('references/') ? `${dir}/${p}` : p))), f).toEqual([]);
    }
  });

  it('模板是一枚能通过校验的徽章', async () => {
    // 模板放在 skill 目录里，引用路径按「复制到 src/brands/claude-code/habits/ 之后」写：
    // 把相对引用改成真实模块的绝对地址，写到临时文件里真正导入，再跑校验和版面检查
    const home = join(root, 'src/brands/claude-code/habits');
    const src = read(`${dir}/references/template.js`).replace(/(from\s+)'(\.{1,2}\/[^']+)'/g, (_, from, spec) => `${from}'${pathToFileURL(resolve(home, spec)).href}'`);
    expect(src).not.toMatch(/from\s+'\.\.?\//);
    const tmp = mkdtempSync(join(tmpdir(), 'add-badge-template-'));
    try {
      const file = join(tmp, 'template.mjs');
      writeFileSync(file, src);
      const config = (await import(/* @vite-ignore */ pathToFileURL(file).href)).default;
      expect(config.criteria?.target).toBeGreaterThan(1);
      expect(validateBadge(config, claudeBrand)).toBe(true);
      expect(layoutIssues(config)).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('不进 npm 包，也不进插件', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.files.some((f) => f.startsWith('.agents') || f.startsWith('.claude'))).toBe(false);
    expect(existsSync(join(root, 'skills/add-badge'))).toBe(false);
  });
});

describe('落地页文字', () => {
  const text = read('src/site/strings.js');
  const total = BRANDS.reduce((n, e) => n + e.badges.length, 0);
  const claude = BRANDS.find((e) => e.brand.id === 'claude-code');

  it('徽章总数、工具数量和代码一致', () => {
    expect(text).toContain(`'${total} 枚徽章，两个工具'`);
    expect(text).toContain(`'${total} badges, two tools'`);
    expect(BRANDS.length, 'strings.js 写的是「两个工具」，工具数量变了要改文字').toBe(2);
  });

  it('对话示例里 Claude Code 的徽章总数和代码一致', () => {
    expect(text).toContain(`Claude Code：已解锁 27 / ${claude.badges.length}`);
    expect(text).toContain(`Claude Code: 27 / ${claude.badges.length} unlocked`);
  });
});
