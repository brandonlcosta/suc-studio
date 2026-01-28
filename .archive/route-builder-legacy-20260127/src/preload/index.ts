import { contextBridge, ipcRenderer } from "electron";

const invoke = (channel: string, ...args: any[]) => {
  return ipcRenderer.invoke(channel, ...args);
};

contextBridge.exposeInMainWorld("electron", {
  invoke,
});

contextBridge.exposeInMainWorld("electronAPI", {
  invoke,
});
