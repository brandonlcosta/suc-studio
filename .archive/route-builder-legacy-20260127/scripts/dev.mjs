#!/usr/bin/env node

import { spawn } from "child_process";
import { createServer } from "vite";
import electron from "electron";

// Start Vite dev server
const server = await createServer({
  configFile: "./vite.config.ts",
  mode: "development",
});

await server.listen();

const address = server.httpServer.address();
const url = `http://localhost:${address.port}`;

console.log(`Vite dev server running at ${url}`);

// Build main process in watch mode (simplified - just build once for now)
spawn("tsc", ["-p", "tsconfig.node.json", "--watch"], {
  stdio: "inherit",
  shell: true,
});

// Wait a bit for TypeScript to compile
await new Promise((resolve) => setTimeout(resolve, 2000));

// Start Electron
const electronProcess = spawn(electron, ["."], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: url,
  },
});

electronProcess.on("exit", () => {
  server.close();
  process.exit(0);
});
