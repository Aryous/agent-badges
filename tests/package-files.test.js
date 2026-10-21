import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// npm 包只带 package.json 里 files 列出的文件，也没有任何运行时依赖。
// 从命令行入口出发，沿静态 import 和 import('…') 走一遍：加载到的每个文件都必须在包里，且不能依赖 three。
// （0.5 开发时出过一次：徽章配置引用了引擎的外形计算，装好的命令行一运行就报错。）

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const shipped = (file) => pkg.files.some((f) => (f.endsWith('/') ? file.startsWith(f) : file === f));

function walk(entry) {
  const seen = new Set();
  const bare = new Set();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(join(root, file), 'utf8');
    const specs = [
      ...src.matchAll(/^\s*(?:import|export)\b[^'"`]*?from\s*['"]([^'"]+)['"]/gm),
      ...src.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm),
      ...src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);
    for (const s of specs) {
      if (s.startsWith('.')) stack.push(relative(root, resolve(root, dirname(file), s)));
      else bare.add(s);
    }
  }
  return { files: [...seen].sort(), bare: [...bare].sort() };
}

describe('npm 包', () => {
  const { files, bare } = walk('bin/agent-badges.mjs');

  it('命令行加载到的文件都在包里', () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.filter((f) => !shipped(f))).toEqual([]);
  });

  it('只用 Node 自带模块，不依赖 three 等第三方包', () => {
    expect(bare.filter((s) => !s.startsWith('node:'))).toEqual([]);
  });
});
