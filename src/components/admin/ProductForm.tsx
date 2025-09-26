import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { 
  Plus, Package, Edit, Trash2, Search, Save, X, Image, AlertTriangle, Check, CreditCard, 
  ShieldCheck, Award, Wand2, ChevronDown, Calendar, Clock, Filter, RefreshCw, Tags, History, 
  SlidersHorizontal, Loader2, Eye, TrendingUp, CheckCircle, Upload, WifiOff, AlertCircle,
  Settings, FileText, Palette, Star, Shield, Tag, DollarSign, Calculator, ShoppingCart,
  ChevronUp, Hash, BarChart3
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
    claveNumerica: '', // Nuevo: Clave numérica del producto
    codigoBarras: '', // Nuevo: Código de barras del producto
    precioVenta: '', // Precio de venta (antes era price)
    precioCosto: '', // Nuevo: Precio de costo
    precioMayoreo: '', // Nuevo: Precio de mayoreo
    ganancia: 0, // Calculado automáticamente
    porcentajeGanancia: 0, // Calculado automáticamente
    ivaAplicable: true, // Nuevo: Si aplica IVA al producto
    tasaIva: 21, // Nuevo: Tasa de IVA específica del producto (21% por defecto)
    category: '',
    subcategory: '',  // Será "none" en la UI, pero guardamos como "" cuando no hay subcategoría
    terceraCategoria: '', // Será "none" en la UI, pero guardamos como "" cuando no hay tercera categoría
    stock: '0.00', // Inicializar como decimal para productos granel/kilos
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
    tipoVenta: 'unidad' as 'unidad' | 'granel' | 'paquete' | 'kilos' // Tipo de venta
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
      // Filter out deleted products
      const allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeProducts = allProducts.filter((product: any) => !product.deleted);
      setProducts(activeProducts);
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

    // Validar códigos únicos
    if (formData.claveNumerica) {
      const duplicateClaveProduct = products.find(p => 
        p.claveNumerica === formData.claveNumerica && 
        (!isEditing || p.id !== editingId)
      );
      if (duplicateClaveProduct) {
        toast({
          variant: "destructive",
          title: "Clave numérica duplicada",
          description: `La clave numérica "${formData.claveNumerica}" ya está siendo usada por el producto "${duplicateClaveProduct.name}".`
        });
        return;
      }
    }

    if (formData.codigoBarras) {
      const duplicateCodigoProduct = products.find(p => 
        p.codigoBarras === formData.codigoBarras && 
        (!isEditing || p.id !== editingId)
      );
      if (duplicateCodigoProduct) {
        toast({
          variant: "destructive",
          title: "Código de barras duplicado",
          description: `El código de barras "${formData.codigoBarras}" ya está siendo usada por el producto "${duplicateCodigoProduct.name}".`
        });
        return;
      }
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
    
    // Para productos a granel o por kilos, usar parseFloat; para el resto, parseInt
    const numericStock = (formData.tipoVenta === 'granel' || formData.tipoVenta === 'kilos') 
      ? parseFloat(formData.stock) 
      : parseInt(formData.stock, 10);
    
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
          
          // Generar detalles de los cambios
          const changes = generateChangeDetails(currentProduct, productData);
          
          // Usar sistema offline para actualizar
          if (isOnline) {
            await updateDoc(doc(db, "products", editingId), productData);
            toast({
              title: "Producto actualizado",
              description: "El producto ha sido actualizado exitosamente."
            });
            // Registrar actividad con detalles de cambios
            await logActivity("Actualización", `Producto "${formData.name}" actualizado exitosamente`, formData.name, changes);
          } else {
            updateDocument("products", editingId, productData);
            toast({
              title: "📱 Producto guardado offline",
              description: "El producto se sincronizará automáticamente cuando recuperes la conexión.",
              className: "bg-blue-50 border border-blue-200 text-blue-800"
            });
            // Registrar actividad offline con detalles de cambios
            await logActivity("Actualización (Offline)", `Producto "${formData.name}" actualizado - pendiente de sincronización`, formData.name, changes);
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
            // Registrar actividad con detalles de cambios
            const currentProduct = products.find(product => product.id === editingId);
            const changes = generateChangeDetails(currentProduct, productData);
            await logActivity("Envío a Revisión", `Cambios del producto "${formData.name}" enviados para aprobación`, formData.name, changes);
          } else {
            createDocument("revision", revisionData);
            toast({
              title: "📱 Cambios guardados offline",
              description: "Los cambios se enviarán a revisión cuando recuperes la conexión.",
              className: "bg-blue-50 border border-blue-200 text-blue-800"
            });
            // Registrar actividad offline con detalles de cambios
            const currentProduct = products.find(product => product.id === editingId);
            const changes = generateChangeDetails(currentProduct, productData);
            await logActivity("Envío a Revisión (Offline)", `Cambios del producto "${formData.name}" guardados - pendientes de envío`, formData.name, changes);
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
              // Registrar actividad con detalles del producto creado
              const productDetails = {
                name: formData.name,
                precioVenta: numericPrecioVenta,
                precioCosto: numericPrecioCosto,
                stock: numericStock,
                category: categoryName,
                subcategory: subcategoryName
              };
              await logActivity("Creación", `Nuevo producto "${formData.name}" agregado exitosamente`, formData.name, { type: 'create', data: productDetails });
              // Actualizar la lista de productos
              setProducts([...products, { id: docRef.id, ...productWithMetadata }]);
            } else {
              const actionId = createDocument("products", productWithMetadata);
              toast({
                title: "📱 Producto guardado offline",
                description: "El producto se sincronizará automáticamente cuando recuperes la conexión.",
                className: "bg-blue-50 border border-blue-200 text-blue-800"
              });
              // Registrar actividad offline con detalles del producto creado
              const productDetails = {
                name: formData.name,
                precioVenta: numericPrecioVenta,
                precioCosto: numericPrecioCosto,
                stock: numericStock,
                category: categoryName,
                subcategory: subcategoryName
              };
              await logActivity("Creación (Offline)", `Nuevo producto "${formData.name}" guardado - pendiente de sincronización`, formData.name, { type: 'create', data: productDetails });
              // Actualizar la lista de productos localmente con ID temporal
              setProducts([...products, { id: actionId, ...productWithMetadata, _tempId: true }]);
            }          resetForm();
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
            // Registrar actividad con detalles del nuevo producto
            const productDetails = {
              name: formData.name,
              precioVenta: numericPrecioVenta,
              precioCosto: numericPrecioCosto,
              stock: numericStock,
              category: categoryName,
              subcategory: subcategoryName
            };
            await logActivity("Envío a Revisión", `Nuevo producto "${formData.name}" enviado para aprobación`, formData.name, { type: 'create', data: productDetails });
          } else {
            createDocument("revision", revisionData);
            toast({
              title: "📱 Producto guardado offline",
              description: "El producto se enviará a revisión cuando recuperes la conexión.",
              className: "bg-blue-50 border border-blue-200 text-blue-800"
            });
            // Registrar actividad offline con detalles del nuevo producto
            const productDetails = {
              name: formData.name,
              precioVenta: numericPrecioVenta,
              precioCosto: numericPrecioCosto,
              stock: numericStock,
              category: categoryName,
              subcategory: subcategoryName
            };
            await logActivity("Envío a Revisión (Offline)", `Nuevo producto "${formData.name}" guardado - pendiente de envío`, formData.name, { type: 'create', data: productDetails });
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
      claveNumerica: String(product.claveNumerica || ''),
      codigoBarras: String(product.codigoBarras || ''),
      precioVenta: String(product.precioVenta || product.price || ''), // Compatibilidad con productos antiguos
      precioCosto: String(product.precioCosto || ''),
      precioMayoreo: String(product.precioMayoreo || ''),
      ganancia: product.ganancia || 0,
      porcentajeGanancia: product.porcentajeGanancia || 0,
      ivaAplicable: product.ivaAplicable !== undefined ? product.ivaAplicable : true,
      tasaIva: product.tasaIva || 21,
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
    
    // Abrir el modal del formulario
    setShowProductForm(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      const productToDelete = products.find(p => p.id === productId);
      const productName = productToDelete?.name || "Producto desconocido";
      
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
          // Registrar actividad con detalles del producto eliminado
          const deletionDetails = {
            type: 'delete',
            data: { id: productId, name: productName }
          };
          await logActivity("Eliminación", `Producto "${productName}" eliminado exitosamente`, productName, deletionDetails);
        } else {
          updateDocument("products", productId, deleteData);
          toast({
            title: "📱 Eliminación guardada offline",
            description: "El producto se marcará como eliminado cuando recuperes la conexión.",
            className: "bg-blue-50 border border-blue-200 text-blue-800"
          });
          // Registrar actividad offline con detalles del producto eliminado
          const deletionDetails = {
            type: 'delete',
            data: { id: productId, name: productName }
          };
          await logActivity("Eliminación (Offline)", `Producto "${productName}" marcado para eliminación - pendiente de sincronización`, productName, deletionDetails);
        }
        
        // Actualizar la lista de productos (no mostramos los marcados como eliminados)
        setProducts(products.filter(product => product.id !== productId));
      } else {
        // Si no tiene libertad, envía a revisión
        const revisionData = {
          type: "delete",
          data: { id: productId, name: productName },
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
          // Registrar actividad
          await logActivity("Solicitud de Eliminación", `Solicitud de eliminación para "${productName}" enviada a revisión`, productName);
        } else {
          createDocument("revision", revisionData);
          toast({
            title: "📱 Solicitud guardada offline",
            description: "La solicitud se enviará a revisión cuando recuperes la conexión.",
            className: "bg-blue-50 border border-blue-200 text-blue-800"
          });
          // Registrar actividad offline
          await logActivity("Solicitud de Eliminación (Offline)", `Solicitud de eliminación para "${productName}" guardada - pendiente de envío`, productName);
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
      claveNumerica: '',
      codigoBarras: '',
      precioVenta: '',
      precioCosto: '',
      precioMayoreo: '',
      ganancia: 0,
      porcentajeGanancia: 0,
      ivaAplicable: true,
      tasaIva: 21,
      category: '',
      subcategory: '',
      terceraCategoria: '',
      stock: '0.00',
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
    
    // Cerrar el modal
    setShowProductForm(false);
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
  
  // Filter products based on search term, category, and ecommerce availability
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    // Filter only products specifically enabled for ecommerce
    filtered = filtered.filter(product => product.habilitarEcommerce === true);
    
    // Filter by search term if present
    if (searchTerm.trim()) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(lowercasedTerm)) || 
        (product.description && product.description.toLowerCase().includes(lowercasedTerm)) ||
        (product.category && product.category.toLowerCase().includes(lowercasedTerm)) ||
        (product.claveNumerica && product.claveNumerica.toLowerCase().includes(lowercasedTerm)) ||
        (product.codigoBarras && product.codigoBarras.toLowerCase().includes(lowercasedTerm)) ||
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

  // Estado para controlar la visibilidad del formulario
  const [showProductForm, setShowProductForm] = useState(false);

  // Estados para el registro de actividades
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivityLog, setLoadingActivityLog] = useState(true);
  const [visibleActivities, setVisibleActivities] = useState(10);
  const [activityFilter, setActivityFilter] = useState<'all' | 'creation' | 'update' | 'delete' | 'revision'>('all');
  const [activityDateFilter, setActivityDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [activityUserFilter, setActivityUserFilter] = useState<string>('all');
  const [activityStats, setActivityStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    byAction: {} as Record<string, number>,
    byUser: {} as Record<string, number>
  });
  const [showActivityFilters, setShowActivityFilters] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [activityDetails, setActivityDetails] = useState<{[key: string]: any}>({});

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
    fetchActivityLog();
  }, []);

  // Función para obtener el registro de actividades
  const fetchActivityLog = async () => {
    try {
      setLoadingActivityLog(true);
      
      // Obtener actividades de productos
      const productActivitiesQuery = query(
        collection(db, "productActivities"),
        orderBy("timestamp", "desc")
      );
      const productActivitiesSnapshot = await getDocs(productActivitiesQuery);
      const productActivities = productActivitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'product'
      }));

      // Obtener actividades de revisión
      const revisionActivitiesQuery = query(
        collection(db, "revision"),
        orderBy("timestamp", "desc")
      );
      const revisionActivitiesSnapshot = await getDocs(revisionActivitiesQuery);
      const revisionActivities = revisionActivitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'revision'
      }));

      // Combinar y ordenar todas las actividades
      const allActivities = [...productActivities, ...revisionActivities]
        .sort((a: any, b: any) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp) || new Date();
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp) || new Date();
          return bTime.getTime() - aTime.getTime();
        });

      setActivityLog(allActivities);
      calculateActivityStats(allActivities);
    } catch (error) {
      console.error("Error fetching activity log:", error);
    } finally {
      setLoadingActivityLog(false);
    }
  };

  // Función para calcular estadísticas de actividades
  const calculateActivityStats = (activities: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: activities.length,
      today: 0,
      thisWeek: 0,
      byAction: {} as Record<string, number>,
      byUser: {} as Record<string, number>
    };

    activities.forEach(activity => {
      const activityDate = activity.timestamp?.toDate?.() || new Date(activity.timestamp) || new Date();
      
      // Contar actividades de hoy
      if (activityDate >= today) {
        stats.today++;
      }
      
      // Contar actividades de esta semana
      if (activityDate >= weekAgo) {
        stats.thisWeek++;
      }

      // Contar por tipo de acción
      const actionType = activity.action || 'Desconocido';
      stats.byAction[actionType] = (stats.byAction[actionType] || 0) + 1;

      // Contar por usuario
      const user = activity.userName || activity.userEmail || 'Usuario desconocido';
      stats.byUser[user] = (stats.byUser[user] || 0) + 1;
    });

    setActivityStats(stats);
  };

  // Función para registrar una actividad
  const logActivity = async (action: string, details: string, productName?: string, changeDetails?: any) => {
    try {
      const activityData = {
        action,
        details,
        productName: productName || null,
        userEmail: user?.email || "unknown",
        userName: user?.name || user?.email || "Usuario desconocido",
        timestamp: new Date(),
        isOnline: isOnline,
        changeDetails: changeDetails || null
      };

      if (isOnline) {
        await addDoc(collection(db, "productActivities"), activityData);
      } else {
        // Si está offline, agregar a la cola de sincronización
        createDocument("productActivities", activityData);
      }

      // Actualizar el log local inmediatamente
      setActivityLog(prev => [{ id: Date.now().toString(), ...activityData, type: 'product' }, ...prev]);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

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

  // Función para calcular tiempo transcurrido
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'hace unos segundos';
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)} días`;
    return date.toLocaleDateString('es-ES');
  };

  // Función para filtrar actividades
  const getFilteredActivities = () => {
    let filtered = [...activityLog];

    // Filtrar por tipo de acción
    if (activityFilter !== 'all') {
      filtered = filtered.filter(activity => {
        const action = activity.action?.toLowerCase() || '';
        switch (activityFilter) {
          case 'creation':
            return action.includes('creación') || action.includes('creacion');
          case 'update':
            return action.includes('actualización') || action.includes('actualizacion');
          case 'delete':
            return action.includes('eliminación') || action.includes('eliminacion');
          case 'revision':
            return action.includes('revisión') || action.includes('revision');
          default:
            return true;
        }
      });
    }

    // Filtrar por fecha
    if (activityDateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(activity => {
        const activityDate = activity.timestamp?.toDate?.() || new Date(activity.timestamp) || new Date();
        
        switch (activityDateFilter) {
          case 'today':
            return activityDate >= today;
          case 'week':
            return activityDate >= weekAgo;
          case 'month':
            return activityDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Filtrar por usuario
    if (activityUserFilter !== 'all') {
      filtered = filtered.filter(activity => {
        const user = activity.userName || activity.userEmail || 'Usuario desconocido';
        return user === activityUserFilter;
      });
    }

    return filtered;
  };

  // Obtener usuarios únicos para el filtro
  const getUniqueUsers = () => {
    const users = new Set<string>();
    activityLog.forEach(activity => {
      const user = activity.userName || activity.userEmail || 'Usuario desconocido';
      users.add(user);
    });
    return Array.from(users);
  };

  // Función para generar detalles de cambios comparando el estado anterior y nuevo
  const generateChangeDetails = (oldData: any, newData: any) => {
    const changes: any = {
      modified: [],
      added: [],
      removed: []
    };

    if (!oldData) return { type: 'create', data: newData };

    // Campos a comparar
    const fieldsToCompare = [
      'name', 'description', 'claveNumerica', 'codigoBarras', 'precioVenta', 'precioCosto', 'precioMayoreo', 
      'stock', 'category', 'subcategory', 'terceraCategoria', 'isOffer', 
      'discount', 'originalPrice', 'habilitarEcommerce', 'tipoVenta', 'ivaAplicable', 'tasaIva'
    ];

    fieldsToCompare.forEach(field => {
      const oldValue = oldData[field];
      const newValue = newData[field];

      if (oldValue !== newValue) {
        changes.modified.push({
          field: getFieldDisplayName(field),
          oldValue: formatFieldValue(field, oldValue),
          newValue: formatFieldValue(field, newValue)
        });
      }
    });

    // Comparar arrays como benefits, warranties, paymentMethods
    const arrayFields = ['benefits', 'warranties', 'paymentMethods'];
    arrayFields.forEach(field => {
      const oldArray = oldData[field] || [];
      const newArray = newData[field] || [];
      
      if (JSON.stringify(oldArray) !== JSON.stringify(newArray)) {
        changes.modified.push({
          field: getFieldDisplayName(field),
          oldValue: oldArray.length > 0 ? oldArray.join(', ') : 'Sin datos',
          newValue: newArray.length > 0 ? newArray.join(', ') : 'Sin datos'
        });
      }
    });

    return { type: 'update', changes };
  };

  // Función para obtener nombres legibles de los campos
  const getFieldDisplayName = (field: string) => {
    const fieldNames: {[key: string]: string} = {
      name: 'Nombre',
      description: 'Descripción',
      claveNumerica: 'Clave Numérica',
      codigoBarras: 'Código de Barras',
      precioVenta: 'Precio de Venta',
      precioCosto: 'Precio de Costo',
      precioMayoreo: 'Precio de Mayoreo',
      stock: 'Stock',
      category: 'Categoría',
      subcategory: 'Subcategoría',
      terceraCategoria: 'Tercera Categoría',
      isOffer: 'Es Oferta',
      discount: 'Descuento',
      originalPrice: 'Precio Original',
      habilitarEcommerce: 'Habilitado para Ecommerce',
      tipoVenta: 'Tipo de Venta',
      ivaAplicable: 'IVA Aplicable',
      tasaIva: 'Tasa de IVA',
      benefits: 'Beneficios',
      warranties: 'Garantías',
      paymentMethods: 'Métodos de Pago'
    };
    return fieldNames[field] || field;
  };

  // Función para formatear valores de campos
  const formatFieldValue = (field: string, value: any) => {
    if (value === null || value === undefined || value === '') return 'Sin datos';
    
    if (field.includes('precio') || field.includes('Price') || field === 'discount') {
      return typeof value === 'number' ? `$${value.toLocaleString()}` : `$${value}`;
    }
    
    if (field === 'isOffer' || field === 'ivaAplicable') {
      return value ? 'Sí' : 'No';
    }
    
    if (field === 'habilitarEcommerce') {
      return value ? 'Habilitado' : 'Deshabilitado';
    }
    
    if (field === 'tipoVenta') {
      const types = { unidad: 'Por Unidad', granel: 'A Granel', paquete: 'Por Paquete', kilos: 'Por Kilos' };
      return types[value as keyof typeof types] || value;
    }

    if (field === 'tasaIva') {
      const numValue = parseFloat(value);
      return `${numValue.toFixed(1)}%`;
    }
    
    return String(value);
  };

  // Función para expandir/colapsar detalles de actividad
  const toggleActivityDetails = async (activityId: string, activity: any) => {
    if (expandedActivity === activityId) {
      setExpandedActivity(null);
    } else {
      setExpandedActivity(activityId);
      
      // Si no tenemos los detalles cargados, obtenerlos
      if (!activityDetails[activityId] && activity.changeDetails) {
        setActivityDetails(prev => ({
          ...prev,
          [activityId]: activity.changeDetails
        }));
      }
    }
  };

  // Función para obtener el color del avatar del usuario
  const getUserAvatarColor = (username: string) => {
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
    ];
    const index = username.length % colors.length;
    return colors[index];
  };

  // Función para obtener las iniciales del usuario
  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Función para exportar actividades (simulada)
  const exportActivities = () => {
    const filteredActivities = getFilteredActivities();
    const csvContent = [
      ['Fecha', 'Usuario', 'Acción', 'Producto', 'Detalles'].join(','),
      ...filteredActivities.map(activity => [
        (activity.timestamp?.toDate?.() || new Date(activity.timestamp) || new Date()).toLocaleDateString('es-ES'),
        activity.userName || activity.userEmail || 'Usuario desconocido',
        activity.action,
        activity.productName || 'N/A',
        `"${activity.details.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actividades_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Exportación completada",
      description: "Las actividades se han exportado exitosamente a CSV."
    });
  };

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
          {/* Botón para mostrar formulario de producto */}
          <Button 
            onClick={() => {
              // Resetear el estado de edición y limpiar el formulario
              setIsEditing(false);
              setEditingId(null);
              setFormData({
                name: '',
                description: '',
                claveNumerica: '',
                codigoBarras: '',
                precioVenta: '',
                precioCosto: '',
                precioMayoreo: '',
                ganancia: 0,
                porcentajeGanancia: 0,
                ivaAplicable: true,
                tasaIva: 21,
                category: '',
                subcategory: '',
                terceraCategoria: '',
                stock: '0.00',
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
              setShowProductForm(true);
            }}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
          
          {/* Botón de promociones compacto cuando no hay promociones activas */}
          {activePromotions.length === 0 && (
            <Button 
              onClick={() => setShowPromotionModal(true)}
              variant="outline"
              size="sm"
              className="bg-white border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
            >
              <Award className="h-4 w-4 mr-2" />
              Nueva Promoción
            </Button>
          )}
          
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

      {/* Sección de Promociones - Solo visible cuando hay promociones activas */}
      {activePromotions.length > 0 && (
        <Card className="shadow-lg border border-orange-200 overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-orange-100 to-amber-50 border-b border-orange-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-orange-500 rounded-lg shadow-sm">
                  <Award className="h-4 w-4 text-white" />
                </div>
                <span className="text-orange-800 font-semibold">
                  Promociones Activas
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    // Resetear el estado de edición y limpiar el formulario
                    setIsEditing(false);
                    setEditingId(null);
                    setFormData({
                      name: '',
                      description: '',
                      claveNumerica: '',
                      codigoBarras: '',
                      precioVenta: '',
                      precioCosto: '',
                      precioMayoreo: '',
                      ganancia: 0,
                      porcentajeGanancia: 0,
                      ivaAplicable: true,
                      tasaIva: 21,
                      category: '',
                      subcategory: '',
                      terceraCategoria: '',
                      stock: '0.00',
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
                    setShowProductForm(true);
                  }}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
                
                <Button 
                  onClick={() => setShowPromotionModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Promoción
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3">
              {activePromotions.map((promotion: any) => (
                <div key={promotion.id} className="flex items-center justify-between p-3 bg-orange-50/50 border border-orange-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <CreditCard className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{promotion.nombre}</h4>
                        <p className="text-sm text-gray-600">{promotion.descripcion}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                        {promotion.descuento}% de descuento
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(promotion.fechaInicio.toDate?.() || promotion.fechaInicio).toLocaleDateString()} - {new Date(promotion.fechaFin.toDate?.() || promotion.fechaFin).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className={promotion.aplicarA === 'todos' ? 'border-blue-200 text-blue-700' : 'border-green-200 text-green-700'}>
                        {promotion.aplicarA === 'todos' ? 'Todos los productos' : `Categoría: ${categories.find(cat => cat.id === promotion.categoriaSeleccionada)?.name || 'N/A'}`}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivatePromotion(promotion.id)}
                    className="text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Desactivar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

      <Separator className="my-8" />
      
      {/* Modal para formulario de producto */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Package className="h-6 w-6 text-blue-600" />
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Formulario Simplificado */}
            <div className="space-y-8">
              {/* Grid principal - 2 columnas en desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Columna izquierda */}
                <div className="space-y-6">
                  {/* Nombre del producto */}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      Nombre del Producto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej: Coca-Cola 600ml"
                      required
                      className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Clave numérica y código de barras */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Clave numérica */}
                    <div className="space-y-3">
                      <Label htmlFor="claveNumerica" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-purple-600" />
                        Clave Numérica
                      </Label>
                      <Input
                        id="claveNumerica"
                        type="text"
                        value={formData.claveNumerica}
                        onChange={(e) => setFormData({...formData, claveNumerica: e.target.value})}
                        placeholder="Ej: 001234"
                        className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500">Código numérico único para identificar el producto</p>
                    </div>

                    {/* Código de barras */}
                    <div className="space-y-3">
                      <Label htmlFor="codigoBarras" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                        Código de Barras
                      </Label>
                      <Input
                        id="codigoBarras"
                        type="text"
                        value={formData.codigoBarras}
                        onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})}
                        placeholder="Ej: 7891234567890"
                        className="h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500">Código de barras del producto (EAN-13, UPC, etc.)</p>
                    </div>
                  </div>

                  {/* Precio de venta */}
                  <div className="space-y-3">
                    <Label htmlFor="precioVenta" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Precio de Venta <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-base">$</div>
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
                        className="h-12 pl-10 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Precio de costo */}
                  <div className="space-y-3">
                    <Label htmlFor="precioCosto" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-orange-600" />
                      Precio de Costo
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-base">$</div>
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
                        className="h-12 pl-10 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="space-y-3">
                    <Label htmlFor="stock" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-600" />
                      {formData.tipoVenta === 'kilos' ? 'Stock (kg)' : 
                       formData.tipoVenta === 'granel' ? 'Stock disponible' : 
                       'Stock'} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      step={formData.tipoVenta === 'granel' || formData.tipoVenta === 'kilos' ? "0.01" : "1"}
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      placeholder={
                        formData.tipoVenta === 'kilos' ? '0.00' :
                        formData.tipoVenta === 'granel' ? '0.00' :
                        '100'
                      }
                      required
                      className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {(formData.tipoVenta === 'granel' || formData.tipoVenta === 'kilos') && (
                      <p className="text-sm text-gray-500 mt-1">
                        💡 Para productos {formData.tipoVenta === 'kilos' ? 'por kilogramo' : 'a granel'}, 
                        puedes usar decimales (ej: 2.5{formData.tipoVenta === 'kilos' ? ' kg' : ''})
                      </p>
                    )}
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="space-y-6">
                  {/* Categoría */}
                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <Tags className="h-4 w-4 text-indigo-600" />
                      Categoría <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => {
                        setFormData({...formData, category: value, subcategory: ''}); 
                      }}
                    >
                      <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500">
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

                  {/* Subcategoría (solo si hay categoría) */}
                  {formData.category && (
                    <div className="space-y-3">
                      <Label htmlFor="subcategory" className="text-base font-semibold text-gray-700">
                        Subcategoría
                      </Label>
                      <Select 
                        value={formData.subcategory || "none"} 
                        onValueChange={(value) => setFormData({
                          ...formData, 
                          subcategory: value === "none" ? "" : value,
                          terceraCategoria: ""
                        })}
                      >
                        <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Seleccionar subcategoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin subcategoría</SelectItem>
                          {categories
                            .filter(category => category.parentId === formData.category)
                            .map((subCategory) => (
                              <SelectItem key={subCategory.id} value={subCategory.id}>
                                {subCategory.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Imagen principal */}
                  <div className="space-y-3">
                    <Label htmlFor="image" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <Image className="h-4 w-4 text-pink-600" />
                      Imagen Principal (URL)
                    </Label>
                    <Input
                      id="image"
                      value={formData.image}
                      onChange={(e) => setFormData({...formData, image: e.target.value})}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    {formData.image && (
                      <div className="mt-3 w-24 h-20 rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
                        <img 
                          src={formData.image} 
                          alt="Vista previa" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3I8L3RleHQ+PC9zdmc+';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      Descripción <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe el producto..."
                      required
                      className="min-h-[120px] text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Switch para ecommerce */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      Habilitar para Ecommerce
                    </Label>
                    <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Switch
                        checked={formData.habilitarEcommerce}
                        onCheckedChange={(checked) => setFormData({...formData, habilitarEcommerce: checked})}
                        className="data-[state=checked]:bg-blue-600"
                      />
                      <span className="text-sm font-medium text-blue-800">
                        {formData.habilitarEcommerce ? 'Habilitado para venta online' : 'Solo para uso interno'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Análisis de ganancia (solo si hay precio de costo) */}
              {formData.precioCosto && parseFloat(formData.precioCosto) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Análisis de Rentabilidad</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-600">Ganancia:</span>
                      <span className="font-semibold ml-1">
                        ${formData.ganancia.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-600">Margen:</span>
                      <span className="font-semibold ml-1">{formData.porcentajeGanancia.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setFormData({
                    ...formData,
                    name: "Producto de Prueba",
                    precioVenta: "5000",
                    precioCosto: "3000", 
                    stock: "25",
                    description: "Descripción de prueba para el producto."
                  });
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 h-12 px-6 text-base"
              >
                <Wand2 className="h-5 w-5 mr-2" />
                Datos de Prueba
              </Button>
              
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 text-base font-semibold"
              >
                <Save className="h-5 w-5 mr-2" />
                {isEditing && liberta !== "si" 
                  ? 'Enviar a Revisión' 
                  : isEditing 
                    ? 'Actualizar Producto' 
                    : liberta !== "si" 
                      ? 'Enviar a Revisión' 
                      : 'Guardar Producto'}
              </Button>
              
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="border-gray-300 hover:bg-gray-50 h-12 px-6 text-base"
                >
                  <X className="h-5 w-5 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>

            {/* Sección de Personalizaciones Avanzadas */}
            <div className="space-y-8 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-600 rounded-lg shadow-sm">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Personalizaciones Avanzadas</h3>
                  <p className="text-sm text-gray-600 mt-1">Configuraciones adicionales y características especializadas</p>
                </div>
              </div>

              {/* Grid de personalizaciones en pestañas colapsables */}
              <div className="space-y-6">
                
                {/* Precio de mayoreo */}
                <details className="group border border-gray-300 rounded-xl shadow-sm">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span className="text-base font-semibold text-gray-800">Precio de Mayoreo</span>
                    </div>
                    <ChevronDown className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-4 pt-0">
                    <div className="space-y-3">
                      <Label htmlFor="precioMayoreo" className="text-base font-medium text-gray-700">
                        Precio para mayoristas
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-base">$</div>
                        <Input
                          id="precioMayoreo"
                          type="number"
                          step="0.01"
                          value={formData.precioMayoreo}
                          onChange={(e) => setFormData({...formData, precioMayoreo: e.target.value})}
                          placeholder="11000.00"
                          className="h-12 pl-10 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </details>

                {/* Configuración de IVA */}
                <details className="group border border-gray-300 rounded-xl shadow-sm">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Calculator className="h-5 w-5 text-red-600" />
                      <span className="text-base font-semibold text-gray-800">Configuración de IVA</span>
                    </div>
                    <ChevronDown className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-4 pt-0 space-y-6">
                    {/* Switch para aplicar IVA */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-gray-800">¿Este producto tiene IVA?</Label>
                        <p className="text-xs text-gray-600">Activa esta opción si el producto debe incluir IVA en su precio</p>
                      </div>
                      <Switch
                        checked={formData.ivaAplicable}
                        onCheckedChange={(checked) => setFormData({...formData, ivaAplicable: checked})}
                        className="data-[state=checked]:bg-red-600"
                      />
                    </div>
                    
                    {/* Tasa de IVA - Solo visible si IVA está activado */}
                    {formData.ivaAplicable && (
                      <div className="space-y-3">
                        <Label htmlFor="tasaIva" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-red-600">%</span>
                          Tasa de IVA
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="tasaIva"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={formData.tasaIva}
                            onChange={(e) => setFormData({...formData, tasaIva: parseFloat(e.target.value) || 0})}
                            placeholder="Ej: 21"
                            className="h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
                          />
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({...formData, tasaIva: 0})}
                              className="h-11 px-3 text-xs border-gray-300 hover:bg-gray-50"
                            >
                              0%
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({...formData, tasaIva: 10.5})}
                              className="h-11 px-3 text-xs border-gray-300 hover:bg-gray-50"
                            >
                              10.5%
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({...formData, tasaIva: 21})}
                              className="h-11 px-3 text-xs border-gray-300 hover:bg-gray-50"
                            >
                              21%
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({...formData, tasaIva: 27})}
                              className="h-11 px-3 text-xs border-gray-300 hover:bg-gray-50"
                            >
                              27%
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Ingresa cualquier porcentaje de IVA personalizado o usa los botones para tasas comunes
                        </p>
                      </div>
                    )}
                  </div>
                </details>

                {/* Configuración de venta */}
                <details className="group border border-gray-300 rounded-xl shadow-sm">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-cyan-600" />
                      <span className="text-base font-semibold text-gray-800">Configuración de Venta</span>
                    </div>
                    <ChevronDown className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-4 pt-0 space-y-6">
                    {/* Tipo de venta */}
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Tipo de venta</Label>
                      <div className="space-y-2">
                        {[
                          { value: 'unidad', label: 'Por unidad', desc: 'Cantidades enteras' },
                          { value: 'granel', label: 'A granel', desc: 'Por peso/medida' },
                          { value: 'paquete', label: 'Por paquete', desc: 'Conjunto completo' },
                          { value: 'kilos', label: 'Por kilos', desc: 'Venta por peso en kg' }
                        ].map((tipo) => (
                          <label key={tipo.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="tipoVenta"
                              value={tipo.value}
                              checked={formData.tipoVenta === tipo.value}
                              onChange={() => {
                                const newTipoVenta = tipo.value as 'unidad' | 'granel' | 'paquete' | 'kilos';
                                setFormData({
                                  ...formData, 
                                  tipoVenta: newTipoVenta,
                                  // Reset stock to 0.00 for granel and kilos, empty for others
                                  stock: (newTipoVenta === 'granel' || newTipoVenta === 'kilos') ? '0.00' : ''
                                });
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div>
                              <div className="text-sm font-medium">{tipo.label}</div>
                              <div className="text-xs text-gray-500">{tipo.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Configuración e-commerce */}
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Visibilidad en tienda</Label>
                      <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.habilitarEcommerce}
                          onChange={(e) => setFormData({...formData, habilitarEcommerce: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <div className="text-sm font-medium">Visible en tienda online</div>
                          <div className="text-xs text-gray-500">Los clientes podrán ver este producto</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </details>

                {/* Configuración de ofertas */}
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Sistema de Ofertas</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3 pt-0 space-y-4">
                    <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.isOffer}
                        onChange={(e) => setFormData({...formData, isOffer: e.target.checked})}
                        className="w-4 h-4 text-red-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-medium">Activar oferta especial</div>
                        <div className="text-xs text-gray-500">Este producto estará en promoción</div>
                      </div>
                    </label>

                    {formData.isOffer && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="originalPrice" className="text-xs text-gray-600">Precio original</Label>
                          <Input
                            id="originalPrice"
                            type="number"
                            value={formData.originalPrice}
                            onChange={(e) => setFormData({...formData, originalPrice: e.target.value})}
                            placeholder="15000"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="discount" className="text-xs text-gray-600">Descuento (%)</Label>
                          <Input
                            id="discount"
                            type="number"
                            value={formData.discount}
                            onChange={(e) => setFormData({...formData, discount: e.target.value})}
                            placeholder="20"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </details>

                {/* Imágenes adicionales */}
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Imágenes Adicionales</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3 pt-0 space-y-3">
                    {formData.additionalImages.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={url}
                          onChange={(e) => {
                            const newImages = [...formData.additionalImages];
                            newImages[index] = e.target.value;
                            setFormData({...formData, additionalImages: newImages});
                          }}
                          placeholder={`URL imagen ${index + 1}`}
                          className="h-8 text-sm flex-1"
                        />
                        {url && (
                          <div className="w-8 h-8 rounded border overflow-hidden">
                            <img 
                              src={url} 
                              alt={`Imagen ${index + 1}`} 
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
                </details>

                {/* Especificaciones */}
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Especificaciones Técnicas</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3 pt-0 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Añade especificaciones del producto</span>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => setFormData({
                          ...formData, 
                          specifications: [...formData.specifications, { name: '', value: '' }]
                        })}
                        className="h-6 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Añadir
                      </Button>
                    </div>
                    {formData.specifications.map((spec, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 items-center">
                        <Input
                          value={spec.name}
                          onChange={(e) => {
                            const newSpecs = [...formData.specifications];
                            newSpecs[index] = { ...newSpecs[index], name: e.target.value };
                            setFormData({...formData, specifications: newSpecs});
                          }}
                          placeholder="Nombre"
                          className="h-8 text-sm col-span-2"
                        />
                        <Input
                          value={spec.value}
                          onChange={(e) => {
                            const newSpecs = [...formData.specifications];
                            newSpecs[index] = { ...newSpecs[index], value: e.target.value };
                            setFormData({...formData, specifications: newSpecs});
                          }}
                          placeholder="Valor"
                          className="h-8 text-sm col-span-2"
                        />
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
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                {/* Colores disponibles */}
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-pink-600" />
                      <span className="text-sm font-medium">Colores Disponibles</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3 pt-0 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Añade variantes de color</span>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => setFormData({
                          ...formData, 
                          colors: [...formData.colors, { name: '', hexCode: '', image: '' }]
                        })}
                        className="h-6 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Añadir Color
                      </Button>
                    </div>
                    {formData.colors.map((color, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 items-center">
                        <Input
                          value={color.name}
                          onChange={(e) => {
                            const newColors = [...formData.colors];
                            newColors[index] = { ...newColors[index], name: e.target.value };
                            setFormData({...formData, colors: newColors});
                          }}
                          placeholder="Nombre"
                          className="h-8 text-sm col-span-2"
                        />
                        <Input
                          value={color.hexCode}
                          onChange={(e) => {
                            const newColors = [...formData.colors];
                            newColors[index] = { ...newColors[index], hexCode: e.target.value };
                            setFormData({...formData, colors: newColors});
                          }}
                          placeholder="#FF0000"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={color.image}
                          onChange={(e) => {
                            const newColors = [...formData.colors];
                            newColors[index] = { ...newColors[index], image: e.target.value };
                            setFormData({...formData, colors: newColors});
                          }}
                          placeholder="URL imagen"
                          className="h-8 text-sm col-span-2"
                        />
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
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                {/* Beneficios */}
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Beneficios del Producto</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3 pt-0 space-y-2">
                    <div className="text-xs text-gray-600 mb-2">Selecciona los beneficios que aplican:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {predefinedBenefits.map((benefit) => (
                        <label key={benefit} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.benefits.includes(benefit)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, benefits: [...formData.benefits, benefit]});
                              } else {
                                setFormData({...formData, benefits: formData.benefits.filter(b => b !== benefit)});
                              }
                            }}
                            className="w-3 h-3 text-blue-600 rounded"
                          />
                          <span className="text-xs">{benefit}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>

                {/* Garantías */}
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Garantías</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3 pt-0 space-y-2">
                    <div className="text-xs text-gray-600 mb-2">Selecciona las garantías disponibles:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {predefinedWarranties.map((warranty) => (
                        <label key={warranty} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.warranties.includes(warranty)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, warranties: [...formData.warranties, warranty]});
                              } else {
                                setFormData({...formData, warranties: formData.warranties.filter(w => w !== warranty)});
                              }
                            }}
                            className="w-3 h-3 text-blue-600 rounded"
                          />
                          <span className="text-xs">{warranty}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>

                {/* Métodos de pago */}
                <details className="group border border-gray-200 rounded-lg">
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Métodos de Pago</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-3 pt-0 space-y-2">
                    <div className="text-xs text-gray-600 mb-2">Métodos de pago aceptados:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {predefinedPaymentMethods.map((method) => (
                        <label key={method} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.paymentMethods.includes(method)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, paymentMethods: [...formData.paymentMethods, method]});
                              } else {
                                setFormData({...formData, paymentMethods: formData.paymentMethods.filter(p => p !== method)});
                              }
                            }}
                            className="w-3 h-3 text-blue-600 rounded"
                          />
                          <span className="text-xs">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Separator className="my-8" />

      {/* Lista de productos existentes */}
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-lg font-semibold text-gray-800">Productos en Ecommerce</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {sortedProducts.length} productos disponibles
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Solo ecommerce
                  </Badge>
                  {!isOnline && (
                    <Badge variant="destructive" className="text-xs">
                      � Offline
                    </Badge>
                  )}
                </div>
              </div>
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro por categoría */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Categoría
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-[320px] overflow-y-auto">
                  <DropdownMenuItem 
                    onClick={() => setSelectedCategory('')} 
                    className={cn(
                      "py-2 px-3",
                      !selectedCategory ? 'bg-blue-50 text-blue-700' : ''
                    )}
                  >
                    <span>Todas las categorías</span>
                  </DropdownMenuItem>
                  {categories
                    .filter(category => !category.parentId)
                    .map((category) => (
                      <DropdownMenuItem 
                        key={category.id} 
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          "py-2 px-3",
                          selectedCategory === category.id ? 'bg-blue-50 text-blue-700' : ''
                        )}
                      >
                        <span>{category.name}</span>
                      </DropdownMenuItem>
                    ))
                  }
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Ordenamiento */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Ordenar
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => setSortOrder('recent')} 
                    className={cn(
                      "py-2 px-3",
                      sortOrder === 'recent' ? 'bg-blue-50 text-blue-700' : ''
                    )}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Más recientes
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder('oldest')} 
                    className={cn(
                      "py-2 px-3",
                      sortOrder === 'oldest' ? 'bg-blue-50 text-blue-700' : ''
                    )}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Más antiguos
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder('name-asc')} 
                    className={cn(
                      "py-2 px-3",
                      sortOrder === 'name-asc' ? 'bg-blue-50 text-blue-700' : ''
                    )}
                  >
                    <Tags className="h-4 w-4 mr-2" />
                    Nombre (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder('name-desc')} 
                    className={cn(
                      "py-2 px-3",
                      sortOrder === 'name-desc' ? 'bg-blue-50 text-blue-700' : ''
                    )}
                  >
                    <Tags className="h-4 w-4 mr-2" />
                    Nombre (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder('price-high')} 
                    className={cn(
                      "py-2 px-3",
                      sortOrder === 'price-high' ? 'bg-blue-50 text-blue-700' : ''
                    )}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Precio (Mayor a menor)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOrder('price-low')} 
                    className={cn(
                      "py-2 px-3",
                      sortOrder === 'price-low' ? 'bg-blue-50 text-blue-700' : ''
                    )}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Precio (Menor a mayor)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Indicador de filtro activo */}
              {selectedCategory && (
                <Badge variant="secondary" className="gap-2">
                  <Tags className="h-3 w-3" />
                  {categories.find(cat => cat.id === selectedCategory)?.name || "Categoría"}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedCategory('')}
                    className="h-4 w-4 p-0 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="relative mt-4">
            <div className="relative flex items-center">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input 
                placeholder="Buscar por nombre, descripción, categoría, clave numérica o código de barras..." 
                className="pl-10 pr-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 h-6 w-6 rounded-full hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          {loadingProducts ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="p-4 bg-blue-600 rounded-full shadow-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-blue-700 mt-4">Cargando productos...</p>
                <p className="text-sm text-gray-600 mt-1">Obteniendo inventario actualizado</p>
              </div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="flex flex-col items-center max-w-md mx-auto">
                <div className="p-6 bg-gray-100 rounded-lg shadow-sm mb-6">
                  <Package className="h-16 w-16 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No hay productos disponibles en ecommerce</h3>
                {searchTerm ? (
                  <div className="space-y-2">
                    <p className="text-gray-600">No hay productos habilitados para ecommerce que coincidan con tu búsqueda</p>
                    <p className="text-sm text-gray-500">Prueba con otros términos o habilita más productos para ecommerce</p>
                    <Button 
                      onClick={() => setSearchTerm('')} 
                      variant="outline" 
                      size="sm"
                      className="mt-3 border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Limpiar búsqueda
                    </Button>
                  </div>
                ) : selectedCategory ? (
                  <div className="space-y-2">
                    <p className="text-gray-600">No hay productos habilitados para ecommerce en esta categoría</p>
                    <p className="text-sm text-gray-500">Selecciona otra categoría o habilita productos para ecommerce</p>
                    <Button 
                      onClick={() => setSelectedCategory('')} 
                      variant="outline" 
                      size="sm"
                      className="mt-3 border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Ver todas las categorías
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-600">Aún no tienes productos habilitados para ecommerce</p>
                    <p className="text-sm text-gray-500">Añade productos y activa la opción "Disponible en Ecommerce" para que aparezcan aquí</p>
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
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
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

                      {/* Códigos de identificación */}
                      {(product.claveNumerica || product.codigoBarras) && (
                        <div className="flex flex-wrap gap-2">
                          {product.claveNumerica && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-medium text-xs">
                              <Hash className="h-3 w-3 mr-1" />
                              Clave: {product.claveNumerica}
                            </Badge>
                          )}
                          {product.codigoBarras && (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium text-xs">
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Código: {product.codigoBarras}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Configuración de IVA */}
                      <div className="flex flex-wrap gap-2">
                        {product.ivaAplicable !== undefined && (
                          <Badge 
                            variant="outline" 
                            className={`font-medium text-xs ${
                              product.ivaAplicable 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            <Calculator className="h-3 w-3 mr-1" />
                            {product.ivaAplicable 
                              ? `IVA ${(product.tasaIva || 21).toFixed(1)}%` 
                              : 'Sin IVA'
                            }
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
                                className="flex-1 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 font-medium"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-blue-600 text-white">
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

            {/* Botón cargar más */}
            {hasMoreProducts && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={loadMoreProducts} 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-8 py-3 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
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

      {/* Registro de Actividades Compacto */}
      <Card className="shadow-lg border border-slate-200 bg-white">
        {/* Header compacto */}
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-600 rounded-lg">
                <History className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Registro de Actividades</CardTitle>
                <CardDescription className="text-slate-600 text-sm">
                  {activityStats.total} actividades • Hoy: {activityStats.today} • Semana: {activityStats.thisWeek}
                </CardDescription>
              </div>
            </div>

            {/* Controles compactos */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActivityFilters(!showActivityFilters)}
                className="h-8 px-3 text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filtros
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={fetchActivityLog}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualizar
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={exportActivities}
                className="h-8 px-3 text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Filtros expandibles */}
          {showActivityFilters && (
            <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-700">Tipo de acción</Label>
                  <Select value={activityFilter} onValueChange={(value: any) => setActivityFilter(value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las acciones</SelectItem>
                      <SelectItem value="creation">Creaciones</SelectItem>
                      <SelectItem value="update">Actualizaciones</SelectItem>
                      <SelectItem value="delete">Eliminaciones</SelectItem>
                      <SelectItem value="revision">Revisiones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">Período</Label>
                  <Select value={activityDateFilter} onValueChange={(value: any) => setActivityDateFilter(value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo el tiempo</SelectItem>
                      <SelectItem value="today">Hoy</SelectItem>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="month">Este mes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">Usuario</Label>
                  <Select value={activityUserFilter} onValueChange={setActivityUserFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      {getUniqueUsers().map(userName => (
                        <SelectItem key={userName} value={userName}>{userName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActivityFilter('all');
                    setActivityDateFilter('all');
                    setActivityUserFilter('all');
                  }}
                  className="h-8 px-3 text-xs"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4">
          {loadingActivityLog ? (
            <div className="flex justify-center items-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                <span className="text-slate-600">Cargando actividades...</span>
              </div>
            </div>
          ) : (() => {
            const filteredActivities = getFilteredActivities();
            return filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No hay actividades registradas</p>
                <p className="text-slate-500 text-sm">Las actividades aparecerán aquí cuando se realicen cambios</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.slice(0, visibleActivities).map((activity: any, index) => {
                  const activityDate = activity.timestamp?.toDate?.() || new Date(activity.timestamp) || new Date();
                  const timeAgo = getTimeAgo(activityDate);
                  
                  // Icono más simple para cada tipo de actividad
                  const getActivityIcon = (action: string) => {
                    if (action.includes('Creación')) return { icon: Plus, color: 'text-green-600 bg-green-50 border-green-200' };
                    if (action.includes('Actualización')) return { icon: Edit, color: 'text-blue-600 bg-blue-50 border-blue-200' };
                    if (action.includes('Eliminación')) return { icon: Trash2, color: 'text-red-600 bg-red-50 border-red-200' };
                    if (action.includes('Revisión')) return { icon: Eye, color: 'text-orange-600 bg-orange-50 border-orange-200' };
                    return { icon: FileText, color: 'text-gray-600 bg-gray-50 border-gray-200' };
                  };

                  const { icon: ActivityIcon, color } = getActivityIcon(activity.action);

                  return (
                    <div 
                      key={activity.id || index} 
                      className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      {/* Icono compacto */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${color}`}>
                        <ActivityIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm">{activity.action}</span>
                            {activity.productName && (
                              <Badge variant="outline" className="text-xs">{activity.productName}</Badge>
                            )}
                          </div>
                          
                          {/* Botón compacto para ver detalles */}
                          {activity.changeDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActivityDetails(activity.id || index.toString(), activity)}
                              className="h-6 px-2 text-xs hover:bg-slate-100"
                            >
                              {expandedActivity === (activity.id || index.toString()) ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-slate-600 text-sm mb-2">{activity.details}</p>
                        
                        {/* Detalles expandibles más compactos */}
                        {expandedActivity === (activity.id || index.toString()) && activity.changeDetails && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <h5 className="font-medium text-slate-800 text-sm mb-2">Detalles de los cambios</h5>
                            
                            {activity.changeDetails.type === 'create' ? (
                              <div className="space-y-1">
                                <span className="text-green-700 text-sm font-medium">✓ Producto creado</span>
                                {activity.changeDetails.data && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                    {Object.entries(activity.changeDetails.data).slice(0, 4).map(([key, value]) => (
                                      <div key={key} className="text-xs">
                                        <span className="font-medium text-slate-700">{getFieldDisplayName(key)}:</span>
                                        <span className="text-slate-600 ml-1">{formatFieldValue(key, value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : activity.changeDetails.type === 'update' && activity.changeDetails.changes ? (
                              <div className="space-y-2">
                                {activity.changeDetails.changes.modified?.slice(0, 3).map((change: any, idx: number) => (
                                  <div key={idx} className="text-xs">
                                    <div className="font-medium text-slate-700 mb-1">{change.field}</div>
                                    <div className="flex gap-2">
                                      <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs">{change.oldValue}</span>
                                      <span className="text-slate-400">→</span>
                                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">{change.newValue}</span>
                                    </div>
                                  </div>
                                ))}
                                {activity.changeDetails.changes.modified?.length > 3 && (
                                  <div className="text-xs text-slate-500">
                                    +{activity.changeDetails.changes.modified.length - 3} cambios más
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500">Detalles no disponibles</div>
                            )}
                          </div>
                        )}
                        
                        {/* Metadata compacta */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                          <span>{timeAgo}</span>
                          <span>•</span>
                          <span>{activity.userName || activity.userEmail || 'Usuario desconocido'}</span>
                          <span>•</span>
                          <span>{activityDate.toLocaleDateString('es-ES')}</span>
                          {activity.isOnline === false && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs h-4">Offline</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Botón para cargar más actividades */}
                {filteredActivities.length > visibleActivities && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleActivities(prev => prev + 10)}
                      className="h-8 px-4 text-sm"
                    >
                      Ver más actividades ({filteredActivities.length - visibleActivities} restantes)
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductForm;
