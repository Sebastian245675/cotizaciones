import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Package, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Archive,
  Barcode,
  DollarSign,
  ShoppingCart,
  MoreHorizontal,
  Settings,
  Download,
  Upload,
  Eye,
  Copy,
  RefreshCw,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  Users,
  Truck,
  FileText,
  BarChart3
} from 'lucide-react';
import { usePOSPermissions, PermissionGate, PERMISSIONS } from '@/hooks/usePOSPermissions';
import { useCategories } from '@/hooks/use-categories';
import './POSInventoryManager.css';

// Tipos para productos
interface Product {
  id: string;
  name: string;
  category: string;
  categoryName?: string; // Campo para nombre de categoría
  price?: number;
  precioVenta?: number; // Para compatibilidad con ProductForm
  stock: number;
  minStock?: number;
  barcode?: string;
  description?: string;
  supplier?: string;
  lastUpdated?: Date;
  status?: 'active' | 'inactive' | 'discontinued';
  habilitarEcommerce?: boolean; // Campo para activar/desactivar en ecommerce
  image?: string;
  deleted?: boolean; // Para filtrar productos eliminados
  puntosRecompensa?: number; // Puntos que gana el cliente por comprar este producto
  tipoRecompensa?: 'fijo' | 'porcentaje'; // Tipo de cálculo de puntos: fijo o porcentaje del precio
}

