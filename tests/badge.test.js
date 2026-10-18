import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import brand from '../src/brands/claude-code/brand.js';
import badges from '../src/brands/claude-code/badges.js';
import { buildBadge } from '../src/engine/badge.js';

const unlocked = { unlocked: true, earnedAt: '2025-03-02', progress: { current: 1, target: 1 } };
const locked = { unlocked: false, earnedAt: null, progress: { current: 3, target: 5 } };

describe('buildBadge', () => {
  it.each(badges.map((b) => [b.id, b]))('%s 能组装出外圈、正面、背面和全部浮雕', (_, cfg) => {
    const g = buildBadge(cfg, brand, unlocked);
    const names = g.children.map((c) => c.name);
    expect(names.slice(0, 3)).toEqual(['rim', 'face', 'back']);
    expect(g.children).toHaveLength(3 + cfg.relief.length);
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
      g.children.slice(3).forEach((m) => reliefBox.expandByObject(m));
      expect(reliefBox.min.z).toBeGreaterThan(0);
      expect(Math.max(reliefBox.max.x, -reliefBox.min.x, reliefBox.max.y, -reliefBox.min.y)).toBeLessThan(cfg.shape.radius ?? 1);
    }
  });

  it('未解锁时全部换成剪影材质，且没有呼吸动效', () => {
    const g = buildBadge(badges[0], brand, locked);
    expect(g.children.every((m) => m.material.userData.preset === 'locked')).toBe(true);
    expect(g.userData.pulses).toHaveLength(0);
  });

  it('已解锁的初次相遇有一个呼吸发光的光标', () => {
    const g = buildBadge(badges[0], brand, unlocked);
    expect(g.userData.pulses).toHaveLength(1);
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
