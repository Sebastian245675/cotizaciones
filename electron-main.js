const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = require('electron-is-dev');

// Variables globales
let mainWindow;
let backendProcess;
let splashWindow;

// Configuración de seguridad
const FRONTEND_URL = isDev ? 'http://localhost:8080' : `file://${path.join(__dirname, 'dist/index.html')}`;
const BACKEND_PORT = 3001;

// Función para crear ventana splash
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // HTML simple para splash
  splashWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
          }
          .logo {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .loading {
            font-size: 1.2em;
            margin-bottom: 30px;
            opacity: 0.9;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .status {
            margin-top: 20px;
            font-size: 0.9em;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div class="logo">💰 COVENANT POS</div>
        <div class="loading">Iniciando sistema...</div>
        <div class="spinner"></div>
        <div class="status">Arrancando backend y base de datos</div>
      </body>
    </html>
  `);

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// Función para iniciar el backend
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Iniciando backend...');
    
    const backendPath = isDev 
      ? path.join(__dirname, 'backend', 'src', 'server.js')
      : path.join(process.resourcesPath, 'backend', 'src', 'server.js');

    const nodeExecutable = isDev 
      ? 'node' 
      : path.join(process.resourcesPath, 'node.exe');

    backendProcess = spawn(nodeExecutable, [backendPath], {
      cwd: isDev ? path.join(__dirname, 'backend') : path.join(process.resourcesPath, 'backend'),
      env: {
        ...process.env,
        NODE_ENV: isDev ? 'development' : 'production',
        PORT: BACKEND_PORT
      }
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data.toString()}`);
      
      // Buscar el mensaje que indica que el servidor está listo
      if (data.toString().includes('COVENANT POS BACKEND INICIADO') || 
          data.toString().includes(`Servidor corriendo en: http://localhost:${BACKEND_PORT}`)) {
        console.log('✅ Backend iniciado correctamente');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data.toString()}`);
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Error iniciando backend:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend cerrado con código: ${code}`);
      if (code !== 0 && code !== null) {
        reject(new Error(`Backend falló con código: ${code}`));
      }
    });

    // Timeout de 30 segundos para iniciar backend
    setTimeout(() => {
      reject(new Error('Timeout: Backend tardó demasiado en iniciar'));
    }, 30000);
  });
}

// Función para verificar que el backend responde
function waitForBackend() {
  return new Promise((resolve, reject) => {
    const maxAttempts = 60; // 30 segundos máximo
    let attempts = 0;

    const checkBackend = () => {
      attempts++;
      
      fetch(`http://localhost:${BACKEND_PORT}/api/health`)
        .then(response => {
          if (response.ok) {
            console.log('✅ Backend respondiendo correctamente');
            resolve();
          } else {
            throw new Error('Backend no responde correctamente');
          }
        })
        .catch(() => {
          if (attempts >= maxAttempts) {
            reject(new Error('Backend no respondió después de 30 segundos'));
          } else {
            setTimeout(checkBackend, 500);
          }
        });
    };

    checkBackend();
  });
}

// Función para crear la ventana principal
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    show: false, // No mostrar hasta que esté lista
    icon: path.join(__dirname, 'assets', 'icon.png'), // Opcional: agregar ícono
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    }
  });

  // Cargar la aplicación
  mainWindow.loadURL(FRONTEND_URL);

  // Mostrar cuando esté lista
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
    
    // En desarrollo, abrir DevTools
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Manejar enlaces externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Función para crear el menú
function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
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
              message: 'Covenant POS v1.0.0',
              detail: 'Sistema de Punto de Venta con funcionalidad offline.\n\nDesarrollado para funcionar sin conexión a internet.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventos de la aplicación
app.whenReady().then(async () => {
  console.log('🚀 Electron iniciado');
  
  // Crear ventana splash
  createSplashWindow();
  
  try {
    // Iniciar backend
    await startBackend();
    
    // Esperar que backend responda
    await waitForBackend();
    
    // Crear ventana principal y menú
    createMainWindow();
    createMenu();
    
    console.log('✅ Aplicación iniciada completamente');
    
  } catch (error) {
    console.error('❌ Error iniciando aplicación:', error);
    
    if (splashWindow) {
      splashWindow.close();
    }
    
    dialog.showErrorBox(
      'Error de Inicialización', 
      `No se pudo iniciar el sistema:\n\n${error.message}\n\nLa aplicación se cerrará.`
    );
    
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Cerrar backend al salir
app.on('before-quit', () => {
  if (backendProcess) {
    console.log('🔄 Cerrando backend...');
    backendProcess.kill('SIGTERM');
    
    // Forzar cierre si no responde en 5 segundos
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  
  dialog.showErrorBox(
    'Error Crítico',
    `Se produjo un error inesperado:\n\n${error.message}`
  );
});

console.log('📱 Electron main process iniciado');