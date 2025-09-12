import React from 'react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientDocument: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  dueDate: Date;
  issueDate: Date;
  paymentMethod?: string;
  notes?: string;
  createdBy: string;
}

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    cuit?: string;
  };
}

export const InvoicePrintTemplate: React.FC<InvoicePrintTemplateProps> = ({ 
  invoice, 
  companyInfo = {
    name: "COVENANT ARGENTINA",
    address: "Av. Corrientes 1234, CABA",
    phone: "+54 11 1234-5678",
    email: "ventas@covenant.com.ar",
    cuit: "30-12345678-9"
  }
}) => {
  return (
    <div className="print-content bg-white p-8 max-w-4xl mx-auto" style={{ 
      fontFamily: 'Arial, sans-serif',
      color: '#000',
      lineHeight: '1.4'
    }}>
      {/* Header de la Empresa */}
      <div className="header mb-8 pb-4 border-b-2 border-blue-600">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 mb-2">{companyInfo.name}</h1>
            <div className="text-sm text-gray-700">
              <p>{companyInfo.address}</p>
              <p>Tel: {companyInfo.phone}</p>
              <p>Email: {companyInfo.email}</p>
              {companyInfo.cuit && <p>CUIT: {companyInfo.cuit}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="bg-blue-100 p-4 rounded-lg">
              <h2 className="text-xl font-bold text-blue-800">FACTURA</h2>
              <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
              <p className="text-sm text-gray-600">Fecha: {invoice.issueDate.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Cliente */}
      <div className="client-info mb-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-700">FACTURAR A:</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold text-lg">{invoice.clientName}</p>
          {invoice.clientDocument && <p>Documento: {invoice.clientDocument}</p>}
          {invoice.clientEmail && <p>Email: {invoice.clientEmail}</p>}
          {invoice.clientPhone && <p>Teléfono: {invoice.clientPhone}</p>}
          {invoice.clientAddress && <p>Dirección: {invoice.clientAddress}</p>}
        </div>
      </div>

      {/* Información de la Factura */}
      <div className="invoice-details mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><span className="font-semibold">Fecha de Emisión:</span> {invoice.issueDate.toLocaleDateString()}</p>
            <p><span className="font-semibold">Fecha de Vencimiento:</span> {invoice.dueDate.toLocaleDateString()}</p>
          </div>
          <div>
            <p><span className="font-semibold">Estado:</span> 
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status === 'paid' ? 'PAGADA' :
                 invoice.status === 'sent' ? 'ENVIADA' :
                 invoice.status === 'overdue' ? 'VENCIDA' :
                 invoice.status === 'draft' ? 'BORRADOR' : 'CANCELADA'}
              </span>
            </p>
            {invoice.paymentMethod && (
              <p><span className="font-semibold">Método de Pago:</span> {invoice.paymentMethod}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Items */}
      <div className="items-table mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-gray-300 p-3 text-left">DESCRIPCIÓN</th>
              <th className="border border-gray-300 p-3 text-center">CANTIDAD</th>
              <th className="border border-gray-300 p-3 text-right">PRECIO UNIT.</th>
              <th className="border border-gray-300 p-3 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-300 p-3">{item.name}</td>
                <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-3 text-right">${item.unitPrice.toFixed(2)}</td>
                <td className="border border-gray-300 p-3 text-right font-semibold">${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="totals mb-6">
        <div className="flex justify-end">
          <div className="w-80">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between mb-2 text-red-600">
                  <span>Descuento:</span>
                  <span>-${invoice.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span>IVA:</span>
                <span>${invoice.tax.toFixed(2)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-bold text-blue-700">
                <span>TOTAL:</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notas */}
      {invoice.notes && (
        <div className="notes mb-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-700">NOTAS:</h3>
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer mt-8 pt-4 border-t border-gray-300">
        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">¡Gracias por su confianza!</p>
          <p>Esta factura fue generada electrónicamente por el sistema POS de {companyInfo.name}</p>
          <p className="mt-2">Para consultas sobre esta factura, contacte a: {companyInfo.email}</p>
        </div>
      </div>

      {/* Información de Pago (solo si no está pagada) */}
      {invoice.status !== 'paid' && (
        <div className="payment-info mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">INFORMACIÓN DE PAGO:</h3>
          <div className="text-sm text-blue-700">
            <p>• Esta factura vence el {invoice.dueDate.toLocaleDateString()}</p>
            <p>• Métodos de pago aceptados: Transferencia bancaria, efectivo, tarjetas</p>
            <p>• Para pagos por transferencia, solicite los datos bancarios</p>
            <p>• Una vez realizado el pago, envíe el comprobante para actualizar el estado</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Función para imprimir la factura
export const printInvoice = (invoice: Invoice, companyInfo?: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para imprimir la factura.');
    return;
  }

  // Crear el contenido HTML para impresión
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Factura ${invoice.invoiceNumber}</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.4; 
          color: #000; 
          background: white;
        }
        .print-content { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          margin-bottom: 30px; 
          padding-bottom: 15px; 
          border-bottom: 3px solid #2563eb; 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .company-info h1 { 
          font-size: 24px; 
          color: #2563eb; 
          margin-bottom: 10px; 
        }
        .company-info p { 
          font-size: 12px; 
          color: #374151; 
          margin-bottom: 2px;
        }
        .invoice-header { 
          text-align: right; 
          background: #dbeafe; 
          padding: 15px; 
          border-radius: 8px;
        }
        .invoice-header h2 { 
          font-size: 18px; 
          color: #1e40af; 
        }
        .invoice-number { 
          font-size: 16px; 
          font-weight: bold; 
        }
        .client-info { 
          margin-bottom: 25px; 
        }
        .client-info h3 { 
          color: #1d4ed8; 
          font-size: 14px; 
          margin-bottom: 10px; 
        }
        .client-details { 
          background: #f9fafb; 
          padding: 15px; 
          border-radius: 6px;
        }
        .client-details p:first-child { 
          font-size: 16px; 
          font-weight: bold; 
          margin-bottom: 5px;
        }
        .invoice-details { 
          margin-bottom: 25px; 
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .invoice-details p { 
          margin-bottom: 5px; 
        }
        .invoice-details .font-semibold { 
          font-weight: bold; 
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 25px;
        }
        th, td { 
          border: 1px solid #d1d5db; 
          padding: 10px; 
        }
        th { 
          background: #2563eb; 
          color: white; 
          font-weight: bold;
        }
        tr:nth-child(even) { 
          background: #f9fafb; 
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .totals { 
          margin-bottom: 25px; 
        }
        .totals-box { 
          width: 320px; 
          margin-left: auto; 
          background: #f9fafb; 
          padding: 15px; 
          border-radius: 6px;
        }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 8px;
        }
        .total-final { 
          font-size: 18px; 
          font-weight: bold; 
          color: #1d4ed8; 
          border-top: 1px solid #d1d5db; 
          padding-top: 8px; 
          margin-top: 8px;
        }
        .notes { 
          margin-bottom: 25px; 
        }
        .notes h3 { 
          color: #1d4ed8; 
          margin-bottom: 8px; 
        }
        .notes-content { 
          background: #fef3c7; 
          padding: 15px; 
          border-left: 4px solid #f59e0b; 
          border-radius: 4px;
        }
        .footer { 
          margin-top: 30px; 
          padding-top: 15px; 
          border-top: 1px solid #d1d5db; 
          text-align: center; 
          font-size: 12px; 
          color: #6b7280;
        }
        .payment-info { 
          margin-top: 25px; 
          background: #dbeafe; 
          padding: 15px; 
          border-radius: 6px; 
          border: 1px solid #93c5fd;
        }
        .payment-info h3 { 
          color: #1e40af; 
          margin-bottom: 8px; 
        }
        .payment-info ul { 
          font-size: 12px; 
          color: #1d4ed8;
        }
        .payment-info li { 
          margin-bottom: 3px; 
        }
        @media print {
          body { margin: 0; }
          .print-content { margin: 0; padding: 15px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="print-content">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <h1>${companyInfo?.name || 'COVENANT ARGENTINA'}</h1>
            <p>${companyInfo?.address || 'Av. Corrientes 1234, CABA'}</p>
            <p>Tel: ${companyInfo?.phone || '+54 11 1234-5678'}</p>
            <p>Email: ${companyInfo?.email || 'ventas@covenant.com.ar'}</p>
            ${companyInfo?.cuit ? `<p>CUIT: ${companyInfo.cuit}</p>` : '<p>CUIT: 30-12345678-9</p>'}
          </div>
          <div class="invoice-header">
            <h2>FACTURA</h2>
            <p class="invoice-number">${invoice.invoiceNumber}</p>
            <p>Fecha: ${invoice.issueDate.toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Client Info -->
        <div class="client-info">
          <h3>FACTURAR A:</h3>
          <div class="client-details">
            <p>${invoice.clientName}</p>
            ${invoice.clientDocument ? `<p>Documento: ${invoice.clientDocument}</p>` : ''}
            ${invoice.clientEmail ? `<p>Email: ${invoice.clientEmail}</p>` : ''}
            ${invoice.clientPhone ? `<p>Teléfono: ${invoice.clientPhone}</p>` : ''}
            ${invoice.clientAddress ? `<p>Dirección: ${invoice.clientAddress}</p>` : ''}
          </div>
        </div>

        <!-- Invoice Details -->
        <div class="invoice-details">
          <div>
            <p><span class="font-semibold">Fecha de Emisión:</span> ${invoice.issueDate.toLocaleDateString()}</p>
            <p><span class="font-semibold">Fecha de Vencimiento:</span> ${invoice.dueDate.toLocaleDateString()}</p>
          </div>
          <div>
            <p><span class="font-semibold">Estado:</span> ${
              invoice.status === 'paid' ? 'PAGADA' :
              invoice.status === 'sent' ? 'ENVIADA' :
              invoice.status === 'overdue' ? 'VENCIDA' :
              invoice.status === 'draft' ? 'BORRADOR' : 'CANCELADA'
            }</p>
            ${invoice.paymentMethod ? `<p><span class="font-semibold">Método de Pago:</span> ${invoice.paymentMethod}</p>` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th>DESCRIPCIÓN</th>
              <th class="text-center">CANTIDAD</th>
              <th class="text-right">PRECIO UNIT.</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                <td class="text-right">$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="totals-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${invoice.subtotal.toFixed(2)}</span>
            </div>
            ${invoice.discount > 0 ? `
              <div class="total-row" style="color: #dc2626;">
                <span>Descuento:</span>
                <span>-$${invoice.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>IVA:</span>
              <span>$${invoice.tax.toFixed(2)}</span>
            </div>
            <div class="total-row total-final">
              <span>TOTAL:</span>
              <span>$${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${invoice.notes ? `
          <div class="notes">
            <h3>NOTAS:</h3>
            <div class="notes-content">
              <p>${invoice.notes}</p>
            </div>
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <p style="margin-bottom: 8px;">¡Gracias por su confianza!</p>
          <p>Esta factura fue generada electrónicamente por el sistema POS de ${companyInfo?.name || 'COVENANT ARGENTINA'}</p>
          <p style="margin-top: 8px;">Para consultas sobre esta factura, contacte a: ${companyInfo?.email || 'ventas@covenant.com.ar'}</p>
        </div>

        <!-- Payment Info -->
        ${invoice.status !== 'paid' ? `
          <div class="payment-info">
            <h3>INFORMACIÓN DE PAGO:</h3>
            <ul style="list-style: none; padding-left: 0;">
              <li>• Esta factura vence el ${invoice.dueDate.toLocaleDateString()}</li>
              <li>• Métodos de pago aceptados: Transferencia bancaria, efectivo, tarjetas</li>
              <li>• Para pagos por transferencia, solicite los datos bancarios</li>
              <li>• Una vez realizado el pago, envíe el comprobante para actualizar el estado</li>
            </ul>
          </div>
        ` : ''}
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
};
