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
