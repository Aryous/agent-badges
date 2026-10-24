import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { validateBadge } from '../src/engine/validate.js';
import { buildBadge, disposeBadge } from '../src/engine/badge.js';
import { svgShapes } from '../src/engine/svgpath.js';
import { CODEX_MARK } from '../src/brands/codex/mark.js';
import { CODEX_GRID } from '../src/brands/codex/completionist.js';
import { STAGE_METALS, completionistConfig, isComplete, stageOf } from '../src/brands/shared/completionist.js';

// 全解锁徽章：不进陈列墙，配置按解锁数生成。

const kits = BRANDS.map(({ brand, badges, completionist }) => ({ brand, kit: completionist, n: badges.length }));
const ghostCount = (relief) => relief.filter((r) => r.color === 'ghost').length;
const arcs = (relief, where) => relief.filter((r) => r.kind === 'text-arc' && r.arc === where).map((r) => r.text);

describe('阶段划分', () => {
  it('STAGE_METALS 依次是锡、铜、银、金', () => {
    expect(STAGE_METALS).toEqual(['pewter', 'bronze', 'silver', 'gold']);
  });

  it('n = 32 的边界', () => {
    expect([7, 8, 16, 24, 32].map((k) => stageOf(k, 32))).toEqual([0, 1, 2, 3, 3]);
    expect(stageOf(0, 32)).toBe(0);
    expect(stageOf(15, 32)).toBe(1);
    expect(stageOf(23, 32)).toBe(2);
  });

  it('n = 30 的边界', () => {
    expect([7, 8, 15, 23].map((k) => stageOf(k, 30))).toEqual([0, 1, 2, 3]);
    expect(stageOf(14, 30)).toBe(1);
    expect(stageOf(22, 30)).toBe(2);
  });

  it('isComplete 只在全部解锁时为真', () => {
    expect(isComplete(32, 32)).toBe(true);
    expect(isComplete(31, 32)).toBe(false);
    expect(isComplete(0, 0)).toBe(false);
  });
});

describe('品牌部件', () => {
  it('每个品牌都有 completionist，且不在徽章列表里', () => {
    for (const { brand, badges, completionist } of BRANDS) {
      expect(completionist?.id, brand.id).toBe(brand.id);
      expect(badges.some((b) => b.id === 'completionist'), brand.id).toBe(false);
    }
  });

  it('Claude Code 马赛克 108 片', () => {
    const cc = kits.find((k) => k.brand.id === 'claude-code');
    expect(cc.kit.tiles()).toHaveLength(108);
  });

  it('Codex 马赛克和格点表一致', () => {
    const cx = kits.find((k) => k.brand.id === 'codex');
    expect(cx.kit.tiles()).toHaveLength(CODEX_GRID.length);
  });

  it('亮片按从下往上、同一行从左往右的顺序', () => {
    for (const { brand, kit } of kits) {
      const c = kit.tiles().map((t) => t.center);
      for (let i = 1; i < c.length; i++) {
        const [x0, y0] = c[i - 1];
        const [x1, y1] = c[i];
        expect(y1 > y0 + 1e-9 || (Math.abs(y1 - y0) < 1e-9 && x1 > x0), `${brand.id} 第 ${i} 片`).toBe(true);
      }
    }
  });
});

describe('Codex 格点表', () => {
  it('和 svgShapes + 奇偶规则重新算的结果一致', () => {
    // 把 viewBox 24 原样映射成 (px − 12, 12 − py)，外轮廓和 >_ 的镂空都参与奇偶计数
    const loops = svgShapes(CODEX_MARK, { viewBox: 24, scale: 12, center: [0, 0] }).flatMap((s) => {
      const { shape, holes } = s.extractPoints(12);
      return [shape, ...holes];
    });
    const inside = (x, y) => {
      let odd = false;
      for (const p of loops) {
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
          const a = p[i];
          const b = p[j];
          if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) odd = !odd;
        }
      }
      return odd;
    };
    const n = 21;
    const step = 24 / n;
    const cells = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) if (inside((i + 0.5) * step - 12, 12 - (j + 0.5) * step)) cells.push([i, j]);
    }
    const key = (c) => c.join(',');
    expect([...CODEX_GRID].map(key).sort()).toEqual(cells.map(key).sort());
  });
});

