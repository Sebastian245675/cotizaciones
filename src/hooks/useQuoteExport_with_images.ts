import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { MIRG_LOGO_BASE64 } from '../assets/mirg-logo-base64';
import { MIRG_DECORATIVE_BASE64 } from '../assets/mirg-decorative-base64';

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

const defaultCompanyInfo: CompanyInfo = {
  name: 'MIRG - HECTOR ROLANDO RAMOS GARCIA',
  address: '4TA VIDRIERA #927 COL 1 DE MAYO EN MONTERREY, C.P. 64220. NUEVO LEON MEXICO',
  phone: '811-514-7756 / 811-796-7956',
  email: 'MIRGTALLER@GMAIL.COM',
  website: 'RFC: RAGH931025DP4'
};

// Función helper para agregar imagen decorativa de fondo
const addDecorativeBackground = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  try {
    // Calcular posición para centrar la imagen en la parte inferior
    const imageWidth = 120; // Ancho de la imagen decorativa
    const imageHeight = 90; // Alto de la imagen decorativa
    const x = (pageWidth - imageWidth) / 2; // Centrado horizontalmente
    const y = pageHeight - imageHeight - 30; // En la parte inferior con margen
    
    // Agregar imagen con opacidad reducida para que sea decorativa
    doc.addImage(MIRG_DECORATIVE_BASE64, 'PNG', x, y, imageWidth, imageHeight, '', 'FAST');
  } catch (error) {
    console.log('No se pudo cargar imagen decorativa de fondo');
  }
};

// Función helper para obtener el nombre del cliente
const getClientName = (clientInfo: any, submission: QuoteSubmission): string => {
  // Primero buscar en el campo "1" que es donde está el nombre del cliente
  if (clientInfo["1"] && clientInfo["1"].trim()) {
    const value = clientInfo["1"].trim();
    // Verificar que no sea un email
    if (!value.includes('@') && value.length > 1) {
      return value;
    }
  }
  
  // Buscar en diferentes campos posibles para el nombre como fallback
  const possibleNameFields = [
    'nombreCompleto',
    'nombre_completo', 
    'nombre',
    'name',
    'cliente',
    'client_name',
    'full_name',
    'contacto',
    'responsable'
  ];
  
  for (const field of possibleNameFields) {
    if (clientInfo[field] && clientInfo[field].trim()) {
      const value = clientInfo[field].trim();
      // Verificar que no sea un email
      if (!value.includes('@') && value.length > 1) {
        return value;
      }
    }
  }
  
  // Si no encuentra nombre válido, devolver "Cliente" (nunca email)
  return 'Cliente';
};

