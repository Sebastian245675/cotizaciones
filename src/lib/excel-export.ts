import * as XLSX from 'xlsx';
import { exportPOSClientsData } from './pos-clients-service';
import { toast } from '@/hooks/use-toast';

export const exportClientsToExcel = async () => {
  try {
    toast({
      title: "Preparando exportación...",
      description: "Obteniendo datos de clientes",
    });

    // Obtener datos de clientes
    const clientsData = await exportPOSClientsData();
    
    if (clientsData.length === 0) {
      toast({
        title: "Sin datos para exportar",
        description: "No hay clientes registrados para exportar",
        variant: "destructive"
      });
      return;
    }

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Crear hoja principal con datos de clientes
    const mainSheet = XLSX.utils.json_to_sheet(clientsData);
    
    // Configurar ancho de columnas
    const columnWidths = [
      { wch: 20 }, // Nombre
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 30 }, // Residencia
      { wch: 10 }, // Puntos
      { wch: 15 }, // Total Compras
      { wch: 12 }, // Cantidad Compras
      { wch: 10 }, // Estado
      { wch: 12 }, // Fecha Registro
      { wch: 12 }  // Última Compra
    ];
    mainSheet['!cols'] = columnWidths;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Clientes POS');

    // Crear hoja de resumen estadístico
    const totalClientes = clientsData.length;
    const clientesActivos = clientsData.filter(c => c.Estado === 'Activo').length;
    const totalVentas = clientsData.reduce((sum, c) => {
      const amount = parseFloat(c['Total Compras'].replace('$', '').replace(',', ''));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const totalPuntos = clientsData.reduce((sum, c) => sum + c.Puntos, 0);
    
    const summaryData = [
      { 'Métrica': 'Total de Clientes', 'Valor': totalClientes },
      { 'Métrica': 'Clientes Activos', 'Valor': clientesActivos },
      { 'Métrica': 'Clientes Inactivos', 'Valor': totalClientes - clientesActivos },
      { 'Métrica': 'Total de Ventas', 'Valor': `$${totalVentas.toLocaleString()}` },
      { 'Métrica': 'Total de Puntos', 'Valor': totalPuntos.toLocaleString() },
      { 'Métrica': 'Promedio Compras por Cliente', 'Valor': totalClientes > 0 ? `$${Math.round(totalVentas / totalClientes).toLocaleString()}` : '$0' },
      { 'Métrica': 'Promedio Puntos por Cliente', 'Valor': totalClientes > 0 ? Math.round(totalPuntos / totalClientes) : 0 }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Generar nombre de archivo con fecha
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `Clientes_POS_${dateStr}.xlsx`;

    // Escribir y descargar archivo
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Exportación completada",
      description: `Se exportaron ${totalClientes} clientes a ${fileName}`,
    });

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    toast({
      title: "Error en la exportación",
      description: "No se pudo exportar el archivo. Intenta nuevamente.",
      variant: "destructive"
    });
  }
};

export const exportClientTemplate = () => {
  try {
    const templateData = [
      {
        'Nombre': 'Juan',
        'Teléfono': '+54 9 11 1234-5678',
        'Email': 'ejemplo@email.com',
        'Residencia': 'Dirección ejemplo'
      }
    ];

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(templateData);
    
    // Configurar ancho de columnas
    sheet['!cols'] = [
      { wch: 20 }, // Nombre
      { wch: 18 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 30 }  // Residencia
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, 'Plantilla Clientes');
    XLSX.writeFile(workbook, 'Plantilla_Clientes_POS.xlsx');

    toast({
      title: "Plantilla descargada",
      description: "Usa esta plantilla para importar clientes masivamente",
    });

  } catch (error) {
    console.error('Error creating template:', error);
    toast({
      title: "Error",
      description: "No se pudo crear la plantilla",
      variant: "destructive"
    });
  }
};
