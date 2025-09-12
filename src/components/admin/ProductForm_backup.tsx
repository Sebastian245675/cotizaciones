import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { 
  Plus, Package, Edit, Trash2, Search, Save, X, Image, AlertTriangle, Check, CreditCard, 
  ShieldCheck, Award, Wand2, ChevronDown, Calendar, Clock, Filter, RefreshCw, Tags, History, 
  SlidersHorizontal, Loader2, Eye, TrendingUp, CheckCircle, Upload, WifiOff, AlertCircle
} from 'lucide-react';
import { sampleProducts } from '@/data/products';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, addDoc, getDocs, updateDoc, doc, setDoc, getDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { SyncStatusIndicator } from "@/components/ui/sync-status-indicator";
import { SyncManagementPanel } from "@/components/ui/sync-management-panel";

export const ProductForm: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    precioVenta: '', // Precio de venta (antes era price)
    precioCosto: '', // Nuevo: Precio de costo
    precioMayoreo: '', // Nuevo: Precio de mayoreo
    ganancia: 0, // Calculado automáticamente
    porcentajeGanancia: 0, // Calculado automáticamente
    category: '',
    subcategory: '',  // Será "none" en la UI, pero guardamos como "" cuando no hay subcategoría
    terceraCategoria: '', // Será "none" en la UI, pero guardamos como "" cuando no hay tercera categoría
    stock: '',
    image: '',
    additionalImages: ['', '', ''],
    specifications: [{ name: '', value: '' }],
    isOffer: false,
    discount: '',
    originalPrice: '',
    benefits: [] as string[],
    warranties: [] as string[],
    paymentMethods: [] as string[],
    colors: [] as { name: string, hexCode: string, image: string }[],
    // Nuevos campos
    habilitarEcommerce: true, // Por defecto habilitado para ecommerce
    tipoVenta: 'unidad' as 'unidad' | 'granel' | 'paquete' // Tipo de venta
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(5);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; parentId?: string | null; }[]>([]);
  const [visibleProducts, setVisibleProducts] = useState<number>(20); // Número de productos visibles inicialmente
  const [hasMoreProducts, setHasMoreProducts] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Filtro por categoría
  const { user } = useAuth();
  const { 
    isOnline, 
    createDocument, 
    updateDocument, 
    deleteDocument,
    pendingCount,
    errorCount,
    syncQueue
  } = useOfflineSync();
  // Por defecto, establecemos liberta como "no" para asegurar que los cambios vayan a revisión
  // hasta que se verifique el permiso
  const [liberta, setLiberta] = useState("no");

  // Estados para secciones colapsables
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showAdditionalImages, setShowAdditionalImages] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showWarranties, setShowWarranties] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [additionalImagesCount, setAdditionalImagesCount] = useState(1);

  // Lista predefinida de beneficios
  const predefinedBenefits = [
    "Envío gratis",
    "Entrega en 24 horas",
    "Producto importado",
    "Producto ecológico",
    "Ahorro energético",
    "Fabricación local",
    "Servicio post-venta",
    "Producto orgánico",
    "Soporte técnico incluido",
    "Materiales premium"
  ];

  // Lista predefinida de garantías
  const predefinedWarranties = [
    "Garantía de 6 meses",
    "Garantía de 1 año",
    "Garantía de 2 años",
    "Garantía de por vida",
    "Devolución en 30 días",
    "Reembolso garantizado",
    "Cambio sin costo",
    "Reparación incluida",
    "Repuestos disponibles",
    "Servicio técnico oficial"
  ];

  // Lista predefinida de medios de pago
  const predefinedPaymentMethods = [
    "Tarjeta de crédito",
    "Tarjeta de débito",
    "Transferencia bancaria",
    "PayPal",
    "Efectivo",
    "Contra-reembolso",
    "Pago en cuotas",
    "Mercado Pago",
    "Nequi",
    "Daviplata"
  ];

  // This is now handled by the useMemo implementation later in the code

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingProducts(false);
    };
    
    const fetchCategories = async () => {
      try {
        // Get all categories
        const querySnapshot = await getDocs(collection(db, "categories"));
        const allCategories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name || "Categoría sin nombre",
          parentId: doc.data().parentId || null
        })) as { id: string; name: string; parentId?: string | null }[];
        
        setCategories(allCategories);
        
        // Verificar si el usuario tiene libertad
        if (user && user.email) {
          // Si es admin@gmail.com, darle permisos completos automáticamente
          if (user.email === "admin@gmail.com") {
            setLiberta("si");
          } else {
            // Primero verificar en la colección "users" donde está la info de subcuentas
            if (user.id) {
              const userDoc = await getDoc(doc(db, "users", user.id));
              if (userDoc.exists() && userDoc.data().liberta === "si") {
                setLiberta("si");
              } else {
                // Verificar también en "admins" por compatibilidad
                const adminDoc = await getDoc(doc(db, "admins", user.email));
                if (adminDoc.exists() && adminDoc.data().liberta === "yes") {
                  setLiberta("si");
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
    fetchProducts();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.precioVenta || !formData.stock || !formData.category) {
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: "Por favor completa los campos obligatorios: nombre, precio de venta, stock y categoría."
      });
      return;
    }
    
    // Verificar si se está editando un producto sin imagen
    if (isEditing && editingId && !formData.image) {
      const currentProduct = products.find(product => product.id === editingId);
      
      // Si el producto actual no tenía imagen, mostrar una advertencia
      if (!currentProduct?.image) {
        toast({
          title: "⚠️ Advertencia sobre la imagen",
          description: "El producto no tiene una imagen. Se recomienda agregar una para mejor visualización.",
          className: "bg-yellow-50 border border-yellow-200 text-yellow-800"
        });
      }
    }
    
    const numericPrecioVenta = parseFloat(formData.precioVenta);
    const numericPrecioCosto = parseFloat(formData.precioCosto) || 0;
    const numericPrecioMayoreo = parseFloat(formData.precioMayoreo) || 0;
    const numericStock = parseInt(formData.stock, 10);
    
    if (isNaN(numericPrecioVenta) || isNaN(numericStock)) {
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: "El precio de venta y stock deben ser valores numéricos."
      });
      return;
    }

    // Calcular ganancia
    const ganancia = numericPrecioCosto > 0 ? numericPrecioVenta - numericPrecioCosto : 0;
    const porcentajeGanancia = numericPrecioCosto > 0 ? (ganancia / numericPrecioCosto) * 100 : 0;

    // Encontrar nombres completos de categorías para mejor visualización
    const categoryName = categories.find(cat => cat.id === formData.category)?.name || "";
    const subcategoryName = formData.subcategory ? 
      categories.find(cat => cat.id === formData.subcategory)?.name || "" : 
      "";
    const terceraCategoriaName = formData.terceraCategoria ? 
      categories.find(cat => cat.id === formData.terceraCategoria)?.name || "" : 
      "";
    
    const productData = {
      ...formData,
      precioVenta: numericPrecioVenta,
      precioCosto: numericPrecioCosto,
      precioMayoreo: numericPrecioMayoreo,
      ganancia: ganancia,
      porcentajeGanancia: parseFloat(porcentajeGanancia.toFixed(2)),
      stock: numericStock,
      originalPrice: formData.isOffer ? parseFloat(formData.originalPrice) : numericPrecioVenta,
      discount: formData.isOffer ? parseFloat(formData.discount) : 0,
      isOffer: formData.isOffer,
      categoryName, // Agregar nombres descriptivos
      subcategoryName,
      terceraCategoriaName,
      lastModified: new Date(),
      lastModifiedBy: user?.email || "unknown",
    };
    
    try {
      if (isEditing && editingId) {
        // Si liberta="si", permite cambios directos, en cualquier otro caso requiere revisión
        if (liberta === "si") {
          // Obtener el producto actual para asegurarnos de no perder datos
          const currentProduct = products.find(product => product.id === editingId);
          
          // Si el campo de imagen está vacío pero el producto tenía una imagen, conservarla
          if (!formData.image && currentProduct?.image) {
            productData.image = currentProduct.image;
          }
          
          // Usar sistema offline para actualizar
          if (isOnline) {
            await updateDoc(doc(db, "products", editingId), productData);
            toast({
              title: "Producto actualizado",
              description: "El producto ha sido actualizado exitosamente."
            });
          } else {
            updateDocument("products", editingId, productData);
            toast({
              title: "📱 Producto guardado offline",
              description: "El producto se sincronizará automáticamente cuando recuperes la conexión.",
              className: "bg-blue-50 border border-blue-200 text-blue-800"
            });
          }
          
          resetForm();
          
          // Actualizar la lista de productos localmente
          const updatedProducts = products.map(product => 
            product.id === editingId ? { id: editingId, ...productData } : product
          );
          setProducts(updatedProducts);
        } else {
          // Si no tiene liberta, los cambios van a revisión (también puede ser offline)
          const currentProduct = products.find(product => product.id === editingId);
          
          // Si el campo de imagen está vacío pero el producto tenía una imagen, conservarla
          if (!formData.image && currentProduct?.image) {
            productData.image = currentProduct.image;
          }
          
          const revisionData = {
            type: "edit",
            data: { ...productData, id: editingId },
            status: "pendiente",
            timestamp: new Date(),
            editorEmail: user?.email || "unknown",
            userName: user?.name || user?.email || "unknown"
          };

          if (isOnline) {
            await addDoc(collection(db, "revision"), revisionData);
            toast({
              title: "Cambios enviados a revisión",
              description: "Los cambios han sido enviados para aprobación del administrador."
            });
          } else {
            createDocument("revision", revisionData);
            toast({
              title: "📱 Cambios guardados offline",
              description: "Los cambios se enviarán a revisión cuando recuperes la conexión.",
              className: "bg-blue-50 border border-blue-200 text-blue-800"
            });
          }
          
          resetForm();
        }
      } else {
        // Si liberta="si", permite cambios directos, en cualquier otro caso requiere revisión
        if (liberta === "si") {
          // Si tiene libertad, crea directamente
          const productWithMetadata = {
            ...productData,
            createdAt: new Date(),
            createdBy: user?.email || "unknown",
            lastModified: new Date(),
            lastModifiedBy: user?.email || "unknown"
          };
          
          if (isOnline) {
            const docRef = await addDoc(collection(db, "products"), productWithMetadata);
            toast({
              title: "Producto agregado",
              description: "El producto ha sido agregado exitosamente."
            });
            // Actualizar la lista de productos
            setProducts([...products, { id: docRef.id, ...productWithMetadata }]);
          } else {
            const actionId = createDocument("products", productWithMetadata);
            toast({
              title: "📱 Producto guardado offline",
              description: "El producto se sincronizará automáticamente cuando recuperes la conexión.",
              className: "bg-blue-50 border border-blue-200 text-blue-800"
            });
            // Actualizar la lista de productos localmente con ID temporal
            setProducts([...products, { id: actionId, ...productWithMetadata, _tempId: true }]);
          }
          
          resetForm();
        } else {
          // Si no tiene liberta, los cambios van a revisión
          const revisionData = {
            type: "add",
            data: productData,
            status: "pendiente",
            timestamp: new Date(),
            editorEmail: user?.email || "unknown",
            userName: user?.name || user?.email || "unknown"
          };

          if (isOnline) {
            await addDoc(collection(db, "revision"), revisionData);
            toast({
              title: "Producto enviado a revisión",
              description: "El producto ha sido enviado para aprobación del administrador."
            });
          } else {
            createDocument("revision", revisionData);
            toast({
              title: "📱 Producto guardado offline",
              description: "El producto se enviará a revisión cuando recuperes la conexión.",
              className: "bg-blue-50 border border-blue-200 text-blue-800"
            });
          }
          
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error guardando producto:", error);
      
      // Si hay error y estamos online, intentar guardar offline
      if (isOnline) {
        toast({
          variant: "destructive",
          title: "Error de conexión",
          description: "Se guardará offline y se sincronizará cuando sea posible."
        });
        
        // Intentar guardar offline como respaldo
        if (isEditing && editingId) {
          if (liberta === "si") {
            updateDocument("products", editingId, productData);
          } else {
            createDocument("revision", {
              type: "edit",
              data: { ...productData, id: editingId },
              status: "pendiente",
              timestamp: new Date(),
              editorEmail: user?.email || "unknown",
              userName: user?.name || user?.email || "unknown"
            });
          }
        } else {
          if (liberta === "si") {
            createDocument("products", {
              ...productData,
              createdAt: new Date(),
              createdBy: user?.email || "unknown"
            });
          } else {
            createDocument("revision", {
              type: "add",
              data: productData,
              status: "pendiente",
              timestamp: new Date(),
              editorEmail: user?.email || "unknown",
              userName: user?.name || user?.email || "unknown"
            });
          }
        }
        resetForm();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ocurrió un error al guardar el producto. Inténtalo nuevamente."
        });
      }
    }
  };

  const handleEdit = (product: any) => {
    setIsEditing(true);
    setEditingId(product.id);
    
    // Convertir valores numéricos a string para el formulario
    setFormData({
      name: product.name || '',
      description: product.description || '',
      precioVenta: String(product.precioVenta || product.price || ''), // Compatibilidad con productos antiguos
      precioCosto: String(product.precioCosto || ''),
      precioMayoreo: String(product.precioMayoreo || ''),
      ganancia: product.ganancia || 0,
      porcentajeGanancia: product.porcentajeGanancia || 0,
      category: product.category || '',
      subcategory: product.subcategory || '',
      terceraCategoria: product.terceraCategoria || '',
      stock: String(product.stock) || '',
      image: product.image || '',
      additionalImages: product.additionalImages && product.additionalImages.length >= 3 ? 
        product.additionalImages : ['', '', ''],
      specifications: product.specifications && product.specifications.length > 0 ? 
        product.specifications : [{ name: '', value: '' }],
      isOffer: product.isOffer || false,
      discount: String(product.discount || ''),
      originalPrice: String(product.originalPrice || ''),
      benefits: product.benefits || [],
      warranties: product.warranties || [],
      paymentMethods: product.paymentMethods || [],
      colors: product.colors || [],
      habilitarEcommerce: product.habilitarEcommerce !== undefined ? product.habilitarEcommerce : true,
      tipoVenta: product.tipoVenta || 'unidad'
    });
    
    // Scroll al formulario
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (productId: string) => {
    try {
      if (liberta === "si") {
        // Si tiene libertad, elimina directamente
        const deleteData = {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: user?.email || "unknown"
        };

        if (isOnline) {
          await setDoc(doc(db, "products", productId), deleteData, { merge: true });
          toast({
            title: "Producto eliminado",
            description: "El producto ha sido eliminado exitosamente."
          });
        } else {
          updateDocument("products", productId, deleteData);
          toast({
            title: "📱 Eliminación guardada offline",
            description: "El producto se marcará como eliminado cuando recuperes la conexión.",
            className: "bg-blue-50 border border-blue-200 text-blue-800"
          });
        }
        
        // Actualizar la lista de productos (no mostramos los marcados como eliminados)
        setProducts(products.filter(product => product.id !== productId));
      } else {
        // Si no tiene libertad, envía a revisión
        const productToDelete = products.find(p => p.id === productId);
        const revisionData = {
          type: "delete",
          data: { id: productId, name: productToDelete?.name || "Producto desconocido" },
          status: "pendiente",
          timestamp: new Date(),
          editorEmail: user?.email || "unknown",
          userName: user?.name || user?.email || "unknown"
        };

        if (isOnline) {
          await addDoc(collection(db, "revision"), revisionData);
          toast({
            title: "Solicitud enviada a revisión",
            description: "La solicitud de eliminación ha sido enviada para aprobación del administrador."
          });
        } else {
          createDocument("revision", revisionData);
          toast({
            title: "📱 Solicitud guardada offline",
            description: "La solicitud se enviará a revisión cuando recuperes la conexión.",
            className: "bg-blue-50 border border-blue-200 text-blue-800"
          });
        }
      }
    } catch (error) {
      console.error("Error eliminando producto:", error);
      
      // Si hay error y estamos online, intentar guardar offline
      if (isOnline) {
        toast({
          variant: "destructive",
          title: "Error de conexión",
          description: "Se guardará offline y se sincronizará cuando sea posible."
        });
        
        if (liberta === "si") {
          updateDocument("products", productId, {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: user?.email || "unknown"
          });
        } else {
          const productToDelete = products.find(p => p.id === productId);
          createDocument("revision", {
            type: "delete",
            data: { id: productId, name: productToDelete?.name || "Producto desconocido" },
            status: "pendiente",
            timestamp: new Date(),
            editorEmail: user?.email || "unknown",
            userName: user?.name || user?.email || "unknown"
          });
        }
        // Actualizar lista localmente
        setProducts(products.filter(product => product.id !== productId));
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ocurrió un error al intentar eliminar el producto. Inténtalo nuevamente."
        });
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      precioVenta: '',
      precioCosto: '',
      precioMayoreo: '',
      ganancia: 0,
      porcentajeGanancia: 0,
      category: '',
      subcategory: '',
      terceraCategoria: '',
      stock: '',
      image: '',
      additionalImages: ['', '', ''],
      specifications: [{ name: '', value: '' }],
      isOffer: false,
      discount: '',
      originalPrice: '',
      benefits: [],
      warranties: [],
      paymentMethods: [],
      colors: [],
      habilitarEcommerce: true,
      tipoVenta: 'unidad'
    });
  };

  const getStockStatus = (stock: number) => {
    if (stock > 10) {
      return { text: "En Stock", color: "bg-green-100 text-green-800 hover:bg-green-200" };
    } else if (stock > 0) {
      return { text: "Stock Bajo", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" };
    } else {
      return { text: "Agotado", color: "bg-red-100 text-red-800 hover:bg-red-200" };
    }
  };

  // Función para obtener el estado de sincronización de un producto
  const getSyncStatus = (productId: string) => {
    // Buscar si hay acciones pendientes para este producto
    const productActions = syncQueue.filter(action => {
      if (action.type === 'create') {
        return action.id === productId; // Para productos nuevos con ID temporal
      } else if (action.type === 'update' || action.type === 'delete') {
        return action.data?.id === productId;
      }
      return false;
    });

    if (productActions.length === 0) {
      return {
        status: 'synced',
        icon: CheckCircle,
        color: 'text-green-600',
        title: 'Sincronizado'
      };
    }

    const hasError = productActions.some(action => action.status === 'error');
    const hasPending = productActions.some(action => action.status === 'pending');
    const isSyncing = productActions.some(action => action.status === 'syncing');

    if (hasError) {
      return {
        status: 'error',
        icon: AlertCircle,
        color: 'text-red-600',
        title: 'Error de sincronización'
      };
    }

    if (isSyncing) {
      return {
        status: 'syncing',
        icon: RefreshCw,
        color: 'text-blue-600 animate-spin',
        title: 'Sincronizando...'
      };
    }

    if (hasPending) {
      return {
        status: 'pending',
        icon: Upload,
        color: 'text-orange-600',
        title: 'Pendiente de sincronizar'
      };
    }

    return {
      status: 'synced',
      icon: CheckCircle,
      color: 'text-green-600',
      title: 'Sincronizado'
    };
  };

  // State for sorting
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'price-high' | 'price-low' | 'name-asc' | 'name-desc'>('recent');
  
  // Filter products based on search term and category
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    // Filter by search term if present
    if (searchTerm.trim()) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(lowercasedTerm)) || 
        (product.description && product.description.toLowerCase().includes(lowercasedTerm)) ||
        (product.category && product.category.toLowerCase().includes(lowercasedTerm)) ||
        (product.precioVenta && String(product.precioVenta).includes(lowercasedTerm)) ||
        (product.price && String(product.price).includes(lowercasedTerm)) // Compatibilidad con productos antiguos
      );
    }
    
    // Filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category === selectedCategory ||
        product.subcategory === selectedCategory ||
        product.terceraCategoria === selectedCategory
      );
    }
    
    return filtered;
  }, [searchTerm, selectedCategory, products]);
  
  // Sort products based on selected order
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortOrder) {
        case 'recent':
          // Handle timestamps or fallback to Date objects or current time as default
          const bModified = b.lastModified?.toDate?.() || b.updatedAt || new Date();
          const aModified = a.lastModified?.toDate?.() || a.updatedAt || new Date();
          return bModified.getTime() - aModified.getTime();
        case 'oldest':
          const aModifiedOld = a.lastModified?.toDate?.() || a.updatedAt || new Date();
          const bModifiedOld = b.lastModified?.toDate?.() || b.updatedAt || new Date();
          return aModifiedOld.getTime() - bModifiedOld.getTime();
        case 'price-high':
          return (parseFloat(String(b.precioVenta || b.price)) || 0) - (parseFloat(String(a.precioVenta || a.price)) || 0);
        case 'price-low':
          return (parseFloat(String(a.precioVenta || a.price)) || 0) - (parseFloat(String(b.precioVenta || b.price)) || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });
  }, [filteredProducts, sortOrder]);
  
  // Limitar el número de productos visibles para paginación
  const paginatedProducts = useMemo(() => {
    return sortedProducts.slice(0, visibleProducts);
  }, [sortedProducts, visibleProducts]);

  // Actualizar el estado de hasMoreProducts cuando cambien sortedProducts o visibleProducts
  useEffect(() => {
    setHasMoreProducts(visibleProducts < sortedProducts.length);
  }, [sortedProducts.length, visibleProducts]);

  // Función para cargar más productos
  const loadMoreProducts = () => {
    setLoadingMoreProducts(true);
    // Simular pequeño retraso para mejor UX
    setTimeout(() => {
      setVisibleProducts(prev => prev + 20);
      setLoadingMoreProducts(false);
    }, 500);
  };

  // Image loading state
  const [loadingImages, setLoadingImages] = useState<{[key: string]: boolean}>({});
  
  // Function to handle image load start/end
  const handleImageLoadStart = (productId: string) => {
    setLoadingImages(prev => ({...prev, [productId]: true}));
  };
  
  const handleImageLoadEnd = (productId: string) => {
    setLoadingImages(prev => ({...prev, [productId]: false}));
  };

  // Estados para el sistema de promociones
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionData, setPromotionData] = useState({
    nombre: '',
    descripcion: '',
    descuento: '',
    fechaInicio: '',
    fechaFin: '',
    aplicarA: 'todos' as 'todos' | 'categoria',
    categoriaSeleccionada: '',
    activa: true
  });
  const [activePromotions, setActivePromotions] = useState<any[]>([]);

  // Función para crear una promoción
  const handleCreatePromotion = async () => {
    if (!promotionData.nombre || !promotionData.descuento || !promotionData.fechaInicio || !promotionData.fechaFin) {
      toast({
        variant: "destructive",
        title: "Error al crear promoción",
        description: "Por favor completa todos los campos obligatorios."
      });
      return;
    }

    if (parseFloat(promotionData.descuento) <= 0 || parseFloat(promotionData.descuento) > 100) {
      toast({
        variant: "destructive",
        title: "Error en el descuento",
        description: "El descuento debe ser entre 1% y 100%."
      });
      return;
    }

    if (new Date(promotionData.fechaInicio) >= new Date(promotionData.fechaFin)) {
      toast({
        variant: "destructive",
        title: "Error en las fechas",
        description: "La fecha de inicio debe ser anterior a la fecha de fin."
      });
      return;
    }

    try {
      const promocionData = {
        ...promotionData,
        descuento: parseFloat(promotionData.descuento),
        fechaInicio: new Date(promotionData.fechaInicio),
        fechaFin: new Date(promotionData.fechaFin),
        createdAt: new Date(),
        createdBy: user?.email || "unknown"
      };

      await addDoc(collection(db, "promociones"), promocionData);
      
      toast({
        title: "Promoción creada",
        description: "La promoción ha sido creada exitosamente."
      });

      // Resetear el formulario
      setPromotionData({
        nombre: '',
        descripcion: '',
        descuento: '',
        fechaInicio: '',
        fechaFin: '',
        aplicarA: 'todos',
        categoriaSeleccionada: '',
        activa: true
      });
      setShowPromotionModal(false);

      // Recargar promociones activas
      fetchActivePromotions();
    } catch (error) {
      console.error("Error creando promoción:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al crear la promoción."
      });
    }
  };

  // Función para obtener promociones activas
  const fetchActivePromotions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "promociones"));
      const promociones = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Filtrar solo promociones activas y vigentes
      const now = new Date();
      const promocionesActivas = promociones.filter((promo: any) => 
        promo.activa && 
        new Date(promo.fechaInicio.toDate?.() || promo.fechaInicio) <= now &&
        new Date(promo.fechaFin.toDate?.() || promo.fechaFin) >= now
      );
      
      setActivePromotions(promocionesActivas);
    } catch (error) {
      console.error("Error fetching promociones:", error);
    }
  };

  // Cargar promociones activas al montar el componente
  useEffect(() => {
    fetchActivePromotions();
  }, []);

  // Función para desactivar una promoción
  const handleDeactivatePromotion = async (promotionId: string) => {
    try {
      await updateDoc(doc(db, "promociones", promotionId), {
        activa: false,
        desactivadaAt: new Date(),
        desactivadaBy: user?.email || "unknown"
      });
      
      toast({
        title: "Promoción desactivada",
        description: "La promoción ha sido desactivada."
      });
      
      fetchActivePromotions();
    } catch (error) {
      console.error("Error desactivando promoción:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al desactivar la promoción."
      });
    }
  };

  // Initialize expandable sections based on form data
  useEffect(() => {
    // Helper function to check if a section has content
    const hasSectionContent = (sectionData: any[]) => {
      return sectionData.length > 0;
    };

    // Set timeout to ensure DOM elements are available
    const timer = setTimeout(() => {
      // Handle colors section visibility
      const colorsSection = document.getElementById('colorsSection');
      const colorsChevron = document.getElementById('colorsChevron');
      if (colorsSection && colorsChevron) {
        if (!hasSectionContent(formData.colors)) {
          colorsSection.classList.add('hidden');
        } else {
          colorsChevron.classList.add('rotate-180');
        }
      }

      // Handle benefits section visibility
      const benefitsSection = document.getElementById('benefitsSection');
      const benefitsChevron = document.getElementById('benefitsChevron');
      if (benefitsSection && benefitsChevron) {
        if (!hasSectionContent(formData.benefits)) {
          benefitsSection.classList.add('hidden');
        } else {
          benefitsChevron.classList.add('rotate-180');
        }
      }

      // Handle warranties section visibility
      const warrantiesSection = document.getElementById('warrantiesSection');
      const warrantiesChevron = document.getElementById('warrantiesChevron');
      if (warrantiesSection && warrantiesChevron) {
        if (!hasSectionContent(formData.warranties)) {
          warrantiesSection.classList.add('hidden');
        } else {
          warrantiesChevron.classList.add('rotate-180');
        }
      }

      // Handle payment methods section visibility
      const paymentMethodsSection = document.getElementById('paymentMethodsSection');
      const paymentMethodsChevron = document.getElementById('paymentMethodsChevron');
      if (paymentMethodsSection && paymentMethodsChevron) {
        if (!hasSectionContent(formData.paymentMethods)) {
          paymentMethodsSection.classList.add('hidden');
        } else {
          paymentMethodsChevron.classList.add('rotate-180');
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [formData.colors.length, formData.benefits.length, formData.warranties.length, formData.paymentMethods.length]);

  return (
    <div className="space-y-8">
      {/* Indicador de estado de sincronización */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SyncStatusIndicator className="flex-shrink-0" />
          {(pendingCount > 0 || errorCount > 0) && (
            <div className="text-sm text-gray-600">
              {pendingCount > 0 && (
                <span className="text-orange-600 font-medium">
                  {pendingCount} cambio{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
              {pendingCount > 0 && errorCount > 0 && ' • '}
              {errorCount > 0 && (
                <span className="text-red-600 font-medium">
                  {errorCount} error{errorCount > 1 ? 'es' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <SyncManagementPanel />
          {!isOnline && (
            <Badge variant="destructive" className="gap-2">
              📱 Modo Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Aviso del estado de libertad */}
      {user?.subCuenta === "si" && (
        <div className={`p-4 mb-4 ${liberta === "si" 
          ? "bg-green-100 border-l-4 border-green-400 text-green-800" 
          : "bg-sky-100 border-l-4 border-sky-400 text-sky-800"} rounded-lg shadow-sm`}>
          <div className="flex items-center">
            {liberta === "si" ? (
              <ShieldCheck className="h-5 w-5 mr-2 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 mr-2 text-sky-600" />
            )}
            <p className="font-medium">
              {liberta === "si" 
                ? "Tu cuenta tiene permisos para publicar cambios directamente." 
                : "Tu cuenta no tiene permisos para publicar cambios directos. Los cambios que realices serán enviados a revisión del administrador."}
            </p>
          </div>
        </div>
      )}

      {/* Sección de Promociones - Solo mostrar si hay promociones o se está creando una */}
      {(activePromotions.length > 0 || showPromotionModal) && (
        <Card className="shadow-sm border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-gray-900">Promociones Activas</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  {activePromotions.length}
                </span>
              </div>
              <Button 
                onClick={() => setShowPromotionModal(true)}
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <Plus className="h-3 w-3 mr-1" />
                Nueva
              </Button>
            </div>

            {activePromotions.length > 0 && (
              <div className="space-y-2">
                {activePromotions.map((promotion: any) => (
                  <div key={promotion.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{promotion.nombre}</h4>
                      <p className="text-xs text-gray-600">{promotion.descuento}% de descuento</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivatePromotion(promotion.id)}
                      className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botón flotante para crear promoción cuando no hay ninguna */}
      {activePromotions.length === 0 && !showPromotionModal && (
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowPromotionModal(true)}
            variant="outline"
            size="sm"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <Award className="h-3 w-3 mr-1" />
            Crear Promoción
          </Button>
        </div>
      )}

      {/* Modal para crear promociones */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Award className="h-5 w-5 text-orange-600" />
                  Nueva Promoción
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPromotionModal(false)}
                  className="hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="promocion-nombre">Nombre de la Promoción *</Label>
                    <Input
                      id="promocion-nombre"
                      value={promotionData.nombre}
                      onChange={(e) => setPromotionData({...promotionData, nombre: e.target.value})}
                      placeholder="Ej: Descuento de Verano"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promocion-descuento">Descuento (%) *</Label>
                    <Input
                      id="promocion-descuento"
                      type="number"
                      min="1"
                      max="100"
                      value={promotionData.descuento}
                      onChange={(e) => setPromotionData({...promotionData, descuento: e.target.value})}
                      placeholder="Ej: 20"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promocion-descripcion">Descripción</Label>
                  <Textarea
                    id="promocion-descripcion"
                    value={promotionData.descripcion}
                    onChange={(e) => setPromotionData({...promotionData, descripcion: e.target.value})}
                    placeholder="Describe los términos y condiciones de la promoción..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha-inicio">Fecha de Inicio *</Label>
                    <Input
                      id="fecha-inicio"
                      type="datetime-local"
                      value={promotionData.fechaInicio}
                      onChange={(e) => setPromotionData({...promotionData, fechaInicio: e.target.value})}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha-fin">Fecha de Fin *</Label>
                    <Input
                      id="fecha-fin"
                      type="datetime-local"
                      value={promotionData.fechaFin}
                      onChange={(e) => setPromotionData({...promotionData, fechaFin: e.target.value})}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Aplicar promoción a:</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="aplicarA"
                        value="todos"
                        checked={promotionData.aplicarA === 'todos'}
                        onChange={(e) => setPromotionData({...promotionData, aplicarA: e.target.value as 'todos' | 'categoria', categoriaSeleccionada: ''})}
                        className="text-orange-600"
                      />
                      <span className="text-sm font-medium">Todos los productos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="aplicarA"
                        value="categoria"
                        checked={promotionData.aplicarA === 'categoria'}
                        onChange={(e) => setPromotionData({...promotionData, aplicarA: e.target.value as 'todos' | 'categoria'})}
                        className="text-orange-600"
                      />
                      <span className="text-sm font-medium">Categoría específica</span>
                    </label>
                  </div>

                  {promotionData.aplicarA === 'categoria' && (
                    <div className="space-y-2">
                      <Label htmlFor="categoria-promocion">Seleccionar Categoría</Label>
                      <Select 
                        value={promotionData.categoriaSeleccionada} 
                        onValueChange={(value) => setPromotionData({...promotionData, categoriaSeleccionada: value})}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter(category => !category.parentId)
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPromotionModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreatePromotion}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90"
                  >
                    Crear Promoción
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Separator className="my-12 bg-gradient-to-r from-transparent via-violet-200 to-transparent h-0.5" />
      
      {/* Formulario de Agregar/Editar Producto - Diseño Simplificado */}
      <Card id="product-form" className="shadow-sm border border-gray-200 bg-white">
        <CardHeader className="bg-white border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <Edit className="h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Editar Producto</h2>
                    <p className="text-sm text-gray-500">Actualiza la información del producto</p>
                  </div>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-green-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Nuevo Producto</h2>
                    <p className="text-sm text-gray-500">Añade un nuevo producto al inventario</p>
                  </div>
                </>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {!isOnline && (
                <Badge variant="destructive" className="text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              <SyncStatusIndicator />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nombre del producto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Coca-Cola 600ml"
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">Categoría *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value, subcategory: ''})}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(cat => !cat.parentId).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-medium">Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="0"
                    required
                    className="h-10"
                  />
                </div>
              </div>

              {formData.category && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subcategory" className="text-sm font-medium">Subcategoría (Opcional)</Label>
                    <Select value={formData.subcategory || "none"} onValueChange={(value) => setFormData({...formData, subcategory: value === "none" ? "" : value})}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar subcategoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin subcategoría</SelectItem>
                        {categories.filter(cat => cat.parentId === formData.category).map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoVenta" className="text-sm font-medium">Se vende por</Label>
                    <Select value={formData.tipoVenta} onValueChange={(value) => setFormData({...formData, tipoVenta: value as 'unidad' | 'granel' | 'paquete'})}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidad">🔢 Unidad/Pieza</SelectItem>
                        <SelectItem value="granel">⚖️ A granel</SelectItem>
                        <SelectItem value="paquete">📦 Como paquete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe las características del producto..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Nombre del Producto
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Coca-Cola 600ml"
                    required
                    className="h-12 text-base border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:ring-violet-500/20 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ingresa un nombre descriptivo y claro</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="category" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Categoría Principal
                  </Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => {
                      setFormData({...formData, category: value, subcategory: ''}); 
                    }}
                  >
                    <SelectTrigger className="h-12 text-base border-2 border-gray-200 rounded-xl focus:border-violet-500 bg-white/80 backdrop-blur-sm">
                      <SelectValue placeholder="Seleccionar categoría principal" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2 shadow-2xl">
                      {categories
                        .filter(category => !category.parentId)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id} className="py-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-1 bg-violet-100 rounded-lg">
                                <Tags className="h-3 w-3 text-violet-600" />
                              </div>
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.category && !formData.subcategory && (
                    <div className="mt-2 p-2 bg-violet-50 rounded-lg border border-violet-200">
                      <p className="text-xs text-violet-700 font-medium flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        Clasificación: {categories.find(cat => cat.id === formData.category)?.name || 'Categoría seleccionada'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Subcategoría mejorada */}
                {formData.category && (
                  <div className="space-y-3">
                    <Label htmlFor="subcategory" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      Subcategoría
                      <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-xs">Opcional</Badge>
                    </Label>
                    <Select 
                      value={formData.subcategory || "none"} 
                      onValueChange={(value) => setFormData({
                        ...formData, 
                        subcategory: value === "none" ? "" : value,
                        terceraCategoria: ""
                      })}
                    >
                      <SelectTrigger className="h-12 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 bg-white/80 backdrop-blur-sm">
                        <SelectValue placeholder="Seleccionar subcategoría (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2 shadow-2xl">
                        <SelectItem value="none" className="py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-1 bg-gray-100 rounded-lg">
                              <X className="h-3 w-3 text-gray-500" />
                            </div>
                            Ninguna - Usar solo categoría principal
                          </div>
                        </SelectItem>
                        {categories
                          .filter(category => category.parentId === formData.category)
                          .map((subCategory) => (
                            <SelectItem key={subCategory.id} value={subCategory.id} className="py-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-1 bg-blue-100 rounded-lg">
                                  <Tags className="h-3 w-3 text-blue-600" />
                                </div>
                                {subCategory.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {formData.category && formData.subcategory && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" />
                          Clasificación: {categories.find(cat => cat.id === formData.category)?.name} → {categories.find(cat => cat.id === formData.subcategory)?.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Tercera categoría mejorada */}
                {formData.category && formData.subcategory && (
                  <div className="space-y-3">
                    <Label htmlFor="terceraCategoria" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                      Tercera Categoría
                      <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-xs">Opcional</Badge>
                    </Label>
                    <Select 
                      value={formData.terceraCategoria || "none"} 
                      onValueChange={(value) => setFormData({
                        ...formData, 
                        terceraCategoria: value === "none" ? "" : value
                      })}
                    >
                      <SelectTrigger className="h-12 text-base border-2 border-gray-200 rounded-xl focus:border-indigo-500 bg-white/80 backdrop-blur-sm">
                        <SelectValue placeholder="Seleccionar tercera categoría (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2 shadow-2xl">
                        <SelectItem value="none" className="py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-1 bg-gray-100 rounded-lg">
                              <X className="h-3 w-3 text-gray-500" />
                            </div>
                            Ninguna - Usar hasta subcategoría
                          </div>
                        </SelectItem>
                        {categories
                          .filter(category => category.parentId === formData.subcategory)
                          .map((terceraCategoria) => (
                            <SelectItem key={terceraCategoria.id} value={terceraCategoria.id} className="py-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-1 bg-indigo-100 rounded-lg">
                                  <Tags className="h-3 w-3 text-indigo-600" />
                                </div>
                                {terceraCategoria.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {formData.category && formData.subcategory && formData.terceraCategoria && (
                      <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-xs text-indigo-700 font-medium flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" />
                          Clasificación: {categories.find(cat => cat.id === formData.category)?.name} → {categories.find(cat => cat.id === formData.subcategory)?.name} → {categories.find(cat => cat.id === formData.terceraCategoria)?.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sección de Precios - Estilo Odoo */}
            <div className="space-y-8">
              <div className="flex items-center gap-4 pb-4 border-b border-emerald-100">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-lg">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-800">Gestión de Precios</h3>
                  <p className="text-sm text-emerald-600/70">Configura los precios y márgenes de ganancia</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="precioVenta" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Precio de Venta
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 font-bold">$</div>
                    <Input
                      id="precioVenta"
                      type="number"
                      step="0.01"
                      value={formData.precioVenta}
                      onChange={(e) => {
                        const precioVenta = parseFloat(e.target.value) || 0;
                        const precioCosto = parseFloat(formData.precioCosto) || 0;
                        const ganancia = precioCosto > 0 ? precioVenta - precioCosto : 0;
                        const porcentajeGanancia = precioCosto > 0 ? (ganancia / precioCosto) * 100 : 0;
                        
                        setFormData({
                          ...formData, 
                          precioVenta: e.target.value,
                          ganancia: parseFloat(ganancia.toFixed(2)),
                          porcentajeGanancia: parseFloat(porcentajeGanancia.toFixed(2))
                        });
                      }}
                      placeholder="12500.00"
                      required
                      className="h-12 text-base border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20 pl-8 bg-white/80 backdrop-blur-sm font-semibold"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Precio al público</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="precioCosto" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    Precio de Costo
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600 font-bold">$</div>
                    <Input
                      id="precioCosto"
                      type="number"
                      step="0.01"
                      value={formData.precioCosto}
                      onChange={(e) => {
                        const precioCosto = parseFloat(e.target.value) || 0;
                        const precioVenta = parseFloat(formData.precioVenta) || 0;
                        const ganancia = precioCosto > 0 ? precioVenta - precioCosto : 0;
                        const porcentajeGanancia = precioCosto > 0 ? (ganancia / precioCosto) * 100 : 0;
                        
                        setFormData({
                          ...formData, 
                          precioCosto: e.target.value,
                          ganancia: parseFloat(ganancia.toFixed(2)),
                          porcentajeGanancia: parseFloat(porcentajeGanancia.toFixed(2))
                        });
                      }}
                      placeholder="8000.00"
                      className="h-12 text-base border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-orange-500/20 pl-8 bg-white/80 backdrop-blur-sm font-semibold"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Costo de adquisición</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="precioMayoreo" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Precio de Mayoreo
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 font-bold">$</div>
                    <Input
                      id="precioMayoreo"
                      type="number"
                      step="0.01"
                      value={formData.precioMayoreo}
                      onChange={(e) => setFormData({...formData, precioMayoreo: e.target.value})}
                      placeholder="11000.00"
                      className="h-12 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 pl-8 bg-white/80 backdrop-blur-sm font-semibold"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Precio para mayoristas</p>
                </div>
              </div>

              {/* Panel de análisis de ganancia - Estilo Odoo */}
              {formData.precioCosto && parseFloat(formData.precioCosto) > 0 && (
                <div className="relative p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/30 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-500 rounded-lg shadow-lg">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-bold text-emerald-800 text-lg">Análisis de Rentabilidad</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-200">
                        <p className="text-sm text-emerald-600 font-medium mb-1">Ganancia Bruta</p>
                        <p className="text-3xl font-bold text-emerald-700">
                          ${formData.ganancia.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-200">
                        <p className="text-sm text-emerald-600 font-medium mb-1">Margen de Ganancia</p>
                        <p className="text-3xl font-bold text-emerald-700">
                          {formData.porcentajeGanancia.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-emerald-100/50 rounded-xl">
                      <p className="text-xs text-emerald-700 text-center font-medium">
                        {formData.porcentajeGanancia > 50 ? "📈 Excelente margen de ganancia" :
                         formData.porcentajeGanancia > 25 ? "📊 Buen margen de ganancia" :
                         formData.porcentajeGanancia > 10 ? "⚠️ Margen bajo, considera revisar precios" :
                         "🔴 Margen muy bajo o pérdida"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Sección: Configuración de Venta */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200/50">
                <div className="p-2 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Configuración de Venta</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-200 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tipo de Venta */}
                <div className="space-y-4">
                  <Label htmlFor="tipoVenta" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    🏪 Se vende por
                  </Label>
                  <div className="space-y-3">
                    {[
                      { value: 'unidad', label: 'Unidad/Pieza', desc: 'Cantidades enteras (1, 2, 3...)', icon: '🔢' },
                      { value: 'granel', label: 'A granel', desc: 'Por peso/medida (0.5 kg, 1.2 metros...)', icon: '⚖️' },
                      { value: 'paquete', label: 'Como paquete', desc: 'Conjunto o kit completo', icon: '📦' }
                    ].map((tipo) => (
                      <div 
                        key={tipo.value}
                        className={cn(
                          "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group",
                          formData.tipoVenta === tipo.value 
                            ? "border-cyan-400 bg-cyan-50 shadow-lg shadow-cyan-100" 
                            : "border-gray-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/30"
                        )}
                        onClick={() => setFormData({...formData, tipoVenta: tipo.value as 'unidad' | 'granel' | 'paquete'})}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="tipoVenta"
                            value={tipo.value}
                            checked={formData.tipoVenta === tipo.value}
                            onChange={() => setFormData({...formData, tipoVenta: tipo.value as 'unidad' | 'granel' | 'paquete'})}
                            className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{tipo.icon}</span>
                              <span className="font-medium text-gray-800">{tipo.label}</span>
                            </div>
                            <p className="text-xs text-gray-600">{tipo.desc}</p>
                          </div>
                        </div>
                        {formData.tipoVenta === tipo.value && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuración E-commerce */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    🌐 Configuración E-commerce
                  </Label>
                  <div className="space-y-3">
                    <div 
                      className={cn(
                        "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group",
                        formData.habilitarEcommerce 
                          ? "border-green-400 bg-green-50 shadow-lg shadow-green-100" 
                          : "border-red-300 bg-red-50/50"
                      )}
                      onClick={() => setFormData({...formData, habilitarEcommerce: !formData.habilitarEcommerce})}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="habilitarEcommerce"
                          checked={formData.habilitarEcommerce}
                          onChange={(e) => setFormData({...formData, habilitarEcommerce: e.target.checked})}
                          className="w-4 h-4 text-green-600 focus:ring-green-500 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{formData.habilitarEcommerce ? '🟢' : '🔴'}</span>
                            <span className="font-medium text-gray-800">
                              {formData.habilitarEcommerce ? 'Visible en Tienda Online' : 'Solo Inventario Interno'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {formData.habilitarEcommerce 
                              ? 'Este producto aparecerá en la tienda web para clientes' 
                              : 'Este producto solo estará disponible en el punto de venta'}
                          </p>
                        </div>
                      </div>
                      {formData.habilitarEcommerce && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Información adicional sobre e-commerce */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200/50">
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                        <span>💡</span>
                        Tip: Los productos deshabilitados solo aparecen en el inventario interno
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Stock y Descripción */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200/50">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Stock y Descripción</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3 group">
                  <Label htmlFor="stock" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    📦 Stock Disponible
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="Ej: 100"
                    required
                    className="h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 focus:ring-4 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  />
                  {formData.stock && (
                    <div className={cn(
                      "text-xs px-3 py-1 rounded-full inline-block font-medium",
                      parseInt(formData.stock) > 10 ? "bg-green-100 text-green-700" :
                      parseInt(formData.stock) > 0 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {parseInt(formData.stock) > 10 ? "✅ Stock disponible" :
                       parseInt(formData.stock) > 0 ? "⚠️ Stock bajo" :
                       "❌ Sin stock"}
                    </div>
                  )}
                </div>
                
                <div className="lg:col-span-2 space-y-3 group">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    📝 Descripción del Producto 
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe el producto detalladamente: características, beneficios, especificaciones..."
                    required
                    className="min-h-[120px] border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 focus:ring-4 transition-all duration-200 bg-white/80 backdrop-blur-sm resize-none"
                  />
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>📊</span>
                    {formData.description.length}/500 caracteres
                    {formData.description.length > 400 && (
                      <span className="text-orange-600">• Descripción muy completa ✨</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Imagen y Ofertas */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200/50">
                <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg">
                  <Image className="h-5 w-5 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Imagen y Promociones</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-pink-200 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Imagen Principal */}
                <div className="space-y-4">
                  <Label htmlFor="image" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    🖼️ Imagen Principal
                    <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 text-xs px-2 py-0.5">
                      URL
                    </Badge>
                    {isEditing && !formData.image && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs px-2 py-0.5">
                        Se mantendrá actual
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    placeholder={isEditing ? "Nueva URL o mantener imagen actual" : "https://ejemplo.com/imagen.jpg"}
                    className="h-12 border-gray-200 focus:border-pink-400 focus:ring-pink-400/20 focus:ring-4 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  />
                  
                  {/* Vista previa de imagen */}
                  <div className="relative">
                    {formData.image ? (
                      <div className="group relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
                        <img 
                          src={formData.image} 
                          alt="Vista previa del producto" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x200/f3f4f6/6b7280?text=Error+al+cargar+imagen';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-gray-700">
                          Vista previa
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-48 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center text-gray-500">
                        <div className="p-4 bg-gray-200 rounded-full mb-3">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium">Sin imagen</p>
                        <p className="text-xs text-gray-400 mt-1">Agrega una URL para ver la vista previa</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuración de Ofertas */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    🎯 Sistema de Ofertas
                  </Label>
                  
                  <div 
                    className={cn(
                      "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                      formData.isOffer 
                        ? "border-green-400 bg-green-50 shadow-lg shadow-green-100" 
                        : "border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/30"
                    )}
                    onClick={() => setFormData({...formData, isOffer: !formData.isOffer})}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="isOffer"
                        checked={formData.isOffer}
                        onChange={(e) => setFormData({...formData, isOffer: e.target.checked})}
                        className="w-4 h-4 text-green-600 focus:ring-green-500 rounded"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{formData.isOffer ? '🔥' : '💰'}</span>
                        <span className="font-medium text-gray-800">
                          {formData.isOffer ? 'Producto en Oferta' : 'Precio Normal'}
                        </span>
                      </div>
                    </div>
                    
                    {formData.isOffer && (
                      <>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="originalPrice" className="text-xs font-medium text-gray-600">
                              💸 Precio Original
                            </Label>
                            <Input
                              id="originalPrice"
                              type="number"
                              value={formData.originalPrice}
                              onChange={(e) => setFormData({...formData, originalPrice: e.target.value})}
                              placeholder="Ej: 15000"
                              className="h-10 text-sm border-green-200 focus:border-green-400 focus:ring-green-400/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="discount" className="text-xs font-medium text-gray-600">
                              🎯 Descuento (%)
                            </Label>
                            <Input
                              id="discount"
                              type="number"
                              value={formData.discount}
                              onChange={(e) => setFormData({...formData, discount: e.target.value})}
                              placeholder="Ej: 20"
                              className="h-10 text-sm border-green-200 focus:border-green-400 focus:ring-green-400/20"
                            />
                          </div>
                        </div>
                        
                        {/* Cálculo de descuento en tiempo real */}
                        {formData.originalPrice && formData.discount && (
                          <div className="mt-3 p-3 bg-green-100 rounded-lg">
                            <div className="text-xs font-medium text-green-800 mb-1">📊 Resumen de la oferta:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-green-600">Precio original:</span>
                                <span className="font-bold ml-1">${parseFloat(formData.originalPrice).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-green-600">Ahorro:</span>
                                <span className="font-bold ml-1">${(parseFloat(formData.originalPrice) * parseFloat(formData.discount) / 100).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {formData.isOffer && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resto de secciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Label htmlFor="image" className="text-sm font-semibold flex items-center">
                  Imagen Principal
                  <div className="ml-1 px-2 py-0.5 bg-sky-50 text-sky-600 rounded-full text-xs font-medium">URL</div>
                  {isEditing && !formData.image && (
                    <div className="ml-2 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-xs font-medium">
                      Se mantendrá la imagen actual
                    </div>
                  )}
                </Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={(e) => setFormData({...formData, image: e.target.value})}
                  placeholder={isEditing ? "Mantener imagen actual o ingresar nueva URL" : "https://ejemplo.com/imagen.jpg"}
                  className="h-11"
                />
                {formData.image && (
                  <div className="mt-2 w-full max-w-[120px] h-[80px] rounded-md overflow-hidden border shadow-sm">
                    <img 
                      src={formData.image} 
                      alt="Vista previa" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/120x80?text=Error';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Oferta */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium">
                    Oferta
                  </Badge>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isOffer"
                      checked={formData.isOffer}
                      onChange={(e) => setFormData({...formData, isOffer: e.target.checked})}
                      className="w-4 h-4 rounded text-sky-600"
                    />
                    <span className="text-sm text-gray-500">Activar oferta</span>
                  </div>
                </Label>
                
                {formData.isOffer && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <Label htmlFor="originalPrice" className="text-sm text-gray-500">
                        Precio original
                      </Label>
                      <Input
                        id="originalPrice"
                        type="number"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({...formData, originalPrice: e.target.value})}
                        placeholder="Ej: 15000"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="discount" className="text-sm text-gray-500">
                        Descuento (%)
                      </Label>
                      <Input
                        id="discount"
                        type="number"
                        value={formData.discount}
                        onChange={(e) => setFormData({...formData, discount: e.target.value})}
                        placeholder="Ej: 20"
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Imágenes adicionales */}
              <div className="space-y-4 md:col-span-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1 bg-blue-50 rounded">
                    <Image className="h-4 w-4 text-blue-600" />
                  </div>
                  Imágenes Adicionales
                  <span className="text-xs text-gray-500">(Opcional)</span>
                </Label>
                
                <div className="grid gap-4">
                  {formData.additionalImages.map((url, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const newImages = [...formData.additionalImages];
                          newImages[index] = e.target.value;
                          setFormData({...formData, additionalImages: newImages});
                        }}
                        placeholder={`URL de imagen adicional ${index + 1}`}
                        className="h-10 flex-1"
                      />
                      
                      {url && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border border-gray-200">
                          <img 
                            src={url} 
                            alt={`Imagen adicional ${index + 1}`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Especificaciones */}
              <div className="space-y-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 bg-sky-50 rounded">
                      <Package className="h-4 w-4 text-sky-600" />
                    </div>
                    Especificaciones
                  </Label>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => setFormData({
                      ...formData, 
                      specifications: [...formData.specifications, { name: '', value: '' }]
                    })}
                    className="flex items-center gap-1 text-xs h-7"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir especificación
                  </Button>
                </div>
                
                <div className="grid gap-3">
                  {formData.specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center bg-gray-50 p-3 rounded-lg">
                      <div className="sm:col-span-2">
                        <Label htmlFor={`spec-name-${index}`} className="sr-only">
                          Nombre
                        </Label>
                        <Input
                          id={`spec-name-${index}`}
                          value={spec.name}
                          onChange={(e) => {
                            const newSpecs = [...formData.specifications];
                            newSpecs[index] = { ...newSpecs[index], name: e.target.value };
                            setFormData({...formData, specifications: newSpecs});
                          }}
                          placeholder="Nombre (ej: Marca, Material)"
                          className="h-9"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor={`spec-value-${index}`} className="sr-only">
                          Valor
                        </Label>
                        <Input
                          id={`spec-value-${index}`}
                          value={spec.value}
                          onChange={(e) => {
                            const newSpecs = [...formData.specifications];
                            newSpecs[index] = { ...newSpecs[index], value: e.target.value };
                            setFormData({...formData, specifications: newSpecs});
                          }}
                          placeholder="Valor (ej: Sony, Aluminio)"
                          className="h-9"
                        />
                      </div>
                      <div className="flex justify-end">
                        {formData.specifications.length > 1 && (
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const newSpecs = [...formData.specifications];
                              newSpecs.splice(index, 1);
                              setFormData({...formData, specifications: newSpecs});
                            }}
                            className="h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Colores */}
              <div className="space-y-4 md:col-span-2">
                <div 
                  className="flex items-center justify-between cursor-pointer" 
                  onClick={() => {
                    // Toggle a DOM class for expanding/collapsing
                    const element = document.getElementById('colorsSection');
                    if (element) {
                      element.classList.toggle('hidden');
                    }
                    // Toggle the rotation of the chevron
                    const chevron = document.getElementById('colorsChevron');
                    if (chevron) {
                      chevron.classList.toggle('rotate-180');
                    }
                  }}
                >
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 bg-purple-50 rounded">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-r from-pink-500 to-violet-500"></div>
                    </div>
                    Colores Disponibles
                    <span className="text-xs text-gray-500">(Opcional)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the parent onClick from firing
                        setFormData({
                          ...formData, 
                          colors: [...formData.colors, { name: '', hexCode: '#000000', image: '' }]
                        })
                      }}
                      className="flex items-center gap-1 text-xs h-7"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Añadir color
                    </Button>
                    <ChevronDown id="colorsChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                  </div>
                </div>
                
                <div id="colorsSection" className="space-y-4 border rounded-lg p-4 bg-gray-50">
                  {formData.colors.map((color, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-center">
                      {/* Nombre del color */}
                      <div className="sm:col-span-2">
                        <Input
                          value={color.name}
                          onChange={(e) => {
                            const newColors = [...formData.colors];
                            newColors[index] = { ...newColors[index], name: e.target.value };
                            setFormData({...formData, colors: newColors});
                          }}
                          placeholder="Nombre del color"
                          className="h-10"
                        />
                      </div>
                      
                      {/* Código Hex */}
                      <div className="flex items-center gap-2">
                        <div>
                          <input
                            type="color"
                            value={color.hexCode}
                            onChange={(e) => {
                              const newColors = [...formData.colors];
                              newColors[index] = { ...newColors[index], hexCode: e.target.value };
                              setFormData({...formData, colors: newColors});
                            }}
                            className="w-10 h-10 rounded border border-gray-200 p-1 bg-white"
                          />
                        </div>
                        <div>
                          <Input
                            value={color.hexCode}
                            onChange={(e) => {
                              const newColors = [...formData.colors];
                              newColors[index] = { ...newColors[index], hexCode: e.target.value };
                              setFormData({...formData, colors: newColors});
                            }}
                            placeholder="#000000"
                            className="h-10 w-24"
                          />
                        </div>
                      </div>
                    
                      {/* URL de la imagen para este color */}
                      <div className="sm:col-span-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={color.image}
                            onChange={(e) => {
                              const newColors = [...formData.colors];
                              newColors[index] = { ...newColors[index], image: e.target.value };
                              setFormData({...formData, colors: newColors});
                            }}
                            placeholder="URL de imagen para este color"
                            className="h-10"
                          />
                          
                          {/* Previsualización de la imagen */}
                          {color.image && (
                            <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border border-gray-200">
                              <img 
                                src={color.image} 
                                alt={`Color ${color.name}`} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          {/* Botón para eliminar este color */}
                          {formData.colors.length > 0 && (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                const newColors = [...formData.colors];
                                newColors.splice(index, 1);
                                setFormData({...formData, colors: newColors});
                              }}
                              className="h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {formData.colors.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No hay colores definidos. Utiliza el botón "Añadir color" para agregar opciones de colores al producto.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Beneficios del Producto */}
              <div className="space-y-4 md:col-span-2">
                <div 
                  className="flex items-center justify-between cursor-pointer" 
                  onClick={() => {
                    // Toggle a DOM class for expanding/collapsing
                    const element = document.getElementById('benefitsSection');
                    if (element) {
                      element.classList.toggle('hidden');
                    }
                    // Toggle the rotation of the chevron
                    const chevron = document.getElementById('benefitsChevron');
                    if (chevron) {
                      chevron.classList.toggle('rotate-180');
                    }
                  }}
                >
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 bg-green-50 rounded">
                      <Award className="h-4 w-4 text-green-600" />
                    </div>
                    Beneficios del Producto
                    <span className="text-xs text-gray-500">(Opcional)</span>
                    <Badge variant="outline" className="ml-2 py-0 px-2 text-xs">
                      {formData.benefits.length} seleccionados
                    </Badge>
                  </Label>
                  <ChevronDown id="benefitsChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                </div>
                
                <div id="benefitsSection" className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex flex-wrap gap-2">
                    {predefinedBenefits.map((benefit) => (
                      <Badge 
                        key={benefit} 
                        variant={formData.benefits.includes(benefit) ? "default" : "outline"}
                        className={`cursor-pointer py-1.5 px-3 ${
                          formData.benefits.includes(benefit) 
                            ? "bg-green-500 hover:bg-green-600" 
                            : "hover:bg-slate-100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the parent onClick from firing
                          if (formData.benefits.includes(benefit)) {
                            setFormData({
                              ...formData,
                              benefits: formData.benefits.filter(b => b !== benefit)
                            });
                          } else {
                            setFormData({
                              ...formData,
                              benefits: [...formData.benefits, benefit]
                            });
                          }
                        }}
                      >
                        {formData.benefits.includes(benefit) && (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Garantías del Producto */}
              <div className="space-y-4 md:col-span-2">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    // Toggle a DOM class for expanding/collapsing
                    const element = document.getElementById('warrantiesSection');
                    if (element) {
                      element.classList.toggle('hidden');
                    }
                    // Toggle the rotation of the chevron
                    const chevron = document.getElementById('warrantiesChevron');
                    if (chevron) {
                      chevron.classList.toggle('rotate-180');
                    }
                  }}
                >
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 bg-blue-50 rounded">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    Garantías y Respaldo
                    <span className="text-xs text-gray-500">(Opcional)</span>
                    <Badge variant="outline" className="ml-2 py-0 px-2 text-xs">
                      {formData.warranties.length} seleccionados
                    </Badge>
                  </Label>
                  <ChevronDown id="warrantiesChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                </div>
                
                <div id="warrantiesSection" className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex flex-wrap gap-2">
                    {predefinedWarranties.map((warranty) => (
                      <Badge 
                        key={warranty} 
                        variant={formData.warranties.includes(warranty) ? "default" : "outline"}
                        className={`cursor-pointer py-1.5 px-3 ${
                          formData.warranties.includes(warranty) 
                            ? "bg-blue-500 hover:bg-blue-600" 
                            : "hover:bg-slate-100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the parent onClick from firing
                          if (formData.warranties.includes(warranty)) {
                            setFormData({
                              ...formData,
                              warranties: formData.warranties.filter(w => w !== warranty)
                            });
                          } else {
                            setFormData({
                              ...formData,
                              warranties: [...formData.warranties, warranty]
                            });
                          }
                        }}
                      >
                        {formData.warranties.includes(warranty) && (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        {warranty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Métodos de Pago */}
              <div className="space-y-4 md:col-span-2">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    // Toggle a DOM class for expanding/collapsing
                    const element = document.getElementById('paymentMethodsSection');
                    if (element) {
                      element.classList.toggle('hidden');
                    }
                    // Toggle the rotation of the chevron
                    const chevron = document.getElementById('paymentMethodsChevron');
                    if (chevron) {
                      chevron.classList.toggle('rotate-180');
                    }
                  }}
                >
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 bg-cyan-50 rounded">
                      <CreditCard className="h-4 w-4 text-cyan-600" />
                    </div>
                    Métodos de Pago Aceptados
                    <span className="text-xs text-gray-500">(Opcional)</span>
                    <Badge variant="outline" className="ml-2 py-0 px-2 text-xs">
                      {formData.paymentMethods.length} seleccionados
                    </Badge>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the parent onClick from firing
                        setFormData({
                          ...formData, 
                          paymentMethods: [...formData.paymentMethods, '']
                        })
                      }}
                      className="flex items-center gap-1 text-xs h-7"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Añadir método
                    </Button>
                    <ChevronDown id="paymentMethodsChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                  </div>
                </div>
                
                <div id="paymentMethodsSection" className="space-y-3 border rounded-lg p-4 bg-gray-50">
                  {/* Lista predefinida */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {predefinedPaymentMethods.map((method) => (
                      <Badge 
                        key={method} 
                        variant={formData.paymentMethods.includes(method) ? "default" : "outline"}
                        className={`cursor-pointer py-1.5 px-3 ${
                          formData.paymentMethods.includes(method) 
                            ? "bg-cyan-500 hover:bg-cyan-600" 
                            : "hover:bg-slate-100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the parent onClick from firing
                          if (formData.paymentMethods.includes(method)) {
                            setFormData({
                              ...formData,
                              paymentMethods: formData.paymentMethods.filter(m => m !== method)
                            });
                          } else {
                            setFormData({
                              ...formData,
                              paymentMethods: [...formData.paymentMethods, method]
                            });
                          }
                        }}
                      >
                        {formData.paymentMethods.includes(method) && (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        {method}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Métodos personalizados */}
                  {formData.paymentMethods
                    .filter(method => !predefinedPaymentMethods.includes(method))
                    .map((method, index) => (
                      <div key={`custom-${index}`} className="flex items-center gap-2">
                        <Input
                          value={method}
                          onChange={(e) => {
                            const newMethods = [...formData.paymentMethods];
                            const customIndex = formData.paymentMethods.findIndex(m => m === method);
                            if (customIndex >= 0) {
                              newMethods[customIndex] = e.target.value;
                              setFormData({...formData, paymentMethods: newMethods});
                            }
                          }}
                          placeholder="Método de pago personalizado"
                          className="h-10"
                          onClick={(e) => e.stopPropagation()} // Prevent the section from collapsing when clicking on the input
                        />
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent the parent onClick from firing
                            setFormData({
                              ...formData, 
                              paymentMethods: formData.paymentMethods.filter(m => m !== method)
                            });
                          }}
                          className="h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                onClick={() => {
                  setFormData({
                    ...formData,
                    name: "Indefinido",
                    precioVenta: "4444",
                    precioCosto: "3000",
                    precioMayoreo: "4000",
                    ganancia: 1444,
                    porcentajeGanancia: 48.13,
                    stock: "50",
                    description: "Hola, este es un producto con datos de prueba."
                  });
                }}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Rellenar
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {isEditing && liberta !== "si" 
                  ? 'Enviar Cambios a Revisión' 
                  : isEditing 
                    ? 'Actualizar Producto' 
                    : liberta !== "si" 
                      ? 'Enviar Producto a Revisión' 
                      : 'Agregar Producto'}
              </Button>
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Lista de productos existentes - Diseño Odoo Avanzado */}
      <Card className="shadow-xl border-0 overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
          {/* Background Pattern Odoo Style */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/80 via-purple-600/80 to-indigo-700/80"></div>
          <div className="absolute inset-0 opacity-20">
            <svg width="60" height="60" viewBox="0 0 60 60" className="absolute top-4 right-4">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="60" height="60" fill="url(#grid)"/>
            </svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <CardTitle className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-xl blur"></div>
                  <div className="relative p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <Package className="h-6 w-6 text-white drop-shadow-sm" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-bold text-white drop-shadow-sm">Inventario de Productos</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <span className="font-semibold">{sortedProducts.length}</span> productos
                    </Badge>
                    {!isOnline && (
                      <Badge className="bg-orange-500/90 text-white border-orange-400 backdrop-blur-sm animate-pulse">
                        📡 Modo Offline
                      </Badge>
                    )}
                  </div>
                </div>
              </CardTitle>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtro por categoría - Estilo Odoo */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-10 px-4 gap-2 bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-200 shadow-lg"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="font-medium">Categoría</span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-[320px] overflow-y-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                    <DropdownMenuItem 
                      onClick={() => setSelectedCategory('')} 
                      className={cn(
                        "py-3 px-4 transition-colors",
                        !selectedCategory ? 'bg-violet-50 text-violet-700 border-l-4 border-violet-500' : 'hover:bg-violet-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-violet-100 rounded-lg">
                          <span className="text-violet-600">🏠</span>
                        </div>
                        <span className="font-medium">Todas las categorías</span>
                      </div>
                    </DropdownMenuItem>
                    {categories
                      .filter(category => !category.parentId)
                      .map((category) => (
                        <DropdownMenuItem 
                          key={category.id} 
                          onClick={() => setSelectedCategory(category.id)}
                          className={cn(
                            "py-3 px-4 transition-colors",
                            selectedCategory === category.id ? 'bg-violet-50 text-violet-700 border-l-4 border-violet-500' : 'hover:bg-violet-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-purple-100 rounded-lg">
                              <Tags className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </DropdownMenuItem>
                      ))
                    }
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Ordenamiento - Estilo Odoo */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-10 px-4 gap-2 bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-200 shadow-lg"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="font-medium">Ordenar</span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                    <DropdownMenuItem 
                      onClick={() => setSortOrder('recent')} 
                      className={cn(
                        "py-3 px-4 transition-colors",
                        sortOrder === 'recent' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'hover:bg-indigo-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">Más recientes</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortOrder('oldest')} 
                      className={cn(
                        "py-3 px-4 transition-colors",
                        sortOrder === 'oldest' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'hover:bg-indigo-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <History className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">Más antiguos</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortOrder('name-asc')} 
                      className={cn(
                        "py-3 px-4 transition-colors",
                        sortOrder === 'name-asc' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'hover:bg-indigo-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Tags className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">Nombre (A-Z)</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortOrder('name-desc')} 
                      className={cn(
                        "py-3 px-4 transition-colors",
                        sortOrder === 'name-desc' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'hover:bg-indigo-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Tags className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">Nombre (Z-A)</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortOrder('price-high')} 
                      className={cn(
                        "py-3 px-4 transition-colors",
                        sortOrder === 'price-high' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'hover:bg-indigo-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">Precio (Mayor a menor)</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortOrder('price-low')} 
                      className={cn(
                        "py-3 px-4 transition-colors",
                        sortOrder === 'price-low' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'hover:bg-indigo-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">Precio (Menor a mayor)</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Indicador de filtro activo - Estilo Odoo */}
                {selectedCategory && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm gap-2 px-3 py-1.5 shadow-lg">
                    <div className="p-1 bg-white/20 rounded-full">
                      <Tags className="h-3 w-3" />
                    </div>
                    <span className="font-medium">{categories.find(cat => cat.id === selectedCategory)?.name || "Categoría"}</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedCategory('')}
                      className="h-5 w-5 p-0 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Barra de búsqueda mejorada - Estilo Odoo */}
            <div className="relative mt-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg"></div>
                <div className="relative flex items-center bg-white/5 backdrop-blur-sm border border-white/30 rounded-xl overflow-hidden shadow-2xl focus-within:ring-2 focus-within:ring-white/50 focus-within:border-white/50 transition-all duration-300">
                  <div className="pl-4 py-3">
                    <Search className="h-5 w-5 text-white/80" />
                  </div>
                  <Input 
                    placeholder="Buscar productos por nombre, descripción, categoría o precio..." 
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 flex-1 bg-transparent text-white placeholder-white/60 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSearchTerm('')}
                      className="h-8 w-8 mr-2 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 bg-gray-50/50">
          {loadingProducts ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-violet-200 rounded-full animate-ping opacity-20"></div>
                  <div className="relative p-4 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full shadow-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-violet-700 mt-4">Cargando productos...</p>
                <p className="text-sm text-gray-600 mt-1">Obteniendo inventario actualizado</p>
              </div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-violet-50 via-white to-purple-50 rounded-2xl border-2 border-dashed border-violet-200 shadow-inner">
              <div className="flex flex-col items-center max-w-md mx-auto">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-violet-200 rounded-2xl rotate-3 opacity-20"></div>
                  <div className="relative p-6 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl shadow-lg">
                    <Package className="h-16 w-16 text-violet-400 mx-auto" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-violet-800 mb-2">No se encontraron productos</h3>
                {searchTerm ? (
                  <div className="space-y-2">
                    <p className="text-violet-600">No hay productos que coincidan con tu búsqueda</p>
                    <p className="text-sm text-gray-500">Prueba con otros términos o revisa la ortografía</p>
                    <Button 
                      onClick={() => setSearchTerm('')} 
                      variant="outline" 
                      size="sm"
                      className="mt-3 border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                      Limpiar búsqueda
                    </Button>
                  </div>
                ) : selectedCategory ? (
                  <div className="space-y-2">
                    <p className="text-violet-600">No hay productos en esta categoría</p>
                    <p className="text-sm text-gray-500">Selecciona otra categoría o añade productos nuevos</p>
                    <Button 
                      onClick={() => setSelectedCategory('')} 
                      variant="outline" 
                      size="sm"
                      className="mt-3 border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                      Ver todas las categorías
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-violet-600">Aún no tienes productos en tu inventario</p>
                    <p className="text-sm text-gray-500">Añade tu primer producto para comenzar</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Grid de productos estilo Odoo */}
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {paginatedProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock);
                  const syncStatus = getSyncStatus(product.id);
                  const SyncIcon = syncStatus.icon;
                  
                  return (
                  <div 
                    key={product.id} 
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-violet-200 transform hover:-translate-y-1"
                  >
                    {/* Imagen del producto con overlay de estado */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      {loadingImages[product.id] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                          <div className="flex flex-col items-center">
                            <Loader2 className="h-6 w-6 text-violet-600 animate-spin mb-2" />
                            <span className="text-xs text-gray-500">Cargando...</span>
                          </div>
                        </div>
                      )}
                      <img
                        src={product.image}
                        alt={product.name}
                        className={cn(
                          "w-full h-full object-cover transition-all duration-500 group-hover:scale-110",
                          loadingImages[product.id] ? "opacity-0" : "opacity-100"
                        )}
                        onLoad={() => handleImageLoadEnd(product.id)}
                        onError={(e) => {
                          handleImageLoadEnd(product.id);
                          e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Sin+Imagen';
                        }}
                        onLoadStart={() => handleImageLoadStart(product.id)}
                      />
                      
                      {/* Overlay con indicadores */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                      
                      {/* Indicador de sincronización */}
                      <div className="absolute top-3 right-3 z-20">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "p-2 rounded-full shadow-lg backdrop-blur-sm border transition-all duration-200",
                                syncStatus.status === 'synced' && "bg-green-500/90 border-green-400",
                                syncStatus.status === 'pending' && "bg-orange-500/90 border-orange-400 animate-pulse",
                                syncStatus.status === 'error' && "bg-red-500/90 border-red-400",
                                syncStatus.status === 'syncing' && "bg-blue-500/90 border-blue-400"
                              )}>
                                <SyncIcon className="h-3 w-3 text-white" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-gray-900 text-white">
                              <p className="text-xs font-medium">{syncStatus.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      {/* Estado de stock */}
                      <div className="absolute top-3 left-3 z-20">
                        <Badge className={cn(
                          "shadow-lg backdrop-blur-sm border-0 font-semibold text-xs",
                          stockStatus.text === "En Stock" && "bg-green-500/90 text-white",
                          stockStatus.text === "Stock Bajo" && "bg-yellow-500/90 text-white",
                          stockStatus.text === "Sin Stock" && "bg-red-500/90 text-white"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full mr-1.5",
                            stockStatus.text === "En Stock" && "bg-green-300",
                            stockStatus.text === "Stock Bajo" && "bg-yellow-300",
                            stockStatus.text === "Sin Stock" && "bg-red-300"
                          )}></div>
                          {product.stock} unidades
                        </Badge>
                      </div>
                      
                      {/* Indicador offline */}
                      {product._tempId && (
                        <div className="absolute bottom-3 left-3 z-20">
                          <Badge className="bg-blue-500/90 text-white shadow-lg backdrop-blur-sm border-0 font-semibold text-xs">
                            📱 Offline
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Contenido del producto */}
                    <div className="p-5 space-y-4">
                      {/* Header con nombre y estado de sync */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-violet-700 transition-colors">
                            {product.name}
                          </h4>
                          {syncStatus.status !== 'synced' && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "gap-1.5 text-xs shrink-0 border-2",
                                syncStatus.status === 'error' && "border-red-200 bg-red-50 text-red-700",
                                syncStatus.status === 'pending' && "border-orange-200 bg-orange-50 text-orange-700",
                                syncStatus.status === 'syncing' && "border-blue-200 bg-blue-50 text-blue-700"
                              )}
                            >
                              <SyncIcon className={cn("h-3 w-3", syncStatus.color)} />
                              <span className="font-semibold">
                                {syncStatus.status === 'error' && 'Error'}
                                {syncStatus.status === 'pending' && 'Pendiente'}
                                {syncStatus.status === 'syncing' && 'Sincronizando'}
                              </span>
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                      
                      {/* Categorías */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-medium">
                          <Tags className="h-3 w-3 mr-1.5" />
                          {product.categoryName || product.category}
                        </Badge>
                        {product.subcategoryName && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                            <span className="text-xs opacity-60 mr-1">→</span>
                            {product.subcategoryName}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Precio */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div>
                          <span className="text-2xl font-bold text-green-600">
                            ${(product.precioVenta || product.price || 0).toLocaleString()}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">Precio de venta</p>
                        </div>
                        
                        {product.lastModified && (
                          <div className="text-right">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(product.lastModified.toDate?.() || product.lastModified).toLocaleDateString()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Acciones del producto */}
                    <div className="px-5 pb-5">
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(product)}
                                className="flex-1 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all duration-200 font-medium"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-violet-600 text-white">
                              <p className="text-xs font-medium">
                                {liberta === "si" ? "Editar producto" : "Enviar cambios a revisión"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newWindow = window.open(`/producto/${product.id}`, '_blank');
                                  newWindow?.focus();
                                }}
                                className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-blue-600 text-white">
                              <p className="text-xs font-medium">Ver producto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-red-600 text-white">
                                  <p className="text-xs font-medium">Eliminar producto</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-0 shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-full">
                                  <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <span className="text-red-800">
                                  {liberta === "si" ? "¿Eliminar producto?" : "¿Enviar solicitud de eliminación?"}
                                </span>
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-600 pl-11">
                                {liberta === "si" ? 
                                  `Esta acción es irreversible y eliminará permanentemente el producto "${product.name}" del sistema.` :
                                  `Se enviará una solicitud para eliminar el producto "${product.name}" que requerirá aprobación del administrador.`
                                }
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="hover:bg-gray-50">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(product.id)}
                                className="bg-red-600 hover:bg-red-700 shadow-lg"
                              >
                                {liberta === "si" ? "Eliminar definitivamente" : "Enviar solicitud"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón cargar más - Estilo Odoo */}
            {hasMoreProducts && (
              <div className="flex justify-center mt-12">
                <Button 
                  onClick={loadMoreProducts} 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={loadingMoreProducts}
                >
                  {loadingMoreProducts ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Cargando productos...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-3" />
                      Cargar más productos ({sortedProducts.length - paginatedProducts.length} restantes)
                    </>
                  )}
                </Button>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
