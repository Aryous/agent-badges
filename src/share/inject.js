// 把采集结果内嵌进页面：CLI 提供的本地页面、导出的静态文件、开发服务器都用它。

/** 生成注入用的 <script>。转义 "<" 防止数据里出现 </script> 提前闭合标签。 */
export function dataScript(dataByBrand) {
  const json = JSON.stringify(dataByBrand).replace(/</g, '\\u003c');
  return `<script>window.__AGENT_BADGES_DATA__ = ${json};</script>`;
}

/**
 * @param {object} [publicMeta]  公开版（profile）才有：{ name, home }，页面据此切换成「给别人看」的样子
 */
export function injectData(html, dataByBrand, publicMeta = null) {
  let tag = dataScript(dataByBrand);
  if (publicMeta) tag += `\n<script>window.__AGENT_BADGES_PUBLIC__ = ${JSON.stringify(publicMeta).replace(/</g, '\\u003c')};</script>`;
  // 用函数做替换：数据里的 $& $' 之类不会被当成替换模式
  return html.includes('</head>') ? html.replace('</head>', () => `${tag}\n</head>`) : tag + html;
}
