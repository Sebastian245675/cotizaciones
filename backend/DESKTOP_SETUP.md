# 🖥️ Desktop Application Configuration

## Electron Setup

Configura Electron para crear una aplicación de escritorio completa.

### Instalación de Electron

```powershell
# Instalar Electron como dependencia de desarrollo
npm install --save-dev electron

# Instalar Electron Builder para empaquetado
npm install --save-dev electron-builder

# Instalar utilidades adicionales
npm install --save-dev electron-is-dev
npm install --save-dev wait-on
npm install --save-dev concurrently
```

### Estructura de archivos para Electron

```
desktop/
├── main.js              # Proceso principal de Electron
├── preload.js           # Script de preload para seguridad
├── renderer.js          # Scripts del proceso renderer
├── icon.ico             # Icono de la aplicación (Windows)
├── icon.png             # Icono de la aplicación (Linux)
├── icon.icns            # Icono de la aplicación (macOS)
└── installer/           # Scripts del instalador
    ├── windows.js
    ├── mac.js
    └── linux.js
```

## Configuración main.js

```javascript
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  // Crear ventana principal
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Cargar aplicación
  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Configurar menú
  createMenu();

  // DevTools en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const backendPath = path.join(__dirname, '../src/server.js');
  
  backendProcess = spawn('node', [backendPath], {
    env: { ...process.env, NODE_ENV: 'production' }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
}

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nueva Venta',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-sale');
          }
        },
        { type: 'separator' },
        {
          label: 'Backup',
          click: () => {
            mainWindow.webContents.send('menu-action', 'backup');
          }
        },
        {
          label: 'Restaurar Backup',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Database Backups', extensions: ['db'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-action', 'restore-backup', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar Recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de Desarrollo' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla Completa' }
      ]
    },
    {
      label: 'POS',
      submenu: [
        {
          label: 'Abrir Caja',
          click: () => {
            mainWindow.webContents.send('menu-action', 'open-cash-register');
          }
        },
        {
          label: 'Cerrar Caja',
          click: () => {
            mainWindow.webContents.send('menu-action', 'close-cash-register');
          }
        },
        { type: 'separator' },
        {
          label: 'Sincronizar',
          click: () => {
            mainWindow.webContents.send('menu-action', 'sync');
          }
        },
        {
          label: 'Modo Offline',
          type: 'checkbox',
          checked: true,
          click: (menuItem) => {
            mainWindow.webContents.send('menu-action', 'toggle-offline', menuItem.checked);
          }
        }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Acerca de Covenant POS',
              message: 'Covenant POS',
              detail: 'Sistema de Punto de Venta Offline\nVersión 1.0.0'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Iniciar backend
  startBackend();
  
  // Esperar un momento para que el backend inicie
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});
```

## Configuración preload.js

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Versión de la aplicación
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Diálogos
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Eventos del menú
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action, data) => {
      callback(action, data);
    });
  },
  
  // Notificaciones
  showNotification: (title, body) => {
    new Notification(title, { body });
  }
});
```

## Scripts package.json adicionales

```json
{
  "main": "desktop/main.js",
  "scripts": {
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron-pack": "electron-builder",
    "preelectron-pack": "npm run build"
  },
  "build": {
    "appId": "com.covenant.pos",
    "productName": "Covenant POS",
    "directories": {
      "output": "dist"
    },
    "files": [
      "build/**/*",
      "backend/**/*",
      "desktop/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "desktop/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "desktop/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "desktop/icon.png"
    },
    "nsis": {
      "installerIcon": "desktop/icon.ico",
      "uninstallerIcon": "desktop/icon.ico",
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

## Instrucciones de Compilación

### Para Desarrollo
```powershell
# Ejecutar en modo desarrollo
npm run electron-dev
```

### Para Producción
```powershell
# Construir aplicación web
npm run build

# Empaquetar aplicación de escritorio
npm run electron-pack
```

## Funcionalidades Integradas

### ✅ Backend Embebido
- Servidor Node.js inicia automáticamente
- Base de datos SQLite integrada
- APIs REST disponibles localmente

### ✅ Modo Offline Completo
- Funciona sin conexión a internet
- Datos almacenados localmente
- Sincronización automática cuando hay conexión

### ✅ Backups Automáticos
- Backups programados diarios
- Restauración desde menú
- Exportación de datos

### ✅ Interfaz Nativa
- Menús de sistema
- Atajos de teclado
- Notificaciones del sistema
- Diálogos nativos

### ✅ Seguridad
- Aislamiento de contexto
- APIs controladas
- Sin acceso directo a Node.js desde renderer

## Instalación Final

1. **Instalar dependencias**:
   ```powershell
   npm install
   ```

2. **Probar en desarrollo**:
   ```powershell
   npm run electron-dev
   ```

3. **Compilar para distribución**:
   ```powershell
   npm run build
   npm run electron-pack
   ```

4. **Archivo ejecutable**:
   - Windows: `dist/Covenant POS Setup.exe`
   - macOS: `dist/Covenant POS.dmg`
   - Linux: `dist/Covenant POS.AppImage`

El sistema estará completamente funcional como aplicación de escritorio offline con todas las capacidades del POS integradas.