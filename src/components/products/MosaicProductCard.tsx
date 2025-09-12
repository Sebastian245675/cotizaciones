import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Eye, Star, Heart, ShoppingBag, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProductViewsData } from '@/lib/product-analytics';
import type { ProductAnalytics } from '@/lib/product-analytics';

interface MosaicProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
}

export const MosaicProductCard: React.FC<MosaicProductCardProps> = ({ product, onClick }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isHeartActive, setIsHeartActive] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [productViews, setProductViews] = useState<number>(0);
  
  // Cargar datos de visitas del producto
  useEffect(() => {
    const loadProductViews = async () => {
      if (product.id) {
        const analytics = await getProductViewsData(product.id);
        if (analytics) {
          setProductViews(analytics.totalViews || 0);
        }
      }
    };
    
    loadProductViews();
  }, [product.id]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    toast({
      title: "¡Producto agregado!",
      description: `${product.name} se agregó a tu carrito`,
    });
  };
  
  const handleViewDetails = () => {
    navigate(`/producto/${product.id}`);
  };
  
  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHeartActive(!isHeartActive);
    toast({
      title: isHeartActive ? "Eliminado de favoritos" : "Agregado a favoritos",
      description: `${product.name} ha sido ${isHeartActive ? 'eliminado de' : 'agregado a'} tu lista de favoritos`,
    });
  };
  
  // Calculate discount percentage
  const discountPercentage = useMemo(() => {
    if (product.originalPrice && product.price && product.originalPrice > product.price) {
      return Math.round((1 - (product.price / product.originalPrice)) * 100);
    }
    return product.discount || 0;
  }, [product]);

  // Determine if product is new
  const isNew = useMemo(() => {
    // Use the product ID to randomly determine if it's new for demo purposes
    return product.id?.charCodeAt(0) % 3 === 0;
  }, [product.id]);

  return (
    <div 
      className="h-full w-full flex flex-col justify-between transition-all duration-300 overflow-hidden group border-0"
      onClick={handleViewDetails}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container - Increased height */}
      <div className="relative bg-transparent overflow-hidden h-[260px]">
        {/* Gradient overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
        
        {/* Badges - New / Discount */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
          {isNew && (
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-0.5">NUEVO</Badge>
          )}
          {discountPercentage > 0 && (
            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-0.5">-{discountPercentage}%</Badge>
          )}
        </div>

        {/* Action buttons overlay */}
        <div className="absolute right-2 top-2 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
          <button 
            onClick={handleFavoriteToggle}
            className={`p-2 rounded-full ${isHeartActive ? 'bg-red-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'} shadow-md transition-colors`}
          >
            <Heart className="h-4 w-4" fill={isHeartActive ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={handleViewDetails}
            className="p-2 rounded-full bg-white text-slate-700 hover:bg-slate-100 shadow-md transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
        
        {/* Loading state */}
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        )}

        {/* Product image - Enhanced sizing and hover effect */}
        <img
          src={product.image}
          alt={product.name}
          className={`object-contain w-full h-full p-1 transition-transform duration-500 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ maxHeight: '250px' }} /* Fixed maximum height */
          onLoad={() => setImageLoading(false)}
          onError={() => setImageLoading(false)}
        />
      </div>

      {/* Product info - Compact design to give more space to image */}
      <div className="bg-white p-3 flex flex-col gap-1 flex-shrink-0 flex-grow justify-between">
        {/* Top section with category and name - More compact */}
        <div className="flex-grow">
          {/* Category */}
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium truncate">
            {product.categoryName || ""}
          </div>
          
          {/* Product name - More compact */}
          <h3 className="font-semibold text-slate-800 line-clamp-2 leading-tight text-sm h-[2.3rem] my-0.5">
            {product.name}
          </h3>
        </div>
        
        {/* Middle section with price - More compact */}
        <div className="my-0.5">
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-900">
              ${product.price?.toLocaleString('es-AR')}
            </span>
            
            {discountPercentage > 0 && product.originalPrice && (
              <span className="text-xs text-slate-500 line-through">
                ${product.originalPrice.toLocaleString('es-AR')}
              </span>
            )}
          </div>
          
          {/* Stock y Visitas - Single line to save space */}
          <div className="flex justify-between items-center text-xs text-slate-600 mt-0.5">
            <div className="flex items-center gap-0.5">
              <ShoppingBag className="h-3 w-3" />
              <span>{product.stock}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              <span>{productViews}</span>
            </div>
          </div>
        </div>
        
        {/* Bottom section with button - More compact */}
        <div className="mt-1">
          <button
            onClick={handleAddToCart}
            className="w-full py-1.5 px-3 bg-[#2A2A2D] hover:bg-gray-800 text-white text-sm flex items-center justify-center gap-1.5 font-medium transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
};
