// FNV-1a 32 位哈希：浏览器和 Node 结果一致。全项目只有这一份实现。
//   - 统计时把 MCP 服务名、Codex 模型名替换成哈希，原名不进入任何后续数据；
//   - 决定顶级款式（见 normalize.js 的 pickVariant）。
// 改算法会让所有人的哈希和顶级款式重新洗牌，不要动。

/** 32 位无符号整数 */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 8 位十六进制字符串（写进账本的形式） */
export const fnv1a = (str) => hash32(str).toString(16).padStart(8, '0');
