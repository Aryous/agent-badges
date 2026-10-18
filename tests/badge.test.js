import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import brand from '../src/brands/claude-code/brand.js';
import badges from '../src/brands/claude-code/badges.js';
import { buildBadge } from '../src/engine/badge.js';
import { resolveTier } from '../src/engine/tiers.js';

const byId = (id) => badges.find((b) => b.id === id);
const STRUCTURE = ['rim', 'face', 'back', 'reeding'];
const reliefOf = (g) => g.children.filter((m) => !STRUCTURE.includes(m.name));

const unlocked = { unlocked: true, earnedAt: '2025-03-02', progress: { current: 1, target: 1 } };
const locked = { unlocked: false, earnedAt: null, progress: { current: 3, target: 5 } };

describe('buildBadge', () => {
  it.each(badges.map((b) => [b.id, b]))('%s 能组装出外圈、正面、背面和全部浮雕', (_, cfg) => {
    const g = buildBadge(cfg, brand, unlocked);
    const names = g.children.map((c) => c.name);
    expect(names.filter((n) => ['rim', 'face', 'back'].includes(n))).toEqual(['rim', 'face', 'back']);
    expect(reliefOf(g)).toHaveLength(resolveTier(cfg, 0).relief.length);
    for (const m of g.children) expect(m.geometry.attributes.position.count).toBeGreaterThan(0);
  });

  it.each(badges.map((b) => [b.id, b]))('%s 厚度与配置一致且以 z=0 为中心', (_, cfg) => {
    const g = buildBadge(cfg, brand, unlocked);
    const rim = g.children[0];
    rim.geometry.computeBoundingBox();
    const box = rim.geometry.boundingBox;
    expect(box.max.z).toBeCloseTo(cfg.shape.depth / 2, 5);
    expect(box.min.z).toBeCloseTo(-cfg.shape.depth / 2, 5);
  });

  it('浮雕全部落在正面之上、轮廓之内', () => {
    for (const cfg of badges) {
      const g = buildBadge(cfg, brand, unlocked);
      const reliefBox = new Box3();
      reliefOf(g).forEach((m) => reliefBox.expandByObject(m));
      expect(reliefBox.min.z).toBeGreaterThan(0);
      expect(Math.max(reliefBox.max.x, -reliefBox.min.x, reliefBox.max.y, -reliefBox.min.y)).toBeLessThan(cfg.shape.radius ?? 1);
    }
  });

  it('未解锁时全部换成剪影材质，且没有呼吸动效', () => {
    const g = buildBadge(byId('first-session'), brand, locked);
    expect(g.children.every((m) => m.material.userData.preset === 'locked')).toBe(true);
    expect(g.userData.pulses).toHaveLength(0);
  });

  it('首批三枚（圆形奖章结构）都有上下两段文字环', () => {
    for (const cfg of ['first-session', 'seven-day-streak', 'subagent-commander'].map(byId)) {
      const arcs = cfg.relief.filter((r) => r.kind === 'text-arc').map((r) => r.arc);
      expect(arcs.sort()).toEqual(['bottom', 'top']);
    }
  });
});

describe('扩展性：换品牌不改徽章配置', () => {
  it('只换色板，3 枚徽章自动换色且都能通过校验和组装', async () => {
    const { validateBadge } = await import('../src/engine/validate.js');
    const fakeBrand = {
      ...brand,
      id: 'fake-agent',
      name: 'Fake Agent',
      palette: { ...brand.palette, primary: '#10A37F', gold: '#B8C4CC' },
    };
    for (const cfg of badges) {
      expect(validateBadge(cfg, fakeBrand)).toBe(true);
      const a = buildBadge(cfg, brand, unlocked);
      const b = buildBadge(cfg, fakeBrand, unlocked);
      const colorsA = a.children.map((m) => m.material.color.getHexString());
      const colorsB = b.children.map((m) => m.material.color.getHexString());
      expect(colorsB).not.toEqual(colorsA);
    }
  });
});
