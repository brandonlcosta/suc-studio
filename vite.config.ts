import { defineConfig, loadEnv, type Plugin } from "vite";
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/",
    plugins: [react(), startupLog("SUC-STUDIO", 5173)],

    // 🔥 IMPORTANT: remove custom root/publicDir for static hosting
    // root: path.resolve(__dirname, "src/ui"),
    // publicDir: path.resolve(__dirname, "public"),

    define: {
      __APP_ENV__: env.APP_ENV,
    },

    build: {
      outDir: "dist",      // relative to repo root (Render-friendly)
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
  };
});