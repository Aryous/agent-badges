# 3D 月章与弹出查看 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 年度铸币套装托盘里的 12 枚月章换成 3D 渲染的图片；点一枚，它从托盘原位置飞进单枚查看，关上时飞回原位。

**Architecture:**
- 引擎加两个材质预设：哑光珐琅、火珐琅。
- `viewer/month-medal.js` 负责纯数据和配置（放在 viewer：brands 层只能引用 brands，而它要用 engine 的字体和 data 的数字格式）：月章数据、宝石色板、正面 C 加背面 B3 的引擎配置。
- `viewer/proof-set.js` 在 SVG 上面叠一层 3D 图片和透明的悬停命中区，槽位变成按钮。
- `app/medals.js` 负责两件事：
  - 借陈列墙缩略图的舞台截图，并按年份和工具缓存；
  - 组装临时 item，交给现有的单枚查看。
- `app/inspect.js` 加三样：从矩形起飞、飞回原位、月章专用的信息区。

**Tech Stack:** vanilla ES modules, three.js 0.186, Vite (dev server 5199), Vitest, Playwright headless Chrome (`scripts/browser.mjs`).

Spec: `docs/superpowers/specs/2026-10-26-month-medals-3d-design.md`

## Global Constraints

- **工作位置：** 分支 `feat/month-medals`，在主检出目录 `/Users/lucas/Documents/Code/agent-badges` 里工作。开发服务器 5199 就是这个检出，需要时用 `npx vite --port 5199` 启动。
- **不提交实验页文件：** `medal-lab.html`、`lab-assets/`、`*-lab*.html`、`coin-lab.html`、`.superpowers/`、`.impeccable/`。提交时只 `git add` 明确列出的文件，不要 `git add -A`。
- **只用示例数据：** 用临时目录或示例数据（`source=mock`），不读、不写 `~/.agent-badges`、`~/.claude`、`~/.codex`。
- **火珐琅参数，一字不改：**
  - `color` = 宝石色，`metalness: 0.9`，`roughness: 0.03`；
  - `clearcoat: 1`，`clearcoatRoughness: 0.02`；
  - `envMapIntensity: 2.2`，`ior: 1.77`，`specularIntensity: 1`；
  - `emissive` = 宝石色，`emissiveIntensity: 0.08`；不透光。
- **哑光珐琅参数，一字不改：**
  - `metalness: 0`，`roughness: 0.68`；
  - `clearcoat: 0.25`，`clearcoatRoughness: 0.35`；
  - `envMapIntensity: 0.12`，`specularIntensity: 0.35`。
- **宝石色：** 品牌色的色相，饱和度 0.85，亮度 1 档 0.70、2 档 0.62、3 档 0.55、4 档 0.48。
  - Claude Code（`#D97757`）四档：`#f49171 #f0744c #ee5b2b #e24612`；
  - Codex（`#7A9DFF`）四档：`#7194f4 #4c77f0 #2b5eee #1249e2`。
- **月章色板键：** 都带 `medal:` 前缀：`medal:<系列序号>:<档位>`、`medal:sunk` = `#0d1538`、`medal:future` = `#222c5c`、`medal:unlock` = `#d9bf86`、`medal:label` = `#d6c49a`。
- **截图：** 用 `MEDAL_FILL = 0.94`。截图边长 = `CASE.coinMax × min(2, devicePixelRatio)`。
- **换图：** 换上 3D 图片时 12 枚一起换。抽屉开着时用 0.45 秒淡入，曲线 `cubic-bezier(0.2, 0.7, 0.2, 1)`；抽屉关着或系统开了“减少动态效果”时直接换。
- **托盘里的预备动作：** 原位抬起 4px、放大 1.04 倍，0.19 秒，然后才交给单枚查看。系统开了“减少动态效果”时：不抬起，不从原位起飞，也不飞回。
- **不碰陈列墙：** 陈列墙徽章的打开、关闭行为不变。地址栏 hash 只有月章不写。
- **徽章外观不变：** `node scripts/visual.mjs compare` 299 张导出图必须逐像素一致。基线已经由控制者截好，在 `/private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/visual-medals-before`。
- **写法：** 代码注释和界面文案用中文，简短直白，跟现有文件的语气一致；英文文案写进 `i18n` 的 `en`。
- **提交信息：** 英文，前缀 `feat:` / `test:` / `fix:`。结尾加一行 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。

---

### Task 1: 引擎的两个材质预设

**Files:**
- Modify: `src/engine/materials.js`（`PRESETS` 里加两项）
- Modify: `src/engine/registry.js`（`MATERIAL_TYPES` 里加两项）
- Test: `tests/month-medal-materials.test.js`（新建）

**Interfaces:**
- Produces：材质名 `'enamel-matte'` 和 `'fired-enamel'`，`createMaterial(type, color)` 可以用，`validateBadge` 也认。

- [ ] **Step 1: 写失败的测试** `tests/month-medal-materials.test.js`

```js
// 月章用的两种材质：参数要和用户在实验页里选定的一致
import { describe, expect, it } from 'vitest';
import { createMaterial, hasMaterial } from '../src/engine/materials.js';
import { MATERIAL_TYPES } from '../src/engine/registry.js';

const hex = (c) => '#' + c.getHexString();

describe('月章材质预设', () => {
  it('登记在册', () => {
    for (const t of ['enamel-matte', 'fired-enamel']) {
      expect(MATERIAL_TYPES).toContain(t);
      expect(hasMaterial(t)).toBe(true);
    }
  });

  it('哑光珐琅：只给月章用，比引擎的珐琅哑', () => {
    const m = createMaterial('enamel-matte', '#141f4d');
    expect(hex(m.color)).toBe('#141f4d');
    expect(m.metalness).toBe(0);
    expect(m.roughness).toBe(0.68);
    expect(m.clearcoat).toBe(0.25);
    expect(m.clearcoatRoughness).toBe(0.35);
    expect(m.envMapIntensity).toBe(0.12);
    expect(m.specularIntensity).toBe(0.35);
    expect(m.userData.preset).toBe('enamel-matte');
  });

  it('火珐琅：高光泽的彩色金属珠，不透光，自身带一点同色的光', () => {
    const m = createMaterial('fired-enamel', '#e24612');
    expect(hex(m.color)).toBe('#e24612');
    expect(hex(m.emissive)).toBe('#e24612');
    expect(m.emissiveIntensity).toBe(0.08);
    expect(m.transmission).toBe(0);
    expect(m.metalness).toBe(0.9);
    expect(m.roughness).toBe(0.03);
    expect(m.clearcoat).toBe(1);
    expect(m.clearcoatRoughness).toBe(0.02);
    expect(m.envMapIntensity).toBe(2.2);
    expect(m.ior).toBeCloseTo(1.77, 5);
    expect(m.specularIntensity).toBe(1);
  });

  it('原有的珐琅预设没变', () => {
    const m = createMaterial('enamel', '#141f4d');
    expect([m.roughness, m.clearcoat, m.clearcoatRoughness, m.envMapIntensity]).toEqual([0.55, 1, 0.03, 0.55]);
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

Run: `npx vitest run tests/month-medal-materials.test.js`
Expected: FAIL（`MATERIAL_TYPES` 不含 `enamel-matte`）

- [ ] **Step 3: 实现**

`src/engine/materials.js`：在 `PRESETS` 里 `locked` 之前加：

```js
  // 月章上的珐琅：比 enamel 哑。满清漆在月章这种小件上会映出整片灯箱、把颜色冲白
  'enamel-matte': (c) => ({
    color: c,
    metalness: 0,
    roughness: 0.68,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.12,
    specularIntensity: 0.35,
  }),

  // 火珐琅珠（月章上每天一颗）：高光泽的彩色金属，不透光；自身带一点同色的光，暗处也看得出颜色
  'fired-enamel': (c) => ({
    color: c,
    metalness: 0.9,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.2,
    ior: 1.77,
    specularIntensity: 1,
    emissive: c,
    emissiveIntensity: 0.08,
  }),
```

`src/engine/registry.js`：`MATERIAL_TYPES` 里 `'crystal'` 后面加：

```js
  'enamel-matte',    // 哑光珐琅（月章）
  'fired-enamel',    // 火珐琅珠（月章）：高光泽彩色金属
