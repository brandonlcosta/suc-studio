import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const startupLog = (label: string, port: number): Plugin => ({
  name: `${label}-startup-log`,
  configureServer(server) {
    const protocol = server.config.server.https ? "https" : "http";
    const resolvedPort = server.config.server.port ?? port;
    server.httpServer?.once("listening", () => {
      console.log(
        `[${label}] running at ${protocol}://localhost:${resolvedPort}`
      );
    });
  },
});

export default defineConfig({
  base: "/",
  plugins: [react(), startupLog("SUC-STUDIO", 5173)],
  root: path.resolve(__dirname, "src/ui"),
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../suc-shared-data"),
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
