import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BRANDS } from '../src/brands/index.js';
import { tierKey } from '../src/brands/shared/text.js';
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
    for (const place of ['src/brands/index.js', 'src/collect/index.js', 'src/data/progress.js', 'src/data/mock-', '-metrics.js', 'package.json', 'tests/contracts.test.js', 'launchDate', 'TURNS_FIELD']) {
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
