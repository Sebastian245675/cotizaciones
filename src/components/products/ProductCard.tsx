import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Eye, Star, Heart, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Importamos estilos para fuentes
const fontStyles = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap');
`;

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isHeartActive, setIsHeartActive] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita navegación al hacer clic en "Agregar al carrito"
    addToCart(product);
    setAddedToCart(true);
    toast({
      title: "¡Producto agregado!",
      description: `${product.name} se agregó a tu carrito`,
    });
  };
  
  const handleViewDetails = () => {
    // Navegar a la página del producto
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
  
  // Calcular descuento
  const discountPercentage = useMemo(() => {
    if (product.originalPrice && product.price && product.originalPrice > product.price) {
      return Math.round((1 - (product.price / product.originalPrice)) * 100);
    }
    return product.discount || 0;
  }, [product]);

  // Determinar si el producto es nuevo (podríamos usar una lógica real basada en fechas)
  const isNew = useMemo(() => {
    // Para efectos de demostración, mostraremos "NUEVO" en algunos productos aleatoriamente
    return product.id?.charCodeAt(0) % 3 === 0;
  }, [product.id]);

  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 relative rounded-3xl shadow-xl hover:shadow-2xl border-none bg-gradient-to-br from-slate-50 via-white to-blue-50 h-full flex flex-col cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02]"
      style={{ width: '100%', maxWidth: '100%' }}
      onClick={handleViewDetails}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden">
        {/* Overlay con gradiente para mejor contraste */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
        
        <div className="bg-gradient-to-br from-blue-100 via-white to-slate-100 p-4 flex items-center justify-center h-[480px] relative overflow-hidden rounded-2xl border border-blue-100">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                </div>
              )}
              <img
                src={product.image}
                alt={product.name}
                className={`object-contain transition-all duration-500 group-hover:scale-105 drop-shadow-xl rounded-2xl mx-auto ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                style={{
                  objectPosition: "center",
                  width: "auto",
                  height: "auto",
                  maxWidth: "100%",
                  maxHeight: "400px",
                  display: "block"
                }}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
          {/* Efecto de brillo al pasar el mouse */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white via-blue-100/80 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"></div>
        </div>
        
        {/* Categoría badge */}
        <Badge 
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-1.5 rounded-lg border-none shadow-md z-20 text-xs"
          style={{fontFamily: "'Poppins', sans-serif", letterSpacing: "0.5px"}}
        >
          {product.categoryName || product.category}
        </Badge>
        
        {/* Subcategoría badge si existe */}
        {product.subcategoryName && (
          <Badge 
            className="absolute top-12 right-4 bg-blue-100/90 backdrop-blur-sm text-blue-700 px-3 py-1.5 rounded-lg border-none shadow-md z-20 text-xs"
            style={{fontFamily: "'Poppins', sans-serif", letterSpacing: "0.5px"}}
          >
            {product.subcategoryName}
          </Badge>
        )}
        
        {/* Badge "Nuevo" */}
        {isNew && (
          <Badge 
            className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-md z-20 text-xs"
            style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 700}}
          >
            NUEVO
          </Badge>
        )}
        
        {/* Badge de stock bajo */}
        {!isNew && product.stock > 0 && product.stock < 5 && (
          <Badge 
            variant="destructive"
            className="absolute top-4 left-4 px-3 py-1.5 rounded-lg shadow-md z-20 text-xs"
            style={{fontFamily: "'Poppins', sans-serif"}}
          >
            ¡Últimas {product.stock} unidades!
          </Badge>
        )}
        
        {/* Badge de AGOTADO */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-30">
            <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-lg transform -rotate-6 shadow-xl">
              <span className="text-red-600 font-extrabold text-2xl" style={{fontFamily: "'Montserrat', sans-serif"}}>
                AGOTADO
              </span>
            </div>
          </div>
        )}
        
        {/* Badge de oferta - mejorado con colores azules */}
        {(product.category?.toLowerCase() === 'oferta' || 
          product.category?.toLowerCase() === 'ofertas' || 
          product.isOffer) && (
          <div className="absolute -top-2 -right-2 w-32 h-32 overflow-hidden z-20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-600 to-slate-800 rotate-45 transform origin-bottom-left shadow-lg">
              <span className="absolute bottom-0 left-1 text-sm font-extrabold text-white transform -rotate-45 pb-0.5" 
                style={{fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.5px"}}>
                OFERTA
              </span>
            </div>
          </div>
        )}
        
        {/* Indicador de descuento */}
        {discountPercentage > 0 && (
          <div className="absolute top-16 left-0 bg-gradient-to-r from-blue-700 to-slate-900 text-white text-sm font-bold px-4 py-1.5 rounded-r-full shadow-lg z-20 flex items-center"
            style={{fontFamily: "'Montserrat', sans-serif"}}>
            <span className="animate-pulse mr-1.5">⚡</span> {discountPercentage}% OFF
          </div>
        )}
        
        {/* Botones flotantes al hacer hover */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-30 opacity-0 group-hover:opacity-100 transform translate-x-10 group-hover:translate-x-0 transition-all duration-300">
          <Button
            variant="secondary"
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
          >
            <Eye className="h-5 w-5" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className="bg-white hover:bg-slate-50 text-slate-800 rounded-full w-10 h-10 shadow-lg"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className={`${
              isHeartActive 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "bg-white hover:bg-slate-50 text-slate-800"
            } rounded-full w-10 h-10 shadow-lg transition-colors`}
            onClick={handleFavoriteToggle}
          >
            <Heart className={`h-5 w-5 ${isHeartActive ? "fill-white" : ""}`} />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-6 pt-5 flex-grow">
        {/* Rating simulado */}
        <div className="flex mb-2">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`h-4 w-4 ${i < 4 ? 'text-blue-400 fill-blue-400' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-xs text-slate-500 ml-1.5">(4.0)</span>
        </div>
        
        <h3
          className="font-bold text-xl mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors tracking-tight min-h-[3.5rem]"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {product.name}
        </h3>
        
        <p className="text-slate-500 text-sm mb-4 line-clamp-2" 
          style={{fontFamily: "'Poppins', sans-serif", lineHeight: "1.5"}}>
          {product.description || "Producto de alta calidad. Consulta las especificaciones para más detalles."}
        </p>
        
        {/* Envío gratis badge */}
        {product.price > 100 && (
          <div className="mb-3 flex">
            <span className="bg-green-50 text-green-700 text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-green-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect width="16" height="10" x="4" y="5" rx="2" />
                <path d="M10 2h4" />
                <path d="M12 15v4" />
                <path d="m9 18 3 3 3-3" />
              </svg>
              Envío +$70.000
            </span>
          </div>
        )}
        
        {/* Sección de precio y stock - rediseñada */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${product.discount || product.isOffer ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-slate-700' : 'text-slate-800'}`}
                style={{ fontFamily: "'Montserrat', sans-serif" }} 
              >
                {product.price.toLocaleString('es-AR', { minimumFractionDigits: 0 })} <span className="text-base font-semibold text-blue-700">ARS</span>
              </span>
              {(product.discount || product.isOffer) && product.originalPrice && (
                <span className="text-sm text-gray-500 line-through">
                  {product.originalPrice.toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
                </span>
              )}
            </div>
            
            {/* Distintivo de disponibilidad */}
            {product.stock > 0 ? (
              <span className="text-xs text-emerald-700 font-medium flex items-center" style={{fontFamily: "'Poppins', sans-serif"}}>
                <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                Disponible
              </span>
            ) : (
              <span className="text-xs text-red-700 font-medium flex items-center" style={{fontFamily: "'Poppins', sans-serif"}}>
                <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                Agotado
              </span>
            )}
          </div>
          
          {/* Indicador de stock más moderno */}
          <div className="bg-slate-100 rounded-lg py-1 px-3 shadow-inner">
            <span className="text-xs font-medium text-slate-700" style={{fontFamily: "'Poppins', sans-serif"}}>
              Stock: {product.stock}
            </span>
          </div>
        </div>
      </CardContent>
      
      {/* Footer rediseñado */}
      <CardFooter className="px-3 sm:px-6 py-3 sm:py-4 pt-2 border-t border-blue-100 bg-gradient-to-b from-transparent to-blue-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          variant="outline"
          className="w-full sm:flex-1 flex items-center justify-center gap-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors rounded-lg text-base sm:text-sm py-3 sm:py-2"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
          style={{fontFamily: "'Poppins', sans-serif"}}
        >
          <Eye className="h-4 w-4" />
          Ver detalles
        </Button>
        <Button
          className={`w-full sm:flex-1 py-3 sm:py-2 font-bold rounded-lg shadow-md transform hover:-translate-y-0.5 transition-all text-base sm:text-sm ${addedToCart ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-blue-600 to-slate-700 hover:opacity-90 text-white'}`}
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          style={{fontFamily: "'Poppins', sans-serif"}}
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          {product.stock === 0 ? 'Agotado' : 'Agregar'}
        </Button>
      </CardFooter>
    </Card>
  );
};
