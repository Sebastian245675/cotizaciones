const DatabaseService = require('./database');
const moment = require('moment');
const cron = require('node-cron');

class CashRegisterAutoCloseService {
  constructor(io = null) {
    this.db = DatabaseService;
    this.io = io; // Socket.IO instance for real-time notifications
    console.log('🏦 CashRegisterAutoCloseService inicializado');
  }

  // Inicializar el servicio de auto-cierre
  start() {
    console.log('🚀 Iniciando servicio de auto-cierre de caja registradora...');
    
    // Verificar cada 30 minutos si hay cajas que necesitan cerrarse automáticamente
    cron.schedule('*/30 * * * *', () => {
      this.checkAndAutoCloseRegisters();
    });

    // Verificar cada día a las 00:05 AM (justo después de medianoche)
    cron.schedule('5 0 * * *', () => {
      this.checkAndAutoCloseAfterMidnight();
    });

    console.log('✅ Servicio de auto-cierre de caja programado');
  }

  // Verificar y cerrar automáticamente cajas registradoras que cumplen las condiciones
  async checkAndAutoCloseRegisters() {
    try {
      console.log('🔍 Verificando cajas registradoras para auto-cierre...');
      
      // Obtener todas las cajas abiertas
      const openRegisters = await this.db.all(`
        SELECT * FROM cash_reports 
        WHERE status = 'open'
        ORDER BY opened_at ASC
      `);

      if (openRegisters.length === 0) {
        console.log('✅ No hay cajas registradoras abiertas para verificar');
        return;
      }

      console.log(`📊 Encontradas ${openRegisters.length} cajas registradoras abiertas`);

      for (const register of openRegisters) {
        const shouldAutoClose = await this.shouldAutoCloseRegister(register);
        
        if (shouldAutoClose.shouldClose) {
          console.log(`🏁 Auto-cerrando caja registradora: ${register.id} (${shouldAutoClose.reason})`);
          await this.autoCloseRegister(register, shouldAutoClose.reason);
        }
      }

    } catch (error) {
      console.error('❌ Error verificando auto-cierre de cajas:', error);
    }
  }

  // Verificar específicamente después de medianoche
  async checkAndAutoCloseAfterMidnight() {
    try {
      console.log('🌙 Verificación post-medianoche para auto-cierre de cajas...');
      
      // Obtener cajas que fueron abiertas el día anterior
      const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
      const openRegisters = await this.db.all(`
        SELECT * FROM cash_reports 
        WHERE status = 'open' 
        AND DATE(opened_at) = ?
        ORDER BY opened_at ASC
      `, [yesterday]);

      console.log(`📊 Encontradas ${openRegisters.length} cajas del día anterior aún abiertas`);

      for (const register of openRegisters) {
        console.log(`🏁 Auto-cerrando caja del día anterior: ${register.id}`);
        await this.autoCloseRegister(register, 'Auto-cierre después de medianoche');
      }

    } catch (error) {
      console.error('❌ Error en verificación post-medianoche:', error);
    }
  }

  // Determinar si una caja registradora debe cerrarse automáticamente
  async shouldAutoCloseRegister(register) {
    const now = moment();
    const openedAt = moment(register.opened_at);
    const hoursOpen = now.diff(openedAt, 'hours');
    const isAfterMidnight = openedAt.format('YYYY-MM-DD') !== now.format('YYYY-MM-DD');

    // Regla 1: Más de 12 horas abierta
    if (hoursOpen >= 12) {
      return {
        shouldClose: true,
        reason: `Auto-cierre por 12+ horas (${hoursOpen}h abierta)`
      };
    }

    // Regla 2: Abierta ayer y ya pasó medianoche
    if (isAfterMidnight) {
      return {
        shouldClose: true,
        reason: 'Auto-cierre después de medianoche'
      };
    }

    return {
      shouldClose: false,
      reason: null
    };
  }

