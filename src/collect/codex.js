// 采集本机 Codex 使用统计。
//
// 只读取两类数据（其余一律不打开）：
//   <CODEX_HOME 或 ~/.codex>/sessions/**/rollout-*.jsonl(.zst)   会话记录，每行只取白名单元数据
//   <CODEX_HOME 或 ~/.codex>/state_<N>.sqlite 的 threads 表      只读方式打开，只 SELECT 六个白名单列
// 明确不读：auth.json、config.toml、*.env、history.jsonl、transcription-history.jsonl、
//           thread_history*.sqlite、logs*.sqlite、memories*、shell_snapshots、chatgpt-meetings 等，
//           以及 threads 表的 title / first_user_message / preview / cwd / git_* / 账号 id 等列。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { zstdDecompressSync } from 'node:zlib';
import { homedir } from 'node:os';
import { join } from 'node:path';
import badges from '../brands/codex/index.js';
import { aggregateCodexDays, applyCodexSegments, applyStreams, computeProgress, extractRolloutFacts, mergeCodexLedger, mergeDays, threadFacts } from '../data/codex-metrics.js';
import { localDate } from '../data/metrics-common.js';
import { hash, readJSON, saveBrand, writeJSON } from './common.js';

export const BRAND_ID = 'codex';
/** 账本里「对话轮数」的字段名。 */
export const TURNS_FIELD = 'turns';
const THREAD_COLUMNS = ['created_at_ms', 'source', 'thread_source', 'model', 'reasoning_effort', 'approval_mode'];

export function sourceDir(env = process.env) {
  return env.CODEX_HOME ?? join(homedir(), '.codex');
}

function rolloutFiles(dir) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/^rollout-.*\.jsonl(\.zst)?$/.test(name)) out.push(p);
    }
  };
  walk(join(dir, 'sessions'));
  walk(join(dir, 'archived_sessions'));
  return out;
}

/**
 * 只有这几类记录对统计有用。它们的类型标记都在行首附近，
 * 先用字符串粗筛，正文、命令输出这类大行连 JSON 解析都不做。
 */
const WANTED = ['"session_meta"', '"turn_context"', '"task_started"', '"function_call"', '"custom_tool_call"', '"token_usage_record"', '"token_count"', '"compacted"'];
const wanted = (line) => {
  const head = line.slice(0, 400);
  return WANTED.some((w) => head.includes(w));
};

function factsOf(file) {
  const raw = readFileSync(file);
  const text = file.endsWith('.zst') ? zstdDecompressSync(raw).toString('utf8') : raw.toString('utf8');
  const facts = [];
  for (const line of text.split('\n')) {
    if (!line || !wanted(line)) continue;
    try {
      // 解析后立刻只保留白名单事实，原始记录随即丢弃
      const f = extractRolloutFacts(JSON.parse(line), { hash });
      if (f) facts.push(f);
    } catch {
      // 写到一半的行直接跳过
    }
  }
  return facts;
}

/**
 * 会话索引库。Codex 升级后文件名里的版本号会变（state_5 → state_6），取最新的一个；
 * 表或列对不上时不报错，只返回提示，靠会话记录继续统计。
 */
async function threadRows(dir) {
  const dbs = existsSync(dir)
    ? readdirSync(dir)
        .map((n) => /^state_(\d+)\.sqlite$/.exec(n))
        .filter(Boolean)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
    : [];
  if (!dbs.length) return { rows: [], note: null };
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(join(dir, dbs[0][0]), { readOnly: true });
  try {
    const cols = new Set(db.prepare('PRAGMA table_info(threads)').all().map((c) => c.name));
    const missing = THREAD_COLUMNS.filter((c) => !cols.has(c));
    if (missing.length) return { rows: [], note: `${dbs[0][0]} 的结构与预期不同（缺少 ${missing.join(', ')}），已只用会话记录统计` };
    const rows = db.prepare(`SELECT ${THREAD_COLUMNS.join(', ')} FROM threads`).all();
    return { rows: rows.map((r) => threadFacts(r, { hash })), note: null };
  } finally {
    db.close();
  }
}

/**
 * 增量处理会话记录：会话结束后文件不再变化，每个文件只解析一次，
 * 把它按天汇总的数字缓存起来（键是路径的哈希，不存路径本身）。
 * 大小或修改时间变了才重新解析。
 */
/**
 * 统计口径变了就加一，旧缓存作废、所有会话记录重新解析。
 * 2：认出旧版 token_count 用量。3：行业通用口径（含缓存命中）；旧版用量跨文件去重。
 * 4：缓存会话活动段（协作时长、多线并行、跨日夜战）和子代理派遣次数。
 */
const CACHE_VERSION = 4;

function rolloutDays(files, cachePath, onProgress) {
  const cache = readJSON(cachePath);
  const old = cache?.version === CACHE_VERSION ? cache.files : {};
  const next = {};
  let days = {};
  const allSegs = []; // 自己发起的会话的活动段：协作时长等要跨会话一起算
  const allStreams = []; // 旧版 token_count 用量：分叉 / 子代理会话会复制父会话的记录，全部文件读完再统一去重
  let parsed = 0;
  let facts = 0;
  files.forEach((file, i) => {
    const { size, mtimeMs } = statSync(file);
    const key = hash(file);
    let entry = old[key];
    if (!entry || entry.size !== size || entry.mtimeMs !== mtimeMs) {
      const f = factsOf(file);
      facts += f.length;
      parsed += 1;
      const streams = [];
      const segs = [];
      entry = { size, mtimeMs, days: aggregateCodexDays([f], [], { streamsOut: streams, segsOut: segs }), streams, segs };
    }
    next[key] = entry;
    days = mergeDays(days, entry.days);
    allStreams.push(...entry.streams);
    allSegs.push(...entry.segs);
    onProgress?.(i + 1, files.length);
  });
  applyStreams(days, allStreams);
  applyCodexSegments(days, allSegs);
  writeJSON(cachePath, { version: CACHE_VERSION, files: next });
  return { days, parsed, facts };
}

export async function collect({ env = process.env, home, now = Date.now(), onProgress } = {}) {
  const dir = sourceDir(env);
  if (!existsSync(dir)) return null;
  const files = rolloutFiles(dir);
  const { days, parsed, facts } = rolloutDays(files, joinPath(home, 'cache', `${BRAND_ID}-rollouts.json`), onProgress);
  const { rows, note } = await threadRows(dir);
  const ledgerPath = join(home, `${BRAND_ID}.ledger.json`);
  const ledger = mergeCodexLedger(readJSON(ledgerPath), mergeDays(days, aggregateCodexDays([], rows)));
  if (!files.length && !rows.length && !Object.keys(ledger.days).length) return null;
  const progress = computeProgress(ledger, badges, localDate(now));
  const data = saveBrand(home, BRAND_ID, ledger, progress, { turnsField: TURNS_FIELD });
  return { brandId: BRAND_ID, files: files.length, parsed, threads: rows.length, facts, ledger, progress, data, note };
}
