import { BufferAttribute } from 'three';

/**
 * 平滑倒角，同时保持朝正上方的顶面绝对平整。
 *
 * 折角平滑会把夹角小于 angle 的面一起平滑，顶面和第一段倒角的夹角也在其中，
 * 于是顶面边缘的法线被带歪；顶面是细长三角形时（像素图、多块拼接），
 * 这种歪斜会沿三角形拉成一道道斜向光带。这里把朝 +z 的三角形法线重置为 (0, 0, 1)。
 */
export function smoothBevels(geometry, angle = Math.PI / 6) {
  const geo = creasedNormals(geometry, angle);
  if (geo !== geometry) geometry.dispose();
  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  for (let i = 0; i < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 0 && nz / len > 0.9999) {
      for (let k = i; k < i + 9; k += 3) {
        nor[k] = 0;
        nor[k + 1] = 0;
        nor[k + 2] = 1;
      }
    }
  }
  return geo;
}

/** 顶点按坐标乘以它再取整后相同的算同一点（和 three 的 toCreasedNormals 一样，即 0.01 的格子）。 */
const MERGE = (1 + 1e-10) * 1e2;

/**
 * 折角平滑法线：和 three/addons 的 toCreasedNormals 结果相同（只差浮点末位），快几倍。
 *
 * 每个顶点的法线 = 同一格子里、和本面夹角小于 creaseAngle 的所有面法线之和。
 * 徽章半径约 1，细节在千分之一量级，一个 0.01 的格子里常挤着上千个面，
 * three 逐个顶点扫一遍格子，计算量是格子大小的平方。但格子里很多面朝向完全相同，
 * 这里把同一格子里相同的面法线并成一项（记个数），每种朝向只算一次，再分给各顶点。
 * 合并顶点的规则不变，所以光影和原来一致。
 */
export function creasedNormals(geometry, creaseAngle) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position.array;
  const vertexCount = pos.length / 3;
  const faceCount = vertexCount / 3;
  const creaseDot = Math.cos(creaseAngle);

  // 每个面的单位法线（算法与 three 相同）；完全相同的法线共用一个编号
  const faceNormals = new Float64Array(faceCount * 3);
  for (let f = 0; f < faceCount; f++) {
    const a = 9 * f;
    const v1x = pos[a + 6] - pos[a + 3], v1y = pos[a + 7] - pos[a + 4], v1z = pos[a + 8] - pos[a + 5];
    const v2x = pos[a] - pos[a + 3], v2y = pos[a + 1] - pos[a + 4], v2z = pos[a + 2] - pos[a + 5];
    const nx = v1y * v2z - v1z * v2y;
    const ny = v1z * v2x - v1x * v2z;
    const nz = v1x * v2y - v1y * v2x;
    const inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
    faceNormals[3 * f] = nx * inv;
    faceNormals[3 * f + 1] = ny * inv;
    faceNormals[3 * f + 2] = nz * inv;
  }
  const normalOf = dedupe(faceNormals, faceCount);

  // 顶点按格子编号，再按格子排好（计数排序）
  const cellKeys = new Float64Array(vertexCount * 3);
  for (let i = 0; i < cellKeys.length; i++) cellKeys[i] = Math.trunc(pos[i] * MERGE);
  const cellOf = dedupe(cellKeys, vertexCount);
  const start = new Int32Array(cellOf.count + 1);
  for (let i = 0; i < vertexCount; i++) start[cellOf.ids[i] + 1]++;
  for (let c = 0; c < cellOf.count; c++) start[c + 1] += start[c];
  const order = new Int32Array(vertexCount);
  const cursor = start.slice(0, cellOf.count);
  for (let i = 0; i < vertexCount; i++) order[cursor[cellOf.ids[i]]++] = i;

  // 逐个格子：列出格子里出现的法线种类和次数，每种算一次平滑结果
  const seenIn = new Int32Array(normalOf.count).fill(-1);
  const times = new Int32Array(normalOf.count);
  const smoothed = new Float64Array(normalOf.count * 3);
  const kinds = new Int32Array(normalOf.count);
  const out = new Float32Array(vertexCount * 3);
  for (let c = 0; c < cellOf.count; c++) {
    let m = 0;
    for (let k = start[c]; k < start[c + 1]; k++) {
      const n = normalOf.ids[(order[k] / 3) | 0];
      if (seenIn[n] !== c) {
        seenIn[n] = c;
        times[n] = 0;
        kinds[m++] = n;
      }
      times[n]++;
    }
    for (let a = 0; a < m; a++) {
      const na = 3 * normalOf.firsts[kinds[a]];
      const ax = faceNormals[na], ay = faceNormals[na + 1], az = faceNormals[na + 2];
      let sx = 0, sy = 0, sz = 0;
      for (let b = 0; b < m; b++) {
        const nb = 3 * normalOf.firsts[kinds[b]];
        const bx = faceNormals[nb], by = faceNormals[nb + 1], bz = faceNormals[nb + 2];
        if (ax * bx + ay * by + az * bz > creaseDot) {
          const w = times[kinds[b]];
          sx += w * bx;
          sy += w * by;
          sz += w * bz;
        }
      }
      const inv = 1 / (Math.sqrt(sx * sx + sy * sy + sz * sz) || 1);
      const o = 3 * kinds[a];
      smoothed[o] = sx * inv;
      smoothed[o + 1] = sy * inv;
      smoothed[o + 2] = sz * inv;
    }
    for (let k = start[c]; k < start[c + 1]; k++) {
      const i = order[k];
      const n = 3 * normalOf.ids[(i / 3) | 0];
      out[3 * i] = smoothed[n];
      out[3 * i + 1] = smoothed[n + 1];
      out[3 * i + 2] = smoothed[n + 2];
    }
  }

  geo.setAttribute('normal', new BufferAttribute(out, 3));
  return geo;
}

/**
 * 给 n 个三元组（values 里连续存放）编号，完全相同的同号。开放寻址哈希表，槽里存「编号 + 1」。
 * @returns {{ ids: Int32Array, firsts: Int32Array, count: number }} ids：每个三元组的编号；firsts：每个编号第一次出现的位置
 */
function dedupe(values, n) {
  let size = 1;
  while (size < n * 2) size <<= 1;
  const mask = size - 1;
  const table = new Int32Array(size);
  const ids = new Int32Array(n);
  const firsts = new Int32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const x = values[3 * i], y = values[3 * i + 1], z = values[3 * i + 2];
    let slot = (Math.imul((x * 1e6) | 0, 73856093) ^ Math.imul((y * 1e6) | 0, 19349663) ^ Math.imul((z * 1e6) | 0, 83492791)) & mask;
    for (;;) {
      const id = table[slot];
      if (id === 0) {
        table[slot] = count + 1;
        firsts[count] = i;
        ids[i] = count++;
        break;
      }
      const j = 3 * firsts[id - 1];
      if (values[j] === x && values[j + 1] === y && values[j + 2] === z) {
        ids[i] = id - 1;
        break;
      }
      slot = (slot + 1) & mask;
    }
  }
  return { ids, firsts, count };
}
