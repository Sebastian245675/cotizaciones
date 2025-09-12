import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Edit, Info, Filter, LayoutGrid, List, FolderTree } from "lucide-react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryDiagram } from "./CategoryDiagram";

export const CategoryManager = () => {
  // Actualizamos el modelo para incluir parentId (categoría padre)
  const [categories, setCategoriesState] = useState<{ 
    id: string; 
    name: string; 
    image?: string;
    parentId?: string | null;
  }[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingImage, setEditingImage] = useState("");
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Filtrado de categorías
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Control de vista (lista o diagrama)
  const [viewMode, setViewMode] = useState<"list" | "diagram">("list");
  
  // Control para las categorías expandidas (para ver más/menos)
  const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
  
  // Separamos las categorías principales (sin padre) de las subcategorías
  const mainCategories = categories.filter(cat => !cat.parentId);
  const subCategories = categories.filter(cat => cat.parentId && 
    mainCategories.some(main => main.id === cat.parentId));
  const thirdCategories = categories.filter(cat => 
    cat.parentId && subCategories.some(sub => sub.id === cat.parentId));

  const fetchCategories = async () => {
    const querySnapshot = await getDocs(collection(db, "categories"));
    const categoryList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    setCategoriesState(categoryList);
    // Also refresh products to ensure counts are up to date
    fetchProducts();
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Fetch all products from Firestore
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Fetched products:", productsData.length);
      
      // Log some sample products to check structure
      if (productsData.length > 0) {
        console.log("Sample product structure:", productsData[0]);
      }
      
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Count products for a specific category ID
  const getProductCountForCategory = (categoryId: string) => {
    // Get the category name
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return 0;
    
    // Direct products in this category - match by ID or name
    const directProducts = products.filter(product => 
      (product.category === categoryId) || 
      (product.category === category.name) ||
      (product.categoryName === category.name)
    );
    
    return directProducts.length;
  };

  // Count products for a subcategory
  const getProductCountForSubcategory = (subcategoryId: string) => {
    // Get subcategory name
    const subcategory = categories.find(cat => cat.id === subcategoryId);
    if (!subcategory) return 0;
    
    // Direct products in this subcategory - match by ID or name
    const directProducts = products.filter(product => 
      (product.subcategory === subcategoryId) || 
      (product.subcategory === subcategory.name) ||
      (product.subcategoryName === subcategory.name)
    );
    
    return directProducts.length;
  };
  
  // Count products for a tercera categoria
  const getProductCountForTercera = (terceraId: string) => {
    // Get tercera category name
    const tercera = categories.find(cat => cat.id === terceraId);
    if (!tercera) return 0;
    
    // Direct products in this tercera categoria - match by ID or name
    const directProducts = products.filter(product => 
      (product.terceraCategoria === terceraId) || 
      (product.terceraCategoria === tercera.name) ||
      (product.terceraCategoriaName === tercera.name)
    );
    
    return directProducts.length;
  };
  
  // Count total products under a main category (including all subcategories and terceras)
  const getTotalProductsForMainCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return 0;

    // All products that could belong to this category or any of its subcategories/terceras
    const matchingProducts = products.filter(product => {
      // Direct match to this category
      if (product.category === categoryId || 
          product.category === category.name || 
          product.categoryName === category.name) {
        return true;
      }
      
      // Find all subcategories under this main category
      const subcats = categories.filter(cat => cat.parentId === categoryId);
      
      // Check if product belongs to any subcategory
      for (const subcat of subcats) {
        if (product.subcategory === subcat.id || 
            product.subcategory === subcat.name || 
            product.subcategoryName === subcat.name) {
          return true;
        }
        
        // Find all terceras under this subcategory
        const terceras = categories.filter(cat => cat.parentId === subcat.id);
        
        // Check if product belongs to any tercera
        for (const tercera of terceras) {
          if (product.terceraCategoria === tercera.id || 
              product.terceraCategoria === tercera.name || 
              product.terceraCategoriaName === tercera.name) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    // For debugging - log details about this calculation
    if (category.name === categories[0]?.name) {  // Only log for first category to avoid console spam
      console.log(`Products in main category "${category.name}" (${categoryId}):`, matchingProducts.length);
      if (matchingProducts.length > 0) {
        console.log("Sample matching products:", matchingProducts.slice(0, 2));
      }
    }
    
    return matchingProducts.length;
  };
  
  // Count total products under a subcategory (including all terceras)
  const getTotalProductsForSubcategory = (subcategoryId: string) => {
    const subcategory = categories.find(cat => cat.id === subcategoryId);
    if (!subcategory) return 0;

    // Get the parent category for context
    const parentCategory = categories.find(cat => cat.id === subcategory.parentId);
    
    // All products that could belong to this subcategory or any of its terceras
    const matchingProducts = products.filter(product => {
      // Direct match to this subcategory
      if (product.subcategory === subcategoryId || 
          product.subcategory === subcategory.name || 
          product.subcategoryName === subcategory.name) {
        return true;
      }
      
      // Find all terceras under this subcategory
      const terceras = categories.filter(cat => cat.parentId === subcategoryId);
      
      // Check if product belongs to any tercera
      for (const tercera of terceras) {
        if (product.terceraCategoria === tercera.id || 
            product.terceraCategoria === tercera.name || 
            product.terceraCategoriaName === tercera.name) {
          return true;
        }
      }
      
      return false;
    });
    
    // For debugging - log details about this calculation (only for first subcategory to avoid spam)
    if (subcategory.id === subCategories[0]?.id) {
      console.log(`Products in subcategory "${subcategory.name}" (${subcategoryId}) under "${parentCategory?.name}":`, matchingProducts.length);
      if (matchingProducts.length > 0) {
        console.log("Sample matching products:", matchingProducts.slice(0, 2));
      }
    }
    
    return matchingProducts.length;
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    
    // Si es una subcategoría (tiene parentId), no necesitamos guardar imagen
    // Si es categoría principal, guardamos la imagen
    if (newParentId && newParentId !== "tercera") {
      // Es una subcategoría o tercera categoría
      await addDoc(collection(db, "categories"), { 
        name: newCategory.trim(),
        parentId: newParentId,
        // Obtenemos el nombre del padre para facilitar filtrado
        parentName: categories.find(cat => cat.id === newParentId)?.name || ''
      });
    } else {
      // Es una categoría principal
      await addDoc(collection(db, "categories"), { 
        name: newCategory.trim(), 
        image: newImage.trim(),
        parentId: null
      });
    }
    
    setNewCategory("");
    setNewImage("");
    setNewParentId(null);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    // Primero verificamos si hay subcategorías que dependen de esta categoría
    const subCats = categories.filter(cat => cat.parentId === id);
    
    if (subCats.length > 0) {
      // Si hay subcategorías, podríamos mostrar un mensaje de advertencia o manejar esto automáticamente
      if (!window.confirm(`Esta categoría tiene ${subCats.length} subcategoría(s). Si la eliminas, las subcategorías se convertirán en categorías principales. ¿Deseas continuar?`)) {
        return;
      }
      
      // Actualizar las subcategorías para que no tengan padre
      for (const subCat of subCats) {
        await updateDoc(doc(db, "categories", subCat.id), { parentId: null });
      }
    }
    
    await deleteDoc(doc(db, "categories", id));
    fetchCategories();
  };

  const handleEdit = async (id: string) => {
    if (!editingName.trim()) return;
    
    // Verificar que no estemos creando un ciclo (una categoría no puede ser hija de sí misma o de sus descendientes)
    if (editingParentId === id) {
      alert("Una categoría no puede ser subcategoría de sí misma.");
      return;
    }
    
    // Verificar si editingParentId es descendiente de id (evitar ciclos)
    let currentParentId = editingParentId;
    while (currentParentId) {
      const parent = categories.find(cat => cat.id === currentParentId);
      if (parent?.id === id) {
        alert("No se puede crear un ciclo en la jerarquía de categorías.");
        return;
      }
      currentParentId = parent?.parentId || null;
    }
    
    const updateData: any = { 
      name: editingName.trim(),
      parentId: editingParentId
    };
    
    // Si es una categoría principal (sin padre), guardamos la imagen
    if (!editingParentId) {
      updateData.image = editingImage.trim();
    } else {
      // Es una subcategoría - no requiere imagen
      // Obtenemos el nombre del padre para facilitar filtrado
      updateData.parentName = categories.find(cat => cat.id === editingParentId)?.name || '';
    }
    
    await updateDoc(doc(db, "categories", id), updateData);
    
    setEditingId(null);
    setEditingName("");
    setEditingImage("");
    setEditingParentId(null);
    fetchCategories();
  };

  return (
    <Card className="border-sky-100 shadow-md">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
        <CardTitle className="flex items-center gap-2 text-sky-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600">
            <path d="M9 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.41.59a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"></path>
            <path d="M9 14H4"></path>
            <path d="M16 19h6"></path>
            <path d="M19 16v6"></path>
          </svg>
          Categorías de Productos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4 mb-6 border rounded-lg p-4 bg-sky-50/50 border-sky-100 shadow-sm">
          <h3 className="font-medium text-lg mb-4 text-sky-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600">
              <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"></path>
              <path d="M19 13h-6a2 2 0 0 1-2-2V5"></path>
              <path d="M17 3v6h6"></path>
            </svg>
            Agregar nueva categoría
          </h3>
          
          <div>
            <label className="text-sm text-sky-700 mb-1 block font-medium">Tipo de categoría</label>
            <Select
              value={
                newParentId === null ? "main"
                : subCategories.some(cat => cat.id === newParentId) ? "tercera"
                : newParentId === "" ? "sub"
                : "sub"
              }
              onValueChange={(value) => {
                if (value === "main") {
                  setNewParentId(null);
                } else if (value === "sub") {
                  setNewParentId("");
                } else if (value === "tercera") {
                  setNewParentId("tercera"); // Marcador temporal para indicar que es tercera categoría
                }
              }}
            >
              <SelectTrigger className="border-sky-200 focus:border-sky-400 focus:ring-sky-400 mb-3 bg-white shadow-sm">
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="main" className="focus:bg-sky-50 focus:text-sky-700">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                      <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    </svg>
                    Categoría Principal
                  </div>
                </SelectItem>
                <SelectItem value="sub" className="focus:bg-sky-50 focus:text-sky-700">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-600">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    Subcategoría
                  </div>
                </SelectItem>
                <SelectItem value="tercera" className="focus:bg-sky-50 focus:text-sky-700">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-600">
                      <polyline points="9 18 15 12 9 6"></polyline>
                      <polyline points="15 18 21 12 15 6"></polyline>
                    </svg>
                    Tercera Categoría
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Solo mostrar selector de padre si estamos creando una subcategoría o tercera categoría */}
          {(newParentId !== null && newParentId !== undefined) && (
            <div className="border-l-2 border-sky-200 pl-3 ml-1">
              <label className="text-sm text-sky-700 mb-1 block font-medium">
                {subCategories.some(cat => cat.id === newParentId) ? "Seleccionar subcategoría padre" : "Seleccionar categoría padre"}
              </label>
              <Select
                value={newParentId === "tercera" ? "pending" : newParentId || "pending"}
                onValueChange={(value) => setNewParentId(value !== "pending" ? value : "")}
              >
                <SelectTrigger className="border-sky-200 focus:border-sky-400 focus:ring-sky-400 mb-3 bg-white shadow-sm">
                  <SelectValue placeholder={newParentId === "tercera" ? "Seleccione subcategoría padre" : "Seleccione categoría padre"} />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[300px]">
                  {newParentId === "tercera" ? (
                    subCategories.length > 0 ? (
                      subCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="focus:bg-sky-50 focus:text-sky-700">
                          <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                            <span>{category.name}</span>
                            <span className="text-xs text-sky-500">(Subcategoría de {categories.find(c => c.id === category.parentId)?.name})</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="pending" disabled>
                        <div className="flex items-center text-amber-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          No hay subcategorías disponibles
                        </div>
                      </SelectItem>
                    )
                  ) : (
                    mainCategories.length > 0 ? (
                      mainCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="focus:bg-sky-50 focus:text-sky-700">
                          <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600">
                              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                            </svg>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="pending" disabled>
                        <div className="flex items-center text-amber-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          No hay categorías principales disponibles
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="mt-4">
            <label className="text-sm text-sky-700 mb-1 block font-medium">Nombre de categoría</label>
            <Input
              placeholder="Nombre de categoría"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="mb-3 border-sky-200 focus:border-sky-400 focus:ring-sky-400 shadow-sm"
            />
          </div>
          
          {/* Solo mostrar campo de imagen para categorías principales */}
          {!newParentId && (
            <div className="mt-4">
              <label className="text-sm text-sky-700 mb-1 block font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                URL de imagen (solo categorías principales)
              </label>
              <Input
                placeholder="URL de imagen"
                value={newImage}
                onChange={e => setNewImage(e.target.value)}
                className="mb-3 border-sky-200 focus:border-sky-400 focus:ring-sky-400 shadow-sm"
              />
            </div>
          )}
          
          <Button 
            onClick={handleAdd} 
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg mt-4" 
            disabled={!newCategory.trim() || (newParentId === "") || (newParentId === "tercera")}
          >
            <Plus className="h-4 w-4 mr-2" /> 
            {newParentId === null ? "Crear Categoría Principal" : 
             newParentId === "" ? "Seleccione una categoría padre" : 
             newParentId === "tercera" ? "Seleccione una subcategoría padre" :
             `Crear ${subCategories.some(sub => sub.id === newParentId) ? "Tercera Categoría" : "Subcategoría"} en ${categories.find(cat => cat.id === newParentId)?.name || ""}`}
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <h3 className="font-medium text-lg text-sky-700 flex items-center gap-2">
            <Filter className="h-5 w-5 text-sky-600" />
            Filtrar categorías
          </h3>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-80 border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white shadow-sm">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-[300px]">
              <SelectItem value="all" className="focus:bg-sky-50 focus:text-sky-700">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                    <path d="M9 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.41.59a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v5"></path>
                  </svg>
                  Todas las categorías
                </div>
              </SelectItem>
              <SelectItem value="main" className="focus:bg-sky-50 focus:text-sky-700">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-600">
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  </svg>
                  Solo categorías principales
                </div>
              </SelectItem>
              <SelectItem value="sub" className="focus:bg-sky-50 focus:text-sky-700">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-600">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  Solo subcategorías
                </div>
              </SelectItem>
              <SelectItem value="tercera" className="focus:bg-sky-50 focus:text-sky-700">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-purple-600">
                    <polyline points="9 18 15 12 9 6"></polyline>
                    <polyline points="15 18 21 12 15 6"></polyline>
                  </svg>
                  Solo terceras categorías
                </div>
              </SelectItem>
              
              {categories.length > 0 && (
                <div className="py-2 px-2 text-xs font-medium text-sky-800 bg-sky-50">
                  CATEGORÍAS ESPECÍFICAS
                </div>
              )}
              
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id} className="focus:bg-sky-50 focus:text-sky-700">
                  <div className="flex items-center">
                    {!category.parentId ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                      </svg>
                    ) : category.parentId && subCategories.some(sub => sub.id === category.parentId) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-purple-600">
                        <polyline points="9 18 15 12 9 6"></polyline>
                        <polyline points="15 18 21 12 15 6"></polyline>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-600">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    )}
                    {category.name} 
                    <span className="text-xs text-sky-500 ml-2">
                      {category.parentId && subCategories.some(sub => sub.id === category.parentId) ? '(tercera)' : category.parentId ? '(subcategoría)' : '(principal)'}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Lista de categorías filtradas */}
        <div className="mt-6">
          <div className="bg-gradient-to-r from-sky-100 to-blue-100 p-3 rounded-lg mb-4 flex justify-between items-center">
            <h3 className="font-medium text-lg text-sky-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-700">
                <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                <rect width="7" height="7" x="3" y="14" rx="1"></rect>
              </svg>
              Categorías {selectedCategory !== "all" && "filtradas"}
            </h3>
            <div className="text-sm bg-white px-3 py-1 rounded-full border border-sky-200 shadow-sm text-sky-700 font-medium">
              {selectedCategory === "all" ? "Todas las categorías" : 
               selectedCategory === "main" ? "Solo principales" : 
               selectedCategory === "sub" ? "Solo subcategorías" : 
               selectedCategory === "tercera" ? "Solo terceras" :
               `Filtro: ${categories.find(c => c.id === selectedCategory)?.name || ""}`}
            </div>
          </div>
          
          {/* Categorías principales */}
          <div className="space-y-6">
            {/* Filtrar las categorías según la selección */}
            {(selectedCategory === "all" || selectedCategory === "main" ? mainCategories : [])
              .filter(cat => selectedCategory === "all" || selectedCategory === "main" || cat.id === selectedCategory)
              .map(cat => (
                <div key={cat.id} className="border border-sky-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="bg-white p-4">
                    {editingId === cat.id ? (
                      <div className="space-y-4 bg-sky-50/50 p-4 rounded-lg border border-sky-100">
                        <h4 className="text-sky-800 font-medium flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                          Editando categoría
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-sky-700 mb-1 block font-medium">Nombre de categoría</label>
                            <Input
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              placeholder="Nombre de categoría"
                              className="border-sky-200 focus:border-sky-400 focus:ring-sky-400"
                            />
                          </div>
                          {/* Solo mostrar campo de imagen si estamos editando una categoría principal */}
                          {!editingParentId && (
                            <div>
                              <label className="text-sm text-sky-700 mb-1 block font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                                  <circle cx="9" cy="9" r="2"></circle>
                                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                                </svg>
                                URL de imagen
                              </label>
                              <Input
                                value={editingImage}
                                onChange={e => setEditingImage(e.target.value)}
                                placeholder="URL de imagen (solo categorías principales)"
                                className="border-sky-200 focus:border-sky-400 focus:ring-sky-400"
                              />
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm text-sky-700 mb-1 block font-medium">Categoría padre (opcional)</label>
                          <Select 
                            value={editingParentId || "none"} 
                            onValueChange={(value) => setEditingParentId(value !== "none" ? value : null)}
                          >
                            <SelectTrigger className="border-sky-200 focus:border-sky-400 focus:ring-sky-400 bg-white shadow-sm">
                              <SelectValue placeholder="Ninguna (categoría principal)" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="none" className="focus:bg-sky-50 focus:text-sky-700">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                  </svg>
                                  Ninguna (categoría principal)
                                </div>
                              </SelectItem>
                              {mainCategories
                                .filter(mainCat => mainCat.id !== cat.id) // No mostrar la categoría actual
                                .map((category) => (
                                  <SelectItem key={category.id} value={category.id} className="focus:bg-sky-50 focus:text-sky-700">
                                    <div className="flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                                        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                      </svg>
                                      {category.name}
                                    </div>
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-sky-100">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-sky-200 text-sky-700 hover:bg-sky-50"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                              setEditingImage("");
                              setEditingParentId(null);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90"
                            onClick={() => handleEdit(cat.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                              <polyline points="17 21 17 13 7 13 7 21"></polyline>
                              <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={cat.image || "https://via.placeholder.com/40x40?text=?"}
                              alt={cat.name}
                              className="w-16 h-16 object-cover rounded-lg shadow-sm border border-sky-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://via.placeholder.com/40x40?text=?";
                              }}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium shadow-md">
                                  {categories.filter(subCat => subCat.parentId === cat.id).length}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">{categories.filter(subCat => subCat.parentId === cat.id).length} subcategorías</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-lg text-sky-800">{cat.name}</h4>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-md font-medium border border-green-200 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                                      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
                                    </svg>
                                    {loadingProducts ? 
                                      <span className="inline-block animate-pulse">Cargando...</span> : 
                                      getTotalProductsForMainCategory(cat.id)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p className="text-xs">Total de productos en esta categoría y sus subcategorías</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="text-xs bg-gradient-to-r from-sky-100 to-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium border border-blue-200 shadow-sm flex items-center w-fit">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                              </svg>
                              Categoría principal
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditingName(cat.name);
                              setEditingImage(cat.image || "");
                              setEditingParentId(cat.parentId || null);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" 
                            onClick={() => handleDelete(cat.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Subcategorías relacionadas */}
                  {!editingId && categories
                    .filter(subCat => subCat.parentId === cat.id && 
                             (selectedCategory === "all" || selectedCategory === cat.id || selectedCategory === "sub"))
                    .length > 0 && (
                    <div className="bg-sky-50/70 p-4 border-t border-sky-100">
                      <h5 className="text-sm font-medium text-sky-700 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-600">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        Subcategorías:
                      </h5>
                      <ul className="space-y-3">
                        {categories
                          .filter(subCat => subCat.parentId === cat.id && 
                                  (selectedCategory === "all" || selectedCategory === cat.id || selectedCategory === "sub"))
                          .map(subCat => (
                            <li key={subCat.id} className="flex flex-col bg-white rounded-lg shadow-sm border border-sky-100 hover:shadow-md transition-shadow duration-200">
                              <div className={`flex items-center justify-between p-3 ${categories.some(thirdCat => thirdCat.parentId === subCat.id) ? 'border-b border-dashed border-blue-100' : ''}`}>
                                {editingId === subCat.id ? (
                                  <div className="w-full space-y-3 bg-blue-50/50 p-3 rounded-md border border-blue-100">
                                    <h4 className="text-blue-700 font-medium flex items-center gap-2 text-sm">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                      </svg>
                                      Editando subcategoría
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                      <div>
                                        <label className="text-sm text-blue-700 mb-1 block font-medium">Nombre de subcategoría</label>
                                        <Input
                                          value={editingName}
                                          onChange={e => setEditingName(e.target.value)}
                                          placeholder="Nombre de subcategoría"
                                          className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <label className="text-sm text-blue-700 mb-1 block font-medium">Categoría padre</label>
                                      <Select 
                                        value={editingParentId || "none"} 
                                        onValueChange={(value) => setEditingParentId(value !== "none" ? value : null)}
                                      >
                                        <SelectTrigger className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 bg-white shadow-sm">
                                          <SelectValue placeholder="Ninguna (categoría principal)" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                          <SelectItem value="none" className="focus:bg-sky-50 focus:text-sky-700">
                                            <div className="flex items-center">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                                                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                              </svg>
                                              Ninguna (categoría principal)
                                            </div>
                                          </SelectItem>
                                          {categories
                                            .filter(category => category.id !== subCat.id)
                                            .map((category) => (
                                              <SelectItem key={category.id} value={category.id} className="focus:bg-sky-50 focus:text-sky-700">
                                                <div className="flex items-center">
                                                  {!category.parentId ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                                                      <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                                    </svg>
                                                  ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-600">
                                                      <polyline points="9 18 15 12 9 6"></polyline>
                                                    </svg>
                                                  )}
                                                  {category.name} 
                                                  <span className="text-xs text-sky-500 ml-2">
                                                    {category.parentId ? '(Subcategoría)' : '(Principal)'}
                                                  </span>
                                                </div>
                                              </SelectItem>
                                            ))
                                          }
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-blue-100">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                        onClick={() => {
                                          setEditingId(null);
                                          setEditingName("");
                                          setEditingImage("");
                                          setEditingParentId(null);
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90"
                                        onClick={() => handleEdit(subCat.id)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                          <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                          <polyline points="7 3 7 8 15 8"></polyline>
                                        </svg>
                                        Guardar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-3">
                                      {/* No mostramos imagen para subcategorías, solo un icono o indicador */}
                                      <div className="relative">
                                        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg shadow-sm">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        </div>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-medium shadow-md">
                                              {categories.filter(thirdCat => thirdCat.parentId === subCat.id).length}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom">
                                            <p className="text-xs">{categories.filter(thirdCat => thirdCat.parentId === subCat.id).length} terceras categorías</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-blue-800">{subCat.name}</span>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-md font-medium border border-green-200 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                                                  <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
                                                </svg>
                                                {loadingProducts ? 
                                                  <span className="inline-block animate-pulse">Cargando...</span> : 
                                                  getTotalProductsForSubcategory(subCat.id)}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                              <p className="text-xs">Total de productos en esta subcategoría y sus terceras categorías</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                        <div className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                          </svg>
                                          Subcategoría de {cat.name}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                        onClick={() => {
                                          setEditingId(subCat.id);
                                          setEditingName(subCat.name);
                                          // No necesitamos cargar la imagen para subcategorías
                                          setEditingImage("");
                                          setEditingParentId(subCat.parentId || null);
                                        }}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50" 
                                        onClick={() => handleDelete(subCat.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Mostrar terceras categorías debajo de cada subcategoría */}
                              {!editingId && categories.filter(thirdCat => thirdCat.parentId === subCat.id).length > 0 && (
                                <div className="pl-5 pr-2 py-2 bg-indigo-50/50">
                                  <div className="flex justify-between items-center mb-2">
                                    <h6 className="text-xs font-medium text-indigo-700 flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                        <polyline points="15 18 21 12 15 6"></polyline>
                                      </svg>
                                      Terceras categorías:
                                    </h6>
                                    {categories.filter(thirdCat => thirdCat.parentId === subCat.id).length > 3 && (
                                      <button 
                                        onClick={() => setExpandedSubcategories(prev => ({
                                          ...prev,
                                          [subCat.id]: !prev[subCat.id]
                                        }))}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-indigo-100/50 transition-colors"
                                      >
                                        {expandedSubcategories[subCat.id] ? (
                                          <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="m18 15-6-6-6 6"></path>
                                            </svg>
                                            Ver menos
                                          </>
                                        ) : (
                                          <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="m6 9 6 6 6-6"></path>
                                            </svg>
                                            Ver más
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  <ul className="space-y-2">
                                    {categories
                                      .filter(thirdCat => thirdCat.parentId === subCat.id)
                                      .slice(0, expandedSubcategories[subCat.id] ? undefined : 3) // Mostrar solo 3 si no está expandido
                                      .map(thirdCat => (
                                        <li key={thirdCat.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg shadow-sm border border-indigo-100 hover:shadow-md transition-shadow duration-200">
                                          {editingId === thirdCat.id ? (
                                            <div className="w-full space-y-2 p-2 bg-indigo-50/70 rounded-md border border-indigo-100">
                                              <h4 className="text-indigo-700 font-medium flex items-center gap-2 text-xs">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M12 20h9"></path>
                                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                </svg>
                                                Editando tercera categoría
                                              </h4>
                                              
                                              <div>
                                                <label className="text-xs text-indigo-700 mb-1 block font-medium">Nombre de categoría</label>
                                                <Input
                                                  value={editingName}
                                                  onChange={e => setEditingName(e.target.value)}
                                                  placeholder="Nombre de categoría"
                                                  className="text-sm h-8 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                                                />
                                              </div>
                                              
                                              <div>
                                                <label className="text-xs text-indigo-700 mb-1 block font-medium">Categoría padre</label>
                                                <Select 
                                                  value={editingParentId || "none"} 
                                                  onValueChange={(value) => setEditingParentId(value !== "none" ? value : null)}
                                                >
                                                  <SelectTrigger className="border-indigo-200 text-sm focus:border-indigo-400 focus:ring-indigo-400 bg-white shadow-sm">
                                                    <SelectValue placeholder="Seleccione categoría padre" />
                                                  </SelectTrigger>
                                                  <SelectContent className="bg-white">
                                                    <SelectItem value="none" className="focus:bg-sky-50 focus:text-sky-700">
                                                      <div className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                                                          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                                        </svg>
                                                        Ninguna (categoría principal)
                                                      </div>
                                                    </SelectItem>
                                                    {categories
                                                      .filter(cat => cat.id !== thirdCat.id)
                                                      .map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.id} className="focus:bg-sky-50 focus:text-sky-700">
                                                          <div className="flex items-center">
                                                            {!cat.parentId ? (
                                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sky-600">
                                                                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                                              </svg>
                                                            ) : cat.parentId === subCat.parentId ? (
                                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-600">
                                                                <polyline points="9 18 15 12 9 6"></polyline>
                                                              </svg>
                                                            ) : (
                                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-600">
                                                                <polyline points="9 18 15 12 9 6"></polyline>
                                                                <polyline points="15 18 21 12 15 6"></polyline>
                                                              </svg>
                                                            )}
                                                            {cat.name} 
                                                            <span className="text-xs text-sky-500 ml-2">
                                                              {cat.parentId === subCat.parentId ? '(Subcategoría)' : cat.parentId ? '(Tercera categoría)' : '(Principal)'}
                                                            </span>
                                                          </div>
                                                        </SelectItem>
                                                      ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              
                                              <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-indigo-100">
                                                <Button 
                                                  size="sm" 
                                                  variant="outline"
                                                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs h-7"
                                                  onClick={() => {
                                                    setEditingId(null);
                                                    setEditingName("");
                                                    setEditingImage("");
                                                    setEditingParentId(null);
                                                  }}
                                                >
                                                  Cancelar
                                                </Button>
                                                <Button 
                                                  size="sm" 
                                                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 text-xs h-7"
                                                  onClick={() => handleEdit(thirdCat.id)}
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                    <polyline points="7 3 7 8 15 8"></polyline>
                                                  </svg>
                                                  Guardar
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                    <polyline points="15 18 21 12 15 6"></polyline>
                                                  </svg>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium text-indigo-800">{thirdCat.name}</span>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-md font-medium border border-green-200 flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                                                          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
                                                        </svg>
                                                        {loadingProducts ? 
                                                          <span className="inline-block animate-pulse">Cargando...</span> : 
                                                          getProductCountForTercera(thirdCat.id)}
                                                      </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">
                                                      <p className="text-xs">Productos en esta tercera categoría</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </div>
                                              </div>
                                              
                                              <div className="flex gap-1">
                                                <Button 
                                                  size="sm" 
                                                  variant="outline" 
                                                  className="h-6 w-6 p-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                  onClick={() => {
                                                    setEditingId(thirdCat.id);
                                                    setEditingName(thirdCat.name);
                                                    setEditingImage("");
                                                    setEditingParentId(thirdCat.parentId || null);
                                                  }}
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button 
                                                  size="sm" 
                                                  variant="outline" 
                                                  className="h-6 w-6 p-0 text-red-600 border-red-200 hover:bg-red-50" 
                                                  onClick={() => handleDelete(thirdCat.id)}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </>
                                          )}
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            }
            
            {/* Terceras categorías (cuando se filtran solo terceras categorías) */}
            {selectedCategory === "tercera" && (
              <div className="border rounded-lg p-4 bg-gray-50 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium">Todas las terceras categorías</h5>
                  {categories.filter(cat => subCategories.some(subCat => subCat.id === cat.parentId)).length > 5 && (
                    <button 
                      onClick={() => setExpandedSubcategories(prev => ({
                        ...prev,
                        'all_terceras': !prev['all_terceras']
                      }))}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-100/50 transition-colors"
                    >
                      {expandedSubcategories['all_terceras'] ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6"></path>
                          </svg>
                          Ver menos
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6"></path>
                          </svg>
                          Ver más
                        </>
                      )}
                    </button>
                  )}
                </div>
                {categories.filter(cat => subCategories.some(subCat => subCat.id === cat.parentId)).length > 0 ? (
                  <ul className="space-y-3">
                    {categories
                      .filter(cat => subCategories.some(subCat => subCat.id === cat.parentId))
                      .slice(0, expandedSubcategories['all_terceras'] ? undefined : 5) // Mostrar solo 5 si no está expandido
                      .map(thirdCat => (
                        <li key={thirdCat.id} className="flex items-center justify-between bg-white p-3 rounded border border-orange-100">
                          {editingId === thirdCat.id ? (
                            <div className="w-full space-y-3">
                              <div className="grid grid-cols-1 gap-3">
                                <Input
                                  value={editingName}
                                  onChange={e => setEditingName(e.target.value)}
                                  placeholder="Nombre de categoría"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Categoría padre</label>
                                <Select 
                                  value={editingParentId || "none"} 
                                  onValueChange={(value) => setEditingParentId(value !== "none" ? value : null)}
                                >
                                  <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400">
                                    <SelectValue placeholder="Seleccione categoría padre" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Ninguna (categoría principal)</SelectItem>
                                    {categories
                                      .filter(cat => cat.id !== thirdCat.id)
                                      .map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                          {cat.name} {cat.parentId ? cat.parentId === thirdCat.parentId ? '(Subcategoría)' : '(Tercera categoría)' : '(Principal)'}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex justify-end gap-2 mt-2">
                                <Button size="sm" onClick={() => handleEdit(thirdCat.id)}>Guardar</Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingName("");
                                    setEditingImage("");
                                    setEditingParentId(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-600 rounded">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </div>
                                <div>
                                  <span className="font-medium">{thirdCat.name}</span>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-gray-500">Categoría padre:</span>
                                    <span className="text-xs font-medium">
                                      {categories.find(c => c.id === thirdCat.parentId)?.name || "N/A"}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-1">→</span>
                                    <span className="text-xs font-medium">
                                      {categories.find(c => c.id === categories.find(c => c.id === thirdCat.parentId)?.parentId)?.name || ""}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingId(thirdCat.id);
                                    setEditingName(thirdCat.name);
                                    setEditingImage("");
                                    setEditingParentId(thirdCat.parentId || null);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600" 
                                  onClick={() => handleDelete(thirdCat.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-3">No hay terceras categorías creadas</p>
                    <Button variant="outline" onClick={() => setSelectedCategory("all")}>
                      Ver todas las categorías
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Subcategorías independientes (cuando se filtran solo subcategorías) */}
            {selectedCategory === "sub" && (
              <div className="border rounded-lg p-4 bg-gray-50 mt-4">
                <h5 className="font-medium mb-3">Todas las subcategorías</h5>
                <ul className="space-y-2">
                  {subCategories.map(subCat => (
                    <li key={subCat.id} className="flex flex-col bg-white rounded border mb-2">
                      <div className={`flex items-center justify-between p-3 ${categories.some(thirdCat => thirdCat.parentId === subCat.id) ? 'border-b border-dashed' : ''}`}>
                        {editingId === subCat.id ? (
                          <div className="w-full space-y-3">
                            <div className="grid grid-cols-1 gap-3">
                              <Input
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                placeholder="Nombre de subcategoría"
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm text-gray-600 mb-1 block">Categoría padre</label>
                              <Select 
                                value={editingParentId || "none"} 
                                onValueChange={(value) => setEditingParentId(value !== "none" ? value : null)}
                              >
                                <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400">
                                  <SelectValue placeholder="Ninguna (categoría principal)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Ninguna (categoría principal)</SelectItem>
                                  {categories
                                    .filter(cat => cat.id !== subCat.id)
                                    .map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name} {cat.parentId ? '(Subcategoría)' : '(Principal)'}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-2">
                              <Button size="sm" onClick={() => handleEdit(subCat.id)}>Guardar</Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                  setEditingImage("");
                                  setEditingParentId(null);
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              {/* Icono para subcategorías en lugar de imagen */}
                              <div className="w-10 h-10 flex items-center justify-center bg-orange-100 text-orange-600 rounded">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                              </div>
                              <div>
                                <span className="font-medium">{subCat.name}</span>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs text-gray-500">Categoría padre:</span>
                                  <span className="text-xs font-medium">
                                    {categories.find(c => c.id === subCat.parentId)?.name || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setEditingId(subCat.id);
                                  setEditingName(subCat.name);
                                  // No cargamos imágenes para subcategorías
                                  setEditingImage("");
                                  setEditingParentId(subCat.parentId || null);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600" 
                                onClick={() => handleDelete(subCat.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Mostrar terceras categorías debajo de cada subcategoría en la vista de "Solo subcategorías" */}
                      {!editingId && categories.filter(thirdCat => thirdCat.parentId === subCat.id).length > 0 && (
                        <div className="pl-5 pr-2 py-2 bg-gray-50">
                          <div className="flex justify-between items-center mb-1">
                            <h6 className="text-xs font-medium text-gray-600">Terceras categorías:</h6>
                            {categories.filter(thirdCat => thirdCat.parentId === subCat.id).length > 3 && (
                              <button 
                                onClick={() => setExpandedSubcategories(prev => ({
                                  ...prev,
                                  [subCat.id]: !prev[subCat.id]
                                }))}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-100/50 transition-colors"
                              >
                                {expandedSubcategories[subCat.id] ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m18 15-6-6-6 6"></path>
                                    </svg>
                                    Ver menos
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m6 9 6 6 6-6"></path>
                                    </svg>
                                    Ver más
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <ul className="space-y-1">
                            {categories
                              .filter(thirdCat => thirdCat.parentId === subCat.id)
                              .slice(0, expandedSubcategories[subCat.id] ? undefined : 3) // Mostrar solo 3 si no está expandido
                              .map(thirdCat => (
                                <li key={thirdCat.id} className="flex items-center justify-between bg-white p-2 rounded border border-orange-100">
                                  {editingId === thirdCat.id ? (
                                    <div className="w-full space-y-2 p-2">
                                      <Input
                                        value={editingName}
                                        onChange={e => setEditingName(e.target.value)}
                                        placeholder="Nombre de categoría"
                                        className="text-sm"
                                      />
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Categoría padre</label>
                                        <Select 
                                          value={editingParentId || "none"} 
                                          onValueChange={(value) => setEditingParentId(value !== "none" ? value : null)}
                                        >
                                          <SelectTrigger className="border-orange-200 text-sm focus:border-orange-400 focus:ring-orange-400">
                                            <SelectValue placeholder="Seleccione categoría padre" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">Ninguna (categoría principal)</SelectItem>
                                            {categories
                                              .filter(cat => cat.id !== thirdCat.id)
                                              .map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                  {cat.name} {cat.parentId ? '(Subcategoría)' : '(Principal)'}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex justify-end gap-1 mt-2">
                                        <Button size="sm" onClick={() => handleEdit(thirdCat.id)}>Guardar</Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => {
                                            setEditingId(null);
                                            setEditingName("");
                                            setEditingImage("");
                                            setEditingParentId(null);
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 flex items-center justify-center bg-orange-50 text-orange-500 rounded">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        </div>
                                        <span className="text-xs font-medium">{thirdCat.name}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-7 w-7 p-0"
                                          onClick={() => {
                                            setEditingId(thirdCat.id);
                                            setEditingName(thirdCat.name);
                                            setEditingImage("");
                                            setEditingParentId(thirdCat.parentId || null);
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-7 w-7 p-0 text-red-600" 
                                          onClick={() => handleDelete(thirdCat.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Mensaje cuando no hay categorías */}
            {(selectedCategory === "all" && categories.length === 0) || 
             (selectedCategory === "main" && mainCategories.length === 0) ||
             (selectedCategory === "sub" && subCategories.length === 0) || 
             (selectedCategory === "tercera" && !categories.some(cat => subCategories.some(subCat => subCat.id === cat.parentId))) ||
             (selectedCategory !== "all" && selectedCategory !== "main" && selectedCategory !== "sub" && selectedCategory !== "tercera" && !categories.find(cat => cat.id === selectedCategory)) && (
              <div className="text-center py-10 border rounded-lg">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </div>
                <h3 className="font-medium text-lg mb-1">No hay categorías</h3>
                <p className="text-gray-500 mb-4">No se encontraron categorías con los criterios seleccionados</p>
                {selectedCategory !== "all" && (
                  <Button variant="outline" onClick={() => setSelectedCategory("all")}>
                    Ver todas las categorías
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
