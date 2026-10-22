// collect 命令：采集并在终端打印汇总，返回各工具的数据。
import { join } from 'node:path';
import { BRAND_IDS } from '../../brands/index.js';
import { lang, t } from '../i18n.js';

export async function collectAndReport(opts) {
  const { collectAll } = await import('../../collect/index.js');
  const { summarize, formatSummary, newUnlocks } = await import('../summary.js');
  // 首次运行要读完全部会话记录（可能有几 GB），在终端显示进度；之后只处理新增文件
  const tty = process.stderr.isTTY && !opts.json;
  const onProgress = tty
    ? (id, done, total) => {
        if (total < 50) return;
        process.stderr.write(`\r${t(`读取 ${id} 会话记录`, `Reading ${id} sessions`)} ${done}/${total}`);
        if (done === total) process.stderr.write('\r\x1b[K');
      }
    : null;
  // 先记下上次的进度，采集完对比出「新解锁」。进度文件只用于这个对比：坏了就当没有，采集后会重写
  const { CorruptLedgerError, dataHome, readJSON } = await import('../../collect/common.js');
  const before = {};
  for (const id of BRAND_IDS) {
    const p = join(dataHome(), `${id}.json`);
    try {
      before[id] = readJSON(p)?.progress ?? null;
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      console.error(t(`! ${p} 已损坏：这次不报告新解锁，采集后会重新生成`, `! ${p} is corrupt: new unlocks are not reported this time; it will be rewritten`));
      before[id] = null;
    }
  }
  const { home, results } = await collectAll({ only: opts.brand, onProgress });
  const data = {};
  const summaries = [];
  for (const r of results) {
    if (r.error instanceof CorruptLedgerError) {
      const { path, backup } = r.error;
      console.error(t(`× ${r.brandId} 的账本已损坏，这次没有采集，文件也没有改动：${path}`, `× ${r.brandId}: the ledger is corrupt, so this tool was skipped and the file was left untouched: ${path}`));
      console.error(
        backup
          ? t(`  用上一版恢复：cp "${backup}" "${path}"`, `  Restore the previous version: cp "${backup}" "${path}"`)
          : t('  没有备份。删掉这个文件会从现有记录重新统计，但工具已经清理掉的旧日子会丢失。', '  No backup exists. Deleting the file rebuilds it from the current logs, but days the tool has already cleaned up are lost.'),
      );
      process.exitCode = 1;
      continue;
    }
    if (r.error) {
      console.error(t(`× ${r.brandId} 采集失败：${r.error.message}`, `× ${r.brandId} failed: ${r.error.message}`));
      continue;
    }
    if (r.skipped) {
      if (!opts.json) console.log(t(`· 未检测到 ${r.brandId}，跳过`, `· ${r.brandId} not found, skipped`));
      continue;
    }
    data[r.brandId] = r.data;
    const outLang = opts.outLang ?? lang;
    const s = { ...summarize(r.brandId, r.progress, { lang: outLang }), newUnlocks: newUnlocks(r.brandId, before[r.brandId], r.progress, { lang: outLang }) };
    summaries.push({ id: r.brandId, ...s });
    if (!opts.json) {
      console.log(formatSummary(s, { lang: outLang }));
      if (r.note) console.log(`  ${r.note}`);
    }
  }
  if (opts.json) console.log(JSON.stringify({ home, brands: summaries }, null, 2));
  else console.log(t(`\n数据保存在 ${home}（只含数字、日期和哈希）`, `\nSaved to ${home} (numbers, dates and hashes only)`));
  return data;
}
