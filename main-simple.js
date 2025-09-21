const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    show: false
  });

  // Iniciar servidor Express integrado
  const expressApp = express();
  const PORT = 3001;

  // Servir archivos estáticos
  expressApp.use(express.static(path.join(__dirname, 'dist')));
  
  // API básica
  expressApp.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
  });

  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  server = expressApp.listen(PORT, () => {
    console.log('Server started on port', PORT);
    mainWindow.loadURL(`http://localhost:${PORT}`);
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) server.close();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});