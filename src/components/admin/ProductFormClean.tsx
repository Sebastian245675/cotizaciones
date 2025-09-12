import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
  SlidersHorizontal, Loader2, Eye, TrendingUp, AlertCircle, CheckCircle, Copy, FileEdit,
  Sparkles, Lightbulb, Settings
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
import { collection, addDoc, getDocs, updateDoc, doc, setDoc, getDoc, query, orderBy, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";

export const ProductForm: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para UX mejorada - Odoo Style
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [formStep, setFormStep] = useState<'basic' | 'wizard' | 'complete'>("basic");
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [enableAutoSave, setEnableAutoSave] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{[key: string]: string}>({});
  const [smartSuggestions, setSmartSuggestions] = useState<{[key: string]: string}>({});
  const [imagePreviewLoading, setImagePreviewLoading] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [smartCategorizationEnabled, setSmartCategorizationEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
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
    benefits: [] as string[],
    warranties: [] as string[],
    paymentMethods: [] as string[],
    colors: [] as { name: string, hexCode: string, image: string }[],
    habilitarEcommerce: true,
    tipoVenta: 'unidad' as 'unidad' | 'granel' | 'paquete'
  });

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string; parentId?: string | null; }[]>([]);
  const { user } = useAuth();
  const [liberta, setLiberta] = useState("no");

  // Sistema de auto-guardado
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validación en tiempo real
  const validateField = useCallback((fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'name':
        if (!value || value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
        if (value.length > 100) return 'El nombre no puede exceder 100 caracteres';
        break;
      case 'precioVenta':
        if (!value || isNaN(parseFloat(value))) return 'Precio de venta requerido y debe ser numérico';
        if (parseFloat(value) <= 0) return 'El precio debe ser mayor a 0';
        break;
      case 'stock':
        if (!value || isNaN(parseInt(value))) return 'Stock requerido y debe ser numérico';
        if (parseInt(value) < 0) return 'El stock no puede ser negativo';
        break;
      case 'category':
        if (!value) return 'La categoría es requerida';
        break;
      case 'image':
        if (value && !isValidImageUrl(value)) return 'URL de imagen no válida';
        break;
      default:
        return '';
    }
    return '';
  }, []);

  // Función para validar URL de imagen
  const isValidImageUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlObj.pathname);
    } catch {
      return false;
    }
  };

  // Cargar categorías y permisos
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar categorías
        const querySnapshot = await getDocs(collection(db, "categories"));
        const allCategories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name || "Categoría sin nombre",
          parentId: doc.data().parentId || null
        })) as { id: string; name: string; parentId?: string | null }[];
        
        setCategories(allCategories);
        
        // Verificar permisos
        if (user && user.email) {
          if (user.email === "admin@gmail.com") {
            setLiberta("si");
          } else if (user.id) {
            const userDoc = await getDoc(doc(db, "users", user.id));
            if (userDoc.exists() && userDoc.data().liberta === "si") {
              setLiberta("si");
            } else {
              const adminDoc = await getDoc(doc(db, "admins", user.email));
              if (adminDoc.exists() && adminDoc.data().liberta === "yes") {
                setLiberta("si");
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [user]);

  // Funciones avanzadas
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
    
    // Smart field enhancements
    if (field === 'name' && value.length > 3) {
      const suggestedCategory = suggestCategory(value);
      if (suggestedCategory && !formData.category) {
        setSmartSuggestions(prev => ({
          ...prev,
          categoria: suggestedCategory
        }));
      }
    }
    
    if (field === 'precioCosto' && value && formData.precioVenta) {
      const costo = parseFloat(value);
      const venta = parseFloat(formData.precioVenta);
      if (!isNaN(costo) && !isNaN(venta) && costo > venta) {
        setSmartSuggestions(prev => ({
          ...prev,
          precioVenta: (costo * 1.3).toFixed(2)
        }));
      }
    }
    
    // Real-time validation
    setTimeout(() => {
      const error = validateField(field, value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }, 300);
  }, [formData.category, formData.precioVenta, validateField]);

  const generateAISuggestions = useCallback(async () => {
    if (!formData.name && !formData.category) return;
    
    try {
      const suggestions = {
        categoria: formData.name.toLowerCase().includes('electro') ? 'Electrónicos' : 
                  formData.name.toLowerCase().includes('ropa') ? 'Textil' :
                  formData.name.toLowerCase().includes('comida') ? 'Alimentos' : '',
        precioSugerido: formData.precioCosto ? 
          (parseFloat(formData.precioCosto) * 1.3).toFixed(2) : '',
        descripcion: `${formData.name} - Producto de alta calidad. Especificaciones y características principales.`,
        stockMinimo: '10'
      };
      
      setAiSuggestions(suggestions);
      
      toast({
        title: "🤖 Sugerencias generadas",
        description: "Revisa las sugerencias de IA y aplica las que consideres útiles",
        duration: 4000
      });
      
    } catch (error) {
      console.error('Error generando sugerencias:', error);
    }
  }, [formData.name, formData.category, formData.precioCosto, toast]);

  const applyAISuggestion = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
    
    setAiSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[field];
      return newSuggestions;
    });
    
    toast({
      title: "✨ Sugerencia aplicada",
      description: `Campo ${field} actualizado con sugerencia de IA`,
      duration: 2000
    });
  }, [toast]);

  const suggestCategory = useCallback((productName: string) => {
    const categoriesMap = {
      'Electrónicos': ['celular', 'telefono', 'computadora', 'laptop', 'tablet', 'auricular', 'cable', 'cargador'],
      'Ropa': ['camisa', 'pantalon', 'vestido', 'zapato', 'blusa', 'jean', 'short'],
      'Hogar': ['mesa', 'silla', 'sofa', 'cama', 'cocina', 'baño', 'decoracion'],
      'Deportes': ['pelota', 'zapatilla', 'deporte', 'gimnasio', 'futbol', 'basket'],
      'Alimentos': ['comida', 'bebida', 'snack', 'dulce', 'verdura', 'fruta', 'carne']
    };
    
    const name = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoriesMap)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }
    
    return '';
  }, []);

  const generateProductTemplate = useCallback((existingProduct: any) => {
    return {
      name: `${existingProduct.name} - Copia`,
      description: existingProduct.description,
      category: existingProduct.category,
      subcategory: existingProduct.subcategory,
      terceraCategoria: existingProduct.terceraCategoria,
      precioCosto: existingProduct.precioCosto,
      precioMayoreo: existingProduct.precioMayoreo,
      specifications: existingProduct.specifications || [{ name: '', value: '' }],
      benefits: existingProduct.benefits || [],
      warranties: existingProduct.warranties || [],
      paymentMethods: existingProduct.paymentMethods || [],
      habilitarEcommerce: existingProduct.habilitarEcommerce,
      tipoVenta: existingProduct.tipoVenta,
      precioVenta: '',
      stock: '',
      image: '',
      additionalImages: ['', '', ''],
      colors: [],
      isOffer: false,
      discount: '',
      originalPrice: '',
      ganancia: 0,
      porcentajeGanancia: 0
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario
    const errors: {[key: string]: string} = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) errors[key] = error;
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        variant: "destructive",
        title: "Errores de validación",
        description: "Por favor corrige los errores antes de continuar"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const productData = {
        ...formData,
        precioVenta: parseFloat(formData.precioVenta),
        precioCosto: parseFloat(formData.precioCosto) || 0,
        precioMayoreo: parseFloat(formData.precioMayoreo) || 0,
        stock: parseInt(formData.stock, 10),
        fechaActualizacion: new Date(),
        ganancia: parseFloat(formData.precioVenta) - parseFloat(formData.precioCosto || '0'),
        porcentajeGanancia: formData.precioCosto ? 
          ((parseFloat(formData.precioVenta) - parseFloat(formData.precioCosto)) / parseFloat(formData.precioCosto) * 100) : 0
      };

      if (!isEditing) {
        productData.fechaCreacion = new Date();
        productData.vendido = 0;
        productData.views = 0;
      }

      if (isEditing && editingId) {
        const productRef = doc(db, 'products', editingId);
        await updateDoc(productRef, productData);
        
        toast({
          title: "✅ Producto actualizado",
          description: `${formData.name} se actualizó correctamente`,
          duration: 3000
        });
      } else {
        const productsRef = collection(db, 'products');
        await addDoc(productsRef, productData);
        
        toast({
          title: "✅ Producto creado",
          description: `${formData.name} se agregó al inventario`,
          duration: 3000
        });
        
        // Reset form
        setFormData({
          name: '', description: '', precioVenta: '', precioCosto: '', precioMayoreo: '',
          ganancia: 0, porcentajeGanancia: 0, category: '', subcategory: '', terceraCategoria: '',
          stock: '', image: '', additionalImages: ['', '', ''], specifications: [{ name: '', value: '' }],
          isOffer: false, discount: '', originalPrice: '', benefits: [], warranties: [],
          paymentMethods: [], colors: [], habilitarEcommerce: true, tipoVenta: 'unidad'
        });
      }
      
      setIsFormDirty(false);
      setValidationErrors({});

    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast({
        variant: "destructive",
        title: "❌ Error al guardar",
        description: "No se pudo guardar el producto"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Style Odoo */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-indigo-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {isEditing ? 'Actualizar información del producto' : 'Crear un nuevo producto en el inventario'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons - Odoo Style */}
            <div className="flex items-center space-x-3">
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingId(null);
                    setFormData({
                      name: '', description: '', precioVenta: '', precioCosto: '', precioMayoreo: '',
                      ganancia: 0, porcentajeGanancia: 0, category: '', subcategory: '', terceraCategoria: '',
                      stock: '', image: '', additionalImages: ['', '', ''], specifications: [{ name: '', value: '' }],
                      isOffer: false, discount: '', originalPrice: '', benefits: [], warranties: [],
                      paymentMethods: [], colors: [], habilitarEcommerce: true, tipoVenta: 'unidad'
                    });
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
              
              <Button
                onClick={(e) => handleSubmit(e)}
                disabled={isLoading || Object.keys(validationErrors).length > 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar - Odoo Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center space-x-6">
              {/* Auto-save status */}
              <div className="flex items-center space-x-2">
                {autoSaveStatus === 'saving' && (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600">Guardando...</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">Guardado automáticamente</span>
                  </>
                )}
                {autoSaveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-600">Error al guardar</span>
                  </>
                )}
              </div>
              
              {/* Validation status */}
              <div className="flex items-center space-x-2">
                {Object.keys(validationErrors).length === 0 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">Formulario válido</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-amber-600">
                      {Object.keys(validationErrors).length} error(es)
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateAISuggestions}
                disabled={!formData.name || isLoading}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                IA
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEnableAutoSave(!enableAutoSave)}
                className={enableAutoSave ? 
                  "text-green-600 hover:text-green-700 hover:bg-green-50" : 
                  "text-gray-600 hover:text-gray-700 hover:bg-gray-50"}
              >
                {enableAutoSave ? <Save className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                Auto
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Alert - Odoo Style */}
      {user?.subCuenta === "si" && liberta !== "si" && (
        <div className="bg-amber-50 border-l-4 border-amber-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mr-3" />
              <p className="text-sm text-amber-800">
                Los cambios serán enviados a revisión del administrador antes de publicarse.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Odoo Style Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Form - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Basic Information Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FileEdit className="h-5 w-5 mr-2 text-gray-400" />
                    Información Básica
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nombre del Producto <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="Ej: MacBook Air M2 256GB"
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                          validationErrors.name ? 'border-red-300 bg-red-50' : ''
                        }`}
                        required
                      />
                      {validationErrors.name && (
                        <p className="text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validationErrors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Categoría <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => handleFieldChange('category', e.target.value)}
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                          validationErrors.category ? 'border-red-300 bg-red-50' : ''
                        }`}
                        required
                      >
                        <option value="">Seleccionar categoría</option>
                        {categories
                          .filter(category => !category.parentId)
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                      {validationErrors.category && (
                        <p className="text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validationErrors.category}
                        </p>
                      )}
                      {smartSuggestions.categoria && (
                        <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                          <span className="text-blue-700 font-medium">💡 Sugerencia: </span>
                          <button
                            type="button"
                            onClick={() => handleFieldChange('category', smartSuggestions.categoria)}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {smartSuggestions.categoria}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Descripción detallada del producto..."
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-400" />
                    Información de Precios
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="precioVenta" className="block text-sm font-medium text-gray-700">
                        Precio de Venta <span className="text-red-500">*</span>
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          id="precioVenta"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.precioVenta}
                          onChange={(e) => handleFieldChange('precioVenta', e.target.value)}
                          className={`block w-full pl-7 pr-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                            validationErrors.precioVenta ? 'border-red-300 bg-red-50' : ''
                          }`}
                          placeholder="0.00"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">ARS</span>
                        </div>
                      </div>
                      {validationErrors.precioVenta && (
                        <p className="text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validationErrors.precioVenta}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="precioCosto" className="block text-sm font-medium text-gray-700">
                        Precio de Costo
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          id="precioCosto"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.precioCosto}
                          onChange={(e) => handleFieldChange('precioCosto', e.target.value)}
                          className="block w-full pl-7 pr-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="0.00"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">ARS</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                        Stock <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => handleFieldChange('stock', e.target.value)}
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                          validationErrors.stock ? 'border-red-300 bg-red-50' : ''
                        }`}
                        placeholder="0"
                        required
                      />
                      {validationErrors.stock && (
                        <p className="text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validationErrors.stock}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Profit Calculation Display */}
                  {formData.precioVenta && formData.precioCosto && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Margen de ganancia:</span>
                          <span className="ml-2 font-medium text-green-600">
                            {((parseFloat(formData.precioVenta) - parseFloat(formData.precioCosto)) / parseFloat(formData.precioVenta) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ganancia unitaria:</span>
                          <span className="ml-2 font-medium text-green-600">
                            ${(parseFloat(formData.precioVenta) - parseFloat(formData.precioCosto)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Image className="h-5 w-5 mr-2 text-gray-400" />
                    Imagen del Producto
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                      URL de la Imagen
                    </label>
                    <input
                      id="image"
                      type="url"
                      value={formData.image}
                      onChange={(e) => handleFieldChange('image', e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {validationErrors.image && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {validationErrors.image}
                      </p>
                    )}
                  </div>
                  
                  {/* Image Preview */}
                  {formData.image && (
                    <div className="mt-4">
                      <img
                        src={formData.image}
                        alt="Vista previa"
                        className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right Sidebar - AI Suggestions & Smart Features */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* AI Suggestions */}
            {Object.keys(aiSuggestions).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                    Sugerencias de IA
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {Object.entries(aiSuggestions).map(([field, value]) => (
                    <div key={field} className="flex items-start justify-between p-3 bg-purple-50 rounded-md border border-purple-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-900 capitalize">{field}</p>
                        <p className="text-sm text-purple-700 truncate">{value}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAISuggestion(field, value)}
                        className="ml-3 text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 flex-shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Suggestions */}
            {Object.keys(smartSuggestions).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-blue-500" />
                    Sugerencias Inteligentes
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {Object.entries(smartSuggestions).map(([field, value]) => (
                    <div key={field} className="flex items-start justify-between p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 capitalize">{field}</p>
                        <p className="text-sm text-blue-700 truncate">{value}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, [field]: value }));
                          setSmartSuggestions(prev => {
                            const newSuggestions = { ...prev };
                            delete newSuggestions[field];
                            return newSuggestions;
                          });
                          setIsFormDirty(true);
                        }}
                        className="ml-3 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex-shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Wand2 className="h-5 w-5 mr-2 text-gray-400" />
                  Acciones Rápidas
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  type="button"
                  onClick={generateAISuggestions}
                  disabled={!formData.name || isLoading}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar Sugerencias IA
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormStep(formStep === 'wizard' ? 'basic' : 'wizard')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {formStep === 'wizard' ? 'Modo Normal' : 'Modo Asistente'}
                </button>
              </div>
            </div>

            {/* Form Progress */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Progreso del Formulario</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Información básica</span>
                    <span className={formData.name && formData.category ? 'text-green-600' : 'text-gray-400'}>
                      {formData.name && formData.category ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Precios</span>
                    <span className={formData.precioVenta ? 'text-green-600' : 'text-gray-400'}>
                      {formData.precioVenta ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Inventario</span>
                    <span className={formData.stock ? 'text-green-600' : 'text-gray-400'}>
                      {formData.stock ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Imagen</span>
                    <span className={formData.image ? 'text-green-600' : 'text-gray-400'}>
                      {formData.image ? '✓' : '○'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (
                            (formData.name && formData.category ? 1 : 0) +
                            (formData.precioVenta ? 1 : 0) +
                            (formData.stock ? 1 : 0) +
                            (formData.image ? 1 : 0)
                          ) * 25
                        }%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
