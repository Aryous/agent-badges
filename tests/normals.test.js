import { describe, expect, it } from 'vitest';
import { CircleGeometry, ExtrudeGeometry } from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { creasedNormals, smoothBevels } from '../src/engine/normals.js';
import { arcTextGeometry, textGeometry } from '../src/engine/text.js';
import { reliefShapes } from '../src/engine/relief.js';
import { makeOutline, withHole } from '../src/engine/shapes.js';

// creasedNormals 是 three 的 toCreasedNormals 的快速版本，结果必须一样，徽章的光影才不会变
const extrude = (shapes, bevel, bevelSegments, curveSegments) =>
  new ExtrudeGeometry(shapes, { depth: 0.02, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8, bevelSegments, curveSegments });

const CASES = [
  ['沿圆弧的立体文字', () => arcTextGeometry({ text: 'AGENT BADGES', radius: 0.7, size: 0.12, height: 0.03 }), Math.PI / 5],
  ['水平文字', () => textGeometry({ text: '128K', size: 0.3, height: 0.05 }), Math.PI / 5],
  ['像素图', () => extrude(reliefShapes({ kind: 'pixels', rows: ['.##.', '####', '#..#'], cell: 0.06 }), 0.014, 4, 30), Math.PI / 6],
  ['细圆环', () => extrude(reliefShapes({ kind: 'ring', radius: 0.62, width: 0.012 }), 0.004, 4, 30), Math.PI / 6],
  ['波浪外圈', () => extrude(withHole(makeOutline({ type: 'flower', petals: 14 }, 0), makeOutline({ type: 'flower', petals: 14 }, 0.1), 96), 0.04, 6, 96), Math.PI / 6],
];

describe('creasedNormals', () => {
  for (const [name, make, angle] of CASES) {
    it(`${name}：和 three 的 toCreasedNormals 一致`, () => {
      const want = toCreasedNormals(make(), angle).attributes.normal.array;
      const got = creasedNormals(make(), angle).attributes.normal.array;
      expect(got.length).toBe(want.length);
      let worst = 0;
      for (let i = 0; i < want.length; i++) worst = Math.max(worst, Math.abs(got[i] - want[i]));
      expect(worst).toBeLessThan(1e-6);
    });
  }

  it('有索引的几何体先展开', () => {
    const indexed = new CircleGeometry(1, 8);
    expect(indexed.index).not.toBeNull();
    expect(creasedNormals(indexed, Math.PI / 6).attributes.normal.count).toBe(8 * 3);
  });
});

describe('smoothBevels', () => {
  it('朝正上方的面法线是 (0, 0, 1)', () => {
    const geo = smoothBevels(textGeometry({ text: 'A', size: 0.3, height: 0.05 }), Math.PI / 5);
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    let flat = 0;
    for (let i = 0; i < pos.count; i += 3) {
      const z = [0, 1, 2].map((k) => pos.getZ(i + k));
      const top = Math.max(...z);
      if (z.every((v) => v === top) && top > 0.04) {
        for (let k = 0; k < 3; k++) expect([nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k)]).toEqual([0, 0, 1]);
        flat++;
      }
    }
    expect(flat).toBeGreaterThan(0);
  });
});
