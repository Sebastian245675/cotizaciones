const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;
const BACKEND_PORT = 8080;
const FRONTEND_PORT = 5173;

// Función para iniciar el servidor backend
function startBackendServer() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Iniciando servidor backend...');
    
    const backendPath = path.join(__dirname, 'backend', 'src', 'server.js');
    
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
      DB_PATH: path.join(__dirname, 'backend', 'data'),
      DISABLE_WHATSAPP: 'true', // Deshabilitar WhatsApp para modo offline
      OFFLINE_MODE: 'true'
    };

    // Iniciar el proceso del backend
    backendProcess = spawn('node', [backendPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, 'backend')
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString()}`);
      if (data.toString().includes('Server running') || data.toString().includes('listening')) {
        console.log('✅ Servidor backend iniciado correctamente');
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

    // Timeout si el backend no inicia en 10 segundos
    setTimeout(() => {
      console.log('✅ Backend timeout - asumiendo que está listo');
      resolve();
    }, 10000);
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
    autoHideMenuBar: true
  });

  // Mostrar ventana inmediatamente para debug
  mainWindow.show();
  mainWindow.webContents.openDevTools();

  // Cargar una página de loading primero
  await mainWindow.loadURL(`data:text/html,
    <html>
      <body style="font-family: Arial; padding: 20px; text-align: center; background: #1a1a1a; color: white;">
        <h1>🚀 Iniciando Covenant POS Desktop</h1>
        <p>Cargando servidor backend...</p>
        <div style="margin: 20px 0;">
          <div style="width: 200px; height: 4px; background: #333; margin: 0 auto; border-radius: 2px;">
            <div style="width: 50%; height: 100%; background: #4CAF50; border-radius: 2px; animation: pulse 1s infinite;"></div>
          </div>
        </div>
        <style>
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        </style>
      </body>
    </html>
  `);

  // Esperar a que el backend esté listo
  try {
    await startBackendServer();
    console.log('✅ Backend iniciado, cargando frontend...');
    
    // Cargar desde los archivos dist
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('📁 Buscando frontend en:', indexPath);
    
    if (fs.existsSync(indexPath)) {
      console.log('✅ Frontend encontrado, cargando...');
      await mainWindow.loadFile(indexPath);
      console.log('✅ Frontend cargado exitosamente');
    } else {
      console.error('❌ No se encontró el build del frontend');
      await mainWindow.loadURL(`data:text/html,<h1>Error: Frontend no construido</h1><p>Ejecuta 'npm run build' primero</p>`);
    }
    
    mainWindow.show();
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
    
    mainWindow.show();
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
app.whenReady().then(createMainWindow);

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