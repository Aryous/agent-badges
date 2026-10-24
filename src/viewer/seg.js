// 胶囊控件的金属滑块：读出当前选中项的位置和宽度，写进 CSS 变量，滑块用 transition 滑过去。
// 选中项靠 aria-checked（页面内切换）或 aria-current（语言链接）标记。

/**
 * @param {HTMLElement} el  .seg 容器
 * @param {string} [selector]  当前项的选择器
 * @returns {() => void} 手动同步（内容变化后调用；属性变化和尺寸变化会自动同步）
 */
export function trackSegThumb(el, selector = '[aria-checked="true"]') {
  const sync = () => {
    const on = el.querySelector(selector);
    if (!on || el.hidden) {
      el.style.setProperty('--thumb-on', '0');
      return;
    }
    el.style.setProperty('--thumb-x', `${on.offsetLeft}px`);
    el.style.setProperty('--thumb-w', `${on.offsetWidth}px`);
    el.style.setProperty('--thumb-on', '1');
  };
  new MutationObserver(sync).observe(el, { subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-current'] });
  new ResizeObserver(sync).observe(el);
  el.classList.add('is-tracked');
  sync();
  // 第一次定位不播动画，之后的切换才滑动
  requestAnimationFrame(() => el.classList.add('is-ready'));
  return sync;
}
