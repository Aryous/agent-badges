// 采集入口：依次采集各品牌，返回每个品牌的结果（本机没装的工具自动跳过）。
import * as claudeCode from './claude-code.js';
import * as codex from './codex.js';
import { dataHome } from './common.js';

export const COLLECTORS = [claudeCode, codex];

export async function collectAll({ env = process.env, home = dataHome(env), only = null, onProgress } = {}) {
  const results = [];
  for (const c of COLLECTORS) {
    if (only && c.BRAND_ID !== only) continue;
    try {
      const r = await c.collect({ env, home, onProgress: onProgress && ((done, total) => onProgress(c.BRAND_ID, done, total)) });
      results.push(r ?? { brandId: c.BRAND_ID, skipped: true });
    } catch (error) {
      results.push({ brandId: c.BRAND_ID, error });
    }
  }
  return { home, results };
}
