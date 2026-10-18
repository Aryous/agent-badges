// 采集本机 Claude Code 使用统计，生成徽章进度。
// 用法：npm run collect          （生成后刷新页面即可；构建前运行则打包进 dist）
//
// 只读取两类文件（其余一律不打开）：
//   ~/.claude/stats-cache.json           Claude Code 自己生成的汇总统计，只取数字字段
//   ~/.claude/projects/<项目>/<会话>.jsonl  会话记录，每行只取白名单元数据（见 claude-code-metrics.js）
// 明确不读：settings.json、.credentials.json、MCP 配置、history.jsonl、
//           shell-snapshots、session-env、paste-cache、file-history 等。
//
// 输出（已加入 .gitignore，不会提交）：
//   src/data/generated/claude-code.ledger.json  按天汇总的累计账本（会话记录被清理后也不丢）
//   src/data/generated/claude-code.json         给页面用的徽章进度
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import badges from '../src/brands/claude-code/badges.js';
import {
  aggregateDays,
  computeProgress,
  daysFromStatsCache,
  extractFacts,
  localDate,
  mergeLedger,
  modelFamily,
} from '../src/data/claude-code-metrics.js';

const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
const OUT_DIR = new URL('../src/data/generated/', import.meta.url).pathname;
const LEDGER = join(OUT_DIR, 'claude-code.ledger.json');
const PROGRESS = join(OUT_DIR, 'claude-code.json');

const hash = (s) => createHash('sha256').update(`agent-badges:${s}`).digest('hex').slice(0, 12);
const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/** 只列出 projects/<项目>/ 下一层的 .jsonl（子代理记录在更深的目录里，不重复计算）。 */
function transcriptFiles() {
  const root = join(CLAUDE_DIR, 'projects');
  if (!existsSync(root)) return [];
  const files = [];
  for (const p of readdirSync(root)) {
    const dir = join(root, p);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) if (f.endsWith('.jsonl')) files.push(join(dir, f));
  }
  return files;
}

/** 逐行读取，每行解析后立刻只保留白名单事实，原始记录随即丢弃。 */
async function* factsFrom(files) {
  for (const file of files) {
    const rl = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      let facts = null;
      try {
        facts = extractFacts(JSON.parse(line), { hash });
      } catch {
        // 写到一半的行等无法解析的内容直接跳过
      }
      if (facts) yield facts;
    }
  }
}

async function main() {
  const files = transcriptFiles();
  const facts = [];
  for await (const f of factsFrom(files)) facts.push(f);
  const fresh = aggregateDays(facts);

  // stats-cache：只取日期、计数和模型名（转成家族）
  const stats = readJSON(join(CLAUDE_DIR, 'stats-cache.json'));
  const statsFirst = typeof stats?.firstSessionDate === 'string' ? localDate(Date.parse(stats.firstSessionDate)) : null;
  const undatedModels = Object.keys(stats?.modelUsage ?? {}).map(modelFamily).filter(Boolean);

  const ledger = mergeLedger(readJSON(LEDGER), fresh, {
    statsDays: daysFromStatsCache(stats),
    firstSeen: statsFirst,
    undatedModels,
  });
  const today = localDate(Date.now());
  const progress = computeProgress(ledger, badges, today);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  writeFileSync(
    PROGRESS,
    JSON.stringify({ source: 'local', generatedAt: new Date().toISOString(), days: Object.keys(ledger.days).length, progress }, null, 2),
  );

  const unlocked = Object.values(progress).filter((p) => p.unlocked || p.earnedAt).length;
  console.log(`读取 ${files.length} 个会话记录文件，提取 ${facts.length} 条元数据`);
  console.log(`账本覆盖 ${Object.keys(ledger.days).length} 天（${ledger.firstSeen ?? '—'} 起）`);
  console.log(`已解锁 ${unlocked} / ${Object.keys(progress).length} 枚，结果写入 src/data/generated/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
