// 连续渲染很多枚徽章时，每枚之间让出一下主线程，好让进度文字刷新。
//
// 不能只等 requestAnimationFrame：页面在后台（标签页没切到前面、窗口被挡住）时浏览器不发动画帧，
// 命令行打开的「生成主页图」页面就会一直卡住。所以：
//   - 页面在后台：用消息通道让出，不受后台节流影响；
//   - 页面在前台：等动画帧，但最多等 100 毫秒（等待途中被切到后台也能继续）。

function postTask(fn) {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    channel.port1.close();
    fn();
  };
  channel.port2.postMessage(null);
}

export function nextFrame() {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (document.visibilityState === 'hidden') {
      postTask(finish);
      return;
    }
    requestAnimationFrame(finish);
    setTimeout(finish, 100);
  });
}
