// 采集本机 Claude Code 使用统计。
//
// 只读取两类文件（其余一律不打开）：
//   <CLAUDE_CONFIG_DIR 或 ~/.claude>/stats-cache.json           汇总统计，只取数字字段
//   <CLAUDE_CONFIG_DIR 或 ~/.claude>/projects/<项目>/<会话>.jsonl  会话记录，每行只取白名单元数据
//   <CLAUDE_CONFIG_DIR 或 ~/.claude>/projects/<项目>/<会话>/subagents/**/*.jsonl  子代理的会话记录，同上
// 明确不读：settings.json、.credentials.json、MCP 配置、history.jsonl、
//           shell-snapshots、session-env、paste-cache、file-history 等。
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';
import badges from '../brands/claude-code/index.js';
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

/**
 * 会话记录文件：
 *   projects/<项目>/<会话>.jsonl                                  主会话
 *   projects/<项目>/<会话>/subagents/agent-<id>.jsonl                      子代理（Agent）
 *   projects/<项目>/<会话>/subagents/workflows/wf_<id>/agent-<id>.jsonl    Workflow 里的子代理
 * 子代理是独立的 API 调用，Token 不在主会话里；同一条回复出现在多个文件时按消息 id 去重。
 * Workflow 的 journal.jsonl 是流程日志，没有用量，不读。
 */
export function transcriptFiles(dir) {
  const root = join(dir, 'projects');
  if (!existsSync(root)) return [];
  const files = [];
  const isDir = (p) => statSync(p).isDirectory();
  const walkSubagents = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (isDir(p)) walkSubagents(p);
      else if (f.endsWith('.jsonl') && f !== 'journal.jsonl') files.push(p);
    }
  };
  for (const proj of readdirSync(root)) {
    const projDir = join(root, proj);
    if (!isDir(projDir)) continue;
    for (const f of readdirSync(projDir)) {
      const p = join(projDir, f);
      if (f.endsWith('.jsonl')) files.push(p);
      else if (isDir(p) && existsSync(join(p, 'subagents'))) walkSubagents(join(p, 'subagents'));
    }
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
