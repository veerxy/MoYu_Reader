const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  onMaximizedChange: (callback) => {
    const handler = (event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized-state', handler);
    return () => {
      ipcRenderer.removeListener('window-maximized-state', handler);
    };
  },
});
