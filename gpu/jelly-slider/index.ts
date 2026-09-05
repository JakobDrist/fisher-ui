import { d, tgpu } from 'typegpu';

import { setupScene } from './scene.ts';

// TypeGPU 0.12's guarded-compute helper still calls the vector method API that
// was removed from its published vector values. The upstream Jelly Slider uses
// that helper for its Bezier texture. Keep the upstream scene untouched while
// bridging the package-version mismatch until the next TypeGPU release.
const vec3fPrototype = Object.getPrototypeOf(d.vec3f()) as Record<string, unknown>;
if (!('div' in vec3fPrototype)) {
  Object.defineProperty(vec3fPrototype, 'div', {
    value(this: d.v3f, rhs: d.v3f) {
      return d.vec3f(this.x / rhs.x, this.y / rhs.y, this.z / rhs.z);
    },
  });
}

const root = await tgpu.init({
  device: {
    optionalFeatures: ['timestamp-query'],
  },
});

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const resizeCanvas = () => {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
};
resizeCanvas();
const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(canvas);
const context = root.configureContext({ canvas, alphaMode: 'premultiplied' });
const scene = await setupScene(root, context);

window.addEventListener('pagehide', () => {
  resizeObserver.disconnect();
  scene.onCleanup();
  root.destroy();
}, { once: true });
