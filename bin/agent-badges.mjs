#!/usr/bin/env node
// agent-badges：本机采集 AI 编程工具的使用统计，生成 3D 成就徽章墙。
// 全程离线：数据只读本机、只存本机（默认 ~/.agent-badges），不上传任何内容。实现都在 src/cli/。
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { main } from '../src/cli/main.js';

export { parseArgs } from '../src/cli/args.js';

// Node 22 读 SQLite 时会打印「实验特性」警告，对用户没有意义，只屏蔽这一条
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) => {
  if (String(warning?.message ?? warning).includes('SQLite is an experimental feature')) return;
  return emitWarning.call(process, warning, ...rest);
};

// 被测试导入时不自动运行。npx 通过符号链接启动，要比较真实路径
const isMain = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