```

- [ ] **Step 4: 跑测试，确认通过；全量测试也不能挂**

Run: `npx vitest run tests/month-medal-materials.test.js && npm test`
Expected: PASS（全量 568 + 4）

- [ ] **Step 5: 提交**

```bash
git add src/engine/materials.js src/engine/registry.js tests/month-medal-materials.test.js
git commit -m "feat: matte enamel and fired-enamel material presets for month medals"
```

---

### Task 2: 月章的数据、色板和配置

**Files:**
- Modify: `src/brands/shared/completionist.js`（把 `P`、`pathItem`、`laurel`、`STAR` 改成 `export`，内容不动）
- Create: `src/viewer/month-medal.js`
- Test: `tests/month-medal.test.js`（新建）

**Interfaces:**
- Consumes：Task 1 的 `'enamel-matte'`、`'fired-enamel'`。
- Produces（`src/viewer/month-medal.js`）：
  - `gemHex(hex: string, level: 1|2|3|4): string`；
  - `gemKey(series: number, level: number): string`：返回 `'medal:<series>:<level>'`；
  - `medalPalette(series: { color: string }[]): Record<string, string>`；
  - `beadAt(i: number, n: number, r = RB): [number, number]`：1 号在正上方，顺时针；
  - `RB = 0.755`；
  - `monthMedalData({ year, month, tokens, activeDays, series, partsOf, markersOn, now })`，返回
    `{ year, month, tokens, active, unlocks, tools: number[], days: { date, future, parts: { series, level }[], unlocks }[] }`；
  - `monthMedalConfig(medal, { tier: 0|1|2|3 }): object`：引擎配置，id 是 `medal-YYYY-MM`。

- [ ] **Step 1: 把月桂等几样从 `completionist.js` 导出**

`src/brands/shared/completionist.js` 里四处声明前加 `export`，函数体一个字都不改：

```js
export const STAR = (() => {
export const P = ([x, y]) => `${(x + 1).toFixed(4)} ${(1 - y).toFixed(4)}`;
export const pathItem = (d, look) => ({ kind: 'path', d, viewBox: 2, scale: 1, center: [0, 0], ...look });
export function laurel(side, look) {
```

- [ ] **Step 2: 写失败的测试** `tests/month-medal.test.js`

```js
// 月章：数据、宝石色板、引擎配置（正面 C + 火珐琅，背面 B3）
import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { validateBadge } from '../src/engine/validate.js';
import { buildBadge, disposeBadge } from '../src/engine/badge.js';
import { SUNK } from '../src/viewer/heatmap.js';
import { RB, beadAt, gemHex, gemKey, medalPalette, monthMedalConfig, monthMedalData } from '../src/viewer/month-medal.js';

const series = [
  { id: 'claude-code', color: '#D97757' },
  { id: 'codex', color: '#7A9DFF' },
];
// 2026 年 4 月：1 号 Claude Code 3 档；2 号两个工具（左 CC 2 档、右 Codex 4 档）并解锁两枚；3 号没活动；28 号以后是未来
const parts = {
  '2026-04-01': [{ id: 'claude-code', color: '#D97757', level: 3 }],
  '2026-04-02': [
    { id: 'claude-code', color: '#D97757', level: 2 },
    { id: 'codex', color: '#7A9DFF', level: 4 },
  ],
};
const markers = { '2026-04-02': [{}, {}] };
const april = monthMedalData({
  year: 2026,
  month: 3,
  tokens: 1.1e9,
  activeDays: 2,
  series,
  partsOf: (d) => parts[d] ?? [],
  markersOn: (d) => markers[d] ?? [],
  now: '2026-04-27',
});
const brand = BRANDS.find((b) => b.brand.id === 'claude-code').brand;
const withPalette = { ...brand, palette: { ...brand.palette, ...medalPalette(series) } };
const beadsOf = (relief) => relief.filter((r) => r.material === 'fired-enamel');

describe('宝石色', () => {
  it('品牌色的色相、饱和度 0.85，档位越高越深', () => {
    expect([1, 2, 3, 4].map((l) => gemHex('#D97757', l))).toEqual(['#f49171', '#f0744c', '#ee5b2b', '#e24612']);
    expect([1, 2, 3, 4].map((l) => gemHex('#7A9DFF', l))).toEqual(['#7194f4', '#4c77f0', '#2b5eee', '#1249e2']);
  });

  it('色板：每个系列 4 档，键带 medal: 前缀，另有凹点、未来、金边、月份字', () => {
    const p = medalPalette(series);
    expect(p[gemKey(0, 4)]).toBe('#e24612');
    expect(p[gemKey(1, 1)]).toBe('#7194f4');
    expect(p['medal:sunk']).toBe(SUNK);
    expect(p['medal:future']).toBe('#222c5c');
    expect(p['medal:unlock']).toBe('#d9bf86');
    expect(p['medal:label']).toBe('#d6c49a');
    expect(Object.keys(p).every((k) => k.startsWith('medal:'))).toBe(true);
  });
});

describe('月章数据', () => {
  it('按天：工具换成系列序号，解锁数，now 之后是未来', () => {
    expect(april.days).toHaveLength(30);
    expect(april.days[0]).toEqual({ date: '2026-04-01', future: false, parts: [{ series: 0, level: 3 }], unlocks: 0 });
    expect(april.days[1].parts).toEqual([
      { series: 0, level: 2 },
      { series: 1, level: 4 },
    ]);
    expect(april.days[1].unlocks).toBe(2);
    expect(april.days[2]).toEqual({ date: '2026-04-03', future: false, parts: [], unlocks: 0 });
    expect(april.days[27].future).toBe(true);
    expect(april.days[26].future).toBe(false);
  });

  it('汇总：活跃天数用调用方给的数，解锁数相加，当月用过的工具', () => {
    expect(april).toMatchObject({ year: 2026, month: 3, tokens: 1.1e9, active: 2, unlocks: 2, tools: [0, 1] });
  });
});

describe('珠子的位置', () => {
  it('1 号在正上方，顺时针', () => {
    const [x0, y0] = beadAt(0, 30);
    expect(x0).toBeCloseTo(0, 6);
    expect(y0).toBeCloseTo(RB, 6);
    const [x1] = beadAt(1, 30);
    expect(x1).toBeGreaterThan(0);
  });
});

describe('月章配置', () => {
  const config = monthMedalConfig(april, { tier: 2 });

  it('通过校验，能组装出来', () => {
    expect(() => validateBadge(config, withPalette)).not.toThrow();
    const badge = buildBadge(config, withPalette, { unlocked: true, earnedAt: null, tier: null, progress: { current: 1, target: 1 } });
    expect(badge).toBeTruthy();
    disposeBadge(badge);
  });

  it('id、外圈金属、哑光珐琅的正面板和背面', () => {
    expect(config.id).toBe('medal-2026-04');
    expect(config.layers[0]).toMatchObject({ kind: 'rim', material: 'polished-metal', color: 'silver' });
    expect(config.layers[1]).toMatchObject({ kind: 'face', material: 'enamel-matte', color: 'midnight' });
    expect(config.back).toMatchObject({ material: 'enamel-matte', color: 'midnight', engraving: false });
  });

  it('珠子：一个工具一颗火珐琅，两个工具左右各半；没活动是暗色珐琅；未来是小暗点', () => {
    const beads = beadsOf(config.relief);
    // 1 号一整颗，2 号两个半颗
    expect(beads).toHaveLength(3);
    expect(beads.map((b) => b.color)).toEqual([gemKey(0, 3), gemKey(0, 2), gemKey(1, 4)]);
    expect(config.relief.filter((r) => r.color === 'medal:sunk')).toHaveLength(27 - 2);
    expect(config.relief.filter((r) => r.color === 'medal:future')).toHaveLength(3);
  });

  it('解锁的日子嵌一圈金边', () => {
    const rings = config.relief.filter((r) => r.kind === 'ring' && r.color === 'medal:unlock');
    expect(rings).toHaveLength(1);
    expect(rings[0].center[0]).toBeCloseTo(beadAt(1, 30)[0], 6);
  });

  it('珠子顶面和金属环齐平，没有衬片', () => {
    for (const b of beadsOf(config.relief)) expect(b.z ?? 0).toBe(0);
    expect(config.relief.some((r) => r.material === 'polished-metal' && r.color === 'silver' && r.kind === 'circle')).toBe(false);
  });

  it('背面 B3：上弧月份全名、下弧年份，月桂，中间月份数字；两个工具时结是金边色', () => {
    const arcs = config.backRelief.filter((r) => r.kind === 'text-arc');
    expect(arcs.map((a) => [a.arc, a.text])).toEqual([
      ['top', 'APRIL'],
      ['bottom', '2026'],
    ]);
    expect(config.backRelief.find((r) => r.kind === 'text').text).toBe('4');
    const knot = config.backRelief.find((r) => r.kind === 'circle' && r.center?.[1] === -0.41);
    expect(knot.color).toBe('medal:unlock');
  });

  it('只用了一个工具的月份：结是那个工具的 4 档宝石色', () => {
    const one = monthMedalData({ year: 2026, month: 0, tokens: 1, activeDays: 1, series, partsOf: (d) => (d === '2026-01-05' ? [{ id: 'codex', color: '#7A9DFF', level: 1 }] : []), markersOn: () => [], now: '2026-10-26' });
    const knot = monthMedalConfig(one, { tier: 0 }).backRelief.find((r) => r.kind === 'circle' && r.center?.[1] === -0.41);
    expect(knot.color).toBe(gemKey(1, 4));
  });
});
```

- [ ] **Step 3: 跑测试，确认失败**

Run: `npx vitest run tests/month-medal.test.js`
Expected: FAIL（找不到 `month-medal.js`）

- [ ] **Step 4: 实现** `src/viewer/month-medal.js`

```js
// 月章：年度铸币套装里每个月一枚，全解锁徽章的「小兄弟」。不进徽章注册表，配置按当月数据生成。
// 正面：一圈抛光金属环（外圈同款阶段金属），每天一个孔。有活动的日子镶一颗火珐琅珠（两个工具左右各半），
// 没活动是暗色珐琅，未来的日子一个小暗点，解锁了徽章的日子嵌一圈金边；中间写月份和 Token。
// 背面：环带 + 月桂环抱月份数字（和全解锁徽章背面同一套月桂）。
// 颜色用 medal: 前缀的色板键，由 medalPalette 按热力图的系列生成，组装时并进品牌色板。
import { BEAD_R, HAIR_R, P, SMALL, STAGE_METALS, STAR, TEXT_R, laurel, pathItem } from './completionist.js';
import { RING_FONT, hasGlyph } from '../../engine/text.js';
import { formatCount } from '../../data/format.js';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_LONG = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const pad2 = (n) => String(n).padStart(2, '0');

// ---------- 颜色 ----------

const hex2 = (v) => Math.round(v).toString(16).padStart(2, '0');
const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 宝石色：品牌色的色相，饱和度拉到 0.85（比热力图的珐琅鲜）；档位越低越浅，4 档最浓。 */
export function gemHex(hex, level) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const L = [0, 0.7, 0.62, 0.55, 0.48][level] ?? 0.48;
  const S = 0.85;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  const [x, y, z] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return '#' + [x, y, z].map((v) => hex2((v + m) * 255)).join('');
}

export const gemKey = (series, level) => `medal:${series}:${level}`;

/**
 * 月章的色板键。凹点色和热力图的 SUNK 相同，金边和热力图的解锁圈同色。
 * @param {{ color: string }[]} series  热力图的系列（顺序就是左右顺序）
 */
export function medalPalette(series) {
  const out = { 'medal:sunk': '#0d1538', 'medal:future': '#222c5c', 'medal:unlock': '#d9bf86', 'medal:label': '#d6c49a' };
  series.forEach((s, i) => {
    for (let l = 1; l <= 4; l++) out[gemKey(i, l)] = gemHex(s.color, l);
  });
  return out;
}

// ---------- 数据 ----------

/**
 * 一个月的月章数据。partsOf / markersOn 用热力图的同名函数（只算开着的工具）。
 * @param {{ year: number, month: number, tokens: number, activeDays: number, series: { id: string }[],
 *   partsOf: (date: string) => { id: string, level: number }[], markersOn: (date: string) => unknown[], now: string }} o
 */
export function monthMedalData({ year, month, tokens, activeDays, series, partsOf, markersOn, now }) {
  const n = new Date(year, month + 1, 0).getDate();
  const index = new Map(series.map((s, i) => [s.id, i]));
  const tools = new Set();
  const days = Array.from({ length: n }, (_, i) => {
    const date = `${year}-${pad2(month + 1)}-${pad2(i + 1)}`;
    if (date > now) return { date, future: true, parts: [], unlocks: 0 };
    const parts = partsOf(date).map((p) => ({ series: index.get(p.id), level: p.level }));
    for (const p of parts) tools.add(p.series);
    return { date, future: false, parts, unlocks: markersOn(date).length };
  });
  return {
    year,
    month,
    tokens,
    active: activeDays,
    unlocks: days.reduce((k, d) => k + d.unlocks, 0),
    tools: [...tools].sort((a, b) => a - b),
    days,
  };
}

// ---------- 几何 ----------

const CIRCLE = { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05, reeded: { count: 180, depth: 0.01 } };
const INSET = 0.11; // 正面板内缩：和全解锁徽章一样
export const RB = 0.755; // 珠子圆心所在的半径
const FUT = 0.026; // 未来的日子：一个很小的暗点
const ROUND = { curve: 16, bevel: 5 }; // 放大看也不出棱角
const INNER_R = 0.6; // 中间文字外面的一圈细线
const TRACK_H = 0.03; // 金属环的高度
const TOP = { height: TRACK_H + 0.002, bevel: 0.003 }; // 珠子：从正面板一直到顶面，和金属环齐平

/** 第 i 天（0 起）的位置：1 号在正上方，顺时针。 */
export const beadAt = (i, n, r = RB) => {
  const a = Math.PI / 2 - (i / n) * Math.PI * 2;
  return [r * Math.cos(a), r * Math.sin(a)];
};

/** 整圆子路径：大圆分八段（放大时不出折线），小圆两段。 */
function circleD(cx, cy, r, parts = r > 0.3 ? 8 : 2) {
  let d = `M${P([cx + r, cy])}`;
  for (let i = 1; i <= parts; i++) {
    const a = (i / parts) * Math.PI * 2;
    d += `A${r.toFixed(4)} ${r.toFixed(4)} 0 0 0 ${P([cx + r * Math.cos(a), cy + r * Math.sin(a)])}`;
  }
  return d + 'Z';
}
/** 半圆：side −1 左半，1 右半（左边是第一个工具，和热力图一样）。 */
const halfD = (cx, cy, r, side) => `M${P([cx, cy + r])}A${r.toFixed(4)} ${r.toFixed(4)} 0 0 ${side < 0 ? 0 : 1} ${P([cx, cy - r])}Z`;

/** 一颗珠子：没活动是暗色珐琅；一个工具一整颗火珐琅；两个工具左右各半。 */
function bead(day, [x, y], r) {
  if (!day.parts.length) return [{ kind: 'circle', radius: r, center: [x, y], material: 'enamel-matte', color: 'medal:sunk', ...TOP, segments: ROUND }];
  const key = (p) => gemKey(p.series, p.level);
  if (day.parts.length === 1) return [{ kind: 'circle', radius: r, center: [x, y], material: 'fired-enamel', color: key(day.parts[0]), ...TOP, segments: ROUND }];
  return [-1, 1].map((side, k) => pathItem(halfD(x, y, r, side), { material: 'fired-enamel', color: key(day.parts[k]), ...TOP }));
}

/** 解锁金边：嵌在开大了的孔里。 */
const unlockRing = (center) => ({ kind: 'ring', radius: 0.0665, width: 0.013, center, material: 'polished-metal', color: 'medal:unlock', height: TRACK_H + 0.003, bevel: 0.004, segments: ROUND });

/** 正面 C：金属环上每天一个孔，珠子嵌在孔里；解锁的日子孔开大一点，嵌一圈金边。 */
function track(medal, metal) {
  const n = medal.days.length;
  let d = circleD(0, 0, 0.858) + circleD(0, 0, 0.652);
  const fills = [];
  medal.days.forEach((day, i) => {
    const at = beadAt(i, n);
    if (day.future) {
      d += circleD(at[0], at[1], FUT + 0.004);
      fills.push({ kind: 'circle', radius: FUT, center: at, material: 'enamel-matte', color: 'medal:future', ...TOP, segments: ROUND });
      return;
    }
    if (day.unlocks) {
      d += circleD(at[0], at[1], 0.079);
      fills.push(unlockRing(at), ...bead(day, at, 0.052));
    } else {
      d += circleD(at[0], at[1], 0.057);
      fills.push(...bead(day, at, 0.0555));
    }
  });
  return [pathItem(d, { material: 'polished-metal', color: metal, height: TRACK_H, bevel: 0.005 }), ...fills];
}

// ---------- 文字 ----------

/** 水平文字的宽度（徽章单位），用来防止长数字顶到圈。 */
function textWidth(text, size, tracking) {
  const em = size / RING_FONT.capHeight;
  return [...text].reduce((w, ch) => w + RING_FONT.glyphs[ch].advance * em + tracking * size, 0) - tracking * size;
}
const safe = (s) => [...s].filter(hasGlyph).join('');

/** 竖排几行字按视觉居中（同 proof-set.js 的 centerStack）：整块的中心比几何中心高一点点。 */
function stack(lines, { gap = 0.085, lift = 0.012, maxW = 0.9 } = {}) {
  const fitted = lines.map(([text, size, tracking, look]) => {
    const w = textWidth(text, size, tracking);
    return [text, w > maxW ? (size * maxW) / w : size, tracking, look];
  });
  const total = fitted.reduce((a, [, s]) => a + s, 0) + gap * (fitted.length - 1);
  let y = total / 2 + lift;
  return fitted.map(([text, size, tracking, look]) => {
    const item = { kind: 'text', text, size, tracking, center: [0, y - size / 2], ...look };
    y -= size + gap;
    return item;
  });
}

function front(medal, metal) {
  return [
    ...track(medal, metal),
    { kind: 'ring', radius: INNER_R, width: 0.012, material: 'polished-metal', color: metal, height: 0.016, bevel: 0.002, segments: { curve: 48 } },
    ...stack(
      [
        // 月份用浅香槟色、数字用象牙白：锡、铜外圈的金属字在深蓝上太暗
        [MONTHS[medal.month], 0.12, 0.26, { material: 'enamel-matte', color: 'medal:label', height: 0.026, bevel: 0.006 }],
        [safe(formatCount(medal.tokens)), 0.23, 0.04, { material: 'enamel-matte', color: 'ivory', height: 0.036, bevel: 0.008 }],
      ],
      { gap: 0.085, maxW: 0.86 },
    ),
  ];
}

// ---------- 背面 B3 ----------

const arc = (text, where, look) => ({ kind: 'text-arc', text: safe(text), arc: where, radius: TEXT_R, size: 0.088, tracking: 0.22, ...look, height: 0.024 });

function back(medal, look) {
  // 结：只用了一个工具是它的 4 档宝石色，两个工具是金边色
  const knot = medal.tools.length === 1 ? gemKey(medal.tools[0], 4) : 'medal:unlock';
  const knotMaterial = medal.tools.length === 1 ? 'fired-enamel' : 'polished-metal';
  return [
    { kind: 'ring', radius: HAIR_R, width: 0.012, ...look, height: 0.014, bevel: 0.002, segments: { curve: 48 } },
    ...Array.from({ length: 84 }, (_, i) => {
      const a = (i / 84) * Math.PI * 2;
      return { kind: 'circle', radius: 0.0085, center: [BEAD_R * Math.cos(a), BEAD_R * Math.sin(a)], ...look, height: 0.012, bevel: 0.003, segments: SMALL };
    }),
    arc(MONTHS_LONG[medal.month], 'top', look),
    arc(String(medal.year), 'bottom', look),
    ...[-TEXT_R, TEXT_R].map((x) => ({ kind: 'circle', radius: 0.02, center: [x, 0], ...look, height: 0.022 })),
    ...laurel(-1, look),
    ...laurel(1, look),
    { kind: 'path', d: STAR, viewBox: 24, scale: 0.042, center: [0, 0.39], ...look, height: 0.03, bevel: 0.005 },
    { kind: 'circle', radius: 0.026, center: [0, -0.41], material: knotMaterial, color: knot, height: 0.034 },
    ...stack([[String(medal.month + 1), 0.3, 0.02, { ...look, height: 0.045, bevel: 0.01 }]], { lift: 0 }),
  ];
}

// ---------- 组装 ----------

/**
 * 月章的引擎配置。
 * @param {ReturnType<typeof monthMedalData>} medal
 * @param {{ tier: 0|1|2|3 }} opts  外圈金属：锡、铜、银、金（monthTier 的结果）
 */
export function monthMedalConfig(medal, { tier }) {
  const metal = STAGE_METALS[tier];
  const look = { material: 'polished-metal', color: metal };
  return {
    id: `medal-${medal.year}-${pad2(medal.month + 1)}`,
    title: MONTHS[medal.month],
    // 只为通过 validateBadge：月章不进陈列墙，不按 criteria 计算
    criteria: { target: 1 },
    shape: CIRCLE,
    layers: [
      { kind: 'rim', ...look },
      { kind: 'face', material: 'enamel-matte', color: 'midnight', inset: INSET, pattern: 'rings' },
    ],
    relief: front(medal, metal),
    backRelief: back(medal, look),
    back: { material: 'enamel-matte', color: 'midnight', engraving: false },
  };
}
```

说明：两个工具时结用 `polished-metal` 加 `medal:unlock`，这就是实验页里的金边色金属结；一个工具时结用火珐琅加 4 档宝石色。实验页里这个结是 `enamel` 材质，在这里统一改成上面这两种。如果 `validateBadge` 要求配置里有 `description` 之类的字段，参照 `completionistConfig` 补上最少的字段，不要关掉校验。

- [ ] **Step 5: 跑测试，确认通过；全量测试也跑一遍**

Run: `npx vitest run tests/month-medal.test.js && npm test`
Expected: PASS

如果“珠子数”断言没过（凹点数 `27 - 2` 的意思是：1–27 号非未来，减去 1、2 号两个有活动的日子；未来是 28、29、30 号三颗），先核对 `april` 的输入，不要改断言凑数。

- [ ] **Step 6: 提交**

```bash
git add src/brands/shared/completionist.js src/viewer/month-medal.js tests/month-medal.test.js
git commit -m "feat: month medal data, gem palette and engine config (front C fired enamel, back B3)"
```

---

### Task 3: 托盘：3D 图片层、悬停命中区、槽位变按钮

**Files:**
- Modify: `src/viewer/proof-set.js`
- Modify: `src/styles/proof-set.css`
- Test: `tests/proof-set.test.js`（追加）

**Interfaces:**
- Consumes：Task 2 的 `monthMedalData`、`beadAt`。
- Produces：
  - `artKey(year: number, enabled: string[]): string`：`'2026|claude-code,codex'`，工具排序后拼接；
  - `medalHitSvg(medal, fill: number): string`；
  - `createProofSet({ heatmap, palette, reducedMotion, art?, onOpen? })`：
    - `art`：`{ request(key, medals) => Promise<(string|null)[] | null>, hurry() => void }`。`medals` 是 `{ month, tier, data }[]`，按月份从小到大排，返回的图片地址和它一一对应；
    - `onOpen`：`({ slot: HTMLElement, medal: { month, tier, data }, viaKeyboard: boolean, art: boolean }) => void`。`art` 表示当时托盘显示的是不是 3D 图片。

- [ ] **Step 1: 写失败的测试**（追加到 `tests/proof-set.test.js` 末尾，并在文件顶部的 import 里加上 `artKey, medalHitSvg`）

```js
import { artKey, medalHitSvg } from '../src/viewer/proof-set.js';
import { beadAt } from '../src/viewer/month-medal.js';

describe('月章 3D 图片', () => {
  it('缓存键：年份加排好序的工具，顺序不同也是同一个键', () => {
    expect(artKey(2026, ['codex', 'claude-code'])).toBe('2026|claude-code,codex');
    expect(artKey(2026, ['claude-code', 'codex'])).toBe(artKey(2026, ['codex', 'claude-code']));
    expect(artKey(2025, ['codex'])).toBe('2025|codex');
  });

  it('悬停命中区：每个不是未来的日子一个透明圆，位置和 3D 珠子对齐', () => {
    const medal = {
      days: [
        { date: '2026-04-01', future: false, parts: [], unlocks: 0 },
        { date: '2026-04-02', future: false, parts: [{ series: 0, level: 1 }], unlocks: 0 },
        { date: '2026-04-03', future: true, parts: [], unlocks: 0 },
      ],
    };
    const svg = medalHitSvg(medal, 0.94);
    const dates = [...svg.matchAll(/data-date="([^"]+)"/g)].map((m) => m[1]);
    expect(dates).toEqual(['2026-04-01', '2026-04-02']);
    // 视口：徽章半径是 1，图片边长对应 2 × 1.06 / fill
    const half = 1.06 / 0.94;
    expect(svg).toContain(`viewBox="${(-half).toFixed(4)} ${(-half).toFixed(4)} ${(2 * half).toFixed(4)} ${(2 * half).toFixed(4)}"`);
    // SVG 的 y 朝下
    const [x, y] = beadAt(1, 3);
    expect(svg).toContain(`cx="${x.toFixed(4)}" cy="${(-y).toFixed(4)}"`);
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

Run: `npx vitest run tests/proof-set.test.js`
Expected: FAIL（`artKey` 不是函数）

- [ ] **Step 3: 在 `proof-set.js` 里加两个纯函数**

在 import 区加：

```js
import { beadAt, monthMedalData } from './month-medal.js';
```

在 `medalSvg` 后面加：

```js
/** 3D 图片的缓存键：年份 + 开着的工具（排序后）。 */
export const artKey = (year, enabled) => `${year}|${[...enabled].sort().join(',')}`;

/**
 * 盖在 3D 图片上的透明命中区：每个不是未来的日子一个圆，带 data-date，接热力图的悬停浮层。
 * 坐标和 3D 珠子同一套（beadAt）；徽章半径是 1，图片边长对应 2 × 1.06 / fill（截图时的余量）。
 */
export function medalHitSvg(medal, fill) {
  const half = 1.06 / fill;
  const n = medal.days.length;
  const dots = medal.days
    .map((d, i) => {
      if (d.future) return '';
      const [x, y] = beadAt(i, n);
      return `<circle cx="${x.toFixed(4)}" cy="${(-y).toFixed(4)}" r="0.062" data-date="${d.date}"/>`;
    })
    .join('');
  const v = (-half).toFixed(4);
  const s = (2 * half).toFixed(4);
  return `<svg class="proof-hit" viewBox="${v} ${v} ${s} ${s}" aria-hidden="true" focusable="false">${dots}</svg>`;
}
```

- [ ] **Step 4: 跑测试，确认这两条通过**

Run: `npx vitest run tests/proof-set.test.js`
Expected: PASS

- [ ] **Step 5: 改 `createProofSet`：渲染月章数据、请求 3D 图片、换图、打开**

签名改成：

```js
export function createProofSet({ heatmap, palette, reducedMotion = false, art = null, onOpen = null }) {
```

文件顶部 JSDoc 补上 `art`、`onOpen` 两个参数的说明（意思照 Interfaces 写）。

在 `render` 里，`tray.innerHTML = ...` 前面先算出 `medals`；铸好的槽位里加一层 `.proof-art`，有 `onOpen` 时槽位是按钮。把 `render` 改成下面这样（原来就有的部分保持不变，只改动标出来的几处）：

```js
  let medals = []; // 当前年份和工具下铸好的月章：{ month, tier, data }，按月份排
  let artToken = 0;

  function render({ year: y, enabled }) {
    year = y;
    const now = today();
    const on = heatmap.series.filter((s) => enabled.includes(s.id));
    const stats = monthStats(
      on.map((s) => s.daily),
      year,
    );
    const minted = new Set(mintedMonths(stats, year, now));
    const max = Math.max(0, ...[...minted].map((m) => stats[m].tokens));
    const months = t('months');
    medals = [...minted]
      .sort((a, b) => a - b)
      .map((m) => ({
        month: m,
        tier: monthTier(stats[m].tokens, max),
        data: monthMedalData({ year, month: m, tokens: stats[m].tokens, activeDays: stats[m].days, series: heatmap.series, partsOf: heatmap.partsOf, markersOn: heatmap.markersOn, now }),
      }));
    tray.classList.remove('has-art');
    tray.innerHTML = stats
      .map((s, m) => {
        if (!minted.has(m)) {
          return `<div class="proof-slot is-empty" role="img" aria-label="${escape(t('proof.empty', { month: monthName(m) }))}" style="--i:${m}"><span>${escape(months[m])}</span></div>`;
        }
        const tier = monthTier(s.tokens, max);
        const metal = t(`completionist.${STAGE_METALS[tier]}`);
        const label = t('proof.medal', { month: monthName(m), tokens: formatCount(s.tokens), days: s.days, metal });
        const svg = medalSvg({ year, month: m, rim: rims[tier], label: months[m], tokens: s.tokens, partsOf: heatmap.partsOf, markersOn: heatmap.markersOn, now });
        // 能点开时是按钮（Enter、Space 打开）；落地页这类不能点开的地方仍是图片
        const role = onOpen ? 'role="button" tabindex="0"' : 'role="img"';
        return `<div class="proof-slot" ${role} aria-label="${escape(label)}" data-m="${m}" style="--i:${m}"><div class="proof-medal" data-tier="${tier}">${svg}</div><div class="proof-art" aria-hidden="true"></div></div>`;
      })
      .join('');
    box.querySelector('[data-year]').textContent = year;
    box.querySelector('[data-status]').textContent = plaqueStatus(year, minted.size, now);
    spoken = isSealed(year, now) ? t('proof.sealed') : t('proof.minting', { n: minted.size });
    labels();
    requestArt(enabled);
  }

  /** 要 3D 图片：全部画好、解码好以后一次换上；中途换了年份或工具就作废。画不出来就一直用 SVG。 */
  async function requestArt(enabled) {
    if (!art || !medals.length) return;
    const token = ++artToken;
    const list = medals;
    const urls = await art.request(artKey(year, enabled), list);
    if (token !== artToken || !urls) return;
    const imgs = urls.map((src) => {
      if (!src) return null;
      const img = new Image();
      img.alt = '';
      img.draggable = false;
      img.src = src;
      return img;
    });
    await Promise.all(imgs.filter(Boolean).map((img) => img.decode().catch(() => {})));
    if (token !== artToken) return;
    list.forEach((md, i) => {
      const host = tray.querySelector(`.proof-slot[data-m="${md.month}"] .proof-art`);
      if (!host || !imgs[i]) return;
      host.replaceChildren(imgs[i]);
      host.insertAdjacentHTML('beforeend', medalHitSvg(md.data, MEDAL_FILL));
    });
    // 抽屉关着、或者不要动画时直接换；开着时淡入（12 枚一起）
    tray.classList.toggle('is-instant', !open || still());
    tray.classList.add('has-art');
  }
```

`MEDAL_FILL` 由 `proof-set.js` 自己定义并导出，Task 4 的截图用同一个值：

```js
/** 月章截图时，徽章（含 1.06 的余量）占画布的比例。托盘图片、命中区、飞出飞回都按它对齐。 */
export const MEDAL_FILL = 0.94;
```

注意：`still` 是在 `render` 后面才声明的 `const`。`requestArt` 是异步的，真正调到 `still()` 时它早已声明好，不会出错。但为了读起来清楚，把 `const still = ...` 那一行挪到 `render` 前面。

打开抽屉时催一下：在 `toggle()` 的 `if (open) {` 分支第一行加：

```js
      art?.hurry();
```

点开和键盘打开：在“悬停珠子”那段监听前面加：

```js
  // 点开一枚月章：交给 onOpen（单枚查看）。托盘横向滑动时的点击不受影响：滑动不会触发 click
  function openSlot(slot, viaKeyboard) {
    const medal = medals.find((md) => md.month === Number(slot.dataset.m));
    if (!onOpen || !medal) return;
    heatmap.hideTip();
    onOpen({ slot, medal, viaKeyboard, art: tray.classList.contains('has-art') });
  }
  tray.addEventListener('click', (e) => {
    const slot = e.target.closest('.proof-slot[data-m]');
    if (slot) openSlot(slot, e.detail === 0);
  });
  tray.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const slot = e.target.closest?.('.proof-slot[data-m]');
    if (!slot) return;
    e.preventDefault(); // 空格不滚动页面
    openSlot(slot, true);
  });
```

返回值里加一个只读属性，给浏览器检查用：

```js
    get medals() {
      return medals;
    },
```

- [ ] **Step 6: CSS**（追加到 `src/styles/proof-set.css` 末尾）

```css
/* ---------- 3D 月章：叠在 SVG 上，12 枚画好后一起换上 ---------- */

/* SVG 和 3D 图片叠在同一格 */
.proof-slot > .proof-medal,
.proof-slot > .proof-art {
  grid-area: 1 / 1;
}

.proof-art {
  width: 96%;
  aspect-ratio: 1;
  position: relative;
  visibility: hidden;
  opacity: 0;
  filter: drop-shadow(0 4px 5px rgba(0, 0, 0, 0.55));
}

.proof-art img,
.proof-art .proof-hit {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.proof-tray.has-art .proof-art {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.proof-tray.has-art .proof-medal {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.proof-tray.has-art.is-instant .proof-art,
.proof-tray.has-art.is-instant .proof-medal {
  transition: none;
}

/* 透明命中区：悬停时描一圈，和 SVG 珠子的悬停一样 */
.proof-hit circle {
  fill: transparent;
}

.proof-hit circle:hover {
  stroke: rgba(243, 234, 214, 0.85);
  stroke-width: 0.014;
}

/* 能点开的月章 */
.proof-slot[role='button'] {
  cursor: pointer;
}

.proof-slot[role='button']:focus {
  outline: none;
}

.proof-slot[role='button']:focus-visible {
  outline: 2px solid var(--plate-ring);
  outline-offset: 3px;
}

/* 点开前在原位抬起一下 */
.proof-slot.is-lifting .proof-art {
  transform: translateY(-4px) scale(1.04);
  transition: transform 0.19s cubic-bezier(0.2, 0.7, 0.2, 1);
}

/* 飞出去以后托盘里留一个空凹槽 */
.proof-slot.is-out .proof-art,
.proof-slot.is-out .proof-medal {
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .proof-tray.has-art .proof-art,
  .proof-tray.has-art .proof-medal {
    transition: none;
  }
}
```

落定动画 `.proof.is-revealing .proof-medal` 原来只作用在 SVG 上，3D 图片也要跟着落定。在原规则的选择器里加上 `.proof.is-revealing .proof-art`。`responsive.css` 第 78 行那条也一样加上。

- [ ] **Step 7: 全量测试 + 浏览器检查**（这时还没接 `art` 和 `onOpen`，页面行为应该和原来一样）

Run: `npm test && npm run check:browser`
Expected: 全部 PASS，浏览器检查 70/70。如果开发服务器没开，先 `npx vite --port 5199 &`。

- [ ] **Step 8: 提交**

```bash
git add src/viewer/proof-set.js src/styles/proof-set.css src/styles/responsive.css tests/proof-set.test.js
git commit -m "feat: proof set tray can show 3D medal art with a hover hit layer; minted slots become buttons"
```

---

### Task 4: 截图和打开：`app/medals.js`，接到页面上

**Files:**
- Create: `src/app/medals.js`
- Modify: `src/app/overview.js`（把 `art` 和 `onOpen` 传给 `createProofSet`）
- Modify: `src/main.js`（建 `medals`；把 `thumbsDone` 挪到 `overview.mount` 前面）
- Test: `tests/medals-item.test.js`（新建）

**Interfaces:**
- Consumes：
  - Task 2 的 `medalPalette`、`monthMedalConfig`、`gemKey`；
  - Task 3 的 `artKey`、`MEDAL_FILL`、`CASE`，以及 `createProofSet` 的 `art` / `onOpen`；
  - 现有的 `createBadgeRenderer(stage)`、`mountBadge`、`disposeBadge`、`forEachFrame`、`idle`。
- Produces：
  - `createMedals(ctx, { series, start: Promise<void>, pause: () => Promise<void> })`，返回 `{ request, hurry, open }`。`request` 和 `hurry` 正好就是 `createProofSet` 要的 `art`，`open` 就是 `onOpen`。
  - `medalInfo(medal, tier, series, palette)`：纯函数，返回单枚查看信息区的数据：
    `{ year, month, tier, tokens, active, unlocks, legend: { name, color }[], both: [string, string] | null }`。
  - 月章 item 的字段，Task 5 要用：
    `{ kind: 'medal', config, state, award: false, badge, pivot, holder, tile, info, fill, away(on: boolean), home(): DOMRect | null, dispose() }`。
  - 打开事件：`ctx.emit('open', item, { viaKeyboard, from })`。`from` 是 `DOMRect` 或 `null`。

- [ ] **Step 1: 写失败的测试** `tests/medals-item.test.js`（只测纯函数 `medalInfo`）

```js
import { describe, expect, it } from 'vitest';
import { medalInfo } from '../src/app/medals.js';
import { gemKey, medalPalette } from '../src/viewer/month-medal.js';

const series = [
  { id: 'claude-code', name: 'Claude Code', color: '#D97757' },
  { id: 'codex', name: 'Codex', color: '#7A9DFF' },
];
const palette = medalPalette(series);
const data = { year: 2026, month: 3, tokens: 1.1e9, active: 25, unlocks: 6, tools: [0, 1], days: [] };

describe('单枚查看里的月章信息', () => {
  it('数字和图例；两个工具时有左右各半的色块', () => {
    expect(medalInfo(data, 2, series, palette)).toEqual({
      year: 2026,
      month: 3,
      tier: 2,
      tokens: 1.1e9,
      active: 25,
      unlocks: 6,
      legend: [
        { name: 'Claude Code', color: palette[gemKey(0, 4)] },
        { name: 'Codex', color: palette[gemKey(1, 4)] },
      ],
      both: [palette[gemKey(0, 4)], palette[gemKey(1, 4)]],
    });
  });

  it('只用了一个工具：图例只有它，没有半色块', () => {
    const info = medalInfo({ ...data, tools: [1] }, 0, series, palette);
    expect(info.legend).toEqual([{ name: 'Codex', color: palette[gemKey(1, 4)] }]);
    expect(info.both).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

Run: `npx vitest run tests/medals-item.test.js`
Expected: FAIL（找不到 `medals.js`）

- [ ] **Step 3: 实现** `src/app/medals.js`

```js
import { disposeBadge } from '../engine/badge.js';
import { createBadgeRenderer } from '../viewer/badge-renderer.js';
import { mountBadge } from '../viewer/mount-badge.js';
import { forEachFrame } from '../viewer/frame.js';
import { CASE, MEDAL_FILL } from '../viewer/proof-set.js';
import { gemKey, medalPalette, monthMedalConfig } from '../viewer/month-medal.js';

// 年度铸币套装的月章：画托盘里的 3D 图片，点开时组装一枚交给单枚查看。
// 截图借陈列墙缩略图的那个舞台（整页仍只有一个 WebGL 上下文），一帧画一枚，单枚查看打开时暂停。
// 什么时候开始画：陈列墙缩略图画完、浏览器空闲后（start），或者用户先拉开了抽屉（hurry）。
// 结果按「年份 | 工具」缓存在内存里；画不出来（拿不到 WebGL 等）就返回 null，托盘一直用 SVG。

const STATE = { unlocked: true, earnedAt: null, tier: null, progress: { current: 1, target: 1 } };
const LIFT_MS = 190; // 托盘里原位抬起的时长，和 CSS 的 .is-lifting 一致

/** 单枚查看信息区的数据：图例只列当月用过的工具，用宝石色（和珠子一致）。 */
export function medalInfo(data, tier, series, palette) {
  const color = (i) => palette[gemKey(i, 4)];
  const legend = data.tools.map((i) => ({ name: series[i].name, color: color(i) }));
  return {
    year: data.year,
    month: data.month,
    tier,
    tokens: data.tokens,
    active: data.active,
    unlocks: data.unlocks,
    legend,
    both: data.tools.length > 1 ? [color(data.tools[0]), color(data.tools[1])] : null,
  };
}

/**
 * @param {object} ctx
 * @param {{ series: { id: string, name: string, color: string }[], start: Promise<void>, pause: () => Promise<void> }} opts
 */
export function createMedals(ctx, { series, start, pause }) {
  const brand = { ...ctx.brand, palette: { ...ctx.brand.palette, ...medalPalette(series) } };
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cache = new Map();
  let renderer = null;
  let hurry;
  const gate = Promise.race([start, new Promise((resolve) => (hurry = resolve))]);

  const mount = (data, tier) => {
    const config = monthMedalConfig(data, { tier });
    return { config, ...mountBadge(config, brand, STATE, { stage: ctx.stage, lang: ctx.lang, engraving: 0 }) };
  };

  /** 12 枚（或更少）月章的图片地址，顺序和 medals 一样。 */
  function request(key, medals) {
    if (!cache.has(key)) {
      const job = gate
        .then(async () => {
          renderer ??= createBadgeRenderer(ctx.stage);
          const size = Math.round(CASE.coinMax * Math.min(2, window.devicePixelRatio || 1));
          const urls = [];
          await forEachFrame(
            medals,
            (md) => {
              const shot = mount(md.data, md.tier);
              try {
                urls.push(renderer.snapshot(shot, { size, fill: MEDAL_FILL }));
              } finally {
                disposeBadge(shot.badge);
              }
            },
            { pause },
          );
          return urls;
        })
        .catch((err) => {
          console.warn('月章 3D 图片画不出来，继续用 SVG', err);
          cache.delete(key); // 下次切回来再试
          return null;
        });
      cache.set(key, job);
    }
    return cache.get(key);
  }

  /** 点开一枚：组装好交给单枚查看；托盘显示的是 3D 图片时先原位抬起，再从这个位置飞出去。 */
  async function open({ slot, medal, viaKeyboard, art }) {
    const fly = art && !reduced();
    if (fly) {
      slot.classList.add('is-lifting');
      await new Promise((r) => setTimeout(r, LIFT_MS));
    }
    const img = slot.querySelector('.proof-art img');
    const from = fly && img ? img.getBoundingClientRect() : null;
    slot.classList.remove('is-lifting');
    const item = {
      kind: 'medal',
      ...mount(medal.data, medal.tier),
      state: STATE,
      award: false,
      tile: slot,
      fill: MEDAL_FILL,
      info: medalInfo(medal.data, medal.tier, series, brand.palette),
      /** 飞出去时托盘里留空凹槽，落回来再显示 */
      away: (on) => slot.classList.toggle('is-out', on),
      /** 飞回的落点：托盘里那张图片的位置；看不到（滑出了托盘、礼盒关上、不在屏幕里）就不飞回 */
      home() {
        const pic = slot.querySelector('.proof-art img');
        if (!fly || !pic || !slot.isConnected) return null;
        const r = pic.getBoundingClientRect();
        const tray = slot.closest('.proof-tray')?.getBoundingClientRect();
        const inTray = tray && r.left >= tray.left - 1 && r.right <= tray.right + 1;
        const onScreen = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
        return inTray && onScreen ? r : null;
      },
      dispose() {
        disposeBadge(item.badge);
      },
    };
    ctx.emit('open', item, { viaKeyboard, from });
  }

  return { request, hurry: () => hurry(), open };
}
```

注意：
- `mount` 返回的对象里有 `holder`，所以 `ctx.ensureBuilt(item)` 会直接跳过，不会用默认色板重新组装。
- 槽位上的 `is-out` 由 Task 5 的单枚查看通过 `item.away` 来切换。

- [ ] **Step 4: 跑测试，确认通过**

Run: `npx vitest run tests/medals-item.test.js`
Expected: PASS

- [ ] **Step 5: 接到页面上**

`src/app/overview.js`：
- `mount(ctx, { heatSeries, markers, currentDaily })` 的第二个参数里多解构一个 `medals`；
- 建铸币套装那一行改成：

```js
  const proofSet = createProofSet({ heatmap, palette: ctx.brand.palette, reducedMotion, art: medals ?? null, onOpen: medals?.open ?? null });
```

`src/main.js`：
- 在文件顶部的 import 里加：

```js
import { createMedals } from './app/medals.js';
import { idle } from './viewer/frame.js';
```

- 把 `let startThumbs; const thumbsDone = new Promise(...)` 这几行整段挪到 `overview.mount` 那一行前面，然后建 `medals`，传给 `overview.mount`：

```js
  // 海报要等缩略图：先建好这个承诺交给海报，真正开始渲染放在所有面板挂好之后
  let startThumbs;
  const thumbsDone = new Promise((resolve, reject) => {
    startThumbs = (deps) => renderThumbnails(ctx, deps).then(resolve, reject);
  });
  // 月章的 3D 图片：缩略图画完、浏览器空闲时再画（拉开抽屉会提前）；单枚查看打开时暂停
  let inspectPanel = null;
  const medals = createMedals(ctx, {
    series: data.heatSeries,
    start: thumbsDone.then(() => idle()),
    pause: () => inspectPanel?.whenClosed() ?? Promise.resolve(),
  });
  const { profile, heatmap, coinItem } = overview.mount(ctx, { ...data, medals });
```

- 后面 `const inspectPanel = inspect.mount(...)` 改成赋值：`inspectPanel = inspect.mount(ctx, { inspector, exportPanel: exporter, loop });`。

- [ ] **Step 6: 手动确认托盘换图**（这时点开月章会走现有的单枚查看，还没有飞出飞回和专用信息区，这是预期的）

```bash
npx vite --port 5199 &   # 已经开着就跳过
cat > /tmp/medal-art-smoke.mjs <<'EOF'
import { launchChrome } from '/Users/lucas/Documents/Code/agent-badges/scripts/browser.mjs';
const b = await launchChrome();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto('http://localhost:5199/?source=mock&lang=zh');
await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
await page.locator('.proof-pull').click();
await page.waitForFunction(() => document.querySelector('.proof-tray')?.classList.contains('has-art'), null, { timeout: 60000 });
const n = await page.evaluate(() => document.querySelectorAll('.proof-art img').length);
console.log('3D 图片', n, '· 报错', errs.length ? errs : '无');
await page.screenshot({ path: '/tmp/medal-art-smoke.png' });
await b.close();
EOF
node /tmp/medal-art-smoke.mjs
```

Expected: `3D 图片` 等于铸好的月份数（示例数据下大于 0），`报错 无`。打开截图看一眼，托盘里应该是 3D 月章。

- [ ] **Step 7: 全量测试 + 浏览器检查**

Run: `npm test && npm run check:browser`
Expected: 全部 PASS

- [ ] **Step 8: 提交**

```bash
git add src/app/medals.js src/app/overview.js src/main.js tests/medals-item.test.js
git commit -m "feat: render month medals as 3D art on the shared stage, cached per year and tools"
```

---

### Task 5: 单枚查看：从托盘飞出、飞回，月章专用信息区

**Files:**
- Modify: `src/viewer/inspector.js`（导出纯函数 `rectToWorld`）
- Modify: `src/app/inspect.js`
- Modify: `index.html`（信息区加两个容器）
- Modify: `src/viewer/i18n.js`（中英文文案）
- Modify: `src/styles/inspector.css`
- Test: `tests/medal-fly.test.js`（新建）

**Interfaces:**
- Consumes：Task 4 的月章 item 字段，以及 `open(item, { viaKeyboard, from })`。
- Produces：`rectToWorld(view, rect, fill): { x, y, scale }`。屏幕矩形换算成舞台坐标：holder 放在 `(x, y, 0)`、缩放 `scale` 时，徽章正好盖住这个矩形。

- [ ] **Step 1: 写失败的测试** `tests/medal-fly.test.js`

```js
import { describe, expect, it } from 'vitest';
import { computeFocusLayout, rectToWorld } from '../src/viewer/inspector.js';

// 舞台 1000 × 800 像素，半高 4 个单位 → 每单位 100 像素
const view = { width: 1000, height: 800, halfH: 4, halfW: 5, aspect: 1.25 };

describe('屏幕矩形换算成舞台坐标', () => {
  it('画面正中的矩形落在原点', () => {
    const r = rectToWorld(view, { left: 440, top: 340, width: 120, height: 120 }, 0.94);
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.y).toBeCloseTo(0, 6);
  });

  it('x 向右、y 向上；徽章半径 = 图片边长 × fill / 2 / 1.06', () => {
    const r = rectToWorld(view, { left: 0, top: 0, width: 120, height: 120 }, 0.94);
    expect(r.x).toBeCloseTo((60 - 500) / 100, 6);
    expect(r.y).toBeCloseTo((400 - 60) / 100, 6);
    expect(r.scale).toBeCloseTo((120 * 0.94) / 2 / 1.06 / 100, 6);
  });

  it('和单枚查看的布局同一套比例：布局的 scale 换回像素就是布局的直径', () => {
    const layout = computeFocusLayout(view, { top: 80, bottom: 200 });
    const px = layout.scale * 1.06 * 2 * 100; // 含余量的直径（像素）
    const back = rectToWorld(view, { left: 500 - px / 2, top: 400 - layout.y * 100 - px / 2, width: px, height: px }, 1);
    expect(back.scale).toBeCloseTo(layout.scale, 6);
    expect(back.y).toBeCloseTo(layout.y, 6);
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

Run: `npx vitest run tests/medal-fly.test.js`
Expected: FAIL（`rectToWorld` 不是函数）

- [ ] **Step 3: 在 `src/viewer/inspector.js` 的 `computeFocusLayout` 后面加 `rectToWorld`**

```js
/**
 * 屏幕上的一个矩形（比如托盘里月章的图片）换算成舞台坐标：holder 摆在 (x, y, 0)、缩放 scale 时，
 * 徽章正好盖住这个矩形。fill 是那张图片截图时的 fill（徽章含 1.06 余量的直径占边长的比例）。
 * 舞台画布铺满窗口，矩形用视口坐标。
 */
export function rectToWorld(view, rect, fill) {
  const ppu = view.height / 2 / view.halfH;
  return {
    x: (rect.left + rect.width / 2 - view.width / 2) / ppu,
    y: (view.height / 2 - (rect.top + rect.height / 2)) / ppu,
    scale: (rect.width * fill) / 2 / 1.06 / ppu,
  };
}
```

Run: `npx vitest run tests/medal-fly.test.js`
Expected: PASS

- [ ] **Step 4: 文案**（`src/viewer/i18n.js`；`zh` 里加在 `'inspect.variant'` 后面，`en` 里同样位置）

zh：

```js
    'inspect.hintMedal': '左右拖动旋转 · 翻到背面看月桂和月份',
    'medal.tokens': 'Token',
    'medal.days': '活跃天数',
    'medal.daysValue': '{n} 天',
    'medal.unlocks': '解锁徽章',
    'medal.unlocksValue': '{n} 枚',
    'medal.metal': '{year} · {metal}',
```

en：

```js
    'inspect.hintMedal': 'Drag to rotate · flip it over for the laurel and the month',
    'medal.tokens': 'Tokens',
    'medal.days': 'Active days',
    'medal.daysValue': '{n}',
    'medal.unlocks': 'Badges unlocked',
    'medal.unlocksValue': '{n}',
    'medal.metal': '{year} · {metal}',
```

“同一天都用”和“解锁徽章”的图例直接用已有的 `heat.both`、`heat.unlock`；金属名用已有的 `completionist.<metal>`；月份名用已有的 `proof.months`。如果有测试要求中英文的键一一对应，两边都要加齐。

- [ ] **Step 5: 信息区的两个容器**（`index.html`，`<p class="desc" data-desc></p>` 后面加）

```html
        <dl class="medal-facts" data-medal-facts hidden></dl>
        <div class="medal-legend" data-medal-legend hidden></div>
```

- [ ] **Step 6: `src/app/inspect.js`：信息区**

import 里补上：

```js
import { STAGE_METALS } from '../brands/shared/completionist.js';
import { lerp, ease } from '../viewer/anim.js';
import { rectToWorld } from '../viewer/inspector.js';
import { splitBackground } from '../viewer/heatmap.js';
```

（`COMPLETIONIST_ID` 已经从 `completionist.js` 引了，把 `STAGE_METALS` 并进同一行。）

`fillInfo(item)` 开头加月章分支；普通徽章的路径要把月章的两个容器藏起来、把说明露出来：

```js
  const MONTHS_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  /** 月章：年份 · 金属，月份，三行数字和图例；没有等级阶梯、进度条和获得动画。 */
  function fillMedalInfo({ info }) {
    const kicker = $('[data-kicker]');
    kicker.textContent = t('medal.metal', { year: info.year, metal: t(`completionist.${STAGE_METALS[info.tier]}`) });
    kicker.style.color = '';
    $('[data-title]').textContent = t('proof.months')[info.month];
    const subtitle = $('[data-title-en]');
    subtitle.hidden = lang !== 'zh';
    subtitle.textContent = `${MONTHS_EN[info.month]} ${info.year}`;
    $('[data-desc]').hidden = true;
    $('[data-tiers]').hidden = true;
    $('[data-meter]').hidden = true;
    $('[data-replay]').hidden = true;
    $('[data-hint]').textContent = t('inspect.hintMedal');
    const facts = $('[data-medal-facts]');
    facts.hidden = false;
    facts.innerHTML = '';
    for (const [k, v] of [
      [t('medal.tokens'), formatCount(info.tokens)],
      [t('medal.days'), t('medal.daysValue', { n: info.active })],
      [t('medal.unlocks'), t('medal.unlocksValue', { n: info.unlocks })],
    ]) {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      row.append(dt, dd);
      facts.append(row);
    }
    const legend = $('[data-medal-legend]');
    legend.hidden = false;
    legend.innerHTML = '';
    const swatch = (background, text, cls = '') => {
      const span = document.createElement('span');
      const i = document.createElement('i');
      if (cls) i.className = cls;
      if (background) i.style.background = background;
      span.append(i, text);
      legend.append(span);
    };
    for (const s of info.legend) swatch(s.color, s.name);
    if (info.both) swatch(splitBackground(info.both[0], info.both[1]), t('heat.both'));
    swatch(null, t('heat.unlock'), 'is-ring');
  }
```

`fillInfo` 的第一行加：

```js
    const medal = item.kind === 'medal';
    $('[data-medal-facts]').hidden = !medal;
    $('[data-medal-legend]').hidden = !medal;
    $('[data-desc]').hidden = medal;
    if (medal) return fillMedalInfo(item);
```

- [ ] **Step 7: `src/app/inspect.js`：飞出、飞回、收尾**

在 `mount` 里加一个收尾函数，并把原来两处“移出场景 + 释放刻字”换成它：
- 一处在 `open()` 里，`closing && closing !== item` 的那个分支；
- 一处在 `open()` 里，`inspector.current && inspector.current !== item` 的那个分支。

`closeTimer` 回调里的那一处也换。

```js
  /** 一枚徽章离开单枚查看：移出场景、释放刻字；月章还要让托盘里的那一格露出来，并释放它自己的显卡资源。 */
  function release(item) {
    stage.scene.remove(item.holder);
    setEngravingSize(item.badge, 0);
    item.away?.(false);
    item.dispose?.();
  }
```

月章用完就释放：`item.dispose` 只有月章有，陈列墙的徽章行为不变。注意 `dispose` 之后这个 item 不能再打开。月章每次点开都会组装一个新的 item，所以没有问题。

`open(item, { award = true, viaKeyboard = false, from = null } = {})`：
- 开头 `clearTimeout(closeTimer);` 后面加 `tweens.cancel('home');`。
- 摆位置那几行换成下面这样：

```js
    item.pivot.rotation.set(0, 0, 0);
    const { layout } = inspector;
    // 月章从托盘里的原位置起飞；其他徽章照旧从中央、略小的位置放大
    const start = from ? rectToWorld(stage.view, from, item.fill) : null;
    if (start) {
      item.holder.position.set(start.x, start.y, 0);
      item.holder.scale.setScalar(start.scale);
    } else {
      item.holder.position.set(layout.x, layout.y, 0);
      item.holder.scale.setScalar(layout.scale * 0.6);
    }
    // 从原位置起飞时，画布不跟着遮罩淡入，只有背景淡入：月章一直看得见
    overlay.classList.toggle('is-tile', Boolean(start));
    item.away?.(true);
    stage.scene.add(item.holder);
```

- `history.replaceState(null, '', `#${item.config.id}`);` 改成只在不是月章时写：

```js
    if (item.kind !== 'medal') history.replaceState(null, '', `#${item.config.id}`);
```

`close()`：
- 在 `document.body.classList.remove('is-inspecting');` 之后算落点。要在这之后算，因为滚动条回来以后页面会横向挪一点。
- 能飞回就补间，不能就照旧淡出。
- 定时器里改用 `release`。

```js
  function close() {
    if (mode !== 'inspect') return;
    tweens.cancel('award');
    awardRunning = false;
    stage.sweep.intensity = 0;
    const item = inspector.current;
    inspector.close();
    mode = 'wall';
    overlay.classList.remove('is-open');
    inspectorEl.classList.remove('is-open');
    exportPanel.set(false, { keepTextFaded: true }); // 文字跟着信息区淡出，关完再复原
    document.body.classList.remove('is-inspecting');
    history.replaceState(null, '', location.pathname + location.search);
    // 月章：托盘里那一格看得见就飞回去（背景同时淡出），看不见就和其他徽章一样整体淡出
    const home = item?.home?.();
    if (home) flyHome(item, rectToWorld(stage.view, home, item.fill));
    else overlay.classList.remove('is-tile');
    closing = item;
    closeTimer = setTimeout(() => {
      closing = null;
      overlay.hidden = true;
      overlay.classList.remove('is-tile');
      exportPanel.set(false); // 遮罩已藏起来，这时复原说明文字不会被看到
      if (item) release(item);
      loop.stop();
      ctx.emit('inspecting', false);
      onClosed.forEach((resolve) => resolve());
      onClosed = [];
    }, 320);
    item?.tile.focus({ preventScroll: true });
  }

  /** 飞回托盘：翻回正面、回正，落到原位置。0.3 秒，在 320 毫秒的收尾之前落定。 */
  function flyHome(item, to) {
    const h = item.holder;
    const p = item.pivot;
    const from = { x: h.position.x, y: h.position.y, z: h.position.z, s: h.scale.x, ry: p.rotation.y, rx: p.rotation.x };
    tweens.add({
      key: 'home',
      duration: 0.3,
      easing: ease.inOutCubic,
      update: (t) => {
        h.position.set(lerp(from.x, to.x, t), lerp(from.y, to.y, t), lerp(from.z, 0, t));
        h.scale.setScalar(lerp(from.s, to.scale, t));
        p.rotation.y = lerp(from.ry, 0, t);
        p.rotation.x = lerp(from.rx, 0, t);
      },
    });
  }
```

说明：
- `inspector.close()` 已经把 `pivot.rotation.y` 归到 (−π, π]，补间回到 0 不会多转好几圈。
- 渲染循环要到 320 毫秒的定时器里才停，这段时间里补间照常推进、照常画。
- `ease.inOutCubic` 和 `lerp` 都在 `src/viewer/anim.js` 里（控制者已核对）。

- [ ] **Step 8: CSS**（追加到 `src/styles/inspector.css`）

```css
/* ---------- 月章：从托盘飞出、飞回时，画布不跟着遮罩淡入淡出，只有背景淡 ---------- */

.overlay.is-tile {
  opacity: 1;
  transition: none;
  background: none;
}

.overlay.is-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 70% at 50% 42%, var(--bg-lift) 0%, var(--bg) 70%);
  background-color: var(--bg);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.overlay.is-tile.is-open::before {
  opacity: 1;
}

/* ---------- 月章的数字和图例 ---------- */

.medal-facts {
  margin: 14px 0 0;
  max-width: 360px;
}

.medal-facts div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
}

.medal-facts dt {
  color: var(--dim);
}

.medal-facts dd {
  margin: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.medal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--dim);
}

.medal-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.medal-legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* 金边和热力图的 --plate-ring 同色；那个变量只在热力图里定义，遮罩里用不到，这里直接写色值 */
.medal-legend i.is-ring {
  box-sizing: border-box;
  border: 1.5px solid #d9bf86;
  background: #141f4d;
}
```

`var(--line)`、`var(--dim)`、`var(--bg-lift)` 都在 `src/styles/tokens.css` 里（控制者已核对）。

还要确认 `::before` 盖在画布下面：画布和信息区都是绝对定位、在 DOM 里排在后面，所以会画在 `::before` 上面。如果截图里背景盖住了月章，就给 `::before` 加 `z-index: -1`，并给 `.overlay.is-tile` 加 `isolation: isolate`。

- [ ] **Step 9: 手动看一遍**（浏览器检查在 Task 6 才加，这里先看截图）

```bash
cat > /tmp/medal-fly-smoke.mjs <<'EOF'
import { launchChrome } from '/Users/lucas/Documents/Code/agent-badges/scripts/browser.mjs';
const b = await launchChrome();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto('http://localhost:5199/?source=mock&lang=zh');
await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
await page.locator('.proof-pull').click();
await page.waitForFunction(() => document.querySelector('.proof-tray')?.classList.contains('has-art'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
await page.locator('.proof-slot[data-m="3"]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/medal-fly-1-mid.png' });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/medal-fly-2-open.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
await page.screenshot({ path: '/tmp/medal-fly-3-home.png' });
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/medal-fly-4-landed.png' });
console.log('hash', await page.evaluate(() => location.hash), '· 报错', errs.length ? errs : '无');
await b.close();
EOF
node /tmp/medal-fly-smoke.mjs
```

Expected：
- `hash` 为空，报错为无；
- `-2-open` 里是 4 月月章，信息区是“2026 · 金属名 / 4 月 / APRIL 2026 / 三行数字 / 图例”；
- `-3-home` 里月章正在飞回托盘；
- `-4-landed` 里托盘恢复原样。

每张截图都打开看一眼。

- [ ] **Step 10: 全量测试 + 浏览器检查**

Run: `npm test && npm run check:browser`
Expected: 全部 PASS（陈列墙的打开、关闭检查不受影响）

- [ ] **Step 11: 提交**

```bash
git add src/viewer/inspector.js src/app/inspect.js index.html src/viewer/i18n.js src/styles/inspector.css tests/medal-fly.test.js
git commit -m "feat: month medals fly out of the tray into the inspector and back, with their own facts and legend"
```

---

### Task 6: 浏览器检查、导出图对比、耗时记录

**Files:**
- Modify: `scripts/shoot.mjs`（加月章检查）
- Modify: `AGENTS.md`（`check:browser` 那一行的说明补上“年度铸币套装的 3D 月章和弹出”）

**Interfaces:**
- Consumes：
  - 页面上的类名和属性：`.proof-tray.has-art`、`.proof-art img`、`.proof-hit circle[data-date]`、`.proof-slot[data-m]`、`.is-out`；
  - 信息区：`[data-medal-facts]`、`[data-title]`；
  - `.heat-tip`（悬停浮层，带 `hidden` 属性）。

- [ ] **Step 1: 在 `scripts/shoot.mjs` 里加检查**

位置：铸币套装那三条 `check`（“再点一下原路关上……”）的后面、`await marker.click();` 的前面。

1. **页面一加载就装好观察器。** 抽屉关着时，3D 图片通常在检查走到这里之前就已经换上了，所以观察器不能等到这时再装。在 `scripts/shoot.mjs` 里，挨着已有的 `__ringSeen` 那段 `page.addInitScript`，在主页面第一次 `page.goto` 之前，再注册一段：

```js
  // 月章换成 3D 图片的每一次：记下当时有几张图、是不是都解码好了（要求 12 枚一起换，不逐枚跳）
  await page.addInitScript(() => {
    window.__artSwaps = [];
    new MutationObserver((list) => {
      for (const m of list) {
        const el = m.target;
        if (!el.classList?.contains('proof-tray') || !el.classList.contains('has-art') || (m.oldValue ?? '').includes('has-art')) continue;
        const imgs = [...el.querySelectorAll('.proof-art img')];
        window.__artSwaps.push({ imgs: imgs.length, ready: imgs.every((i) => i.complete && i.naturalWidth > 0), slots: el.querySelectorAll('.proof-slot[data-m]').length });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  });
```

（同一次换图可能记成两条：`is-instant` 和 `has-art` 是分开改的。两条的内容一样，不影响判断。）

2. **然后在上面说的位置加检查：**

```js
  // 年度铸币套装：3D 月章、悬停、点开飞出、Esc 飞回
  await page.locator('.proof-pull').click();
  await waitUntil(page, '月章换成 3D 图片', () => document.querySelector('.proof-tray').classList.contains('has-art'));
  const swaps = await page.evaluate(() => window.__artSwaps);
  check('月章换成 3D 图片：每个铸好的月份一张，换上时全部已经解码（一起换，不逐枚跳）', swaps.length > 0 && swaps.every((w) => w.imgs === w.slots && w.imgs > 0 && w.ready), JSON.stringify(swaps));
  await page.waitForTimeout(900); // 等滑盖和落定动画走完

  const bead = await page.evaluate(() => {
    const c = document.querySelector('.proof-slot[data-m] .proof-hit circle[data-date]');
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, date: c.dataset.date };
  });
  await page.mouse.move(bead.x, bead.y);
  await page.waitForTimeout(200);
  const tipShown = await page.evaluate(() => !document.querySelector('.heat-tip').hidden);
  check('悬停 3D 月章上的珠子，显示当天的详情', tipShown, bead.date);
  await page.mouse.move(5, 5);

  const slotM = await page.evaluate(() => document.querySelector('.proof-slot[data-m]').dataset.m);
  await page.locator(`.proof-slot[data-m="${slotM}"]`).click();
  await waitUntil(page, '月章打开', () => document.body.classList.contains('is-inspecting'));
  await page.waitForTimeout(700);
  const medalOpen = await page.evaluate((m) => ({
    title: document.querySelector('[data-title]').textContent,
    facts: document.querySelectorAll('[data-medal-facts] div').length,
    factsShown: !document.querySelector('[data-medal-facts]').hidden,
    descHidden: document.querySelector('[data-desc]').hidden,
    replayHidden: document.querySelector('[data-replay]').hidden,
    hash: location.hash,
    out: document.querySelector(`.proof-slot[data-m="${m}"]`).classList.contains('is-out'),
  }), slotM);
  check(
    '点开月章：单枚查看显示月份和三行数字，没有说明和重播，地址栏不写 hash，托盘里留空凹槽',
    medalOpen.title === `${Number(slotM) + 1} 月` && medalOpen.facts === 3 && medalOpen.factsShown && medalOpen.descHidden && medalOpen.replayHidden && medalOpen.hash === '' && medalOpen.out,
    JSON.stringify(medalOpen),
  );

  await page.keyboard.press('Escape');
  await waitUntil(page, '月章关上', () => document.querySelector('#overlay').hidden);
  const medalBack = await page.evaluate((m) => {
    const slot = document.querySelector(`.proof-slot[data-m="${m}"]`);
    return { focused: document.activeElement === slot, out: slot.classList.contains('is-out'), tile: document.querySelector('#overlay').classList.contains('is-tile') };
  }, slotM);
  check('Esc 关上：焦点回到那一格，凹槽里的月章回来了', medalBack.focused && !medalBack.out && !medalBack.tile, JSON.stringify(medalBack));

  await page.locator(`.proof-slot[data-m="${slotM}"]`).focus();
  await page.keyboard.press('Enter');
  await waitUntil(page, '键盘打开月章', () => document.body.classList.contains('is-inspecting'));
  check('月章可以用键盘打开', await page.evaluate(() => document.body.classList.contains('is-inspecting')));
  await page.keyboard.press('Escape');
  await waitUntil(page, '键盘打开的月章关上', () => document.querySelector('#overlay').hidden);

  await page.locator('.proof-pull').click(); // 收起礼盒，后面的检查照旧在热力图上
  await waitUntil(page, '礼盒收起', () => !document.querySelector('.proof').classList.contains('is-shown'));
```

`.heat-tip` 靠 `hidden` 属性控制显示（`heatmap.js` 的 `showTip` / `hideTip`，控制者已核对）。数据是 `source=mock`，今天的日期决定哪几个月铸好了，所以这里取第一个铸好的槽位，不写死月份。

- [ ] **Step 2: 跑浏览器检查，真实显卡和软件渲染各一次**

Run: `npm run check:browser && CHROME_GL=software npm run check:browser`
Expected: 两次都全部通过（原来 70 条加上新的 6 条）。软件渲染下截图慢，`waitUntil` 的超时是 180 秒，够用。

- [ ] **Step 3: 导出图逐像素对比**

```bash
node scripts/visual.mjs capture /private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/visual-medals-after
node scripts/visual.mjs compare /private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/visual-medals-before /private/tmp/claude-501/-Users-lucas-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Obsidian-V2/66b4b500-d831-474f-a6a5-8839992fefb1/scratchpad/visual-medals-after
```

Expected: 299 张全部一致，退出码 0。

- [ ] **Step 4: 记下 12 枚截图的耗时**（只记录，不设门槛）

在开发者工具里，或者用一段临时脚本：
- 打开 `http://localhost:5199/?source=mock&lang=zh`，等 `__badgeApp.ready`；
- 记下 `performance.now()`，点拉环，等到 `.proof-tray.has-art`，再记一次 `performance.now()`；
- 两次相减。

结果写进实现报告。软件渲染的数字也记一下。

- [ ] **Step 5: 构建**

Run: `npm run build`
Expected: 成功，没有新的警告

- [ ] **Step 6: 提交**

```bash
git add scripts/shoot.mjs AGENTS.md
git commit -m "test: browser checks for 3D month medals, hover, pop-out and fly-back"
```
