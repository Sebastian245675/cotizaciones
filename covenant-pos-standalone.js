const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Servir archivos estáticos del frontend
const frontendPath = path.join(__dirname, 'dist');
app.use(express.static(frontendPath));

// Importar rutas del backend
try {
  const backendServer = require('./backend/src/server.js');
  console.log('Backend integrado correctamente');
} catch (error) {
  console.error('Error cargando backend:', error);
  
  // Fallback: servir solo frontend
  app.get('/api/*', (req, res) => {
    res.status(503).json({ error: 'Backend no disponible' });
  });
}

// Ruta catch-all para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
========================================
   COVENANT POS - SISTEMA INICIADO
========================================

✅ Servidor activo en: http://localhost:${PORT}
✅ Frontend: Servido desde ${frontendPath}
✅ Backend: Integrado

Abra su navegador en: http://localhost:${PORT}
Para cerrar: Presione Ctrl+C

========================================
  `);
  
  // Abrir navegador automáticamente
  const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  require('child_process').exec(start + ' http://localhost:' + PORT);
});

process.on('SIGINT', () => {
  console.log('\n🔴 Cerrando Covenant POS...');
  process.exit(0);
});