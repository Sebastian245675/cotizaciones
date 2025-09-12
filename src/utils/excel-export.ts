import * as XLSX from 'xlsx';
import { POSClient } from '../lib/pos-clients-service';

export async function exportClientsToExcel(clients: POSClient[]): Promise<void> {
  try {
    // Preparar datos para Excel
    const exportData = clients.map(client => ({
      'ID Cliente': client.clienteId,
      'Nombre': client.nombre,
      'Teléfono': client.telefono,
      'Email': client.email || '',
      'Residencia': client.residencia || '',
      'Puntos': client.puntos,
      'Total Compras': client.totalCompras,
      'Fecha Registro': client.fechaRegistro.toDate().toLocaleDateString('es-AR'),
      'Última Actualización': client.fechaActualizacion.toDate().toLocaleDateString('es-AR')
    }));

    // Crear estadísticas resumen
    const totalClients = clients.length;
    const totalPoints = clients.reduce((sum, client) => sum + client.puntos, 0);
    const totalSales = clients.reduce((sum, client) => sum + client.totalCompras, 0);
    const averagePoints = totalClients > 0 ? (totalPoints / totalClients).toFixed(2) : '0';
    const averageSales = totalClients > 0 ? (totalSales / totalClients).toFixed(2) : '0';

    const summaryData = [
      ['RESUMEN DE CLIENTES POS'],
      [''],
      ['Total de Clientes', totalClients],
      ['Puntos Totales', totalPoints],
      ['Ventas Totales', `$${totalSales.toLocaleString()}`],
      ['Promedio Puntos por Cliente', averagePoints],
      ['Promedio Ventas por Cliente', `$${parseFloat(averageSales).toLocaleString()}`],
      ['Fecha de Exportación', new Date().toLocaleDateString('es-AR')],
      [''],
      ['LISTA DE CLIENTES']
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja de resumen y datos
    const wsData = [
      ...summaryData,
      [''],
      // Headers
      ['ID Cliente', 'Nombre', 'Teléfono', 'Email', 'Residencia', 'Puntos', 'Total Compras', 'Fecha Registro', 'Última Actualización'],
      // Datos
      ...exportData.map(client => Object.values(client))
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Configurar anchos de columna
    const colWidths = [
      { wch: 12 }, // ID Cliente
      { wch: 20 }, // Nombre
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 20 }, // Residencia
      { wch: 10 }, // Puntos
      { wch: 15 }, // Total Compras
      { wch: 15 }, // Fecha Registro
      { wch: 20 }  // Última Actualización
    ];
    ws['!cols'] = colWidths;

    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes POS');

    // Generar nombre de archivo
    const fileName = `clientes-pos-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error exporting clients to Excel:', error);
    throw new Error('Error al exportar clientes a Excel');
  }
}

export async function exportClientTemplate(): Promise<void> {
  try {
    // Crear plantilla con headers y ejemplos
    const templateData = [
      ['PLANTILLA DE IMPORTACIÓN DE CLIENTES POS'],
      [''],
      ['INSTRUCCIONES:'],
      ['1. Complete los datos en las columnas correspondientes'],
      ['2. Los campos marcados con * son obligatorios'],
      ['3. El formato de teléfono debe incluir código de área'],
      ['4. El email debe tener formato válido (ej: usuario@dominio.com)'],
      ['5. Guarde el archivo y use la función de importación en el sistema'],
      [''],
      ['CAMPOS OBLIGATORIOS: Nombre*, Teléfono*'],
      ['CAMPOS OPCIONALES: Email, Residencia'],
      [''],
      ['--- DATOS DE EJEMPLO ---'],
      ['Nombre*', 'Teléfono*', 'Email', 'Residencia'],
      ['Juan Pérez', '+54 9 11 1234-5678', 'juan@email.com', 'Buenos Aires'],
      ['María García', '+54 9 351 987-6543', 'maria@email.com', 'Córdoba'],
      ['Carlos López', '+54 9 261 555-1234', '', 'Mendoza'],
      [''],
      ['--- COMPLETE SUS DATOS AQUÍ ---'],
      ['Nombre*', 'Teléfono*', 'Email', 'Residencia'],
      // Filas vacías para completar
      ...Array(20).fill(['', '', '', ''])
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Configurar anchos de columna
    const colWidths = [
      { wch: 25 }, // Nombre
      { wch: 20 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 20 }  // Residencia
    ];
    ws['!cols'] = colWidths;

    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Clientes');

    // Generar nombre de archivo
    const fileName = `plantilla-clientes-pos-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error exporting client template:', error);
    throw new Error('Error al exportar plantilla de clientes');
  }
}

export async function importClientsFromExcel(file: File): Promise<{
  success: number;
  errors: string[];
  data: Array<{
    nombre: string;
    telefono: string;
    email?: string;
    residencia?: string;
  }>;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Obtener la primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        const errors: string[] = [];
        const validClients: Array<{
          nombre: string;
          telefono: string;
          email?: string;
          residencia?: string;
        }> = [];
        
        let dataStartRow = -1;
        
        // Encontrar donde empiezan los datos (buscar la fila con headers)
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length >= 2 && 
              (row[0]?.toString().toLowerCase().includes('nombre') || 
               row[0]?.toString().toLowerCase() === 'nombre*')) {
            dataStartRow = i + 1;
            break;
          }
        }
        
        if (dataStartRow === -1) {
          errors.push('No se encontraron los headers de datos en el archivo');
        } else {
          // Procesar datos desde la fila encontrada
          for (let i = dataStartRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Saltar filas vacías
            if (!row || row.length === 0 || !row[0]) continue;
            
            const nombre = row[0]?.toString().trim();
            const telefono = row[1]?.toString().trim();
            const email = row[2]?.toString().trim();
            const residencia = row[3]?.toString().trim();
            
            // Validar campos obligatorios
            if (!nombre) {
              errors.push(`Fila ${i + 1}: El nombre es obligatorio`);
              continue;
            }
            
            if (!telefono) {
              errors.push(`Fila ${i + 1}: El teléfono es obligatorio`);
              continue;
            }
            
            // Validar formato de teléfono
            if (!/^\+?[\d\s-()]+$/.test(telefono)) {
              errors.push(`Fila ${i + 1}: El formato del teléfono no es válido`);
              continue;
            }
            
            // Validar email si está presente
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              errors.push(`Fila ${i + 1}: El formato del email no es válido`);
              continue;
            }
            
            // Agregar cliente válido
            validClients.push({
              nombre,
              telefono,
              email: email || undefined,
              residencia: residencia || undefined
            });
          }
        }
        
        resolve({
          success: validClients.length,
          errors,
          data: validClients
        });
      } catch (error) {
        reject(new Error('Error al procesar el archivo Excel'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
