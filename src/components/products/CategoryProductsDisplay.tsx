import React from 'react';
import { MosaicProductCard } from './MosaicProductCard';
import { Button } from '@/components/ui/button';
import { Product } from '@/contexts/CartContext';
import { Category } from '@/hooks/use-categories';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdvancedCategoryGrid from './AdvancedCategoryGrid';
import './product-mosaic.css';
import './grid-black-borders.css';
import './product-grid-unified.css';
import './advanced-category-grid.css';

interface CategoryProductsDisplayProps {
  category: Category;
  subcategories: Category[];
  products: Product[];
  showSubcategories?: boolean;
}

export const CategoryProductsDisplay = ({ category, subcategories, products, showSubcategories = true }: CategoryProductsDisplayProps) => {
  const navigate = useNavigate();
  
  // Get category description based on name or provide a default one
  const getCategoryDescription = (categoryName: string) => {
    const descriptions: { [key: string]: string } = {
      "Bazar": "Encuentra todo lo que necesitas para tu hogar: artículos de decoración, utensilios de cocina y más.",
      "Electrónica": "Los mejores dispositivos tecnológicos y accesorios para tu vida digital.",
      "Alimentos": "Productos frescos y de calidad para tu mesa diaria.",
      "Juguetes": "La mejor selección de juguetes para todas las edades y gustos.",
      "Ropa": "Las últimas tendencias en moda para toda la familia.",
      "Perfumería": "Fragancias exclusivas y productos de cuidado personal premium.",
      "Ofertas": "Las mejores promociones y descuentos de temporada, ¡no te los pierdas!",
      // Add more category descriptions as needed
    };
    
    return descriptions[categoryName] || `Explora nuestra selección de productos de ${categoryName}.`;
  };

  // Calculate how many columns we'll display based on viewport width
  // Default to 3 columns, but this will be handled by CSS media queries
  const columnsCount = 3;
  
  // Calculate rows (default to 4 rows)
  const rowsToShow = 4;
  
  // Calculate the number of products to show to create complete rows
  const productsToShow = columnsCount * rowsToShow;
  
  // Take only up to the calculated number of products
  const displayProducts = products.slice(0, productsToShow);
  
  // Check if we need a "View more" button
  const hasMoreProducts = products.length > productsToShow;

  // Return null if there are no products to display
  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-20 last:mb-10">
      {/* Category header with image and title */}
      <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
        <div className="relative w-full md:w-1/3 aspect-video overflow-hidden rounded-2xl shadow-lg">
          {category.image && category.image !== "undefined" ? (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image fails to load, fallback to placeholder
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement?.classList.add('bg-gradient-to-r', 'from-blue-100', 'to-indigo-100');
                const placeholder = document.createElement('h3');
                placeholder.className = 'text-2xl font-bold text-slate-700';
                placeholder.textContent = category.name;
                (e.target as HTMLImageElement).parentElement?.appendChild(placeholder);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
              <h3 className="text-2xl font-bold text-slate-700">{category.name}</h3>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 flex items-end">
            <h2 className="text-3xl font-bold text-white p-6">{category.name}</h2>
          </div>
        </div>
        
        <div className="md:w-2/3 space-y-4">
          {/* Category description */}
          <p className="text-slate-600 text-lg leading-relaxed">
            {getCategoryDescription(category.name)}
          </p>
          
          {/* Subcategories with advanced grid */}
          {showSubcategories && subcategories.length > 0 && (
            <div className="mt-4">
              <AdvancedCategoryGrid 
                parentCategory={category} 
                subcategories={subcategories} 
                onCategoryClick={(subcat) => navigate(`/productos?category=${category.name}&subcategory=${subcat.name}&hideSubcategories=true`)} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Products mosaic grid - uniform layout with minimal gaps */}
      <div className="product-mosaic-grid">
        {displayProducts.map((product, index) => (
          <div 
            className="product-mosaic-item" 
            key={product.id}
            style={{ '--animation-order': index } as React.CSSProperties}
          >
            <MosaicProductCard product={product} />
          </div>
        ))}
        
        {/* Add placeholder items to ensure complete rows if necessary */}
        {displayProducts.length % columnsCount !== 0 && 
          Array.from({ length: columnsCount - (displayProducts.length % columnsCount) }).map((_, index) => (
            <div 
              className="product-mosaic-item opacity-0" 
              key={`placeholder-${index}`}
              aria-hidden="true"
            >
              <div className="w-full h-full"></div>
            </div>
          ))
        }
      </div>

      {/* View more button if there are more products */}
      {hasMoreProducts && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            className="border-slate-300 hover:bg-slate-50 text-slate-700"
            onClick={() => navigate(`/productos?category=${category.name}`)}
          >
            Ver más productos de {category.name}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
