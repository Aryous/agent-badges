// 命令行主流程：解析参数、检查运行环境、采集，再交给对应的命令。
// 命令都用字面量路径懒加载：Node 版本过低时先显示 checkRuntime 的提示，而不是模块报错。
import { HELP, parseArgs } from './args.js';
import { pkg } from './paths.js';
import { checkRuntime } from './runtime.js';
import { t } from './i18n.js';

// 这几个命令生成要分享出去的东西：有工具没采集成功时不运行，免得用缺了一个工具的结果覆盖完整的
const SHARING = ['card', 'shelf', 'profile', 'publish'];

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.command === 'help') return console.log(HELP);
  if (opts.command === 'version') return console.log(pkg.version);
  await checkRuntime();
  if (opts.command === 'avatar') return (await import('./commands/avatar.js')).runAvatar(opts);

  const { collectAndReport } = await import('./commands/collect.js');
  const { data, failed } = await collectAndReport(opts);
  if (opts.command === 'collect') return;
  if (failed.length && SHARING.includes(opts.command)) {
    const ids = failed.join(', ');
    throw new Error(t(`\n已停止：${ids} 没有采集成功，${opts.command} 会缺少它的数据。先解决上面提示的问题，再重新运行。`, `\nStopped: ${ids} could not be collected, and ${opts.command} would leave ${failed.length > 1 ? 'them' : 'it'} out. Fix the problem shown above and run again.`));
  }
  if (opts.command === 'card') return (await import('./commands/card.js')).writeCard(data, opts);
  if (opts.command === 'shelf') return (await import('./commands/shelf.js')).writeShelf(data, opts);
  if (opts.command === 'profile') return (await import('./commands/profile.js')).writeProfile(data, opts);
  if (opts.command === 'publish') return (await import('./commands/publish.js')).writePublish(data, opts);
  if (opts.command === 'export') return (await import('./commands/open.js')).exportPage(opts, data);
  return (await import('./commands/open.js')).open(opts, data);
}
