const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Información de la aplicación
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Control del backend
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  
  // Notificaciones del sistema
  showNotification: (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },

  // Estado de la aplicación
  isElectron: true,
  platform: process.platform,

  // Eventos del sistema
  onAppReady: (callback) => ipcRenderer.on('app-ready', callback),
  onBackendStatus: (callback) => ipcRenderer.on('backend-status', callback),
  
  // Remover listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});