// 采集模块共用的小工具：数据目录、哈希、读写 JSON。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { dailySeries } from '../data/daily.js';

/** 账本和进度的存放目录：默认 ~/.agent-badges，可用 AGENT_BADGES_HOME 覆盖。 */
export function dataHome(env = process.env) {
  return env.AGENT_BADGES_HOME ?? join(homedir(), '.agent-badges');
}

/** MCP 服务名、模型名等的哈希：只用于去重计数，不可逆。 */
export const hash = (s) => createHash('sha256').update(`agent-badges:${s}`).digest('hex').slice(0, 12);

export const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

export function writeJSON(path, data) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

/** 写入一个品牌的账本和进度，返回进度文件内容。 */
export function saveBrand(home, brandId, ledger, progress, { turnsField }) {
  writeJSON(join(home, `${brandId}.ledger.json`), ledger);
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
