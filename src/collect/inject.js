// 把采集结果内嵌进页面：CLI 提供的本地页面、导出的静态文件、开发服务器都用它。

/** 生成注入用的 <script>。转义 "<" 防止数据里出现 </script> 提前闭合标签。 */
export function dataScript(dataByBrand) {
  const json = JSON.stringify(dataByBrand).replace(/</g, '\\u003c');
  return `<script>window.__AGENT_BADGES_DATA__ = ${json};</script>`;
}

export function injectData(html, dataByBrand) {
  const tag = dataScript(dataByBrand);
  return html.includes('</head>') ? html.replace('</head>', `${tag}\n</head>`) : tag + html;
}
