// 采集本机 Codex 使用统计，生成徽章进度。
// 用法：npm run collect:codex（或 npm run collect 同时采集 Claude Code 和 Codex）
//
// 只读取两类数据（其余一律不打开）：
//   ~/.codex/sessions/**/rollout-*.jsonl(.zst)   会话记录，每行只取白名单元数据（见 codex-metrics.js）
//   ~/.codex/state_5.sqlite 的 threads 表         只读 created_at_ms / source / thread_source / model /
//                                                reasoning_effort / approval_mode 六列（只读方式打开）
// 明确不读：auth.json、config.toml、*.env、history.jsonl、transcription-history.jsonl、
//           thread_history*.sqlite、logs*.sqlite、memories*、shell_snapshots、chatgpt-meetings 等，
//           以及 threads 表里的 title / first_user_message / preview / cwd / git_* / 账号 id 等列。
//
// 输出（已加入 .gitignore，不会提交）：
//   src/data/generated/codex.ledger.json   按天汇总的累计账本
//   src/data/generated/codex.json          给页面用的徽章进度
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import badges from '../src/brands/codex/badges.js';
import { aggregateCodexDays, computeCodexProgress, extractRolloutFacts, mergeCodexLedger, threadFacts } from '../src/data/codex-metrics.js';
import { localDate } from '../src/data/metrics-common.js';

const CODEX_DIR = process.env.CODEX_HOME ?? join(homedir(), '.codex');
const OUT_DIR = new URL('../src/data/generated/', import.meta.url).pathname;
const LEDGER = join(OUT_DIR, 'codex.ledger.json');
const PROGRESS = join(OUT_DIR, 'codex.json');
const hash = (s) => createHash('sha256').update(`agent-badges:${s}`).digest('hex').slice(0, 12);
const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/** sessions/ 和 archived_sessions/ 下的会话记录文件。 */
function rolloutFiles() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/^rollout-.*\.jsonl(\.zst)?$/.test(name)) out.push(p);
    }
  };
  walk(join(CODEX_DIR, 'sessions'));
  walk(join(CODEX_DIR, 'archived_sessions'));
  return out;
}

/** 读一个会话记录文件：每行解析后立刻只保留白名单事实，原始记录随即丢弃。 */
function factsOf(file) {
  const raw = readFileSync(file);
  const text = file.endsWith('.zst') ? zstdDecompressSync(raw).toString('utf8') : raw.toString('utf8');
  const facts = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      const f = extractRolloutFacts(JSON.parse(line), { hash });
      if (f) facts.push(f);
    } catch {
      // 写到一半的行直接跳过
    }
  }
  return facts;
}

/** 会话索引库：只 SELECT 白名单列。 */
function threadRows() {
  const path = join(CODEX_DIR, 'state_5.sqlite');
  if (!existsSync(path)) return [];
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    return db
      .prepare('SELECT created_at_ms, source, thread_source, model, reasoning_effort, approval_mode FROM threads')
      .all()
      .map((row) => threadFacts(row, { hash }));
  } finally {
    db.close();
  }
}

function main() {
  if (!existsSync(CODEX_DIR)) {
    console.log(`没有找到 ${CODEX_DIR}，跳过 Codex 采集`);
    return;
  }
  const files = rolloutFiles();
  const sessions = files.map(factsOf);
  const threads = threadRows();
  const ledger = mergeCodexLedger(readJSON(LEDGER), aggregateCodexDays(sessions, threads));
  const progress = computeCodexProgress(ledger, badges, localDate(Date.now()));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  writeFileSync(
    PROGRESS,
    JSON.stringify({ source: 'local', generatedAt: new Date().toISOString(), days: Object.keys(ledger.days).length, progress }, null, 2),
  );
  const facts = sessions.reduce((n, s) => n + s.length, 0);
  const unlocked = Object.values(progress).filter((p) => p.unlocked || p.earnedAt).length;
  console.log(`Codex：读取 ${files.length} 个会话记录、${threads.length} 条会话索引，提取 ${facts} 条元数据`);
  console.log(`账本覆盖 ${Object.keys(ledger.days).length} 天（${ledger.firstSeen ?? '—'} 起），已解锁 ${unlocked} / ${Object.keys(progress).length} 枚`);
}

main();
