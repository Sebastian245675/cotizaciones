const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DatabaseService = require('../services/database');

// Middleware para validar errores
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Errores de validación',
      details: errors.array()
    });
  }
  next();
};

// POST /api/auth/login - Iniciar sesión
router.post('/login', [
  body('email').isEmail().withMessage('Email válido requerido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await DatabaseService.get(
      'SELECT * FROM users WHERE email = ? AND status = "active"',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado o inactivo'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña incorrecta'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    // Actualizar último acceso
    await DatabaseService.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Enviar respuesta sin contraseña
    const { password: userPassword, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Inicio de sesión exitoso'
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/auth/register - Registrar nuevo usuario (solo admin)
router.post('/register', [
  body('email').isEmail().withMessage('Email válido requerido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('role').isIn(['admin', 'user']).withMessage('Rol debe ser admin o user')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await DatabaseService.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El usuario ya existe'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = await DatabaseService.run(`
      INSERT INTO users (email, password, name, role, status)
      VALUES (?, ?, ?, ?, 'active')
    `, [email, hashedPassword, name, role]);

    const newUser = await DatabaseService.get(
      'SELECT id, email, name, role, status, created_at FROM users WHERE id = ?',
      [result.id]
    );

    // Agregar a cola de sincronización
    await addToSyncQueue('users', result.id, 'create', newUser);

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error registrando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/auth/change-password - Cambiar contraseña
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres'),
  body('email').isEmail().withMessage('Email válido requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    // Buscar usuario
    const user = await DatabaseService.get(
      'SELECT * FROM users WHERE email = ? AND status = "active"',
      [email]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await DatabaseService.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/auth/verify-token - Verificar token JWT
router.post('/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario para verificar que sigue activo
    const user = await DatabaseService.get(
      'SELECT id, email, name, role, status FROM users WHERE id = ? AND status = "active"',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no válido'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        tokenData: decoded
      },
      message: 'Token válido'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }

    console.error('❌ Error verificando token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/auth/refresh-token - Renovar token
router.post('/refresh-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    // Verificar token expirado
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Decodificar sin verificar para obtener datos del usuario
        decoded = jwt.decode(token);
      } else {
        throw error;
      }
    }

    // Buscar usuario
    const user = await DatabaseService.get(
      'SELECT id, email, name, role, status FROM users WHERE id = ? AND status = "active"',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no válido'
      });
    }

    // Generar nuevo token
    const newToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    res.json({
      success: true,
      data: {
        user,
        token: newToken
      },
      message: 'Token renovado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error renovando token:', error);
    res.status(401).json({
      success: false,
      error: 'No se pudo renovar el token'
    });
  }
});

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await DatabaseService.get(
      'SELECT id, email, name, role, status, created_at, last_login FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
});

// Función helper para agregar a cola de sincronización
async function addToSyncQueue(tableName, recordId, operation, data) {
  try {
    await DatabaseService.run(`
      INSERT INTO sync_queue (table_name, record_id, operation, data, firebase_id)
      VALUES (?, ?, ?, ?, ?)
    `, [
      tableName,
      recordId,
      operation,
      JSON.stringify(data),
      data.firebase_id || null
    ]);
  } catch (error) {
    console.error('❌ Error agregando a cola de sincronización:', error);
  }
}

module.exports = router;