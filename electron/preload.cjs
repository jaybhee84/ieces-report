const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipc', {
  login: (creds) => ipcRenderer.invoke('auth:login', creds),
  mooe: {
    getAll: () => ipcRenderer.invoke('mooe:getAll'),
    save: (entry) => ipcRenderer.invoke('mooe:save', entry),
    delete: (key) => ipcRenderer.invoke('mooe:delete', key),
  },
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
})
