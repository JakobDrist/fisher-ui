import { defineConfig } from "vite";
import typegpu from "unplugin-typegpu/vite";
export default defineConfig({ root: "gpu/confetti", base: "/typegpu-confetti/", plugins: [typegpu()], build: { target: "esnext", outDir: "../../public/typegpu-confetti", emptyOutDir: true } });
