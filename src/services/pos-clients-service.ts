import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  Timestamp,
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface POSClient {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  residencia?: string;
  puntos: number;
  totalVentas: number;
  fechaRegistro: Timestamp;
  ultimaActualizacion: Timestamp;
}

export interface POSVenta {
  id: string;
  clienteId: string;
  monto: number;
  puntosGanados: number;
  fecha: Timestamp;
  numeroVenta: string;
}

export interface ClientFormData {
  nombre: string;
  telefono: string;
  email?: string;
  residencia?: string;
  origen?: 'manual' | 'cotizacion' | 'venta'; // Nuevo campo para trackear el origen
  codigoCotizacion?: string; // Referencia a la cotización que lo generó
}

export interface GrowthStats {
  currentPeriod: number;
  previousPeriod: number;
  growthPercentage: number;
  totalClients: number;
  newClientsThisPeriod: number;
}

const POS_CLIENTS_COLLECTION = 'pos_clientes';
const POS_VENTAS_COLLECTION = 'pos_ventas';

// Crear un nuevo cliente POS
export async function createPOSClient(data: ClientFormData): Promise<string> {
  try {
    console.log('📝 createPOSClient: Creando cliente con datos:', data);
    
    const clientData = {
      ...data,
      puntos: 0,
      totalVentas: 0,
      fechaRegistro: serverTimestamp(),
      ultimaActualizacion: serverTimestamp()
    };

    console.log('💾 Guardando en colección:', POS_CLIENTS_COLLECTION);
    
    const docRef = await addDoc(collection(db, POS_CLIENTS_COLLECTION), clientData);
    console.log('✅ Cliente creado exitosamente con ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating POS client:', error);
    throw new Error('Error al crear el cliente POS');
  }
}

