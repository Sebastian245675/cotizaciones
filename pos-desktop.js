const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;
const BACKEND_PORT = 8080;

// Detectar si estamos en desarrollo o empaquetado
const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;

// Función para iniciar el servidor backend
function startBackendServer() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Iniciando servidor backend...');
    
    // Rutas según el entorno
    const backendPath = isDev 
      ? path.join(__dirname, 'backend', 'src', 'server.js')
      : path.join(resourcesPath, 'backend', 'src', 'server.js');
    
    const backendDir = isDev
      ? path.join(__dirname, 'backend')
      : path.join(resourcesPath, 'backend');

    console.log('Backend path:', backendPath);
    console.log('Backend dir:', backendDir);
    
    // Verificar que el archivo del backend existe
    if (!fs.existsSync(backendPath)) {
      console.error('❌ No se encontró el archivo del backend:', backendPath);
      reject(new Error('Backend no encontrado'));
      return;
    }

    // Configurar variables de entorno para el backend
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: BACKEND_PORT,
      DB_PATH: path.join(backendDir, 'data'),
      DISABLE_WHATSAPP: 'true', // Deshabilitar WhatsApp para modo offline
      OFFLINE_MODE: 'true'
    };

    console.log('🔄 Iniciando proceso del backend...');

    // Iniciar el proceso del backend
    backendProcess = spawn('node', [backendPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: backendDir
    });

    let backendReady = false;

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Backend] ${output}`);
      if ((output.includes('Server running') || output.includes('listening') || output.includes('started')) && !backendReady) {
        console.log('✅ Servidor backend iniciado correctamente');
        backendReady = true;
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString()}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`❌ Proceso backend cerrado con código: ${code}`);
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Error iniciando backend:', error);
      reject(error);
    });

    // Timeout si el backend no inicia en 15 segundos
    setTimeout(() => {
      if (!backendReady) {
        console.log('✅ Backend timeout - asumiendo que está listo');
        resolve();
      }
    }, 15000);
  });
}

// Función para crear la ventana principal
async function createMainWindow() {
  console.log('🔄 Creando ventana principal...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Mostrar ventana de carga
  await mainWindow.loadURL(`data:text/html,
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
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .loading {
            font-size: 1.2em;
            margin-bottom: 30px;
          }
          .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="logo">Covenant POS</div>
        <div class="loading">Iniciando aplicación de escritorio...</div>
        <div class="spinner"></div>
      </body>
    </html>
  `);

  mainWindow.show();

  // Esperar a que el backend esté listo
  try {
    await startBackendServer();
    console.log('✅ Backend iniciado, cargando frontend...');
    
    // Cargar desde los archivos dist
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Frontend path:', indexPath);
    
    if (fs.existsSync(indexPath)) {
      await mainWindow.loadFile(indexPath);
    } else {
      console.error('❌ No se encontró el build del frontend');
      await mainWindow.loadURL(`data:text/html,
        <html>
          <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>Error: Frontend no construido</h1>
            <p>No se encontró el archivo: ${indexPath}</p>
            <p>Ejecuta 'npm run build' primero</p>
          </body>
        </html>
      `);
    }
    
    console.log('✅ Aplicación de escritorio iniciada correctamente');
    
  } catch (error) {
    console.error('❌ Error iniciando la aplicación:', error);
    
    await mainWindow.loadURL(`data:text/html,
      <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
          <h1>Error al iniciar Covenant POS</h1>
          <p>No se pudo iniciar el servidor backend.</p>
          <p>Error: ${error.message}</p>
          <button onclick="window.location.reload()">Reintentar</button>
        </body>
      </html>
    `);
  }

  // Manejar cierre de ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (backendProcess) {
      console.log('🔄 Cerrando servidor backend...');
      backendProcess.kill();
    }
  });
}

// Manejo de eventos de la aplicación
app.whenReady().then(() => {
  console.log('🚀 Covenant POS Desktop iniciando...');
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

console.log('🚀 Iniciando Covenant POS Desktop...');