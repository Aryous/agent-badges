// 命令行的语言和文案函数。
export const detectLang = (env = process.env) => (/^zh/i.test(env.LC_ALL ?? env.LANG ?? Intl.DateTimeFormat().resolvedOptions().locale ?? '') ? 'zh' : 'en');
export const lang = detectLang();
export const t = (zh, en) => (lang === 'zh' ? zh : en);
