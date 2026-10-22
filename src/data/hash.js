// FNV-1a 32 位哈希：浏览器和 Node 结果一致。
// 只用来决定顶级彩蛋抽到哪一款（normalize.js 的 pickVariant），按「这一级的 salt + 获得日期」计算。
// 改算法会让所有人的顶级款式重新洗牌，不要动。
// 写进账本的哈希（MCP 服务名、Codex 模型名）是另一套：src/collect/common.js 的 hash（加前缀的 sha256，取前 12 位）。

/** 32 位无符号整数 */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
