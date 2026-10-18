import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * 平滑倒角，同时保持朝正上方的顶面绝对平整。
 *
 * toCreasedNormals 会把夹角小于 angle 的面一起平滑，顶面和第一段倒角的夹角也在其中，
 * 于是顶面边缘的法线被带歪；顶面是细长三角形时（像素图、多块拼接），
 * 这种歪斜会沿三角形拉成一道道斜向光带。这里把朝 +z 的三角形法线重置为 (0, 0, 1)。
 */
export function smoothBevels(geometry, angle = Math.PI / 6) {
  const geo = toCreasedNormals(geometry, angle);
  if (geo !== geometry) geometry.dispose();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i += 3) {
    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
    const ux = pos.getX(i + 1) - ax, uy = pos.getY(i + 1) - ay, uz = pos.getZ(i + 1) - az;
    const vx = pos.getX(i + 2) - ax, vy = pos.getY(i + 2) - ay, vz = pos.getZ(i + 2) - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 0 && nz / len > 0.9999) {
      for (let k = 0; k < 3; k++) nor.setXYZ(i + k, 0, 0, 1);
    }
  }
  nor.needsUpdate = true;
  return geo;
}
