// 命令行主流程：解析参数、检查运行环境、采集，再交给对应的命令。
// 命令都用字面量路径懒加载：Node 版本过低时先显示 checkRuntime 的提示，而不是模块报错。
import { HELP, parseArgs } from './args.js';
import { pkg } from './paths.js';
import { checkRuntime } from './runtime.js';

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.command === 'help') return console.log(HELP);
  if (opts.command === 'version') return console.log(pkg.version);
  await checkRuntime();

  const { collectAndReport } = await import('./commands/collect.js');
  const data = await collectAndReport(opts);
  if (opts.command === 'collect') return;
  if (opts.command === 'card') return (await import('./commands/card.js')).writeCard(data, opts);
  if (opts.command === 'shelf') return (await import('./commands/shelf.js')).writeShelf(data, opts);
  if (opts.command === 'profile') return (await import('./commands/profile.js')).writeProfile(data, opts);
  if (opts.command === 'publish') return (await import('./commands/publish.js')).writePublish(data, opts);
  if (opts.command === 'export') return (await import('./commands/open.js')).exportPage(opts, data);
  return (await import('./commands/open.js')).open(opts, data);
}
