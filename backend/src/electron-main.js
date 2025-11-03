const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  console.log('🚀 Iniciando Electron...');
  console.log('__dirname:', __dirname);
  console.log('app.getAppPath():', app.getAppPath());
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('isDev:', process.env.NODE_ENV === 'development');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false, // No mostrar hasta que esté listo
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: process.env.NODE_ENV === 'development'
    },
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png')
  });

  // Determinar si estamos en desarrollo o producción
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // Múltiples rutas posibles para encontrar index.html
  const possiblePaths = isDev ? [
    // Rutas de desarrollo
    path.join(__dirname, '..', '..', 'dist', 'index.html'),
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html')
  ] : [
    // Rutas de producción (empaquetado)
    path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
    path.join(__dirname, '..', '..', 'dist', 'index.html'),
    path.join(path.dirname(process.execPath), 'resources', 'app.asar', 'dist', 'index.html'),
    path.join(path.dirname(process.execPath), 'resources', 'dist', 'index.html')
  ];

  let indexPath = null;
  
  console.log(`🔍 Buscando index.html (modo: ${isDev ? 'desarrollo' : 'producción'})`);
  
  for (const testPath of possiblePaths) {
    console.log('Probando ruta:', testPath);
    if (fs.existsSync(testPath)) {
      indexPath = testPath;
      console.log('✅ ¡Ruta encontrada!:', indexPath);
      break;
    } else {
      console.log('❌ No existe:', testPath);
    }
  }

  if (!indexPath) {
    console.error('💥 ERROR: No se encontró index.html en ninguna ruta');
    console.error('Rutas probadas:', possiblePaths);
    app.quit();
    return;
  }

  mainWindow.loadFile(indexPath)
    .then(() => {
      console.log('✅ Archivo cargado exitosamente');
      mainWindow.show();
    })
    .catch(err => {
      console.error('💥 Error cargando archivo:', err);
    });

  // Eventos de depuración
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Fallo al cargar:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Carga completada');
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('✅ DOM listo');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Abrir DevTools en desarrollo
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.on('ready', () => {
  console.log('📱 App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('🔴 Cerrando aplicación');
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
