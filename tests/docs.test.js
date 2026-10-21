import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANDS } from '../src/brands/index.js';
import { tierKey } from '../src/brands/shared/text.js';

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
    const section = read('CONTRIBUTING.md').split(/^### Adding a tool/m)[1]?.split(/^##/m)[0] ?? '';
    for (const place of ['src/brands/index.js', 'src/collect/index.js', 'src/data/progress.js', 'src/data/mock-', 'src/data/', 'launchDate', 'TURNS_FIELD']) {
      expect(section, place).toContain(place);
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
      expect(text).toContain(String(total));
      for (const { brand, badges } of BRANDS) expect(text, brand.id).toContain(String(badges.length));
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

  it('落地页和技能里链到 README 某一节的链接都有效', () => {
    const files = [...filesUnder('src'), ...filesUnder('skills'), 'landing.html'];
    const bad = [];
    for (const f of files) {
      for (const [, zh, anchor] of read(f).matchAll(/github\.com\/Aryous\/agent-badges(?:\/blob\/main\/README(\.zh-CN)?\.md)?#([^"'\s)<>]+)/g)) {
        if (!anchorsOf(zh ? 'README.zh-CN.md' : 'README.md').has(decodeURIComponent(anchor))) bad.push(`${f}: #${anchor}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
