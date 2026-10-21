// 包根目录、页面文件和 package.json（src/cli/ 往上两级就是包根）。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const APP = join(ROOT, 'dist', 'index.html');
export const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
