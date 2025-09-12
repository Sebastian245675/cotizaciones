import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface QuoteSubmission {
  id: string;
  status: string;
  customerEmail?: string;
  customerPhone?: string;
  data: { [key: string]: any };
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'Tu Empresa',
  address: 'Dirección de la empresa',
  phone: '+54 9 11 1234-5678',
  email: 'info@tuempresa.com',
  website: 'www.tuempresa.com'
};

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    processing: 'En proceso'
  };
  return statusMap[status] || status;
};

export const useQuoteExport = () => {
  const [loading, setLoading] = useState(false);

  const exportToPDF = async (
    submission: QuoteSubmission, 
    companyInfo: CompanyInfo = defaultCompanyInfo
  ) => {
    setLoading(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // === HEADER CORPORATIVO PROFESIONAL ===
      // Línea superior azul
      doc.setFillColor(41, 98, 255);
      doc.rect(0, 0, pageWidth, 5, 'F');
      
      // Header principal con fondo gris claro
      doc.setFillColor(248, 249, 251);
      doc.rect(0, 5, pageWidth, 45, 'F');
      
      // Logo/Empresa (lado izquierdo)
      doc.setTextColor(41, 98, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(companyInfo.name, margin, 30);
      
      // Información de contacto (lado derecho)
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(companyInfo.email, pageWidth - margin - 60, 20);
      doc.text(companyInfo.phone, pageWidth - margin - 60, 28);
      doc.text(companyInfo.address, pageWidth - margin - 60, 36);

      yPosition = 65;

      // === TÍTULO PRINCIPAL ===
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('COTIZACIÓN COMERCIAL', margin, yPosition);
      
      yPosition += 15;

      // === INFORMACIÓN DE LA COTIZACIÓN ===
      const quoteDate = new Date().toLocaleDateString('es-ES');
      const validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-ES');
      const quoteNumber = `COT-${submission.id.substring(0, 8).toUpperCase()}`;

      // Tabla de información básica
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 35, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 35, 'S');

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      
      // Primera columna
      doc.text('N° Cotización:', margin + 10, yPosition + 12);
      doc.text('Fecha:', margin + 10, yPosition + 22);
      doc.text('Válida hasta:', margin + 10, yPosition + 32);

      doc.setFont('helvetica', 'normal');
      doc.text(quoteNumber, margin + 40, yPosition + 12);
      doc.text(quoteDate, margin + 40, yPosition + 22);
      doc.text(validUntil, margin + 40, yPosition + 32);

      // Segunda columna
      const clientInfo: { [key: string]: any } = submission.data;
      doc.setFont('helvetica', 'bold');
      doc.text('Estado:', pageWidth - margin - 80, yPosition + 12);
      doc.text('Prioridad:', pageWidth - margin - 80, yPosition + 22);
      doc.text('Tipo:', pageWidth - margin - 80, yPosition + 32);

      doc.setFont('helvetica', 'normal');
      doc.text(getStatusText(submission.status), pageWidth - margin - 50, yPosition + 12);
      doc.text('Normal', pageWidth - margin - 50, yPosition + 22);
      doc.text(clientInfo.tipoDeServicio || 'General', pageWidth - margin - 50, yPosition + 32);

      yPosition += 50;

      // === DATOS DEL CLIENTE ===
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL CLIENTE', margin, yPosition);
      
      yPosition += 10;

      // Tabla de cliente
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 60, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 60, 'S');

      // Línea divisoria vertical
      doc.line(pageWidth / 2, yPosition, pageWidth / 2, yPosition + 60);

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');

      // Columna izquierda
      let clientY = yPosition + 12;
      doc.text('Razón Social:', margin + 10, clientY);
      doc.text('Persona de Contacto:', margin + 10, clientY + 10);
      doc.text('Email:', margin + 10, clientY + 20);
      doc.text('Teléfono:', margin + 10, clientY + 35); // Movido 5 puntos más abajo

      doc.setFont('helvetica', 'normal');
      // Valores ligeramente hacia la derecha para evitar superposición con etiquetas
      const valueOffset = 70; // Separación entre etiquetas y valores
      doc.text(clientInfo.empresa || clientInfo.nombreCompleto || 'N/A', margin + valueOffset, clientY + 6);
      doc.text(clientInfo["1"] || clientInfo.nombreCompleto || 'N/A', margin + valueOffset, clientY + 16);
      
      // Email con manejo especial para evitar desbordamiento
      const email = clientInfo.email || submission.customerEmail || 'N/A';
      const emailText = doc.splitTextToSize(email, (pageWidth / 2) - margin - valueOffset - 5);
      doc.text(emailText, margin + valueOffset, clientY + 26);
      
      doc.text(clientInfo.telefono || submission.customerPhone || 'N/A', margin + valueOffset, clientY + 41); // Movido 5 puntos más abajo

      // Columna derecha
      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', pageWidth / 2 + 10, clientY);
      doc.text('Profesión/Sector:', pageWidth / 2 + 10, clientY + 20);

      doc.setFont('helvetica', 'normal');
      const address = clientInfo.direccion || 'No especificada';
      const addressLines = doc.splitTextToSize(address, 80);
      doc.text(addressLines, pageWidth / 2 + 10, clientY + 6);
      doc.text(clientInfo.profesion || 'No especificado', pageWidth / 2 + 10, clientY + 26);

      yPosition += 75;

      // === DETALLE DE PRODUCTOS/SERVICIOS ===
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PRODUCTOS Y SERVICIOS', margin, yPosition);
      
      yPosition += 15;

      // Generar productos según tipo de servicio
      let productData: string[][] = [];
      let subtotalAmount = 0;
      
      switch (clientInfo.tipoDeServicio) {
        case 'E-commerce':
          productData = [
            ['Plataforma E-commerce Completa', '1', '$8,500.00', '$8,500.00'],
            ['Diseño Responsive Personalizado', '1', '$2,200.00', '$2,200.00'],
            ['Integración de Pagos (MP, PayPal)', '1', '$1,200.00', '$1,200.00'],
            ['Panel de Administración', '1', '$1,800.00', '$1,800.00'],
            ['Optimización SEO (6 meses)', '6', '$350.00', '$2,100.00'],
            ['Hosting y Soporte (1 año)', '12', '$150.00', '$1,800.00']
          ];
          subtotalAmount = 17600.00;
          break;
          
        case 'Marketing Digital':
          productData = [
            ['Estrategia Digital Integral', '1', '$2,800.00', '$2,800.00'],
            ['Gestión Redes Sociales', '6', '$950.00', '$5,700.00'],
            ['Campañas Publicitarias', '6', '$650.00', '$3,900.00'],
            ['Creación de Contenido', '6', '$450.00', '$2,700.00'],
            ['Landing Page Comercial', '1', '$1,200.00', '$1,200.00'],
            ['Reportes y Análisis Mensual', '6', '$200.00', '$1,200.00']
          ];
          subtotalAmount = 17500.00;
          break;
          
        case 'Desarrollo Web':
          productData = [
            ['Sitio Web Corporativo', '1', '$4,500.00', '$4,500.00'],
            ['Diseño Responsive', '1', '$1,800.00', '$1,800.00'],
            ['Sistema de Gestión CMS', '1', '$1,500.00', '$1,500.00'],
            ['Optimización SEO', '1', '$900.00', '$900.00'],
            ['Integración Analytics', '1', '$600.00', '$600.00'],
            ['Hosting y Mantenimiento (6m)', '6', '$180.00', '$1,080.00']
          ];
          subtotalAmount = 10380.00;
          break;
          
        case 'Diseño Gráfico':
          productData = [
            ['Identidad Corporativa Completa', '1', '$3,200.00', '$3,200.00'],
            ['Diseño de Logo y Variaciones', '1', '$800.00', '$800.00'],
            ['Material Gráfico (Tarjetas, Folletos)', '1', '$650.00', '$650.00'],
            ['Diseño Web Visual', '1', '$1,500.00', '$1,500.00'],
            ['Templates para Redes Sociales', '20', '$45.00', '$900.00'],
            ['Manual de Identidad', '1', '$400.00', '$400.00']
          ];
          subtotalAmount = 7450.00;
          break;
          
        default:
          productData = [
            ['Consultoría Estratégica', '20', '$180.00', '$3,600.00'],
            ['Análisis y Diagnóstico', '1', '$1,200.00', '$1,200.00'],
            ['Plan de Implementación', '1', '$2,500.00', '$2,500.00'],
            ['Capacitación del Equipo', '8', '$250.00', '$2,000.00'],
            ['Seguimiento y Soporte', '3', '$800.00', '$2,400.00'],
            ['Reportes Mensuales', '6', '$300.00', '$1,800.00']
          ];
          subtotalAmount = 13500.00;
      }

      // Tabla de productos con autoTable
      try {
        (doc as any).autoTable({
          startY: yPosition,
          head: [['DESCRIPCIÓN', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
          body: productData,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 98, 255],
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 8
          },
          bodyStyles: {
            fontSize: 11,
            cellPadding: 6,
            textColor: [55, 65, 81]
          },
          columnStyles: {
            0: { cellWidth: 100, halign: 'left' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : yPosition + 120;

      } catch (tableError) {
        console.warn('AutoTable failed, using manual table:', tableError);
        yPosition += 120;
      }

      // === RESUMEN FINANCIERO ===
      const iva = subtotalAmount * 0.21;
      const total = subtotalAmount + iva;

      // Caja de totales
      const totalsWidth = 120;
      const totalsX = pageWidth - margin - totalsWidth;

      doc.setFillColor(249, 250, 251);
      doc.rect(totalsX, yPosition, totalsWidth, 70, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(totalsX, yPosition, totalsWidth, 70, 'S');

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);

      // Subtotal
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', totalsX + 10, yPosition + 15);
      doc.text(`$${subtotalAmount.toFixed(2)}`, totalsX + totalsWidth - 10, yPosition + 15, { align: 'right' });

      // IVA
      doc.text('IVA (21%):', totalsX + 10, yPosition + 30);
      doc.text(`$${iva.toFixed(2)}`, totalsX + totalsWidth - 10, yPosition + 30, { align: 'right' });

      // Línea divisoria
      doc.setDrawColor(229, 231, 235);
      doc.line(totalsX + 10, yPosition + 40, totalsX + totalsWidth - 10, yPosition + 40);

      // Total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL:', totalsX + 10, yPosition + 55);
      doc.text(`$${total.toFixed(2)}`, totalsX + totalsWidth - 10, yPosition + 55, { align: 'right' });

      yPosition += 90;

      // === DESCRIPCIÓN DEL PROYECTO ===
      if (clientInfo.descripcionDelProyecto && clientInfo.descripcionDelProyecto.trim()) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setTextColor(31, 41, 55);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPCIÓN DEL PROYECTO', margin, yPosition);

        yPosition += 15;

        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'S');

        doc.setTextColor(55, 65, 81);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const description = doc.splitTextToSize(clientInfo.descripcionDelProyecto, pageWidth - (margin * 2) - 20);
        doc.text(description, margin + 10, yPosition + 12);

        yPosition += 55;
      }

      // === NUEVA PÁGINA PARA TÉRMINOS ===
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', margin, yPosition);

      yPosition += 15;

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const terms = [
        '1. VALIDEZ: Esta cotización tiene validez de 30 días calendario a partir de la fecha de emisión.',
        '2. FORMA DE PAGO: 50% de anticipo para iniciar el proyecto, 50% restante contra entrega y conformidad.',
        '3. PLAZOS: Los tiempos de entrega se computan a partir de la confirmación del anticipo y aprobación final del proyecto.',
        '4. MODIFICACIONES: Cualquier modificación al alcance original será cotizada por separado.',
        '5. GARANTÍA: Se otorga garantía de 90 días por defectos de funcionamiento a partir de la entrega.',
        '6. SOPORTE: Incluye soporte técnico durante el primer mes posterior a la entrega.',
        '7. CAPACITACIÓN: Se incluye capacitación básica para el uso del sistema o servicio entregado.',
        '8. PROPIEDAD INTELECTUAL: Los derechos quedan transferidos al cliente una vez completado el pago total.'
      ];

      terms.forEach((term, index) => {
        const termLines = doc.splitTextToSize(term, pageWidth - (margin * 2));
        doc.text(termLines, margin, yPosition);
        yPosition += termLines.length * 6 + 3;
      });

      yPosition += 15;

      // === FOOTER ===
      const footerY = pageHeight - 40;
      
      doc.setFillColor(248, 249, 251);
      doc.rect(0, footerY, pageWidth, 40, 'F');
      
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Gracias por considerar nuestra propuesta. Quedamos a disposición para cualquier consulta.', 
                pageWidth / 2, footerY + 15, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`${companyInfo.email} | ${companyInfo.phone}`, pageWidth / 2, footerY + 25, { align: 'center' });
      
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES')}`,
                pageWidth / 2, footerY + 32, { align: 'center' });

      // Descargar
      const filename = `Cotizacion_${clientInfo.tipoDeServicio || 'General'}_${submission.id.substring(0, 8)}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Error al exportar a PDF');
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = async (
    submission: QuoteSubmission, 
    companyInfo: CompanyInfo = defaultCompanyInfo
  ) => {
    setLoading(true);
    
    try {
      const clientInfo: { [key: string]: any } = submission.data;
      const quoteDate = new Date().toLocaleDateString('es-ES');
      const validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-ES');
      const quoteNumber = `COT-${submission.id.substring(0, 8).toUpperCase()}`;

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header
            new Paragraph({
              text: companyInfo.name,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            
            // Título
            new Paragraph({
              text: 'COTIZACIÓN COMERCIAL',
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 300 }
            }),

            // Información básica
            new Paragraph({
              children: [
                new TextRun({ text: `N° Cotización: `, bold: true }),
                new TextRun(quoteNumber)
              ],
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ text: `Fecha: `, bold: true }),
                new TextRun(quoteDate)
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: `Válida hasta: `, bold: true }),
                new TextRun(validUntil)
              ],
              spacing: { after: 300 }
            }),

            // Datos del cliente
            new Paragraph({
              text: 'DATOS DEL CLIENTE',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: `Empresa: `, bold: true }),
                new TextRun(clientInfo.empresa || clientInfo.nombreCompleto || 'N/A')
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: `Email: `, bold: true }),
                new TextRun(clientInfo.email || submission.customerEmail || 'N/A')
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: `Teléfono: `, bold: true }),
                new TextRun(clientInfo.telefono || submission.customerPhone || 'N/A')
              ],
              spacing: { after: 300 }
            }),

            // Servicios
            new Paragraph({
              text: 'DETALLE DE SERVICIOS',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 200 }
            }),

            new Paragraph({
              text: `Tipo de servicio: ${clientInfo.tipoDeServicio || 'General'}`,
              spacing: { after: 200 }
            }),

            // Términos
            new Paragraph({
              text: 'TÉRMINOS Y CONDICIONES',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 200 }
            }),

            new Paragraph({
              text: '• Validez: 30 días calendario\n• Forma de pago: 50% anticipo, 50% contra entrega\n• Garantía: 90 días por defectos de funcionamiento',
              spacing: { after: 300 }
            }),

            // Footer
            new Paragraph({
              text: `Contacto: ${companyInfo.email} | ${companyInfo.phone}`,
              spacing: { before: 400 }
            }),

            new Paragraph({
              text: `Documento generado el ${new Date().toLocaleDateString('es-ES')}`,
              spacing: { before: 100 }
            })
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      const filename = `Cotizacion_${clientInfo.tipoDeServicio || 'General'}_${submission.id.substring(0, 8)}.docx`;
      saveAs(new Blob([buffer]), filename);
      
    } catch (error) {
      console.error('Error exporting to Word:', error);
      throw new Error('Error al exportar a Word');
    } finally {
      setLoading(false);
    }
  };

  return {
    exportToPDF,
    exportToWord,
    loading
  };
};
