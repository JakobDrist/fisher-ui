import { d, std, tgpu, type TgpuBuffer, type TgpuVertexFn } from 'typegpu';
import {
  Root,
  useBindGroup,
  useBuffer,
  useConfigureContext,
  useFrame,
  useRoot,
  useUniform,
} from '@typegpu/react';
import { createRoot } from 'react-dom/client';
import { Suspense, useMemo } from 'react';
import './style.css';

const PARTICLE_AMOUNT = 200;
const COLOR_PALETTE: d.v4f[] = [
  [255, 190, 11],
  [251, 86, 7],
  [255, 0, 110],
  [131, 56, 236],
  [58, 134, 255],
].map(([r, g, b]) => d.vec4f(r / 255, g / 255, b / 255, 1));

const ParticleGeometry = d.struct({
  tilt: d.f32,
  angle: d.f32,
  color: d.vec4f,
});

const ParticleData = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
  seed: d.f32,
});

const geometryLayout = tgpu.vertexLayout(d.arrayOf(ParticleGeometry), 'instance');
const dataLayout = tgpu.vertexLayout(d.arrayOf(ParticleData), 'instance');

const rotate = (v: d.v2f, angle: number) => {
  'use gpu';
  return d.vec2f(
    v.x * std.cos(angle) - v.y * std.sin(angle),
    v.x * std.sin(angle) + v.y * std.cos(angle),
  );
};

function writeRandomPositions(buffer: TgpuBuffer<ReturnType<typeof dataLayout.schemaForCount>>) {
  buffer.write(
    Array.from({ length: PARTICLE_AMOUNT }, () => ({
      position: d.vec2f(Math.random() * 2 - 1, Math.random() * 2 + 1),
      velocity: d.vec2f((Math.random() * 2 - 1) / 50, -(Math.random() / 25 + 0.01)),
      seed: Math.random(),
    })),
  );
}

const computeLayout = tgpu.bindGroupLayout({
  time: { uniform: d.f32 },
  deltaTime: { uniform: d.f32 },
  particleData: { storage: d.arrayOf(ParticleData), access: 'mutable' },
});

const simulate = (idx: number) => {
  'use gpu';
  const particleData = computeLayout.$.particleData[idx];
  const phase = computeLayout.$.time / 300 + particleData.seed;
  particleData.position +=
    (particleData.velocity * computeLayout.$.deltaTime) / 20 +
    d.vec2f(std.sin(phase) / 600, std.cos(phase) / 500);
};

const renderLayout = tgpu.bindGroupLayout({
  time: { uniform: d.f32 },
  aspectRatio: { uniform: d.f32 },
});

const attribs = {
  ...geometryLayout.attrib,
  center: dataLayout.attrib.position,
};

const vertexShader = (input: TgpuVertexFn.AutoIn<typeof attribs>) => {
  'use gpu';
  const width = input.tilt;
  const height = input.tilt / 2;
  const verts = [d.vec2f(0, 0), d.vec2f(width, 0), d.vec2f(0, height), d.vec2f(width, height)];
  const pos = rotate(verts[input.$vertexIndex] / 350, input.angle) + input.center;

  if (renderLayout.$.aspectRatio < 1) {
    pos.x /= renderLayout.$.aspectRatio;
  } else {
    pos.y *= renderLayout.$.aspectRatio;
  }

  return {
    $position: d.vec4f(pos, 0, 1),
    color: input.color,
  } satisfies TgpuVertexFn.AutoOut;
};

function App() {
  const root = useRoot();
  const particleGeometryBuffer = useBuffer(d.arrayOf(ParticleGeometry, PARTICLE_AMOUNT), {
    initial: (buffer) => {
      buffer.write(
        Array.from({ length: PARTICLE_AMOUNT }, () => ({
          angle: Math.floor(Math.random() * 50) - 10,
          tilt: Math.floor(Math.random() * 10) - 20,
          color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        })),
      );
    },
  }).$usage('vertex');
  const particleDataBuffer = useBuffer(d.arrayOf(ParticleData, PARTICLE_AMOUNT), {
    initial: writeRandomPositions,
  }).$usage('storage', 'uniform', 'vertex');
  const aspectRatio = useUniform(d.f32, { initial: 1 });
  const deltaTime = useUniform(d.f32);
  const time = useUniform(d.f32);
  const renderPipeline = useMemo(
    () => root.createRenderPipeline({
      attribs,
      vertex: vertexShader,
      fragment: ({ color }) => {
        'use gpu';
        return color;
      },
      primitive: { topology: 'triangle-strip' },
    }),
    [root],
  );
  const computePipeline = useMemo(() => root.createGuardedComputePipeline(simulate), [root]);
  const computeGroup = useBindGroup(computeLayout, {
    deltaTime: deltaTime.buffer,
    particleData: particleDataBuffer,
    time: time.buffer,
  });
  const renderGroup = useBindGroup(renderLayout, {
    time: time.buffer,
    aspectRatio: aspectRatio.buffer,
  });
  const { ref, ctxRef } = useConfigureContext({ alphaMode: 'premultiplied' });

  useFrame(({ deltaSeconds, elapsedSeconds }) => {
    const context = ctxRef.current;
    if (!context) return;
    const canvas = context.canvas as HTMLCanvasElement;
    time.write(elapsedSeconds * 1000);
    deltaTime.write(deltaSeconds * 1000);
    aspectRatio.write(canvas.width / canvas.height);
    computePipeline.with(computeGroup).dispatchThreads(PARTICLE_AMOUNT);
    renderPipeline
      .with(renderGroup)
      .with(geometryLayout, particleGeometryBuffer)
      .with(dataLayout, particleDataBuffer)
      .withColorAttachment({ view: context })
      .draw(4, PARTICLE_AMOUNT);
  });

  return (
    <div className="confetti-app">
      <canvas ref={ref} className="confetti-canvas" />
      <div className="confetti-controls">
        <button type="button" aria-label="Launch confetti" onClick={() => writeRandomPositions(particleDataBuffer)}>
          🎉
        </button>
      </div>
    </div>
  );
}

// Compatibility bridge for TypeGPU 0.12's guarded-compute helper.
const vec3fPrototype = Object.getPrototypeOf(d.vec3f()) as Record<string, unknown>;
if (!('div' in vec3fPrototype)) {
  Object.defineProperty(vec3fPrototype, 'div', {
    value(this: d.v3f, rhs: d.v3f) {
      return d.vec3f(this.x / rhs.x, this.y / rhs.y, this.z / rhs.z);
    },
  });
}

const reactRoot = createRoot(document.getElementById('example-app') as HTMLDivElement);
reactRoot.render(
  <Root options={{ device: { optionalFeatures: ['timestamp-query'] } }}>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </Root>,
);

export function onCleanup() {
  setTimeout(() => reactRoot.unmount(), 0);
}
