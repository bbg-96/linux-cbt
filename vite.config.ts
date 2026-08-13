import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "node_modules/v86/build/v86.wasm", dest: "vm" },
        { src: "node_modules/v86/build/v86-fallback.wasm", dest: "vm" },
      ],
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
