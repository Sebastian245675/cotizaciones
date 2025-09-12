import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Bell, MessageCircle, Clock, CheckCircle, XCircle, Trash2, Check, RefreshCw, Filter, Mail, Calendar, Download, BarChart3, FileText, ShoppingBag, Plus, DollarSign, CreditCard } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, limit, where, updateDoc, doc, deleteDoc, getDocs, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Extendemos la definición de jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface OrdersListProps {
  orders?: any[];
}

// CSS personalizado para ayudar con la responsividad
const responsiveStyles = `
  @media (max-width: 500px) {
    .responsive-table {
      font-size: 0.7rem;
    }
  }
`;

export const OrdersList: React.FC<OrdersListProps> = ({ orders: initialOrders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<any[]>(initialOrders || []);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed'
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currentTab, setCurrentTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Estados para el modal de venta física
  const [showPhysicalSaleModal, setShowPhysicalSaleModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [savingPhysicalSale, setSavingPhysicalSale] = useState(false);
  
  // Estado del formulario de venta física
  const [physicalSaleData, setPhysicalSaleData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    paymentMethod: 'efectivo', // 'efectivo', 'tarjeta', 'transferencia'
    notes: '',
  });
  
  // Estado para búsqueda de productos
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Cargar pedidos reales de Firestore
  useEffect(() => {
    fetchOrders();
  }, []);
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Usamos query para ordenar por fecha de creación descendente (más reciente primero)
      const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error al cargar pedidos",
        description: "No se pudieron cargar los pedidos. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };
  
  // Obtener productos para la venta física
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error al cargar productos",
        description: "No se pudieron cargar los productos disponibles.",
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };
  
  // Abrir modal de venta física y cargar productos
  const handleOpenPhysicalSaleModal = () => {
    setSelectedProducts([]);
    setPhysicalSaleData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      paymentMethod: 'efectivo',
      notes: '',
    });
    setProductSearchTerm('');
    fetchProducts();
    setShowPhysicalSaleModal(true);
  };
  
  // Gestionar la selección de productos
  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Verificar si ya está en la lista
      const existingProduct = selectedProducts.find(p => p.id === productId);
      if (existingProduct) {
        // Si ya existe, aumentar la cantidad
        setSelectedProducts(selectedProducts.map(p => 
          p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
        ));
      } else {
        // Si no existe, añadir con cantidad 1
        setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
      }
    }
  };
  
  // Actualizar cantidad de un producto
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      // Eliminar el producto si la cantidad es 0 o menos
      setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    } else {
      // Actualizar la cantidad
      setSelectedProducts(selectedProducts.map(p => 
        p.id === productId ? { ...p, quantity } : p
      ));
    }
  };
  
  // Eliminar un producto de la selección
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };
  
  // Calcular el total de la venta
  const calculateTotal = () => {
    return selectedProducts.reduce((total, product) => {
      const price = parseFloat(product.price) || 0;
      return total + (price * product.quantity);
    }, 0);
  };
  
  // Guardar la venta física
  const handleSavePhysicalSale = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No hay productos seleccionados",
        description: "Debe seleccionar al menos un producto para registrar la venta.",
        variant: "destructive"
      });
      return;
    }
    
    if (!physicalSaleData.customerName) {
      toast({
        title: "Nombre del cliente requerido",
        description: "Por favor, ingrese el nombre del cliente.",
        variant: "destructive"
      });
      return;
    }
    
    setSavingPhysicalSale(true);
    
    try {
      // Preparar los datos de la venta
      const items = selectedProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price) || 0,
        quantity: product.quantity,
        image: product.image || ""
      }));
      
      const total = calculateTotal();
      
      // Crear un nuevo pedido en la colección "orders"
      await addDoc(collection(db, "orders"), {
        userName: physicalSaleData.customerName,
        userPhone: physicalSaleData.customerPhone,
        userEmail: physicalSaleData.customerEmail,
        items,
        total,
        status: "confirmed", // Las ventas físicas ya están confirmadas
        createdAt: serverTimestamp(),
        confirmedAt: serverTimestamp(),
        orderType: "physical", // Para identificar que es una venta física
        paymentMethod: physicalSaleData.paymentMethod,
        orderNotes: physicalSaleData.notes,
        physicalSale: true
      });
      
      toast({
        title: "Venta registrada exitosamente",
        description: `Se ha registrado la venta por $${total.toLocaleString()}.`,
        variant: "default"
      });
      
      // Forzar actualización del dashboard
      console.log("Disparando evento de actualización del dashboard con total:", total);
      const dashboardUpdateEvent = new CustomEvent('dashboardUpdate', { 
        detail: { 
          type: 'orderConfirmed',
          orderTotal: total
        } 
      });
      document.dispatchEvent(dashboardUpdateEvent);
      
      // Forzar recarga de las estadísticas - busca el botón de actualizar del dashboard y haz clic en él
      setTimeout(() => {
        const refreshButton = document.querySelector('.dashboard-refresh-button');
        if (refreshButton && refreshButton instanceof HTMLButtonElement) {
          console.log("Forzando recarga de estadísticas");
          refreshButton.click();
        }
      }, 500);
      
      // Cerrar el modal y actualizar la lista de pedidos
      setShowPhysicalSaleModal(false);
      fetchOrders();
      
    } catch (error) {
      console.error("Error registrando la venta física:", error);
      toast({
        title: "Error al registrar la venta",
        description: "No se pudo registrar la venta. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSavingPhysicalSale(false);
    }
  };

  // Confirmar pedido
  const handleConfirm = async (orderId: string) => {
    try {
      // Obtener la información del pedido actual
      const orderRef = doc(db, "orders", orderId);
      const orderSnapshot = await getDoc(orderRef);
      
      if (!orderSnapshot.exists()) {
        throw new Error("No se encontró el pedido");
      }
      
      const orderData = orderSnapshot.data();
      
      // Actualizar el estado del pedido a confirmado
      await updateDoc(orderRef, { 
        status: "confirmed",
        confirmedAt: new Date().toISOString()
      });
      
      // Actualizar la UI
      setOrders(orders =>
        orders.map(order =>
          order.id === orderId ? { 
            ...order, 
            status: "confirmed",
            confirmedAt: new Date().toISOString()
          } : order
        )
      );
      
      toast({
        title: "Pedido confirmado",
        description: "El pedido ha sido confirmado exitosamente.",
        variant: "default"
      });
      
      // Forzar actualización del dashboard
      // Esta acción sería ideal para un sistema de eventos o context
      // pero para simplificar usaremos un evento personalizado
      const dashboardUpdateEvent = new CustomEvent('dashboardUpdate', { 
        detail: { 
          type: 'orderConfirmed',
          orderTotal: orderData.total || 0
        } 
      });
      document.dispatchEvent(dashboardUpdateEvent);
      
      // Forzar recarga de las estadísticas - busca el botón de actualizar del dashboard y haz clic en él
      setTimeout(() => {
        const refreshButton = document.querySelector('.dashboard-refresh-button');
        if (refreshButton && refreshButton instanceof HTMLButtonElement) {
          console.log("Forzando recarga de estadísticas");
          refreshButton.click();
        }
      }, 500);
    } catch (error) {
      console.error("Error confirming order:", error);
      toast({
        title: "Error al confirmar",
        description: "No se pudo confirmar el pedido. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  // Eliminar pedido
  const handleDelete = async (orderId: string) => {
    if (!confirm("¿Está seguro que desea eliminar este pedido? Esta acción no se puede deshacer.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders(orders => orders.filter(order => order.id !== orderId));
      toast({
        title: "Pedido eliminado",
        description: "El pedido ha sido eliminado exitosamente.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el pedido. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    }
  };
  
  // Manejar cambio en el notificador
  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast({
      title: "Función no disponible",
      description: "El notificador de pedidos por correos aún no está disponible en esta tienda.",
      variant: "destructive"
    });
  };
  
  // Exportar pedidos como CSV
  const exportToCSV = () => {
    setExporting(true);
    
    try {
      // Crear el contenido CSV
      const headers = ["ID", "Cliente", "Email", "Teléfono", "Productos", "Total", "Estado", "Fecha Creación", "Fecha Confirmación", "Notas"];
      
      const csvRows = [headers];
      
      // Agregar datos de pedidos
      filteredOrders.forEach(order => {
        const productsList = order.items && order.items.length > 0 
          ? order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ")
          : "Sin productos";
          
        const row = [
          order.id || "",
          order.userName || "",
          order.userEmail || "",
          order.userPhone || "",
          productsList,
          typeof order.total === 'number' ? order.total.toLocaleString() : '0',
          order.status === 'confirmed' ? 'Confirmado' : 'En espera',
          order.createdAt ? formatDate(order.createdAt) : 'N/A',
          order.confirmedAt ? formatDate(order.confirmedAt) : 'N/A',
          order.orderNotes || ""
        ];
        
        csvRows.push(row);
      });
      
      // Convertir array a string CSV
      const csvContent = csvRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
           .join(',')
      ).join('\n');
      
      // Crear el blob y descargarlo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `pedidos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportación exitosa",
        description: `Se han exportado ${filteredOrders.length} pedidos en formato CSV.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        title: "Error en la exportación",
        description: "No se pudieron exportar los pedidos. Inténtelo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };
  
  // Exportar pedidos como PDF
  const exportToPDF = () => {
    setExporting(true);
    
    try {
      // Crear el documento PDF
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(16);
      doc.text("Reporte de Pedidos", 14, 15);
      
      // Añadir fecha
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 14, 22);
      
      // Añadir filtros utilizados
      if (searchTerm || currentTab !== 'all') {
        let filtersText = "Filtros: ";
        if (searchTerm) filtersText += `Búsqueda: "${searchTerm}" `;
        if (currentTab !== 'all') filtersText += `Estado: ${currentTab === 'pending' ? 'Pendientes' : 'Confirmados'}`;
        doc.text(filtersText, 14, 27);
      }
      
      // Preparar datos para la tabla
      const tableColumn = ["Cliente", "Contacto", "Productos", "Total", "Estado", "Fecha"];
      const tableRows = filteredOrders.map(order => {
        const productsList = order.items && order.items.length > 0 
          ? order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ")
          : "Sin productos";
        
        return [
          order.userName || "Cliente",
          `${order.userPhone || "No especificado"}\n${order.userEmail || ""}`,
          productsList.length > 40 ? `${productsList.substring(0, 40)}...` : productsList,
          typeof order.total === 'number' ? `$${order.total.toLocaleString()}` : '$0',
          order.status === 'confirmed' ? 'Confirmado' : 'En espera',
          formatDate(order.createdAt)
        ];
      });
      
      // Crear tabla en el PDF
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 30 },  // Cliente
          1: { cellWidth: 40 },  // Contacto
          2: { cellWidth: 60 },  // Productos
          3: { cellWidth: 15 },  // Total
          4: { cellWidth: 20 },  // Estado
          5: { cellWidth: 25 },  // Fecha
        }
      });
      
      // Añadir información al pie de página
      const finalY = doc.lastAutoTable.finalY || 32;
      doc.setFontSize(10);
      doc.text(`Total de pedidos: ${filteredOrders.length}`, 14, finalY + 10);
      
      // Añadir contador de estados
      const confirmedCount = filteredOrders.filter(order => order.status === 'confirmed').length;
      const pendingCount = filteredOrders.filter(order => order.status !== 'confirmed').length;
      doc.text(`Confirmados: ${confirmedCount} | Pendientes: ${pendingCount}`, 14, finalY + 16);
      
      // Guardar el PDF
      doc.save(`reporte_pedidos_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Exportación exitosa",
        description: `Se han exportado ${filteredOrders.length} pedidos en formato PDF.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Error en la exportación",
        description: "No se pudieron exportar los pedidos a PDF. Inténtelo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string, isPhysical: boolean) => {
    if (isPhysical) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">Venta Física</Badge>;
    }
    
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 border-green-200 font-medium">Confirmado</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 font-medium">En espera</Badge>;
    }
  };

  const getStatusIcon = (status: string, isPhysical: boolean) => {
    if (isPhysical) {
      return <ShoppingBag className="h-4 w-4 text-blue-600" />;
    }
    
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };
  
  const formatDate = (dateString?: any) => {
    if (!dateString) return 'N/A';
    
    try {
      // Si es un timestamp de Firestore
      if (typeof dateString === 'object' && dateString.seconds) {
        return new Intl.DateTimeFormat('es-ES', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(dateString.seconds * 1000));
      }
      
      // Si es una cadena ISO
      const date = new Date(dateString);
      
      // Validar si la fecha es válida
      if (isNaN(date.getTime())) {
        // Intentar convertir de timestamp numérico si es un número
        if (!isNaN(Number(dateString))) {
          return new Intl.DateTimeFormat('es-ES', { 
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(Number(dateString)));
        }
        
        // Si llegamos aquí, no pudimos formatear la fecha
        console.error("Fecha inválida:", dateString);
        return new Date().toLocaleDateString('es-ES');
      }
      
      return new Intl.DateTimeFormat('es-ES', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return new Date().toLocaleDateString('es-ES');
    }
  };

  const filteredOrders = orders
    .filter(order =>
      (order.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(order => {
      if (currentTab === 'all') return true;
      if (currentTab === 'pending') return order.status !== 'confirmed' && !order.physicalSale;
      if (currentTab === 'confirmed') return order.status === 'confirmed' && !order.physicalSale;
      if (currentTab === 'physical') return !!order.physicalSale;
      return true;
    });

  return (
    <Card className="border-0 shadow-md">
      <style>{responsiveStyles}</style>
      <CardHeader className="pb-0">
        {/* Encabezado responsivo */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-primary text-xl md:text-2xl">
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Gestión de Pedidos
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Button 
              size="sm" 
              variant="default"
              onClick={handleOpenPhysicalSaleModal}
              className="flex items-center gap-1 text-xs h-8 bg-green-600 hover:bg-green-700"
            >
              <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden xs:inline">Venta Física</span>
              <Plus className="h-3 w-3 md:h-4 md:w-4 xs:hidden" />
            </Button>
            
            <div className="flex items-center gap-1 mr-2">
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
              />
              <label htmlFor="notifications" className="text-xs md:text-sm text-muted-foreground cursor-pointer flex items-center gap-1">
                <Bell className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Notificador por email</span>
                <span className="sm:hidden">Notificaciones</span>
              </label>
            </div>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleRefresh} 
              disabled={refreshing}
              className="flex items-center gap-1 text-xs h-8"
            >
              <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex items-center gap-1 text-xs h-8" 
                  disabled={exporting || filteredOrders.length === 0}
                >
                  {exporting ? (
                    <RefreshCw className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} disabled={exporting || filteredOrders.length === 0}>
                  Exportar como CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} disabled={exporting || filteredOrders.length === 0}>
                  Exportar como PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <CardDescription className="mt-2 flex items-center justify-between text-xs md:text-sm">
          <span className="text-muted-foreground">
            {refreshing ? 'Actualizando pedidos...' : 
              filteredOrders.length === 0 ? 'No se encontraron pedidos' :
              `Total ${filteredOrders.length} ${filteredOrders.length === 1 ? 'pedido' : 'pedidos'}`}
          </span>
        </CardDescription>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-4 md:mt-6">
          <TabsList className="mb-2 bg-muted/50 w-full h-9 md:h-10">
            <TabsTrigger value="all" className="text-xs md:text-sm data-[state=active]:bg-background">
              Todos
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs md:text-sm data-[state=active]:bg-background">
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs md:text-sm data-[state=active]:bg-background">
              Confirmados
            </TabsTrigger>
            <TabsTrigger value="physical" className="text-xs md:text-sm data-[state=active]:bg-background">
              Ventas Físicas
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 mt-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 md:h-4 md:w-4" />
              <Input
                placeholder="Buscar..."
                className="pl-8 text-xs md:text-sm h-8 md:h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button size="icon" variant="outline" className="h-8 md:h-10 w-8 md:w-10">
              <Filter className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-2 px-2 md:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Cargando pedidos...</span>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden overflow-x-auto responsive-table">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-medium text-xs md:text-sm whitespace-nowrap">Cliente</TableHead>
                  <TableHead className="font-medium text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Contacto</TableHead>
                  <TableHead className="font-medium text-xs md:text-sm whitespace-nowrap hidden md:table-cell">Productos</TableHead>
                  <TableHead className="font-medium text-xs md:text-sm whitespace-nowrap">Total</TableHead>
                  <TableHead className="font-medium text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="font-medium text-xs md:text-sm whitespace-nowrap">Estado</TableHead>
                  <TableHead className="text-right font-medium text-xs md:text-sm whitespace-nowrap">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30 text-xs md:text-sm">
                    {/* Cliente - Siempre visible */}
                    <TableCell className="py-2 md:py-4">
                      <div>
                        <div className="font-semibold text-xs md:text-sm line-clamp-1">
                          {order.userName || 'Cliente'}
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground mt-1 hidden xs:block">
                          ID: {order.id.substring(0, 6)}...
                        </div>
                      </div>
                    </TableCell>

                    {/* Contacto - Oculto en móvil */}
                    <TableCell className="hidden sm:table-cell py-2 md:py-4">
                      <div>
                        <div className="font-medium text-xs md:text-sm flex items-center gap-1 line-clamp-1">
                          {order.userPhone || 'No especificado'}
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-1">
                          {order.userEmail}
                        </div>
                      </div>
                    </TableCell>

                    {/* Productos - Oculto en móvil */}
                    <TableCell className="hidden md:table-cell py-2 md:py-4">
                      <div className="max-w-[140px] md:max-w-[200px] overflow-hidden">
                        {order.items && order.items.length > 0 ? (
                          <>
                            {order.items.slice(0, 2).map((item: any, idx: number) => (
                              <div key={idx} className="text-xs md:text-sm flex items-center gap-1 mb-1">
                                <Badge variant="outline" className="px-1 py-0 h-4 md:h-5 text-[10px] md:text-xs rounded">
                                  {item.quantity}
                                </Badge>
                                <span className="truncate max-w-[90px] md:max-w-[140px]" title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                +{order.items.length - 2} más
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] md:text-xs text-muted-foreground">Sin productos</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Total - Siempre visible */}
                    <TableCell className="py-2 md:py-4">
                      <div className="font-semibold text-green-600 text-xs md:text-sm whitespace-nowrap">
                        ${typeof order.total === 'number' ? order.total.toLocaleString() : '0'}
                      </div>
                    </TableCell>

                    {/* Fecha - Oculto en móvil */}
                    <TableCell className="hidden sm:table-cell py-2 md:py-4">
                      <div>
                        <div className="text-[10px] md:text-xs font-medium">
                          {formatDate(order.createdAt)}
                        </div>
                        {order.status === 'confirmed' && order.confirmedAt && (
                          <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                            Conf: {formatDate(order.confirmedAt)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Estado - Siempre visible */}
                    <TableCell className="py-2 md:py-4">
                      <div className="flex items-center gap-1 md:gap-2">
                        {getStatusIcon(order.status || 'pending', !!order.physicalSale)}
                        {getStatusBadge(order.status || 'pending', !!order.physicalSale)}
                      </div>
                      {order.orderNotes && (
                        <div className="text-[10px] md:text-xs text-muted-foreground mt-1 italic truncate max-w-[80px] md:max-w-[120px] hidden sm:block" title={order.orderNotes}>
                          "{order.orderNotes}"
                        </div>
                      )}
                      {order.paymentMethod && (
                        <div className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate max-w-[80px] md:max-w-[120px]">
                          Pago: {order.paymentMethod === 'efectivo' ? 'Efectivo' : order.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
                        </div>
                      )}
                    </TableCell>

                    {/* Acciones - Siempre visible */}
                    <TableCell className="text-right py-2 md:py-4">
                      <div className="flex justify-end gap-1 md:gap-2">
                        {order.status !== "confirmed" && !order.physicalSale && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirm(order.id)}
                            className="text-green-600 border-green-300 hover:bg-green-50 h-7 w-7 p-0 md:h-8 md:w-8"
                            title="Confirmar pedido"
                          >
                            <Check className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50 h-7 w-7 p-0 md:h-8 md:w-8"
                          title="Eliminar pedido"
                        >
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredOrders.length === 0 && !loading && (
          <div className="text-center py-8 md:py-12 border rounded-lg bg-muted/10 mx-auto">
            <div className="flex flex-col items-center max-w-[280px] md:max-w-md mx-auto px-4">
              <div className="rounded-full bg-muted p-2 md:p-3 mb-3 md:mb-4">
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-base md:text-lg mb-1">No hay pedidos disponibles</h3>
              <span className="text-muted-foreground text-xs md:text-sm mb-3 md:mb-4 block">
                No se encontraron pedidos con los criterios de búsqueda actuales.
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('');
                  setCurrentTab('all');
                }}
                className="text-xs md:text-sm h-8 md:h-9"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Modal para registrar venta física */}
      <Dialog open={showPhysicalSaleModal} onOpenChange={setShowPhysicalSaleModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Registrar Venta Física
            </DialogTitle>
            <DialogDescription>
              Complete el formulario para registrar una venta realizada en tienda física.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Columna izquierda: Datos del cliente */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Datos de la venta
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre del cliente *</Label>
                  <Input 
                    id="customerName" 
                    placeholder="Nombre completo" 
                    value={physicalSaleData.customerName}
                    onChange={(e) => setPhysicalSaleData({...physicalSaleData, customerName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Teléfono</Label>
                  <Input 
                    id="customerPhone" 
                    placeholder="Número de teléfono" 
                    value={physicalSaleData.customerPhone}
                    onChange={(e) => setPhysicalSaleData({...physicalSaleData, customerPhone: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Correo electrónico</Label>
                  <Input 
                    id="customerEmail" 
                    placeholder="Email" 
                    type="email"
                    value={physicalSaleData.customerEmail}
                    onChange={(e) => setPhysicalSaleData({...physicalSaleData, customerEmail: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de pago</Label>
                  <Select
                    value={physicalSaleData.paymentMethod}
                    onValueChange={(value) => setPhysicalSaleData({...physicalSaleData, paymentMethod: value})}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Seleccione método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>Efectivo</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tarjeta">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>Tarjeta</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="transferencia">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          <span>Transferencia</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Input 
                    id="notes" 
                    placeholder="Notas o comentarios" 
                    value={physicalSaleData.notes}
                    onChange={(e) => setPhysicalSaleData({...physicalSaleData, notes: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total:</span>
                  <span className="text-lg text-green-600">${calculateTotal().toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Columna derecha: Productos */}
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Productos seleccionados
              </h3>
              
              {/* Lista de productos seleccionados */}
              <div className="rounded-md border max-h-[300px] overflow-y-auto mb-4">
                {selectedProducts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No hay productos seleccionados
                  </div>
                ) : (
                  <div className="divide-y">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="p-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {product.image ? (
                            <div className="h-10 w-10 rounded-md overflow-hidden">
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                              <ShoppingBag className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground">${parseFloat(product.price).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-xs rounded-r-none"
                              onClick={() => handleUpdateQuantity(product.id, product.quantity - 1)}
                            >
                              -
                            </Button>
                            <div className="h-6 px-2 border-y flex items-center justify-center text-xs min-w-[30px]">
                              {product.quantity}
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-xs rounded-l-none"
                              onClick={() => handleUpdateQuantity(product.id, product.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveProduct(product.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selector de productos disponibles */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm">Agregar productos</Label>
                  {loadingProducts && <RefreshCw className="h-3 w-3 animate-spin" />}
                </div>
                
                {/* Buscador de productos */}
                <div className="mb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar productos..." 
                      className="pl-8 text-xs h-8"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                    />
                    {productSearchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-8 w-8 px-0"
                        onClick={() => setProductSearchTerm('')}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  
                  {productSearchTerm && (
                    <div className="text-xs text-muted-foreground mt-1 px-1">
                      {products.filter(product => 
                        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                        (product.description && product.description.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
                        (product.id && product.id.toLowerCase().includes(productSearchTerm.toLowerCase()))
                      ).length} resultados encontrados
                    </div>
                  )}
                </div>
                
                <div className="rounded-md border max-h-[170px] overflow-y-auto">
                  {loadingProducts ? (
                    <div className="p-4 text-center">Cargando productos...</div>
                  ) : products.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No hay productos disponibles
                    </div>
                  ) : (
                    <div className="divide-y">
                      {products
                        .filter(product => 
                          product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
                          (product.id && product.id.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        )
                        .map((product) => (
                          <div key={product.id} className="p-2 flex justify-between items-center hover:bg-muted/30 cursor-pointer" onClick={() => handleAddProduct(product.id)}>
                            <div className="flex items-center gap-2">
                              {product.image ? (
                                <div className="h-8 w-8 rounded-md overflow-hidden">
                                  <img 
                                    src={product.image} 
                                    alt={product.name} 
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                                  <ShoppingBag className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                                <p className="text-xs text-muted-foreground">${parseFloat(product.price).toLocaleString()}</p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Mensaje cuando no hay resultados de búsqueda */}
                        {productSearchTerm && products.filter(product => 
                          product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        ).length === 0 && (
                          <div className="p-3 text-center text-muted-foreground text-xs">
                            No se encontraron productos con "{productSearchTerm}"
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPhysicalSaleModal(false)}
              disabled={savingPhysicalSale}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePhysicalSale}
              disabled={savingPhysicalSale || selectedProducts.length === 0 || !physicalSaleData.customerName}
              className="bg-green-600 hover:bg-green-700"
            >
              {savingPhysicalSale ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Registrar Venta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
