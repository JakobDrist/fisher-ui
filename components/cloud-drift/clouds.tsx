"use client";

// The source in ../original is the supplied TypeGPU implementation. It is
// compiled separately because Turbopack cannot transform TypeGPU's GPU DSL.
export function Clouds() {
  return (
    <iframe
      title="Animated volumetric clouds"
      src="/typegpu-clouds/index.html"
      className="size-full min-h-[24rem] border-0 bg-black"
      allow="webgpu"
    />
  );
}

export default Clouds;
