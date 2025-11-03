import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
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
  headerHeight: 70,
  lineWidth: 1,
  fontSize: {
    title: 32,
    subtitle: 20,
    normal: 10,
    small: 8
  },
  colors: {
    primary: [26, 115, 232],        // Azul moderno vibrante (Google Blue)
    secondary: [66, 133, 244],      // Azul medio brillante
    text: [33, 33, 33],             // Texto casi negro
    lightBlue: [232, 240, 254],     // Azul muy claro para fondos
    lightGray: [245, 247, 250],     // Gris claro moderno
    darkGray: [60, 64, 67]          // Gris oscuro profesional
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
  
  // Formatear manualmente con comas mexicanas y agregar símbolo de dinero
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const result = `$${integerPart}.${parts[1]}`;
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
    companyInfo: CompanyInfo = defaultCompanyInfo,
    customFAQs?: Array<{ id: string; question: string; answer: string }>
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

      // === HEADER LIMPIO Y PROPORCIONADO ===
      // Barra superior azul delgada
      doc.setFillColor(65, 90, 150);
      doc.rect(0, 0, pageWidth, 2.5, 'F');
      
      // Fondo blanco para el header
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 2.5, pageWidth, 42, 'F');
      
      // Buscar logo
      let logoToUse = MIRG_LOGO_BASE64;
      const submittedImages = Object.entries(submission.data).find(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image/')
      );
      if (submittedImages && submittedImages[1]) {
        logoToUse = submittedImages[1] as string;
      }
      
      // Logo - tamaño normal
      try {
        doc.addImage(logoToUse, 'PNG', margin, 10, 32, 19);
      } catch (error) {
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 10, 32, 19);
        } catch (fallbackError) {
          console.log('Error adding logo');
        }
      }
      
      // Información de la empresa - al lado del logo
      const infoStartX = margin + 38;
      
      // Nombre de la empresa proporcional
      const companyTitle = companyInfo.name.split(' - ')[0] || companyInfo.name;
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(companyTitle, infoStartX, 16);
      
      // Tagline
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);
      doc.text('Maquinados Industriales de Precisión', infoStartX, 22);
      
      // Información de contacto - derecha, compacta
      const contactX = pageWidth - margin - 68;
      
      doc.setFontSize(8.5);
      
      // Email
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(65, 90, 150);
      doc.text('Email:', contactX, 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(companyInfo.email, contactX + 14, 12);
      
      // Teléfono
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(65, 90, 150);
      doc.text('Tel:', contactX, 18);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(companyInfo.phone, contactX + 14, 18);
      
      // RFC
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(65, 90, 150);
      doc.text('RFC:', contactX, 24);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const rfcText = companyInfo.website || 'RAGH931025DP4';
      doc.text(rfcText, contactX + 14, 24);
      
      // Línea divisoria inferior
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(0, 44.5, pageWidth, 44.5);

      yPosition = 52;

      // === TÍTULO PRINCIPAL PROPORCIONADO ===
      // Badge compacto
      doc.setFillColor(245, 248, 255);
      doc.roundedRect(margin, yPosition, 55, 7, 1.5, 1.5, 'F');
      doc.setTextColor(65, 90, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENTO OFICIAL', margin + 27.5, yPosition + 5, { align: 'center' });
      
      yPosition += 10;
      
      // Título principal proporcional
      doc.setTextColor(45, 45, 45);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('COTIZACIÓN', margin + 27.5, yPosition - 0, { align: 'center' });
      
      // Subtítulo
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('Propuesta Comercial', margin, yPosition + 7);
      
      yPosition += 15;

      // === INFORMACIÓN DE LA COTIZACIÓN - BADGES COMPACTOS ===
      const quoteDate = new Date().toLocaleDateString('es-ES');
      const validUntil = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('es-ES');
      const quoteNumber = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;

      // Contenedor principal compacto
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 32, 3, 3, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 32, 3, 3, 'S');

      // === BADGES COMPACTOS Y PROPORCIONADOS ===
      const badgeY = yPosition + 5;
      const badgeHeight = 22;
      const badgeSpacing = 6;
      const totalBadgeSpace = pageWidth - (margin * 2) - (badgeSpacing * 4);
      const badgeWidth = totalBadgeSpace / 3;
      
      // Badge 1: Número de Cotización
      const badge1X = margin + badgeSpacing;
      doc.setFillColor(248, 250, 255);
      doc.roundedRect(badge1X, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
      doc.setDrawColor(200, 210, 230);
      doc.setLineWidth(0.5);
      doc.roundedRect(badge1X, badgeY, badgeWidth, badgeHeight, 2, 2, 'S');
      
      doc.setTextColor(65, 90, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('N° COTIZACIÓN', badge1X + badgeWidth / 2, badgeY + 7, { align: 'center' });
      
      doc.setTextColor(45, 45, 45);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(quoteNumber, badge1X + badgeWidth / 2, badgeY + 16, { align: 'center' });
      
      // Badge 2: Fecha de Emisión
      const badge2X = badge1X + badgeWidth + badgeSpacing;
      doc.setFillColor(248, 250, 255);
      doc.roundedRect(badge2X, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
      doc.setDrawColor(200, 210, 230);
      doc.setLineWidth(0.5);
      doc.roundedRect(badge2X, badgeY, badgeWidth, badgeHeight, 2, 2, 'S');
      
      doc.setTextColor(65, 90, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('FECHA EMISIÓN', badge2X + badgeWidth / 2, badgeY + 7, { align: 'center' });
      
      doc.setTextColor(45, 45, 45);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(quoteDate, badge2X + badgeWidth / 2, badgeY + 16, { align: 'center' });
      
      // Badge 3: Válida Hasta
      const badge3X = badge2X + badgeWidth + badgeSpacing;
      doc.setFillColor(248, 250, 255);
      doc.roundedRect(badge3X, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
      doc.setDrawColor(200, 210, 230);
      doc.setLineWidth(0.5);
      doc.roundedRect(badge3X, badgeY, badgeWidth, badgeHeight, 2, 2, 'S');
      
      doc.setTextColor(65, 90, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('VÁLIDA HASTA', badge3X + badgeWidth / 2, badgeY + 7, { align: 'center' });
      
      doc.setTextColor(45, 45, 45);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(validUntil, badge3X + badgeWidth / 2, badgeY + 16, { align: 'center' });

      yPosition += 38;

      // === INFORMACIÓN DEL CLIENTE - DOS COLUMNAS CON HEADERS ===
      const clientInfo: { [key: string]: any } = submission.data;
      
      const clientBoxY = yPosition;
      const clientBoxHeight = 55;
      const centerX = pageWidth / 2;
      const headerHeight = 12;
      
      // Contenedor izquierdo - INFORMACIÓN CORPORATIVA
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, clientBoxY, centerX - margin - 2, clientBoxHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(margin, clientBoxY, centerX - margin - 2, clientBoxHeight, 'S');
      
      // Header izquierdo
      doc.setFillColor(65, 90, 150);
      doc.rect(margin, clientBoxY, centerX - margin - 2, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACION CORPORATIVA', margin + (centerX - margin - 2) / 2, clientBoxY + 8, { align: 'center' });
      
      // Contenido columna izquierda
      let leftY = clientBoxY + headerHeight + 8;
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Razon Social:', margin + 5, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(getCompanyName(clientInfo), margin + 35, leftY);
      
      leftY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Contacto:', margin + 5, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(getClientName(clientInfo, submission), margin + 35, leftY);
      
      leftY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Email:', margin + 5, leftY);
      doc.setFont('helvetica', 'normal');
      const clientEmail = clientInfo["2"] || clientInfo.email || submission.customerEmail || 'NULL';
      doc.text(clientEmail, margin + 35, leftY);
      
      leftY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Telefono:', margin + 5, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(getPhone(clientInfo, submission), margin + 35, leftY);
      
      // Contenedor derecho - DETALLES ADICIONALES
      doc.setFillColor(255, 255, 255);
      doc.rect(centerX + 2, clientBoxY, pageWidth - margin - centerX - 2, clientBoxHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(centerX + 2, clientBoxY, pageWidth - margin - centerX - 2, clientBoxHeight, 'S');
      
      // Header derecho
      doc.setFillColor(65, 90, 150);
      doc.rect(centerX + 2, clientBoxY, pageWidth - margin - centerX - 2, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLES ADICIONALES', centerX + 2 + (pageWidth - margin - centerX - 2) / 2, clientBoxY + 8, { align: 'center' });
      
      // Contenido columna derecha
      let rightY = clientBoxY + headerHeight + 8;
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Direccion:', centerX + 7, rightY);
      doc.setFont('helvetica', 'normal');
      const addressText = getAddress(clientInfo);
      const addressLines = doc.splitTextToSize(addressText, pageWidth - margin - centerX - 32);
      doc.text(addressLines, centerX + 7, rightY + 4);
      
      rightY += (addressLines.length * 4) + 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Sector:', centerX + 7, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(getSector(clientInfo), centerX + 7 + 20, rightY);
      
      yPosition += clientBoxHeight + 12;

      // === NUEVA PÁGINA PARA PRODUCTOS Y SERVICIOS - ESTILO PREMIUM ===
      doc.addPage();
      
      // Agregar imagen decorativa de fondo en la segunda página
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
      
      yPosition = 30;

      // Header estilizado para segunda página
  // Compact header for second page: single light band to save vertical space
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // subtle divider line below header
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 32, pageWidth, 1, 'F');

  // Logo (smaller and positioned higher to save space)
  try {
    doc.addImage(logoToUse, 'PNG', margin, 8, 28, 18);
  } catch (error) {
    console.log('Error adding logo to second page:', error);
    try {
      doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 28, 18);
    } catch (fallbackError) {
      console.log('Error adding MIRG logo to second page:', fallbackError);
    }
  }

  // Cotización a la derecha, alineada verticalmente con el logo
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
  doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 60, 20);

  // Start page content immediately after header (sin espacio)
  yPosition = 33;

      // === TÍTULO DE PRODUCTOS INTEGRADO CON LA TABLA ===
      const productsBoxWidth = pageWidth - (margin * 2);
      const productsBoxStartY = yPosition; // Guardar inicio del contenedor unificado
      
      // Header con fondo azul - solo esquinas superiores redondeadas
      doc.setFillColor(65, 90, 150);
      // Primero el rectángulo redondeado superior
      doc.roundedRect(margin, yPosition, productsBoxWidth, 12, 3, 3, 'F');
      // Luego un rectángulo que cubra solo la parte inferior (sin redondeo)
      doc.rect(margin, yPosition + 6, productsBoxWidth, 6, 'F');
      
      // Título centrado en blanco
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const productsTitleText = 'DETALLE DE PRODUCTOS Y SERVICIOS';
      const productsTitleX = margin + (productsBoxWidth / 2);
      doc.text(productsTitleText, productsTitleX, yPosition + 8, { align: 'center' });
      
      yPosition += 12; // Avanzar solo hasta el final del header

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

      // === TABLA DENTRO DEL CUADRO UNIFICADO ===
      const tableContainerWidth = pageWidth - (margin * 2);
      const tableContainerStartY = productsBoxStartY; // Inicio del cuadro unificado
      
      // === NUEVA TABLA DE PRODUCTOS CON SOPORTE PARA IMÁGENES ===
      let tableSuccessful = false;
      
      // Si hay productos con imágenes, usar tabla manual mejorada
      if (productsWithImages.length > 0 && productsWithImages.some(p => p.imageUrl)) {
        console.log('Generando tabla con imágenes...');
        
        // Header de la tabla - integrado al cuadro (sin borde superior separado)
        const tableHeaderHeight = 15;
        
        // Fondo blanco para el header de columnas
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'F');
        
        // Línea divisoria entre título y columnas (no llega hasta los bordes)
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin + 2, yPosition, pageWidth - margin - 2, yPosition);
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTOS / SERVICIOS', margin + 8, yPosition + 10);
        doc.text('CANT.', margin + 80, yPosition + 10, { align: 'center' });
        doc.text('PRECIO UNIT.', margin + 110, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', margin + 150, yPosition + 10, { align: 'center' });
        
        yPosition += tableHeaderHeight;
        
        // Procesar cada producto con altura dinámica
        productsWithImages.forEach((product, index) => {
          // Calcular altura necesaria para la fila
          let rowHeight = 25; // Altura base

          // Si hay imagen, aumentar altura base
          let imageHeight = 0;
          if (product.imageUrl && product.imageUrl.trim()) {
            imageHeight = 35;
            rowHeight = Math.max(rowHeight, imageHeight);
          }
          
          // Verificar si necesitamos nueva página
          if (yPosition + rowHeight > pageHeight - 50) {
            doc.addPage();
            yPosition = margin + 20;
            
            // Re-dibujar header en nueva página
            doc.setFillColor(255, 255, 255);
            doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
        doc.text('CANT.', margin + 80, yPosition + 10, { align: 'center' });
        doc.text('PRECIO UNIT.', margin + 110, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', margin + 150, yPosition + 10, { align: 'center' });
            
            yPosition += tableHeaderHeight;
          }
          
          const isEven = index % 2 === 0;
          
          // Fondo alternado (sin bordes individuales - el borde exterior redondeado los cubre)
          if (isEven) {
            doc.setFillColor(59, 130, 246);
            doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
          }
          
          // Línea divisoria horizontal entre filas (solo si no es la última fila, sin llegar a los bordes)
          if (index < productsWithImages.length - 1) {
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.3);
            doc.line(margin + 2, yPosition + rowHeight, pageWidth - margin - 2, yPosition + rowHeight);
          }
          
          // Coordenadas para el contenido (más padding para evitar que se corte)
          let contentStartX = margin + 8;
          
          // Calcular espacio disponible para texto basado en la X de la columna CANT.
          const quantityX = margin + 80;
          const paddingBetweenColumns = 10;
          const textAreaWidth = Math.max(40, quantityX - contentStartX - paddingBetweenColumns);

          // Nombre del producto y posible wrapping en hasta 2 líneas
          doc.setFontSize(10);
          const productNameLines = doc.splitTextToSize(product.name, textAreaWidth);
          const nameLinesToShow = productNameLines.slice(0, 2);
          const nameHeight = nameLinesToShow.length * 8;

          // Descripción (hasta 2 líneas adicionales)
          let descriptionLines: string[] = [];
          let descHeight = 0;
          if (product.description && product.description.trim()) {
            doc.setFontSize(8);
            const descMaxWidth = Math.max(30, quantityX - contentStartX - paddingBetweenColumns);
            descriptionLines = doc.splitTextToSize(product.description, descMaxWidth).slice(0, 2);
            descHeight = descriptionLines.length * 8 + (descriptionLines.length ? 4 : 0);
          }

          // Altura mínima necesaria para el contenido textual
          const textContentHeight = nameHeight + descHeight + 8; // padding interior
          rowHeight = Math.max(rowHeight, textContentHeight, imageHeight);

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
          
          // Texto del producto
          doc.setTextColor(31, 41, 55);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);

          // Dibujar nombre en hasta 2 líneas, desde la parte superior del área de contenido
          const textStartY = yPosition + 6;
          nameLinesToShow.forEach((line: string, idx: number) => {
            doc.text(line, contentStartX, textStartY + (idx * 8));
          });

          // Dibujar descripción debajo del nombre (si existe)
          if (descriptionLines.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            descriptionLines.forEach((line: string, idx: number) => {
              const descY = textStartY + (nameLinesToShow.length * 8) + 4 + (idx * 8);
              doc.text(line, contentStartX, descY);
            });
          }
          
          // Columnas alineadas - centradas verticalmente respecto a rowHeight
          doc.setFontSize(10);
          doc.setTextColor(59, 130, 246);
          doc.setFont('helvetica', 'normal');

          // Cantidad
          doc.text(product.quantity.toString(), margin + 80, centerY, { align: 'center' });

          // Precio unitario
          doc.text(formatPriceString(product.unitPrice || 'A cotizar'), margin + 110, centerY, { align: 'center' });

          // Total (en negrita)
          doc.setFont('helvetica', 'bold');
          doc.text(formatPriceString(product.total || 'A cotizar'), margin + 150, centerY, { align: 'center' });

          // Avanzar Y según altura calculada
          yPosition += rowHeight;
        });
        
        // Dibujar bordes laterales y esquinas redondeadas del cuadro completo
        const tableContainerHeight = yPosition - tableContainerStartY;
        
        // Configurar estilo del borde
        doc.setDrawColor(65, 90, 150);
        doc.setLineWidth(2);
        
        // Dibujar el rectángulo redondeado completo (esto da las esquinas)
        doc.roundedRect(margin, tableContainerStartY, tableContainerWidth, tableContainerHeight, 3, 3, 'S');
        
        yPosition += 25;
        tableSuccessful = true;
        
      } else {
        // Usar autoTable estándar si no hay imágenes
        try {
          (doc as any).autoTable({
            startY: yPosition,
            head: [['PRODUCTOS / SERVICIOS', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
            body: productsWithImages.map(product => { const nameWithDescription = product.description && product.description.trim() ? `${product.name}\n${product.description}` : product.name; return [nameWithDescription, product.quantity.toString(), formatPriceString(product.unitPrice || "A cotizar"), formatPriceString(product.total || "A cotizar")]; }), // Solo nombre, cantidad y total
            theme: 'grid',
            headStyles: {
              fillColor: [255, 255, 255], // Fondo blanco
              textColor: [60, 60, 60], // Texto oscuro
              fontSize: 10,
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              cellPadding: 4,
              lineColor: [41, 98, 255], // Borde azul
              lineWidth: 0.5
            },
            bodyStyles: {
              fontSize: 9,
              cellPadding: 4,
              textColor: PDF_CONFIG.colors.text,
              lineColor: [59, 130, 246], // Borde de fila gris claro
              lineWidth: 0.5
            },
            columnStyles: {
              0: { cellWidth: 85, halign: "left", valign: "middle", fontSize: 9, lineHeight: 1.2 },
              1: { cellWidth: 20, halign: 'center', valign: 'middle' },
              2: { cellWidth: 30, halign: 'right', valign: 'middle' },
              3: { cellWidth: 30, halign: 'right', valign: 'middle', fontStyle: 'bold' }
            },
            alternateRowStyles: {
              fillColor: [59, 130, 246] // Sin color de fondo alterno
            },
            margin: { left: margin, right: margin },
            styles: {
              overflow: 'linebreak',
              cellWidth: 'wrap', 
              minCellHeight: 10, 
              valign: 'middle'
            },
            // Configuración para paginación automática
            showHead: 'everyPage', // Mostrar encabezado en cada página
            pageBreak: 'auto', // Salto de página automático
            rowPageBreak: 'avoid', // Evitar romper filas entre páginas
            tableWidth: 'auto'
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
        
        // Función para dibujar el header de la tabla
        const drawTableHeader = (yPos: number) => {
          doc.setDrawColor(41, 98, 255); // Azul para el borde
          doc.setLineWidth(1);
          doc.rect(margin, yPos, pageWidth - (margin * 2), tableHeaderHeight, 'S'); // Solo borde, sin relleno
          
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPos + 10);
          doc.text('CANT.', margin + 80, yPos + 10, { align: 'center' });
          doc.text('PRECIO UNIT.', margin + 110, yPos + 10, { align: 'center' });
          doc.text('TOTAL', margin + 150, yPos + 10, { align: 'center' });
          
          return yPos + tableHeaderHeight;
        };
        
        // Dibujar header inicial
        yPosition = drawTableHeader(yPosition);
        
        // Filas de productos
        productData.forEach((row, index) => {
          // Allow product name to wrap up to 2 lines in the fallback table
          const quantityX = margin + 80;
          const paddingBetweenColumns = 6;
          const nameMaxWidth = Math.max(40, quantityX - (margin + 3) - paddingBetweenColumns);
          const nameLines = doc.splitTextToSize(String(row[0] || ''), nameMaxWidth).slice(0, 2);
          const nameHeight = nameLines.length * 8;

          const baseRowHeight = 14;
          const rowHeight = Math.max(baseRowHeight, nameHeight + 8);
          
          // Verificar si necesitamos una nueva página (dejar espacio para totales y footer)
          if (yPosition + rowHeight > pageHeight - 100) {
            // Agregar nueva página
            doc.addPage();
            yPosition = margin + 20;
            
            // Re-dibujar el header de la tabla en la nueva página
            yPosition = drawTableHeader(yPosition);
          }
          
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

          // Draw product name lines starting a few pts from top of row
          const textStartY = yPosition + 6;
          nameLines.forEach((line: string, idx: number) => {
            const isTruncated = idx === nameLines.length - 1 && doc.splitTextToSize(String(row[0] || ''), nameMaxWidth).length > nameLines.length;
            doc.text(line + (isTruncated ? '...' : ''), margin + 3, textStartY + (idx * 8));
          });

          // Center other columns vertically within the row
          const centerY = yPosition + (rowHeight / 2);
          doc.text(row[1], margin + 80, centerY, { align: 'center' }); // Cantidad
          doc.text(formatPriceString(row[2] || 'A cotizar'), margin + 110, centerY, { align: 'center' }); // Precio unitario
          doc.text(formatPriceString(row[3] || ''), margin + 150, centerY, { align: 'center' }); // Total

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

      // === RESUMEN TOTAL - DISEÑO PROFESIONAL ===
      
      // Contenedor principal con sombra sutil
      const summaryBoxY = yPosition;
      const summaryBoxHeight = 95;
      
      // Fondo del contenedor
      doc.setFillColor(250, 251, 252);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(totalsX, summaryBoxY, totalsWidth, summaryBoxHeight, 3, 3, 'FD');

      // Header con fondo azul
      doc.setFillColor(65, 90, 150);
      doc.roundedRect(totalsX, summaryBoxY, totalsWidth, 12, 3, 3, 'F');
      
      // Rectángulo para cubrir las esquinas inferiores del header
      doc.setFillColor(65, 90, 150);
      doc.rect(totalsX, summaryBoxY + 9, totalsWidth, 3, 'F');
      
      // Título del header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const headerCenterX = totalsX + (totalsWidth / 2);
      doc.text(hasRealPrices ? 'RESUMEN TOTAL' : 'INFORMACION', headerCenterX, summaryBoxY + 8, { align: 'center' });

      let totalsY = summaryBoxY + 25;

      if (hasRealPrices) {
        // === CÁLCULOS ===
        const iva = calculateTax(subtotalAmount);
        const totalImpuestos = iva;
        const total = subtotalAmount + totalImpuestos;

        // === SUBTOTAL ===
        doc.setTextColor(70, 70, 70);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX + 20, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(65, 90, 150);
        doc.setFontSize(11);
        doc.text(formatCurrency(subtotalAmount), totalsX + totalsWidth - 20, totalsY, { align: 'right' });
        
        totalsY += 13;

        // === IVA ===
        doc.setTextColor(70, 70, 70);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`IVA (${Math.round(PDF_CONFIG.taxRate * 100)}%):`, totalsX + 20, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(65, 90, 150);
        doc.setFontSize(11);
        doc.text(formatCurrency(iva), totalsX + totalsWidth - 20, totalsY, { align: 'right' });
        
        totalsY += 13;

        // === TOTAL DE IMPUESTOS ===
        doc.setTextColor(70, 70, 70);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Tot. Impuestos:', totalsX + 20, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(65, 90, 150);
        doc.setFontSize(11);
        doc.text(formatCurrency(totalImpuestos), totalsX + totalsWidth - 20, totalsY, { align: 'right' });
        
        totalsY += 16;

        // Línea separadora elegante
        doc.setDrawColor(65, 90, 150);
        doc.setLineWidth(1.5);
        doc.line(totalsX + 20, totalsY, totalsX + totalsWidth - 20, totalsY);
        
        totalsY += 14;

        // === TOTAL FINAL DESTACADO ===
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX + 20, totalsY);
        
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text(formatCurrency(total), totalsX + totalsWidth - 20, totalsY, { align: 'right' });
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

      // === TÉRMINOS Y CONDICIONES - DISEÑO PROFESIONAL ===
      const termsX = margin;
      const termsWidth = totalsX - margin - 30;
      
  // Alinear exactamente con el borde superior del recuadro "RESUMEN TOTAL"
  // Usamos summaryBoxY (top del recuadro de totales) para que queden a la misma altura
  let termsY = summaryBoxY;

      // Configurar tipografía de contenido
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      // Extraer tiempo de entrega de los datos de la cotización o usar valor por defecto
      const deliveryTime = submission.data?.deliveryTime || '7 dias habiles';

      // Ítems de términos (en una sola línea, luego se hace wrapping automático)
      const termsItems = [
        '1. Condiciones de pago: Acuerdo con el cliente',
        `2. Tiempo de entrega: ${deliveryTime}`,
        '3. Enviar cotizacion firmada al email indicado'
      ];

      // Cálculo de alto dinámico del cuadro según el wrapping
      const textPaddingX = 12; // padding lateral dentro del recuadro
      const maxTextWidth = Math.max(30, termsWidth - (textPaddingX * 2));
      const lineHeight = 6; // altura por línea para el contenido
      const wrappedTerms: string[][] = termsItems.map(item => doc.splitTextToSize(item, maxTextWidth));
      const contentHeight = wrappedTerms.reduce((acc, lines) => acc + (lines.length * lineHeight) + 4, 0);
      const termsBoxHeight = Math.max(95, contentHeight + 24); // + header y márgenes

  // Contenedor principal con fondo y bordes redondeados (alineado con RESUMEN TOTAL)
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(termsX, termsY, termsWidth, termsBoxHeight, 3, 3, 'FD');
      
  // Header con fondo azul (misma altura que el de RESUMEN TOTAL)
  doc.setFillColor(65, 90, 150);
  doc.roundedRect(termsX, termsY, termsWidth, 12, 3, 3, 'F');
      
  // Rectángulo para cubrir las esquinas inferiores del header (offset +9 como en totales)
  doc.setFillColor(65, 90, 150);
  doc.rect(termsX, termsY + 9, termsWidth, 3, 'F');
      
      // Título centrado en el header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const termsCenterX = termsX + (termsWidth / 2);
  doc.text('TERMINOS Y CONDICIONES', termsCenterX, termsY + 8, { align: 'center' });

      // Restablecer estilo de texto para el contenido (después del header en blanco)
      doc.setTextColor(70, 70, 70);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      // Contenido con wrapping dentro del recuadro
  let contentY = termsY + 25; // espacio bajo el header (alineado con totales)
      wrappedTerms.forEach(lines => {
        doc.text(lines, termsX + textPaddingX, contentY);
        contentY += (lines.length * lineHeight) + 4; // espacio entre ítems
      });

      // Actualizar yPosition para contenido siguiente (hasta el fondo del recuadro)
  const boxBottomY = termsY + termsBoxHeight;
      yPosition = Math.max(yPosition, boxBottomY + 10);

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

      // Use custom FAQs if provided, otherwise use default ones
      const faqs = customFAQs && customFAQs.length > 0 ? customFAQs.map(faq => ({
        q: faq.question,
        a: faq.answer
      })) : [
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
      
      // === FOOTER MODERNO ===
      // Barra decorativa superior
      doc.setFillColor(...PDF_CONFIG.colors.primary);
      doc.rect(0, footerY, pageWidth, 3, 'F');
      
      // Fondo del footer
      doc.setFillColor(...PDF_CONFIG.colors.lightGray);
      doc.rect(0, footerY + 3, pageWidth, 37, 'F');
      
      // Mensaje de agradecimiento
      doc.setTextColor(...PDF_CONFIG.colors.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Gracias por considerar nuestra propuesta', 
                pageWidth / 2, footerY + 13, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setTextColor(...PDF_CONFIG.colors.darkGray);
      doc.text('Quedamos a su disposición para cualquier consulta o aclaración', 
                pageWidth / 2, footerY + 20, { align: 'center' });
      
      // Información de contacto
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_CONFIG.colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(`${companyInfo.email}  |  ${companyInfo.phone}`, 
                pageWidth / 2, footerY + 28, { align: 'center' });
      
      // Metadata del documento
      doc.setFontSize(7);
      doc.setTextColor(...PDF_CONFIG.colors.darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
                pageWidth / 2, footerY + 35, { align: 'center' });

      // Descargar con nombre profesional
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
    sendEmail: boolean = false,
    customFAQs?: Array<{ id: string; question: string; answer: string }>
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
      // Dibujar solo una barra de encabezado azul (para ahorrar tinta)
      const leftSectionWidth = (pageWidth - (margin * 2)) / 2;
      doc.setFillColor(51, 100, 199);  // Azul profesional para la barra del encabezado
      doc.rect(margin, yPosition, leftSectionWidth, 14, 'F');

      // Área principal en blanco con borde sutil
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition + 14, leftSectionWidth, 26, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.6);
      doc.rect(margin, yPosition, leftSectionWidth, 40, 'S');

      // Encabezado - texto blanco sobre la barra azul
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE COTIZACIÓN', margin + 8, yPosition + 10);

      // Datos de cotización con alineación consistente (texto en tinta oscura para ahorrar color)
      const quoteInfoData = [
        { label: 'N° Cotización:', value: quoteNumber, y: yPosition + 20 },
        { label: 'Fecha de Emisión:', value: quoteDate, y: yPosition + 28 },
        { label: 'Válida hasta:', value: validUntil, y: yPosition + 36 }
      ];

      const quoteLabelWidth = 35; // Reducido de 50 a 35 para menos espacio
      quoteInfoData.forEach(item => {
        // Etiqueta
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, margin + 10, item.y);

        // Valor alineado: usar gris oscuro / negro para ahorrar tinta (no azul claro)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(item.value, margin + 10 + quoteLabelWidth, item.y);
      });

      // === SECCIÓN DERECHA - ESTADO Y TIPO ===
      const clientInfo: { [key: string]: any } = submission.data;
      const rightX = margin + (pageWidth - (margin * 2)) / 2;
      
      // Estado: mantener diseño sobrio para ahorrar tinta
      doc.setFillColor(250, 250, 250);
      doc.rect(rightX, yPosition, (pageWidth - (margin * 2)) / 2, 40, 'F');

      doc.setTextColor(51, 51, 51);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO DE PROCESO', rightX + 10, yPosition + 12);

      // Datos de estado con colores neutros (evitar tonos azules grandes)
      const statusInfoData = [
        { label: 'Estado:', value: getStatusText(submission.status).toUpperCase(), y: yPosition + 22 },
        { label: 'Prioridad:', value: 'ALTA', y: yPosition + 30 }
      ];

      const statusLabelWidth = 30; // Ajustado para alineación
      statusInfoData.forEach(item => {
        // Etiqueta
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(item.label, rightX + 10, item.y);

        // Valor alineado: color oscuro (no azul) para ahorrar tinta
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(item.value, rightX + 10 + statusLabelWidth, item.y);
      });

  yPosition += 55;      // === DATOS DEL CLIENTE - ESTILO SIMPLE ===
  // Título simple
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PERFIL DEL CLIENTE', margin, yPosition);

  // Línea decorativa
  // doc.line(margin, yPosition + 3, margin + 80, yPosition + 3);

  yPosition += 15;
  yPosition += 15;

  // Marco principal del cliente: calcular altura dinámica para evitar desbordes
  const clientHeaderHeight = 18; // alto del encabezado azul reducido
  const minClientBoxHeight = 56;
  const centerX = pageWidth / 2;

  // Definir etiquetas y valores para columnas (sin y fijo)
  const leftColumnItems = [
    { label: 'Razon Social:', value: getCompanyName(clientInfo) },
    { label: 'Contacto:', value: getClientName(clientInfo, submission) },
    { label: 'Email:', value: clientInfo["2"] || clientInfo.email || submission.customerEmail || 'No especificado' },
    { label: 'Telefono:', value: getPhone(clientInfo, submission) }
  ];

  const rightColumnItems = [
    { label: 'Direccion:', value: getAddress(clientInfo) },
    { label: 'Sector:', value: getSector(clientInfo) }
  ];

  const clientLabelWidth = 25; // espacio para la etiqueta
  const rightLabelWidth = 20;
  const leftValueWidth = Math.max(80, Math.floor(centerX - (margin + 10 + clientLabelWidth) - 10));
  // Slightly more room for the right column and more compact text
  const rightValueWidth = Math.max(80, Math.floor(pageWidth - margin - centerX - 8 - rightLabelWidth - 15));

  // Calcular altura requerida para cada columna
  let leftHeight = 0;
  leftColumnItems.forEach(item => {
    const valueLines = doc.splitTextToSize(String(item.value || ''), leftValueWidth);
    leftHeight += Math.max(1, valueLines.length) * 8 + 6;
  });

  let rightHeight = 0;
  rightColumnItems.forEach(item => {
    const valueLines = doc.splitTextToSize(String(item.value || ''), rightValueWidth);
    rightHeight += Math.max(1, valueLines.length) * 8 + 6;
  });

  const clientBoxHeight = Math.max(minClientBoxHeight, Math.ceil(clientHeaderHeight + Math.max(leftHeight, rightHeight) + 8));

  // Dibujar el marco del cliente con fill blanco explícito
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, yPosition, pageWidth - (margin * 2), clientBoxHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPosition, pageWidth - (margin * 2), clientBoxHeight, 'S');

  // Línea divisoria vertical simple
  doc.line(centerX, yPosition, centerX, yPosition + clientBoxHeight);

  // === COLUMNA IZQUIERDA - ENCABEZADO ===
  doc.setFillColor(51, 100, 199);  // Azul profesional
  doc.rect(margin, yPosition, centerX - margin, clientHeaderHeight, 'F');

  doc.setTextColor(255, 255, 255);  // Texto blanco para fondo azul
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACION CORPORATIVA', margin + 10, yPosition + 11);

  // === COLUMNA DERECHA - ENCABEZADO Y FONDO ===
  doc.setFillColor(250, 250, 250);
  doc.rect(centerX, yPosition, pageWidth - margin - centerX, clientHeaderHeight, 'F');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES ADICIONALES', centerX + 10, yPosition + 11);

  // Posición base para el contenido en ambas columnas
  const initialClientY = yPosition + clientHeaderHeight + 6;

  // Dibujar columna izquierda (wrapping dinámico)
  let drawLeftY = initialClientY;
  doc.setFontSize(10);
  leftColumnItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(item.label, margin + 10, drawLeftY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 58, 138);
    const valueLines = doc.splitTextToSize(String(item.value || ''), leftValueWidth);
    doc.text(valueLines, margin + 10 + clientLabelWidth, drawLeftY);
    drawLeftY += Math.max(10, (valueLines.length * 8) + 4);
  });

  // Dibujar columna derecha (wrapping dinámico) para evitar desbordes largos en Dirección
  let drawRightY = initialClientY;
  const rightStartX = centerX + 10 + rightLabelWidth;
  rightColumnItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(item.label, centerX + 10, drawRightY);

    // Compact right column text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(9);
    const valueLines = doc.splitTextToSize(String(item.value || ''), rightValueWidth);
    doc.text(valueLines, rightStartX, drawRightY);
    drawRightY += Math.max(9, (valueLines.length * 7) + 3);
  });

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES ADICIONALES', centerX + 10, yPosition + 11);
      

  // Mover Y un poco más (altura del box + margen inferior)
  yPosition += clientBoxHeight + 14; // antes era 75

      // === NUEVA PÁGINA PARA PRODUCTOS ===
      doc.addPage();
        // addDecorativeBackground(doc, pageWidth, pageHeight); // Removido: solo página de totales tiene fondo
      yPosition = 30;

          // === HEADER SIMPLIFICADO EN SEGUNDA PÁGINA (COMPACTO) ===
          // Un único banda ligera en la parte superior y un divisor sutil
          doc.setFillColor(248, 249, 251);
          doc.rect(0, 0, pageWidth, 32, 'F');

          // Divisor sutil bajo el header
          doc.setFillColor(235, 235, 235);
          doc.rect(0, 32, pageWidth, 1, 'F');

          // Logo más pequeño y colocado más arriba para ahorrar espacio
          try {
            doc.addImage(logoToUse, 'PNG', margin, 8, 28, 18);
          } catch (error) {
            try {
              doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 28, 18);
            } catch (fallbackError) {
              console.log('Error adding logo to second page (compact header)');
            }
          }

          // Información de cotización alineada verticalmente con el logo
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(10);
          const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
          doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 45, 20);

          // Empezar el contenido de la página justo debajo del header compacto
          yPosition = 42;

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
        doc.text('CANT.', margin + 80, yPosition + 10, { align: 'center' });
        doc.text('PRECIO UNIT.', margin + 110, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', margin + 150, yPosition + 10, { align: 'center' });
            
            yPosition += tableHeaderHeight;
        
        // Procesar cada producto con altura dinámica
        productsWithImages.forEach((product, index) => {
          // Calcular altura necesaria para la fila
          let rowHeight = 25; // Altura base

          // Si hay imagen, aumentar altura base
          let imageHeight = 0;
          if (product.imageUrl && product.imageUrl.trim()) {
            imageHeight = 35;
            rowHeight = Math.max(rowHeight, imageHeight);
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
        doc.text('CANT.', margin + 80, yPosition + 10, { align: 'center' });
        doc.text('PRECIO UNIT.', margin + 110, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', margin + 150, yPosition + 10, { align: 'center' });
            
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

          // Calcular espacio disponible para texto basado en la X de la columna CANT.
          const quantityX = margin + 80;
          const paddingBetweenColumns = 6;
          const textAreaWidth = Math.max(40, quantityX - contentStartX - paddingBetweenColumns);

          // Nombre del producto y posible wrapping en hasta 2 líneas
          doc.setFontSize(10);
          const productNameLines = doc.splitTextToSize(product.name, textAreaWidth);
          const nameLinesToShow = productNameLines.slice(0, 2);
          const nameHeight = nameLinesToShow.length * 8;

          // Descripción (hasta 2 líneas adicionales)
          let descriptionLines: string[] = [];
          let descHeight = 0;
          if (product.description && product.description.trim()) {
            doc.setFontSize(8);
            const descMaxWidth = Math.max(30, quantityX - contentStartX - paddingBetweenColumns);
            descriptionLines = doc.splitTextToSize(product.description, descMaxWidth).slice(0, 2);
            descHeight = descriptionLines.length * 8 + (descriptionLines.length ? 4 : 0);
          }

          // Altura mínima necesaria para el contenido textual
          const textContentHeight = nameHeight + descHeight + 8; // padding interior
          rowHeight = Math.max(rowHeight, textContentHeight, imageHeight);

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

          // Texto del producto
          doc.setTextColor(31, 41, 55);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);

          // Dibujar nombre en hasta 2 líneas, desde la parte superior del área de contenido
          const textStartY = yPosition + 6;
          nameLinesToShow.forEach((line: string, idx: number) => {
            doc.text(line, contentStartX, textStartY + (idx * 8));
          });

          // Dibujar descripción debajo del nombre (si existe)
          if (descriptionLines.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            descriptionLines.forEach((line: string, idx: number) => {
              const descY = textStartY + (nameLinesToShow.length * 8) + 4 + (idx * 8);
              doc.text(line, contentStartX, descY);
            });
          }

          // Columnas alineadas - centradas verticalmente respecto a rowHeight
          doc.setFontSize(10);
          doc.setTextColor(31, 41, 55);
          doc.setFont('helvetica', 'normal');

          // Cantidad
          doc.text(product.quantity.toString(), margin + 80, centerY, { align: 'center' });

          // Precio unitario
          doc.text(formatPriceString(product.unitPrice || 'A cotizar'), margin + 110, centerY, { align: 'center' });

          // Total (en negrita)
          doc.setFont('helvetica', 'bold');
          doc.text(formatPriceString(product.total || 'A cotizar'), margin + 150, centerY, { align: 'center' });

          // Avanzar Y según altura calculada
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
            head: [['PRODUCTOS / SERVICIOS', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
            body: productsWithImages.map(product => { const nameWithDescription = product.description && product.description.trim() ? `${product.name}\n${product.description}` : product.name; return [nameWithDescription, product.quantity.toString(), formatPriceString(product.unitPrice || "A cotizar"), formatPriceString(product.total || "A cotizar")]; }), // Solo nombre, cantidad y total
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
              0: { cellWidth: 70, halign: "left", valign: "top", fontSize: 8, lineHeight: 1.2 },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
              3: { cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] }
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
        doc.text('CANT.', margin + 80, yPosition + 10, { align: 'center' });
        doc.text('PRECIO UNIT.', margin + 110, yPosition + 10, { align: 'center' });
        doc.text('TOTAL', margin + 150, yPosition + 10, { align: 'center' });
            
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
          doc.text(row[1], margin + 80, yPosition + 9, { align: 'center' }); // Cantidad
          doc.text(formatPriceString(row[2] || 'A cotizar'), margin + 110, yPosition + 9, { align: 'center' }); // Precio unitario
          doc.text(formatPriceString(row[3]), margin + 150, yPosition + 9, { align: 'center' }); // Total
          
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
  const termsCenterX2 = termsX + (termsWidth / 2);
  doc.text('TÉRMINOS Y CONDICIONES', termsCenterX2, termsY + 4, { align: 'center' });

      termsY += 20;

      doc.setTextColor(70, 70, 70);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Extraer tiempo de entrega de los datos de la cotización o usar valor por defecto
      const deliveryTime3 = submission.data?.deliveryTime || '7 días hábiles';

      const termsAndConditions3 = [
        '1. Condiciones de pago: Acuerdo con el cliente',
        `2. Tiempo de entrega: ${deliveryTime3}`,
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

      // Use custom FAQs if provided, otherwise use default ones
      const faqs = customFAQs && customFAQs.length > 0 ? customFAQs.map(faq => ({
        q: faq.question,
        a: faq.answer
      })) : [
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
  const termsCenterXNew = termsXNew + (termsWidthNew / 2);
  doc.text('TÉRMINOS Y CONDICIONES', termsCenterXNew, termsYNew + 4, { align: 'center' });

      termsYNew += 20;

      doc.setTextColor(70, 70, 70);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Extraer tiempo de entrega de los datos de la cotización o usar valor por defecto
      const deliveryTime4 = submission.data?.deliveryTime || '7 días hábiles';

      const termsAndConditions4 = [
        '1. Condiciones de pago: Acuerdo con el cliente',
        `2. Tiempo de entrega: ${deliveryTime4}`,
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
    companyInfo: CompanyInfo = defaultCompanyInfo,
    customFAQs?: Array<{ id: string; question: string; answer: string }>
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
              spacing: { after: 200 },
              alignment: AlignmentType.CENTER
            }),

            new Paragraph({
              text: `1. Condiciones de pago: Acuerdo con el cliente\n2. Tiempo de entrega: ${submission.data?.deliveryTime || '7 días hábiles'}\n3. Enviar cotización firmada al email indicado`,
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
    exportToPDF: (submission: QuoteSubmission, companyInfo?: CompanyInfo, customFAQs?: Array<{ id: string; question: string; answer: string }>) => 
      exportToPDF(submission, companyInfo, customFAQs),
    /** Export quote to PDF and optionally send via email */
    exportToPDFAndEmail: (submission: QuoteSubmission, companyInfo?: CompanyInfo, sendEmail?: boolean, customFAQs?: Array<{ id: string; question: string; answer: string }>) => 
      exportToPDFAndEmail(submission, companyInfo, sendEmail, customFAQs),
    /** Export quote to Word document format */
    exportToWord: (submission: QuoteSubmission, companyInfo?: CompanyInfo, customFAQs?: Array<{ id: string; question: string; answer: string }>) => 
      exportToWord(submission, companyInfo, customFAQs),
    /** Loading state indicator */
    loading
  };
};























