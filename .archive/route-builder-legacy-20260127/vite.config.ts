import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "src/renderer",
  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: true,
    target: "es2020",
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
    esbuildOptions: {
      target: "es2020",
    },
  },
  base: "./",
});
