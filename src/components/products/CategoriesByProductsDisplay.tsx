import React, { useState, useEffect } from 'react';
import { CategoryProductsDisplay } from './CategoryProductsDisplay';
import { useCategories } from '@/hooks/use-categories';
import { Product } from '@/contexts/CartContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import './product-mosaic.css';

interface CategoriesByProductsDisplayProps {
  selectedCategory?: string;
}

export const CategoriesByProductsDisplay = ({ selectedCategory = "Todos" }: CategoriesByProductsDisplayProps) => {
  const { categoriesData, subcategoriesByParent, mainCategories } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({});
  const location = useLocation();

  // Consider URL parameters for initial state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      // The selectedCategory prop will be used by the parent component
      console.log(`URL category detected: ${categoryParam}`);
    }
  }, [location.search]);

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
            createdAt: data.createdAt?.toDate() || new Date(),
            stock: data.stock || 0,
            isPopular: data.isPopular || false,
            isNew: data.isNew || false,
            rating: data.rating || 0,
            // Add other fields as needed
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
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-16">
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="w-full md:w-1/3 h-64 rounded-2xl" />
              <div className="md:w-2/3 space-y-4">
                <Skeleton className="h-10 w-3/4" />
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

  // Filter categories based on the selected category
  const filteredCategories = selectedCategory === "Todos" 
    ? displayCategories 
    : displayCategories.filter(cat => cat.name === selectedCategory);

  return (
    <div className="space-y-20">
      {filteredCategories.map((category) => {
        // Get products for this category
        const categoryProducts = productsByCategory[category.name] || [];
        
        // Get subcategories for this category
        const subcats = subcategoriesByParent[category.name] || [];
        
        // Only render if there are products in this category
        if (categoryProducts.length === 0) return null;
        
        return (
          <CategoryProductsDisplay
            key={category.id}
            category={category}
            subcategories={subcats}
            products={categoryProducts}
          />
        );
      })}
    </div>
  );
};
