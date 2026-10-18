import { Vector2 } from 'three';

/** 端面 UV：把 [-1, 1] 映射到 [0, 1]，让程序化贴图覆盖整枚徽章。 */
export const BadgeUV = {
  generateTopUV(geometry, v, a, b, c) {
    const uv = (i) => new Vector2((v[i * 3] + 1) / 2, (v[i * 3 + 1] + 1) / 2);
    return [uv(a), uv(b), uv(c)];
  },
  generateSideWallUV(geometry, v, a, b, c, d) {
    const pick = (i, useX) => new Vector2(useX ? v[i * 3] : v[i * 3 + 1], 1 - v[i * 3 + 2]);
    const useX = Math.abs(v[a * 3 + 1] - v[b * 3 + 1]) < Math.abs(v[a * 3] - v[b * 3]);
    return [pick(a, useX), pick(b, useX), pick(c, useX), pick(d, useX)];
  },
};