  // Cerrar automáticamente una caja registradora
  async autoCloseRegister(register, reason) {
    try {
      console.log(`🔄 Procesando auto-cierre para caja ${register.id}...`);

      // Calcular totales y balance teórico
      const closingData = await this.calculateClosingData(register);
      
      // Actualizar la caja registradora como cerrada
      await this.db.run(`
        UPDATE cash_reports SET 
          closing_balance = ?,
          actual_cash = ?,
          discrepancy = 0,
          status = 'closed',
          closed_at = CURRENT_TIMESTAMP,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        closingData.theoreticalBalance,
        closingData.theoreticalBalance, // Asumir que el efectivo real es igual al teórico
        `${register.notes || ''}\n${reason} - Cerrado automáticamente el ${moment().format('DD/MM/YYYY HH:mm')}`.trim(),
        register.id
      ]);

      console.log(`✅ Caja ${register.id} cerrada automáticamente`);

      // Enviar notificación en tiempo real si Socket.IO está disponible
      if (this.io) {
        this.io.emit('cashRegisterAutoClosed', {
          registerId: register.id,
          userEmail: register.user_email,
          reason: reason,
          closedAt: moment().toISOString(),
          closingData: closingData
        });
        console.log(`📡 Notificación enviada para usuario: ${register.user_email}`);
      }

      return {
        success: true,
        registerId: register.id,
        reason: reason,
        closingData: closingData
      };

    } catch (error) {
      console.error(`❌ Error cerrando automáticamente caja ${register.id}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calcular datos de cierre (totales, balance teórico, etc.)
  async calculateClosingData(register) {
    try {
      // Obtener ventas del turno
      const sales = await this.db.all(`
        SELECT * FROM sales 
        WHERE cash_report_id = ? AND status = 'completed'
      `, [register.id]);

      // Obtener movimientos de efectivo
      const movements = await this.db.all(`
        SELECT * FROM cash_movements 
        WHERE cash_report_id = ?
      `, [register.id]);

      // Calcular totales de ventas por método de pago
      let totalCashSales = 0;
      let totalCardSales = 0;
      let totalTransferSales = 0;
      let totalCreditSales = 0;
      let totalSales = 0;

      sales.forEach(sale => {
        const saleTotal = parseFloat(sale.total || 0);
        totalSales += saleTotal;

        switch (sale.payment_method) {
          case 'cash':
            totalCashSales += saleTotal;
            break;
          case 'card':
            totalCardSales += saleTotal;
            break;
          case 'transfer':
            totalTransferSales += saleTotal;
            break;
          case 'credit':
            totalCreditSales += saleTotal;
            break;
        }
      });

      // Calcular totales de movimientos
      let totalInflows = 0;
      let totalOutflows = 0;

      movements.forEach(movement => {
        const amount = parseFloat(movement.amount || 0);
        if (movement.type === 'inflow') {
          totalInflows += amount;
        } else if (movement.type === 'outflow') {
          totalOutflows += amount;
        }
      });

      // Actualizar totales en la base de datos
      await this.db.run(`
        UPDATE cash_reports SET 
          total_sales = ?,
          total_cash_sales = ?,
          total_card_sales = ?,
          total_transfer_sales = ?,
          total_credit_sales = ?,
          total_inflows = ?,
          total_outflows = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        totalSales,
        totalCashSales,
        totalCardSales,
        totalTransferSales,
        totalCreditSales,
        totalInflows,
        totalOutflows,
        register.id
      ]);

      // Calcular balance teórico
      const theoreticalBalance = parseFloat(register.opening_balance || 0) + 
                               totalCashSales + 
                               totalInflows - 
                               totalOutflows;

      return {
        totalSales,
        totalCashSales,
        totalCardSales,
        totalTransferSales,
        totalCreditSales,
        totalInflows,
        totalOutflows,
        theoreticalBalance: Math.round(theoreticalBalance * 100) / 100,
        salesCount: sales.length,
        movementsCount: movements.length
      };

    } catch (error) {
      console.error('❌ Error calculando datos de cierre:', error);
      return {
        totalSales: 0,
        totalCashSales: 0,
        totalCardSales: 0,
        totalTransferSales: 0,
        totalCreditSales: 0,
        totalInflows: 0,
        totalOutflows: 0,
        theoreticalBalance: parseFloat(register.opening_balance || 0),
        salesCount: 0,
        movementsCount: 0
      };
    }
  }

  // Método para verificar manualmente si una caja específica debe cerrarse
  async checkRegisterForAutoClose(registerId) {
    try {
      const register = await this.db.get(`
        SELECT * FROM cash_reports 
        WHERE id = ? AND status = 'open'
      `, [registerId]);

      if (!register) {
        return {
          shouldClose: false,
          reason: 'Caja no encontrada o ya cerrada'
        };
      }

      return await this.shouldAutoCloseRegister(register);

    } catch (error) {
      console.error('❌ Error verificando caja para auto-cierre:', error);
      return {
        shouldClose: false,
        reason: 'Error verificando caja'
      };
    }
  }

  // Método para obtener estadísticas de auto-cierre
  async getAutoCloseStats() {
    try {
      const today = moment().format('YYYY-MM-DD');
      const sevenDaysAgo = moment().subtract(7, 'days').format('YYYY-MM-DD');

      const stats = await this.db.get(`
        SELECT 
          COUNT(*) as total_auto_closed,
          COUNT(CASE WHEN DATE(closed_at) = ? THEN 1 END) as today_auto_closed,
          COUNT(CASE WHEN DATE(closed_at) >= ? THEN 1 END) as week_auto_closed
        FROM cash_reports 
        WHERE status = 'closed' 
        AND notes LIKE '%Auto-cierre%'
      `, [today, sevenDaysAgo]);

      const currentlyOpen = await this.db.get(`
        SELECT COUNT(*) as currently_open
        FROM cash_reports 
        WHERE status = 'open'
      `);

      return {
        totalAutoClosed: stats.total_auto_closed || 0,
        todayAutoClosed: stats.today_auto_closed || 0,
        weekAutoClosed: stats.week_auto_closed || 0,
        currentlyOpen: currentlyOpen.currently_open || 0
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de auto-cierre:', error);
      return {
        totalAutoClosed: 0,
        todayAutoClosed: 0,
        weekAutoClosed: 0,
        currentlyOpen: 0
      };
    }
  }
}

module.exports = CashRegisterAutoCloseService;