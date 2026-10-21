// collect 命令：采集并在终端打印汇总，返回各工具的数据。
import { join } from 'node:path';
import { BRAND_IDS } from '../../brands/index.js';
import { lang, t } from '../i18n.js';

export async function collectAndReport(opts) {
  const { collectAll } = await import('../../collect/index.js');
  const { summarize, formatSummary, newUnlocks } = await import('../../collect/summary.js');
  // 首次运行要读完全部会话记录（可能有几 GB），在终端显示进度；之后只处理新增文件
  const tty = process.stderr.isTTY && !opts.json;
  const onProgress = tty
    ? (id, done, total) => {
        if (total < 50) return;
        process.stderr.write(`\r${t(`读取 ${id} 会话记录`, `Reading ${id} sessions`)} ${done}/${total}`);
        if (done === total) process.stderr.write('\r\x1b[K');
      }
    : null;
  // 先记下上次的进度，采集完对比出「新解锁」
  const { dataHome, readJSON } = await import('../../collect/common.js');
  const before = Object.fromEntries(BRAND_IDS.map((id) => [id, readJSON(join(dataHome(), `${id}.json`))?.progress ?? null]));
  const { home, results } = await collectAll({ only: opts.brand, onProgress });
  const data = {};
  const summaries = [];
  for (const r of results) {
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
