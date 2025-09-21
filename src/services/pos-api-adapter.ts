// src/services/pos-api-adapter.ts
// Adaptador que mantiene la interfaz existente pero usa el backend local

import { apiClient } from './api-client';
import { offlineSyncService } from './offline-sync-service';

// Mantener compatibilidad con las funciones existentes del frontend
export class POSAPIAdapter {
  private static instance: POSAPIAdapter;

  static getInstance(): POSAPIAdapter {
    if (!POSAPIAdapter.instance) {
      POSAPIAdapter.instance = new POSAPIAdapter();
    }
    return POSAPIAdapter.instance;
  }

  // Inicializar el sistema
  async initialize() {
    await offlineSyncService.initialize();
  }

  // === PRODUCTOS ===
  async getProducts() {
    const result = await apiClient.getProducts();
    return result.success ? result.data : [];
  }

  async createProduct(product: any) {
    const result = await apiClient.createProduct({
      ...product,
      id: product.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error creando producto');
  }

  async updateProduct(id: string, updates: any) {
    const result = await apiClient.updateProduct(id, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error actualizando producto');
  }

  async deleteProduct(id: string) {
    const result = await apiClient.deleteProduct(id);
    if (!result.success) {
      throw new Error(result.error || 'Error eliminando producto');
    }
  }

  async searchProductByBarcode(barcode: string) {
    const result = await apiClient.searchProductByBarcode(barcode);
    return result.success ? result.data : null;
  }

  // === VENTAS ===
  async getSales(params: any = {}) {
    const result = await apiClient.getSales(params);
    return result.success ? result.data : [];
  }

  async createSale(sale: any) {
    const result = await apiClient.createSale({
      ...sale,
      id: sale.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error creando venta');
  }

  async updateSale(id: string, updates: any) {
    const result = await apiClient.updateSale(id, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error actualizando venta');
  }

  async getDailySalesReport(date?: string) {
    const result = await apiClient.getDailySalesReport(date);
    return result.success ? result.data : null;
  }

  // === CLIENTES ===
  async getCustomers() {
    const result = await apiClient.getCustomers();
    return result.success ? result.data : [];
  }

  async createCustomer(customer: any) {
    const result = await apiClient.createCustomer({
      ...customer,
      id: customer.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error creando cliente');
  }

  async updateCustomer(id: string, updates: any) {
    const result = await apiClient.updateCustomer(id, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error actualizando cliente');
  }

  async getCustomerPurchaseHistory(id: string) {
    const result = await apiClient.getCustomerPurchaseHistory(id);
    return result.success ? result.data : [];
  }

  // === CATEGORÍAS ===
  async getCategories() {
    const result = await apiClient.getCategories();
    return result.success ? result.data : [];
  }

  async createCategory(category: any) {
    const result = await apiClient.createCategory({
      ...category,
      id: category.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error creando categoría');
  }

  // === CAJA REGISTRADORA ===
  async getCashRegister(userEmail: string) {
    const result = await apiClient.getCashRegister(userEmail);
    return result.success ? result.data : null;
  }

  async openCashRegister(data: any) {
    const result = await apiClient.openCashRegister({
      ...data,
      created_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error abriendo caja');
  }

  async closeCashRegister(id: string, data: any) {
    const result = await apiClient.closeCashRegister(id, data);
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error cerrando caja');
  }

  async addCashMovement(cashRegisterId: string, movement: any) {
    const result = await apiClient.addCashMovement(cashRegisterId, {
      ...movement,
      created_at: new Date().toISOString()
    });
    
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Error agregando movimiento');
  }

  // === SINCRONIZACIÓN ===
  async getSyncStatus() {
    return await offlineSyncService.getSyncStatistics();
  }

  async forceSync() {
    await offlineSyncService.syncLocalChangesToFirebase();
  }

  async resetSync() {
    await offlineSyncService.resetSync();
  }

  // === UTILIDADES ===
  async getConnectionStatus() {
    return await apiClient.getConnectionStatus();
  }

  // Función de migración para componentes existentes
  async migrateFromFirebase() {
    console.log('🔄 Iniciando migración desde Firebase...');
    
    // Si hay datos en Firebase y no en local, hacer sincronización inicial
    const syncStatus = await this.getSyncStatus();
    
    if (!syncStatus.initialSyncCompleted && navigator.onLine) {
      await offlineSyncService.performInitialSync();
    }
    
    console.log('✅ Migración completada');
  }
}

// Instancia singleton para usar en toda la aplicación
export const posAPI = POSAPIAdapter.getInstance();

// Funciones de conveniencia para mantener compatibilidad
export const getProducts = () => posAPI.getProducts();
export const createProduct = (product: any) => posAPI.createProduct(product);
export const updateProduct = (id: string, updates: any) => posAPI.updateProduct(id, updates);
export const deleteProduct = (id: string) => posAPI.deleteProduct(id);
export const searchProductByBarcode = (barcode: string) => posAPI.searchProductByBarcode(barcode);

export const getSales = (params?: any) => posAPI.getSales(params);
export const createSale = (sale: any) => posAPI.createSale(sale);
export const updateSale = (id: string, updates: any) => posAPI.updateSale(id, updates);
export const getDailySalesReport = (date?: string) => posAPI.getDailySalesReport(date);

export const getCustomers = () => posAPI.getCustomers();
export const createCustomer = (customer: any) => posAPI.createCustomer(customer);
export const updateCustomer = (id: string, updates: any) => posAPI.updateCustomer(id, updates);

export const getCategories = () => posAPI.getCategories();
export const createCategory = (category: any) => posAPI.createCategory(category);

export const getCashRegister = (userEmail: string) => posAPI.getCashRegister(userEmail);
export const openCashRegister = (data: any) => posAPI.openCashRegister(data);
export const closeCashRegister = (id: string, data: any) => posAPI.closeCashRegister(id, data);
export const addCashMovement = (id: string, movement: any) => posAPI.addCashMovement(id, movement);