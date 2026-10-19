// Claude Code 和 Codex 的插件清单、共用的 Skill 要保持一致，并符合 Agent Skills 规范。
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const pkg = json('package.json');
const claudePlugin = json('.claude-plugin/plugin.json');
const claudeMarket = json('.claude-plugin/marketplace.json');
const codexPlugin = json('plugin.json');
const codexMarket = json('.agents/plugins/marketplace.json');

const SKILL_DIR = 'skills/badges';
const skill = readFileSync(join(ROOT, SKILL_DIR, 'SKILL.md'), 'utf8');
const [, front, body] = skill.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
const meta = Object.fromEntries(
  (front ?? '').split('\n').map((l) => l.match(/^([\w-]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);

describe('插件清单', () => {
  it('两边的名字、版本和 package.json 一致', () => {
    for (const p of [claudePlugin, codexPlugin]) {
      expect(p.name).toBe(pkg.name);
      expect(p.version).toBe(pkg.version);
    }
  });

  it('Codex 清单声明了 Agent Plugins 规范，名字符合格式', () => {
    expect(codexPlugin.$schema).toBe('https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
    expect(codexPlugin.name).toMatch(/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
  });

  it('两个市场都指向仓库根目录的同一个插件', () => {
    expect(claudeMarket.plugins.map((p) => [p.name, p.source])).toEqual([[pkg.name, './']]);
    const [entry] = codexMarket.plugins;
    expect(codexMarket.plugins).toHaveLength(1);
    expect(entry.name).toBe(pkg.name);
    expect(entry.source).toEqual({ source: 'local', path: './' });
    expect(entry.policy).toEqual({ installation: 'AVAILABLE', authentication: 'ON_INSTALL' });
    expect(entry.category).toBeTruthy();
  });

  it('Codex 界面引用的图片都存在', () => {
    const ui = codexPlugin.extensions['com.openai'].interface;
    for (const p of [ui.composerIcon, ui.logo, ...ui.screenshots]) expect(existsSync(join(ROOT, p)), p).toBe(true);
  });
});

describe('Skill', () => {
  it('frontmatter 符合 Agent Skills 规范', () => {
    expect(meta.name).toBe('badges'); // 必须和目录名一致
    expect(meta.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(meta.description.length).toBeGreaterThan(0);
    expect(meta.description.length).toBeLessThanOrEqual(1024);
    expect(meta.compatibility.length).toBeLessThanOrEqual(500);
  });

  it('正文里的每条命令都在预先批准的范围内', () => {
    expect(meta['allowed-tools']).toBe('Bash(npx -y agent-badges@latest *)');
    // 只看代码（`行内` 和 ``` 代码块）里的命令，不看说明文字
    const code = [...body.matchAll(/```bash\n([\s\S]*?)```|`([^`\n]+)`/g)].map((m) => m[1] ?? m[2]).join('\n');
    const commands = code.match(/npx [^\n]*/g);
    expect(commands.length).toBeGreaterThan(3);
    for (const c of commands) expect(c.startsWith('npx -y agent-badges@latest'), c).toBe(true);
  });

  it('正文里的 CLI 参数都是 CLI 认识的', () => {
    const cli = readFileSync(join(ROOT, 'bin/agent-badges.mjs'), 'utf8');
    for (const flag of new Set(body.match(/--[a-z][a-z-]*/g))) expect(cli, flag).toContain(`'${flag}'`);
  });

  it('带有 Codex 的界面信息', () => {
    const yaml = readFileSync(join(ROOT, SKILL_DIR, 'agents/openai.yaml'), 'utf8');
    expect(yaml).toMatch(/display_name: "Agent Badges"/);
    expect(yaml).toMatch(/allow_implicit_invocation: true/);
  });
});
