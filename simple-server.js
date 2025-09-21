const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Datos en memoria (sin SQLite)
let salesData = [];
let productsData = [];
let clientsData = [];

// Cargar datos existentes si existen
try {
  if (fs.existsSync('backend/data.json')) {
    const data = JSON.parse(fs.readFileSync('backend/data.json', 'utf8'));
    salesData = data.sales || [];
    productsData = data.products || [];
    clientsData = data.clients || [];
  }
} catch (error) {
  console.log('Iniciando con datos nuevos...');
}

// Guardar datos
function saveData() {
  try {
    const data = {
      sales: salesData,
      products: productsData,
      clients: clientsData,
      lastUpdate: new Date().toISOString()
    };
    
    if (!fs.existsSync('backend')) {
      fs.mkdirSync('backend', { recursive: true });
    }
    
    fs.writeFileSync('backend/data.json', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error guardando datos:', error);
  }
}

// Servidor HTTP
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    handleAPI(req, res, pathname);
    return;
  }

  // Serve static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, 'dist', filePath);

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found, serve index.html for SPA routing
      filePath = path.join(__dirname, 'dist', 'index.html');
    }

    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - Archivo no encontrado');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

// Handle API requests
function handleAPI(req, res, pathname) {
  res.setHeader('Content-Type', 'application/json');

  if (pathname === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
    return;
  }

  if (pathname === '/api/sales') {
    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(salesData));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const newSale = JSON.parse(body);
          newSale.id = Date.now().toString();
          newSale.timestamp = new Date().toISOString();
          salesData.push(newSale);
          saveData();
          res.writeHead(201);
          res.end(JSON.stringify(newSale));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
    return;
  }

  if (pathname === '/api/products') {
    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(productsData));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const newProduct = JSON.parse(body);
          newProduct.id = Date.now().toString();
          productsData.push(newProduct);
          saveData();
          res.writeHead(201);
          res.end(JSON.stringify(newProduct));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
    return;
  }

  if (pathname === '/api/clients') {
    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(clientsData));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const newClient = JSON.parse(body);
          newClient.id = Date.now().toString();
          clientsData.push(newClient);
          saveData();
          res.writeHead(201);
          res.end(JSON.stringify(newClient));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
    return;
  }

  // 404 for unknown API routes
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

// Start server
server.listen(PORT, () => {
  console.log(`
========================================
    COVENANT POS - SERVIDOR ACTIVO
========================================

✅ Servidor: http://localhost:${PORT}
✅ API: Funcionando
✅ Base de datos: En memoria + archivo JSON
✅ Estado: Completamente funcional

Abra: http://localhost:${PORT}
Para cerrar: Ctrl+C

========================================
  `);

  // Open browser automatically
  const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  require('child_process').exec(start + ' http://localhost:' + PORT);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔴 Cerrando Covenant POS...');
  saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  saveData();
  process.exit(0);
});