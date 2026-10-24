import { describe, expect, it, vi } from 'vitest';
import { Box3 } from 'three';
import brand from '../src/brands/claude-code/brand.js';
import badges from '../src/brands/claude-code/index.js';
import { buildBadge, disposeBadge, setEngravingSize } from '../src/engine/badge.js';
import { validateBadge } from '../src/engine/validate.js';

const base = badges.find((b) => b.id === 'first-session');
const unlocked = { unlocked: true, earnedAt: '2025-03-02', progress: { current: 1, target: 1 } };
const locked = { unlocked: false, earnedAt: null, progress: { current: 0, target: 1 } };

// 偏离中心的圆片，用来检查镜像方向
const backRelief = [
  { kind: 'circle', center: [0.3, 0], radius: 0.1, material: 'polished-metal', color: 'gold', height: 0.04 },
  { kind: 'ring', center: [0, 0], radius: 0.5, width: 0.04, material: 'polished-metal', color: 'gold', height: 0.03 },
];
const withBack = { ...base, backRelief };
const backOf = (g) => g.children.filter((m) => m.userData.side === 'back');
const boxOf = (m) => new Box3().setFromObject(m);

describe('背面浮雕', () => {
  it('多出对应数量的网格，都在背面一侧，并且左右镜像', () => {
    const plain = buildBadge(base, brand, unlocked);
    const g = buildBadge(withBack, brand, unlocked);
    expect(g.children.length - plain.children.length).toBe(backRelief.length);
    const meshes = backOf(g);
    expect(meshes).toHaveLength(backRelief.length);
    for (const m of meshes) expect(boxOf(m).max.z).toBeLessThan(0);
    const dot = boxOf(meshes[0]);
    expect((dot.min.x + dot.max.x) / 2).toBeCloseTo(-0.3, 3);
  });

  it('正面浮雕仍是最后几个子节点', () => {
    const g = buildBadge(withBack, brand, unlocked);
    const tail = g.children.slice(g.children.length - base.relief.length);
    expect(tail.every((m) => m.userData.side !== 'back')).toBe(true);
  });

  it('未解锁时背面浮雕也用 locked 材质', () => {
    const g = buildBadge(withBack, brand, locked);
    expect(backOf(g).every((m) => m.material.userData.preset === 'locked')).toBe(true);
  });

  it('disposeBadge 释放背面浮雕的几何体', () => {
    const g = buildBadge(withBack, brand, unlocked);
    let hit = false;
    backOf(g)[0].geometry.addEventListener('dispose', () => (hit = true));
    disposeBadge(g);
    expect(hit).toBe(true);
  });
});

describe('不带刻字的背面板', () => {
  const cfg = { ...base, back: { ...base.back, engraving: false } };

  it('不生成刻字，只用 back 的材质', () => {
    const spy = { ...brand, engraving: { ...brand.engraving, lines: vi.fn(brand.engraving.lines) } };
    const g = buildBadge(cfg, spy, unlocked);
    const back = g.getObjectByName('back');
    expect(spy.engraving.lines).not.toHaveBeenCalled();
    expect(back.userData.engraving).toBeUndefined();
    expect(back.userData.engravingSize).toBeUndefined();
    expect(back.material.map).toBeNull();
    expect(back.material.bumpMap).toBeNull();
    expect(back.material.userData.preset).toBe(cfg.back.material);
    // 不带刻字时也没有刻字用的粗糙度覆盖
    expect(back.material.roughness).not.toBe(0.62);
    expect(back.material.color.getHexString()).toBe(buildBadge(base, brand, unlocked).getObjectByName('back').material.color.getHexString());
  });

  it('setEngravingSize 不做任何事，disposeBadge 正常', () => {
    const g = buildBadge(cfg, brand, unlocked);
    expect(setEngravingSize(g, 1024)).toBe(false);
    expect(setEngravingSize(g, 0)).toBe(false);
    expect(() => disposeBadge(g)).not.toThrow();
  });

  it('不带新字段时背面照旧挂刻字', () => {
    const back = buildBadge(base, brand, unlocked).getObjectByName('back');
    expect(back.userData.engraving).toBeDefined();
    expect(back.userData.engravingSize).toBe(1024);
  });
});

describe('材质记下色板键', () => {
  it('外圈、面层、背面板、浮雕的 colorKey 等于配置里的色板键', () => {
    const g = buildBadge(withBack, brand, unlocked);
    const rimLayer = base.layers.find((l) => l.kind === 'rim');
    const faceLayer = base.layers.find((l) => l.kind === 'face');
    expect(g.getObjectByName('rim').material.userData.colorKey).toBe(rimLayer.color);
    expect(g.getObjectByName('face').material.userData.colorKey).toBe(faceLayer.color);
    expect(g.getObjectByName('back').material.userData.colorKey).toBe(base.back.color);
    for (const m of backOf(g)) expect(m.material.userData.colorKey).toBe('gold');
    const front = g.children.slice(g.children.length - base.relief.length);
    front.forEach((m, i) => {
      if (!base.relief[i].gradient) expect(m.material.userData.colorKey).toBe(base.relief[i].color);
    });
  });

  it('正面和背面同材质同颜色的浮雕共用一份材质', () => {
    const item = base.relief.find((r) => !r.gradient && !r.effect);
    const g = buildBadge({ ...base, backRelief: [{ ...item }] }, brand, unlocked);
    const front = g.children.slice(g.children.length - base.relief.length);
    const twin = front[base.relief.indexOf(item)];
    expect(backOf(g)[0].material).toBe(twin.material);
  });
});

describe('校验背面浮雕', () => {
  it('合法的 backRelief 能通过', () => {
    expect(validateBadge(withBack, brand)).toBe(true);
  });

  it('报出未注册的颜色、材质和类型', () => {
    const bad = (patch) => ({ ...base, backRelief: [{ ...backRelief[0], ...patch }] });
    expect(() => validateBadge(bad({ color: 'nope' }), brand)).toThrow(/backRelief\[0\].*nope/);
    expect(() => validateBadge(bad({ material: 'nope' }), brand)).toThrow(/backRelief\[0\].*nope/);
    expect(() => validateBadge(bad({ kind: 'nope' }), brand)).toThrow(/backRelief\[0\].*nope/);
    expect(() => validateBadge(bad({ pattern: 'nope' }), brand)).toThrow(/backRelief\[0\].*nope/);
  });

  it('back.engraving 只能是 false 或不写', () => {
    expect(validateBadge({ ...base, back: { ...base.back, engraving: false } }, brand)).toBe(true);
    expect(() => validateBadge({ ...base, back: { ...base.back, engraving: true } }, brand)).toThrow(/engraving/);
  });
});
