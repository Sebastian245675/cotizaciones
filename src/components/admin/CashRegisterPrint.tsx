import { DailyCashReport } from './CashRegisterSystem';

export const printCashReport = (report: DailyCashReport) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para imprimir el reporte.');
    return;
  }

  const dayStats = {
    totalIncome: report.cashSales + report.cashPayments + report.cashEntries,
    totalOutflow: report.cashExits + report.cashReturns,
  };
  const netFlow = dayStats.totalIncome - dayStats.totalOutflow;
  const expectedBalance = report.openingBalance + netFlow;
  const variance = report.cashInBox - expectedBalance;

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Corte de Caja - ${report.date.toLocaleDateString()}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          padding: 20px; 
          color: #333;
          background-color: white;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 15px; 
          margin-bottom: 25px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 20px;
          border-radius: 8px;
        }
        .header h1 { 
          color: #1e40af; 
          font-size: 32px; 
          margin-bottom: 8px; 
          font-weight: 700;
        }
        .header h2 { 
          color: #2563eb; 
          font-size: 24px; 
          margin-bottom: 12px; 
          font-weight: 600;
        }
        .header p { 
          color: #374151; 
          font-size: 14px; 
          margin: 2px 0;
        }
        .section { 
          margin-bottom: 25px; 
          page-break-inside: avoid;
        }
        .section h3 { 
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          padding: 12px 15px; 
          margin-bottom: 15px; 
          border-left: 4px solid #2563eb;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
          gap: 25px; 
          margin-bottom: 25px;
        }
        .item { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          padding: 8px 12px; 
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }
        .item:hover { background-color: #f9fafb; }
        .item span:first-child { font-weight: 500; color: #374151; }
        .item span:last-child { font-weight: 600; color: #111827; }
        .total { 
          font-weight: 700; 
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          padding: 12px 15px; 
          border-radius: 6px;
          border-left: 4px solid #2563eb;
        }
        .total span { color: #1e40af; }
        .positive { color: #059669 !important; }
        .negative { color: #dc2626 !important; }
        .warning { color: #d97706 !important; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 15px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        th, td { 
          border: 1px solid #d1d5db; 
          padding: 10px 12px; 
          text-align: left; 
        }
        th { 
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          font-weight: 600;
          color: #374151;
          text-align: center;
        }
        td { color: #111827; }
        tr:nth-child(even) { background-color: #f9fafb; }
        tr:hover { background-color: #f3f4f6; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
        }
        @media print { 
          .no-print { display: none; }
          body { padding: 10px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏪 CORTE DE CAJA</h1>
        <h2>COVENANT ARGENTINA POS</h2>
        <p><strong>Fecha:</strong> ${report.date.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p><strong>Hora del Reporte:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Cajero:</strong> ${report.createdBy} | <strong>Estado:</strong> ${report.status === 'open' ? '🟢 ABIERTO' : '🔴 CERRADO'}</p>
      </div>

      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-label">Balance Inicial</div>
          <div class="stat-value">$${report.openingBalance.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Balance Actual</div>
          <div class="stat-value positive">$${report.cashInBox.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ventas Totales</div>
          <div class="stat-value positive">$${report.totalSales.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ganancia Total</div>
          <div class="stat-value positive">$${report.totalProfit.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Flujo Neto</div>
          <div class="stat-value ${netFlow >= 0 ? 'positive' : 'negative'}">$${netFlow.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Diferencia</div>
          <div class="stat-value ${Math.abs(variance) <= 1 ? 'positive' : 'warning'}">${variance >= 0 ? '+' : ''}$${variance.toLocaleString()}</div>
        </div>
      </div>

      <div class="grid">
        <div class="section">
          <h3>💰 DINERO EN CAJA</h3>
          <div class="item">
            <span>Balance Inicial:</span>
            <span>$${report.openingBalance.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Balance Actual:</span>
            <span class="positive">$${report.cashInBox.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Balance Esperado:</span>
            <span>$${expectedBalance.toLocaleString()}</span>
          </div>
          <div class="item total">
            <span>Ventas Totales del Día:</span>
            <span>$${report.totalSales.toLocaleString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>💵 MOVIMIENTOS EN EFECTIVO</h3>
          <div class="item">
            <span>Ventas en Efectivo:</span>
            <span class="positive">$${report.cashSales.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Abonos en Efectivo:</span>
            <span class="positive">$${report.cashPayments.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Entradas Adicionales:</span>
            <span class="positive">$${report.cashEntries.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Salidas:</span>
            <span class="negative">-$${report.cashExits.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Devoluciones:</span>
            <span class="negative">-$${report.cashReturns.toLocaleString()}</span>
          </div>
          <div class="item total">
            <span>Total Movimientos Efectivo:</span>
            <span class="${netFlow >= 0 ? 'positive' : 'negative'}">$${(report.cashSales + report.cashPayments + report.cashEntries - report.cashExits - report.cashReturns).toLocaleString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>📊 GANANCIAS Y RENTABILIDAD</h3>
          <div class="item">
            <span>Ganancia Bruta:</span>
            <span class="positive">$${report.totalProfit.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Gastos Operativos:</span>
            <span class="negative">$${report.cashExits.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>Impuestos:</span>
            <span class="negative">$${report.taxes.toLocaleString()}</span>
          </div>
          <div class="item total">
            <span>Ganancia Neta:</span>
            <span class="positive">$${(report.totalProfit - report.cashExits - report.taxes).toLocaleString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>🛒 VENTAS POR MÉTODO DE PAGO</h3>
          <div class="item">
            <span>💵 Efectivo:</span>
            <span>$${report.cashSales.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>💳 Tarjeta de Crédito:</span>
            <span>$${report.creditCardSales.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>📝 A Crédito:</span>
            <span>$${report.creditSales.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>🎫 Vales de Despensa:</span>
            <span>$${report.voucherSales.toLocaleString()}</span>
          </div>
          <div class="item">
            <span>↩️ Devoluciones:</span>
            <span class="negative">-$${report.salesReturns.toLocaleString()}</span>
          </div>
          <div class="item total">
            <span>Total Ventas:</span>
            <span>$${(report.cashSales + report.creditCardSales + report.creditSales + report.voucherSales - report.salesReturns).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>🏢 ANÁLISIS POR DEPARTAMENTO</h3>
        <table>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Ventas Totales</th>
              <th>Efectivo</th>
              <th>Tarjeta Crédito</th>
              <th>Crédito</th>
              <th>Vales</th>
              <th>Devoluciones</th>
              <th>Ganancia</th>
              <th>% Participación</th>
            </tr>
          </thead>
          <tbody>
            ${report.departmentSales.map(dept => {
              const totalSalesAllDepts = report.departmentSales.reduce((sum, d) => sum + d.totalSales, 0);
              const participation = totalSalesAllDepts > 0 ? ((dept.totalSales / totalSalesAllDepts) * 100).toFixed(1) : '0.0';
              return `
                <tr>
                  <td class="font-bold">${dept.department}</td>
                  <td class="text-right">$${dept.totalSales.toLocaleString()}</td>
                  <td class="text-right">$${dept.cashSales.toLocaleString()}</td>
                  <td class="text-right">$${dept.creditCardSales.toLocaleString()}</td>
                  <td class="text-right">$${dept.creditSales.toLocaleString()}</td>
                  <td class="text-right">$${dept.voucherSales.toLocaleString()}</td>
                  <td class="text-right negative">$${dept.returns.toLocaleString()}</td>
                  <td class="text-right positive">$${dept.profit.toLocaleString()}</td>
                  <td class="text-center">${participation}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #dbeafe; font-weight: 700;">
              <td>TOTALES</td>
              <td class="text-right">$${report.departmentSales.reduce((sum, dept) => sum + dept.totalSales, 0).toLocaleString()}</td>
              <td class="text-right">$${report.departmentSales.reduce((sum, dept) => sum + dept.cashSales, 0).toLocaleString()}</td>
              <td class="text-right">$${report.departmentSales.reduce((sum, dept) => sum + dept.creditCardSales, 0).toLocaleString()}</td>
              <td class="text-right">$${report.departmentSales.reduce((sum, dept) => sum + dept.creditSales, 0).toLocaleString()}</td>
              <td class="text-right">$${report.departmentSales.reduce((sum, dept) => sum + dept.voucherSales, 0).toLocaleString()}</td>
              <td class="text-right">$${report.departmentSales.reduce((sum, dept) => sum + dept.returns, 0).toLocaleString()}</td>
              <td class="text-right">$${report.departmentSales.reduce((sum, dept) => sum + dept.profit, 0).toLocaleString()}</td>
              <td class="text-center">100.0%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="section">
        <h3>📋 DETALLE DE MOVIMIENTOS (${report.movements.length} registros)</h3>
        ${report.movements.length === 0 ? `
          <div style="text-align: center; padding: 30px; color: #6b7280;">
            <p>No se registraron movimientos manuales en este corte</p>
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Referencia</th>
                <th>Monto</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              ${report.movements.map(mov => `
                <tr>
                  <td class="text-center">${new Date(mov.timestamp).toLocaleTimeString('es-ES')}</td>
                  <td class="text-center">
                    ${mov.type === 'entry' ? '📈 Entrada' :
                      mov.type === 'exit' ? '📉 Salida' :
                      mov.type === 'return_cash' ? '↩️ Devolución' : '💵 Abono'}
                  </td>
                  <td>${mov.description}</td>
                  <td class="text-center">${mov.reference || '-'}</td>
                  <td class="text-right ${mov.type === 'entry' || mov.type === 'payment_cash' ? 'positive' : 'negative'}">
                    ${mov.type === 'entry' || mov.type === 'payment_cash' ? '+' : '-'}$${mov.amount.toLocaleString()}
                  </td>
                  <td class="text-center">${mov.userId}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <div class="section" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <h3>📈 RESUMEN EJECUTIVO</h3>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <div class="grid">
            <div>
              <h4 style="color: #1f2937; margin-bottom: 10px;">Análisis de Flujo de Caja:</h4>
              <ul style="margin-left: 20px; color: #374151;">
                <li>Ingresos totales: <span class="positive">$${dayStats.totalIncome.toLocaleString()}</span></li>
                <li>Salidas totales: <span class="negative">$${dayStats.totalOutflow.toLocaleString()}</span></li>
                <li>Flujo neto: <span class="${netFlow >= 0 ? 'positive' : 'negative'}">$${netFlow.toLocaleString()}</span></li>
                <li>Estado: ${Math.abs(variance) <= 1 ? '✅ Cuadrado' : '⚠️ Con diferencia'}</li>
              </ul>
            </div>
            <div>
              <h4 style="color: #1f2937; margin-bottom: 10px;">Indicadores de Performance:</h4>
              <ul style="margin-left: 20px; color: #374151;">
                <li>Ventas efectivo vs total: ${report.totalSales > 0 ? ((report.cashSales / report.totalSales) * 100).toFixed(1) : '0'}%</li>
                <li>Margen de ganancia: ${report.totalSales > 0 ? ((report.totalProfit / report.totalSales) * 100).toFixed(1) : '0'}%</li>
                <li>Promedio por transacción: $${(report.totalSales / Math.max(1, report.movements.length)).toLocaleString()}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        <p>Reporte generado automáticamente por el Sistema POS Covenant Argentina</p>
        <p>© ${new Date().getFullYear()} - Todos los derechos reservados</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Esperar a que se cargue completamente antes de imprimir
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

export default printCashReport;