describe('配置', () => {
  for (const { brand, kit, n } of kits) {
    const T = kit.tiles().length;
    const samples = [0, Math.ceil(n / 4), Math.ceil(n / 2), Math.ceil((3 * n) / 4), n - 1, n];

    it(`${brand.id}：四个阶段和完成形态都通过 validateBadge`, () => {
      for (const k of samples) {
        const { config } = completionistConfig(kit, { unlocked: k, total: n });
        expect(() => validateBadge(config, brand), `${k}/${n}`).not.toThrow();
        expect(config.id).toBe('completionist');
        expect(config.title).toBe('全解锁');
        expect(config.en.title).toBe('Completionist');
        expect(config.back).toEqual({ material: 'enamel', color: 'midnight', engraving: false });
        expect(config.backRelief.length).toBeGreaterThan(0);
      }
      const { config } = completionistConfig(kit, { unlocked: 5, total: n, anim: true, metal: 'stage' });
      expect(() => validateBadge(config, brand)).not.toThrow();
    });

    it(`${brand.id}：正反面都能组装出网格`, () => {
      const state = { unlocked: true, earnedAt: null, progress: { current: 1, target: 1 } };
      for (const [k, opts] of [[9, {}], [n, {}], [n, { anim: true, metal: 'stage' }]]) {
        const { config } = completionistConfig(kit, { unlocked: k, total: n, ...opts });
        const g = buildBadge(config, brand, state);
        const back = g.children.filter((m) => m.userData.side === 'back');
        expect(back).toHaveLength(config.backRelief.length);
        for (const m of g.children) expect(m.geometry.attributes.position.count, `${k}/${n} ${m.name}`).toBeGreaterThan(0);
        disposeBadge(g);
      }
    });

    it(`${brand.id}：静态版亮片数 = round(T × k / n)，其余是残影`, () => {
      for (const k of samples) {
        const { config, parts } = completionistConfig(kit, { unlocked: k, total: n });
        expect(parts).toBeUndefined();
        expect(ghostCount(config.relief), `${k}/${n}`).toBe(T - Math.round((T * k) / n));
        expect(arcs(config.relief, 'bottom')).toEqual([k === n ? 'COMPLETIONIST' : `${k} OF ${n}`]);
        expect(arcs(config.relief, 'top')).toEqual([kit.name]);
      }
    });

    it(`${brand.id}：阶段金属默认按解锁数，完成时换星芒外形`, () => {
      const metalOf = (k) => completionistConfig(kit, { unlocked: k, total: n }).config.layers[0].color;
      expect(samples.map(metalOf)).toEqual(['pewter', 'bronze', 'silver', 'gold', 'gold', 'gold']);
      expect(completionistConfig(kit, { unlocked: n - 1, total: n }).config.shape.type).toBe('circle');
      expect(completionistConfig(kit, { unlocked: n, total: n }).config.shape.type).toBe('starburst');
      const { config } = completionistConfig(kit, { unlocked: 3, total: n, metal: 'stage' });
      expect(config.layers[0].color).toBe('stage');
      expect(config.relief.filter((r) => r.material === 'polished-metal').every((r) => r.color === 'stage')).toBe(true);
    });

    it(`${brand.id}：王冠只在完成形态出现`, () => {
      const crownItems = kit.crown({ material: 'polished-metal', color: 'gold' }).length;
      const metalOnDisc = (k) =>
        completionistConfig(kit, { unlocked: k, total: n }).config.relief.filter((r) => r.material === 'polished-metal' && r.z !== undefined).length;
      expect(metalOnDisc(n) - metalOnDisc(n - 1)).toBe(crownItems);
    });

    it(`${brand.id}：动画版的 parts 下标指向对的条目`, () => {
      const k = Math.ceil(n / 2) + 1;
      const { config, parts } = completionistConfig(kit, { unlocked: k, total: n, anim: true, metal: 'stage' });
      expect(config.shape.type).toBe('circle');
      expect(parts.lit).toHaveLength(T);
      expect(parts.ghost).toHaveLength(T);
      expect(parts.tileCenters).toHaveLength(T);
      expect(parts.counts).toHaveLength(k + 1);
      const tiles = kit.tiles();
      parts.lit.forEach((i, t) => {
        const r = config.relief[i];
        expect(r.color).not.toBe('ghost');
        expect(r.kind).toBe(tiles[t].lit.kind);
        expect(r.center).toEqual([0, 0]);
        expect(parts.tileCenters[t]).toEqual(tiles[t].center);
      });
      parts.ghost.forEach((i, t) => {
        expect(config.relief[i].color).toBe('ghost');
        expect(config.relief[i].center).toEqual(tiles[t].center);
      });
      expect(parts.counts.map((i) => config.relief[i].text)).toEqual(Array.from({ length: k + 1 }, (_, j) => `${j} OF ${n}`));
      expect(ghostCount(config.relief)).toBe(T);
      // 全部解锁的动画版：最后一份文字是 COMPLETIONIST，外形仍是圆
      const full = completionistConfig(kit, { unlocked: n, total: n, anim: true, metal: 'stage' });
      expect(full.config.shape.type).toBe('circle');
      expect(full.config.relief[full.parts.counts.at(-1)].text).toBe('COMPLETIONIST');
    });

    it(`${brand.id}：环带的同心环半径和 spec 一致`, () => {
      for (const field of ['relief', 'backRelief']) {
        const items = completionistConfig(kit, { unlocked: 9, total: n }).config[field];
        const rings = items.filter((r) => r.kind === 'ring');
        const hair = rings.find((r) => r.radius === 0.83);
        expect(hair, field).toMatchObject({ width: 0.012, height: 0.014 });
        expect(hair.bevel).toBeLessThan(hair.width / 2);
        const beads = items.filter((r) => r.kind === 'circle' && r.radius === 0.0085);
        expect(beads).toHaveLength(84);
        for (const b of beads) expect(Math.hypot(...b.center)).toBeCloseTo(0.785, 9);
        for (const t of items.filter((r) => r.kind === 'text-arc')) expect(t).toMatchObject({ radius: 0.69, size: 0.088, tracking: 0.22 });
        expect(items.find((r) => r.kind === 'circle' && r.radius === 0.56 && r.color === 'sand')).toBeTruthy();
        const seps = items.filter((r) => r.center?.[1] === 0 && Math.abs(Math.abs(r.center[0]) - 0.69) < 1e-9);
        expect(seps.map((r) => r.center[0]).sort((a, b) => a - b)).toEqual([-0.69, 0.69]);
      }
    });

    it(`${brand.id}：背面戳记按阶段点亮，完成时第四枚是宝石`, () => {
      const stamps = (k) => {
        const back = completionistConfig(kit, { unlocked: k, total: n }).config.backRelief;
        return back.filter((r) => Math.abs(Math.hypot(...(r.center ?? [0, 0])) - 0.69) < 1e-9 && r.center[1] < -0.6);
      };
      expect(stamps(0).map((r) => r.color)).toEqual(['dimBand', 'dimBand', 'dimBand', 'dimBand']);
      expect(stamps(Math.ceil(n / 2)).map((r) => r.color)).toEqual(['bronze', 'silver', 'dimBand', 'dimBand']);
      const done = stamps(n);
      expect(done.map((r) => r.color)).toEqual(['bronze', 'silver', 'gold', kit.accent.color]);
      expect(done[3].kind).toBe('gem');
      // 从左到右
      expect(done.map((r) => r.center[0])).toEqual([...done.map((r) => r.center[0])].sort((a, b) => a - b));
    });
  }
});
