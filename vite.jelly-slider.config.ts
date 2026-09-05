import { defineConfig } from "vite";
import typegpu from "unplugin-typegpu/vite";
export default defineConfig({ root: "gpu/jelly-slider", base: "/typegpu-jelly-slider/", plugins: [typegpu()], build: { target: "esnext", outDir: "../../public/typegpu-jelly-slider", emptyOutDir: true } });
