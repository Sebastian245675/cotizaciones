import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { MIRG_LOGO_BASE64 } from '../assets/mirg-logo-base64';
import { MIRG_DECORATIVE_BASE64 } from '../assets/mirg-decorative-base64';

// === TYPES & INTERFACES ===
interface QuoteSubmission {
  id: string;
  status: string;
  customerEmail?: string;
  customerPhone?: string;
  trackingCode?: string;
  data: { [key: string]: any };
  responseData?: {
    products: Array<{
      name: string;
      quantity: number;
      unitPrice: string;
      total: string;
      description?: string;
      imageUrl?: string;
    }>;
    respondedAt: Date;
    respondedBy: string;
  };
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
}

interface PDFConfig {
  margin: number;
  headerHeight: number;
  lineWidth: number;
  fontSize: {
    title: number;
    subtitle: number;
    normal: number;
    small: number;
  };
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    text: [number, number, number];
    lightBlue: [number, number, number];
    lightGray: [number, number, number];
    darkGray: [number, number, number];
  };
  taxRate: number;
  validityDays: number;
}

// === CONFIGURATION ===
const PDF_CONFIG: PDFConfig = {
  margin: 20,
  headerHeight: 65,
  lineWidth: 1,
  fontSize: {
    title: 28,
    subtitle: 18,
    normal: 10,
    small: 8
  },
  colors: {
    primary: [30, 79, 160],        // Azul profesional como en el PDF
    secondary: [51, 100, 199],     // Azul medio para secciones
    text: [60, 60, 60],
    lightBlue: [239, 246, 255],    // Azul muy claro para fondos alternos
    lightGray: [248, 250, 252],    // Gris claro para tablas como en el PDF
    darkGray: [31, 41, 55]
  },
  taxRate: 0.16,
  validityDays: 7
};

const defaultCompanyInfo: CompanyInfo = {
  name: 'MIRG - HECTOR ROLANDO RAMOS GARCIA',
  address: '4TA VIDRIERA #927 COL 1 DE MAYO EN MONTERREY, C.P. 64220. NUEVO LEON MEXICO',
  phone: '811-514-7756 / 811-796-7956',
  email: 'MIRGTALLER@GMAIL.COM',
  website: 'RFC: RAGH931025DP4'
};

// === UTILITY FUNCTIONS ===

/**
 * Safely adds decorative background image to PDF
 */
const addDecorativeBackground = (doc: jsPDF, pageWidth: number, pageHeight: number): void => {
  try {
    const imageConfig = {
      width: 120,
      height: 90,
      x: (pageWidth - 120) / 2,
      y: pageHeight - 90 - 30
    };
    
    doc.addImage(MIRG_DECORATIVE_BASE64, 'PNG', imageConfig.x, imageConfig.y, imageConfig.width, imageConfig.height, '', 'FAST');
  } catch (error) {
    console.warn('Could not load decorative background image:', error);
  }
};

/**
 * Safely adds logo to PDF with fallback
 */
const addLogoToPDF = (doc: jsPDF, logoToUse: string, x: number, y: number, width: number, height: number): void => {
  try {
    doc.addImage(logoToUse, 'PNG', x, y, width, height);
  } catch (error) {
    console.warn('Error adding custom logo, trying fallback:', error);
    try {
      doc.addImage(MIRG_LOGO_BASE64, 'PNG', x, y, width, height);
    } catch (fallbackError) {
      console.error('Error adding fallback logo:', fallbackError);
    }
  }
};

/**
 * Extracts client name from various possible fields
 */
const getClientName = (clientInfo: any, submission: QuoteSubmission): string => {
  const possibleFields = ["1", "nombreCompleto", "nombre_completo", "nombre", "name", "cliente", "client_name", "full_name", "contacto", "responsable"];
  
  for (const field of possibleFields) {
    const value = clientInfo[field]?.toString().trim();
    if (value && !value.includes('@') && value.length > 1) {
      return value;
    }
  }
  
  return 'Cliente';
};

/**
 * Extracts company name from client info
 */
const getCompanyName = (clientInfo: any): string => {
  const possibleCompanyFields = ['empresa', 'razonSocial', 'razon_social', 'company', 'organization', 'organizacion'];
  
  // Primero buscar en campos con nombres conocidos
  for (const field of possibleCompanyFields) {
    if (clientInfo[field] && clientInfo[field].trim()) {
      return clientInfo[field].trim();
    }
  }
  
  // Buscar en campos dinámicos (como 1757191663926) que contengan nombres de empresa
  for (const [key, value] of Object.entries(clientInfo)) {
    if (typeof value === 'string' && value.trim()) {
      const val = value.trim().toLowerCase();
      // Si contiene palabras relacionadas con empresa o tiene formato de empresa
      if (val.includes('sas') || val.includes('s.a.s') || val.includes('ltda') || 
          val.includes('s.a') || val.includes('inc') || val.includes('corp') ||
          val.includes('empresa') || val.includes('industrias') || val.includes('comercial') ||
          val.includes('servicios') || val.includes('group') || val.includes('cia')) {
        return value.trim();
      }
    }
  }
  
  return 'No especificado';
};

// Función helper para obtener la dirección
const getAddress = (clientInfo: any): string => {
  const possibleAddressFields = [
    'direccion', 'address', 'domicilio', 'ubicacion', 'location'
  ];
  
  // Buscar en campos con nombres conocidos
  for (const field of possibleAddressFields) {
    if (clientInfo[field] && clientInfo[field].trim()) {
      return clientInfo[field].trim();
    }
  }
  
  // Buscar en campos dinámicos que parezcan direcciones
  for (const [key, value] of Object.entries(clientInfo)) {
    if (typeof value === 'string' && value.trim()) {
      const val = value.trim().toLowerCase();
      
      // EXCLUIR emails explícitamente
      if (val.includes('@') || val.includes('.com') || val.includes('.co') || val.includes('.net')) {
        continue;
      }
      
      // EXCLUIR nombres de empresa
      if (val.includes('sas') || val.includes('s.a.s') || val.includes('ltda') || 
          val.includes('s.a') || val.includes('inc') || val.includes('corp') ||
          val.includes('empresa') || val.includes('industrias') || val.includes('comercial')) {
        continue;
      }
      
      // EXCLUIR sectores/profesiones
      if (val.includes('industrial') || val.includes('comercial') || val.includes('servicios') ||
          val.includes('tecnologia') || val.includes('construccion') || val.includes('salud')) {
        continue;
      }
      
      // EXCLUIR números de teléfono (solo números)
      if (/^\d+$/.test(val.replace(/[\s\-\(\)\+]/g, ''))) {
        continue;
      }
      
      // Buscar patrones de dirección específicos
      if (val.includes('calle') || val.includes('avenida') || val.includes('carrera') ||
          val.includes('av.') || val.includes('cr.') || val.includes('cl.') ||
          val.includes('street') || val.includes('avenue') || val.includes('#') ||
          val.includes('km') || val.includes('mz') || val.includes('lote') ||
          /calle\d+/.test(val) || // Patrones como "calle4asur"
          /\d+.*[a-z].*\d*/.test(val)) { // Números mezclados con letras
        return value.trim();
      }
    }
  }
  
  return 'No especificada';
};

// Función helper para obtener el sector/profesión
const getSector = (clientInfo: any): string => {
  const possibleSectorFields = [
    'sector', 'profesion', 'profession', 'industry', 'industria', 'rubro', 'actividad'
  ];
  
  // Buscar en campos con nombres conocidos
  for (const field of possibleSectorFields) {
    if (clientInfo[field] && clientInfo[field].trim()) {
      return clientInfo[field].trim();
    }
  }
  
  // Buscar en campos dinámicos que parezcan sectores
  for (const [key, value] of Object.entries(clientInfo)) {
    if (typeof value === 'string' && value.trim()) {
      const val = value.trim().toLowerCase();
      // Si contiene palabras relacionadas con sectores industriales
      if (val.includes('industrial') || val.includes('comercial') || val.includes('servicios') ||
          val.includes('tecnologia') || val.includes('construccion') || val.includes('salud') ||
          val.includes('educacion') || val.includes('agricultura') || val.includes('manufactura') ||
          val.includes('retail') || val.includes('financiero')) {
        return value.trim();
      }
    }
  }
  
  return 'Industrial';
};

// Función helper para obtener el teléfono
const getPhone = (clientInfo: any, submission: QuoteSubmission): string => {
  // Buscar en campos con nombres conocidos primero
  const possiblePhoneFields = [
    'telefono', 'phone', 'celular', 'movil', 'mobile'
  ];
  
  for (const field of possiblePhoneFields) {
    if (clientInfo[field] && clientInfo[field].trim()) {
      return clientInfo[field].trim();
    }
  }
  
  // Buscar en campos dinámicos que parezcan teléfonos
  for (const [key, value] of Object.entries(clientInfo)) {
    if (typeof value === 'string' && value.trim()) {
      const val = value.trim();
      // Si parece un número de teléfono (solo números, guiones, espacios, paréntesis, +)
      if (/^[\d\s\-\(\)\+]+$/.test(val) && val.length >= 7 && val.length <= 15) {
        return val;
      }
    }
  }
  
  // Fallback al teléfono del customer
  return submission.customerPhone || 'No especificado';
};

// Función helper para obtener el tipo de servicio
const getServiceType = (clientInfo: any): string => {
  const possibleServiceFields = [
    'tipoDeServicio', 'tipo_servicio', 'serviceType', 'service_type', 'categoria', 'category'
  ];
  
  // Buscar en campos con nombres conocidos
  for (const field of possibleServiceFields) {
    if (clientInfo[field] && clientInfo[field].trim()) {
      return clientInfo[field].trim();
    }
  }
  
  // Buscar en campos dinámicos que parezcan tipos de servicio
  for (const [key, value] of Object.entries(clientInfo)) {
    if (typeof value === 'string' && value.trim()) {
      const val = value.trim().toLowerCase();
      // Si contiene palabras relacionadas con tipos de servicio
      if (val.includes('desarrollo') || val.includes('diseño') || val.includes('marketing') ||
          val.includes('consultoría') || val.includes('e-commerce') || val.includes('web') ||
          val.includes('digital') || val.includes('software') || val.includes('sistemas') ||
          val.includes('industrial') || val.includes('manufactura') || val.includes('maquinado')) {
        return value.trim();
      }
    }
  }
  
  return 'General';
};

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    pending: 'Pendiente',
    reviewed: 'Revisado', 
    responded: 'Respondido',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
    closed: 'Cerrado',
    approved: 'Aprobada',
    processing: 'En proceso'
  };
  return statusMap[status] || status;
};

/**
 * Formats currency amount for display
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Simple function to format price strings with Mexican comma separators
 */
const formatPriceString = (price: string): string => {
  
  if (!price || price === 'A cotizar') return price;
  
  // Si ya tiene formato de moneda, devolverlo tal como está
  if (price.includes('$')) return price;
  
  // Remover cualquier caracter no numérico excepto punto decimal
  const cleanPrice = price.toString().replace(/[^\d.-]/g, '');
  const num = parseFloat(cleanPrice);
  
  if (isNaN(num)) return price;
  
  // Formatear manualmente con comas mexicanas
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const result = `${integerPart}.${parts[1]}`;
  console.log('formatPriceString result:', result);
  return result;
};

/**
 * Calculates tax amount
 */
const calculateTax = (subtotal: number): number => {
  return subtotal * PDF_CONFIG.taxRate;
};

/**
 * Generates quote dates
 */
const generateQuoteDates = () => {
  const quoteDate = new Date().toLocaleDateString('es-ES');
  const validUntil = new Date(Date.now() + PDF_CONFIG.validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES');
  return { quoteDate, validUntil };
};

/**
 * Extracts numbers from currency strings with proper format handling
 */
const extractNumber = (str: string): number => {
  let cleaned = str.replace(/[$ARS€£¥\s]/g, '');
  
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    const parts = cleaned.split('.');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  }
  else if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
};

