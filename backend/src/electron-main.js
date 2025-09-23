const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

class ConectingGroupApp {
  constructor() {
    this.mainWindow = null;
    this.backendProcess = null;
    this.isQuitting = false;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false,
      titleBarStyle: 'default',
      title: 'Conecting Group - Sistema de Gestión',
      autoHideMenuBar: !isDev
    });

    // URL del frontend React
    const frontendUrl = isDev 
      ? 'http://localhost:5173' 
      : 'http://localhost:3001'; // El backend sirve el frontend en producción

    this.mainWindow.loadURL(frontendUrl);

    // Mostrar ventana cuando esté lista
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      if (isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Manejar cierre de ventana
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Prevenir cierre accidental
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // Abrir enlaces externos en el navegador
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  async startBackendServer() {
    try {
      console.log('Iniciando servidor backend...');
      
      // Ruta al servidor Node.js
      const serverPath = path.join(__dirname, 'server.js');
      
      this.backendProcess = spawn('node', [serverPath], {
        stdio: isDev ? 'inherit' : 'pipe',
        env: {
          ...process.env,
          NODE_ENV: isDev ? 'development' : 'production',
          PORT: '3001',
          ELECTRON_MODE: 'true' // Indicar que estamos en modo Electron
        }
      });

      this.backendProcess.on('error', (error) => {
        console.error('Error al iniciar el backend:', error);
      });

      this.backendProcess.on('exit', (code) => {
        console.log(`Proceso backend terminó con código: ${code}`);
        if (code !== 0 && !this.isQuitting) {
          // Reintentar iniciar el backend
          setTimeout(() => this.startBackendServer(), 5000);
        }
      });

      // Esperar a que el servidor esté listo
      await this.waitForServer();
      console.log('Backend iniciado correctamente en puerto 3001');
      
    } catch (error) {
      console.error('Error al iniciar el backend:', error);
    }
  }

  waitForServer(retries = 30) {
    return new Promise((resolve, reject) => {
      const http = require('http');
      
      const checkServer = () => {
        const req = http.get('http://localhost:3001/api/health', (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            retryCheck();
          }
        });

        req.on('error', () => {
          retryCheck();
        });

        req.setTimeout(1000, () => {
          req.destroy();
          retryCheck();
        });
      };

      const retryCheck = () => {
        if (retries > 0) {
          retries--;
          setTimeout(checkServer, 1000);
        } else {
          reject(new Error('Timeout esperando al servidor backend'));
        }
      };

      checkServer();
    });
  }

  stopBackendServer() {
    if (this.backendProcess) {
      console.log('Deteniendo servidor backend...');
      this.backendProcess.kill();
      this.backendProcess = null;
    }
  }

  createMenu() {
    const template = [
      {
        label: 'Archivo',
        submenu: [
          {
            label: 'Nuevo',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              // Implementar nueva funcionalidad
            }
          },
          { type: 'separator' },
          {
            label: 'Salir',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.isQuitting = true;
              app.quit();
            }
          }
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
          { role: 'toggleDevTools', label: 'Herramientas de Desarrollador' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom Normal' },
          { role: 'zoomIn', label: 'Acercar' },
          { role: 'zoomOut', label: 'Alejar' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Pantalla Completa' }
        ]
      },
      {
        label: 'Ayuda',
        submenu: [
          {
            label: 'Acerca de Conecting Group',
            click: () => {
              shell.openExternal('https://conectinggroup.com');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupAppEvents() {
    app.whenReady().then(async () => {
      // Iniciar backend primero
      await this.startBackendServer();
      
      // Crear ventana principal
      this.createWindow();
      this.createMenu();

      // Configurar auto-updater
      // if (!isDev) {
      //   autoUpdater.checkForUpdatesAndNotify();
      // }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.isQuitting = true;
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      } else if (this.mainWindow) {
        this.mainWindow.show();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
      this.stopBackendServer();
    });
  }

  setupIPC() {
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('restart-backend', async () => {
      this.stopBackendServer();
      await this.startBackendServer();
      return { success: true };
    });
  }

  init() {
    this.setupAppEvents();
    this.setupIPC();
  }
}

// Crear e inicializar la aplicación
const conectingApp = new ConectingGroupApp();
conectingApp.init();