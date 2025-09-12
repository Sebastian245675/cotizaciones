import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Product } from '@/contexts/CartContext';
import { ProductsSection } from '@/components/products/ProductsSection';
import CategoriasSidebar from '@/components/products/CategoriasSidebar';
import { useCategories } from '@/hooks/use-categories';
import { FilteredCategoriesDisplay } from '@/components/products/FilteredCategoriesDisplay';
import { Search, Filter, ChevronDown } from 'lucide-react';
import '@/components/products/product-mosaic.css';
import '@/components/products/main.css';
import './productos.css';

const ProductosPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categoriesData: categories } = useCategories();
  const productSectionRef = useRef<HTMLDivElement>(null);
  
  // Estado para las categorías seleccionadas - Inicializamos con valores de la URL
  const initialCategory = searchParams.get('category') || 'Todos';
  const initialSubcategory = searchParams.get('subcategory') || 'Todas';
  const initialTerceraCategoria = searchParams.get('tercera') || 'Todas';
  const initialSearch = searchParams.get('search') || '';
  
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory);
  const [selectedTerceraCategoria, setSelectedTerceraCategoria] = useState<string>(initialTerceraCategoria);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [hideSubcategories, setHideSubcategories] = useState<boolean>(searchParams.get('hideSubcategories') === 'true');
  
  // Obtener categorías y término de búsqueda del searchParams si están disponibles
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    const terceraParam = searchParams.get('tercera');
    const searchParam = searchParams.get('search');
    const hideSubcategoriesParam = searchParams.get('hideSubcategories');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    
    if (subcategoryParam) {
      setSelectedSubcategory(subcategoryParam);
    }
    
    if (terceraParam) {
      setSelectedTerceraCategoria(terceraParam);
    }
    
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    
    if (hideSubcategoriesParam) {
      setHideSubcategories(hideSubcategoriesParam === 'true');
    }
  }, [searchParams]);
  
  // Manejadores para actualizar la URL cuando cambian las selecciones
  const updateCategorySelection = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory('Todas');
    setSelectedTerceraCategoria('Todas');
    
    // Actualizar URL
    const newParams = new URLSearchParams();
    if (category !== 'Todos') {
      newParams.set('category', category);
    }
    // Mantener el parámetro de ocultar subcategorías si está presente
    if (hideSubcategories) {
      newParams.set('hideSubcategories', 'true');
    }
    
    navigate(`/productos?${newParams.toString()}`);
  };
  
  const updateSubcategorySelection = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedTerceraCategoria('Todas');
    
    // Actualizar URL
    const newParams = new URLSearchParams();
    if (selectedCategory !== 'Todos') {
      newParams.set('category', selectedCategory);
    }
    if (subcategory !== 'Todas') {
      newParams.set('subcategory', subcategory);
    }
    // Mantener el parámetro de ocultar subcategorías si está presente
    if (hideSubcategories) {
      newParams.set('hideSubcategories', 'true');
    }
    
    navigate(`/productos?${newParams.toString()}`);
  };
  
  const updateTerceraCategoriaSelection = (terceraCategoria: string) => {
    setSelectedTerceraCategoria(terceraCategoria);
    
    // Actualizar URL
    const newParams = new URLSearchParams();
    if (selectedCategory !== 'Todos') {
      newParams.set('category', selectedCategory);
    }
    if (selectedSubcategory !== 'Todas') {
      newParams.set('subcategory', selectedSubcategory);
    }
    if (terceraCategoria !== 'Todas') {
      newParams.set('tercera', terceraCategoria);
    }
    // Mantener el parámetro de ocultar subcategorías si está presente
    if (hideSubcategories) {
      newParams.set('hideSubcategories', 'true');
    }
    
    navigate(`/productos?${newParams.toString()}`);
  };

  // Función para manejar el envío del formulario de búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Actualizar URL con el término de búsqueda
    const newParams = new URLSearchParams(searchParams.toString());
    
    if (searchTerm.trim()) {
      newParams.set('search', searchTerm.trim());
    } else {
      newParams.delete('search');
    }
    
    navigate(`/productos?${newParams.toString()}`);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Contenido principal con productos */}
      <div className="container mx-auto pt-24 pb-12 px-4">
        <div className="flex flex-col lg:flex-row gap-8 relative">
          {/* Sidebar de categorías - Solo si hay una categoría principal seleccionada */}
          {selectedCategory !== 'Todos' && (
            <div className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-100 sticky top-24">
                <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  {selectedCategory !== 'Todos' ? `Opciones de ${selectedCategory}` : 'Categorías'}
                </h2>
                <CategoriasSidebar
                  selectedCategory={selectedCategory}
                  setSelectedCategory={updateCategorySelection}
                  selectedSubcategory={selectedSubcategory}
                  setSelectedSubcategory={updateSubcategorySelection}
                  selectedTerceraCategoria={selectedTerceraCategoria}
                  setSelectedTerceraCategoria={updateTerceraCategoriaSelection}
                  showOnlySelectedCategory={true}
                />
              </div>
            </div>
          )}
          
          {/* Sección principal de productos */}
          <div className="flex-grow" ref={productSectionRef}>
            {/* Usando FilteredCategoriesDisplay para filtrar por categoría, subcategoría, tercera categoría y búsqueda */}
            <FilteredCategoriesDisplay 
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              selectedTerceraCategoria={selectedTerceraCategoria}
              searchTerm={searchTerm}
              showSubcategories={!hideSubcategories}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductosPage;
