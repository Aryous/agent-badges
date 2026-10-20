import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { transcriptFiles } from '../src/collect/claude-code.js';

const root = mkdtempSync(join(tmpdir(), 'agent-badges-cc-files-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const touch = (p) => {
  mkdirSync(join(root, p, '..'), { recursive: true });
  writeFileSync(join(root, p), '');
};

describe('Claude Code 会话文件', () => {
  it('主会话和子代理（含 Workflow）的记录都读；元数据、Workflow 日志、其他目录不读', () => {
    touch('projects/p1/s1.jsonl');
    touch('projects/p1/s1/subagents/agent-a.jsonl');
    touch('projects/p1/s1/subagents/agent-a.meta.json');
    touch('projects/p1/s1/subagents/workflows/wf_1/agent-b.jsonl');
    touch('projects/p1/s1/subagents/workflows/wf_1/journal.jsonl');
    touch('projects/p1/s1/tool-results/x.jsonl');
    touch('projects/p2/s2.jsonl');
    touch('history.jsonl');
    const files = transcriptFiles(root).map((f) => relative(root, f)).sort();
    expect(files).toEqual([
      'projects/p1/s1.jsonl',
      'projects/p1/s1/subagents/agent-a.jsonl',
      'projects/p1/s1/subagents/workflows/wf_1/agent-b.jsonl',
      'projects/p2/s2.jsonl',
    ]);
  });
});
