// 采集模块共用的小工具：数据目录、哈希、读写 JSON。
// 写入都先写临时文件再改名替换：写到一半中断（崩溃、磁盘满）时，原文件保持完好。
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { dailySeries } from '../data/daily.js';

/** 账本和进度的存放目录：默认 ~/.agent-badges，可用 AGENT_BADGES_HOME 覆盖。 */
export function dataHome(env = process.env) {
  return env.AGENT_BADGES_HOME ?? join(homedir(), '.agent-badges');
}

/** MCP 服务名、模型名等的哈希：只用于去重计数，不可逆。 */
export const hash = (s) => createHash('sha256').update(`agent-badges:${s}`).digest('hex').slice(0, 12);

/** 读 JSON：文件不存在返回 null；内容不是合法 JSON 时抛出 SyntaxError，由调用方按文件的性质处理。 */
export const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/** 先写同目录的临时文件，再改名替换（同一磁盘上改名是原子的）。 */
export function replaceFile(path, write) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    write(tmp);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

export function writeJSON(path, data) {
  const text = JSON.stringify(data, null, 2);
  replaceFile(path, (tmp) => writeFileSync(tmp, text));
}

/** 账本损坏（不是合法 JSON）。账本里有工具已经清理掉的旧日子，不能覆盖，交给用户从备份恢复。 */
export class CorruptLedgerError extends Error {
  constructor(path) {
    super(`账本文件损坏：${path}`);
    this.name = 'CorruptLedgerError';
    this.path = path;
    this.backup = existsSync(`${path}.bak`) ? `${path}.bak` : null;
  }
}

/** 读账本：不存在返回 null；损坏时抛出 CorruptLedgerError，绝不当作空账本继续（那样会把旧数据覆盖掉）。 */
export function readLedger(path) {
  try {
    return readJSON(path);
  } catch (e) {
    if (e instanceof SyntaxError) throw new CorruptLedgerError(path);
    throw e;
  }
}

/** 读缓存：缓存随时可以重建，损坏时当作不存在。 */
export function readCache(path) {
  try {
    return readJSON(path);
  } catch (e) {
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

/** 写入一个品牌的账本和进度，返回进度文件内容。覆盖账本前，把上一版存为 <文件名>.bak。 */
export function saveBrand(home, brandId, ledger, progress, { turnsField } = {}) {
  if (!turnsField) throw new Error('saveBrand 需要 turnsField（采集模块导出的 TURNS_FIELD）');
  const ledgerPath = join(home, `${brandId}.ledger.json`);
  if (existsSync(ledgerPath)) replaceFile(`${ledgerPath}.bak`, (tmp) => copyFileSync(ledgerPath, tmp));
  writeJSON(ledgerPath, ledger);
  const out = {
    source: 'local',
    generatedAt: new Date().toISOString(),
    days: Object.keys(ledger.days).length,
    progress,
    daily: dailySeries(ledger, turnsField),
  };
  writeJSON(join(home, `${brandId}.json`), out);
  return out;
}