// Obtener todos los clientes POS
export async function getPOSClients(): Promise<POSClient[]> {
  try {
    const q = query(
      collection(db, POS_CLIENTS_COLLECTION), 
      orderBy('fechaRegistro', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSClient[];
  } catch (error) {
    console.error('Error getting POS clients:', error);
    throw new Error('Error al obtener los clientes POS');
  }
}

// Actualizar un cliente POS
export async function updatePOSClient(clientId: string, data: Partial<ClientFormData>): Promise<void> {
  try {
    const clientRef = doc(db, POS_CLIENTS_COLLECTION, clientId);
    await updateDoc(clientRef, {
      ...data,
      ultimaActualizacion: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating POS client:', error);
    throw new Error('Error al actualizar el cliente POS');
  }
}

// Eliminar un cliente POS
export async function deletePOSClient(clientId: string): Promise<void> {
  try {
    // Primero eliminamos todas las ventas asociadas al cliente
    const ventasQuery = query(
      collection(db, POS_VENTAS_COLLECTION),
      where('clienteId', '==', clientId)
    );
    const ventasSnapshot = await getDocs(ventasQuery);
    
    // Eliminar todas las ventas del cliente
    const deletePromises = ventasSnapshot.docs.map(ventaDoc => 
      deleteDoc(doc(db, POS_VENTAS_COLLECTION, ventaDoc.id))
    );
    await Promise.all(deletePromises);

    // Luego eliminamos el cliente
    const clientRef = doc(db, POS_CLIENTS_COLLECTION, clientId);
    await deleteDoc(clientRef);
  } catch (error) {
    console.error('Error deleting POS client:', error);
    throw new Error('Error al eliminar el cliente POS');
  }
}

// Registrar una venta POS y actualizar puntos del cliente
export async function registrarVentaPOS(clienteId: string, monto: number): Promise<string> {
  try {
    // Calcular puntos ganados (1 punto por cada $100)
    const puntosGanados = Math.floor(monto / 100);
    
    // Generar número de venta único
    const numeroVenta = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear el registro de venta
    const ventaData = {
      clienteId,
      monto,
      puntosGanados,
      fecha: serverTimestamp(),
      numeroVenta
    };

    const ventaRef = await addDoc(collection(db, POS_VENTAS_COLLECTION), ventaData);

    // Actualizar los puntos y total de ventas del cliente
    const clientRef = doc(db, POS_CLIENTS_COLLECTION, clienteId);
    await updateDoc(clientRef, {
      puntos: increment(puntosGanados),
      totalVentas: increment(monto),
      ultimaActualizacion: serverTimestamp()
    });

    return ventaRef.id;
  } catch (error) {
    console.error('Error registering POS sale:', error);
    throw new Error('Error al registrar la venta POS');
  }
}

// Obtener estadísticas de crecimiento de clientes
export async function getClientGrowthStats(period: 'day' | 'week' | 'month'): Promise<GrowthStats> {
  try {
    const now = new Date();
    const currentPeriodStart = new Date();
    const previousPeriodStart = new Date();
    const previousPeriodEnd = new Date();

    // Configurar fechas según el período
    switch (period) {
      case 'day':
        currentPeriodStart.setHours(0, 0, 0, 0);
        previousPeriodEnd.setTime(currentPeriodStart.getTime());
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        previousPeriodStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const currentDayOfWeek = now.getDay();
        currentPeriodStart.setDate(now.getDate() - currentDayOfWeek);
        currentPeriodStart.setHours(0, 0, 0, 0);
        previousPeriodEnd.setTime(currentPeriodStart.getTime());
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        break;
      case 'month':
        currentPeriodStart.setDate(1);
        currentPeriodStart.setHours(0, 0, 0, 0);
        previousPeriodEnd.setTime(currentPeriodStart.getTime());
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
        previousPeriodStart.setDate(1);
        break;
    }

    // Consultar clientes del período actual
    const currentQuery = query(
      collection(db, POS_CLIENTS_COLLECTION),
      where('fechaRegistro', '>=', Timestamp.fromDate(currentPeriodStart))
    );
    const currentSnapshot = await getDocs(currentQuery);
    const currentPeriodCount = currentSnapshot.size;

    // Consultar clientes del período anterior
    const previousQuery = query(
      collection(db, POS_CLIENTS_COLLECTION),
      where('fechaRegistro', '>=', Timestamp.fromDate(previousPeriodStart)),
      where('fechaRegistro', '<', Timestamp.fromDate(previousPeriodEnd))
    );
    const previousSnapshot = await getDocs(previousQuery);
    const previousPeriodCount = previousSnapshot.size;

    // Consultar total de clientes
    const totalQuery = query(collection(db, POS_CLIENTS_COLLECTION));
    const totalSnapshot = await getDocs(totalQuery);
    const totalClients = totalSnapshot.size;

    // Calcular porcentaje de crecimiento
    let growthPercentage = 0;
    if (previousPeriodCount > 0) {
      growthPercentage = ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
    } else if (currentPeriodCount > 0) {
      growthPercentage = 100; // 100% si no había clientes antes pero ahora sí
    }

    return {
      currentPeriod: currentPeriodCount,
      previousPeriod: previousPeriodCount,
      growthPercentage,
      totalClients,
      newClientsThisPeriod: currentPeriodCount
    };
  } catch (error) {
    console.error('Error getting client growth stats:', error);
    throw new Error('Error al obtener estadísticas de crecimiento');
  }
}

// Obtener ventas de un cliente específico
export async function getClientSales(clienteId: string): Promise<POSVenta[]> {
  try {
    const q = query(
      collection(db, POS_VENTAS_COLLECTION),
      where('clienteId', '==', clienteId),
      orderBy('fecha', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSVenta[];
  } catch (error) {
    console.error('Error getting client sales:', error);
    throw new Error('Error al obtener las ventas del cliente');
  }
}

// Obtener todas las ventas POS
export async function getAllPOSSales(): Promise<POSVenta[]> {
  try {
    const q = query(
      collection(db, POS_VENTAS_COLLECTION),
      orderBy('fecha', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSVenta[];
  } catch (error) {
    console.error('Error getting all POS sales:', error);
    throw new Error('Error al obtener todas las ventas POS');
  }
}

// Buscar clientes por término de búsqueda
export async function searchPOSClients(searchTerm: string): Promise<POSClient[]> {
  try {
    // Firebase no soporta búsqueda de texto completo, así que obtenemos todos y filtramos
    const allClients = await getPOSClients();
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return allClients.filter(client => 
      client.nombre.toLowerCase().includes(lowercaseSearch) ||
      client.telefono.includes(searchTerm) ||
      (client.email && client.email.toLowerCase().includes(lowercaseSearch)) ||
      (client.residencia && client.residencia.toLowerCase().includes(lowercaseSearch))
    );
  } catch (error) {
    console.error('Error searching POS clients:', error);
    throw new Error('Error al buscar clientes POS');
  }
}

// Obtener estadísticas generales
export async function getPOSGeneralStats(): Promise<{
  totalClients: number;
  totalSales: number;
  totalRevenue: number;
  totalPoints: number;
  averagePointsPerClient: number;
  averageRevenuePerClient: number;
}> {
  try {
    const [clients, sales] = await Promise.all([
      getPOSClients(),
      getAllPOSSales()
    ]);

    const totalClients = clients.length;
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.monto, 0);
    const totalPoints = clients.reduce((sum, client) => sum + client.puntos, 0);

    return {
      totalClients,
      totalSales,
      totalRevenue,
      totalPoints,
      averagePointsPerClient: totalClients > 0 ? totalPoints / totalClients : 0,
      averageRevenuePerClient: totalClients > 0 ? totalRevenue / totalClients : 0
    };
  } catch (error) {
    console.error('Error getting POS general stats:', error);
    throw new Error('Error al obtener estadísticas generales');
  }
}
