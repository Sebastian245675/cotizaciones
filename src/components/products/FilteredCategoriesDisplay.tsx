import React, { useState, useEffect } from 'react';
import { CategoryProductsDisplay } from './CategoryProductsDisplay';
import { useCategories } from '@/hooks/use-categories';
import { Product } from '@/contexts/CartContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import './product-mosaic.css';

interface FilteredCategoriesDisplayProps {
  selectedCategory: string;
  selectedSubcategory: string;
  selectedTerceraCategoria: string;
  searchTerm?: string;
  showSubcategories?: boolean;
}

export const FilteredCategoriesDisplay = ({ 
  selectedCategory = "Todos",
  selectedSubcategory = "Todas", 
  selectedTerceraCategoria = "Todas",
  searchTerm = "",
  showSubcategories = true
}: FilteredCategoriesDisplayProps) => {
  const { categoriesData, subcategoriesByParent, mainCategories } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({});
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const location = useLocation();

  // Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            price: data.price,
            description: data.description,
            image: data.image,
            category: data.categoryId,
            categoryName: data.categoryName,
            subcategory: data.subcategoryId,
            subcategoryName: data.subcategoryName,
            terceraCategoria: data.terceraCategoriaId,
            terceraCategoriaName: data.terceraCategoriaName,
            createdAt: data.createdAt?.toDate() || new Date(),
            stock: data.stock || 0,
            isPopular: data.isPopular || false,
            isNew: data.isNew || false,
            rating: data.rating || 0,
          } as Product;
        });
        
        setProducts(productsData);
        
        // Group products by category
        const byCategory: Record<string, Product[]> = {};
        productsData.forEach(product => {
          const categoryName = product.categoryName || "Sin categoría";
          if (!byCategory[categoryName]) {
            byCategory[categoryName] = [];
          }
          byCategory[categoryName].push(product);
        });
        setProductsByCategory(byCategory);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on selected categories and search term
  useEffect(() => {
    if (products.length === 0) return;

    let filtered = [...products];

    // Filter by main category
    if (selectedCategory !== "Todos") {
      filtered = filtered.filter(product => 
        product.categoryName === selectedCategory || 
        (categoriesData.find(c => c.id === product.category)?.name === selectedCategory)
      );
    }

    // Filter by subcategory if selected
    if (selectedSubcategory !== "Todas") {
      filtered = filtered.filter(product =>
        product.subcategoryName === selectedSubcategory ||
        (categoriesData.find(c => c.id === product.subcategory)?.name === selectedSubcategory)
      );
    }

    // Filter by tercera categoria if selected
    if (selectedTerceraCategoria !== "Todas") {
      filtered = filtered.filter(product =>
        product.terceraCategoriaName === selectedTerceraCategoria ||
        (categoriesData.find(c => c.id === product.terceraCategoria)?.name === selectedTerceraCategoria)
      );
    }

    // Filter by search term if provided
    if (searchTerm && searchTerm.trim() !== "") {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(normalizedSearch) ||
        product.description?.toLowerCase().includes(normalizedSearch) ||
        product.categoryName?.toLowerCase().includes(normalizedSearch) ||
        product.subcategoryName?.toLowerCase().includes(normalizedSearch)
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, selectedSubcategory, selectedTerceraCategoria, searchTerm, categoriesData]);

  if (loading) {
    return (
      <div className="space-y-16 animate-pulse">
        {[1, 2].map((_, index) => (
          <div key={index} className="mb-20">
            <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
              <Skeleton className="w-full md:w-1/3 h-56 rounded-2xl" />
              <div className="flex-1 w-full space-y-4">
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="product-mosaic-grid">
              {[1, 2, 3, 4, 5, 6].map((_, i) => (
                <div key={i} className="product-mosaic-item">
                  <Skeleton className="h-80 w-full rounded-none" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Sort main categories (put "Todos" at the beginning if it exists)
  const sortedMainCategories = [...mainCategories].sort((a, b) => {
    if (a.name === "Todos") return -1;
    if (b.name === "Todos") return 1;
    return a.name.localeCompare(b.name);
  });

  // Skip "Todos" category in display
  const displayCategories = sortedMainCategories.filter(cat => cat.name !== "Todos");
  
  // Si no hay productos después de filtrar, mostrar mensaje
  if (filteredProducts.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">😕</div>
        <h3 className="text-2xl font-semibold mb-2">No se encontraron productos</h3>
        <p className="text-gray-500">
          No hay productos que coincidan con los criterios de búsqueda seleccionados.
        </p>
      </div>
    );
  }

  // Agrupar productos filtrados por categoría
  const filteredByCategoryMap: Record<string, Product[]> = {};
  filteredProducts.forEach(product => {
    const categoryName = product.categoryName || "Sin categoría";
    if (!filteredByCategoryMap[categoryName]) {
      filteredByCategoryMap[categoryName] = [];
    }
    filteredByCategoryMap[categoryName].push(product);
  });

  // Si solo está filtrando por categoría principal y no hay subcategoría seleccionada
  if (selectedCategory !== "Todos" && selectedSubcategory === "Todas") {
    // Mostrar solo la categoría seleccionada
    const categoryObj = categoriesData.find(cat => cat.name === selectedCategory);
    if (categoryObj && filteredByCategoryMap[selectedCategory]) {
      // Obtener subcategorías para esta categoría
      const subcats = subcategoriesByParent[selectedCategory] || [];
      
      return (
        <div className="space-y-20">
          <CategoryProductsDisplay
            key={categoryObj.id}
            category={categoryObj}
            subcategories={subcats}
            products={filteredByCategoryMap[selectedCategory]}
            showSubcategories={showSubcategories}
          />
        </div>
      );
    }
  }

  // Si hay filtrado por subcategoría o tercera categoría
  return (
    <div className="space-y-20">
      {Object.entries(filteredByCategoryMap).map(([categoryName, categoryProducts]) => {
        // Get category object
        const categoryObj = categoriesData.find(cat => cat.name === categoryName);
        if (!categoryObj) return null;
        
        // Get subcategories for this category
        const subcats = subcategoriesByParent[categoryName] || [];
        
        return (
          <CategoryProductsDisplay
            key={categoryObj.id}
            category={categoryObj}
            subcategories={subcats}
            products={categoryProducts}
            showSubcategories={showSubcategories}
          />
        );
      })}
    </div>
  );
};
