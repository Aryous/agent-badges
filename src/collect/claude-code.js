// 采集本机 Claude Code 使用统计。
//
// 只读取两类文件（其余一律不打开）：
//   <CLAUDE_CONFIG_DIR 或 ~/.claude>/stats-cache.json           汇总统计，只取数字字段
//   <CLAUDE_CONFIG_DIR 或 ~/.claude>/projects/<项目>/<会话>.jsonl  会话记录，每行只取白名单元数据
// 明确不读：settings.json、.credentials.json、MCP 配置、history.jsonl、
//           shell-snapshots、session-env、paste-cache、file-history 等。
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';
import badges from '../brands/claude-code/badges.js';
import {
  aggregateDays,
  computeProgress,
  daysFromStatsCache,
  extractFacts,
  mergeLedger,
  modelFamily,
} from '../data/claude-code-metrics.js';
import { localDate } from '../data/metrics-common.js';
import { hash, readJSON, saveBrand } from './common.js';

export const BRAND_ID = 'claude-code';

export function sourceDir(env = process.env) {
  return env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
}

/** 只列出 projects/<项目>/ 下一层的 .jsonl（子代理记录在更深的目录里，不重复计算）。 */
function transcriptFiles(dir) {
  const root = join(dir, 'projects');
  if (!existsSync(root)) return [];
  const files = [];
  for (const p of readdirSync(root)) {
    const sub = join(root, p);
    if (!statSync(sub).isDirectory()) continue;
    for (const f of readdirSync(sub)) if (f.endsWith('.jsonl')) files.push(join(sub, f));
  }
  return files;
}

/**
 * @returns {Promise<null | { brandId, files, facts, ledger, progress, data }>}
 *   本机没有 Claude Code 数据时返回 null
 */
export async function collect({ env = process.env, home, now = Date.now() } = {}) {
  const dir = sourceDir(env);
  if (!existsSync(dir)) return null;
  const files = transcriptFiles(dir);
  const facts = [];
  for (const file of files) {
    const rl = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      try {
        // 解析后立刻只保留白名单事实，原始记录随即丢弃
        const f = extractFacts(JSON.parse(line), { hash });
        if (f) facts.push(f);
      } catch {
        // 写到一半的行直接跳过
      }
    }
  }
  const stats = readJSON(join(dir, 'stats-cache.json'));
  const statsFirst = typeof stats?.firstSessionDate === 'string' ? localDate(Date.parse(stats.firstSessionDate)) : null;
  const ledgerPath = join(home, `${BRAND_ID}.ledger.json`);
  const ledger = mergeLedger(readJSON(ledgerPath), aggregateDays(facts), {
    statsDays: daysFromStatsCache(stats),
    firstSeen: statsFirst,
    undatedModels: Object.keys(stats?.modelUsage ?? {}).map(modelFamily).filter(Boolean),
  });
  if (!files.length && !Object.keys(ledger.days).length) return null;
  const progress = computeProgress(ledger, badges, localDate(now));
  const data = saveBrand(home, BRAND_ID, ledger, progress);
  return { brandId: BRAND_ID, files: files.length, facts: facts.length, ledger, progress, data };
}
