import { BufferAttribute, BufferGeometry, Matrix3, Matrix4, Mesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { disposeMaterial } from './badge.js';

// 合并静态网格：同一份材质的浮雕并成一个网格，一帧的绘制调用从几百次降到几十次。
// 只用于不再单独改动浮雕的徽章（比如全解锁徽章进场结束之后）；材质对象不变，改材质颜色照样生效。

const IDENTITY = new Matrix4();
const signature = (g) => Object.keys(g.attributes).sort().join(',') + (g.index ? '+index' : '');

/**
 * 把 group 的直接子网格按材质合并。机身（userData.shared 的几何体）不动；看不见的网格直接去掉。
 * 原来独占的几何体释放（共用的不动），不再有网格用的材质也释放。
 * @returns {{ before: number, after: number }} 合并前后的网格数
 */
export function mergeByMaterial(group) {
  const meshes = group.children.filter((o) => o.isMesh);
  const before = meshes.length;
  const groups = new Map();
  const dropped = [];
  for (const m of meshes) {
    if (m.geometry.userData.shared) continue;
    group.remove(m);
    if (!m.visible) {
      dropped.push(m);
      continue;
    }
    const key = m.material;
    const sig = signature(m.geometry);
    if (!groups.has(key)) groups.set(key, new Map());
    const bySig = groups.get(key);
    if (!bySig.has(sig)) bySig.set(sig, []);
    bySig.get(sig).push(m);
  }
  const added = [];
  for (const [material, bySig] of groups) {
    for (const list of bySig.values()) {
      list.forEach((m) => m.updateMatrix());
      if (list.length === 1 && list[0].matrix.equals(IDENTITY)) {
        added.push(list[0]);
        continue;
      }
      const merged = mergeMeshes(list);
      if (!merged) {
        added.push(...list);
        continue;
      }
      const mesh = new Mesh(merged, material);
      mesh.name = 'merged';
      added.push(mesh);
      list.forEach((m) => dropped.push(m));
    }
  }
  added.forEach((m) => group.add(m));
  // 释放：还在用的几何体和材质不动
  const keepGeo = new Set(group.children.filter((o) => o.isMesh).map((o) => o.geometry));
  const keepMat = new Set(group.children.filter((o) => o.isMesh).map((o) => o.material));
  new Set(dropped.map((m) => m.geometry)).forEach((g) => !keepGeo.has(g) && !g.userData.shared && g.dispose());
  new Set(dropped.map((m) => m.material)).forEach((mat) => !keepMat.has(mat) && disposeMaterial(mat));
  return { before, after: group.children.filter((o) => o.isMesh).length };
}

/**
 * 把一组网格的几何体按各自的位置变换后拼成一份。都是非索引几何体时直接写进新数组，
 * 不先逐个复制再合并（省一倍的临时内存）；结果和 clone().applyMatrix4() 再 mergeGeometries 一样。
 */
function mergeMeshes(list) {
  const geos = list.map((m) => m.geometry);
  const names = Object.keys(geos[0].attributes);
  const plain = geos.every((g) => !g.index && !g.morphAttributes.position && names.every((n) => g.attributes[n] && !g.attributes[n].isInterleavedBufferAttribute));
  if (!plain) {
    const parts = list.map((m) => m.geometry.clone().applyMatrix4(m.matrix));
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return merged;
  }
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const out = new BufferGeometry();
  for (const name of names) {
    const first = geos[0].attributes[name];
    out.setAttribute(name, new BufferAttribute(new first.array.constructor(total * first.itemSize), first.itemSize, first.normalized));
  }
  const v = new Vector3();
  const nm = new Matrix3();
  let at = 0;
  list.forEach((m, i) => {
    const g = geos[i];
    const count = g.attributes.position.count;
    const still = m.matrix.equals(IDENTITY);
    nm.getNormalMatrix(m.matrix);
    for (const name of names) {
      const src = g.attributes[name];
      const dst = out.attributes[name];
      if (still || (name !== 'position' && name !== 'normal')) {
        dst.array.set(src.array, at * src.itemSize);
        continue;
      }
      for (let k = 0; k < count; k++) {
        v.fromBufferAttribute(src, k);
        if (name === 'position') v.applyMatrix4(m.matrix);
        else v.applyMatrix3(nm).normalize();
        dst.setXYZ(at + k, v.x, v.y, v.z);
      }
    }
    at += count;
  });
  return out;
}
