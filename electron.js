const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Variables globales
let mainWindow;
let backendProcess;

// Configuración
const BACKEND_PORT = 3001;

console.log('🚀 Iniciando aplicación POS...');

// Función para iniciar el backend
function startBackend() {
  console.log('� Iniciando backend...');
  
  const backendPath = path.join(__dirname, 'backend');
  const serverPath = path.join(backendPath, 'src', 'server.js');
  
  console.log('� Ruta del backend:', backendPath);
  console.log('📄 Ruta del servidor:', serverPath);
  
  // Verificar que el archivo del servidor existe
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ Backend server not found at ${serverPath}`);
    return false;
  }
  
  // Iniciar proceso del backend
  backendProcess = spawn('node', [serverPath], {
    cwd: backendPath,
    stdio: 'inherit' // Mostrar logs del backend en la consola
  });
  
  backendProcess.on('error', (error) => {
    console.error(`❌ [BACKEND] Error: ${error.message}`);
  });
  
  console.log('✅ Backend process started');
  return true;
}

// Función para crear la ventana principal
function createWindow() {
  console.log('🖥️ Creando ventana principal...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Permitir conexiones locales
    },
    show: false // No mostrar hasta que esté listo
  });
  
  // Verificar si existe el build del frontend
  const distPath = path.join(__dirname, 'dist', 'index.html');
  
  if (fs.existsSync(distPath)) {
    console.log('📦 Cargando desde build de producción');
    mainWindow.loadFile(distPath);
  } else {
    console.log('🌐 Cargando desde servidor de desarrollo');
    mainWindow.loadURL('http://localhost:5173');
  }
  
  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Ventana lista para mostrar');
    mainWindow.show();
    
    // Abrir DevTools en desarrollo
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Función principal de inicialización
async function initialize() {
  try {
    console.log('🚀 Inicializando servicios...');
    
    // Esperar un poco para que Electron esté completamente listo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 1. Iniciar backend
    const backendStarted = startBackend();
    if (!backendStarted) {
      throw new Error('No se pudo iniciar el backend');
    }
    
    // 2. Esperar un poco para que el backend se inicie
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Crear ventana
    createWindow();
    
    console.log('🎉 Aplicación POS iniciada correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
    app.quit();
  }
}

// Eventos de la aplicación
app.whenReady().then(() => {
  console.log('🟢 Electron listo, iniciando aplicación...');
  initialize();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  console.log('🔚 Todas las ventanas cerradas');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('🔚 Cerrando aplicación...');
  
  // Terminar proceso del backend
  if (backendProcess && !backendProcess.killed) {
    console.log('⏹️ Terminando backend...');
    backendProcess.kill('SIGTERM');
  }
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

console.log('📋 Archivo electron.js cargado correctamente');