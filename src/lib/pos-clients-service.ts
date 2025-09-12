import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';

export interface POSClient {
  id?: string;
  clienteId: string; // ID único personalizado (ej: 4455, 666, etc.)
  nombre: string;
  telefono: string;
  email?: string;
  residencia?: string;
  puntos: number;
  totalCompras: number;
  cantidadCompras: number;
  fechaRegistro: Timestamp;
  ultimaCompra?: Timestamp;
  estado: 'activo' | 'inactivo';
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  origen?: 'manual' | 'cotizacion' | 'venta'; // Nuevo campo para trackear el origen
  codigoCotizacion?: string; // Referencia a la cotización que lo generó
}

export interface VentaPOS {
  clienteId: string;
  monto: number;
  puntosGanados: number;
  fecha: Timestamp;
  productos: string[];
}

const COLLECTION_NAME = 'pos_clientes';
const VENTAS_COLLECTION = 'pos_ventas';

// Generar ID único para cliente (4 dígitos)
const generateUniqueClientId = async (): Promise<string> => {
  const usedIds = new Set<string>();
  
  // Obtener todos los IDs existentes
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.clienteId) {
        usedIds.add(data.clienteId);
      }
    });
  } catch (error) {
    console.log('Error obteniendo IDs existentes:', error);
  }

  // Generar un ID único de 4 dígitos
  let clienteId: string;
  do {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // Genera entre 1000-9999
    clienteId = randomNum.toString();
  } while (usedIds.has(clienteId));

  return clienteId;
};

// Crear nuevo cliente
export const createPOSClient = async (clientData: Omit<POSClient, 'id' | 'clienteId' | 'puntos' | 'totalCompras' | 'cantidadCompras' | 'fechaRegistro' | 'fechaCreacion' | 'fechaActualizacion'>): Promise<string | null> => {
  try {
    const now = Timestamp.now();
    const clienteId = await generateUniqueClientId();
    
    const newClient: Omit<POSClient, 'id'> = {
      ...clientData,
      clienteId,
      puntos: 0,
      totalCompras: 0,
      cantidadCompras: 0,
      fechaRegistro: now,
      fechaCreacion: now,
      fechaActualizacion: now,
      estado: 'activo'
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newClient);
    
    toast({
      title: "Cliente registrado",
      description: `${clientData.nombre} ha sido registrado con ID: ${clienteId}`,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating POS client:', error);
    toast({
      title: "Error",
      description: "No se pudo registrar el cliente. Intenta nuevamente.",
      variant: "destructive"
    });
    return null;
  }
};

// Buscar cliente por ID único
export const getPOSClientByClientId = async (clienteId: string): Promise<POSClient | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('clienteId', '==', clienteId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as POSClient;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting POS client by ID:', error);
    throw error;
  }
};

// Obtener todos los clientes
export const getPOSClients = async (): Promise<POSClient[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('fechaCreacion', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSClient[];
  } catch (error) {
    console.error('Error getting POS clients:', error);
    toast({
      title: "Error",
      description: "No se pudieron cargar los clientes",
      variant: "destructive"
    });
    return [];
  }
};

// Buscar clientes por término
export const searchPOSClients = async (searchTerm: string): Promise<POSClient[]> => {
  try {
    if (!searchTerm.trim()) {
      return await getPOSClients();
    }

    // Firebase no tiene búsqueda de texto completo nativa, así que obtenemos todos y filtramos
    const allClients = await getPOSClients();
    const searchLower = searchTerm.toLowerCase();
    
    return allClients.filter(client =>
      client.nombre.toLowerCase().includes(searchLower) ||
      client.telefono.includes(searchTerm) ||
      (client.email && client.email.toLowerCase().includes(searchLower))
    );
  } catch (error) {
    console.error('Error searching POS clients:', error);
    return [];
  }
};

// Actualizar cliente
export const updatePOSClient = async (clientId: string, updates: Partial<POSClient>): Promise<boolean> => {
  try {
    const clientRef = doc(db, COLLECTION_NAME, clientId);
    await updateDoc(clientRef, {
      ...updates,
      fechaActualizacion: Timestamp.now()
    });

    toast({
      title: "Cliente actualizado",
      description: "La información del cliente ha sido actualizada",
    });

    return true;
  } catch (error) {
    console.error('Error updating POS client:', error);
    toast({
      title: "Error",
      description: "No se pudo actualizar el cliente",
      variant: "destructive"
    });
    return false;
  }
};

// Eliminar cliente
export const deletePOSClient = async (clientId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, clientId));
    
    toast({
      title: "Cliente eliminado",
      description: "El cliente ha sido eliminado exitosamente",
    });

    return true;
  } catch (error) {
    console.error('Error deleting POS client:', error);
    toast({
      title: "Error",
      description: "No se pudo eliminar el cliente",
      variant: "destructive"
    });
    return false;
  }
};

