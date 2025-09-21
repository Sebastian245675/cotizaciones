const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;
const PORT = 3001;

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    resizable: true,
    minimizable: true,
    maximizable: true
  });

  // Ocultar menu por defecto
  Menu.setApplicationMenu(null);

  // Iniciar servidor backend
  startBackendServer();
  
  // Cargar aplicación después de que el servidor esté listo
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:' + PORT);
    mainWindow.show();
    mainWindow.maximize();
  }, 3000);

  // Manejar cierre de ventana
  mainWindow.on('closed', () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    mainWindow = null;
  });

  // Prevenir navegación externa
  mainWindow.webContents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
}

function startBackendServer() {
  try {
    // Usar el servidor simple que ya creamos
    const serverPath = path.join(__dirname, 'simple-server.js');
    
    serverProcess = spawn('node', [serverPath], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
      console.log('Backend:', data.toString());
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Backend Error:', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('Error starting backend:', err);
    });

    console.log('Backend server iniciado en puerto', PORT);
  } catch (error) {
    console.error('Error iniciando servidor:', error);
  }
}

// Configuración de la aplicación
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Evitar múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}