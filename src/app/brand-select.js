import { BRANDS, getBrand } from '../brands/index.js';

/**
 * 选出可切换的工具和当前工具。
 * 有本机数据时只列有数据的工具：没装的工具不能用示例数据冒充。
 * 只有在线演示（没有本机数据）或 ?source=mock 时才把两个工具的示例数据都列出来。
 * @param {URLSearchParams} params
 * @param {object | undefined} data  页面注入的本机数据（window.__AGENT_BADGES_DATA__）
 */
export function selectBrand(params, data) {
  const local = params.get('source') === 'mock' ? [] : BRANDS.filter((b) => data?.[b.brand.id]);
  const available = local.length ? local : BRANDS;
  const wanted = params.get('brand');
  const { brand, badges, series } = available.find((b) => b.brand.id === wanted) ?? available[0] ?? getBrand(wanted);
  return { available, brand, configs: badges, series };
}
