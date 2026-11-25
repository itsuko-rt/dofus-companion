// The only bridge between the companion window and the main process: a few named calls, no Node access.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('atlas', {
  onState: (f) => ipcRenderer.on('state', (_e, s) => f(s)),
  capture: () => ipcRenderer.invoke('capture'),
  stop: (v) => ipcRenderer.invoke('stop', v),
  set: (patch) => ipcRenderer.invoke('set', patch),
  reloadCatalog: () => ipcRenderer.invoke('reloadCatalog'),
});
