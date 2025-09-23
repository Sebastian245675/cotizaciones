// src/services/api-client.ts
class APIClient {
  private baseURL: string;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.setupConnectivityDetection();
  }

  private setupConnectivityDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Conexión restaurada - Iniciando sincronización...');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Modo offline activado');
    });
  }

  private async triggerSync() {
    try {
      await fetch(`${this.baseURL}/sync/trigger`, { method: 'POST' });
    } catch (error) {
      console.error('Error al activar sincronización:', error);
    }
  }

  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Métodos de productos
  async getProducts() {
    return this.request('/products');
  }

  async createProduct(product: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  }

  async updateProduct(id: string, product: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  async searchProductByBarcode(barcode: string) {
    return this.request(`/products/barcode/${barcode}`);
  }

  // Métodos de ventas
  async getSales(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/sales${query}`);
  }

  async createSale(sale: any) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(sale)
    });
  }

  async updateSale(id: string, updates: any) {
    return this.request(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async getDailySalesReport(date?: string) {
    const query = date ? `?date=${date}` : '';
    return this.request(`/sales/reports/daily${query}`);
  }

  // Métodos de clientes
  async getCustomers() {
    return this.request('/customers');
  }

  async createCustomer(customer: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  }

  async updateCustomer(id: string, customer: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer)
    });
  }

  async getCustomerPurchaseHistory(id: string) {
    return this.request(`/customers/${id}/purchases`);
  }

  // Métodos de categorías
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(category: any) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(category)
    });
  }

  // Métodos de caja registradora
  async getCashRegister(userEmail: string) {
    return this.request(`/cash-register?user_email=${userEmail}`);
  }

  async openCashRegister(data: any) {
    return this.request('/cash-register/open', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async closeCashRegister(id: string, data: any) {
    return this.request(`/cash-register/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async addCashMovement(id: string, movement: any) {
    return this.request(`/cash-register/${id}/movement`, {
      method: 'POST',
      body: JSON.stringify(movement)
    });
  }

  // Métodos de autenticación
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async verifyToken(token: string) {
    return this.request('/auth/verify-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Métodos de sincronización
  async checkSyncStatus() {
    return this.request('/sync/status');
  }

  async forcSync() {
    return this.request('/sync/force', { method: 'POST' });
  }

  async getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      backendConnected: await this.checkBackendConnection()
    };
  }

  private async checkBackendConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        timeout: 5000
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new APIClient();