// src/pages/OfflineTestPage.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { posAPI } from "../services/pos-api-adapter";
import { useOfflinePOS } from "../hooks/use-offline-pos";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export function OfflineTestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'general'
  });

  const {
    isOnline,
    backendConnected,
    syncStatus,
    isLoading: syncLoading,
    forceSync
  } = useOfflinePOS();

  // Cargar productos
  const loadProducts = async () => {
    setLoading(true);
    try {
      const productList = await posAPI.getProducts();
      setProducts((productList as Product[]) || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crear producto
  const createProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;

    try {
      await posAPI.createProduct({
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock) || 0,
        category: newProduct.category,
        barcode: `TEST-${Date.now()}`,
        description: `Producto de prueba creado ${new Date().toLocaleString()}`
      });

      setNewProduct({ name: '', price: '', stock: '', category: 'general' });
      await loadProducts();
    } catch (error) {
      console.error('Error creando producto:', error);
    }
  };

  // Forzar sincronización
  const handleForceSync = async () => {
    try {
      await forceSync();
      await loadProducts();
    } catch (error) {
      console.error('Error sincronizando:', error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🧪 Prueba de Sistema Offline</h1>
        <p className="text-gray-600 mt-2">
          Prueba el funcionamiento del POS con y sin conexión a internet
        </p>
      </div>

      {/* Estado del Sistema */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Estado del Sistema</span>
            {syncLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "🌐 Online" : "📱 Offline"}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Internet</p>
            </div>
            
            <div className="text-center">
              <Badge variant={backendConnected ? "default" : "destructive"}>
                {backendConnected ? "✅ Conectado" : "❌ Desconectado"}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Backend</p>
            </div>
            
            <div className="text-center">
              <Badge variant={syncStatus.initialSyncCompleted ? "default" : "secondary"}>
                {syncStatus.initialSyncCompleted ? "✅ Completada" : "⏳ Pendiente"}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Sync Inicial</p>
            </div>
            
            <div className="text-center">
              <Badge variant={syncStatus.pendingItems > 0 ? "secondary" : "default"}>
                {syncStatus.pendingItems} pendientes
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Cambios</p>
            </div>
          </div>

          {syncStatus.lastSync && (
            <p className="text-sm text-gray-600 mt-4">
              Última sincronización: {syncStatus.lastSync.toLocaleString()}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            <Button onClick={loadProducts} disabled={loading} size="sm">
              {loading ? "Cargando..." : "Recargar Productos"}
            </Button>
            
            {isOnline && backendConnected && syncStatus.pendingItems > 0 && (
              <Button onClick={handleForceSync} variant="outline" size="sm">
                Sincronizar Ahora
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Crear Producto */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Crear Producto de Prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newProduct.name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Producto de prueba"
              />
            </div>
            
            <div>
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={newProduct.stock}
                onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                placeholder="0"
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={createProduct} disabled={!newProduct.name || !newProduct.price}>
                Crear Producto
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-2">Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay productos</p>
              <p className="text-sm">Crea un producto de prueba para empezar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-gray-600">Precio: ${product.price}</p>
                  <p className="text-gray-600">Stock: {product.stock}</p>
                  <p className="text-gray-600">Categoría: {product.category}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>📋 Instrucciones de Prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>1. Con Internet:</strong> Crea algunos productos y verifica que se guardan</p>
            <p><strong>2. Sin Internet:</strong> Desconecta internet y sigue creando productos</p>
            <p><strong>3. Reconectar:</strong> Vuelve a conectar internet y observa la sincronización automática</p>
            <p><strong>4. Verificar:</strong> Los productos creados offline deberían aparecer en Firebase</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}