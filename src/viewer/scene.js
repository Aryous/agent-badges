import {
  NeutralToneMapping,
  DirectionalLight,
  PMREMGenerator,
  PerspectiveCamera,
  PointLight,
  SRGBColorSpace,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 舞台：渲染器、相机、灯光与环境反射。
// 相机固定在 z 轴上看向原点；布局以 z=0 平面上的可见范围为准。

export const FOV = 26;
export const CAMERA_Z = 12;

export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2'));
  } catch {
    return false;
  }
}

export function createStage(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.035, 0.1, 100, { size: 512 }).texture;
  const ENV_INTENSITY = 0.9;
  scene.environment = envMap;
  scene.environmentIntensity = ENV_INTENSITY;
  // 让环境里的灯箱从左上方打来，金属上会出现斜向高光
  scene.environmentRotation.set(0.35, -0.6, 0);

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAMERA_Z);
  camera.lookAt(0, 0, 0);

  // 主光：暖色，左上前方
  const key = new DirectionalLight(0xfff1e0, 2.2);
  key.position.set(-4, 5, 6);
  // 轮廓光：冷色，右后方，勾出倒角边缘
  const rim = new DirectionalLight(0xc8d8ff, 1.4);
  rim.position.set(5, 2, -4);
  // 补光：从下方，避免浮雕底部死黑
  const fill = new DirectionalLight(0xffe4cc, 0.5);
  fill.position.set(0, -6, 4);
  scene.add(key, rim, fill);

  // 获得动画里扫过表面的高光
  const sweep = new PointLight(0xfff6e8, 0, 6, 1.6);
  sweep.position.set(-3, 1, 2.2);
  scene.add(sweep);

  const view = { width: 1, height: 1, halfH: 1, halfW: 1, aspect: 1 };
  const size = new Vector2();

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return; // 画布隐藏时（陈列墙模式）不改尺寸
    // 给 canvas.width 赋值（哪怕值不变）会重新分配绘图缓冲，很慢；尺寸没变就不碰
    const now = renderer.getSize(size);
    if (now.x !== w || now.y !== h) renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.width = w;
    view.height = h;
    view.aspect = w / h;
    view.halfH = Math.tan(((FOV / 2) * Math.PI) / 180) * CAMERA_Z;
    view.halfW = view.halfH * view.aspect;
  }
  resize();

  /**
   * 场景环境贴图会覆盖材质自己的 envMapIntensity，
   * 所以给徽章材质显式挂上环境贴图，让珐琅、陶瓷可以单独调低反射。
   */
  function applyEnvironment(object) {
    object.traverse((o) => {
      if (!o.isMesh || o.material.envMap) return;
      o.material.envMap = envMap;
      o.material.envMapIntensity *= ENV_INTENSITY;
      o.material.needsUpdate = true;
    });
  }

  return { renderer, scene, camera, sweep, view, resize, applyEnvironment };
}