// === MAIN EXPORT HOOK ===
/**
 * Custom hook for exporting quotes to PDF and Word formats
 * 
 * Features:
 * - PDF generation with automatic layout and styling
 * - Word document export
 * - Support for product images and custom logos
 * - Automatic tax calculations
 * - Responsive design for different content lengths
 * 
 * @returns {Object} Hook interface with loading state and export functions
 */
export const useQuoteExport = () => {
  const [loading, setLoading] = useState(false);

  /**
   * PRIMERA_FUNCION - Exports a quote submission to PDF format
   * 
   * @param {QuoteSubmission} submission - The quote data to export
   * @param {CompanyInfo} companyInfo - Company information for the PDF header
   * @returns {Promise<void>} Promise that resolves when export is complete
   * @throws {Error} When submission data is invalid
   */
  const exportToPDF = async (
    submission: QuoteSubmission, 
    companyInfo: CompanyInfo = defaultCompanyInfo
  ): Promise<void> => {
    if (!submission?.id) {
      throw new Error('Invalid submission data: Missing required ID');
    }

    setLoading(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = PDF_CONFIG.margin;
      let yPosition = margin;

      // === HEADER CORPORATIVO ORGANIZADO ===
      // Fondo limpio y uniforme
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, PDF_CONFIG.headerHeight, 'F');
      
      // Línea inferior sutil para separar header
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.line(0, 65, pageWidth, 65);
      
      // Buscar imagen/logo en los datos de la cotización
      let logoToUse = MIRG_LOGO_BASE64;
      const submittedImages = Object.entries(submission.data).find(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image/')
      );
      
      if (submittedImages && submittedImages[1]) {
        logoToUse = submittedImages[1] as string;
      }
      
      // Agregar logo MIRG oficial
      try {
        doc.addImage(logoToUse, 'PNG', margin, 25, 50, 30);
      } catch (error) {
        console.log('Error adding logo:', error);
        // Intentar con logo MIRG oficial si falla
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 25, 50, 30);
        } catch (fallbackError) {
          console.log('Error adding MIRG logo:', fallbackError);
        }
      }
      
      // TÍTULO DE LA EMPRESA - ULTRA ESTILIZADO
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      // Centrar el texto MIRG
      const companyTitle = companyInfo.name.split(' - ')[0] || companyInfo.name; // Tomar solo la primera parte antes del gui�n
      const textWidth = doc.getTextWidth(companyTitle);
      const companyCenterX = (pageWidth - textWidth) / 2;
      doc.text(companyTitle, companyCenterX, 35);
      
      // Línea decorativa bajo el nombre      doc.setLineWidth(1); // Reducido de 3 a 1 para más delgado
      const lineWidth = 60; // Ancho de la línea
      const lineStartX = (pageWidth - lineWidth) / 2;
      doc.line(lineStartX, 37, lineStartX + lineWidth, 37);
      
      // Texto descriptivo debajo de la línea azul (más pequeño)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      // Centrar el primer texto descriptivo
      const descriptiveText1 = 'MIRG MAQUINADOS INDUSTRIALES RAMOZ';
      const descriptiveText1Width = doc.getTextWidth(descriptiveText1);
      const descriptive1CenterX = (pageWidth - descriptiveText1Width) / 2;
      doc.text(descriptiveText1, descriptive1CenterX, 43);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      // Centrar el segundo texto descriptivo
      const descriptiveText2 = 'GUZMAN';
      const descriptiveText2Width = doc.getTextWidth(descriptiveText2);
      const descriptive2CenterX = (pageWidth - descriptiveText2Width) / 2;
      doc.text(descriptiveText2, descriptive2CenterX, 47);

      // INFORMACIÓN DE CONTACTO - ESTILO MODERNO (más a la derecha)
      const contactX = pageWidth - margin - 45; // Posición del contacto ajustada para más espacio
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTACTO', contactX, 31);
      
      // Información de contacto completa con dirección dividida y alineada
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      
      const contactLabelWidth = 8; // Ancho s�per compacto para m�xima proximidad
      
      // Email
      doc.text('Email:', contactX, 34);
      doc.text(companyInfo.email, contactX + contactLabelWidth, 34);
      
      // Teléfono
      doc.text('Tel:', contactX, 37);
      doc.text(companyInfo.phone, contactX + contactLabelWidth, 37);
      
      // Dirección dividida en dos líneas con alineación
      const addressLines = doc.splitTextToSize(companyInfo.address, 45);
      // Direcci�n din�mica basada en configuraci�n
      doc.text('Dir:', contactX, 40);
      if (addressLines.length > 1) { doc.text(addressLines[0], contactX + contactLabelWidth, 40); } else { doc.text(addressLines[0], contactX + contactLabelWidth, 40); }
      if (addressLines.length > 1) { doc.text(addressLines[1], contactX + contactLabelWidth, 43); }
      
      // RFC
      doc.text('RFC:', contactX, 46);
      doc.text(companyInfo.website || 'RFC: RAGH931025DP4', contactX + contactLabelWidth, 46);

      yPosition = 85;

      // === TÍTULO PRINCIPAL SIMPLE ===
      // Fondo simple para el título
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 18, 'F');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      
      // Texto simple sin efectos
      doc.text('COTIZACIÓN COMERCIAL', margin + 5, yPosition + 12);
      
      // Línea decorativa simple      doc.line(margin, yPosition + 18, pageWidth - margin, yPosition + 18);
      
      yPosition += 25;

      // === INFORMACIÓN DE LA COTIZACIÓN - DISEÑO PREMIUM ===
      const quoteDate = new Date().toLocaleDateString('es-ES');
      const validUntil = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('es-ES');
      const quoteNumber = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;

      // Marco principal con sombra      doc.rect(margin - 2, yPosition + 2, pageWidth - (margin * 2) + 4, 42, 'F');      doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'F');      doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'S');

      // Sección izquierda - Info de cotización
      // === SECCIÓN IZQUIERDA - INFORMACIÓN DE COTIZACIÓN ===
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(margin, yPosition, (pageWidth - (margin * 2)) / 2, 40, 'F');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE COTIZACIÓN', margin + 8, yPosition + 10);
      
      // Datos de cotización con alineación consistente
      const quoteInfoData = [
        { label: 'N° Cotización:', value: quoteNumber, y: yPosition + 18 },
        { label: 'Fecha de Emisión:', value: quoteDate, y: yPosition + 24 },
        { label: 'Válida hasta:', value: validUntil, y: yPosition + 30 }
      ];
      
      const quoteLabelWidth = 35; // Reducido de 50 a 35 para menos espacio
      quoteInfoData.forEach(item => {
        // Etiqueta
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, margin + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 197, 253);
        doc.text(item.value, margin + 10 + quoteLabelWidth, item.y);
      });

      // === SECCIÓN DERECHA - ESTADO Y TIPO ===
      const clientInfo: { [key: string]: any } = submission.data;
      const rightX = margin + (pageWidth - (margin * 2)) / 2;
      
      doc.setFillColor(250, 250, 250);
      doc.rect(rightX, yPosition, (pageWidth - (margin * 2)) / 2, 40, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO DE PROCESO', rightX + 10, yPosition + 10);
      
      // Datos de estado con alineación consistente
      const statusInfoData = [
        { label: 'Estado:', value: getStatusText(submission.status).toUpperCase(), y: yPosition + 18 },
        { label: 'Prioridad:', value: 'ALTA', y: yPosition + 24 },
        { label: 'Categoria:', value: getSector(clientInfo).toUpperCase(), y: yPosition + 30 }
      ];
      
      const statusLabelWidth = 25; // Reducido de 35 a 25 para menos espacio
      statusInfoData.forEach(item => {
        // Etiqueta
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, rightX + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(item.value, rightX + 10 + statusLabelWidth, item.y);
      });

      yPosition += 55;      // === DATOS DEL CLIENTE - ESTILO SIMPLE ===
      // Título simple
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PERFIL DEL CLIENTE', margin, yPosition);
      
      // Línea decorativa      doc.line(margin, yPosition + 3, margin + 80, yPosition + 3);
      
      yPosition += 15;

      // Marco principal del cliente simple      doc.rect(margin, yPosition, pageWidth - (margin * 2), 65, 'F');
      
      
      doc.setDrawColor(200, 200, 200);      doc.rect(margin, yPosition, pageWidth - (margin * 2), 65, 'S');

      // Línea divisoria vertical simple
      const centerX = pageWidth / 2;      doc.line(centerX, yPosition, centerX, yPosition + 65);

      // === COLUMNA IZQUIERDA - DATOS PRINCIPALES ===
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(margin, yPosition, centerX - margin, 25, 'F');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACION CORPORATIVA', margin + 10, yPosition + 12);

      let clientY = yPosition + 32;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      // Definir etiquetas y valores con alineación consistente
      const leftColumnLabels = [
        { label: 'Razon Social:', value: getCompanyName(clientInfo), y: clientY },
        { label: 'Contacto:', value: getClientName(clientInfo, submission), y: clientY + 10 },
        { label: 'Email:', value: clientInfo["2"] || clientInfo.email || submission.customerEmail || 'No especificado', y: clientY + 20 },
        { label: 'Telefono:', value: getPhone(clientInfo, submission), y: clientY + 30 }
      ];

      // Dibujar etiquetas y valores alineados
      const clientLabelWidth = 25; // Reducido de 35 a 25 para menos espacio
      leftColumnLabels.forEach(item => {
        // Etiqueta
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, margin + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        
        // Manejo especial para email largo
        if (item.label === 'Email:') {
          const emailText = doc.splitTextToSize(item.value, centerX - (margin + 10 + clientLabelWidth) - 5);
          doc.text(emailText, margin + 10 + clientLabelWidth, item.y);
        } else {
          doc.text(item.value, margin + 10 + clientLabelWidth, item.y);
        }
      });

      // === COLUMNA DERECHA - DATOS ADICIONALES ===
      doc.setFillColor(250, 250, 250);
      doc.rect(centerX, yPosition, pageWidth - margin - centerX, 25, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLES ADICIONALES', centerX + 10, yPosition + 12);
      
      // Definir etiquetas y valores para columna derecha
      const rightColumnLabels = [
        { label: 'Direccion:', value: getAddress(clientInfo), y: clientY },
        { label: 'Sector:', value: getSector(clientInfo), y: clientY + 20 }
      ];

      // Dibujar etiquetas y valores alineados en columna derecha
      const rightLabelWidth = 20; // Reducido de 30 a 20 para menos espacio
      rightColumnLabels.forEach(item => {
        // Etiqueta
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(item.label, centerX + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        
        // Manejo especial para dirección larga
        if (item.label === 'Direccion:') {
          const addressLines = doc.splitTextToSize(item.value, pageWidth - margin - centerX - 10 - rightLabelWidth - 5);
          doc.text(addressLines, centerX + 10 + rightLabelWidth, item.y);
        } else {
          doc.text(item.value, centerX + 10 + rightLabelWidth, item.y);
        }
      });

      yPosition += 75;

      // === NUEVA PÁGINA PARA PRODUCTOS Y SERVICIOS - ESTILO PREMIUM ===
      doc.addPage();
      
      // Agregar imagen decorativa de fondo en la segunda página
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
      
      yPosition = 30;

      // Header estilizado para segunda página
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, 8, 'F');
      
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(0, 8, pageWidth, 6, 'F');
      
      doc.setFillColor(235, 235, 235);
      doc.rect(0, 14, pageWidth, 4, 'F');
      
      doc.setFillColor(250, 250, 250);
      doc.rect(0, 18, pageWidth, 2, 'F');
      
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 20, pageWidth, 25, 'F');
      
      // Logo pequeño con marco      doc.rect(margin - 1, 23, 22, 16, 'F');      doc.rect(margin - 1, 23, 22, 16, 'S');
      
      try {
        doc.addImage(logoToUse, 'PNG', margin, 20, 35, 25);
      } catch (error) {
        console.log('Error adding logo to second page:', error);
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 20, 35, 25);
        } catch (fallbackError) {
          console.log('Error adding MIRG logo to second page:', fallbackError);
        }
      }
      
      // Información de cotización en segunda página (sin nombre de empresa)
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
      doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 45, 30);

      yPosition = 50;

      // === TÍTULO DE PRODUCTOS - DISEÑO IMPACTANTE ===
      // === TÍTULO DE PRODUCTOS ORGANIZADO ===
      // Fondo limpio y uniforme
      doc.setFillColor(248, 250, 252);
      doc.rect(margin - 2, yPosition - 2, pageWidth - (margin * 2) + 4, 20, 'F');
      
      // Borde sutil para definir sección
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.rect(margin - 2, yPosition - 2, pageWidth - (margin * 2) + 4, 20, 'S');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      
      // Centrar el título de la sección
      const productsTitleText = 'DETALLE DE PRODUCTOS Y SERVICIOS';
      const productsTitleWidth = doc.getTextWidth(productsTitleText);
      const productsTitleX = (pageWidth - productsTitleWidth) / 2;
      doc.text(productsTitleText, productsTitleX, yPosition + 10);
      
      yPosition += 30;

      // Generar productos basados en los datos reales del formulario del cliente
      let productData: string[][] = [];
      let subtotalAmount = 0;
      
      // Extraer los productos/servicios específicos que el cliente seleccionó
      const selectedProducts: string[][] = [];
      let foundProducts = false;
      
      // VERIFICAR SI HAY DATOS DE RESPUESTA CON PRECIOS
      const hasResponseData = (submission as any).responseData && (submission as any).responseData.products;
      console.log('¿Tiene datos de respuesta?', hasResponseData);
      
      // Array para almacenar los productos con sus imágenes
      let productsWithImages: Array<{
        name: string;
        quantity: string;
        unitPrice: string;
        total: string;
        imageUrl?: string;
        description?: string;
      }> = [];
      
      if (hasResponseData) {
        console.log('=== USANDO DATOS DE RESPUESTA CON PRECIOS ===');
        const responseProducts = (submission as any).responseData.products;
        
        responseProducts.forEach((product: any) => {
          const unitPrice = product.unitPrice || 'A cotizar';
          const total = product.total || 'A cotizar';
          
          productsWithImages.push({
            name: product.name,
            quantity: product.quantity.toString(),
            unitPrice: unitPrice,
            total: formatPriceString(total),
            imageUrl: product.imageUrl || '',
            description: product.description || ''
          });
          
          selectedProducts.push([
            product.name,
            product.quantity.toString(),
            unitPrice,
            total
          ]);
        });
        
        foundProducts = true;
        console.log('Productos con precios cargados:', selectedProducts);
      } else {
        console.log('=== EXTRAYENDO PRODUCTOS DE DATOS ORIGINALES ===');
        
        // Debug: Mostrar todos los datos del cliente
        console.log('=== DATOS COMPLETOS DEL CLIENTE ===');
        console.log('clientInfo:', clientInfo);
        console.log('Campos disponibles:', Object.keys(clientInfo));
      
      // Función auxiliar para convertir cualquier valor a string legible
      const valueToString = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value ? 'Sí' : 'No';
        if (Array.isArray(value)) {
          return value.map(item => valueToString(item)).filter(Boolean).join(', ');
        }
        if (typeof value === 'object') {
          // Si es un objeto, intentar extraer información útil
          if (value.name || value.nombre) return valueToString(value.name || value.nombre);
          if (value.description || value.descripcion) return valueToString(value.description || value.descripcion);
          if (value.text || value.texto) return valueToString(value.text || value.texto);
          if (value.value || value.valor) return valueToString(value.value || value.valor);
          // Como último recurso, intentar JSON.stringify
          try {
            const str = JSON.stringify(value);
            return str.length < 100 ? str : 'Objeto complejo';
          } catch {
            return 'Datos del cliente';
          }
        }
        return String(value);
      };
      
      // Buscar productos específicos en los datos del cliente
      // NUEVA LÓGICA: Buscar productos dinámicos y por ID de campo
      
      let foundProducts = false;
      
      console.log('=== DEPURACIÓN DE DATOS COMPLETOS ===');
      console.log('clientInfo completo:', JSON.stringify(clientInfo, null, 2));
      console.log('Claves disponibles:', Object.keys(clientInfo));
      
      // 1. BUSCAR POR ID DE CAMPO (la forma más directa)
      // Los campos de productos se guardan con su ID (ej: "3", "products_field_id", etc.)
      Object.entries(clientInfo).forEach(([key, value]) => {
        console.log(`Analizando campo "${key}":`, value);
        
        // Si es un array de productos (campo tipo "products")
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          // Verificar si tiene estructura de producto
          if (firstItem && typeof firstItem === 'object' && 
              (firstItem.name || firstItem.id || firstItem.description)) {
            console.log(`¡Campo de productos encontrado en "${key}"!:`, value);
            
            value.forEach((product: any, index: number) => {
              const productName = product.name || 
                                 product.nombre || 
                                 product.producto || 
                                 `Producto ${index + 1}`;
              
              const description = product.description || 
                                 product.descripcion || 
                                 product.especificaciones || 
                                 '';
              
              const quantity = product.quantity || 
                              product.cantidad || 
                              product.unidades || 
                              1;
              
              const budget = product.estimatedPrice || 
                            product.precio || 
                            product.presupuesto || 
                            'A cotizar';
              
              let fullProductName = productName;
              if (description && description.trim()) {
                fullProductName += ` - ${description}`;
              }
              
              console.log(`Producto procesado: ${fullProductName} (Cant: ${quantity}, Precio: ${budget})`);
              
              selectedProducts.push([
                fullProductName,
                quantity.toString(),
                budget === 'A cotizar' || !budget ? 'A cotizar' : budget,
                'A cotizar'
              ]);
              foundProducts = true;
            });
          }
        }
      });
      
      // 2. Si no encontramos productos por ID, buscar ítems dinámicos (Item #1, Item #2, etc.)
      if (!foundProducts) {
        const itemKeys = Object.keys(clientInfo).filter(key => key.match(/^Item #\d+$/));
        console.log('Items dinámicos encontrados:', itemKeys);
        
        if (itemKeys.length > 0) {
          itemKeys.forEach(itemKey => {
            const item = clientInfo[itemKey];
            console.log(`Procesando ${itemKey}:`, item);
            
            if (item && typeof item === 'object') {
              const productName = item['Nombre del Producto/Servicio'] || 
                                 item['nombre'] || 
                                 item['producto'] || 
                                 'Producto no especificado';
              
              const quantity = item['Cantidad'] || 
                              item['cantidad'] || 
                              '1';
              
              const description = item['Descripción y Especificaciones'] || 
                                 item['descripcion'] || 
                                 '';
              
              const budget = item['Rango de Presupuesto Esperado (opcional)'] || 
                            item['presupuesto'] || 
                            'A cotizar';
              
              let fullProductName = productName;
              if (description && description.trim()) {
                fullProductName += ` - ${description}`;
              }
              
              console.log(`Producto extraído de ${itemKey}: ${fullProductName}, Cantidad: ${quantity}, Presupuesto: ${budget}`);
              
              selectedProducts.push([
                fullProductName,
                quantity.toString(),
                budget === 'A cotizar' ? 'A cotizar' : budget,
                'A cotizar'
              ]);
              foundProducts = true;
            }
          });
        }
      }
      
      // 3. Si no encontramos en campos específicos, buscar en campos tradicionales
      if (!foundProducts) {
        const productFieldNames = [
          'productosOServiciosRequeridos',
          'productos',
          'servicios', 
          'Productos o Servicios Requeridos',
          'productosServicios',
          'serviciosRequeridos',
          'descripcionDelProyecto',
          'descripcionAdicionalDelProyecto',
          'Descripción del Proyecto',
          'especificaciones',
          'requerimientos'
        ];
        
        for (const fieldName of productFieldNames) {
          const fieldValue = clientInfo[fieldName];
          if (fieldValue) {
            console.log(`Campo tradicional ${fieldName}:`, fieldValue);
            const productText = valueToString(fieldValue);
            if (productText && productText.trim() && 
                productText !== 'Agregue los productos o servicios que necesita cotizar') {
              selectedProducts.push([productText, '1', 'A cotizar', 'A cotizar']);
              foundProducts = true;
              break;
            }
          }
        }
      }
      
      // 4. Como último recurso, buscar en cualquier campo que contenga "producto" o "servicio"
      if (!foundProducts) {
        Object.entries(clientInfo).forEach(([key, value]) => {
          const keyLower = key.toLowerCase();
          if ((keyLower.includes('producto') || keyLower.includes('servicio') || 
               keyLower.includes('descripcion') || keyLower.includes('especificacion') ||
               keyLower.includes('requerimiento')) && value) {
            const productText = valueToString(value);
            if (productText && productText !== 'Datos del cliente' && productText !== 'Objeto complejo') {
              selectedProducts.push([productText, '1', 'A cotizar', 'A cotizar']);
              foundProducts = true;
            }
          }
        });
      }
      
      // Si aún no encontramos productos, usar un mensaje genérico
      if (!foundProducts) {
        selectedProducts.push(['Servicios requeridos según especificaciones del cliente', '1', 'A cotizar', 'A cotizar']);
      }
      } // Cerrar el else de datos originales

      productData = selectedProducts;

      // Debug: mostrar productos en consola
      console.log('Products to display:', productData);
      console.log('Products with images:', productsWithImages);
      console.log('Client data keys:', Object.keys(clientInfo));
      
      // No calculamos subtotal automáticamente ya que son cotizaciones
      subtotalAmount = 0;

      // === NUEVA TABLA DE PRODUCTOS CON SOPORTE PARA IMÁGENES ===
      let tableSuccessful = false;
      
      // Si hay productos con imágenes, usar tabla manual mejorada
      if (productsWithImages.length > 0 && productsWithImages.some(p => p.imageUrl)) {
        console.log('Generando tabla con imágenes...');
        
        // Header de la tabla - solo borde azul, sin fondo
        const tableHeaderHeight = 15;
        doc.setDrawColor(41, 98, 255); // Azul para el borde
        doc.setLineWidth(1);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'S'); // Solo borde, sin relleno
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
        doc.text('CANT.', margin + 120, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', pageWidth - margin - 15, yPosition + 10, { align: 'right' });
        
        yPosition += tableHeaderHeight;
        
        // Procesar cada producto con altura dinámica
        productsWithImages.forEach((product, index) => {
          // Calcular altura necesaria para la fila
          let rowHeight = 25; // Altura base
          
          // Si hay imagen, aumentar altura
          if (product.imageUrl && product.imageUrl.trim()) {
            rowHeight = 35;
          }
          
          // Si hay descripción larga, aumentar altura
          if (product.description && product.description.length > 50) {
            rowHeight = Math.max(rowHeight, 45); // Aumentado para permitir 2 l�neas de descripci�n
          }
          
          // Verificar si necesitamos nueva página
          if (yPosition + rowHeight > pageHeight - 50) {
            doc.addPage();
            yPosition = margin + 20;
            
            // Re-dibujar header en nueva página - solo borde azul, sin fondo
            doc.setDrawColor(41, 98, 255); // Azul para el borde
            doc.setLineWidth(1);
            doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'S'); // Solo borde, sin relleno
            
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
            doc.text('CANT.', margin + 120, yPosition + 10, { align: 'center' });
            doc.text('TOTAL', pageWidth - margin - 15, yPosition + 10, { align: 'right' });
            
            yPosition += tableHeaderHeight;
          }
          
          const isEven = index % 2 === 0;
          
          // Fondo alternado
          if (isEven) {
            doc.setFillColor(248, 250, 252);
          } else {          }
          doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
          
          // Borde de la fila
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'S');
          
          // Coordenadas para el contenido
          let contentStartX = margin + 5;
          const centerY = yPosition + (rowHeight / 2);
          
          // Agregar imagen si existe
          if (product.imageUrl && product.imageUrl.trim()) {
            try {
              const imageX = contentStartX;
              const imageY = yPosition + 3;
              const imageWidth = 28;
              const imageHeight = rowHeight - 6;
              
              doc.addImage(product.imageUrl, 'JPEG', imageX, imageY, imageWidth, imageHeight);
              contentStartX += imageWidth + 8; // Espacio después de la imagen
            } catch (imageError) {
              console.log('Error al cargar imagen:', imageError);
            }
          }
          
          // Texto del producto - centrado verticalmente
          doc.setTextColor(31, 41, 55);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          
          // Calcular espacio disponible para texto
          const textAreaWidth = 105 - (contentStartX - margin - 5);
          
          // Nombre del producto
          const productNameLines = doc.splitTextToSize(product.name, textAreaWidth);
          const nameY = centerY - (productNameLines.length > 1 ? 3 : 0);
          doc.text(productNameLines[0], contentStartX, nameY);
          
          // Descripción si existe
          if (product.description && product.description.trim()) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'normal');
            // Dividir texto en hasta 2 lineas
            const maxWidth = pageWidth - contentStartX - margin - 60; // Aumentado el espacio disponible
            const descriptionLines = doc.splitTextToSize(product.description, maxWidth);
            const linesToShow = descriptionLines.slice(0, 2);
            linesToShow.forEach((line: string, index: number) => {
              doc.text(line, contentStartX, nameY + 8 + (index * 10));
            });
          }
          
          // Columnas alineadas - centradas verticalmente
          doc.setFontSize(10);
          doc.setTextColor(31, 41, 55);
          doc.setFont('helvetica', 'normal');
          
          // Cantidad
          doc.text(product.quantity.toString(), margin + 120, centerY, { align: 'center' });
          
          // Total (en negrita)
          doc.setFont('helvetica', 'bold');
          doc.text(formatPriceString(product.total || 'A cotizar'), pageWidth - margin - 5, centerY, { align: 'right' });
          
          yPosition += rowHeight;
        });
        
        // Borde final de la tabla
        doc.setDrawColor(15, 23, 42);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        
        yPosition += 25;
        tableSuccessful = true;
        
      } else {
        // Usar autoTable estándar si no hay imágenes
        try {
          (doc as any).autoTable({
            startY: yPosition,
            head: [['PRODUCTOS / SERVICIOS', 'CANT.', 'TOTAL']],
            body: productsWithImages.map(product => { const nameWithDescription = product.description && product.description.trim() ? `${product.name}\n${product.description}` : product.name; return [nameWithDescription, product.quantity.toString(), formatPriceString(product.total || "A cotizar")]; }), // Solo nombre, cantidad y total
            theme: 'grid',
            headStyles: {
              fillColor: [15, 23, 42],
              textColor: [255, 255, 255],
              fontSize: 12,
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              cellPadding: 10,
              lineColor: [59, 130, 246],
              lineWidth: 1
            },
            bodyStyles: {
              fontSize: 10,
              cellPadding: 8,
              textColor: [31, 41, 55],
              lineColor: [229, 231, 235],
              lineWidth: 0.5
            },
            columnStyles: {
              0: { cellWidth: 110, halign: "left", valign: "top", fontSize: 8, lineHeight: 1.2 },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            margin: { left: margin, right: margin },
            styles: {
              overflow: 'linebreak',
              cellWidth: 'wrap', minCellHeight: 20, valign: 'top'
            }
          });

          yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : yPosition + 120;
          tableSuccessful = true;
        } catch (tableError) {
          console.warn('AutoTable failed, creating manual table:', tableError);
          tableSuccessful = false;
        }
      }

      // Tabla manual como respaldo final si todo falla
      if (!tableSuccessful) {
        
        // TABLA MANUAL como respaldo
        // Header de la tabla - solo borde azul, sin fondo
        const tableHeaderHeight = 15;
        doc.setDrawColor(41, 98, 255); // Azul para el borde
        doc.setLineWidth(1);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'S'); // Solo borde, sin relleno
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
        doc.text('CANT.', margin + 120, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', pageWidth - margin - 15, yPosition + 10, { align: 'right' });
        
        yPosition += tableHeaderHeight;
        
        // Filas de productos
        productData.forEach((row, index) => {
          const rowHeight = 14;
          const isEven = index % 2 === 0;
          
          // Fondo alternado
          if (isEven) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
          }
          
          // Borde de la fila
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'S');
          
          // Texto de la fila
          doc.setTextColor(55, 65, 81);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          
          // Limitar texto del producto si es muy largo
          const productName = doc.splitTextToSize(row[0], 110);
          doc.text(productName[0] + (productName.length > 1 ? '...' : ''), margin + 3, yPosition + 9);
          doc.text(row[1], margin + 120, yPosition + 9, { align: 'center' }); // Cantidad
          doc.text(formatPriceString(row[3]), pageWidth - margin - 3, yPosition + 9, { align: 'right' }); // Total (saltamos precio unitario)
          
          yPosition += rowHeight;
        });
        
        // Borde final de la tabla
        doc.setDrawColor(41, 98, 255);        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        
        yPosition += 25;
      }

      // === RESUMEN FINANCIERO PREMIUM ===
      // Para cotizaciones, no calculamos totales exactos
      const hasRealPrices = selectedProducts.some(product => 
        product[2] !== 'Consultar' && product[2] !== 'A cotizar' && 
        product[3] !== 'Consultar' && product[3] !== 'A cotizar'
      );

      console.log('Has real prices:', hasRealPrices);
      console.log('Selected products:', selectedProducts);

      // Calcular subtotal si hay precios reales
      if (hasRealPrices) {
        subtotalAmount = selectedProducts.reduce((total, product) => {
          const totalStr = product[3]; // Columna TOTAL
          console.log(`Procesando producto para subtotal: "${product[0]}", total: "${totalStr}"`);
          
          if (totalStr && totalStr !== 'A cotizar' && totalStr !== 'Consultar') {
            // Función mejorada para extraer números de strings con formato de moneda
            const extractNumber = (str: string): number => {
              // Remover símbolos de moneda y espacios
              let cleaned = str.replace(/[$ARS€£¥\s]/g, '');
              
              // Caso especial: si solo contiene puntos y son separadores de miles (formato argentino)
              if (cleaned.includes('.') && !cleaned.includes(',')) {
                // Verificar si es separador de miles: el punto debe estar seguido de exactamente 3 dígitos
                const parts = cleaned.split('.');
                if (parts.length > 1) {
                  // Si la última parte tiene exactamente 3 dígitos, es separador de miles
                  const lastPart = parts[parts.length - 1];
                  if (lastPart.length === 3) {
                    // Es separador de miles: 70.000 -> 70000
                    cleaned = cleaned.replace(/\./g, '');
                  }
                  // Si no, es decimal normal
                }
              }
              // Analizar el formato basado en la posición del último punto y coma
              else if (cleaned.includes('.') && cleaned.includes(',')) {
                const lastDot = cleaned.lastIndexOf('.');
                const lastComma = cleaned.lastIndexOf(',');
                
                if (lastComma > lastDot) {
                  // Formato español: 1.000,50 -> el último separador es la coma (decimal)
                  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                } else {
                  // Formato inglés: 1,000.50 -> el último separador es el punto (decimal)
                  cleaned = cleaned.replace(/,/g, '');
                }
              }
              // Si solo contiene comas
              else if (cleaned.includes(',')) {
                const parts = cleaned.split(',');
                if (parts.length === 2 && parts[1].length <= 2) {
                  // Es decimal: 1000,50 -> 1000.50
                  cleaned = cleaned.replace(',', '.');
                } else {
                  // Es separador de miles: 1,000 -> 1000
                  cleaned = cleaned.replace(/,/g, '');
                }
              }
              
              const number = parseFloat(cleaned);
              return isNaN(number) ? 0 : number;
            };
            
            const amount = extractNumber(totalStr);
            console.log(`  Añadiendo al subtotal: ${amount}`);
            return total + amount;
          }
          return total;
        }, 0);
        console.log('Subtotal calculado final:', subtotalAmount);
      }

      // Configuración para totales
      const totalsWidth = 85;  // Reducido para juntar texto y valores
      const totalsHeight = hasRealPrices ? 140 : 80;
      const totalsX = pageWidth - margin - totalsWidth;

      // Verificar espacio disponible en la página
      if (yPosition + totalsHeight > pageHeight - 120) {
        doc.addPage();
        
        // Agregar imagen decorativa de fondo en página de totales
        addDecorativeBackground(doc, pageWidth, pageHeight);
        
        yPosition = 30;
        
        // Mini header para página de totales con logo
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        // Agregar logo en la página de totales
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 4, 35, 25);
        } catch (error) {
          console.log('Error adding MIRG logo to totals page:', error);
        }
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');

        yPosition = 50;
      }

      // === DISEÑO SIMPLE PARA TOTALES ===
      // Título simple sin recuadro del título
      
      // Agregar imagen decorativa encima del contenido
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(hasRealPrices ? 'RESUMEN TOTAL' : 'INFORMACIÓN', totalsX, yPosition);
      
      yPosition += 25;

      let totalsY = yPosition + 20;

      if (hasRealPrices) {
        // === CÁLCULOS TRADICIONALES ===
        const iva = calculateTax(subtotalAmount);
        const totalImpuestos = iva;
        const total = subtotalAmount + totalImpuestos;

        // === SUBTOTAL ===
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(formatCurrency(subtotalAmount), totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 14;

        // === IVA ===
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`IVA (${Math.round(PDF_CONFIG.taxRate * 100)}%):`, totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(formatCurrency(iva), totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 14;

        // === TOTAL DE IMPUESTOS ===
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Tot. Impuestos:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(formatCurrency(totalImpuestos), totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 16;

        // Línea decorativa azul antes del total
        doc.setDrawColor(59, 130, 246); // Azul elegante
        doc.setLineWidth(1.2);
        doc.line(totalsX + 10, totalsY, totalsX + totalsWidth - 10, totalsY);
        
        totalsY += 12;

        // === TOTAL FINAL DESTACADO ===
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX + 10, totalsY + 3);
        
        doc.setFontSize(16);
        doc.setTextColor(147, 197, 253);
        doc.text(formatCurrency(total), totalsX + totalsWidth - 10, totalsY + 3, { align: 'right' });
      } else {
        // === INFORMACIÓN PARA COTIZACIONES ===
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Estado:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        doc.text('Cotización', totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 12;

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('Precios:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        doc.text('A consultar', totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 12;

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('Válida hasta:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        const validUntil = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('es-ES');
        doc.text(validUntil, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
      }

      yPosition += totalsHeight + 10;

      // === TÉRMINOS Y CONDICIONES ORGANIZADOS ===
      const termsX = margin;
      const termsWidth = totalsX - margin - 30;
      
      // Alinear exactamente con el título del resumen total
      let termsY = yPosition - totalsHeight + 10;
      
      // Título con fondo azul profesional como en el PDF de referencia
      doc.setFillColor(51, 100, 199);  // Azul profesional
      doc.rect(termsX, termsY - 5, termsWidth, 15, 'F');
      
      // Borde sutil
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(termsX, termsY - 5, termsWidth, 15, 'S');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', termsX + 8, termsY + 4);

      termsY += 20;

      doc.setTextColor(70, 70, 70);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const termsAndConditions1 = [
        '1. Condiciones de pago: Acuerdo con el cliente',
        '2. Tiempo de entrega: 7 días hábiles',
        '3. Enviar cotización firmada al email indicado'
      ];

      termsAndConditions1.forEach(term => {
        doc.text(term, termsX + 5, termsY);
        termsY += 12;
      });
      
      // Actualizar yPosition para contenido siguiente
      yPosition = Math.max(yPosition, termsY + 10);

      // === DESCRIPCIÓN DEL PROYECTO ===
      if (clientInfo.descripcionDelProyecto && clientInfo.descripcionDelProyecto.trim()) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          
          // Agregar imagen decorativa de fondo en página de descripción
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
          
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
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const description = doc.splitTextToSize(clientInfo.descripcionDelProyecto, pageWidth - (margin * 2) - 20);
        doc.text(description, margin + 10, yPosition + 12);

        yPosition += 55;
      }

      // === NUEVA PÁGINA PARA FAQ ===
      if (yPosition > pageHeight - 200) {
        doc.addPage();
        
        // Agregar imagen decorativa de fondo en página FAQ
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
        
        yPosition = margin;
        
        // Header minimalista para nueva página
        doc.setFillColor(248, 249, 251);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        // Logo pequeño
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 20, 15);
        } catch (error) {
          console.log('Error adding MIRG logo to FAQ page:', error);
        }
        
        // Solo información de cotización (sin nombre de empresa)
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
        doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 45, 18);
        
        yPosition = 50;
      }

      // === PREGUNTAS FRECUENTES ===
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PREGUNTAS FRECUENTES', margin, yPosition);

      yPosition += 15;

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const faqs = [
        {
          q: '¿Qué tipo de maquinados industriales realizan?',
          a: 'Realizamos mecanizado CNC de precisión, torneado, fresado, rectificado y fabricación de piezas especiales según planos y especificaciones técnicas. Trabajamos con diversos materiales como acero, aluminio, bronce y materiales especiales.'
        },
        {
          q: '¿Cuál es el tiempo de entrega típico?',
          a: 'Los tiempos varían según la complejidad del proyecto. Piezas estándar: 3-5 días hábiles. Proyectos complejos: 1-3 semanas. Siempre confirmamos tiempos específicos en cada cotización.'
        },
        {
          q: '¿Qué certificaciones y estándares manejan?',
          a: 'Contamos con certificación ISO 9001 y seguimos estándares de calidad industrial. Todas nuestras piezas son inspeccionadas con equipos de medición calibrados y certificados.'
        },
        {
          q: '¿Realizan trabajos de prototipado?',
          a: 'Sí, ofrecemos servicios completos de prototipado rápido, desde el diseño asistido por computadora hasta la fabricación de prototipos funcionales para validación y pruebas.'
        },
        {
          q: '¿Qué garantía ofrecen en sus trabajos?',
          a: 'Ofrecemos garantía de 90 días por defectos de fabricación. Adicionalmente, respaldamos la calidad dimensional y funcional de todas nuestras piezas según especificaciones acordadas.'
        },
        {
          q: '¿Manejan proyectos de gran volumen?',
          a: 'Sí, tenemos capacidad para proyectos desde piezas unitarias hasta series de producción medianas y grandes. Contamos con múltiples centros de mecanizado para cumplir con volúmenes importantes.'
        }
      ];

      faqs.forEach((faq, index) => {
        // Verificar si necesitamos nueva página
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          
          // Agregar imagen decorativa de fondo en nueva página FAQ
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
          
          yPosition = margin;
          
          // Header minimalista para nueva página
          doc.setFillColor(248, 249, 251);
          doc.rect(0, 0, pageWidth, 30, 'F');
          
          try {
            doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 20, 15);
          } catch (error) {
            console.log('Error adding MIRG logo to FAQ continuation page:', error);
          }
          
          // Solo información de cotización (sin nombre de empresa)
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
          doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 45, 18);
          
          yPosition = 50;
        }

        // Pregunta
        doc.setTextColor(41, 98, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const questionLines = doc.splitTextToSize(`${index + 1}. ${faq.q}`, pageWidth - (margin * 2));
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * 5 + 3;

        // Respuesta
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const answerLines = doc.splitTextToSize(faq.a, pageWidth - (margin * 2));
        doc.text(answerLines, margin, yPosition);
        yPosition += answerLines.length * 4.5 + 8;
      });

      yPosition += 10;



      // === FOOTER ===
      const footerY = pageHeight - 40;
      
      doc.setFillColor(248, 249, 251);
      doc.rect(0, footerY, pageWidth, 40, 'F');
      
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Gracias por considerar nuestra propuesta. Quedamos a disposición para cualquier consulta.', 
                pageWidth / 2, footerY + 15, { align: 'center' });
      
      doc.setFontSize(8);
      doc.text(`${companyInfo.email} | ${companyInfo.phone}`, pageWidth / 2, footerY + 25, { align: 'center' });
      
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES')}`,
                pageWidth / 2, footerY + 32, { align: 'center' });

      // Descargar
      const filename = `Cotizacion_${getServiceType(clientInfo)}_${submission.id.substring(0, 8)}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Error al exportar a PDF');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDFAndEmail = async (
    submission: QuoteSubmission, 
    companyInfo: CompanyInfo = defaultCompanyInfo,
    sendEmail: boolean = false
  ) => {
    setLoading(true);
    
    try {
      // === GENERAR EL PDF USANDO EXACTAMENTE LA MISMA LÓGICA QUE exportToPDF ===
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // === HEADER CORPORATIVO SIMPLE ===
      // Fondo superior en blanco
      doc.setFillColor(255, 255, 255); // Blanco puro en lugar de azul oscuro
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      // Borde del header
      doc.setDrawColor(200, 200, 200);      doc.rect(0, 0, pageWidth, 60, 'S');
      
      // Sombra del header
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 60, pageWidth, 2, 'F');
      
      // Sombra del header      doc.rect(0, 74, pageWidth, 2, 'F');
      
      // Buscar imagen/logo en los datos de la cotización
      let logoToUse = MIRG_LOGO_BASE64;
      const submittedImages = Object.entries(submission.data).find(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image/')
      );
      
      if (submittedImages && submittedImages[1]) {
        logoToUse = submittedImages[1] as string;
      }
      
      // Agregar logo MIRG oficial
      try {
        doc.addImage(logoToUse, 'PNG', margin, 25, 50, 30);
      } catch (error) {
        console.log('Error adding logo:', error);
        // Intentar con logo MIRG oficial si falla
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 25, 50, 30);
        } catch (fallbackError) {
          console.log('Error adding MIRG logo:', fallbackError);
        }
      }
      
      // TÍTULO DE LA EMPRESA - ULTRA ESTILIZADO
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      // Centrar el texto MIRG
      const companyTitle = companyInfo.name.split(' - ')[0] || companyInfo.name; // Tomar solo la primera parte antes del gui�n
      const textWidth = doc.getTextWidth(companyTitle);
      const companyCenterX = (pageWidth - textWidth) / 2;
      doc.text(companyTitle, companyCenterX, 35);
      
      // Línea decorativa bajo el nombre      doc.setLineWidth(1); // Reducido de 3 a 1 para más delgado
      const lineWidth = 60; // Ancho de la línea
      const lineStartX = (pageWidth - lineWidth) / 2;
      doc.line(lineStartX, 37, lineStartX + lineWidth, 37);
      
      // Texto descriptivo debajo de la línea azul (más pequeño)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      // Centrar el primer texto descriptivo
      const descriptiveText1 = 'MIRG MAQUINADOS INDUSTRIALES RAMOZ';
      const descriptiveText1Width = doc.getTextWidth(descriptiveText1);
      const descriptive1CenterX = (pageWidth - descriptiveText1Width) / 2;
      doc.text(descriptiveText1, descriptive1CenterX, 43);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      // Centrar el segundo texto descriptivo
      const descriptiveText2 = 'GUZMAN';
      const descriptiveText2Width = doc.getTextWidth(descriptiveText2);
      const descriptive2CenterX = (pageWidth - descriptiveText2Width) / 2;
      doc.text(descriptiveText2, descriptive2CenterX, 47);

      // INFORMACIÓN DE CONTACTO - ESTILO MODERNO (más a la derecha)
      const contactX = pageWidth - margin - 45; // Posición del contacto ajustada para más espacio
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTACTO', contactX, 31);
      
      // Información de contacto completa con dirección dividida y alineada
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      
      const contactLabelWidth = 8; // Ancho s�per compacto para m�xima proximidad
      
      // Email
      doc.text('Email:', contactX, 34);
      doc.text(companyInfo.email, contactX + contactLabelWidth, 34);
      
      // Teléfono
      doc.text('Tel:', contactX, 37);
      doc.text(companyInfo.phone, contactX + contactLabelWidth, 37);
      
      // Dirección dividida en dos líneas con alineación
      const addressLines = doc.splitTextToSize(companyInfo.address, 45);
      // Direcci�n din�mica basada en configuraci�n
      doc.text('Dir:', contactX, 40);
      if (addressLines.length > 1) { doc.text(addressLines[0], contactX + contactLabelWidth, 40); } else { doc.text(addressLines[0], contactX + contactLabelWidth, 40); }
      if (addressLines.length > 1) { doc.text(addressLines[1], contactX + contactLabelWidth, 43); }
      
      // RFC
      doc.text('RFC:', contactX, 46);
      doc.text(companyInfo.website || 'RFC: RAGH931025DP4', contactX + contactLabelWidth, 46);

      yPosition = 85;

      // === TÍTULO PRINCIPAL SIMPLE ===
      // Fondo simple para el título
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 18, 'F');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      
      // Texto simple sin efectos
      doc.text('COTIZACIÓN COMERCIAL', margin + 5, yPosition + 12);
      
      // Línea decorativa simple      doc.line(margin, yPosition + 18, pageWidth - margin, yPosition + 18);
      
      yPosition += 25;

      // === INFORMACIÓN DE LA COTIZACIÓN - DISEÑO PREMIUM ===
      const quoteDate = new Date().toLocaleDateString('es-ES');
      const validUntil = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('es-ES');
      const quoteNumber = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;

      // Marco principal con sombra      doc.rect(margin - 2, yPosition + 2, pageWidth - (margin * 2) + 4, 42, 'F');      doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'F');      doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'S');

      // Sección izquierda - Info de cotización
      // === SECCIÓN IZQUIERDA - INFORMACIÓN DE COTIZACIÓN ===
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(margin, yPosition, (pageWidth - (margin * 2)) / 2, 40, 'F');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE COTIZACIÓN', margin + 8, yPosition + 10);
      
      // Datos de cotización con alineación consistente
      const quoteInfoData = [
        { label: 'N° Cotización:', value: quoteNumber, y: yPosition + 18 },
        { label: 'Fecha de Emisión:', value: quoteDate, y: yPosition + 24 },
        { label: 'Válida hasta:', value: validUntil, y: yPosition + 30 }
      ];
      
      const quoteLabelWidth = 35; // Reducido de 50 a 35 para menos espacio
      quoteInfoData.forEach(item => {
        // Etiqueta
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, margin + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 197, 253);
        doc.text(item.value, margin + 10 + quoteLabelWidth, item.y);
      });

      // === SECCIÓN DERECHA - ESTADO Y TIPO ===
      const clientInfo: { [key: string]: any } = submission.data;
      const rightX = margin + (pageWidth - (margin * 2)) / 2;
      
      doc.setFillColor(250, 250, 250);
      doc.rect(rightX, yPosition, (pageWidth - (margin * 2)) / 2, 40, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO DE PROCESO', rightX + 10, yPosition + 10);
      
      // Datos de estado con alineación consistente
      const statusInfoData = [
        { label: 'Estado:', value: getStatusText(submission.status).toUpperCase(), y: yPosition + 18 },
        { label: 'Prioridad:', value: 'ALTA', y: yPosition + 24 },
        { label: 'Categoria:', value: getSector(clientInfo).toUpperCase(), y: yPosition + 30 }
      ];
      
      const statusLabelWidth = 25; // Reducido de 35 a 25 para menos espacio
      statusInfoData.forEach(item => {
        // Etiqueta
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, rightX + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(item.value, rightX + 10 + statusLabelWidth, item.y);
      });

      yPosition += 55;      // === DATOS DEL CLIENTE - ESTILO SIMPLE ===
      // Título simple
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PERFIL DEL CLIENTE', margin, yPosition);
      
      // Línea decorativa      doc.line(margin, yPosition + 3, margin + 80, yPosition + 3);
      
      yPosition += 15;

      // Marco principal del cliente simple      doc.rect(margin, yPosition, pageWidth - (margin * 2), 65, 'F');
      
      
      doc.setDrawColor(200, 200, 200);      doc.rect(margin, yPosition, pageWidth - (margin * 2), 65, 'S');

      // Línea divisoria vertical simple
      const centerX = pageWidth / 2;      doc.line(centerX, yPosition, centerX, yPosition + 65);

      // === COLUMNA IZQUIERDA - DATOS PRINCIPALES ===
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(margin, yPosition, centerX - margin, 25, 'F');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACION CORPORATIVA', margin + 10, yPosition + 12);

      let clientY = yPosition + 32;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      // Definir etiquetas y valores con alineación consistente
      const leftColumnLabels = [
        { label: 'Razon Social:', value: getCompanyName(clientInfo), y: clientY },
        { label: 'Contacto:', value: getClientName(clientInfo, submission), y: clientY + 10 },
        { label: 'Email:', value: clientInfo["2"] || clientInfo.email || submission.customerEmail || 'No especificado', y: clientY + 20 },
        { label: 'Telefono:', value: getPhone(clientInfo, submission), y: clientY + 30 }
      ];

      // Dibujar etiquetas y valores alineados
      const clientLabelWidth = 25; // Reducido de 35 a 25 para menos espacio
      leftColumnLabels.forEach(item => {
        // Etiqueta
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, margin + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        
        // Manejo especial para email largo
        if (item.label === 'Email:') {
          const emailText = doc.splitTextToSize(item.value, centerX - (margin + 10 + clientLabelWidth) - 5);
          doc.text(emailText, margin + 10 + clientLabelWidth, item.y);
        } else {
          doc.text(item.value, margin + 10 + clientLabelWidth, item.y);
        }
      });

      // === COLUMNA DERECHA - DATOS ADICIONALES ===
      doc.setFillColor(250, 250, 250);
      doc.rect(centerX, yPosition, pageWidth - margin - centerX, 25, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLES ADICIONALES', centerX + 10, yPosition + 12);
      
      // Definir etiquetas y valores para columna derecha
      const rightColumnLabels = [
        { label: 'Direccion:', value: getAddress(clientInfo), y: clientY },
        { label: 'Sector:', value: getSector(clientInfo), y: clientY + 20 }
      ];

      // Dibujar etiquetas y valores alineados para columna derecha
      const rightLabelWidth = 20; // Reducido de 30 a 20 para menos espacio
      rightColumnLabels.forEach(item => {
        // Etiqueta
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(item.label, centerX + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        
        // Manejo especial para dirección larga
        if (item.label === 'Direccion:') {
          const addressLines = doc.splitTextToSize(item.value, pageWidth - margin - centerX - 10 - rightLabelWidth - 5);
          doc.text(addressLines, centerX + 10 + rightLabelWidth, item.y);
        } else {
          doc.text(item.value, centerX + 10 + rightLabelWidth, item.y);
        }
      });

      yPosition += 75;

      // === NUEVA PÁGINA PARA PRODUCTOS ===
      doc.addPage();
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
      yPosition = 30;

      // === HEADER SIMPLIFICADO EN SEGUNDA PÁGINA ===
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, 8, 'F');
      
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(0, 8, pageWidth, 6, 'F');
      
      doc.setFillColor(235, 235, 235);
      doc.rect(0, 14, pageWidth, 4, 'F');
      
      doc.setFillColor(250, 250, 250);
      doc.rect(0, 18, pageWidth, 2, 'F');
      
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 20, pageWidth, 25, 'F');
      
      // Logo pequeño en segunda página      doc.rect(margin - 1, 23, 22, 16, 'F');      doc.rect(margin - 1, 23, 22, 16, 'S');
      
      try {
        doc.addImage(logoToUse, 'PNG', margin, 24, 20, 14);
      } catch (error) {
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 24, 20, 14);
        } catch (fallbackError) {
          console.log('Error adding logo to second page');
        }
      }
      
      // Título empresarial simplificado removido - solo información de cotización
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
      doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 45, 30);

      yPosition = 50;

      // === TÍTULO DE PRODUCTOS ULTRA ELEGANTE ===
      doc.setFillColor(240, 240, 240);
      doc.rect(margin - 5, yPosition - 5, pageWidth - (margin * 2) + 10, 22, 'F');
      
      doc.setFillColor(51, 100, 199)  // Azul profesional;
      doc.rect(margin - 3, yPosition - 3, pageWidth - (margin * 2) + 6, 18, 'F');
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PRODUCTOS Y SERVICIOS', margin, yPosition + 8);
      
      doc.setDrawColor(200, 200, 200);      doc.line(margin, yPosition + 12, pageWidth - margin, yPosition + 12);
      
      yPosition += 25;

      // === COPIADO COMPLETO DE exportToPDF DESDE AQUÍ ===
      
      // Generar productos basados en los datos reales del formulario del cliente
      let productData: string[][] = [];
      let subtotalAmount = 0;
      
      // Extraer los productos/servicios específicos que el cliente seleccionó
      const selectedProducts: string[][] = [];
      let foundProducts = false;
      
      // VERIFICAR SI HAY DATOS DE RESPUESTA CON PRECIOS
      const hasResponseData = (submission as any).responseData && (submission as any).responseData.products;
      console.log('¿Tiene datos de respuesta?', hasResponseData);
      
      // Array para almacenar los productos con sus imágenes
      let productsWithImages: Array<{
        name: string;
        quantity: string;
        unitPrice: string;
        total: string;
        imageUrl?: string;
        description?: string;
      }> = [];
      
      if (hasResponseData) {
        console.log('=== USANDO DATOS DE RESPUESTA CON PRECIOS ===');
        const responseProducts = (submission as any).responseData.products;
        
        responseProducts.forEach((product: any) => {
          const unitPrice = product.unitPrice || 'A cotizar';
          const total = product.total || 'A cotizar';
          
          productsWithImages.push({
            name: product.name,
            quantity: product.quantity.toString(),
            unitPrice: unitPrice,
            total: formatPriceString(total),
            imageUrl: product.imageUrl || '',
            description: product.description || ''
          });
          
          selectedProducts.push([
            product.name,
            product.quantity.toString(),
            unitPrice,
            total
          ]);
        });
        
        foundProducts = true;
        console.log('Productos con precios cargados:', selectedProducts);
      } else {
        console.log('=== EXTRAYENDO PRODUCTOS DE DATOS ORIGINALES ===');
        
        // Debug: Mostrar todos los datos del cliente
        console.log('=== DATOS COMPLETOS DEL CLIENTE ===');
        console.log('clientInfo:', clientInfo);
        console.log('Campos disponibles:', Object.keys(clientInfo));
      
      // Función auxiliar para convertir cualquier valor a string legible
      const valueToString = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value ? 'Sí' : 'No';
        if (Array.isArray(value)) {
          return value.map(item => valueToString(item)).filter(Boolean).join(', ');
        }
        if (typeof value === 'object') {
          // Si es un objeto, intentar extraer información útil
          if (value.name || value.nombre) return valueToString(value.name || value.nombre);
          if (value.description || value.descripcion) return valueToString(value.description || value.descripcion);
          if (value.text || value.texto) return valueToString(value.text || value.texto);
          if (value.value || value.valor) return valueToString(value.value || value.valor);
          // Como último recurso, intentar JSON.stringify
          try {
            const str = JSON.stringify(value);
            return str.length < 100 ? str : 'Objeto complejo';
          } catch {
            return 'Datos del cliente';
          }
        }
        return String(value);
      };
      
      // Buscar productos específicos en los datos del cliente
      // NUEVA LÓGICA: Buscar productos dinámicos y por ID de campo
      
      let foundProducts = false;
      
      console.log('=== DEPURACIÓN DE DATOS COMPLETOS ===');
      console.log('clientInfo completo:', JSON.stringify(clientInfo, null, 2));
      console.log('Claves disponibles:', Object.keys(clientInfo));
      
      // 1. BUSCAR POR ID DE CAMPO (la forma más directa)
      // Los campos de productos se guardan con su ID (ej: "3", "products_field_id", etc.)
      Object.entries(clientInfo).forEach(([key, value]) => {
        console.log(`Analizando campo "${key}":`, value);
        
        // Si es un array de productos (campo tipo "products")
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          // Verificar si tiene estructura de producto
          if (firstItem && typeof firstItem === 'object' && 
              (firstItem.name || firstItem.id || firstItem.description)) {
            console.log(`¡Campo de productos encontrado en "${key}"!:`, value);
            
            value.forEach((product: any, index: number) => {
              const productName = product.name || 
                                 product.nombre || 
                                 product.producto || 
                                 `Producto ${index + 1}`;
              
              const description = product.description || 
                                 product.descripcion || 
                                 product.especificaciones || 
                                 '';
              
              const quantity = product.quantity || 
                              product.cantidad || 
                              product.unidades || 
                              1;
              
              const budget = product.estimatedPrice || 
                            product.precio || 
                            product.presupuesto || 
                            'A cotizar';
              
              let fullProductName = productName;
              if (description && description.trim()) {
                fullProductName += ` - ${description}`;
              }
              
              console.log(`Producto procesado: ${fullProductName} (Cant: ${quantity}, Precio: ${budget})`);
              
              selectedProducts.push([
                fullProductName,
                quantity.toString(),
                budget === 'A cotizar' || !budget ? 'A cotizar' : budget,
                'A cotizar'
              ]);
              foundProducts = true;
            });
          }
        }
      });
      
      // 2. Si no encontramos productos por ID, buscar ítems dinámicos (Item #1, Item #2, etc.)
      if (!foundProducts) {
        const itemKeys = Object.keys(clientInfo).filter(key => key.match(/^Item #\d+$/));
        console.log('Items dinámicos encontrados:', itemKeys);
        
        if (itemKeys.length > 0) {
          itemKeys.forEach(itemKey => {
            const item = clientInfo[itemKey];
            console.log(`Procesando ${itemKey}:`, item);
            
            if (item && typeof item === 'object') {
              const productName = item['Nombre del Producto/Servicio'] || 
                                 item['nombre'] || 
                                 item['producto'] || 
                                 'Producto no especificado';
              
              const quantity = item['Cantidad'] || 
                              item['cantidad'] || 
                              '1';
              
              const description = item['Descripción y Especificaciones'] || 
                                 item['descripcion'] || 
                                 '';
              
              const budget = item['Rango de Presupuesto Esperado (opcional)'] || 
                            item['presupuesto'] || 
                            'A cotizar';
              
              let fullProductName = productName;
              if (description && description.trim()) {
                fullProductName += ` - ${description}`;
              }
              
              console.log(`Producto extraído de ${itemKey}: ${fullProductName}, Cantidad: ${quantity}, Presupuesto: ${budget}`);
              
              selectedProducts.push([
                fullProductName,
                quantity.toString(),
                budget === 'A cotizar' ? 'A cotizar' : budget,
                'A cotizar'
              ]);
              foundProducts = true;
            }
          });
        }
      }
      
      // 3. Si no encontramos en campos específicos, buscar en campos tradicionales
      if (!foundProducts) {
        const productFieldNames = [
          'productosOServiciosRequeridos',
          'productos',
          'servicios', 
          'Productos o Servicios Requeridos',
          'productosServicios',
          'serviciosRequeridos',
          'descripcionDelProyecto',
          'descripcionAdicionalDelProyecto',
          'Descripción del Proyecto',
          'especificaciones',
          'requerimientos'
        ];
        
        for (const fieldName of productFieldNames) {
          const fieldValue = clientInfo[fieldName];
          if (fieldValue) {
            console.log(`Campo tradicional ${fieldName}:`, fieldValue);
            const productText = valueToString(fieldValue);
            if (productText && productText.trim() && 
                productText !== 'Agregue los productos o servicios que necesita cotizar') {
              selectedProducts.push([productText, '1', 'A cotizar', 'A cotizar']);
              foundProducts = true;
              break;
            }
          }
        }
      }
      
      // 4. Como último recurso, buscar en cualquier campo que contenga "producto" o "servicio"
      if (!foundProducts) {
        Object.entries(clientInfo).forEach(([key, value]) => {
          const keyLower = key.toLowerCase();
          if ((keyLower.includes('producto') || keyLower.includes('servicio') || 
               keyLower.includes('descripcion') || keyLower.includes('especificacion') ||
               keyLower.includes('requerimiento')) && value) {
            const productText = valueToString(value);
            if (productText && productText !== 'Datos del cliente' && productText !== 'Objeto complejo') {
              selectedProducts.push([productText, '1', 'A cotizar', 'A cotizar']);
              foundProducts = true;
            }
          }
        });
      }
      
      // Si aún no encontramos productos, usar un mensaje genérico
      if (!foundProducts) {
        selectedProducts.push(['Servicios requeridos según especificaciones del cliente', '1', 'A cotizar', 'A cotizar']);
      }
      } // Cerrar el else de datos originales

      productData = selectedProducts;

      // Debug: mostrar productos en consola
      console.log('Products to display:', productData);
      console.log('Products with images:', productsWithImages);
      console.log('Client data keys:', Object.keys(clientInfo));
      
      // No calculamos subtotal automáticamente ya que son cotizaciones
      subtotalAmount = 0;

      // === NUEVA TABLA DE PRODUCTOS CON SOPORTE PARA IMÁGENES ===
      let tableSuccessful = false;
      
      // Si hay productos con imágenes, usar tabla manual mejorada
      if (productsWithImages.length > 0 && productsWithImages.some(p => p.imageUrl)) {
        console.log('Generando tabla con imágenes...');
        
        // Header de la tabla - solo borde azul, sin fondo
        const tableHeaderHeight = 15;
        doc.setDrawColor(41, 98, 255); // Azul para el borde
        doc.setLineWidth(1);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'S'); // Solo borde, sin relleno
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
        doc.text('CANT.', margin + 120, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', pageWidth - margin - 15, yPosition + 10, { align: 'right' });
        
        yPosition += tableHeaderHeight;
        
        // Procesar cada producto con altura dinámica
        productsWithImages.forEach((product, index) => {
          // Calcular altura necesaria para la fila
          let rowHeight = 25; // Altura base
          
          // Si hay imagen, aumentar altura
          if (product.imageUrl && product.imageUrl.trim()) {
            rowHeight = 35;
          }
          
          // Si hay descripción larga, aumentar altura
          if (product.description && product.description.length > 50) {
            rowHeight = Math.max(rowHeight, 45); // Aumentado para permitir 2 l�neas de descripci�n
          }
          
          // Verificar si necesitamos nueva página
          if (yPosition + rowHeight > pageHeight - 50) {
            doc.addPage();
            yPosition = margin + 20;
            
            // Re-dibujar header en nueva página - solo borde azul, sin fondo
            doc.setDrawColor(41, 98, 255); // Azul para el borde
            doc.setLineWidth(1);
            doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'S'); // Solo borde, sin relleno
            
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
            doc.text('CANT.', margin + 120, yPosition + 10, { align: 'center' });
            doc.text('TOTAL', pageWidth - margin - 15, yPosition + 10, { align: 'right' });
            
            yPosition += tableHeaderHeight;
          }
          
          const isEven = index % 2 === 0;
          
          // Fondo alternado
          if (isEven) {
            doc.setFillColor(248, 250, 252);
          } else {          }
          doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
          
          // Borde de la fila
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'S');
          
          // Coordenadas para el contenido
          let contentStartX = margin + 5;
          const centerY = yPosition + (rowHeight / 2);
          
          // Agregar imagen si existe
          if (product.imageUrl && product.imageUrl.trim()) {
            try {
              const imageX = contentStartX;
              const imageY = yPosition + 3;
              const imageWidth = 28;
              const imageHeight = rowHeight - 6;
              
              doc.addImage(product.imageUrl, 'JPEG', imageX, imageY, imageWidth, imageHeight);
              contentStartX += imageWidth + 8; // Espacio después de la imagen
            } catch (imageError) {
              console.log('Error al cargar imagen:', imageError);
            }
          }
          
          // Texto del producto - centrado verticalmente
          doc.setTextColor(31, 41, 55);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          
          // Calcular espacio disponible para texto
          const textAreaWidth = 105 - (contentStartX - margin - 5);
          
          // Nombre del producto
          const productNameLines = doc.splitTextToSize(product.name, textAreaWidth);
          const nameY = centerY - (productNameLines.length > 1 ? 3 : 0);
          doc.text(productNameLines[0], contentStartX, nameY);
          
          // Descripción si existe
          if (product.description && product.description.trim()) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'normal');
            // Dividir texto en hasta 2 lineas
            const maxWidth = pageWidth - contentStartX - margin - 60; // Aumentado el espacio disponible
            const descriptionLines = doc.splitTextToSize(product.description, maxWidth);
            const linesToShow = descriptionLines.slice(0, 2);
            linesToShow.forEach((line: string, index: number) => {
              doc.text(line, contentStartX, nameY + 8 + (index * 10));
            });
          }
          
          // Columnas alineadas - centradas verticalmente
          doc.setFontSize(10);
          doc.setTextColor(31, 41, 55);
          doc.setFont('helvetica', 'normal');
          
          // Cantidad
          doc.text(product.quantity.toString(), margin + 120, centerY, { align: 'center' });
          
          // Total (en negrita)
          doc.setFont('helvetica', 'bold');
          doc.text(formatPriceString(product.total || 'A cotizar'), pageWidth - margin - 5, centerY, { align: 'right' });
          
          yPosition += rowHeight;
        });
        
        // Borde final de la tabla
        doc.setDrawColor(15, 23, 42);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        
        yPosition += 25;
        tableSuccessful = true;
        
      } else {
        // Usar autoTable estándar si no hay imágenes
        try {
          (doc as any).autoTable({
            startY: yPosition,
            head: [['PRODUCTOS / SERVICIOS', 'CANT.', 'TOTAL']],
            body: productsWithImages.map(product => { const nameWithDescription = product.description && product.description.trim() ? `${product.name}\n${product.description}` : product.name; return [nameWithDescription, product.quantity.toString(), formatPriceString(product.total || "A cotizar")]; }), // Solo nombre, cantidad y total
            theme: 'grid',
            headStyles: {
              fillColor: [15, 23, 42],
              textColor: [255, 255, 255],
              fontSize: 12,
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              cellPadding: 10,
              lineColor: [59, 130, 246],
              lineWidth: 1
            },
            bodyStyles: {
              fontSize: 10,
              cellPadding: 8,
              textColor: [31, 41, 55],
              lineColor: [229, 231, 235],
              lineWidth: 0.5
            },
            columnStyles: {
              0: { cellWidth: 110, halign: "left", valign: "top", fontSize: 8, lineHeight: 1.2 },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            margin: { left: margin, right: margin },
            styles: {
              overflow: 'linebreak',
              cellWidth: 'wrap', minCellHeight: 20, valign: 'top'
            }
          });

          yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : yPosition + 120;
          tableSuccessful = true;
        } catch (tableError) {
          console.warn('AutoTable failed, creating manual table:', tableError);
          tableSuccessful = false;
        }
      }

      // Tabla manual como respaldo final si todo falla
      if (!tableSuccessful) {
        
        // TABLA MANUAL como respaldo
        // Header de la tabla - solo borde azul, sin fondo
        const tableHeaderHeight = 15;
        doc.setDrawColor(41, 98, 255); // Azul para el borde
        doc.setLineWidth(1);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'S'); // Solo borde, sin relleno
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
        doc.text('CANT.', margin + 120, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', pageWidth - margin - 15, yPosition + 10, { align: 'right' });
        
        yPosition += tableHeaderHeight;
        
        // Filas de productos
        productData.forEach((row, index) => {
          const rowHeight = 14;
          const isEven = index % 2 === 0;
          
          // Fondo alternado
          if (isEven) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
          }
          
          // Borde de la fila
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'S');
          
          // Texto de la fila
          doc.setTextColor(55, 65, 81);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          
          // Limitar texto del producto si es muy largo
          const productName = doc.splitTextToSize(row[0], 110);
          doc.text(productName[0] + (productName.length > 1 ? '...' : ''), margin + 3, yPosition + 9);
          doc.text(row[1], margin + 120, yPosition + 9, { align: 'center' }); // Cantidad
          doc.text(formatPriceString(row[3]), pageWidth - margin - 3, yPosition + 9, { align: 'right' }); // Total (saltamos precio unitario)
          
          yPosition += rowHeight;
        });
        
        // Borde final de la tabla
        doc.setDrawColor(41, 98, 255);        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        
        yPosition += 25;
      }

      // === RESUMEN FINANCIERO PREMIUM ===
      // Para cotizaciones, no calculamos totales exactos
      const hasRealPrices = selectedProducts.some(product => 
        product[2] !== 'Consultar' && product[2] !== 'A cotizar' && 
        product[3] !== 'Consultar' && product[3] !== 'A cotizar'
      );

      console.log('Has real prices:', hasRealPrices);
      console.log('Selected products:', selectedProducts);

      // Calcular subtotal si hay precios reales
      if (hasRealPrices) {
        subtotalAmount = selectedProducts.reduce((total, product) => {
          const totalStr = product[3]; // Columna TOTAL
          console.log(`Procesando producto para subtotal: "${product[0]}", total: "${totalStr}"`);
          
          if (totalStr && totalStr !== 'A cotizar' && totalStr !== 'Consultar') {
            // Función mejorada para extraer números de strings con formato de moneda
            const extractNumber = (str: string): number => {
              // Remover símbolos de moneda y espacios
              let cleaned = str.replace(/[$ARS€£¥\s]/g, '');
              
              // Caso especial: si solo contiene puntos y son separadores de miles (formato argentino)
              if (cleaned.includes('.') && !cleaned.includes(',')) {
                // Verificar si es separador de miles: el punto debe estar seguido de exactamente 3 dígitos
                const parts = cleaned.split('.');
                if (parts.length > 1) {
                  // Si la última parte tiene exactamente 3 dígitos, es separador de miles
                  const lastPart = parts[parts.length - 1];
                  if (lastPart.length === 3) {
                    // Es separador de miles: 70.000 -> 70000
                    cleaned = cleaned.replace(/\./g, '');
                  }
                  // Si no, es decimal normal
                }
              }
              // Analizar el formato basado en la posición del último punto y coma
              else if (cleaned.includes('.') && cleaned.includes(',')) {
                const lastDot = cleaned.lastIndexOf('.');
                const lastComma = cleaned.lastIndexOf(',');
                
                if (lastComma > lastDot) {
                  // Formato español: 1.000,50 -> el último separador es la coma (decimal)
                  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                } else {
                  // Formato inglés: 1,000.50 -> el último separador es el punto (decimal)
                  cleaned = cleaned.replace(/,/g, '');
                }
              }
              // Si solo contiene comas
              else if (cleaned.includes(',')) {
                const parts = cleaned.split(',');
                if (parts.length === 2 && parts[1].length <= 2) {
                  // Es decimal: 1000,50 -> 1000.50
                  cleaned = cleaned.replace(',', '.');
                } else {
                  // Es separador de miles: 1,000 -> 1000
                  cleaned = cleaned.replace(/,/g, '');
                }
              }
              
              const number = parseFloat(cleaned);
              return isNaN(number) ? 0 : number;
            };
            
            const amount = extractNumber(totalStr);
            console.log(`  Añadiendo al subtotal: ${amount}`);
            return total + amount;
          }
          return total;
        }, 0);
        console.log('Subtotal calculado final:', subtotalAmount);
      }

      // Configuración para totales
      const totalsWidth = 120;
      const totalsHeight = hasRealPrices ? 140 : 80;
      const totalsX = pageWidth - margin - totalsWidth;

      // Verificar espacio disponible en la página
      if (yPosition + totalsHeight > pageHeight - 120) {
        doc.addPage();
        
        // Agregar imagen decorativa de fondo en página de totales
        addDecorativeBackground(doc, pageWidth, pageHeight);
        
        yPosition = 30;
        
        // Mini header para página de totales
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');

        yPosition = 50;
      }

      // === DISEÑO SIMPLE PARA TOTALES ===
      // Título simple sin recuadro del título
      
      // Agregar imagen decorativa encima del contenido
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(hasRealPrices ? 'RESUMEN TOTAL' : 'INFORMACIÓN', totalsX, yPosition);
      
      yPosition += 25;

      let totalsY = yPosition + 20;

      if (hasRealPrices) {
        // === CÁLCULOS TRADICIONALES ===
        const iva = subtotalAmount * 0.16;
        const totalImpuestos = iva;
        const total = subtotalAmount + totalImpuestos;

        // === SUBTOTAL ===
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(`$${subtotalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 18;

        // === IVA ===
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.text('IVA (16%):', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(`$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 18;

        // === TOTAL DE IMPUESTOS ===
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.text('Tot. Impuestos:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(`$${totalImpuestos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 20;

        // Línea decorativa antes del total
        doc.setDrawColor(15, 23, 42);
        doc.line(totalsX + 10, totalsY, totalsX + totalsWidth - 10, totalsY);
        
        totalsY += 15;

        // === TOTAL FINAL DESTACADO ===
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX + 10, totalsY + 3);
        
        doc.setFontSize(15);
        doc.setTextColor(147, 197, 253);
        doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + totalsWidth - 10, totalsY + 3, { align: 'right' });
      } else {
        // === INFORMACIÓN PARA COTIZACIONES ===
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Estado:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        doc.text('Cotización', totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 15;

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('Precios:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        doc.text('A consultar', totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 15;

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('Válida hasta:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        const validUntil = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('es-ES');
        doc.text(validUntil, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
      }

      yPosition += totalsHeight + 10;

      // === TÉRMINOS Y CONDICIONES ORGANIZADOS ===
      const termsX = margin;
      const termsWidth = totalsX - margin - 30;
      
      // Alinear exactamente con el título del resumen total
      let termsY = yPosition - totalsHeight + 10;
      
      // Título con fondo azul profesional como en el PDF de referencia
      doc.setFillColor(51, 100, 199);  // Azul profesional
      doc.rect(termsX, termsY - 5, termsWidth, 15, 'F');
      
      // Borde sutil
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(termsX, termsY - 5, termsWidth, 15, 'S');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', termsX + 8, termsY + 4);

      termsY += 20;

      doc.setTextColor(70, 70, 70);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const termsAndConditions3 = [
        '1. Condiciones de pago: Acuerdo con el cliente',
        '2. Tiempo de entrega: 7 días hábiles',
        '3. Enviar cotización firmada al email indicado'
      ];

      termsAndConditions3.forEach(term => {
        doc.text(term, termsX + 5, termsY);
        termsY += 12;
      });
      
      // Actualizar yPosition para contenido siguiente
      yPosition = Math.max(yPosition, termsY + 10);

      // === DESCRIPCIÓN DEL PROYECTO ===
      if (clientInfo.descripcionDelProyecto && clientInfo.descripcionDelProyecto.trim()) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          
          // Agregar imagen decorativa de fondo en página de descripción
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
          
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

      // === NUEVA PÁGINA PARA FAQ ===
      if (yPosition > pageHeight - 200) {
        doc.addPage();
        
        // Agregar imagen decorativa de fondo en página FAQ
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
        
        yPosition = margin;
        
        // Header minimalista para nueva página
        doc.setFillColor(248, 249, 251);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        // Logo pequeño
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 20, 15);
        } catch (error) {
          console.log('Error adding MIRG logo to FAQ page:', error);
        }
        
        // Solo información de cotización (sin nombre de empresa)
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
        doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 45, 18);
        
        yPosition = 50;
      }

      // === PREGUNTAS FRECUENTES ===
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PREGUNTAS FRECUENTES', margin, yPosition);

      yPosition += 15;

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const faqs = [
        {
          q: '¿Qué tipo de maquinados industriales realizan?',
          a: 'Realizamos mecanizado CNC de precisión, torneado, fresado, rectificado y fabricación de piezas especiales según planos y especificaciones técnicas. Trabajamos con diversos materiales como acero, aluminio, bronce y materiales especiales.'
        },
        {
          q: '¿Cuál es el tiempo de entrega típico?',
          a: 'Los tiempos varían según la complejidad del proyecto. Piezas estándar: 3-5 días hábiles. Proyectos complejos: 1-3 semanas. Siempre confirmamos tiempos específicos en cada cotización.'
        },
        {
          q: '¿Qué certificaciones y estándares manejan?',
          a: 'Contamos con certificación ISO 9001 y seguimos estándares de calidad industrial. Todas nuestras piezas son inspeccionadas con equipos de medición calibrados y certificados.'
        },
        {
          q: '¿Realizan trabajos de prototipado?',
          a: 'Sí, ofrecemos servicios completos de prototipado rápido, desde el diseño asistido por computadora hasta la fabricación de prototipos funcionales para validación y pruebas.'
        },
        {
          q: '¿Qué garantía ofrecen en sus trabajos?',
          a: 'Ofrecemos garantía de 90 días por defectos de fabricación. Adicionalmente, respaldamos la calidad dimensional y funcional de todas nuestras piezas según especificaciones acordadas.'
        },
        {
          q: '¿Manejan proyectos de gran volumen?',
          a: 'Sí, tenemos capacidad para proyectos desde piezas unitarias hasta series de producción medianas y grandes. Contamos con múltiples centros de mecanizado para cumplir con volúmenes importantes.'
        }
      ];

      faqs.forEach((faq, index) => {
        // Verificar si necesitamos nueva página
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          
          // Agregar imagen decorativa de fondo en nueva página FAQ
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
          
          yPosition = margin;
          
          // Header minimalista para nueva página
          doc.setFillColor(248, 249, 251);
          doc.rect(0, 0, pageWidth, 30, 'F');
          
          try {
            doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 20, 15);
          } catch (error) {
            console.log('Error adding MIRG logo to FAQ continuation page:', error);
          }
          
          // Solo información de cotización (sin nombre de empresa)
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
          doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 45, 18);
          
          yPosition = 50;
        }

        // Pregunta
        doc.setTextColor(41, 98, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const questionLines = doc.splitTextToSize(`${index + 1}. ${faq.q}`, pageWidth - (margin * 2));
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * 5 + 3;

        // Respuesta
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const answerLines = doc.splitTextToSize(faq.a, pageWidth - (margin * 2));
        doc.text(answerLines, margin, yPosition);
        yPosition += answerLines.length * 4.5 + 8;
      });

      yPosition += 10;

      // === NUEVA PÁGINA PARA TÉRMINOS ===
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        
        // Agregar imagen decorativa de fondo en página de términos
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
        
        yPosition = margin;
      }

      // === TÉRMINOS Y CONDICIONES ORGANIZADOS ===
      const termsXNew = margin;
      const termsWidthNew = pageWidth - (margin * 2);
      let termsYNew = yPosition;
      
      // Título con fondo azul profesional como en el PDF de referencia
      doc.setFillColor(51, 100, 199);  // Azul profesional
      doc.rect(termsXNew, termsYNew - 5, termsWidthNew, 15, 'F');
      
      // Borde sutil
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(termsXNew, termsYNew - 5, termsWidthNew, 15, 'S');
      
      doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', termsXNew + 8, termsYNew + 4);

      termsYNew += 20;

      doc.setTextColor(70, 70, 70);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const termsAndConditions4 = [
        '1. Condiciones de pago: Acuerdo con el cliente',
        '2. Tiempo de entrega: 7 días hábiles',
        '3. Enviar cotización firmada al email indicado'
      ];

      termsAndConditions4.forEach((term, index) => {
        doc.text(term, termsXNew + 5, termsYNew);
        termsYNew += 12;
      });
      
      // Actualizar yPosition para contenido siguiente
      yPosition = Math.max(yPosition, termsYNew + 10);

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
      
      doc.setFontSize(8);
      doc.text(`${companyInfo.email} | ${companyInfo.phone}`, pageWidth / 2, footerY + 25, { align: 'center' });
      
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES')}`,
                pageWidth / 2, footerY + 32, { align: 'center' });

      // === MANEJAR DESCARGA O ENVÍO POR EMAIL ===
      const filename = `Cotizacion_${getServiceType(clientInfo)}_${submission.id.substring(0, 8)}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
      
      if (!sendEmail) {
        // Solo descargar
        doc.save(filename);
        return { success: true, emailSent: false };
      } else {
        // Enviar por email
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        let email = submission.customerEmail || '';
        let name = getClientName(clientInfo, submission);
        
        // Buscar email en todos los campos si no está en customerEmail
        if (!email) {
          for (const [key, value] of Object.entries(clientInfo)) {
            const strValue = String(value).toLowerCase();
            if (strValue.includes('@') && strValue.includes('.')) {
              email = String(value).trim();
              break;
            }
          }
        }
        
        if (email && name) {
          const { EmailService } = await import('../lib/email-service');
          const quoteId = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
          
          const emailResult = await EmailService.sendQuotePDF(
            email,
            name,
            pdfBase64,
            quoteId
          );
          
          return {
            success: true,
            emailSent: emailResult.success,
            emailMessage: emailResult.message,
          };
        } else {
          return {
            success: true,
            emailSent: false,
            emailMessage: `Falta información: email=${email}, nombre=${name}`,
          };
        }
      }
      
    } catch (error) {
      console.error('Error exporting to PDF and email:', error);
      throw new Error('Error al exportar a PDF y enviar email');
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
      const validUntil = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('es-ES');
      const quoteNumber = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;

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
                new TextRun(getCompanyName(clientInfo))
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: `Email: `, bold: true }),
                new TextRun(clientInfo["2"] || clientInfo.email || submission.customerEmail || 'N/A')
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: `Teléfono: `, bold: true }),
                new TextRun(getPhone(clientInfo, submission))
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
              text: `Tipo de servicio: ${getServiceType(clientInfo)}`,
              spacing: { after: 300 }
            }),

            // FAQ Section
            new Paragraph({
              text: 'PREGUNTAS FRECUENTES',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '1. ¿Qué tipo de maquinados industriales realizan?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Realizamos mecanizado CNC de precisión, torneado, fresado, rectificado y fabricación de piezas especiales según planos y especificaciones técnicas.',
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '2. ¿Cuál es el tiempo de entrega típico?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Los tiempos varían según complejidad. Piezas estándar: 3-5 días hábiles. Proyectos complejos: 1-3 semanas.',
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '3. ¿Qué certificaciones manejan?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Contamos con certificación ISO 9001 y seguimos estándares de calidad industrial con equipos calibrados.',
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '4. ¿Qué garantía ofrecen?', bold: true })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Garantía de 90 días por defectos de fabricación y respaldo de calidad dimensional según especificaciones.',
              spacing: { after: 300 }
            }),

            // Términos
            new Paragraph({
              text: 'TÉRMINOS Y CONDICIONES',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 200 }
            }),

            new Paragraph({
              text: '1. Condiciones de pago: Acuerdo con el cliente\n2. Tiempo de entrega: 7 días hábiles\n3. Enviar cotización firmada al email indicado',
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
      const filename = `Cotizacion_${getServiceType(clientInfo)}_${submission.id.substring(0, 8)}.docx`;
      const arrayBuffer = buffer as unknown as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, filename);
      
    } catch (error) {
      console.error('Error exporting to Word:', error);
      throw new Error('Error al exportar a Word');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Hook return interface
   * @returns {Object} Export functions and loading state
   */
  return {
    /** Export quote to PDF format */
    exportToPDF,
    /** Export quote to PDF and optionally send via email */
    exportToPDFAndEmail,
    /** Export quote to Word document format */
    exportToWord,
    /** Loading state indicator */
    loading
  };
};























