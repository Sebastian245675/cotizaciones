import { useState } from 'react';
import jsPDF from 'jspdf';
// Importar autoTable usando la sintaxis de ES module
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface QuoteSubmission {
  id: string;
  formId: string;
  formName: string;
  data: Record<string, any>;
  status: 'pending' | 'reviewed' | 'responded' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
}

export const useQuoteExport = () => {
  const [loading, setLoading] = useState(false);

  // Configuración predeterminada de la empresa (puedes moverlo a configuraciones)
  const defaultCompanyInfo: CompanyInfo = {
    name: "MIRG - HECTOR ROLANDO RAMOS GARCIA",
    address: "4TA VIDRIERA #927 COL 1 DE MAYO EN MONTERREY, C.P. 64220. NUEVO LEON MEXICO",
    phone: "811-514-7756 / 811-796-7956",
    email: "MIRGTALLER@GMAIL.COM",
    website: "RFC: RAGH931025DP4"
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // Formatear fechas
    if (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date')) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('es-ES');
      } catch {
        return value.toString();
      }
    }
    
    // Formatear números de teléfono
    if (key.toLowerCase().includes('telefono') || key.toLowerCase().includes('phone')) {
      return value.toString();
    }
    
    // Formatear arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return value.toString();
  };

  const formatFieldLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1') // Agregar espacio antes de mayúsculas
      .replace(/^./, str => str.toUpperCase()) // Capitalizar primera letra
      .trim();
  };

  const getStatusText = (status: QuoteSubmission['status']): string => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'reviewed': return 'Revisado';
      case 'responded': return 'Respondido';
      case 'closed': return 'Cerrado';
      default: return 'Desconocido';
    }
  };

  const exportToPDF = async (
    submission: QuoteSubmission, 
    companyInfo: CompanyInfo = defaultCompanyInfo
  ) => {
    setLoading(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = 0;

      // === 🎨 PORTADA IMPACTANTE TIPO REVISTA LUXURY ===
      // Fondo degradado ultra premium
      doc.setFillColor(8, 28, 54); // Azul navy ultra profundo
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Patrón geométrico de fondo sutil
      doc.setFillColor(12, 35, 64);
      for (let i = 0; i < 20; i++) {
        doc.circle(Math.random() * pageWidth, Math.random() * pageHeight, Math.random() * 2, 'F');
      }
      
      // === HEADER DIAMOND LUXURY ===
      // Banda superior con gradiente dorado
      doc.setFillColor(255, 215, 0);
      doc.rect(0, 0, pageWidth, 8, 'F');
      doc.setFillColor(255, 193, 7);
      doc.rect(0, 0, pageWidth, 4, 'F');
      doc.setFillColor(255, 235, 59);
      doc.rect(0, 0, pageWidth, 2, 'F');
      
      yPosition = 25;

      // === LOGO AREA PREMIUM CON EFECTOS ===
      // Círculo de fondo para logo con efecto glow
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 35, yPosition + 15, 25, 'F');
      doc.setFillColor(240, 240, 240);
      doc.circle(margin + 35, yPosition + 15, 22, 'F');
      
      // Logo text con efecto
      doc.setTextColor(8, 28, 54);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('MIRG', margin + 35, yPosition + 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text('SOLUTIONS', margin + 35, yPosition + 20, { align: 'center' });
      
      // Líneas decorativas alrededor del logo
      doc.setDrawColor(255, 215, 0);
      doc.setLineWidth(3);
      doc.line(margin + 10, yPosition + 15, margin + 15, yPosition + 15);
      doc.line(margin + 55, yPosition + 15, margin + 60, yPosition + 15);
      
      yPosition = 70;

      // === TÍTULO PRINCIPAL ULTRA IMPACTANTE ===
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(42);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPUESTA', pageWidth / 2, yPosition, { align: 'center' });
      
      // Efecto de sombra para el título
      doc.setTextColor(255, 215, 0);
      doc.text('PROPUESTA', pageWidth / 2 + 1, yPosition + 1, { align: 'center' });
      
      yPosition += 20;
      
      doc.setTextColor(255, 215, 0);
      doc.setFontSize(38);
      doc.text('COMERCIAL', pageWidth / 2, yPosition, { align: 'center' });
      
      // Línea decorativa con diamantes
      doc.setFillColor(255, 215, 0);
      const lineY = yPosition + 8;
      doc.rect(pageWidth/2 - 60, lineY, 120, 3, 'F');
      
      // Diamantes decorativos
      doc.circle(pageWidth/2 - 70, lineY + 1.5, 4, 'F');
      doc.circle(pageWidth/2 + 70, lineY + 1.5, 4, 'F');
      doc.circle(pageWidth/2, lineY + 1.5, 5, 'F');
      
      yPosition += 35;

      // === INFORMACIÓN CORPORATIVA ELEGANTE ===
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(companyInfo.name, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 12;
      doc.setFontSize(12);
      doc.text('Excellence • Innovation • Results', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 25;

      // === CARDS DE INFO TIPO APPLE DESIGN ===
      const cardData = [
        { 
          icon: '📅', 
          title: 'FECHA', 
          value: new Date().toLocaleDateString('es-ES'),
          subtitle: 'Generado hoy',
          color: [64, 158, 255] 
        },
        { 
          icon: '🔢', 
          title: 'COTIZACIÓN', 
          value: `MIRG-${submission.id.substring(0, 6)}`,
          subtitle: 'Identificador único',
          color: [255, 105, 180] 
        },
        { 
          icon: '⏱️', 
          title: 'VALIDEZ', 
          value: '30 días',
          subtitle: new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-ES'),
          color: [50, 215, 75] 
        }
      ];

      const cardWidth = (pageWidth - margin * 2 - 20) / 3;
      const cardHeight = 80;
      let cardX = margin;

      cardData.forEach((card) => {
        // Card con efecto de vidrio/cristal
        doc.setFillColor(255, 255, 255);
        doc.rect(cardX, yPosition, cardWidth, cardHeight, 'F');
        
        // Borde con color del card
        doc.setDrawColor(card.color[0], card.color[1], card.color[2]);
        doc.setLineWidth(2);
        doc.rect(cardX, yPosition, cardWidth, cardHeight, 'S');
        
        // Header colorido
        doc.setFillColor(card.color[0], card.color[1], card.color[2]);
        doc.rect(cardX, yPosition, cardWidth, 25, 'F');
        
        // Icono grande
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text(card.icon, cardX + 15, yPosition + 18);
        
        // Título
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(card.title, cardX + 35, yPosition + 18);
        
        // Valor principal
        doc.setTextColor(card.color[0], card.color[1], card.color[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(card.value, cardX + cardWidth/2, yPosition + 45, { align: 'center' });
        
        // Subtítulo
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(card.subtitle, cardX + cardWidth/2, yPosition + 65, { align: 'center' });
        
        cardX += cardWidth + 10;
      });

      yPosition += cardHeight + 30;

      // === BOTÓN CTA IMPACTANTE ===
      const ctaWidth = 140;
      const ctaHeight = 35;
      const ctaX = pageWidth / 2 - ctaWidth / 2;
      
      // Sombra del botón
      doc.setFillColor(0, 0, 0);
      doc.rect(ctaX + 3, yPosition + 3, ctaWidth, ctaHeight, 'F');
      
      // Botón principal con gradiente
      doc.setFillColor(255, 59, 48);
      doc.rect(ctaX, yPosition, ctaWidth, ctaHeight, 'F');
      doc.setFillColor(255, 45, 85);
      doc.rect(ctaX, yPosition, ctaWidth, ctaHeight/2, 'F');
      
      // Texto del botón
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('⚡ VER PROPUESTA ⚡', pageWidth / 2, yPosition + 23, { align: 'center' });

      // === NUEVA PÁGINA - CONTENIDO PRINCIPAL ===
      doc.addPage();
      yPosition = 0;

      // === HEADER MINIMALISTA SEGUNDA PÁGINA ===
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(8, 28, 54);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MIRG Solutions', margin, 22);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Propuesta: MIRG-${submission.id.substring(0, 6)}`, pageWidth - margin - 50, 22);

      yPosition = 50;

      // === ⭐ SECCIÓN SERVICIOS ULTRA PROFESIONAL ===
      // Banner principal de servicios
      doc.setFillColor(8, 28, 54);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 50, 'F');
      
      // Efecto de brillo superior
      doc.setFillColor(255, 215, 0);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 3, 'F');
      
      // Título principal con icono
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('💎', margin + 15, yPosition + 20);
      doc.text('SERVICIOS PREMIUM', margin + 35, yPosition + 25);
      
      // Subtítulo elegante
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Soluciones digitales de clase mundial', margin + 35, yPosition + 35);
      
      // Badge de calidad
      doc.setFillColor(255, 215, 0);
      doc.rect(pageWidth - margin - 80, yPosition + 15, 60, 20, 'F');
      doc.setTextColor(8, 28, 54);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('🏆 PREMIUM', pageWidth - margin - 50, yPosition + 27, { align: 'center' });

      yPosition += 60;

      // === TABLA DE SERVICIOS CON DISEÑO LUXURY ===
      let productData: string[][] = [];
      let subtotalAmount = 0;
      const clientInfo: { [key: string]: any } = submission.data;
      
      switch (clientInfo.tipoDeServicio) {
        case 'E-commerce':
          productData = [
            ['🛒 Plataforma E-commerce Enterprise', '1', '$12,500.00', '$12,500.00'],
            ['🎨 Diseño UI/UX Premium + Branding', '1', '$3,800.00', '$3,800.00'],
            ['💳 Integración Completa de Pagos', '1', '$2,200.00', '$2,200.00'],
            ['⚡ Panel Admin Avanzado + Analytics', '1', '$2,800.00', '$2,800.00'],
            ['🚀 SEO Pro + Marketing Digital (6m)', '6', '$450.00', '$2,700.00'],
            ['🛡️ Hosting Enterprise + SSL + CDN', '1', '$680.00', '$680.00'],
            ['🔧 Soporte Premium 24/7 (12 meses)', '12', '$200.00', '$2,400.00']
          ];
          subtotalAmount = 27080.00;
          break;
          
        case 'Marketing Digital':
          productData = [
            ['📊 Estrategia Digital 360° Premium', '1', '$4,200.00', '$4,200.00'],
            ['📱 Gestión Pro Redes Sociales', '6', '$1,250.00', '$7,500.00'],
            ['🎯 Campañas Publicitarias Avanzadas', '6', '$950.00', '$5,700.00'],
            ['🎬 Producción Contenido Audiovisual', '6', '$680.00', '$4,080.00'],
            ['🌐 Landing Pages Optimizadas', '3', '$800.00', '$2,400.00'],
            ['📈 Analytics & Reporting Pro', '6', '$350.00', '$2,100.00'],
            ['🎪 Eventos Digitales & Webinars', '2', '$1,200.00', '$2,400.00']
          ];
          subtotalAmount = 28380.00;
          break;
          
        case 'Desarrollo Web':
          productData = [
            ['💻 Sitio Web Corporate Premium', '1', '$6,500.00', '$6,500.00'],
            ['📱 Diseño Responsive Multi-device', '1', '$2,800.00', '$2,800.00'],
            ['🔒 Panel CMS Avanzado + Seguridad', '1', '$2,200.00', '$2,200.00'],
            ['🚀 Optimización SEO Técnico Pro', '1', '$1,400.00', '$1,400.00'],
            ['📊 Integración Analytics Completa', '1', '$900.00', '$900.00'],
            ['⚡ Performance & Speed Optimization', '1', '$750.00', '$750.00'],
            ['🛠️ Mantenimiento Premium (12m)', '12', '$180.00', '$2,160.00']
          ];
          subtotalAmount = 16710.00;
          break;
          
        case 'Diseño Gráfico':
          productData = [
            ['🎨 Identidad Corporativa Luxury', '1', '$5,200.00', '$5,200.00'],
            ['✨ Logo Premium + Variaciones', '1', '$1,800.00', '$1,800.00'],
            ['📄 Material Gráfico Corporativo', '1', '$1,250.00', '$1,250.00'],
            ['🌐 Diseño Web Visual Premium', '1', '$2,500.00', '$2,500.00'],
            ['📱 Templates Redes Sociales Pro', '30', '$65.00', '$1,950.00'],
            ['📖 Manual de Marca Completo', '1', '$800.00', '$800.00'],
            ['🔄 Revisiones Ilimitadas (3m)', '3', '$400.00', '$1,200.00']
          ];
          subtotalAmount = 14700.00;
          break;
          
        default:
          productData = [
            ['🎯 Consultoría Estratégica Digital', '25', '$280.00', '$7,000.00'],
            ['📊 Análisis Mercado & Competencia', '1', '$2,200.00', '$2,200.00'],
            ['🚀 Plan Transformación Digital', '1', '$3,500.00', '$3,500.00'],
            ['👥 Capacitación Especializada', '10', '$350.00', '$3,500.00'],
            ['⚡ Implementación & Seguimiento', '4', '$1,200.00', '$4,800.00'],
            ['📈 Reportes Ejecutivos Mensuales', '6', '$450.00', '$2,700.00'],
            ['🛠️ Soporte Estratégico Continuo', '6', '$600.00', '$3,600.00']
          ];
          subtotalAmount = 27300.00;
      }

      try {
        (doc as any).autoTable({
          startY: yPosition,
          head: [['🎯 DESCRIPCIÓN DEL SERVICIO', 'CANT', 'PRECIO UNIT', '💰 TOTAL']],
          body: productData,
          theme: 'plain',
          headStyles: {
            fillColor: [8, 28, 54],
            textColor: [255, 255, 255],
            fontSize: 13,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 12,
            lineWidth: 0
          },
          bodyStyles: {
            fontSize: 11,
            cellPadding: 10,
            textColor: [33, 37, 41],
            lineWidth: 0.2,
            lineColor: [200, 200, 200]
          },
          columnStyles: {
            0: { 
              cellWidth: 105, 
              halign: 'left', 
              fontStyle: 'bold',
              textColor: [8, 28, 54]
            },
            1: { 
              cellWidth: 25, 
              halign: 'center',
              fillColor: [248, 250, 252]
            },
            2: { 
              cellWidth: 35, 
              halign: 'right',
              textColor: [100, 100, 100]
            },
            3: { 
              cellWidth: 35, 
              halign: 'right', 
              fontStyle: 'bold',
              textColor: [220, 53, 69],
              fillColor: [255, 248, 220]
            }
          },
          alternateRowStyles: {
            fillColor: [250, 251, 252]
          },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 25 : yPosition + 150;

      } catch (tableError) {
        console.warn('AutoTable failed:', tableError);
        yPosition += 150;
      }

      // === RESUMEN FINANCIERO TIPO APPLE ===
      const financialBoxWidth = 160;
      const financialBoxHeight = 120;
      const financialX = pageWidth - margin - financialBoxWidth;
      
      // Sombra elegante
      doc.setFillColor(0, 0, 0, 0.1);
      doc.rect(financialX + 4, yPosition + 4, financialBoxWidth, financialBoxHeight, 'F');
      
      // Caja principal con gradiente
      doc.setFillColor(255, 255, 255);
      doc.rect(financialX, yPosition, financialBoxWidth, financialBoxHeight, 'F');
      
      // Borde dorado
      doc.setDrawColor(255, 215, 0);
      doc.setLineWidth(3);
      doc.rect(financialX, yPosition, financialBoxWidth, financialBoxHeight, 'S');

      // Header premium
      doc.setFillColor(8, 28, 54);
      doc.rect(financialX, yPosition, financialBoxWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('💎 INVERSIÓN', financialX + financialBoxWidth/2, yPosition + 20, { align: 'center' });

      // Cálculos financieros
      const iva = subtotalAmount * 0.21;
      const total = subtotalAmount + iva;
      
      const financialData = [
        { 
          label: 'SUBTOTAL', 
          value: `$${subtotalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})}`, 
          size: 12, 
          color: [100, 100, 100],
          highlight: false 
        },
        { 
          label: 'IVA (21%)', 
          value: `$${iva.toLocaleString('es-AR', {minimumFractionDigits: 2})}`, 
          size: 12, 
          color: [100, 100, 100],
          highlight: false 
        },
        { 
          label: 'INVERSIÓN TOTAL', 
          value: `$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`, 
          size: 18, 
          color: [8, 28, 54],
          highlight: true 
        }
      ];

      financialData.forEach((item, index) => {
        const yPos = yPosition + 45 + (index * 20);
        
        if (item.highlight) {
          // Highlight dorado para el total
          doc.setFillColor(255, 215, 0);
          doc.rect(financialX + 8, yPos - 8, financialBoxWidth - 16, 16, 'F');
        }
        
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        doc.setFontSize(item.size);
        doc.setFont('helvetica', item.highlight ? 'bold' : 'normal');
        doc.text(item.label, financialX + 12, yPos);
        doc.text(item.value, financialX + financialBoxWidth - 12, yPos, { align: 'right' });
      });

      yPosition += financialBoxHeight + 30;

      // === CONTINUAR EN SIGUIENTE PÁGINA ===
      doc.addPage();
      yPosition = margin;

      // === INFORMACIÓN CLIENTE ELEGANTE ===
      doc.setFillColor(8, 28, 54);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('👤 INFORMACIÓN DEL CLIENTE', pageWidth / 2, 25, { align: 'center' });

      yPosition = 55;

      // Cards de información del cliente estilo premium
      const clientCards = [
        {
          title: '📧 CONTACTO',
          data: [
            ['Nombre:', clientInfo["1"] || clientInfo.nombreCompleto || 'N/A'],
            ['Email:', clientInfo.email || submission.customerEmail || 'N/A'],
            ['Teléfono:', clientInfo.telefono || submission.customerPhone || 'N/A']
          ],
          color: [64, 158, 255]
        },
        {
          title: '🏢 EMPRESA',
          data: [
            ['Organización:', clientInfo.empresa || 'N/A'],
            ['Profesión:', clientInfo.profesion || 'N/A'],
            ['Dirección:', clientInfo.direccion || 'No especificada']
          ],
          color: [50, 215, 75]
        }
      ];

      const clientCardWidth = (pageWidth - margin * 2 - 15) / 2;
      let clientCardX = margin;

      clientCards.forEach((card) => {
        // Sombra
        doc.setFillColor(0, 0, 0, 0.1);
        doc.rect(clientCardX + 3, yPosition + 3, clientCardWidth, 85, 'F');
        
        // Card background
        doc.setFillColor(255, 255, 255);
        doc.rect(clientCardX, yPosition, clientCardWidth, 85, 'F');
        
        // Border colorido
        doc.setDrawColor(card.color[0], card.color[1], card.color[2]);
        doc.setLineWidth(2);
        doc.rect(clientCardX, yPosition, clientCardWidth, 85, 'S');
        
        // Header
        doc.setFillColor(card.color[0], card.color[1], card.color[2]);
        doc.rect(clientCardX, yPosition, clientCardWidth, 20, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(card.title, clientCardX + 10, yPosition + 13);
        
        // Content
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        card.data.forEach(([label, value], index) => {
          const contentY = yPosition + 32 + (index * 15);
          doc.setFont('helvetica', 'bold');
          doc.text(label, clientCardX + 8, contentY);
          doc.setFont('helvetica', 'normal');
          const valueText = doc.splitTextToSize(value, clientCardWidth - 50);
          doc.text(valueText, clientCardX + 8, contentY + 8);
        });
        
        clientCardX += clientCardWidth + 15;
      });

      yPosition += 100;

      // === DESCRIPCIÓN DEL PROYECTO LUXURY ===
      if (clientInfo.descripcionDelProyecto && clientInfo.descripcionDelProyecto.trim()) {
        doc.setFillColor(255, 215, 0);
        doc.rect(margin, yPosition, pageWidth - margin * 2, 25, 'F');
        
        doc.setTextColor(8, 28, 54);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('📋 VISIÓN DEL PROYECTO', margin + 10, yPosition + 16);

        yPosition += 30;

        // Quote box elegante
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPosition, pageWidth - margin * 2, 50, 'F');
        doc.setDrawColor(255, 215, 0);
        doc.setLineWidth(3);
        doc.line(margin, yPosition, margin, yPosition + 50);

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        const description = doc.splitTextToSize(`"${clientInfo.descripcionDelProyecto}"`, pageWidth - margin * 2 - 20);
        doc.text(description, margin + 15, yPosition + 15);

        yPosition += 65;
      }

      // === NUEVA PÁGINA PARA TÉRMINOS LUXURY ===
      doc.addPage();
      
      // Fondo elegante para términos
      doc.setFillColor(250, 251, 252);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Header premium
      doc.setFillColor(8, 28, 54);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('📜 TÉRMINOS COMERCIALES', pageWidth / 2, 30, { align: 'center' });

      yPosition = 70;

      // Términos con diseño de cards premium
      const termsData = [
        {
          icon: '⏱️',
          title: 'PLAZOS & ENTREGAS',
          items: [
            'Desarrollo: 30-45 días hábiles',
            'Inicio tras anticipo confirmado',
            'Entregas parciales quinquenales'
          ],
          color: [52, 152, 219]
        },
        {
          icon: '💳',
          title: 'INVERSIÓN & PAGOS',
          items: [
            '50% anticipo para comenzar',
            '50% contra entrega final',
            'Transferencia, efectivo o cheque'
          ],
          color: [46, 204, 113]
        },
        {
          icon: '🛡️',
          title: 'GARANTÍAS',
          items: [
            '3 meses garantía completa',
            'Soporte incluido primer mes',
            'Capacitación profesional'
          ],
          color: [155, 89, 182]
        },
        {
          icon: '📝',
          title: 'CONDICIONES',
          items: [
            'Validez: 30 días calendario',
            'Precios finales con IVA',
            'Cambios cotizados aparte'
          ],
          color: [230, 126, 34]
        }
      ];

      const termsCardWidth = (pageWidth - margin * 2 - 15) / 2;
      let termsCardX = margin;
      let termsRow = 0;

      termsData.forEach((term, index) => {
        if (index % 2 === 0 && index > 0) {
          yPosition += 95;
          termsCardX = margin;
        }

        // Sombra
        doc.setFillColor(0, 0, 0, 0.05);
        doc.rect(termsCardX + 2, yPosition + 2, termsCardWidth, 85, 'F');
        
        // Card
        doc.setFillColor(255, 255, 255);
        doc.rect(termsCardX, yPosition, termsCardWidth, 85, 'F');
        
        // Border elegante
        doc.setDrawColor(term.color[0], term.color[1], term.color[2]);
        doc.setLineWidth(1);
        doc.rect(termsCardX, yPosition, termsCardWidth, 85, 'S');
        
        // Header con icono
        doc.setFillColor(term.color[0], term.color[1], term.color[2]);
        doc.rect(termsCardX, yPosition, termsCardWidth, 22, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text(term.icon, termsCardX + 8, yPosition + 15);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(term.title, termsCardX + 25, yPosition + 15);
        
        // Items
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        term.items.forEach((item, itemIndex) => {
          doc.text(`• ${item}`, termsCardX + 8, yPosition + 35 + (itemIndex * 12));
        });
        
        termsCardX += termsCardWidth + 15;
      });

      // === FOOTER ULTRA PREMIUM ===
      const footerY = pageHeight - 70;
      
      doc.setFillColor(8, 28, 54);
      doc.rect(0, footerY, pageWidth, 70, 'F');
      
      // Línea dorada
      doc.setFillColor(255, 215, 0);
      doc.rect(0, footerY, pageWidth, 4, 'F');

      doc.setTextColor(255, 215, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('✨ MIRG Solutions', pageWidth / 2, footerY + 25, { align: 'center' });
      
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Transformamos ideas en experiencias digitales extraordinarias', pageWidth / 2, footerY + 38, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`📧 ${companyInfo.email} • 📞 ${companyInfo.phone}`, pageWidth / 2, footerY + 50, { align: 'center' });
      
      doc.setFontSize(8);
      doc.text(`Documento Premium - ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 
                pageWidth / 2, footerY + 62, { align: 'center' });

      // Descargar con nombre premium
      const filename = `MIRG_Propuesta_Premium_${clientInfo.tipoDeServicio || 'Elite'}_${submission.id.substring(0, 8)}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Error al exportar a PDF');
    } finally {
      setLoading(false);
    }
  };

      // === TABLA DE SERVICIOS PRINCIPAL ===
      // Calcular servicios basados en el tipo solicitado
      let productData: string[][] = [];
      let subtotalAmount = 0;
      const clientInfo: { [key: string]: any } = submission.data;
      
      try {
        switch (clientInfo.tipoDeServicio) {
          case 'E-commerce':
            productData = [
              ['Plataforma E-commerce Completa', '1', '$8,500.00', '$8,500.00'],
              ['Diseño UI/UX Personalizado', '1', '$2,200.00', '$2,200.00'],
              ['Integración Mercado Pago + Paypal', '1', '$1,200.00', '$1,200.00'],
              ['Panel Administrativo Avanzado', '1', '$1,800.00', '$1,800.00'],
              ['SEO y Optimización (6 meses)', '6', '$350.00', '$2,100.00'],
              ['Hosting Premium + SSL (1 año)', '1', '$480.00', '$480.00'],
              ['Soporte y Mantenimiento (12 meses)', '12', '$150.00', '$1,800.00']
            ];
            subtotalAmount = 18080.00;
            break;
            
          case 'Marketing Digital':
            productData = [
              ['Estrategia Digital 360°', '1', '$2,800.00', '$2,800.00'],
              ['Gestión Completa Redes Sociales', '6', '$950.00', '$5,700.00'],
              ['Campañas Publicitarias Facebook/Instagram', '6', '$650.00', '$3,900.00'],
              ['Creación de Contenido Premium', '6', '$450.00', '$2,700.00'],
              ['Website Landing Page', '1', '$1,200.00', '$1,200.00'],
              ['Sistema de Reservas Online', '1', '$800.00', '$800.00'],
              ['Reportes y Analytics Mensual', '6', '$200.00', '$1,200.00']
            ];
            subtotalAmount = 18300.00;
            break;
            
          case 'Desarrollo Web':
            productData = [
              ['Sitio Web Corporativo Premium', '1', '$4,500.00', '$4,500.00'],
              ['Diseño Responsive Multi-dispositivo', '1', '$1,800.00', '$1,800.00'],
              ['Panel de Administración CMS', '1', '$1,500.00', '$1,500.00'],
              ['Optimización SEO Completa', '1', '$900.00', '$900.00'],
              ['Integración Analytics y Tracking', '1', '$600.00', '$600.00'],
              ['Hosting Premium + Dominio (1 año)', '1', '$350.00', '$350.00'],
              ['Mantenimiento y Soporte (6 meses)', '6', '$180.00', '$1,080.00']
            ];
            subtotalAmount = 10730.00;
            break;
            
          case 'Diseño Gráfico':
            productData = [
              ['Identidad Corporativa Completa', '1', '$3,200.00', '$3,200.00'],
              ['Logo + Variaciones', '1', '$800.00', '$800.00'],
              ['Material Gráfico (Tarjetas, Folletos)', '1', '$650.00', '$650.00'],
              ['Diseño Web Visual', '1', '$1,500.00', '$1,500.00'],
              ['Plantillas Redes Sociales', '20', '$45.00', '$900.00'],
              ['Manual de Marca', '1', '$400.00', '$400.00'],
              ['Revisiones y Ajustes', '3', '$200.00', '$600.00']
            ];
            subtotalAmount = 8050.00;
            break;
            
          default: // Consultoría
            productData = [
              ['Consultoría Estratégica Digital', '20', '$180.00', '$3,600.00'],
              ['Análisis de Mercado y Competencia', '1', '$1,200.00', '$1,200.00'],
              ['Plan de Transformación Digital', '1', '$2,500.00', '$2,500.00'],
              ['Capacitación Equipo (8 horas)', '8', '$250.00', '$2,000.00'],
              ['Implementación y Seguimiento', '3', '$800.00', '$2,400.00'],
              ['Reportes Mensuales', '6', '$300.00', '$1,800.00'],
              ['Soporte Continuo', '6', '$400.00', '$2,400.00']
            ];
            subtotalAmount = 15900.00;
        }

        (doc as any).autoTable({
          startY: yPosition,
          head: [['DESCRIPCIÓN DEL SERVICIO', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
          body: productData,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 8
          },
          bodyStyles: {
            fontSize: 11,
            cellPadding: 6,
            textColor: [33, 37, 41]
          },
          columnStyles: {
            0: { cellWidth: 100, halign: 'left', fontStyle: 'bold' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [220, 53, 69] }
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250]
          },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : yPosition + 120;

      } catch (tableError) {
        console.warn('AutoTable failed, using manual table:', tableError);
        yPosition += 120;
      }

      // === RESUMEN FINANCIERO DESTACADO ===
      const iva = subtotalAmount * 0.21;
      const total = subtotalAmount + iva;

      // Caja de totales premium y destacada
      const totalsBoxWidth = 140;
      const totalsBoxHeight = 90;
      const totalsX = pageWidth - margin - totalsBoxWidth;

      // Sombra de la caja
      doc.setFillColor(200, 200, 200);
      doc.rect(totalsX + 2, yPosition + 2, totalsBoxWidth, totalsBoxHeight, 'F');

      // Caja principal
      doc.setFillColor(248, 249, 250);
      doc.rect(totalsX, yPosition, totalsBoxWidth, totalsBoxHeight, 'F');
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(2);
      doc.rect(totalsX, yPosition, totalsBoxWidth, totalsBoxHeight, 'S');

      // Header de totales
      doc.setFillColor(0, 51, 102);
      doc.rect(totalsX, yPosition, totalsBoxWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('💰 RESUMEN FINANCIERO', totalsX + 70, yPosition + 13, { align: 'center' });

      // Líneas de totales con mejor formato
      const totalsData = [
        { label: 'SUBTOTAL:', value: `$${subtotalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})}`, size: 12, bold: false },
        { label: 'IVA (21%):', value: `$${iva.toLocaleString('es-AR', {minimumFractionDigits: 2})}`, size: 12, bold: false },
        { label: 'TOTAL FINAL:', value: `$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`, size: 16, bold: true }
      ];

      doc.setTextColor(0, 0, 0);
      totalsData.forEach((item, index) => {
        const yPos = yPosition + 35 + (index * 15);
        
        if (item.bold) {
          // Highlight para el total final
          doc.setFillColor(255, 215, 0);
          doc.rect(totalsX + 8, yPos - 8, totalsBoxWidth - 16, 12, 'F');
        }
        
        doc.setFontSize(item.size);
        doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
        doc.text(item.label, totalsX + 12, yPos);
        doc.text(item.value, totalsX + totalsBoxWidth - 12, yPos, { align: 'right' });
      });

      yPosition += totalsBoxHeight + 20;

      // === DATOS DEL CLIENTE (Ahora después de los precios) ===
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFillColor(46, 204, 113);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('👤 INFORMACIÓN DEL CLIENTE', margin + 5, yPosition + 10);

      yPosition += 20;

      // Cliente info en formato compacto
      const clientData = [
        ['Nombre:', clientInfo.nombreCompleto || 'N/A'],
        ['Empresa:', clientInfo.empresa || 'N/A'],  
        ['Email:', clientInfo.email || submission.customerEmail || 'N/A'],
        ['Teléfono:', clientInfo.telefono || submission.customerPhone || 'N/A'],
        ['Dirección:', clientInfo.direccion || 'No especificada'],
        ['Profesión:', clientInfo.profesion || 'No especificada']
      ];

      // Tabla simple de cliente
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), clientData.length * 8 + 10, 'F');
      doc.setDrawColor(46, 204, 113);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), clientData.length * 8 + 10, 'S');

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      clientData.forEach(([label, value], index) => {
        const yPos = yPosition + 8 + (index * 8);
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin + 8, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 50, yPos);
      });

      yPosition += clientData.length * 8 + 25;

      // === DESCRIPCIÓN DEL PROYECTO ===
      if (clientInfo.descripcionDelProyecto && clientInfo.descripcionDelProyecto.trim()) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFillColor(255, 193, 7);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), 12, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('📋 REQUERIMIENTOS DEL CLIENTE', margin + 5, yPosition + 8);

        yPosition += 17;

        doc.setFillColor(255, 248, 220);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), 35, 'F');
        doc.setDrawColor(255, 193, 7);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), 35, 'S');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const description = doc.splitTextToSize(clientInfo.descripcionDelProyecto, pageWidth - (margin * 2) - 12);
        doc.text(description, margin + 6, yPosition + 8);

        yPosition += 45;
      }

      // === NUEVA PÁGINA PARA TÉRMINOS ===
      doc.addPage();
      yPosition = margin;

      // Header términos
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setFillColor(255, 215, 0);
      doc.rect(0, 22, pageWidth, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('📋 TÉRMINOS Y CONDICIONES COMERCIALES', pageWidth / 2, 17, { align: 'center' });

      yPosition = 35;

      // Términos organizados y compactos
      const termsData = [
        {
          title: '⏱️ PLAZOS Y ENTREGAS',
          items: ['Tiempo estimado: 30-45 días hábiles', 'Inicio tras confirmación de anticipo', 'Entregas parciales cada 15 días'],
          color: [52, 152, 219]
        },
        {
          title: '💳 CONDICIONES DE PAGO', 
          items: ['50% anticipo para iniciar', '50% restante contra entrega', 'Transferencia, cheque o efectivo'],
          color: [46, 204, 113]
        },
        {
          title: '🛡️ GARANTÍAS',
          items: ['90 días garantía por defectos', 'Soporte incluido primer mes', 'Capacitación básica incluida'],
          color: [155, 89, 182]
        },
        {
          title: '📄 VALIDEZ Y MODIFICACIONES',
          items: ['Propuesta válida 30 días', 'Precios incluyen IVA', 'Cambios evaluados por separado'],
          color: [230, 126, 34]
        }
      ];

      termsData.forEach((section, index) => {
        const sectionHeight = 45;
        if (yPosition + sectionHeight > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }

        // Header sección
        doc.setFillColor(section.color[0], section.color[1], section.color[2]);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, margin + 5, yPosition + 8);

        yPosition += 15;

        // Items
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        section.items.forEach((item, itemIndex) => {
          doc.text(`• ${item}`, margin + 8, yPosition + (itemIndex * 7));
        });

        yPosition += 30;
      });

      // === FOOTER CORPORATIVO ===
      const footerY = pageHeight - 50;
      doc.setFillColor(0, 51, 102);
      doc.rect(0, footerY, pageWidth, 50, 'F');
      doc.setFillColor(255, 215, 0);
      doc.rect(0, footerY, pageWidth, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('🤝 Gracias por confiar en MIRG Solutions', pageWidth / 2, footerY + 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`📧 ${companyInfo.email} | 📞 ${companyInfo.phone}`, pageWidth / 2, footerY + 28, { align: 'center' });
      
      doc.setFontSize(8);
      doc.text(
        `Documento generado el ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES')}`,
        pageWidth / 2, footerY + 38, { align: 'center' }
      );

      // Descargar
      const filename = `MIRG_Propuesta_${clientInfo.tipoDeServicio || 'Servicios'}_${submission.id.substring(0, 8)}.pdf`;
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
      // Crear tabla con los datos del cliente
      const tableRows = Object.entries(submission.data).map(([key, value]) => 
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: formatFieldLabel(key), bold: true })]
              })],
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: formatValue(key, value) })]
              })],
            })
          ]
        })
      );

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header de la empresa
            new Paragraph({
              children: [
                new TextRun({
                  text: companyInfo.name,
                  bold: true,
                  size: 32,
                  color: "2962FF"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            
            // Información de la empresa
            new Paragraph({
              children: [
                new TextRun({ text: companyInfo.address, size: 20 })
              ],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Tel: ${companyInfo.phone} | Email: ${companyInfo.email}`, size: 20 })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),

            // Título
            new Paragraph({
              children: [
                new TextRun({
                  text: "COTIZACIÓN",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 }
            }),

            // Información de la cotización
            new Paragraph({
              children: [
                new TextRun({ text: "Formulario: ", bold: true }),
                new TextRun({ text: submission.formName })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Fecha de solicitud: ", bold: true }),
                new TextRun({ text: submission.createdAt.toLocaleDateString('es-ES') })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Estado: ", bold: true }),
                new TextRun({ text: getStatusText(submission.status) })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "ID de cotización: ", bold: true }),
                new TextRun({ text: `#${submission.id.substring(0, 8).toUpperCase()}` })
              ],
              spacing: { after: 400 }
            }),

            // Título de datos del cliente
            new Paragraph({
              children: [
                new TextRun({
                  text: "DATOS DEL CLIENTE",
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            }),

            // Tabla con datos
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Campo", bold: true })]
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Valor", bold: true })]
                      })],
                    })
                  ]
                }),
                ...tableRows
              ]
            }),

            // Notas si existen
            ...(submission.notes && submission.notes.trim() ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "NOTAS ADICIONALES",
                    bold: true,
                    size: 24
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),
              new Paragraph({
                children: [new TextRun({ text: submission.notes })],
                spacing: { after: 200 }
              })
            ] : []),

            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: `Cotización generada el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
                  size: 18,
                  italics: true,
                  color: "666666"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400 }
            })
          ]
        }]
      });

      // Generar y descargar el documento
      const buffer = await Packer.toBuffer(doc);
      const filename = `Cotizacion_${submission.formName.replace(/\s+/g, '_')}_${submission.id.substring(0, 8)}.docx`;
      
      saveAs(new Blob([buffer as BlobPart]), filename);
      
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

export default useQuoteExport;
