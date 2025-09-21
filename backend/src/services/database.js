const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || './data/pos_local.db';
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      // Asegurar que el directorio data existe
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error abriendo base de datos:', err);
          reject(err);
        } else {
          console.log('✅ Conectado a la base de datos SQLite');
          this.createTables()
            .then(() => {
              console.log('✅ Tablas de base de datos verificadas/creadas');
              resolve();
            })
            .catch(reject);
        }
      });

      // Configurar la base de datos para mejor rendimiento
      // 🚨 TEMPORAL: Deshabilitando foreign keys para permitir ventas mientras sincronizamos
      this.db.run('PRAGMA foreign_keys = OFF');
      this.db.run('PRAGMA journal_mode = WAL');
      this.db.run('PRAGMA synchronous = NORMAL');
      this.db.run('PRAGMA cache_size = 1000');
      this.db.run('PRAGMA temp_store = MEMORY');
    });
  }

  async createTables() {
    const tables = [
      // Tabla de usuarios
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'cashier',
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de categorías
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_id TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de productos
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_id TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        category_id INTEGER,
        barcode TEXT UNIQUE,
        image_url TEXT,
        brand TEXT,
        supplier TEXT,
        margin DECIMAL(5,2),
        reward_points INTEGER DEFAULT 0,
        reward_type TEXT DEFAULT 'fixed',
        sale_type TEXT DEFAULT 'unit',
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // Tabla de clientes
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_id TEXT UNIQUE,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        dni TEXT,
        tax_id TEXT,
        customer_type TEXT DEFAULT 'individual',
        credit_limit DECIMAL(10,2) DEFAULT 0,
        client_code TEXT UNIQUE,
        points INTEGER DEFAULT 0,
        total_purchases DECIMAL(10,2) DEFAULT 0,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de cortes de caja
      `CREATE TABLE IF NOT EXISTS cash_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_id TEXT UNIQUE,
        user_email TEXT NOT NULL,
        date DATE NOT NULL,
        opening_balance DECIMAL(10,2) NOT NULL,
        closing_balance DECIMAL(10,2),
        actual_cash DECIMAL(10,2),
        total_sales DECIMAL(10,2) DEFAULT 0,
        total_cash_sales DECIMAL(10,2) DEFAULT 0,
        total_card_sales DECIMAL(10,2) DEFAULT 0,
        total_transfer_sales DECIMAL(10,2) DEFAULT 0,
        total_credit_sales DECIMAL(10,2) DEFAULT 0,
        total_inflows DECIMAL(10,2) DEFAULT 0,
        total_outflows DECIMAL(10,2) DEFAULT 0,
        discrepancy DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'open',
        notes TEXT,
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de ventas
      `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_id TEXT UNIQUE,
        sale_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        cash_report_id INTEGER,
        subtotal DECIMAL(10,2) NOT NULL,
        discounts DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        payment_details TEXT,
        status TEXT DEFAULT 'completed',
        cashier TEXT NOT NULL,
        notes TEXT,
        mode TEXT DEFAULT 'advanced',
        sale_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (cash_report_id) REFERENCES cash_reports (id)
      )`,

      // Tabla de items de venta
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity DECIMAL(8,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        discount_type TEXT DEFAULT 'percentage',
        subtotal DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // Tabla de movimientos de caja
      `CREATE TABLE IF NOT EXISTS cash_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_id TEXT UNIQUE,
        cash_report_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'inflow' or 'outflow'
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        reference TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cash_report_id) REFERENCES cash_reports (id)
      )`,

      // Tabla de cola de sincronización
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        operation TEXT NOT NULL, -- 'create', 'update', 'delete'
        data TEXT, -- JSON data
        firebase_id TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        last_error TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de configuración del sistema
      `CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Crear todas las tablas
    for (const tableSQL of tables) {
      await this.run(tableSQL);
    }

    // Crear índices para mejor rendimiento
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_customers_client_code ON customers(client_code)',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
      'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)',
      'CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier)',
      'CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_cash_reports_user ON cash_reports(user_email)',
      'CREATE INDEX IF NOT EXISTS idx_cash_reports_date ON cash_reports(date)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name)'
    ];

    for (const indexSQL of indexes) {
      await this.run(indexSQL);
    }

    // Insertar configuraciones por defecto
    await this.insertDefaultConfig();
  }

  async insertDefaultConfig() {
    const defaultConfigs = [
      { key: 'app_version', value: '1.0.0', description: 'Versión de la aplicación' },
      { key: 'tax_rate', value: '21', description: 'Tasa de IVA por defecto' },
      { key: 'currency', value: 'ARS', description: 'Moneda por defecto' },
      { key: 'company_name', value: 'Covenant Argentina', description: 'Nombre de la empresa' },
      { key: 'last_sync', value: '', description: 'Timestamp de la última sincronización' },
      { key: 'offline_mode', value: 'true', description: 'Modo offline activado' },
      { key: 'auto_backup', value: 'true', description: 'Respaldos automáticos activados' },
      { key: 'backup_interval_hours', value: '6', description: 'Intervalo de respaldos en horas' }
    ];

    for (const config of defaultConfigs) {
      await this.run(
        `INSERT OR IGNORE INTO system_config (key, value, description) VALUES (?, ?, ?)`,
        [config.key, config.value, config.description]
      );
    }

    // Crear usuario admin por defecto si no existe
    const adminExists = await this.get('SELECT id FROM users WHERE email = ?', ['admin@covenant.com']);
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const defaultPassword = await bcrypt.hash('admin123', 10);
      
      await this.run(
        `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
        ['admin@covenant.com', defaultPassword, 'Administrador', 'admin']
      );
      
      console.log('✅ Usuario administrador creado: admin@covenant.com / admin123');
    }
  }

  // Métodos helper para promisificar sqlite3
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Error ejecutando SQL:', sql, err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Error ejecutando SQL:', sql, err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Error ejecutando SQL:', sql, err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Transacciones
  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
  }

  async commit() {
    await this.run('COMMIT');
  }

  async rollback() {
    await this.run('ROLLBACK');
  }

  // Cerrar conexión
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('💾 Conexión de base de datos cerrada');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Obtener instancia singleton
  getDatabase() {
    return this.db;
  }

  // Ejecutar backup
  async backup(backupPath) {
    return new Promise((resolve, reject) => {
      const backup = this.db.backup(backupPath);
      backup.step(-1, (err) => {
        if (err) {
          reject(err);
        } else {
          backup.finish((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  // Estadísticas de la base de datos
  async getStats() {
    const stats = {};
    
    const tables = [
      'users', 'categories', 'products', 'customers', 
      'cash_reports', 'sales', 'sale_items', 'cash_movements', 'sync_queue'
    ];

    for (const table of tables) {
      const result = await this.get(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = result.count;
    }

    // Tamaño de la base de datos
    try {
      const dbStats = fs.statSync(this.dbPath);
      stats.database_size_mb = (dbStats.size / (1024 * 1024)).toFixed(2);
    } catch (error) {
      stats.database_size_mb = 'N/A';
    }

    return stats;
  }
}

// Crear instancia singleton
const databaseService = new DatabaseService();

module.exports = databaseService;