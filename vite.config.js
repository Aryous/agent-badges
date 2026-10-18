import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataHome } from './src/collect/common.js';
import { injectData } from './src/collect/inject.js';

/**
 * 开发服务器：把 ~/.agent-badges 里的本机数据注入页面（npm run collect 生成）。
 * 只在 dev 生效，构建产物不含任何个人数据。
 */
function localData() {
  return {
    name: 'agent-badges-local-data',
    apply: 'serve',
    transformIndexHtml(html) {
      const home = dataHome();
      const data = {};
      for (const id of ['claude-code', 'codex']) {
        const p = join(home, `${id}.json`);
        if (existsSync(p)) data[id] = JSON.parse(readFileSync(p, 'utf8'));
      }
      return Object.keys(data).length ? injectData(html, data) : html;
    },
  };
}

/** 把 favicon 直接内嵌成 data URI：CLI 的本地服务器只提供页面本身这一个文件。 */
function inlineFavicon() {
  return {
    name: 'agent-badges-inline-favicon',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/href="\.\/assets\/favicon\.svg"/, () => {
        const svg = readFileSync(new URL('./assets/favicon.svg', import.meta.url), 'utf8');
        return `href="data:image/svg+xml,${encodeURIComponent(svg)}"`;
      }),
    },
  };
}

export default defineConfig({
  plugins: [inlineFavicon(), viteSingleFile(), localData()],
  build: { target: 'es2022', assetsInlineLimit: 100000000 },
  // 组装全部徽章的测试较重，机器负载高时可能超过默认的 5 秒
  test: { environment: 'node', include: ['tests/**/*.test.js'], testTimeout: 30000 },
});
