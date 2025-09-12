import { doc, updateDoc, getDoc, increment, collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, limit, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// Estructura de datos para el análisis de productos
export interface ProductView {
  productId: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  userEmail?: string;
  userName?: string;
  isAnonymous: boolean;
  date: string;
  time: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  isMobile?: boolean;
}

// Interfaz para detalles de visitantes
export interface Visitor {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  isAnonymous?: boolean;
  lastSeen?: Date | string;
  totalVisits: number;
  firstVisit: Date | string;
  visits?: Array<{
    timestamp: Date;
    date: string;
    time: string;
    deviceInfo?: DeviceInfo;
  }>;
  deviceInfo?: DeviceInfo;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

// Interfaz para vistas de productos con detalle de visitantes
export interface ViewEvent {
  id: string;
  timestamp: Date | string;
  userId: string;
  displayName?: string;
  email?: string;
  duration?: number; // en segundos
  source?: string; // de dónde vino (referrer)
  deviceType?: string;
  location?: string;
}

export interface ProductAnalytics {
  id: string;
  productId: string;
  productName: string;
  totalViews: number;
  lastViewed: Date;
  viewsByDay?: Record<string, number>;
  category?: string;
  // Nuevos campos para análisis avanzado
  uniqueVisitors?: number;
  returningVisitors?: number;
  averageDuration?: number; // tiempo promedio en el producto
  conversionRate?: number; // porcentaje de vistas que resultaron en compra
  visitors?: Visitor[]; // detalles de los visitantes
  viewEvents?: ViewEvent[]; // historial detallado de vistas
}

// Registra una vista de producto
export const recordProductView = async (
  productId: string, 
  productName: string,
  userId?: string,
  userEmail?: string | null,
  userName?: string | null
) => {
  try {
    console.log(`[recordProductView] Registrando vista para producto: ${productId} - ${productName}`);
    console.log(`[recordProductView] Datos usuario: ID=${userId || 'anónimo'}, Email=${userEmail || 'N/A'}, Nombre=${userName || 'N/A'}`);
    
    // Generamos un ID de sesión si no hay usuario autenticado
    const sessionId = userId || `anon_${Math.random().toString(36).substring(2, 15)}`;
    const isAnonymous = !userId;
    
    // Obtener información del navegador y dispositivo del cliente
    const userAgent = window.navigator.userAgent;
    const deviceInfo = {
      browser: getBrowserInfo(userAgent),
      os: getOSInfo(userAgent),
      isMobile: /Mobi|Android/i.test(userAgent),
      device: /Mobi|Android/i.test(userAgent) ? 'Mobile' : 'Desktop'
    };
    
    // 1. Primero actualizamos el contador general de vistas del producto
    const productAnalyticsRef = doc(db, "productAnalytics", productId);
    const productAnalyticsDoc = await getDoc(productAnalyticsRef);
    
    // Formato de fecha YYYY-MM-DD para agrupar vistas por día
    const today = new Date().toISOString().split('T')[0];
    // Hora actual en formato legible
    const currentTime = new Date().toLocaleTimeString();
    
    // Usar un timestamp explícito para todas las operaciones
    const timestamp = serverTimestamp();
    
    console.log(`[recordProductView] Fecha actual: ${today}, Hora: ${currentTime}`);
    
    if (productAnalyticsDoc.exists()) {
      console.log(`[recordProductView] Actualizando documento existente`);
      // Actualizamos el documento existente
      const viewsByDay = productAnalyticsDoc.data().viewsByDay || {};
      viewsByDay[today] = (viewsByDay[today] || 0) + 1;
      
      await updateDoc(productAnalyticsRef, {
        totalViews: increment(1),
        lastViewed: timestamp,
        viewsByDay: viewsByDay,
        productName: productName // Por si cambió el nombre del producto
      });
    } else {
      console.log(`[recordProductView] Creando nuevo documento de analytics`);
      // Creamos un nuevo documento de analytics para este producto
      const viewsByDay: Record<string, number> = {};
      viewsByDay[today] = 1;
      
      await setDoc(productAnalyticsRef, {
        productId,
        productName,
        totalViews: 1,
        lastViewed: timestamp,
        viewsByDay,
        createdAt: timestamp
      });
    }
    
    // 2. Registramos la vista individual con información detallada del usuario (para análisis detallado)
    console.log(`[recordProductView] Registrando vista individual en productViews`);
    const viewDocRef = await addDoc(collection(db, "productViews"), {
      productId,
      productName,
      userId,
      userEmail,
      userName,
      isAnonymous,
      sessionId,
      deviceInfo,
      date: today,
      time: currentTime,
      timestamp: timestamp
    });
    
    console.log(`[recordProductView] Vista registrada correctamente con ID: ${viewDocRef.id}`);
    return true;
  } catch (error) {
    console.error("[recordProductView] Error al registrar vista de producto:", error);
    return false;
  }
};

// Función auxiliar para obtener información del navegador
function getBrowserInfo(userAgent: string): string {
  if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
  else if (userAgent.indexOf('SamsungBrowser') > -1) return 'Samsung';
  else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) return 'Opera';
  else if (userAgent.indexOf('Trident') > -1) return 'IE';
  else if (userAgent.indexOf('Edge') > -1) return 'Edge';
  else if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
  else if (userAgent.indexOf('Safari') > -1) return 'Safari';
  else return 'Unknown';
}

// Función auxiliar para obtener información del sistema operativo
function getOSInfo(userAgent: string): string {
  if (userAgent.indexOf('Windows NT 10.0') > -1) return 'Windows 10';
  else if (userAgent.indexOf('Windows NT 6.3') > -1) return 'Windows 8.1';
  else if (userAgent.indexOf('Windows NT 6.2') > -1) return 'Windows 8';
  else if (userAgent.indexOf('Windows NT 6.1') > -1) return 'Windows 7';
  else if (userAgent.indexOf('Windows NT 6.0') > -1) return 'Windows Vista';
  else if (userAgent.indexOf('Windows NT 5.1') > -1) return 'Windows XP';
  else if (userAgent.indexOf('Windows NT') > -1) return 'Windows';
  else if (userAgent.indexOf('Mac') > -1) return 'MacOS';
  else if (userAgent.indexOf('Android') > -1) return 'Android';
  else if (userAgent.indexOf('iOS') > -1 || /iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  else if (userAgent.indexOf('Linux') > -1) return 'Linux';
  else return 'Unknown';
}

// Obtiene los visitantes detallados de un producto específico
export const getProductVisitors = async (productId: string, startDate?: Date, endDate?: Date) => {
  try {
    // Verificar que tenemos un ID de producto válido
    if (!productId) {
      console.log("Error: No se proporcionó un ID de producto válido");
      return [];
    }
    
    console.log(`Obteniendo visitantes para producto: ${productId}`);
    console.log(`Fechas recibidas - Inicio: ${startDate?.toISOString() || 'No definida'}, Fin: ${endDate?.toISOString() || 'No definida'}`);
    
    // DIAGNÓSTICO: Primero verificar si hay registros sin filtros de fecha
    const diagnosticQuery = query(
      collection(db, "productViews"),
      where("productId", "==", productId),
      limit(5)
    );
    const diagnosticSnapshot = await getDocs(diagnosticQuery);
    
    console.log(`DIAGNÓSTICO: Encontrados ${diagnosticSnapshot.size} registros sin filtro de fecha`);
    diagnosticSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Registro: ID=${doc.id}, timestamp=${data.timestamp instanceof Timestamp ? 
        `Timestamp(${data.timestamp.seconds}, ${data.timestamp.nanoseconds})` : 
        'No es Timestamp'}, fecha=${data.date}, hora=${data.time}`);
    });

    // Asegurar que la fecha final incluya todo el día
    let adjustedEndDate;
    if (endDate) {
      adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      console.log(`Fecha de fin ajustada: ${adjustedEndDate.toISOString()}`);
    }
    
    // Convertir fechas JavaScript a Timestamp de Firestore para la consulta
    const startTimestamp = startDate ? Timestamp.fromDate(startDate) : undefined;
    const endTimestamp = adjustedEndDate ? Timestamp.fromDate(adjustedEndDate) : undefined;
    
    console.log(`Timestamps para consulta: Start=${startTimestamp ? 
      `${startTimestamp.seconds}.${startTimestamp.nanoseconds}` : 'undefined'}, 
      End=${endTimestamp ? `${endTimestamp.seconds}.${endTimestamp.nanoseconds}` : 'undefined'}`);
    
    let q;
    
    if (startTimestamp && endTimestamp) {
      console.log(`Buscando visitantes para producto ${productId} con Timestamps`);
      q = query(
        collection(db, "productViews"),
        where("productId", "==", productId),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    } else {
      console.log(`Buscando todos los visitantes para producto ${productId}`);
      q = query(
        collection(db, "productViews"),
        where("productId", "==", productId),
        orderBy("timestamp", "desc")
      );
    }
    
    const snapshot = await getDocs(q);
    
    // Procesar los resultados para agrupar por usuario
    const visitorMap = new Map();
    
    snapshot.forEach(doc => {
      const viewData = doc.data() as {
        userId?: string;
        sessionId: string;
        userEmail?: string;
        userName?: string;
        isAnonymous?: boolean;
        timestamp: Timestamp;
        date: string;
        time: string;
        deviceInfo: DeviceInfo;
      };
      
      const visitorId = viewData.userId || viewData.sessionId;
      
      if (visitorMap.has(visitorId)) {
        // Incrementar número de visitas para este usuario
        const existingVisitor = visitorMap.get(visitorId);
        existingVisitor.totalVisits += 1;
        
        // Actualizar última visita si es más reciente
        const timestamp = viewData.timestamp?.toDate() || new Date();
        if (timestamp > existingVisitor.lastSeen) {
          existingVisitor.lastSeen = timestamp;
        }
        
        // Añadir este evento a la lista de visitas
        existingVisitor.visits.push({
          timestamp: timestamp,
          date: viewData.date,
          time: viewData.time,
          deviceInfo: viewData.deviceInfo
        });
        
      } else {
        // Crear nuevo registro de visitante
        const timestamp = viewData.timestamp?.toDate() || new Date();
        visitorMap.set(visitorId, {
          userId: visitorId,
          displayName: viewData.userName || (viewData.isAnonymous ? 'Usuario anónimo' : null),
          email: viewData.userEmail || null,
          isAnonymous: viewData.isAnonymous || !viewData.userId,
          totalVisits: 1,
          firstVisit: timestamp,
          lastSeen: timestamp,
          deviceInfo: viewData.deviceInfo,
          visits: [{
            timestamp: timestamp,
            date: viewData.date,
            time: viewData.time,
            deviceInfo: viewData.deviceInfo
          }]
        });
      }
    });
    
    // Convertir el mapa a un array
    return Array.from(visitorMap.values());
    
  } catch (error) {
    console.error("Error al obtener visitantes del producto:", error);
    return [];
  }
};

// Obtiene los productos más vistos
export const getMostViewedProducts = async (limitCount = 10) => {
  try {
    const q = query(
      collection(db, "productAnalytics"),
      orderBy("totalViews", "desc"),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    let products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductAnalytics[];
    
    // Usamos solo datos reales, no simulados
    products = products.map(product => {
      return {
        ...product,
        uniqueVisitors: product.visitors?.length || 0,
        returningVisitors: (product.visitors?.filter(v => (v.totalVisits || 0) > 1).length) || 0
      };
    });
    
    return products;
  } catch (error) {
    console.error("Error al obtener productos más vistos:", error);
    return [];
  }
};

// Obtiene los productos menos vistos
export const getLeastViewedProducts = async (limitCount = 10) => {
  try {
    const q = query(
      collection(db, "productAnalytics"),
      orderBy("totalViews", "asc"),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    let products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductAnalytics[];
    
    // Usamos solo datos reales, no simulados
    products = products.map(product => {
      return {
        ...product,
        uniqueVisitors: product.visitors?.length || 0,
        returningVisitors: (product.visitors?.filter(v => (v.totalVisits || 0) > 1).length) || 0
      };
    });
    
    return products;
  } catch (error) {
    console.error("Error al obtener productos menos vistos:", error);
    return [];
  }
};

// Obtiene las vistas de un producto específico
export const getProductViewsData = async (productId: string) => {
  try {
    const docRef = doc(db, "productAnalytics", productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ProductAnalytics;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener datos de vistas del producto:", error);
    return null;
  }
};

// Obtiene datos para gráficos de tendencia (últimos 30 días)
export const getProductViewsTrend = async (productId?: string) => {
  try {
    // Generamos un array de los últimos 30 días (formato YYYY-MM-DD)
    const last30Days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last30Days.push(date.toISOString().split('T')[0]);
    }
    
    // Si se especifica un producto, obtenemos solo sus datos
    if (productId) {
      const productData = await getProductViewsData(productId);
      if (productData) {
        const viewsByDay = productData.viewsByDay || {};
        return last30Days.map(day => ({
          date: day,
          views: viewsByDay[day] || 0
        }));
      }
      return [];
    } 
    
    // Si no se especifica producto, obtenemos datos agregados de todos los productos
    else {
      const snapshot = await getDocs(collection(db, "productAnalytics"));
      const aggregated: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const viewsByDay = data.viewsByDay || {};
        
        for (const day in viewsByDay) {
          aggregated[day] = (aggregated[day] || 0) + viewsByDay[day];
        }
      });
      
      return last30Days.map(day => ({
        date: day,
        views: aggregated[day] || 0
      }));
    }
  } catch (error) {
    console.error("Error al obtener tendencia de vistas:", error);
    return [];
  }
};

// Exporta datos para Excel (todos los productos con su análisis)
export const getProductsViewsForExport = async () => {
  try {
    const snapshot = await getDocs(collection(db, "productAnalytics"));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const viewsByDay = data.viewsByDay || {};
      
      // Calculamos algunas métricas adicionales
      const dates = Object.keys(viewsByDay);
      const totalDays = dates.length;
      const totalViews = data.totalViews || 0;
      const averageViewsPerDay = totalDays > 0 ? totalViews / totalDays : 0;
      
      // Encontramos el día con más vistas
      let peakDay = "";
      let peakViews = 0;
      
      for (const day in viewsByDay) {
        if (viewsByDay[day] > peakViews) {
          peakDay = day;
          peakViews = viewsByDay[day];
        }
      }
      
      return {
        id: doc.id,
        productName: data.productName || "Producto sin nombre",
        totalViews,
        averageViewsPerDay: averageViewsPerDay.toFixed(2),
        firstViewed: dates.length > 0 ? dates.sort()[0] : "Sin datos",
        lastViewed: data.lastViewed ? new Date(data.lastViewed.seconds * 1000).toLocaleDateString() : "Sin datos",
        peakDay,
        peakViews,
        viewsByDay
      };
    });
  } catch (error) {
    console.error("Error al preparar datos para exportación:", error);
    return [];
  }
};

// Obtiene los eventos detallados de visualización de un producto
export const getDetailedViewEvents = async (productId: string, startDate?: string, endDate?: string): Promise<ViewEvent[]> => {
  try {
    // Verificar que tenemos un ID de producto válido
    if (!productId) {
      console.log("Error: No se proporcionó un ID de producto válido");
      return [];
    }
    
    // DIAGNÓSTICO: Primero verificar si hay registros sin filtros de fecha
    console.log(`DIAGNÓSTICO getDetailedViewEvents: Verificando existencia de registros para producto ${productId}`);
    const diagnosticQuery = query(
      collection(db, "productViews"),
      where("productId", "==", productId),
      limit(5)
    );
    const diagnosticSnapshot = await getDocs(diagnosticQuery);
    
    console.log(`DIAGNÓSTICO getDetailedViewEvents: Encontrados ${diagnosticSnapshot.size} registros`);
    diagnosticSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Registro: ID=${doc.id}, timestamp=${data.timestamp instanceof Timestamp ? 
        `Timestamp(${data.timestamp.seconds}, ${data.timestamp.nanoseconds})` : 
        'No es Timestamp'}, fecha=${data.date}, hora=${data.time}`);
    });
    
    // Mejorar el manejo de fechas para Firestore
    let startDateObj, endDateObj;
    let startTimestamp, endTimestamp;
    
    if (startDate) {
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0); // Inicio del día
      startTimestamp = Timestamp.fromDate(startDateObj);
      console.log(`Fecha de inicio convertida: ${startDateObj.toISOString()}, Timestamp: ${startTimestamp.seconds}.${startTimestamp.nanoseconds}`);
    }
    
    if (endDate) {
      endDateObj = new Date(endDate);
      // Asegurar que la fecha final sea el final del día
      endDateObj.setHours(23, 59, 59, 999);
      endTimestamp = Timestamp.fromDate(endDateObj);
      console.log(`Fecha de fin convertida: ${endDateObj.toISOString()}, Timestamp: ${endTimestamp.seconds}.${endTimestamp.nanoseconds}`);
    }
    
    let q;
    
    if (startTimestamp && endTimestamp) {
      console.log(`Buscando eventos para producto ${productId} entre timestamps de Firestore`);
      q = query(
        collection(db, "productViews"),
        where("productId", "==", productId),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    } else {
      console.log(`Buscando todos los eventos para producto ${productId}`);
      q = query(
        collection(db, "productViews"),
        where("productId", "==", productId),
        orderBy("timestamp", "desc")
      );
    }
    
    const snapshot = await getDocs(q);
    const events: ViewEvent[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data() as any;
      const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date();
      
      events.push({
        id: doc.id,
        timestamp: timestamp,
        userId: data.userId || data.sessionId || 'unknown',
        displayName: data.userName || (data.isAnonymous ? 'Usuario anónimo' : 'Usuario'),
        email: data.userEmail || null,
        deviceType: data.deviceInfo?.device || 'Desconocido',
        source: data.source || 'Directo',
        duration: data.duration || null,
        location: data.location?.country || 'Desconocido'
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error al obtener eventos de vistas:", error);
    return [];
  }
};
