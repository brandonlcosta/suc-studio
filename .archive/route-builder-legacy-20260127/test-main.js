const { app, BrowserWindow } = require("electron");

console.log("app:", app);
console.log("BrowserWindow:", BrowserWindow);

app.whenReady().then(() => {
  console.log("Electron is ready!");
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadFile("dist/renderer/index.html").catch(err => {
    console.error("Failed to load file:", err);
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
