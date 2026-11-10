
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("browserAPI", {
  action: name =>
    ipcRenderer.invoke("browser-action", name),

  getAdBlockState: () =>
    ipcRenderer.invoke("get-adblock-state"),

  setAdBlockState: enabled =>
    ipcRenderer.invoke("set-adblock-state", enabled),

  onState: callback => {
    ipcRenderer.on("browser-state", (_event, state) => {
      callback(state);
    });
  }
});
