import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANDS, BRAND_IDS, brandById } from '../src/brands/index.js';
import { COLLECTORS } from '../src/collect/index.js';
import { BRAND_INFO } from '../src/collect/summary.js';
import { DATA_SOURCES } from '../src/data/progress.js';
import * as ccMetrics from '../src/data/claude-code-metrics.js';
import * as cxMetrics from '../src/data/codex-metrics.js';
import { addDays } from '../src/data/metrics-common.js';

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

describe('入口和采集层的边界', () => {
  it('src/collect/ 是纯逻辑：不输出到控制台，不引用 i18n', () => {
    const bad = filesUnder('src/collect').filter((f) => /\bconsole\./.test(withoutComments(read(f))) || importsOf(f).some((s) => /i18n/.test(s)));
    expect(bad).toEqual([]);
  });

  it('bin/ 只是命令行入口：相对路径引用只指向 src/cli/', () => {
    const bad = [];
    for (const file of filesUnder('bin')) {
      for (const spec of importsOf(file).filter((s) => s.startsWith('.'))) {
        if (!relative(root, resolve(root, dirname(file), spec)).startsWith('src/cli/')) bad.push(`${file} → ${spec}`);
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

const METRICS = { 'claude-code': ccMetrics, codex: cxMetrics };
const TODAY = '2026-10-21';

// 一天的基础记录：让这一天算「有活动」，其余字段为 0
const baseDay = (brandId, extra) => ({
  ...(brandId === 'codex' ? { threads: 1, turns: 1, patches: 0 } : { sessions: 1, humanTurns: 1, toolCalls: 0 }),
  tokens: 1,
  hours: Array(24).fill(0),
  models: [],
  mcp: [],
  longestSessionMin: 0,
  ...extra,
});
const names = (n) => Array.from({ length: n }, (_, i) => `x${i}`);

// 「有数字门槛的一次性徽章」在账本里对应的字段：给出数值 n，造出刚好是 n 的账本。
// 新增这类徽章时在这里补一条，否则下面的测试会提醒。
const FIXTURES = {
  'productive-day': (b, n) => ({ '2026-03-02': baseDay(b, b === 'codex' ? { threads: n } : { sessions: n }) }),
  multitasker: (b, n) => ({ '2026-03-02': baseDay(b, { maxParallel: n }) }),
  'subagent-commander': (b, n) => ({ '2026-03-02': baseDay(b, { maxParallelAgents: n }) }),
  'bash-maniac': (b, n) => ({ '2026-03-02': baseDay(b, { bashCalls: n }) }),
  'skill-master': (b, n) => ({ '2026-03-02': baseDay(b, { skillCalls: n }) }),
  connector: (b, n) => ({ '2026-03-02': baseDay(b, { mcp: names(n) }) }),
  'model-collector': (b, n) => ({ '2026-03-02': baseDay(b, { models: names(n) }) }),
  compactor: (b, n) => ({ '2026-03-02': baseDay(b, { compactions: n }) }),
  marathon: (b, n) => ({ '2026-03-02': baseDay(b, { longestSessionMin: n * 60 }) }),
  'seven-day-streak': (b, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays('2026-03-02', i), baseDay(b)])),
};

const isCounted = (badge) => !badge.tiers && badge.criteria.target > 1 && !badge.criteria.dynamic;

describe('每枚徽章都有统计规则', () => {
  for (const { brand, badges } of BRANDS) {
    it(`${brand.id}：RULES 的 key 和徽章 id 一一对应`, () => {
      expect(sorted(Object.keys(METRICS[brand.id].RULES))).toEqual(sorted(badges.map((b) => b.id)));
    });
    it(`${brand.id}：空账本也能算出每枚徽章的进度`, () => {
      const out = METRICS[brand.id].computeProgress({ days: {} }, badges, TODAY);
      expect(sorted(Object.keys(out))).toEqual(sorted(badges.map((b) => b.id)));
    });
  }
});

describe('门槛只写在配置里', () => {
  for (const { brand, badges } of BRANDS) {
    const { computeProgress } = METRICS[brand.id];
    const unlockedAt = (badge, n) => computeProgress({ days: FIXTURES[badge.id](brand.id, n) }, [badge], TODAY)[badge.id].unlocked;

    for (const badge of badges.filter(isCounted)) {
      it(`${brand.id}/${badge.id}：达到配置的门槛才解锁，改门槛规则跟着变`, () => {
        expect(FIXTURES[badge.id], `tests/contracts.test.js 的 FIXTURES 缺 ${badge.id}`).toBeTypeOf('function');
        const t = badge.criteria.target;
        expect(unlockedAt(badge, t)).toBe(true);
        expect(unlockedAt(badge, t - 1)).toBe(false);
        const moved = { ...badge, criteria: { ...badge.criteria, target: t + 2 } };
        expect(unlockedAt(moved, t + 1)).toBe(false);
        expect(unlockedAt(moved, t + 2)).toBe(true);
        expect(computeProgress({ days: FIXTURES[badge.id](brand.id, t) }, [badge], TODAY)[badge.id].progress.target).toBe(t);
      });

      it(`${brand.id}/${badge.id}：中英文说明里写的是配置的门槛`, () => {
        // 数字两侧不能再连着数字：5 不能靠「50」蒙混过关
        const t = new RegExp(`(?<!\\d)${badge.criteria.target}(?!\\d)`);
        expect(badge.description).toMatch(t);
        expect(badge.en.description).toMatch(t);
      });
    }
  }

  // anniversary 的 target 是 1，isCounted 会跳过它；这里单独证明规则读的是 criteria.target（年数）
  for (const { brand, badges } of BRANDS) {
    it(`${brand.id}/anniversary：target 是年数，改成 2 要满 730 天才解锁`, () => {
      const badge = badges.find((b) => b.id === 'anniversary');
      const two = { ...badge, criteria: { ...badge.criteria, target: 2 } };
      const first = '2024-03-02';
      const days = { [first]: baseDay(brand.id) };
      const at = (n) => METRICS[brand.id].computeProgress({ days }, [two], addDays(first, n))[badge.id].unlocked;
      expect(at(365)).toBe(false);
      expect(at(729)).toBe(false);
      expect(at(730)).toBe(true);
    });
  }

  it('criteria 只有 target、unit、dynamic；分级徽章不写 criteria', () => {
    for (const { badges } of BRANDS) {
      for (const b of badges) {
        if (b.tiers) expect(b.criteria, b.id).toBeUndefined();
        else expect(Object.keys(b.criteria).filter((k) => !['target', 'unit', 'dynamic'].includes(k)), b.id).toEqual([]);
      }
    }
  });
});
