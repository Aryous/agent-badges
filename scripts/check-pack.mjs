// 打包自检：npm pack → 装进临时目录 → 真跑一次 CLI。
// 防止 package.json 的 files 漏掉某个被 CLI 用到的文件（本机开发时不会发现）。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'agent-badges-pack-'));
try {
  const tgz = execFileSync('npm', ['pack', '--silent', '--pack-destination', dir], { encoding: 'utf8' }).trim().split('\n').at(-1);
  writeFileSync(join(dir, 'package.json'), '{"name":"pack-check","private":true}');
  execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund', resolve(dir, tgz)], { cwd: dir, stdio: 'inherit' });
  const bin = join(dir, 'node_modules', '.bin', 'agent-badges');
  // 指向空目录：不读本机任何记录，只验证所有模块都能加载、流程能走完
  const empty = join(dir, 'empty');
  mkdirSync(join(empty, 'claude', 'projects'), { recursive: true });
  const env = { ...process.env, CLAUDE_CONFIG_DIR: join(empty, 'claude'), CODEX_HOME: join(empty, 'codex'), AGENT_BADGES_HOME: join(dir, 'home'), LANG: 'en_US.UTF-8' };
  console.log(execFileSync(bin, ['--version'], { env, encoding: 'utf8' }).trim());
  const out = JSON.parse(execFileSync(bin, ['collect', '--json'], { env, encoding: 'utf8' }));
  execFileSync(bin, ['export', join(dir, 'out')], { env });
  console.log(`pack OK: collect → ${out.brands.length} brand(s), export → out/index.html`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
