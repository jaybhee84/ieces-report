const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipc', {
  login: (creds) => ipcRenderer.invoke('auth:login', creds),
  mooe: {
    getAll: () => ipcRenderer.invoke('mooe:getAll'),
    save: (entry) => ipcRenderer.invoke('mooe:save', entry),
    delete: (key) => ipcRenderer.invoke('mooe:delete', key),
  },
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    quitAndInstall: () => ipcRenderer.invoke('update:quitAndInstall'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (_, info) => callback(info)),
    onError: (callback) => ipcRenderer.on('update:error', (_, error) => callback(error)),
  }
})