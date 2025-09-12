// Base de datos simulada para cuando Firestore no está disponible
// Esto permite que la aplicación siga funcionando en modo offline o mientras se configuran las reglas
// También útil para desarrollo sin consumir cuota de Firebase o cuando hay problemas de conexión

/**
 * Clase SimulatedDB que proporciona una capa de simulación para Firestore
 * Soporta operaciones básicas como getAll, getById, add, update, delete
 */
class SimulatedDB {
  private static instance: SimulatedDB;
  private collections: Record<string, Record<string, any>>;
  private isSimulated: boolean = false;
  private lastErrorTimestamp: number = 0;
  private errorCount: number = 0;

  /**
   * Registra un error de Firebase y muestra recomendaciones si ocurren muchos errores seguidos
   */
  private registerFirebaseError() {
    const now = Date.now();
    // Si el último error fue hace más de 10 minutos, reiniciar contador
    if (now - this.lastErrorTimestamp > 10 * 60 * 1000) {
      this.errorCount = 0;
    }
    
    this.lastErrorTimestamp = now;
    this.errorCount++;
    
    // Si hay muchos errores seguidos, mostrar recomendaciones más detalladas
    if (this.errorCount > 5) {
      console.log("%c🔥 Múltiples errores de Firebase detectados", "background: #ff5722; color: white; font-weight: bold; padding: 5px; font-size: 14px;");
      console.log(`
        Se han detectado ${this.errorCount} errores de conexión a Firebase.
        
        Recomendaciones:
        1. Verifica tu conexión a Internet
        2. Confirma que el proyecto de Firebase existe y está activo
        3. Revisa las reglas de seguridad de Firestore
        4. Verifica que las claves API y credenciales sean correctas
        5. Comprueba si hay límites de cuota excedidos en Firebase Console
        
        La aplicación continuará funcionando en modo offline con datos simulados.
      `);
    }
  }

  private constructor() {
    // Inicializar colecciones vacías
    this.collections = {
      products: {}, 
      users: {},
      categories: {},
      orders: {},
      access_test: {},
    };
  }

  public static getInstance(): SimulatedDB {
    if (!SimulatedDB.instance) {
      SimulatedDB.instance = new SimulatedDB();
    }
    return SimulatedDB.instance;
  }

  /**
   * Activa o desactiva el modo de simulación
   * @param isSimulated Si es true, se activa el modo simulado
   */
  setSimulationMode(isSimulated: boolean) {
    const wasSimulated = this.isSimulated;
    this.isSimulated = isSimulated;
    
    // Solo registramos el cambio si realmente cambió
    if (wasSimulated !== isSimulated) {
      if (isSimulated) {
        console.log("%c⚠️ Modo simulación de base de datos ACTIVADO", "background: orange; color: black; padding: 3px; border-radius: 3px;");
        this.registerFirebaseError(); // Registrar este evento como un error
      } else {
        console.log("%c✅ Modo simulación de base de datos DESACTIVADO", "background: green; color: white; padding: 3px; border-radius: 3px;");
      }
    }
    
    if (isSimulated) {
      // Datos de ejemplo
      this.addData("categories", {
        id: "electrodomesticos",
        name: "Electrodomésticos",
        image: "https://via.placeholder.com/150",
        parent: null
      });
      this.addData("categories", {
        id: "cocina",
        name: "Cocina",
        image: "https://via.placeholder.com/150",
        parent: "electrodomesticos"
      });
      
      // Productos de ejemplo
      this.addData("products", {
        id: "producto1",
        name: "Licuadora Multiuso",
        description: "Licuadora potente con múltiples velocidades",
        price: 59.99,
        category: "cocina",
        image: "https://via.placeholder.com/300",
        stock: 10
      });
      
      this.addData("products", {
        id: "producto2",
        name: "Microondas Digital",
        description: "Microondas de última generación",
        price: 129.99,
        category: "electrodomesticos",
        image: "https://via.placeholder.com/300",
        stock: 5
      });
      
      // Usuario admin
      this.addData("users", {
        id: "admin-id",
        name: "Administrador",
        email: "admin@tienda.com",
        isAdmin: true
      });
    }
  }

  isSimulationActive() {
    return this.isSimulated;
  }

  addData(collection: string, data: any) {
    if (!this.collections[collection]) {
      this.collections[collection] = {};
    }
    this.collections[collection][data.id] = data;
  }

  getCollection(collection: string) {
    return Object.values(this.collections[collection] || {});
  }

  getDocument(collection: string, id: string) {
    return this.collections[collection]?.[id];
  }

  // Métodos para simular operaciones de Firestore
  async getCollectionData(collection: string): Promise<any[]> {
    if (!this.isSimulated) return [];
    return this.getCollection(collection);
  }

  async getDocumentData(collection: string, id: string): Promise<any> {
    if (!this.isSimulated) return null;
    return this.getDocument(collection, id);
  }

  async addDocumentData(collection: string, id: string, data: any): Promise<void> {
    if (!this.isSimulated) return;
    this.addData(collection, { id, ...data });
  }

  async updateDocumentData(collection: string, id: string, data: any): Promise<void> {
    if (!this.isSimulated) return;
    const existingData = this.getDocument(collection, id);
    if (existingData) {
      this.collections[collection][id] = { ...existingData, ...data };
    }
  }

  async deleteDocumentData(collection: string, id: string): Promise<void> {
    if (!this.isSimulated) return;
    if (this.collections[collection] && this.collections[collection][id]) {
      delete this.collections[collection][id];
    }
  }
}

export const simulatedDB = SimulatedDB.getInstance();
