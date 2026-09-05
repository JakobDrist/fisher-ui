import { defineConfig } from "vite";
import typegpu from "unplugin-typegpu/vite";
export default defineConfig({ root: "gpu/clouds", base: "/typegpu-clouds/", plugins: [typegpu()], build: { target: "esnext", outDir: "../../public/typegpu-clouds", emptyOutDir: true } });