// Función helper para obtener la razón social/empresa
const getCompanyName = (clientInfo: any): string => {
  // Buscar en todos los campos por palabras clave relacionadas con empresa
  const possibleCompanyFields = [
    'empresa', 'razonSocial', 'razon_social', 'company', 'organization', 'organizacion'
  ];
  
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

      // === CONFIGURAR FUENTES PERSONALIZADAS ===
      // Nota: jsPDF soporta fuentes limitadas, pero podemos usar diferentes estilos y tamaños creativamente

      // === HEADER CORPORATIVO ULTRA PROFESIONAL ===
      // Gradiente de fondo superior en grises
      doc.setFillColor(70, 70, 70); // Gris muy oscuro
      doc.rect(0, 0, pageWidth, 8, 'F');
      
      doc.setFillColor(120, 120, 120); // Gris oscuro
      doc.rect(0, 8, pageWidth, 6, 'F');
      
      doc.setFillColor(180, 180, 180); // Gris medio
      doc.rect(0, 14, pageWidth, 4, 'F');
      
      doc.setFillColor(220, 220, 220); // Gris claro
      doc.rect(0, 18, pageWidth, 2, 'F');

      // Header principal con degradado visual
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 20, pageWidth, 55, 'F');
      
      // Sombra del header
      doc.setFillColor(226, 232, 240);
      doc.rect(0, 74, pageWidth, 2, 'F');
      
      // Buscar imagen/logo en los datos de la cotización
      let logoToUse = MIRG_LOGO_BASE64;
      const submittedImages = Object.entries(submission.data).find(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image/')
      );
      
      if (submittedImages && submittedImages[1]) {
        logoToUse = submittedImages[1] as string;
      }
      
      // Marco decorativo para el logo
      doc.setFillColor(255, 255, 255);
      doc.rect(margin - 2, 25, 42, 26, 'F');
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1);
      doc.rect(margin - 2, 25, 42, 26, 'S');
      
      // Agregar logo MIRG oficial
      try {
        doc.addImage(logoToUse, 'PNG', margin, 27, 38, 22);
      } catch (error) {
        console.log('Error adding logo:', error);
        // Intentar con logo MIRG oficial si falla
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 27, 38, 22);
        } catch (fallbackError) {
          console.log('Error adding MIRG logo:', fallbackError);
        }
      }
      
      // TÍTULO DE LA EMPRESA - ULTRA ESTILIZADO
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('MIRG', margin + 50, 35);
      
      // Línea decorativa bajo el nombre
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(3);
      doc.line(margin + 50, 37, margin + 110, 37);
      
      // Texto descriptivo debajo de la línea azul (más pequeño)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('HECTOR ROLANDO RAMOS GARCIA - MIRG', margin + 50, 43);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Maquinados Industriales de Precision', margin + 50, 47);

      // INFORMACIÓN DE CONTACTO - ESTILO MODERNO (más a la derecha)
      const contactX = pageWidth - margin - 50; // Posición del contacto
      
      // Fondo para info de contacto
      doc.setFillColor(120, 120, 120); // Gris oscuro
      doc.rect(contactX - 2, 26, 52, 22, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTACTO', contactX, 31);
      
      // Información de contacto con formato mejorado
      const contactInfo = [
        { label: 'Email:', value: companyInfo.email.substring(0, 15) + '...', y: 34 },
        { label: 'Tel:', value: companyInfo.phone.substring(0, 12), y: 37 },
        { label: 'Dir:', value: companyInfo.address.substring(0, 18) + '...', y: 40 },
        { label: 'RFC:', value: companyInfo.website || 'RAGH931025DP4', y: 43 }
      ];
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      contactInfo.forEach(info => {
        // Usar concatenación simple para evitar problemas con +
        doc.text(info.label + ' ' + info.value, contactX, info.y);
      });

      yPosition = 85;

      // === TÍTULO PRINCIPAL ESPECTACULAR ===
      // Fondo degradado para el título
      doc.setFillColor(60, 60, 60); // Gris muy oscuro
      doc.rect(margin - 5, yPosition - 5, pageWidth - (margin * 2) + 10, 25, 'F');
      
      doc.setFillColor(120, 120, 120); // Gris oscuro
      doc.rect(margin - 3, yPosition - 3, pageWidth - (margin * 2) + 6, 21, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      
      // Texto con efecto de sombra
      doc.setTextColor(100, 116, 139);
      doc.text('COTIZACIÓN COMERCIAL', margin + 2, yPosition + 12);
      
      doc.setTextColor(255, 255, 255);
      doc.text('COTIZACIÓN COMERCIAL', margin, yPosition + 10);
      
      // Decoración adicional
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(2);
      doc.line(margin, yPosition + 15, pageWidth - margin, yPosition + 15);
      
      yPosition += 30;

      // === INFORMACIÓN DE LA COTIZACIÓN - DISEÑO PREMIUM ===
      const quoteDate = new Date().toLocaleDateString('es-ES');
      const validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-ES');
      const quoteNumber = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;

      // Marco principal con sombra
      doc.setFillColor(226, 232, 240);
      doc.rect(margin - 2, yPosition + 2, pageWidth - (margin * 2) + 4, 42, 'F');
      
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'F');
      
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(2);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 40, 'S');

      // Sección izquierda - Info de cotización
      // === SECCIÓN IZQUIERDA - INFORMACIÓN DE COTIZACIÓN ===
      doc.setFillColor(220, 220, 220); // Gris claro
      doc.rect(margin, yPosition, (pageWidth - (margin * 2)) / 2, 40, 'F');
      
      doc.setTextColor(60, 60, 60); // Texto gris oscuro
      doc.setFontSize(12);
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
        doc.setTextColor(255, 255, 255);
        doc.text(item.label, margin + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 197, 253);
        doc.text(item.value, margin + 10 + quoteLabelWidth, item.y);
      });

      // === SECCIÓN DERECHA - ESTADO Y TIPO ===
      const clientInfo: { [key: string]: any } = submission.data;
      const rightX = margin + (pageWidth - (margin * 2)) / 2;
      
      doc.setFillColor(147, 197, 253);
      doc.rect(rightX, yPosition, (pageWidth - (margin * 2)) / 2, 40, 'F');
      
      doc.setTextColor(15, 23, 42);
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
        doc.setTextColor(15, 23, 42);
        doc.text(item.label, rightX + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(item.value, rightX + 10 + statusLabelWidth, item.y);
      });

      yPosition += 55;      // === DATOS DEL CLIENTE - ESTILO VIP ===
      // Título con icono
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PERFIL DEL CLIENTE', margin, yPosition);
      
      // Línea decorativa
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(3);
      doc.line(margin, yPosition + 3, margin + 80, yPosition + 3);
      
      yPosition += 15;

      // Marco principal del cliente con efecto premium
      doc.setFillColor(226, 232, 240);
      doc.rect(margin - 3, yPosition + 3, pageWidth - (margin * 2) + 6, 68, 'F');
      
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 65, 'F');
      
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(2);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 65, 'S');

      // Línea divisoria vertical estilizada
      const centerX = pageWidth / 2;
      doc.setDrawColor(180, 180, 180); // Línea gris
      doc.setLineWidth(1);
      doc.line(centerX, yPosition, centerX, yPosition + 65);

      // === COLUMNA IZQUIERDA - DATOS PRINCIPALES ===
      doc.setFillColor(250, 250, 250); // Gris muy claro
      doc.rect(margin, yPosition, centerX - margin, 25, 'F');
      
      doc.setTextColor(60, 60, 60); // Texto gris oscuro
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACION CORPORATIVA', margin + 10, yPosition + 12);

      let clientY = yPosition + 32;
      doc.setTextColor(15, 23, 42);
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
      const labelWidth = 25; // Reducido de 35 a 25 para menos espacio
      leftColumnLabels.forEach(item => {
        // Etiqueta
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(item.label, margin + 10, item.y);
        
        // Valor alineado
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        
        // Manejo especial para email largo
        if (item.label === 'Email:') {
          const emailText = doc.splitTextToSize(item.value, centerX - (margin + 10 + labelWidth) - 5);
          doc.text(emailText, margin + 10 + labelWidth, item.y);
        } else {
          doc.text(item.value, margin + 10 + labelWidth, item.y);
        }
      });

      // === COLUMNA DERECHA - DATOS ADICIONALES ===
      doc.setFillColor(147, 197, 253);
      doc.rect(centerX, yPosition, pageWidth - margin - centerX, 25, 'F');
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
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
        doc.setTextColor(15, 23, 42);
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
      addDecorativeBackground(doc, pageWidth, pageHeight);
      
      yPosition = 20;

      // Header estilizado para segunda página
      doc.setFillColor(70, 70, 70); // Gris muy oscuro
      doc.rect(0, 0, pageWidth, 8, 'F');
      
      doc.setFillColor(120, 120, 120); // Gris oscuro
      doc.rect(0, 8, pageWidth, 6, 'F');
      
      doc.setFillColor(180, 180, 180); // Gris medio
      doc.rect(0, 14, pageWidth, 4, 'F');
      
      doc.setFillColor(220, 220, 220); // Gris claro
      doc.rect(0, 18, pageWidth, 2, 'F');
      
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 20, pageWidth, 25, 'F');
      
      // Logo pequeño con marco
      doc.setFillColor(255, 255, 255);
      doc.rect(margin - 1, 23, 22, 16, 'F');
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1);
      doc.rect(margin - 1, 23, 22, 16, 'S');
      
      try {
        doc.addImage(logoToUse, 'PNG', margin, 24, 20, 14);
      } catch (error) {
        console.log('Error adding logo to second page:', error);
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 24, 20, 14);
        } catch (fallbackError) {
          console.log('Error adding MIRG logo to second page:', fallbackError);
        }
      }
      
      // Título de la empresa en segunda página
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MIRG', margin + 25, 30);
      
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
      doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 60, 30);

      yPosition = 55;

      // === TÍTULO DE PRODUCTOS - DISEÑO IMPACTANTE ===
      // Fondo degradado para el título
      doc.setFillColor(15, 23, 42);
      doc.rect(margin - 5, yPosition - 5, pageWidth - (margin * 2) + 10, 22, 'F');
      
      doc.setFillColor(120, 120, 120); // Gris oscuro
      doc.rect(margin - 3, yPosition - 3, pageWidth - (margin * 2) + 6, 18, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PRODUCTOS Y SERVICIOS', margin, yPosition + 8);
      
      // Decoración
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(2);
      doc.line(margin, yPosition + 12, pageWidth - margin, yPosition + 12);
      
      yPosition += 25;

      // Generar productos basados en los datos reales del formulario del cliente
      let productData: string[][] = [];
      let subtotalAmount = 0;
      
      // Extraer los productos/servicios específicos que el cliente seleccionó
      const selectedProducts: string[][] = [];
      let foundProducts = false;
      
      // VERIFICAR SI HAY DATOS DE RESPUESTA CON PRECIOS
      const hasResponseData = (submission as any).responseData && (submission as any).responseData.products;
      console.log('¿Tiene datos de respuesta?', hasResponseData);
      
      if (hasResponseData) {
        console.log('=== USANDO DATOS DE RESPUESTA CON PRECIOS ===');
        const responseProducts = (submission as any).responseData.products;
        
        responseProducts.forEach((product: any) => {
          const unitPrice = product.unitPrice || 'A cotizar';
          const total = product.total || 'A cotizar';
          
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
      console.log('Client data keys:', Object.keys(clientInfo));
      
      // No calculamos subtotal automáticamente ya que son cotizaciones
      subtotalAmount = 0;

      // Tabla de productos con autoTable - ESTILO PREMIUM
      let tableSuccessful = false;
      try {
        (doc as any).autoTable({
          startY: yPosition,
          head: [['PRODUCTOS / SERVICIOS', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
          body: productData,
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
            0: { cellWidth: 85, halign: 'left' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          margin: { left: margin, right: margin },
          styles: {
            overflow: 'linebreak',
            cellWidth: 'wrap'
          }
        });

        yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : yPosition + 120;
        tableSuccessful = true;

      } catch (tableError) {
        console.warn('AutoTable failed, creating manual table:', tableError);
        
        // TABLA MANUAL como respaldo
        // Header de la tabla
        doc.setFillColor(41, 98, 255);
        const tableHeaderHeight = 15;
        doc.rect(margin, yPosition, pageWidth - (margin * 2), tableHeaderHeight, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTOS / SERVICIOS', margin + 5, yPosition + 10);
        doc.text('CANT.', margin + 95, yPosition + 10, { align: 'center' });
        doc.text('PRECIO UNIT.', margin + 125, yPosition + 10, { align: 'center' });
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
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
          // Limitar texto del producto si es muy largo
          const productName = doc.splitTextToSize(row[0], 85);
          doc.text(productName[0] + (productName.length > 1 ? '...' : ''), margin + 3, yPosition + 9);
          doc.text(row[1], margin + 95, yPosition + 9, { align: 'center' }); // Cantidad
          doc.text(row[2], margin + 125, yPosition + 9, { align: 'center' }); // Precio
          doc.text(row[3], pageWidth - margin - 3, yPosition + 9, { align: 'right' }); // Total
          
          yPosition += rowHeight;
        });
        
        // Borde final de la tabla
        doc.setDrawColor(41, 98, 255);
        doc.setLineWidth(2);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        
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
      if (yPosition + totalsHeight > pageHeight - 50) {
        doc.addPage();
        
        // Agregar imagen decorativa de fondo en página de totales
        addDecorativeBackground(doc, pageWidth, pageHeight);
        
        yPosition = 20;
        
        // Mini header para página de totales
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN FINANCIERA', margin, 22);
        
        yPosition = 55;
      }

      // === DISEÑO IMPACTANTE PARA TOTALES ===
      // Fondo con gradiente para el título
      doc.setFillColor(30, 58, 138);
      doc.rect(totalsX - 10, yPosition - 8, totalsWidth + 20, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(hasRealPrices ? 'RESUMEN TOTAL' : 'INFORMACIÓN', totalsX + 15, yPosition + 8);
      
      yPosition += 25;

      // Marco principal para totales con sombra
      doc.setFillColor(226, 232, 240);
      doc.rect(totalsX - 3, yPosition + 2, totalsWidth + 6, totalsHeight + 4, 'F');
      
      doc.setFillColor(255, 255, 255);
      doc.rect(totalsX, yPosition, totalsWidth, totalsHeight, 'F');
      
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(2);
      doc.rect(totalsX, yPosition, totalsWidth, totalsHeight, 'S');

      let totalsY = yPosition + 20;

      if (hasRealPrices) {
        // === CÁLCULOS TRADICIONALES ===
        const iva = subtotalAmount * 0.21;
        const totalImpuestos = iva;
        const total = subtotalAmount + totalImpuestos;

        // === SUBTOTAL ===
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(`$${subtotalAmount.toLocaleString('es-AR')}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 18;

        // === IVA ===
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.text('IVA (21%):', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(`$${iva.toLocaleString('es-AR')}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 18;

        // === TOTAL DE IMPUESTOS ===
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.text('Tot. Impuestos:', totalsX + 10, totalsY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(`$${totalImpuestos.toLocaleString('es-AR')}`, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
        
        totalsY += 20;

        // Línea decorativa antes del total
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(3);
        doc.line(totalsX + 10, totalsY, totalsX + totalsWidth - 10, totalsY);
        
        totalsY += 15;

        // === TOTAL FINAL DESTACADO ===
        // Fondo para el total
        doc.setFillColor(15, 23, 42);
        doc.rect(totalsX + 5, totalsY - 8, totalsWidth - 10, 20, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX + 10, totalsY + 3);
        
        doc.setFontSize(15);
        doc.setTextColor(147, 197, 253);
        doc.text(`$${total.toLocaleString('es-AR')}`, totalsX + totalsWidth - 10, totalsY + 3, { align: 'right' });
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
        const validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-ES');
        doc.text(validUntil, totalsX + totalsWidth - 10, totalsY, { align: 'right' });
      }

      yPosition += totalsHeight + 30;

      // === DESCRIPCIÓN DEL PROYECTO ===
      if (clientInfo.descripcionDelProyecto && clientInfo.descripcionDelProyecto.trim()) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          
          // Agregar imagen decorativa de fondo en página de descripción
          addDecorativeBackground(doc, pageWidth, pageHeight);
          
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
        addDecorativeBackground(doc, pageWidth, pageHeight);
        
        yPosition = margin;
        
        // Header minimalista para nueva página
        doc.setFillColor(248, 249, 251);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        // Logo pequeño
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 20, 15);
        } catch (error) {
          console.log('Error adding MIRG logo to FAQ page:', error);
        }
        
        doc.setTextColor(41, 98, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('MIRG', margin + 25, 18);
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
        doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 60, 18);
        
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
          addDecorativeBackground(doc, pageWidth, pageHeight);
          
          yPosition = margin;
          
          // Header minimalista para nueva página
          doc.setFillColor(248, 249, 251);
          doc.rect(0, 0, pageWidth, 35, 'F');
          
          try {
            doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 20, 15);
          } catch (error) {
            console.log('Error adding MIRG logo to FAQ continuation page:', error);
          }
          
          doc.setTextColor(41, 98, 255);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('MIRG', margin + 25, 18);
          
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          const quoteNumberDisplay = submission.trackingCode || `COT-${submission.id.substring(0, 8).toUpperCase()}`;
          doc.text(`Cotización: ${quoteNumberDisplay}`, pageWidth - margin - 60, 18);
          
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
        addDecorativeBackground(doc, pageWidth, pageHeight);
        
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
      // Usar la misma lógica de exportToPDF pero capturar el PDF en base64
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // === HEADER CORPORATIVO ULTRA PROFESIONAL ===
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 8, 'F');
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 8, pageWidth, 6, 'F');
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 14, pageWidth, 4, 'F');
      doc.setFillColor(147, 197, 253);
      doc.rect(0, 18, pageWidth, 2, 'F');

      yPosition = 35;

      // === LOGO Y TÍTULO PRINCIPAL ===
      try {
        doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, yPosition - 10, 30, 30);
      } catch (logoError) {
        console.warn('Error al cargar logo:', logoError);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(15, 23, 42);
      doc.text('COTIZACIÓN PROFESIONAL', pageWidth - margin, yPosition, { align: 'right' });

      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text('Propuesta Comercial Detallada', pageWidth - margin, yPosition + 8, { align: 'right' });

      yPosition += 45;

      // === INFORMACIÓN DE LA EMPRESA ===
      const companyBoxY = yPosition;
      const companyBoxHeight = 40;
      
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, companyBoxY, pageWidth - 2 * margin, companyBoxHeight, 'F');
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, companyBoxY, 4, companyBoxHeight, 'F');
      doc.setFillColor(147, 197, 253);
      doc.rect(margin + 4, companyBoxY, pageWidth - 2 * margin - 4, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(companyInfo.name, margin + 10, companyBoxY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      
      const addressLines = doc.splitTextToSize(companyInfo.address, 100);
      let addressY = companyBoxY + 18;
      addressLines.forEach((line: string) => {
        doc.text(line, margin + 10, addressY);
        addressY += 4;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(59, 130, 246);
      
      const contactStartX = pageWidth - margin - 85;
      doc.text('📧 ' + companyInfo.email, contactStartX, companyBoxY + 10);
      doc.text('📞 ' + companyInfo.phone, contactStartX, companyBoxY + 18);
      if (companyInfo.website) {
        doc.text('🌐 ' + companyInfo.website, contactStartX, companyBoxY + 26);
      }

      yPosition = companyBoxY + companyBoxHeight + 20;

      // === INFORMACIÓN DEL CLIENTE ===
      const clientInfo = submission.data || {};
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('INFORMACIÓN DEL CLIENTE', margin, yPosition);
      
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, yPosition + 3, 60, 1, 'F');

      yPosition += 15;

      const clientBoxHeight = 35;
      doc.setFillColor(254, 249, 195);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, clientBoxHeight, 'F');
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, clientBoxHeight);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(69, 26, 3);

      const col1X = margin + 8;
      const col2X = pageWidth / 2 + 10;
      let infoY = yPosition + 10;

      if (clientInfo.name) {
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente:', col1X, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(clientInfo.name, col1X + 25, infoY);
        infoY += 6;
      }

      if (clientInfo.email) {
        doc.setFont('helvetica', 'bold');
        doc.text('Email:', col1X, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(clientInfo.email, col1X + 25, infoY);
        infoY += 6;
      }

      if (clientInfo.phone) {
        doc.setFont('helvetica', 'bold');
        doc.text('Teléfono:', col1X, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(clientInfo.phone, col1X + 25, infoY);
      }

      infoY = yPosition + 10;
      if (clientInfo.company) {
        doc.setFont('helvetica', 'bold');
        doc.text('Empresa:', col2X, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(clientInfo.company, col2X + 25, infoY);
        infoY += 6;
      }

      if (clientInfo.address) {
        doc.setFont('helvetica', 'bold');
        doc.text('Dirección:', col2X, infoY);
        doc.setFont('helvetica', 'normal');
        const addressText = clientInfo.address.length > 30 ? 
          clientInfo.address.substring(0, 30) + '...' : clientInfo.address;
        doc.text(addressText, col2X + 25, infoY);
      }

      yPosition += clientBoxHeight + 20;

      // === DETALLES DE LA COTIZACIÓN ===
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('DETALLE DE PRODUCTOS Y SERVICIOS', margin, yPosition);
      
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, yPosition + 3, 85, 1, 'F');

      yPosition += 20;

      // === TABLA DE PRODUCTOS ===
      const products = submission.responseData?.products || [];
      
      if (products.length > 0) {
        const tableStartY = yPosition;
        const headerHeight = 12;
        
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, tableStartY, pageWidth - 2 * margin, headerHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);

        const colWidths = {
          description: 80,
          quantity: 25,
          unitPrice: 30,
          total: 35
        };

        let currentX = margin + 5;
        doc.text('DESCRIPCIÓN', currentX, tableStartY + 8);
        currentX += colWidths.description;
        doc.text('CANT.', currentX, tableStartY + 8);
        currentX += colWidths.quantity;
        doc.text('P. UNITARIO', currentX, tableStartY + 8);
        currentX += colWidths.unitPrice;
        doc.text('TOTAL', currentX, tableStartY + 8);

        yPosition = tableStartY + headerHeight;

        let totalGeneral = 0;
        products.forEach((product, index) => {
          const rowHeight = 15;
          
          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(31, 41, 55);

          currentX = margin + 5;
          
          const description = product.name || 'Producto sin nombre';
          const descLines = doc.splitTextToSize(description, colWidths.description - 5);
          let descY = yPosition + 6;
          descLines.slice(0, 2).forEach((line: string) => {
            doc.text(line, currentX, descY);
            descY += 4;
          });

          currentX += colWidths.description;
          doc.text(product.quantity.toString(), currentX + 8, yPosition + 6, { align: 'center' });

          currentX += colWidths.quantity;
          const unitPrice = typeof product.unitPrice === 'string' ? 
            product.unitPrice : `$${product.unitPrice}`;
          doc.text(unitPrice, currentX + 12, yPosition + 6, { align: 'center' });

          currentX += colWidths.unitPrice;
          const totalPrice = typeof product.total === 'string' ? 
            product.total : `$${product.total}`;
          doc.text(totalPrice, currentX + 15, yPosition + 6, { align: 'center' });

          const numericTotal = parseFloat(product.total.toString().replace(/[^0-9.]/g, ''));
          if (!isNaN(numericTotal)) {
            totalGeneral += numericTotal;
          }

          yPosition += rowHeight;

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
        });

        // === TOTALES FINALES ===
        yPosition += 10;
        
        const totalsBoxHeight = 35;
        const totalsBoxX = pageWidth - margin - 80;
        
        doc.setFillColor(240, 253, 244);
        doc.rect(totalsBoxX, yPosition, 80, totalsBoxHeight, 'F');
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(1);
        doc.rect(totalsBoxX, yPosition, 80, totalsBoxHeight);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(22, 101, 52);
        doc.text('Subtotal:', totalsBoxX + 5, yPosition + 10);
        doc.text(`$${totalGeneral.toFixed(2)}`, totalsBoxX + 75, yPosition + 10, { align: 'right' });

        const iva = totalGeneral * 0.16;
        doc.text('IVA (16%):', totalsBoxX + 5, yPosition + 18);
        doc.text(`$${iva.toFixed(2)}`, totalsBoxX + 75, yPosition + 18, { align: 'right' });

        const totalFinal = totalGeneral + iva;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('TOTAL:', totalsBoxX + 5, yPosition + 28);
        doc.text(`$${totalFinal.toFixed(2)}`, totalsBoxX + 75, yPosition + 28, { align: 'right' });

        yPosition += totalsBoxHeight + 20;
      }

      // === INFORMACIÓN ADICIONAL ===
      if (clientInfo.description) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('DESCRIPCIÓN DEL PROYECTO', margin, yPosition);
        
        doc.setFillColor(59, 130, 246);
        doc.rect(margin, yPosition + 3, 70, 1, 'F');
        
        yPosition += 15;
        
        const descLines = doc.splitTextToSize(clientInfo.description, pageWidth - 2 * margin - 10);
        const descHeight = Math.max(20, descLines.length * 5 + 10);
        
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, descHeight, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, descHeight);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        
        let descY = yPosition + 8;
        descLines.forEach((line: string) => {
          doc.text(line, margin + 5, descY);
          descY += 5;
        });
        
        yPosition += descHeight + 15;
      }

      // === TÉRMINOS Y CONDICIONES ===
      const termsY = Math.max(yPosition, pageHeight - 60);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text('TÉRMINOS Y CONDICIONES', margin, termsY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      
      const terms = [
        '• Precios válidos por 30 días a partir de la fecha de emisión.',
        '• Los precios incluyen IVA.',
        '• Tiempo de entrega sujeto a confirmación.',
        '• Se requiere anticipo del 50% para iniciar el proyecto.',
        '• El saldo restante se pagará contra entrega.',
        '• Esta cotización no constituye una factura.'
      ];
      
      let termY = termsY + 8;
      terms.forEach(term => {
        doc.text(term, margin + 5, termY);
        termY += 4;
      });

      // === IMAGEN DECORATIVA DE FONDO ===
      addDecorativeBackground(doc, pageWidth, pageHeight);

      // === PIE DE PÁGINA PROFESIONAL ===
      const footerY = pageHeight - 25;
      
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      
      const quoteId = `COT-${submission.id.substring(0, 8).toUpperCase()}`;
      doc.text(`ID: ${quoteId}`, margin, footerY + 8);
      doc.text(`Página 1 de 1`, pageWidth / 2, footerY + 8, { align: 'center' });
      doc.text(`${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, footerY + 8, { align: 'right' });
      
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES')}`,
                pageWidth / 2, footerY + 16, { align: 'center' });

      // Generar el PDF como string base64
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Descargar el archivo
      const getServiceType = (clientData: any) => {
        if (clientData.company) return clientData.company.replace(/\s+/g, '_');
        if (clientData.name) return clientData.name.replace(/\s+/g, '_');
        return 'Cliente';
      };
      
      const filename = `Cotizacion_${getServiceType(clientInfo)}_${submission.id.substring(0, 8)}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
      doc.save(filename);
      
      // Si se requiere envío por correo
      if (sendEmail) {
        console.log('📧 Datos del cliente para email:', JSON.stringify(clientInfo, null, 2));
        
        // Buscar email en los diferentes campos posibles
        let email = '';
        let name = '';
        
        // Buscar email en campos numerados o nombrados
        for (const [key, value] of Object.entries(clientInfo)) {
          const lowerValue = String(value).toLowerCase();
          if (lowerValue.includes('@') && lowerValue.includes('.')) {
            email = String(value).trim();
            console.log('📧 Email encontrado en campo', key, ':', email);
            break;
          }
        }
        
        // Obtener nombre usando la función existente
        name = getClientName(clientInfo, submission);
        
        console.log('📧 Email a usar:', email);
        console.log('📧 Nombre a usar:', name);
        
        if (email && name) {
          const { EmailService } = await import('../lib/email-service');
          
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
            filename
          };
        } else {
          console.log('❌ Falta email o nombre para envío');
          return {
            success: true,
            emailSent: false,
            emailMessage: `Falta información: email=${email}, nombre=${name}`,
            filename
          };
        }
      }
      
      return { success: true, emailSent: false, filename };
      
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

  return {
    exportToPDF,
    exportToPDFAndEmail,
    exportToWord,
    loading
  };
};
