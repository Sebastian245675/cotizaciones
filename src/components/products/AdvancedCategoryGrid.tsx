import React from 'react';
import { Category } from '@/hooks/use-categories';
import { useNavigate } from 'react-router-dom';
import CategoryIconSelector from './CategoryIconSelector';
import './advanced-category-grid.css';

interface AdvancedCategoryGridProps {
  parentCategory: Category;
  subcategories: Category[];
  onCategoryClick?: (category: Category) => void;
}

const AdvancedCategoryGrid: React.FC<AdvancedCategoryGridProps> = ({ 
  parentCategory, 
  subcategories, 
  onCategoryClick 
}) => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: Category) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    } else {
      navigate(`/productos?category=${parentCategory.name}&subcategory=${category.name}&hideSubcategories=true`);
    }
  };

  // Colores de gradientes premium para las casillas
  const gradientColors = [
    'from-blue-50/90 via-sky-50/90 to-indigo-50/90 hover:from-blue-100/90 hover:via-sky-100/90 hover:to-indigo-100/90',
    'from-purple-50/90 via-fuchsia-50/90 to-pink-50/90 hover:from-purple-100/90 hover:via-fuchsia-100/90 hover:to-pink-100/90',
    'from-emerald-50/90 via-green-50/90 to-teal-50/90 hover:from-emerald-100/90 hover:via-green-100/90 hover:to-teal-100/90',
    'from-amber-50/90 via-orange-50/90 to-yellow-50/90 hover:from-amber-100/90 hover:via-orange-100/90 hover:to-yellow-100/90',
    'from-rose-50/90 via-red-50/90 to-pink-50/90 hover:from-rose-100/90 hover:via-red-100/90 hover:to-pink-100/90',
    'from-slate-50/90 via-gray-50/90 to-zinc-50/90 hover:from-slate-100/90 hover:via-gray-100/90 hover:to-zinc-100/90',
    'from-cyan-50/90 via-sky-50/90 to-blue-50/90 hover:from-cyan-100/90 hover:via-sky-100/90 hover:to-blue-100/90',
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm uppercase tracking-wider font-medium text-slate-700 mb-3 flex items-center">
        <span className="inline-block w-6 h-[1px] bg-slate-400 mr-2"></span>
        Explorar categorías
        <span className="inline-block w-6 h-[1px] bg-slate-400 ml-2"></span>
      </h3>
      
      <div className="advanced-category-grid">
        {subcategories.map((category, index) => (
          <div 
            key={category.id} 
            onClick={() => handleCategoryClick(category)}
            className={`advanced-category-card bg-gradient-to-br ${gradientColors[index % gradientColors.length]}`}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="category-icon-container">
              <CategoryIconSelector categoryName={category.name} size={26} />
            </div>
            <div className="category-info">
              <h4 className="category-name">{category.name}</h4>
              <p className="category-count">Ver colección</p>
            </div>
            <div className="category-hover-overlay"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdvancedCategoryGrid;