// Registrar venta y actualizar puntos
export const registrarVentaPOS = async (
  clienteId: string, 
  monto: number, 
  productos: string[] = []
): Promise<boolean> => {
  try {
    // Calcular puntos (1 punto por cada $100)
    const puntosGanados = Math.floor(monto / 100);
    
    // Registrar la venta
    await addDoc(collection(db, VENTAS_COLLECTION), {
      clienteId,
      monto,
      puntosGanados,
      productos,
      fecha: Timestamp.now()
    });

    // Actualizar cliente con nueva venta
    const clientRef = doc(db, COLLECTION_NAME, clienteId);
    await updateDoc(clientRef, {
      puntos: increment(puntosGanados),
      totalCompras: increment(monto),
      cantidadCompras: increment(1),
      ultimaCompra: Timestamp.now(),
      fechaActualizacion: Timestamp.now()
    });

    toast({
      title: "Venta registrada",
      description: `Se agregaron ${puntosGanados} puntos al cliente`,
    });

    return true;
  } catch (error) {
    console.error('Error registering POS sale:', error);
    toast({
      title: "Error",
      description: "No se pudo registrar la venta",
      variant: "destructive"
    });
    return false;
  }
};

// Obtener estadísticas de crecimiento por período
export const getClientGrowthStats = async (period: 'day' | 'week' | 'month') => {
  try {
    const now = new Date();
    const periods: Date[] = [];

    // Generar fechas según el período
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      if (period === 'day') {
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        date.setDate(date.getDate() - (i * 7));
        date.setHours(0, 0, 0, 0);
      } else if (period === 'month') {
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
      }
      periods.push(date);
    }

    // Obtener todos los clientes
    const allClients = await getPOSClients();
    
    // Contar nuevos clientes por período
    const stats = periods.map((periodStart, index) => {
      const nextPeriod = index < periods.length - 1 ? periods[index + 1] : new Date();
      
      const clientsInPeriod = allClients.filter(client => {
        const clientDate = client.fechaRegistro.toDate();
        return clientDate >= periodStart && clientDate < nextPeriod;
      }).length;

      return {
        date: periodStart,
        count: clientsInPeriod,
        label: period === 'day' 
          ? periodStart.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
          : period === 'week' 
          ? `Sem ${Math.ceil((now.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000))}`
          : periodStart.toLocaleDateString('es-ES', { month: 'short' })
      };
    });

    // Calcular porcentaje de crecimiento
    const currentPeriodCount = stats[stats.length - 1]?.count || 0;
    const previousPeriodCount = stats[stats.length - 2]?.count || 0;
    
    const growthPercentage = previousPeriodCount > 0 
      ? ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100 
      : currentPeriodCount > 0 ? 100 : 0;

    return {
      stats,
      currentPeriodCount,
      previousPeriodCount,
      growthPercentage: Math.round(growthPercentage * 100) / 100
    };

  } catch (error) {
    console.error('Error getting growth stats:', error);
    return {
      stats: [],
      currentPeriodCount: 0,
      previousPeriodCount: 0,
      growthPercentage: 0
    };
  }
};

// Exportar clientes a Excel (formato de datos)
export const exportPOSClientsData = async (): Promise<any[]> => {
  try {
    const clients = await getPOSClients();
    
    return clients.map(client => ({
      'Nombre': client.nombre,
      'Teléfono': client.telefono,
      'Email': client.email || 'No especificado',
      'Residencia': client.residencia || 'No especificado',
      'Puntos': client.puntos,
      'Total Compras': `$${client.totalCompras.toLocaleString()}`,
      'Cantidad Compras': client.cantidadCompras,
      'Estado': client.estado === 'activo' ? 'Activo' : 'Inactivo',
      'Fecha Registro': client.fechaRegistro.toDate().toLocaleDateString('es-ES'),
      'Última Compra': client.ultimaCompra 
        ? client.ultimaCompra.toDate().toLocaleDateString('es-ES') 
        : 'Nunca'
    }));
  } catch (error) {
    console.error('Error exporting clients data:', error);
    return [];
  }
};
