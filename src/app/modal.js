/**
 * 弹层（海报、主页图共用）：打开时记下焦点来源，关闭时还回去；
 * 关闭按钮、点遮罩、按 Esc 都能关。创建时就注册 window 的 keydown，注册顺序跟着创建顺序。
 */
export function createModal(el, closeBtn) {
  let opener = null;
  function open({ viaKeyboard = false } = {}) {
    opener = document.activeElement;
    el.hidden = false;
    document.body.classList.add('is-modal');
    if (viaKeyboard) closeBtn.focus({ preventScroll: true });
  }
  function close() {
    if (el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('is-modal');
    opener?.focus?.({ preventScroll: true });
  }
  closeBtn.addEventListener('click', close);
  el.addEventListener('click', (e) => e.target === el && close());
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  return {
    open,
    close,
    get isOpen() {
      return !el.hidden;
    },
  };
}
