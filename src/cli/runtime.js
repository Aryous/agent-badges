// 运行环境检查：放在采集之前，Node 版本过低时先给出友好提示。
import { t } from './i18n.js';

/** 需要 Node 内置的 zstd 解压和 SQLite（Node 22.15+）。 */
export async function checkRuntime() {
  const zlib = await import('node:zlib');
  let sqlite = true;
  try {
    await import('node:sqlite');
  } catch {
    sqlite = false;
  }
  if (typeof zlib.zstdDecompressSync !== 'function' || !sqlite) {
    throw new Error(t(`需要 Node.js 22.15 或更高版本（当前 ${process.versions.node}）`, `Node.js 22.15+ is required (found ${process.versions.node})`));
  }
}
