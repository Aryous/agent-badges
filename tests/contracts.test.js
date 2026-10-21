import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANDS, BRAND_IDS, brandById } from '../src/brands/index.js';
import { COLLECTORS } from '../src/collect/index.js';
import { BRAND_INFO } from '../src/collect/summary.js';
import { DATA_SOURCES } from '../src/data/progress.js';

// 项目约定的守护测试：文档（AGENTS.md / CONTRIBUTING.md）里写的每条约定，都在这里或别的测试里有一条对应。

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sorted = (a) => [...a].sort();
const read = (f) => readFileSync(join(root, f), 'utf8');

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) out.push(...filesUnder(rel));
    else if (/\.(m?js)$/.test(name)) out.push(rel);
  }
  return out;
}

const importsOf = (file) =>
  [
    ...read(file).matchAll(/^\s*(?:import|export)\b[^'"`]*?from\s*['"]([^'"]+)['"]/gm),
    ...read(file).matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm),
    ...read(file).matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1]);

const withoutComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

describe('工具注册表只有一份', () => {
  it('BRANDS、COLLECTORS、DATA_SOURCES、BRAND_INFO 的工具 id 完全一致', () => {
    const ids = sorted(BRAND_IDS);
    expect(sorted(BRANDS.map((e) => e.brand.id))).toEqual(ids);
    expect(sorted(COLLECTORS.map((c) => c.BRAND_ID))).toEqual(ids);
    expect(sorted(Object.keys(DATA_SOURCES))).toEqual(ids);
    expect(sorted(Object.keys(BRAND_INFO))).toEqual(ids);
  });

  it('每个工具都写了发布日期', () => {
    for (const { brand } of BRANDS) expect(brand.launchDate, brand.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('每个采集模块都声明了对话轮数字段', () => {
    for (const c of COLLECTORS) expect(typeof c.TURNS_FIELD, c.BRAND_ID).toBe('string');
  });
});

describe('分层', () => {
  // 每一层能引用的层；不在表里的（app、site、project 和 src 根目录的入口）是入口层，可以引用任何层。
  const DEPS = {
    engine: ['engine'],
    brands: ['brands'],
    data: ['data', 'brands'],
    collect: ['collect', 'data', 'brands'],
    cli: ['cli', 'collect', 'data', 'brands'],
    viewer: ['viewer', 'engine', 'data', 'brands'],
  };
  // 这些层在命令行里运行：只能用 Node 自带模块
  const NODE_ONLY = ['brands', 'data', 'collect', 'cli'];
  const layerOf = (file) => {
    const parts = relative('src', file).split('/');
    return parts.length > 1 ? parts[0] : 'entry';
  };

  it('每个文件只引用允许的层', () => {
    const bad = [];
    for (const file of filesUnder('src')) {
      const from = layerOf(file);
      const allowed = DEPS[from];
      for (const spec of importsOf(file)) {
        if (spec.startsWith('.')) {
          const target = relative(root, resolve(root, dirname(file), spec));
          if (!target.startsWith('src/')) continue;
          const to = layerOf(target);
          if (allowed && !allowed.includes(to)) bad.push(`${file} → ${target}`);
        } else if (NODE_ONLY.includes(from) && !spec.startsWith('node:')) {
          bad.push(`${file} → ${spec}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('不手写工具 id', () => {
  const ids = BRAND_IDS.join('|');
  // 工具专属的文件可以写自己的 id
  const OWN = new RegExp(`^src/(brands/(${ids})/|brands/index\\.js$|collect/(${ids})\\.js$|data/(${ids})-metrics\\.js$|data/mock-(${ids})\\.js$)`);
  const LITERAL = new RegExp(`(['"\`])(${ids})\\1`);

  it('src/、bin/、vite.config.js 里只有工具专属文件和标了 showcase 的展示文件出现工具 id', () => {
    const files = [...filesUnder('src'), ...filesUnder('bin'), 'vite.config.js'];
    const bad = files.filter((f) => !OWN.test(f) && !/\/\/ showcase\b/.test(read(f)) && LITERAL.test(withoutComments(read(f))));
    expect(bad).toEqual([]);
  });
});

describe('展示列表', () => {
  it('网站、宣传片和素材脚本里挑出来展示的徽章都存在', () => {
    const files = [...filesUnder('src'), ...(statSync(join(root, 'tools'), { throwIfNoEntry: false }) ? filesUnder('tools') : []), ...filesUnder('scripts')];
    const missing = [];
    for (const f of files) {
      if (!/\/\/ showcase\b/.test(read(f)) && !f.startsWith('scripts/')) continue;
      for (const [, brand, id] of read(f).matchAll(/\{\s*brand:\s*'([a-z-]+)',\s*id:\s*'([a-z0-9-]+)'/g)) {
        if (!brandById(brand)?.badges.some((b) => b.id === id)) missing.push(`${f}: ${brand}/${id}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