const POSInventoryManager: React.FC = () => {
  const { hasPermission, isMainAdmin } = usePOSPermissions();
  const { categoriesData, loading: categoriesLoading } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('productos');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(80);
  const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([]);

  // Estados para vista completa del producto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalTab, setProductModalTab] = useState('general');
  
  // Estados para edición en el modal
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Función para cargar productos desde Firebase
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      const allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      
      // Filtrar productos no eliminados
      const activeProducts = allProducts.filter((product: any) => !product.deleted);
      
      setProducts(activeProducts);
      setFilteredProducts(activeProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar productos",
        description: "No se pudieron cargar los productos desde la base de datos."
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar productos al montar el componente
  useEffect(() => {
    fetchProducts();
  }, []);

  // Función para toggle ecommerce
  const toggleEcommerce = async (productId: string, currentValue: boolean) => {
    try {
      await updateDoc(doc(db, "products", productId), {
        habilitarEcommerce: !currentValue,
        lastModified: new Date()
      });
      
      // Actualizar estado local
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, habilitarEcommerce: !currentValue }
            : product
        )
      );
      
      toast({
        title: !currentValue ? "Producto habilitado en ecommerce" : "Producto deshabilitado en ecommerce",
        description: `El producto ahora ${!currentValue ? 'está disponible' : 'no está disponible'} en la tienda online.`
      });
    } catch (error) {
      console.error("Error updating ecommerce status:", error);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudo actualizar el estado del producto."
      });
    }
  };

  // Función para obtener el nombre real de la categoría desde Firebase
  const getCategoryName = (categoryId: string) => {
    // Si no hay categoría definida
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null' || categoryId === '') {
      return 'Sin Categoría';
    }

    // Buscar la categoría por ID
    const categoryById = categoriesData.find(cat => cat.id === categoryId);
    if (categoryById) {
      return categoryById.name;
    }

    // Buscar la categoría por nombre (para compatibilidad con datos antiguos)
    const categoryByName = categoriesData.find(cat => cat.name === categoryId);
    if (categoryByName) {
      return categoryByName.name;
    }

    // Si no se encuentra, devolver el valor original capitalizado
    return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
  };

  // Categorías únicas de productos (usando nombres reales desde Firebase)
  const categories = React.useMemo(() => {
    if (categoriesLoading) return [];
    
    // Obtener categorías principales que realmente tienen productos
    const mainCategories = categoriesData
      .filter(cat => cat.isMain && cat.name !== 'Todos')
      .filter(cat => {
        // Solo incluir categorías que tienen al menos un producto
        return products.some(product => 
          getCategoryName(product.category) === cat.name ||
          product.category === cat.id ||
          product.categoryName === cat.name
        );
      })
      .map(cat => cat.name);

    return mainCategories;
  }, [categoriesData, products, categoriesLoading]);

  // Filtrar productos
  useEffect(() => {
    let filtered = products;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm) ||
        getCategoryName(product.category).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => getCategoryName(product.category) === selectedCategory);
    }

    // Filtro por stock
    if (stockFilter === 'low') {
      filtered = filtered.filter(product => product.stock <= product.minStock);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(product => product.stock === 0);
    } else if (stockFilter === 'normal') {
      filtered = filtered.filter(product => product.stock > product.minStock);
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset a la primera página cuando cambian los filtros
  }, [searchTerm, selectedCategory, stockFilter, products]);

  // Paginación
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedProducts(filteredProducts.slice(startIndex, endIndex));
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredProducts.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Estadísticas de inventario
  const stats = {
    total: products.length,
    lowStock: products.filter(p => (p.stock || 0) <= (p.minStock || 10) && (p.stock || 0) > 0).length,
    outOfStock: products.filter(p => (p.stock || 0) === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.precioVenta || p.price || 0) * (p.stock || 0)), 0),
    ecommerceEnabled: products.filter(p => p.habilitarEcommerce === true).length,
    withRewards: products.filter(p => p.puntosRecompensa && p.puntosRecompensa > 0).length
  };

  const getStockStatus = (product: Product) => {
    const stock = product.stock || 0;
    const minStock = product.minStock || 10;
    
    if (stock === 0) return { status: 'Sin Stock', color: 'bg-red-500' };
    if (stock <= minStock) return { status: 'Stock Bajo', color: 'bg-yellow-500' };
    return { status: 'En Stock', color: 'bg-green-500' };
  };

  // Función para exportar inventario a Excel
  const exportInventoryToExcel = async () => {
    try {
      toast({
        title: "Preparando exportación...",
        description: "Generando reporte de inventario"
      });

      // Preparar datos para Excel
      const exportData = products.map(product => {
        const price = product.precioVenta || product.price || 0;
        const stockStatus = getStockStatus(product);
        const categoryName = getCategoryName(product.category);
        
        return {
          'ID': product.id,
          'Nombre': product.name,
          'Categoría': categoryName,
          'Precio de Venta': price,
          'Stock Actual': product.stock || 0,
          'Stock Mínimo': product.minStock || 10,
          'Estado de Stock': stockStatus.status,
          'Código de Barras': product.barcode || '',
          'Descripción': product.description || '',
          'Proveedor': product.supplier || '',
          'Ecommerce Habilitado': product.habilitarEcommerce ? 'Sí' : 'No',
          'Estado': product.status || 'active',
          'Valor Total Stock': (price * (product.stock || 0)).toFixed(2),
          'Última Actualización': product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString('es-AR') : ''
        };
      });

      // Crear estadísticas resumen
      const totalProducts = products.length;
      const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 10) && (p.stock || 0) > 0).length;
      const outOfStockProducts = products.filter(p => (p.stock || 0) === 0).length;
      const totalValue = products.reduce((sum, p) => sum + ((p.precioVenta || p.price || 0) * (p.stock || 0)), 0);
      const ecommerceProducts = products.filter(p => p.habilitarEcommerce === true).length;
      const categoriesCount = categories.length;

      const summaryData = [
        ['REPORTE DE INVENTARIO'],
        [''],
        ['Resumen General'],
        ['Total de Productos', totalProducts],
        ['Productos con Stock Bajo', lowStockProducts],
        ['Productos Sin Stock', outOfStockProducts],
        ['Productos en Ecommerce', ecommerceProducts],
        ['Total de Categorías', categoriesCount],
        ['Valor Total del Inventario', `$${totalValue.toLocaleString()}`],
        ['Fecha de Exportación', new Date().toLocaleDateString('es-AR')],
        ['Hora de Exportación', new Date().toLocaleTimeString('es-AR')],
        [''],
        ['INVENTARIO DETALLADO']
      ];

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Hoja principal con inventario completo
      const wsData = [
        ...summaryData,
        [''],
        // Headers
        Object.keys(exportData[0] || {}),
        // Datos
        ...exportData.map(product => Object.values(product))
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Configurar anchos de columna
      const colWidths = [
        { wch: 25 }, // ID
        { wch: 30 }, // Nombre
        { wch: 20 }, // Categoría
        { wch: 15 }, // Precio de Venta
        { wch: 12 }, // Stock Actual
        { wch: 12 }, // Stock Mínimo
        { wch: 15 }, // Estado de Stock
        { wch: 20 }, // Código de Barras
        { wch: 30 }, // Descripción
        { wch: 20 }, // Proveedor
        { wch: 18 }, // Ecommerce Habilitado
        { wch: 12 }, // Estado
        { wch: 15 }, // Valor Total Stock
        { wch: 18 }  // Última Actualización
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Inventario General');

      // Hoja de productos con stock bajo
      if (lowStockProducts > 0 || outOfStockProducts > 0) {
        const alertProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 10));
        const alertData = alertProducts.map(product => {
          const price = product.precioVenta || product.price || 0;
          const stockStatus = getStockStatus(product);
          return {
            'Nombre': product.name,
            'Categoría': getCategoryName(product.category),
            'Stock Actual': product.stock || 0,
            'Stock Mínimo': product.minStock || 10,
            'Diferencia': (product.stock || 0) - (product.minStock || 10),
            'Estado': stockStatus.status,
            'Precio': price,
            'Valor Perdido': (product.stock || 0) === 0 ? (price * (product.minStock || 10)).toFixed(2) : '0'
          };
        });

        const alertWs = XLSX.utils.json_to_sheet(alertData);
        alertWs['!cols'] = [
          { wch: 30 }, // Nombre
          { wch: 20 }, // Categoría
          { wch: 12 }, // Stock Actual
          { wch: 12 }, // Stock Mínimo
          { wch: 12 }, // Diferencia
          { wch: 15 }, // Estado
          { wch: 15 }, // Precio
          { wch: 15 }  // Valor Perdido
        ];
        XLSX.utils.book_append_sheet(wb, alertWs, 'Alertas de Stock');
      }

      // Hoja de resumen por categorías
      const categoryStats = categories.map(categoryName => {
        const categoryProducts = products.filter(p => getCategoryName(p.category) === categoryName);
        const categoryValue = categoryProducts.reduce((sum, p) => sum + ((p.precioVenta || p.price || 0) * (p.stock || 0)), 0);
        const lowStock = categoryProducts.filter(p => (p.stock || 0) <= (p.minStock || 10) && (p.stock || 0) > 0).length;
        const outOfStock = categoryProducts.filter(p => (p.stock || 0) === 0).length;
        
        return {
          'Categoría': categoryName,
          'Total Productos': categoryProducts.length,
          'Stock Bajo': lowStock,
          'Sin Stock': outOfStock,
          'Productos OK': categoryProducts.length - lowStock - outOfStock,
          'Valor Total': `$${categoryValue.toLocaleString()}`,
          'En Ecommerce': categoryProducts.filter(p => p.habilitarEcommerce).length
        };
      });

      if (categoryStats.length > 0) {
        const categoryWs = XLSX.utils.json_to_sheet(categoryStats);
        categoryWs['!cols'] = [
          { wch: 25 }, // Categoría
          { wch: 15 }, // Total Productos
          { wch: 12 }, // Stock Bajo
          { wch: 12 }, // Sin Stock
          { wch: 15 }, // Productos OK
          { wch: 18 }, // Valor Total
          { wch: 15 }  // En Ecommerce
        ];
        XLSX.utils.book_append_sheet(wb, categoryWs, 'Resumen por Categorías');
      }

      // Generar nombre de archivo
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const fileName = `Inventario_${dateStr}_${timeStr}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Inventario exportado exitosamente",
        description: `Se exportaron ${totalProducts} productos a ${fileName}`
      });

    } catch (error) {
      console.error('Error exporting inventory:', error);
      toast({
        variant: "destructive",
        title: "Error al exportar inventario",
        description: "No se pudo generar el archivo de Excel. Intenta nuevamente."
      });
    }
  };

  // Función para abrir la vista completa del producto
  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setEditedProduct({...product}); // Crear una copia para editar
    setShowProductModal(true);
    setProductModalTab('general');
    setIsEditing(true); // Habilitar edición por defecto
  };

  // Función para cerrar la vista completa del producto
  const closeProductModal = () => {
    setSelectedProduct(null);
    setEditedProduct(null);
    setShowProductModal(false);
    setProductModalTab('general');
    setIsEditing(false);
  };

  // Función para guardar cambios del producto
  const saveProductChanges = async () => {
    if (!editedProduct || !selectedProduct) return;

    try {
      await updateDoc(doc(db, "products", selectedProduct.id), {
        ...editedProduct,
        lastModified: new Date()
      });

      // Actualizar estado local
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === selectedProduct.id ? editedProduct : product
        )
      );

      setSelectedProduct(editedProduct);
      
      toast({
        title: "Producto actualizado",
        description: "Los cambios se guardaron correctamente."
      });

    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios."
      });
    }
  };

  // Función para actualizar campos del producto editado
  const updateEditedProduct = (field: keyof Product, value: any) => {
    if (editedProduct) {
      setEditedProduct({
        ...editedProduct,
        [field]: value
      });
    }
  };

  return (
    <div className="inventory-container space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="inventory-stats-card metric-card total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Productos</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-sm flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="inventory-stats-card metric-card info">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Con Puntos</p>
                <p className="text-2xl font-bold text-gray-800">{stats.withRewards}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="inventory-stats-card metric-card warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Stock Bajo</p>
                <p className="text-2xl font-bold text-gray-800">{stats.lowStock}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="inventory-stats-card metric-card danger">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Sin Stock</p>
                <p className="text-2xl font-bold text-gray-800">{stats.outOfStock}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                <Archive className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="inventory-stats-card metric-card success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Valor Total</p>
                <p className="text-2xl font-bold text-gray-800">${stats.totalValue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-sm flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegación por pestañas */}
      <Card className="inventory-tabs">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="inventory-header">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-white">
                <Package className="w-5 h-5 mr-2" />
                Gestión de Inventario
              </CardTitle>
              <PermissionGate
                category="productos"
                permission={PERMISSIONS.PRODUCTOS.CREAR_NUEVOS}
                fallback={null}
              >
                <Button className="bg-white text-gray-700 hover:bg-gray-100 border border-gray-300">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Producto
                </Button>
              </PermissionGate>
            </div>
            <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-sm">
              <TabsTrigger 
                value="productos" 
                className="inventory-tab-trigger data-[state=active]:bg-white data-[state=active]:text-gray-700"
              >
                Lista de Productos
              </TabsTrigger>
              <TabsTrigger 
                value="alertas" 
                className="inventory-tab-trigger data-[state=active]:bg-white data-[state=active]:text-gray-700"
              >
                Alertas de Stock
              </TabsTrigger>
              <TabsTrigger 
                value="movimientos" 
                className="inventory-tab-trigger data-[state=active]:bg-white data-[state=active]:text-gray-700"
              >
                Movimientos
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {/* Tab: Lista de Productos */}
            <TabsContent value="productos" className="space-y-4">
              {/* Filtros */}
              <div className="filter-section">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar por nombre, código de barras..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48 bg-white border-gray-300">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-48 bg-white border-gray-300">
                      <SelectValue placeholder="Estado de stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los productos</SelectItem>
                      <SelectItem value="normal">En stock normal</SelectItem>
                      <SelectItem value="low">Stock bajo</SelectItem>
                      <SelectItem value="out">Sin stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabla de productos */}
              <div className="inventory-table">
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-lg font-semibold text-blue-700">Cargando productos...</p>
                      <p className="text-sm text-gray-600">Obteniendo inventario desde Firebase</p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Ecommerce</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => {
                        const stockStatus = getStockStatus(product);
                        const price = product.precioVenta || product.price || 0;
                        return (
                          <TableRow key={product.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.image && (
                                  <img 
                                    src={product.image} 
                                    alt={product.name}
                                    className="w-10 h-10 rounded object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW48L3RleHQ+PC9zdmc+';
                                    }}
                                  />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{product.name}</p>
                                    {product.puntosRecompensa && product.puntosRecompensa > 0 && (
                                      <div className="flex items-center">
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5">
                                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                          {product.tipoRecompensa === 'porcentaje' 
                                            ? `${product.puntosRecompensa}%` 
                                            : `${product.puntosRecompensa} pts`
                                          }
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  {product.description && (
                                    <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                                {getCategoryName(product.category)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">
                              ${price.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <p className="font-bold text-lg text-gray-900">{product.stock || 0}</p>
                                <p className="text-xs text-gray-500">Mín: {product.minStock || 10}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`status-badge ${
                                stockStatus.status === 'En Stock' ? 'stock-ok' :
                                stockStatus.status === 'Stock Bajo' ? 'stock-low' : 'stock-out'
                              }`}>
                                {stockStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={product.habilitarEcommerce === true}
                                  onCheckedChange={() => toggleEcommerce(product.id, product.habilitarEcommerce === true)}
                                  className="data-[state=checked]:bg-green-600"
                                />
                                <span className="text-xs text-gray-600">
                                  {product.habilitarEcommerce === true ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.barcode && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Barcode className="w-4 h-4" />
                                  <span className="text-sm font-mono">{product.barcode}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <PermissionGate
                                  category="inventarios"
                                  permission={PERMISSIONS.INVENTARIOS.AJUSTAR_INVENTARIO}
                                  fallback={null}
                                >
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="action-button"
                                    onClick={() => openProductModal(product)}
                                    title="Ver y editar detalles completos del producto"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </PermissionGate>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Controles de paginación */}
              {filteredProducts.length > itemsPerPage && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Mostrando {startItem} - {endItem} de {filteredProducts.length} productos
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-button"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={page}
                          className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      className="pagination-button"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No se encontraron productos</h3>
                  <p>No hay productos que coincidan con los filtros aplicados.</p>
                </div>
              )}
            </TabsContent>

            {/* Tab: Alertas de Stock */}
            <TabsContent value="alertas" className="space-y-4">
              <div className="space-y-4">
                {products.filter(p => (p.stock || 0) <= (p.minStock || 10)).map((product) => {
                  const price = product.precioVenta || product.price || 0;
                  return (
                    <Card key={product.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800">{product.name}</h3>
                            <p className="text-sm text-gray-600">{getCategoryName(product.category)}</p>
                            <p className="text-sm text-yellow-700">
                              Stock actual: <span className="font-bold">{product.stock || 0}</span> / 
                              Mínimo: <span className="font-bold">{product.minStock || 10}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Precio: <span className="font-medium">${price.toLocaleString()}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-yellow-500 text-white mb-2">
                              ⚠️ {(product.stock || 0) === 0 ? 'Sin Stock' : 'Stock Bajo'}
                            </Badge>
                            <div className="space-x-2">
                              <Button size="sm" variant="outline">
                                <Package className="w-4 h-4 mr-1" />
                                Reponer
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {products.filter(p => (p.stock || 0) <= (p.minStock || 10)).length === 0 && (
                  <div className="text-center py-8 text-green-600">
                    <Package className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-semibold mb-2">¡Todo en orden!</h3>
                    <p>No hay productos con stock bajo en este momento.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Movimientos */}
            <TabsContent value="movimientos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Últimos Movimientos de Inventario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { id: 1, product: 'Coca Cola 600ml', type: 'Entrada', quantity: 50, date: '2025-01-15', user: 'Admin' },
                      { id: 2, product: 'Pan Integral', type: 'Salida', quantity: -2, date: '2025-01-15', user: 'Vendedor' },
                      { id: 3, product: 'Leche Entera 1L', type: 'Ajuste', quantity: 5, date: '2025-01-14', user: 'Admin' },
                      { id: 4, product: 'Aceite Girasol 900ml', type: 'Venta', quantity: -1, date: '2025-01-14', user: 'POS' },
                    ].map((movement) => (
                      <div key={movement.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            movement.type === 'Entrada' ? 'bg-green-100 text-green-600' :
                            movement.type === 'Salida' || movement.type === 'Venta' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {movement.type === 'Entrada' ? <Plus className="w-5 h-5" /> :
                             movement.type === 'Salida' || movement.type === 'Venta' ? <Trash2 className="w-5 h-5" /> :
                             <Edit className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{movement.product}</p>
                            <p className="text-sm text-gray-500">{movement.type} • {movement.user}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </p>
                          <p className="text-sm text-gray-500">{movement.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Panel de acciones rápidas */}
      <Card className="bg-gray-50 border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-700">
            <Settings className="w-5 h-5 mr-2" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PermissionGate
              category="inventarios"
              permission={PERMISSIONS.INVENTARIOS.VER_REPORTES_EXISTENCIAS}
              fallback={null}
            >
              <div className="quick-action-button" onClick={exportInventoryToExcel}>
                <Download className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">Exportar Inventario</span>
              </div>
            </PermissionGate>

            <PermissionGate
              category="productos"
              permission={PERMISSIONS.PRODUCTOS.CREAR_NUEVOS}
              fallback={null}
            >
              <div className="quick-action-button">
                <Upload className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">Importar Productos</span>
              </div>
            </PermissionGate>

            <PermissionGate
              category="inventarios"
              permission={PERMISSIONS.INVENTARIOS.AJUSTAR_INVENTARIO}
              fallback={null}
            >
              <div className="quick-action-button">
                <RefreshCw className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">Ajuste Masivo</span>
              </div>
            </PermissionGate>

            <PermissionGate
              category="inventarios"
              permission={PERMISSIONS.INVENTARIOS.VER_REPORTES_EXISTENCIAS}
              fallback={null}
            >
              <div className="quick-action-button">
                <BarChart3 className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">Reportes</span>
              </div>
            </PermissionGate>
          </div>
        </CardContent>
      </Card>

      {/* Panel de métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Coca Cola 600ml', sales: 45, percentage: 85 },
                { name: 'Pan Integral', sales: 38, percentage: 70 },
                { name: 'Leche Entera 1L', sales: 32, percentage: 60 },
                { name: 'Aceite Girasol 900ml', sales: 28, percentage: 50 },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{item.name}</p>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2 progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 font-bold text-green-600 text-lg">{item.sales}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
              Alertas del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="alert-card warning flex items-center p-4 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Stock Crítico</p>
                  <p className="text-xs text-yellow-600">{stats.lowStock} productos necesitan reposición urgente</p>
                </div>
              </div>
              
              <div className="alert-card info flex items-center p-4 rounded-lg">
                <Package className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Inventario Saludable</p>
                  <p className="text-xs text-blue-600">{stats.total - stats.lowStock - stats.outOfStock} productos en stock normal</p>
                </div>
              </div>
              
              <div className="alert-card success flex items-center p-4 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Valor Total del Inventario</p>
                  <p className="text-xs text-green-600">Patrimonio total valorado en ${stats.totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Vista Completa del Producto */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedProduct?.image && (
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-12 h-12 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW48L3RleHQ+PC9zdmc+';
                  }}
                />
              )}
              <div>
                <h2 className="text-xl font-bold">{selectedProduct?.name}</h2>
                <p className="text-sm text-gray-500">ID: {selectedProduct?.id}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              {/* Navegación por pestañas dentro del modal */}
              <Tabs value={productModalTab} onValueChange={setProductModalTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="inventario">Inventario</TabsTrigger>
                  <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
                  <TabsTrigger value="contabilidad">Contabilidad</TabsTrigger>
                  <TabsTrigger value="historial">Historial</TabsTrigger>
                </TabsList>

                {/* Tab: Información General */}
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nombre del Producto</label>
                        <Input 
                          value={editedProduct?.name || ''} 
                          onChange={(e) => updateEditedProduct('name', e.target.value)}
                          className="mt-1" 
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Categoría</label>
                        <Select 
                          value={editedProduct?.category || ''} 
                          onValueChange={(value) => updateEditedProduct('category', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriesData
                              .filter(cat => cat.isMain && cat.name !== 'Todos')
                              .map(category => (
                                <SelectItem key={category.id} value={category.id || ''}>
                                  {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Descripción</label>
                        <textarea 
                          value={editedProduct?.description || ''} 
                          onChange={(e) => updateEditedProduct('description', e.target.value)}
                          className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none h-20"
                          placeholder="Descripción del producto..."
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Código de Barras</label>
                        <Input 
                          value={editedProduct?.barcode || ''} 
                          onChange={(e) => updateEditedProduct('barcode', e.target.value)}
                          className="mt-1" 
                          placeholder="Código de barras"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Precio de Venta</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-lg font-bold text-green-600">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={editedProduct?.precioVenta || editedProduct?.price || 0}
                            onChange={(e) => updateEditedProduct('precioVenta', parseFloat(e.target.value) || 0)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Estado del Producto</label>
                        <Select 
                          value={editedProduct?.status || 'active'} 
                          onValueChange={(value) => updateEditedProduct('status', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="discontinued">Descontinuado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Disponible en Ecommerce</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Switch 
                            checked={editedProduct?.habilitarEcommerce === true} 
                            onCheckedChange={(checked) => updateEditedProduct('habilitarEcommerce', checked)}
                          />
                          <span className="text-sm">
                            {editedProduct?.habilitarEcommerce === true ? 'Habilitado' : 'Deshabilitado'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">URL de Imagen</label>
                        <Input 
                          value={editedProduct?.image || ''} 
                          onChange={(e) => updateEditedProduct('image', e.target.value)}
                          className="mt-1" 
                          placeholder="https://..."
                        />
                      </div>
                      
                      {/* Configuración de Puntos de Recompensa */}
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <h4 className="font-medium text-blue-800 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                          </svg>
                          Sistema de Puntos de Recompensa
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Tipo de Recompensa</label>
                            <Select 
                              value={editedProduct?.tipoRecompensa || 'fijo'} 
                              onValueChange={(value) => updateEditedProduct('tipoRecompensa', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fijo">Puntos Fijos por Producto</SelectItem>
                                <SelectItem value="porcentaje">Porcentaje del Precio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              {editedProduct?.tipoRecompensa === 'porcentaje' ? 'Porcentaje (%)' : 'Puntos por Compra'}
                            </label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Input
                                type="number"
                                step={editedProduct?.tipoRecompensa === 'porcentaje' ? '0.1' : '1'}
                                min="0"
                                value={editedProduct?.puntosRecompensa || 0}
                                onChange={(e) => updateEditedProduct('puntosRecompensa', parseFloat(e.target.value) || 0)}
                                className="flex-1"
                                placeholder={editedProduct?.tipoRecompensa === 'porcentaje' ? '1.5' : '10'}
                              />
                              <span className="text-sm text-gray-500">
                                {editedProduct?.tipoRecompensa === 'porcentaje' ? '%' : 'pts'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Vista previa de puntos */}
                        <div className="bg-white p-3 rounded border border-blue-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Vista Previa:</p>
                          <p className="text-sm text-gray-600">
                            {(() => {
                              const precio = editedProduct?.precioVenta || editedProduct?.price || 0;
                              const puntos = editedProduct?.puntosRecompensa || 0;
                              const tipo = editedProduct?.tipoRecompensa || 'fijo';
                              
                              if (tipo === 'porcentaje') {
                                const puntosCalculados = Math.floor((precio * puntos) / 100);
                                return `Por cada compra de $${precio.toLocaleString()} → Cliente gana ${puntosCalculados} puntos (${puntos}%)`;
                              } else {
                                return `Por cada compra → Cliente gana ${puntos} puntos fijos`;
                              }
                            })()}
                          </p>
                          
                          {editedProduct?.puntosRecompensa && editedProduct.puntosRecompensa > 0 && (
                            <div className="mt-2 flex items-center text-green-600 text-sm">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Sistema de puntos activado para este producto
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {editedProduct?.image && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Vista previa de imagen</label>
                          <div className="mt-1">
                            <img 
                              src={editedProduct.image} 
                              alt={editedProduct.name}
                              className="w-32 h-32 rounded-lg object-cover border"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW48L3RleHQ+PC9zdmc+';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Inventario */}
                <TabsContent value="inventario" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Stock Actual</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center space-y-2">
                          <Input
                            type="number"
                            value={editedProduct?.stock || 0}
                            onChange={(e) => updateEditedProduct('stock', parseInt(e.target.value) || 0)}
                            className="text-center text-2xl font-bold"
                          />
                          <p className="text-xs text-gray-500">unidades disponibles</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Stock Mínimo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center space-y-2">
                          <Input
                            type="number"
                            value={editedProduct?.minStock || 10}
                            onChange={(e) => updateEditedProduct('minStock', parseInt(e.target.value) || 10)}
                            className="text-center text-2xl font-bold"
                          />
                          <p className="text-xs text-gray-500">límite de reposición</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Valor en Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">
                            ${((editedProduct?.precioVenta || editedProduct?.price || 0) * (editedProduct?.stock || 0)).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">valor total</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Estado de Stock</label>
                      <div className="mt-1">
                        <Badge className={`${
                          editedProduct && getStockStatus(editedProduct).status === 'En Stock' ? 'bg-green-500' :
                          editedProduct && getStockStatus(editedProduct).status === 'Stock Bajo' ? 'bg-yellow-500' : 'bg-red-500'
                        } text-white`}>
                          {editedProduct ? getStockStatus(editedProduct).status : 'Sin Stock'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Proveedor</label>
                        <Input 
                          value={editedProduct?.supplier || ''} 
                          onChange={(e) => updateEditedProduct('supplier', e.target.value)}
                          className="mt-1" 
                          placeholder="Nombre del proveedor"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Ubicación en Almacén</label>
                        <Input 
                          value=""
                          placeholder="Ej: A1-B2-C3"
                          className="mt-1" 
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-3">Ajustes Rápidos de Stock</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateEditedProduct('stock', (editedProduct?.stock || 0) + 1)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          +1
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateEditedProduct('stock', (editedProduct?.stock || 0) + 10)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          +10
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateEditedProduct('stock', Math.max(0, (editedProduct?.stock || 0) - 1))}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          -1
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateEditedProduct('stock', Math.max(0, (editedProduct?.stock || 0) - 10))}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          -10
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateEditedProduct('stock', 0)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Resetear
                        </Button>
                      </div>
                    </div>

                    {/* Información de Puntos de Recompensa */}
                    {editedProduct?.puntosRecompensa && editedProduct.puntosRecompensa > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Configuración de Puntos de Recompensa
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-3 rounded border border-purple-100">
                            <p className="text-sm font-medium text-gray-700">Tipo de Recompensa</p>
                            <p className="text-lg font-bold text-purple-600">
                              {editedProduct?.tipoRecompensa === 'porcentaje' ? 'Porcentaje' : 'Puntos Fijos'}
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-purple-100">
                            <p className="text-sm font-medium text-gray-700">Valor Configurado</p>
                            <p className="text-lg font-bold text-purple-600">
                              {editedProduct?.puntosRecompensa} {editedProduct?.tipoRecompensa === 'porcentaje' ? '%' : 'puntos'}
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-purple-100">
                            <p className="text-sm font-medium text-gray-700">Puntos por Compra</p>
                            <p className="text-lg font-bold text-purple-600">
                              {(() => {
                                const precio = editedProduct?.precioVenta || editedProduct?.price || 0;
                                const puntos = editedProduct?.puntosRecompensa || 0;
                                const tipo = editedProduct?.tipoRecompensa || 'fijo';
                                
                                if (tipo === 'porcentaje') {
                                  return Math.floor((precio * puntos) / 100);
                                } else {
                                  return puntos;
                                }
                              })()} puntos
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 bg-white p-3 rounded border border-purple-100">
                          <p className="text-sm text-gray-600">
                            <strong>Simulación:</strong> Si un cliente compra {editedProduct?.stock || 1} unidad(es) de este producto, 
                            ganará un total de{' '}
                            <span className="font-bold text-purple-600">
                              {(() => {
                                const precio = editedProduct?.precioVenta || editedProduct?.price || 0;
                                const puntos = editedProduct?.puntosRecompensa || 0;
                                const tipo = editedProduct?.tipoRecompensa || 'fijo';
                                const stock = editedProduct?.stock || 1;
                                
                                if (tipo === 'porcentaje') {
                                  return Math.floor((precio * puntos) / 100) * stock;
                                } else {
                                  return puntos * stock;
                                }
                              })()} puntos
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Proveedores */}
                <TabsContent value="proveedores" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Proveedor Principal</label>
                      <Input 
                        value={selectedProduct.supplier || 'Sin proveedor asignado'} 
                        readOnly 
                        className="mt-1" 
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-3">Información del Proveedor</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-600">Nombre/Empresa</label>
                          <p className="font-medium">{selectedProduct.supplier || 'No especificado'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Teléfono</label>
                          <p className="font-medium">Sin información</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Email</label>
                          <p className="font-medium">Sin información</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Tiempo de Entrega</label>
                          <p className="font-medium">Sin información</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Acciones</h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar Proveedor
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-1" />
                          Editar Información
                        </Button>
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-1" />
                          Generar Orden
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Contabilidad */}
                <TabsContent value="contabilidad" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">IVA Aplicable</label>
                        <Select defaultValue="21">
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0% - Exento</SelectItem>
                            <SelectItem value="10.5">10.5% - Reducido</SelectItem>
                            <SelectItem value="21">21% - General</SelectItem>
                            <SelectItem value="27">27% - Incrementado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Precio Costo</label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Margen de Ganancia</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input type="number" placeholder="0" className="flex-1" />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Código Contable</label>
                        <Input placeholder="Ej: 1.1.01.001" className="mt-1" />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Centro de Costo</label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar centro" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ventas">Ventas</SelectItem>
                            <SelectItem value="almacen">Almacén</SelectItem>
                            <SelectItem value="administracion">Administración</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Cuenta Contable</label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar cuenta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mercaderias">Mercaderías</SelectItem>
                            <SelectItem value="materias-primas">Materias Primas</SelectItem>
                            <SelectItem value="productos-terminados">Productos Terminados</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-3">Resumen Contable</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Precio sin IVA:</span>
                        <p className="font-bold">${((selectedProduct.precioVenta || selectedProduct.price || 0) / 1.21).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">IVA (21%):</span>
                        <p className="font-bold">${(((selectedProduct.precioVenta || selectedProduct.price || 0) / 1.21) * 0.21).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Precio Final:</span>
                        <p className="font-bold">${(selectedProduct.precioVenta || selectedProduct.price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Valor en Stock:</span>
                        <p className="font-bold">${((selectedProduct.precioVenta || selectedProduct.price || 0) * (selectedProduct.stock || 0)).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Historial */}
                <TabsContent value="historial" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-800">Historial de Modificaciones</h4>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />
                        Exportar Historial
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {/* Ejemplo de historial */}
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">Producto creado</p>
                            <p className="text-xs text-gray-500">Se creó el producto con stock inicial de {selectedProduct.stock || 0} unidades</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {selectedProduct.lastUpdated ? 
                                new Date(selectedProduct.lastUpdated).toLocaleDateString('es-AR') : 
                                'Sin fecha'
                              }
                            </p>
                            <p className="text-xs text-gray-400">Usuario: Admin</p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">Modificación de precio</p>
                            <p className="text-xs text-gray-500">Precio actualizado a ${(selectedProduct.precioVenta || selectedProduct.price || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Hoy</p>
                            <p className="text-xs text-gray-400">Usuario: Admin</p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">Estado de ecommerce</p>
                            <p className="text-xs text-gray-500">
                              Producto {selectedProduct.habilitarEcommerce ? 'habilitado' : 'deshabilitado'} en tienda online
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Ayer</p>
                            <p className="text-xs text-gray-400">Usuario: Admin</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">Estadísticas de Actividad</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Modificaciones:</span>
                          <p className="font-bold">3</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Última Actualización:</span>
                          <p className="font-bold">
                            {selectedProduct.lastUpdated ? 
                              new Date(selectedProduct.lastUpdated).toLocaleDateString('es-AR') : 
                              'Sin registro'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Creado:</span>
                          <p className="font-bold">Sin registro</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Estado:</span>
                          <p className="font-bold text-green-600">Activo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Botones de acción del modal */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Editando en tiempo real</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={closeProductModal}>
                    Cancelar
                  </Button>
                  <PermissionGate
                    category="productos"
                    permission={PERMISSIONS.PRODUCTOS.MODIFICAR_PRODUCTOS}
                    fallback={null}
                  >
                    <Button onClick={saveProductChanges}>
                      <Download className="w-4 h-4 mr-1" />
                      Guardar Cambios
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSInventoryManager;
