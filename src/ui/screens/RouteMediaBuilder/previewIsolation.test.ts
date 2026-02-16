import assert from "assert/strict";
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "src", "ui", "screens", "RouteMediaBuilder");
const files = fs
  .readdirSync(root)
  .filter((name) => !name.endsWith(".test.ts") && !name.endsWith(".test.tsx"))
  .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
  .map((name) => path.join(root, name));

// API file is part of route-media preview path in studio and is checked for forbidden bindings.
files.push(path.resolve(process.cwd(), "src", "ui", "utils", "api.ts"));

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  assert(!/ffmpeg/i.test(source), `preview path must not invoke ffmpeg: ${filePath}`);
  assert(!/compileRouteMedia/.test(source), `preview path must not call broadcast compile: ${filePath}`);
  assert(
    !/from\s+['"][^'"]*suc-broadcast[^'"]*['"]/.test(source),
    `preview path must not import broadcast modules directly: ${filePath}`
  );
}

console.log("routeMedia preview isolation tests passed");
