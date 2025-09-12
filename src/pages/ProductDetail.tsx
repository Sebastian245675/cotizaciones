import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { AdvancedHeader } from '@/components/layout/AdvancedHeader';
import { TopPromoBar } from '@/components/layout/TopPromoBar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProductCard } from '@/components/products/ProductCard';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { recordProductView } from '@/lib/product-analytics';
import { useAuth } from '@/contexts/AuthContext';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Shield,
  Truck,
  Share2,
  ArrowLeft,
  MapPin,
  Mail,
  Loader2
} from 'lucide-react';

import { Product } from '@/contexts/CartContext';

// Utilidad para crear slugs SEO-friendly
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}


// Carrusel de productos similares con estilo Mercado Libre
type SimilarProductsCarouselProps = {
  products: Product[];
  onViewDetails: (prod: Product) => void;
};

const SimilarProductsCarousel = (props: SimilarProductsCarouselProps) => {
  const { products, onViewDetails } = props;
  const [start, setStart] = React.useState(0);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  
  // Ajuste responsivo para mostrar diferentes cantidades según el ancho
  const [maxVisible, setMaxVisible] = React.useState(5);
  
  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1536) {
        setMaxVisible(6);
      } else if (width >= 1280) {
        setMaxVisible(5);
      } else if (width >= 1024) {
        setMaxVisible(4);
      } else if (width >= 768) {
        setMaxVisible(3);
      } else {
        setMaxVisible(2);
      }
    };
    
    handleResize(); // Inicializar
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const canPrev = start > 0;
  const canNext = start + maxVisible < products.length;

  const handlePrev = () => {
    if (canPrev) setStart(Math.max(0, start - maxVisible));
  };
  
  const handleNext = () => {
    if (canNext) setStart(Math.min(products.length - maxVisible, start + maxVisible));
  };

  return (
    <div className="relative w-full py-2">
      {/* Navegación */}
      <div className="flex items-center">
        {/* Botón anterior */}
        <button
          onClick={handlePrev}
          disabled={!canPrev}
          className={`absolute left-0 z-10 rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 bg-white shadow-lg transition-all ${
            !canPrev ? 'opacity-0 cursor-default' : 'opacity-95 hover:opacity-100 hover:border-blue-300 hover:text-blue-500'
          }`}
          style={{ transform: 'translateX(-50%)' }}
          aria-label="Anterior"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        {/* Productos en el carrusel */}
        <div className="flex gap-4 overflow-hidden w-full mx-4">
          {products.slice(start, start + maxVisible).map((prod, index) => (
            <div 
              key={prod.id} 
              className="w-full flex-shrink-0 transition-all"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div 
                onClick={() => onViewDetails(prod)}
                className={`bg-white rounded-lg overflow-hidden border ${
                  hoveredIndex === index 
                    ? 'border-blue-300 shadow-md' 
                    : 'border-gray-200'
                } cursor-pointer transition-all h-full flex flex-col`}
              >
                {/* Imagen del producto */}
                <div className="pt-2 px-2 bg-white flex items-center justify-center h-48 relative">
                  <img 
                    src={prod.image} 
                    alt={prod.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300"
                    style={{
                      transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)'
                    }}
                  />
                  
                  {/* Badge de oferta */}
                  {prod.isOffer && prod.originalPrice && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {Math.round((1 - (prod.price / prod.originalPrice)) * 100)}% OFF
                    </span>
                  )}
                </div>
                
                {/* Información del producto */}
                <div className="p-4 flex-1 flex flex-col border-t border-gray-100">
                  {/* Nombre del producto con clamp para 2 líneas */}
                  <h3 className="text-sm text-gray-700 line-clamp-2 mb-2 h-10">{prod.name}</h3>
                  
                  {/* Precio y descuento */}
                  <div className="mt-auto">
                    <p className="text-lg font-semibold text-gray-900">${prod.price.toLocaleString()}</p>
                    {prod.isOffer && prod.originalPrice && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs line-through text-gray-500">${prod.originalPrice.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {/* Envío (simulado) */}
                    {prod.price > 100 && (
                      <p className="text-xs font-medium text-green-600 mt-1">Envío en compras +$70.000</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Botón siguiente */}
        <button
          onClick={handleNext}
          disabled={!canNext}
          className={`absolute right-0 z-10 rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 bg-white shadow-lg transition-all ${
            !canNext ? 'opacity-0 cursor-default' : 'opacity-95 hover:opacity-100 hover:border-blue-300 hover:text-blue-500'
          }`}
          style={{ transform: 'translateX(50%)' }}
          aria-label="Siguiente"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
      
      {/* Botón "Ver todos" */}
      {products.length > maxVisible && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => window.location.href = '/?category=' + encodeURIComponent(products[0].category || '')}
            className="px-5 py-2 rounded-lg bg-white border border-blue-500 text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm"
          >
            Ver todos los productos similares
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};


// Permite URLs tipo /producto/:productId-:slug
const ProductDetailPage = () => {
  const { productId: param } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'descripcion' | 'especificaciones'>('descripcion');
  const [selectedColor, setSelectedColor] = useState<{name: string, hexCode: string, image: string} | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [mostViewedProducts, setMostViewedProducts] = useState<Product[]>([]);
  const [loadingMostViewed, setLoadingMostViewed] = useState(true);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);

  // Extraer productId y slug de la URL
  let productId = param;
  let urlSlug = '';
  if (param && param.includes('-')) {
    const lastDash = param.lastIndexOf('-');
    productId = param.substring(0, lastDash);
    urlSlug = param.substring(lastDash + 1);
  }

  // Agregar URL canónica para SEO y redirigir si el slug no coincide
  useEffect(() => {
    if (!product) return;
    const canonicalSlug = slugify(product.name);
    const canonicalUrl = `${window.location.origin}/producto/${product.id}-${canonicalSlug}`;

    // Redirigir si el slug de la URL no coincide
    if (urlSlug && urlSlug !== canonicalSlug) {
      navigate(`/producto/${product.id}-${canonicalSlug}`, { replace: true });
      return;
    }

    // Eliminar cualquier enlace canónico existente
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      existingCanonical.remove();
    }
    // Crear y agregar el nuevo enlace canónico
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = canonicalUrl;
    document.head.appendChild(link);
    // Limpiar al desmontar
    return () => {
      const canonicalToRemove = document.querySelector('link[rel="canonical"]');
      if (canonicalToRemove) {
        canonicalToRemove.remove();
      }
    };
  }, [product, urlSlug, navigate]);

  // Actualizar título de página para SEO cuando carga el producto
  useEffect(() => {
    if (product) {
      document.title = `${product.name} | REGALA ALGO`;
      // Agregar metadatos para SEO
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', product.description || 'Detalles del producto en REGALA ALGO');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = product.description || 'Detalles del producto en REGALA ALGO';
        document.head.appendChild(meta);
      }
    } else {
      document.title = 'Producto | REGALA ALGO';
    }
  }, [product]);

  // Cargar datos del producto
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      setLoading(true);
      setImageLoading(true);
      try {
        const productDoc = await getDoc(doc(db, "products", productId));
        if (productDoc.exists()) {
          const productData = { id: productDoc.id, ...productDoc.data() } as Product;
          setProduct(productData);
          // Set the main image as active
          setActiveImageUrl(productData.image);
          setActiveImageIndex(0);
          
          // If product has colors, set the first color as default
          if (productData.colors && productData.colors.length > 0) {
            setSelectedColor(productData.colors[0]);
          }
          // Registrar vista con información detallada del usuario (si está autenticado)
          if (!viewRecorded) {
            await recordProductView(
              productData.id, 
              productData.name, 
              user?.id,
              user?.email,
              user?.name
            );
            setViewRecorded(true);
          }
          // Cargar productos similares por categoría (como en la primera vista)
          try {
            let similarItems: Product[] = [];
            if (productData.category) {
              const categoryNorm = productData.category.trim().toLowerCase();
              const allQuery = query(
                collection(db, "products"),
                where("category", "==", productData.category),
                where("id", "!=", productId),
                limit(30)
              );
              const allDocs = await getDocs(allQuery);
              similarItems = allDocs.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((prod: any) =>
                  prod.category &&
                  typeof prod.category === 'string' &&
                  prod.category.trim().toLowerCase() === categoryNorm
                ) as Product[];
              similarItems = similarItems.slice(0, 8);
            }
            setSimilarProducts(similarItems);
          } catch (error) {
            console.error("Error al cargar productos similares:", error);
            // Intentar cargar al menos algunos productos aleatorios en caso de error
            try {
              const fallbackQuery = query(
                collection(db, "products"),
                limit(4)
              );
              const fallbackDocs = await getDocs(fallbackQuery);
              const fallbackItems = fallbackDocs.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as Product[];
              setSimilarProducts(fallbackItems);
            } catch (fallbackError) {
              console.error("Error en la carga de respaldo:", fallbackError);
            }
          }
        } else {
          // Producto no encontrado
          toast({
            title: "Producto no encontrado",
            description: "El producto que buscas no existe o ha sido eliminado",
            variant: "destructive"
          });
          navigate('/');
        }
      } catch (error) {
        console.error("Error al cargar el producto:", error);
        setError("No se pudo cargar el producto. Por favor, inténtalo de nuevo más tarde.");
        toast({
          title: "Error",
          description: "No se pudo cargar el producto",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, user?.id]);

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, "categories"));
      const cats = ["Todos", ...querySnapshot.docs.map(doc => doc.data().name)];
      setCategories(cats);
    };
    fetchCategories();
  }, []);

  // Cargar productos más vistos
  useEffect(() => {
    const fetchMostViewedProducts = async () => {
      setLoadingMostViewed(true);
      try {
        const { getMostViewedProducts } = await import('@/lib/product-analytics');
        const productAnalytics = await getMostViewedProducts(8); // Obtener los 8 productos más vistos
        
        // Para cada producto en analytics, obtener los datos completos del producto
        const productsPromises = productAnalytics.map(async (item) => {
          try {
            const productDoc = await getDoc(doc(db, "products", item.id));
            if (productDoc.exists()) {
              return { id: productDoc.id, ...productDoc.data() } as Product;
            }
            return null;
          } catch (err) {
            console.error(`Error al obtener producto ${item.id}:`, err);
            return null;
          }
        });
        
        const products = (await Promise.all(productsPromises)).filter(p => p !== null) as Product[];
        
        // Filtrar para no incluir el producto actual
        const filteredProducts = products.filter(p => p.id !== productId);
        
        setMostViewedProducts(filteredProducts.slice(0, 6)); // Limitamos a 6 productos máximo
      } catch (error) {
        console.error("Error al cargar productos más vistos:", error);
      } finally {
        setLoadingMostViewed(false);
      }
    };
    
    fetchMostViewedProducts();
  }, [productId]);

  // Manejadores
  const handleAddToCart = () => {
    if (product) {
      // Pass the selected color if available
      addToCart(product, quantity, selectedColor);
      
      const colorInfo = selectedColor ? ` (color: ${selectedColor.name})` : '';
      toast({
        title: "¡Producto agregado!",
        description: `${quantity}x ${product.name}${colorInfo} agregado a tu carrito`,
      });
    }
  };

  // Navegación avanzada con slug
  const goToProduct = (prod: Product) => {
    navigate(`/producto/${prod.id}-${slugify(prod.name)}`);
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || 'Producto REGALA ALGO',
        text: product?.description || 'Mira este producto',
        url: window.location.href
      })
      .catch(error => console.log('Error al compartir', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Enlace copiado",
        description: "El enlace al producto ha sido copiado al portapapeles",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* TopPromoBar eliminada de esta vista */}
        <AdvancedHeader 
          selectedCategory="" 
          setSelectedCategory={(cat) => navigate('/?category=' + encodeURIComponent(cat))}
          categories={categories}
          setCategories={setCategories}
        />
        <div className="container mx-auto px-4 pt-32 pb-16 md:pt-40 md:pb-24 flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-xl font-semibold mb-2 text-gray-700">Cargando producto</h2>
            <p className="text-gray-500">Estamos obteniendo toda la información para ti...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* TopPromoBar eliminada de esta vista */}
        <AdvancedHeader 
          selectedCategory="" 
          setSelectedCategory={(cat) => navigate('/?category=' + encodeURIComponent(cat))}
          categories={categories}
          setCategories={setCategories}
        />
        <div className="container mx-auto px-4 pt-32 pb-16 md:pt-40 md:pb-24 flex items-center justify-center min-h-[70vh]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Error al cargar el producto</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* TopPromoBar eliminada de esta vista */}
        <AdvancedHeader 
          selectedCategory="" 
          setSelectedCategory={(cat) => navigate('/?category=' + encodeURIComponent(cat))}
          categories={categories}
          setCategories={setCategories}
        />
        <div className="container mx-auto px-4 py-28 md:py-32 text-center min-h-[70vh] flex flex-col items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">Producto no encontrado</h1>
            <p className="mb-6 text-gray-600">El producto que estás buscando no existe o ha sido eliminado.</p>
            <Button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la tienda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* TopPromoBar eliminada de esta vista */}
      <AdvancedHeader 
        selectedCategory={product?.category || ""} 
        setSelectedCategory={(cat) => {
          navigate('/?category=' + encodeURIComponent(cat));
        }} 
        categories={categories}
        setCategories={setCategories}
      />
      
      <main className="w-full px-0 sm:px-4 pt-24 pb-16 md:pt-32 md:pb-24">
        {/* Navegación con breadcrumbs - Diseño avanzado */}
        <div className="flex flex-wrap items-center mb-8 md:mb-12 text-xs sm:text-sm text-slate-600 bg-slate-50 dark:bg-slate-800/30 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-50"></div>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-0 h-auto font-medium hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => navigate('/')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 inline-block" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Inicio
          </Button>
          <span className="relative mx-2 sm:mx-3 text-slate-400">/</span>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-0 h-auto font-medium hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 max-w-[120px] sm:max-w-none truncate"
            onClick={() => navigate('/?category=' + encodeURIComponent(product.category))}
          >
            {product.category}
          </Button>
          <span className="relative mx-2 sm:mx-3 text-slate-400">/</span>
          <span className="relative text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[150px] sm:max-w-[300px]">{product.name}</span>
        </div>
        
        {/* Detalles del producto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mb-16">
          {/* Columna izquierda: galería y productos similares en desktop */}
          <div className="space-y-4 flex flex-col">
            {/* Imagen principal con zoom efecto */}
            <div className="relative rounded-xl overflow-hidden shadow-xl bg-white p-4 border border-gray-100 group flex flex-row gap-6">
              {/* Miniaturas en columna */}
              <div className="flex flex-col gap-3 justify-start items-center py-2">
                {[
                  product.image,
                  ...(product.additionalImages || []).filter(img => img)
                ].map((img, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setActiveImageUrl(img);
                      setActiveImageIndex(i);
                      setImageLoading(true);
                    }}
                    className={`flex-shrink-0 rounded-xl overflow-hidden bg-white ${
                      activeImageIndex === i 
                        ? 'border-4 border-blue-500 ring-2 ring-blue-200 dark:border-blue-600 dark:ring-blue-900' 
                        : 'border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                    style={{ width: '70px', height: '150px', padding: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <div className="w-full h-full flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      </div>
                      <img 
                        src={img} 
                        alt={`${product.name} vista ${i+1}`} 
                        className="w-full h-full object-cover" 
                        style={{ maxWidth: '60px', maxHeight: '140px', margin: '0 auto' }}
                        onLoad={(e) => {
                          // Hide the loader when image loads
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            const loader = parent.querySelector('div');
                            if (loader) loader.style.display = 'none';
                          }
                        }}
                        onError={(e) => {
                          // Hide the loader when image fails to load
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            const loader = parent.querySelector('div');
                            if (loader) loader.style.display = 'none';
                          }
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              {/* Imagen principal */}
              <div className="overflow-hidden rounded-lg bg-white flex items-center justify-center flex-1 relative">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/40">
                    <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                  </div>
                )}
                <img 
                  src={activeImageUrl || product.image}
                  alt={product.name}
                  className={`object-cover transition-transform duration-500 group-hover:scale-105 ${imageLoading ? 'opacity-30' : 'opacity-100'}`}
                  style={{
                    height: "540px",
                    width: "460px",
                    maxWidth: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    padding: "10px",
                    borderRadius: "16px"
                  }}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </div>
              {/* Navegación de imágenes (mantener si lo deseas) */}
              <Badge 
                className="absolute top-6 right-6 bg-white/90 text-foreground border-0 shadow-md px-3 py-1.5 text-sm"
              >
                {product.category}
              </Badge>
              {product.stock < 5 && (
                <Badge 
                  variant="destructive"
                  className="absolute top-6 left-6 shadow-md px-3 py-1.5 text-sm"
                >
                  ¡Últimas {product.stock} unidades!
                </Badge>
              )}
              {product.isOffer && (
                <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rotate-45 transform origin-bottom-left shadow-lg">
                    <span className="absolute bottom-0 left-6 text-sm font-extrabold text-white transform -rotate-45">
                      OFERTA
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Productos similares solo en desktop (lg+) - Diseño avanzado */}
            <div className="hidden lg:block">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mt-8 border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
                
                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium text-xs tracking-wider uppercase block mb-1">RECOMENDACIONES PERSONALIZADAS</span>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center">
                      <span>Productos similares</span>
                      <span className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs py-1 px-2 rounded-full">{similarProducts?.length || 0}</span>
                    </h2>
                  </div>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm flex items-center transition-colors">
                    <span>Ver todos</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {similarProducts && similarProducts.length > 0 ? (
                  <div className="grid grid-cols-4 gap-5">
                    {similarProducts.slice(0, 4).map((similar) => (
                      <div
                        key={similar.id}
                        onClick={() => goToProduct(similar)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col cursor-pointer hover:shadow-lg dark:hover:shadow-slate-700/30 transition-all duration-300 transform hover:-translate-y-1 group relative overflow-hidden"
                      >
                        {/* Imagen con efecto hover avanzado */}
                        <div className="relative w-full aspect-square overflow-hidden bg-white dark:bg-slate-800 rounded-t-xl">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                          <img
                            src={similar.image}
                            alt={similar.name}
                            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute top-3 left-3 z-20">
                            <div className="flex space-x-1">
                              {similar.isOffer && (
                                <span className="inline-flex items-center bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-md">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
                                  </svg>
                                  Oferta
                                </span>
                              )}
                              {similar.stock < 5 && (
                                <span className="inline-flex items-center bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-md">
                                  Últimas unidades
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick action button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add to cart logic here
                            }}
                            className="absolute right-3 bottom-3 z-20 bg-blue-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Detalles del producto con diseño avanzado */}
                        <div className="p-4 flex flex-col">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mb-1 leading-tight">
                              {similar.name}
                            </h3>
                            <div className="flex items-center mb-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg 
                                    key={i} 
                                    className={`w-3 h-3 ${i < 4 ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`} 
                                    fill="currentColor" 
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                                <span className="text-xs text-slate-500 ml-1">(4.0)</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Precios */}
                          <div className="flex items-end justify-between mt-auto">
                            <div>
                              <div className="text-lg font-bold text-slate-900 dark:text-white">
                                ${similar.price.toLocaleString()}
                              </div>
                              {similar.originalPrice && similar.isOffer && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-slate-500 line-through">${similar.originalPrice.toLocaleString()}</span>
                                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full px-1.5 py-0.5">
                                    {Math.round((1 - (similar.price / similar.originalPrice)) * 100)}% OFF
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs font-medium text-green-600 dark:text-green-400">
                              En stock
                            </div>
                          </div>
                        </div>
                        
                        {/* Decorative elements */}
                        <div className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-70"></div>
                      </div>
                    ))}
                  </div>
                  ) : (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="mx-auto mb-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-14 h-14 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.5" y2="6.5"></line>
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold mb-2 text-slate-800 dark:text-slate-200">No hay productos similares</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Pronto agregaremos más productos en <b>{product.category}</b></p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      onClick={() => navigate('/')}
                    >
                      Explorar catálogo
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 border-blue-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 w-full flex items-center justify-center gap-1 py-2"
                  onClick={() => navigate('/?category=' + encodeURIComponent(product.category || ''))}
                >
                  <span>Ver todos los productos</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Info del producto */}
          <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            {/* Encabezado con marca y código - Diseño avanzado */}
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-4 py-2 rounded-md font-medium shadow-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                REGALA ALGO
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Código: {product.id?.substring(0, 8) || 'FS-' + Math.floor(Math.random() * 10000)}
                </span>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -left-1 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-indigo-500"></div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight pl-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">{product.name}</h1>
              
              {/* Rating con diseño mejorado */}
              <div className="flex flex-wrap items-center gap-3 mt-4 pl-4">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg flex items-center">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${i < 4 ? 'fill-blue-500 text-blue-500' : 'text-slate-300 dark:text-slate-600'}`}
                      />
                    ))}
                  </div>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-3"></div>
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">128 reseñas</span>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Producto verificado
                </div>
              </div>
            </div>
            
            {/* Precio con badge de descuento - Diseño avanzado */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden mt-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 dark:bg-blue-900/20 rounded-full filter blur-3xl opacity-20 -mr-20 -mt-20"></div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Precio</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white relative">
                      <span className="absolute -top-3 -left-2 text-base text-blue-600 dark:text-blue-400">$</span>
                      {product.price.toLocaleString()}
                    </span>
                    {(product.discount || product.isOffer) && product.originalPrice && (
                      <>
                        <span className="text-base sm:text-lg text-slate-500 dark:text-slate-400 line-through">
                          ${product.originalPrice.toLocaleString()}
                        </span>
                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-md inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                          {Math.round((1 - (product.price / (product.originalPrice || product.price + 1000))) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Estado</span>
                    <span className="font-medium text-green-600 dark:text-green-400">En stock</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Precio incluye impuestos • Envío calculado al finalizar la compra
                </p>
                
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                  Envío en compras mayores a $70.000
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Descripción con tabs - Diseño avanzado */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="flex text-sm border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <button 
                  onClick={() => setActiveTab('descripcion')}
                  className={`px-6 py-4 font-medium flex-1 sm:flex-none transition-all relative ${
                    activeTab === 'descripcion' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {activeTab === 'descripcion' && (
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 dark:bg-blue-600"></div>
                  )}
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descripción
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('especificaciones')}
                  className={`px-6 py-4 font-medium flex-1 sm:flex-none transition-all relative ${
                    activeTab === 'especificaciones' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {activeTab === 'especificaciones' && (
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 dark:bg-blue-600"></div>
                  )}
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Especificaciones
                  </div>
                </button>
              </div>
              
              {/* Tab content - Advanced */}
              <div className="p-6 bg-white dark:bg-slate-800">
                {activeTab === 'descripcion' ? (
                  <div className="relative">
                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full opacity-70"></div>
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{product.description}</p>
                    </div>
                    
                    <div className="mt-5 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Todos nuestros productos cuentan con <span className="font-semibold">garantía de calidad</span> para asegurar tu completa satisfacción.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                      <h4 className="font-medium text-base text-slate-900 dark:text-slate-100">Especificaciones del producto</h4>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {product.specifications && product.specifications.length > 0 ? (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                          {product.specifications.map((spec, index) => (
                            <div key={index} className="grid grid-cols-1 sm:grid-cols-2 p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{spec.name}</span>
                              <span className="text-sm text-slate-600 dark:text-slate-400">{spec.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5">
                          <ul className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
                            <li className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Material de alta calidad
                            </li>
                            <li className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Ideal para uso diario
                            </li>
                            <li className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Perfecto para regalo
                            </li>
                            <li className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Fabricado con estándares internacionales
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Beneficios y garantías */}
            <div className="bg-slate-50 rounded-lg p-5">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Beneficios y Garantías</span>
              </h4>
              <div className="grid sm:grid-cols-2 gap-4">
                {product.benefits && product.benefits.length > 0 ? (
                  // Mostrar beneficios guardados en el producto
                  product.benefits.map((benefit, index) => (
                    <div key={`benefit-${index}`} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium block text-sm">{benefit}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  // Beneficios predeterminados si no hay guardados
                  <>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium block text-sm">Garantía de calidad</span>
                        <span className="text-xs text-gray-500">Satisfacción garantizada</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium block text-sm font-bold">Envío</span>
                        <span className="text-xs text-gray-500">En compras mayores a $70.000</span>
                      </div>
                    </div>
                  </>
                )}

                {product.warranties && product.warranties.length > 0 ? (
                  // Mostrar garantías guardadas en el producto
                  product.warranties.map((warranty, index) => (
                    <div key={`warranty-${index}`} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium block text-sm">{warranty}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <Star className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <span className="font-medium block text-sm">Producto premium</span>
                        <span className="text-xs text-gray-500">Calidad garantizada</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium block text-sm">Retiro en tienda</span>
                        <span className="text-xs text-gray-500">En nuestras sucursales</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Estado de disponibilidad */}
            <div className="flex items-center bg-gray-50 p-3 rounded-lg">
              {product.stock > 10 ? (
                <>
                  <div className="h-3 w-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <p className="text-sm font-medium text-gray-700">En stock - Disponibilidad inmediata</p>
                </>
              ) : product.stock > 0 ? (
                <>
                  <div className="h-3 w-3 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
                  <p className="text-sm font-medium text-gray-700 font-bold">¡Últimas unidades disponibles!</p>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                  <p className="text-sm font-medium text-gray-700 font-bold">Agotado - Disponible bajo pedido</p>
                </>
              )}
            </div>
            
            {/* Cantidad y Botones */}
            <div className="space-y-5">
              {/* Selector de color si el producto tiene colores */}
              {product.colors && product.colors.length > 0 && (
                <div className="bg-white rounded-lg border p-4">
                  <label className="text-sm font-medium mb-3 block">
                    Color: <span className="text-orange-600 font-semibold">{selectedColor?.name || 'Selecciona un color'}</span>
                  </label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {product.colors.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedColor(color);
                          // Si hay una imagen para este color, mostrarla como imagen principal
                          if (color.image) {
                            setActiveImageUrl(color.image);
                            // Establecer el índice correcto si la imagen coincide con alguna adicional
                            if (color.image === product.image) {
                              setActiveImageIndex(0);
                            } else if (product.additionalImages) {
                              const imgIndex = product.additionalImages.findIndex(img => img === color.image);
                              if (imgIndex !== -1) {
                                setActiveImageIndex(imgIndex + 1); // +1 porque la imagen principal es índice 0
                              }
                            }
                          }
                        }}
                        className={`relative p-1 rounded-full flex items-center justify-center transition-all ${
                          selectedColor?.name === color.name 
                            ? 'ring-2 ring-offset-2 ring-orange-500 transform scale-110' 
                            : 'hover:ring-1 hover:ring-orange-200 hover:ring-offset-1'
                        }`}
                        title={color.name}
                      >
                        {/* Color swatch */}
                        <span 
                          className="block w-8 h-8 rounded-full border"
                          style={{ backgroundColor: color.hexCode }}
                        ></span>
                        
                        {/* Check icon for selected color */}
                        {selectedColor?.name === color.name && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-white ${color.hexCode.toLowerCase() === '#ffffff' ? 'text-black' : ''}`}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Miniatura de la imagen del color seleccionado */}
                  {selectedColor?.image && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                        <img 
                          src={selectedColor.image} 
                          alt={`${product.name} - ${selectedColor.name}`} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        Vista previa del color <strong>{selectedColor.name}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Selector de cantidad - Diseño avanzado */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full filter blur-2xl opacity-20 -mr-10 -mt-10"></div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Cantidad</span>
                  </div>
                  
                  <div className={`flex items-center px-3 py-1 rounded-full ${
                    product.stock > 10 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                      : product.stock > 0 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    <span className={`h-2 w-2 rounded-full mr-2 ${
                      product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-xs font-medium">
                      {product.stock > 0 
                        ? `${product.stock} disponibles` 
                        : 'Agotado'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center">
                    <button
                      className={`h-12 w-12 flex items-center justify-center rounded-l-lg ${
                        quantity <= 1 || product.stock === 0 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      } border border-slate-300 dark:border-slate-600`}
                      onClick={decrementQuantity}
                      disabled={quantity <= 1 || product.stock === 0}
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    
                    <div className="h-12 border-t border-b border-slate-300 dark:border-slate-600 px-5 flex items-center justify-center min-w-[60px] bg-white dark:bg-slate-800">
                      <span className="font-semibold text-lg text-slate-800 dark:text-slate-200">{quantity}</span>
                    </div>
                    
                    <button
                      className={`h-12 w-12 flex items-center justify-center rounded-r-lg ${
                        quantity >= product.stock || product.stock === 0 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      } border border-slate-300 dark:border-slate-600`}
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock || product.stock === 0}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    
                    <div className="ml-4 flex-1">
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                          style={{ width: `${Math.min(100, (quantity / product.stock) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Mínimo: 1</span>
                        <span>Máximo: {product.stock}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subtotal:</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">${(product.price * quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Botones de acción - Diseño avanzado */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <Button
                  onClick={handleAddToCart}
                  className="sm:col-span-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 rounded-xl shadow-lg shadow-blue-100 dark:shadow-blue-900/20 relative overflow-hidden"
                  disabled={product.stock === 0}
                >
                  <span className="absolute inset-0 overflow-hidden">
                    <span className="absolute -inset-[10px] opacity-30 bg-gradient-to-r from-transparent via-white to-transparent skew-x-12 animate-shimmer"></span>
                  </span>
                  <div className="relative flex items-center justify-center">
                    {product.stock === 0 ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Producto Agotado</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-medium">Agregar al Carrito - ${(product.price * quantity).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="py-6 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm"
                  onClick={handleShare}
                >
                  <div className="flex items-center justify-center">
                    <Share2 className="h-5 w-5 sm:mr-0 md:mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="hidden md:inline font-medium">Compartir</span>
                  </div>
                </Button>
              </div>
              
              {/* Métodos de pago - Diseño avanzado */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Métodos de pago aceptados</h3>
                </div>
                
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/visa.svg" alt="Visa" className="w-10 h-6 object-contain" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/mastercard.svg" alt="Mastercard" className="w-10 h-6 object-contain" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/americanexpress.svg" alt="American Express" className="w-10 h-6 object-contain" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/paypal.svg" alt="PayPal" className="w-10 h-6 object-contain" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/mercadopago.svg" alt="Mercado Pago" className="w-10 h-6 object-contain" />
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Pagos 100% seguros</span>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Envío en compras +$70.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Espacio para separación visual */}
        <div className="my-6"></div>
        
        {/* Características destacadas */}
        <div className="my-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center mb-8">
              <span className="text-blue-600 dark:text-blue-400 font-medium text-xs tracking-wider uppercase mb-2">POR QUÉ ELEGIRNOS</span>
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">Características Destacadas</h2>
              <div className="w-20 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                    <path d="m9 12 2 2 4-4"></path>
                    <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"></path>
                    <path d="M22 19H2"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Alta Calidad</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Nuestros productos son seleccionados cuidadosamente para garantizar la mejor calidad.
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Garantía Extendida</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Todos nuestros productos cuentan con garantía extendida para tu tranquilidad.
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                    <path d="M7 10v12"></path>
                    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Satisfacción 100%</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Si no estás satisfecho con tu compra, te devolvemos el dinero sin preguntas.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Productos más vistos - Sección mejorada */}
        <div className="my-16 px-4">
          <div className="max-w-6xl mx-auto bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl relative">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
            
            <div className="p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg mr-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                      <path d="m12 5 2 2"></path>
                      <path d="m15 8-3 1"></path>
                    </svg>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium text-xs tracking-wider uppercase block mb-1">DESCUBRE</span>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center">
                      Los más populares
                      <span className="ml-3 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-1 px-2 rounded-full">¡Lo más vendido!</span>
                    </h2>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 hover:shadow-md transition-all"
                  onClick={() => navigate('/')}
                >
                  <span>Ver catálogo completo</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Button>
              </div>
              
              {loadingMostViewed ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 animate-pulse">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="bg-slate-100 dark:bg-slate-700/30 rounded-xl h-64"></div>
                  ))}
                </div>
              ) : mostViewedProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {mostViewedProducts.map((product) => (
                    <div 
                      key={product.id}
                      onClick={() => goToProduct(product)} 
                      className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col h-full"
                    >
                      {/* Ribbon si es oferta */}
                      {product.isOffer && (
                        <div className="absolute top-0 right-0 z-10">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs py-1 px-3 font-medium shadow-sm transform rotate-45 translate-x-2 -translate-y-1">
                            OFERTA
                          </div>
                        </div>
                      )}
                      
                      {/* Imagen con overlay y efecto hover */}
                      <div className="aspect-square w-full overflow-hidden bg-white dark:bg-slate-800 relative">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {/* Quick view button */}
                        <button 
                          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium py-1 px-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 flex items-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToProduct(product);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver detalle
                        </button>
                      </div>
                      
                      {/* Información del producto */}
                      <div className="p-3 flex flex-col flex-grow">
                        {/* Nombre del producto */}
                        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mb-1 leading-tight">
                          {product.name}
                        </h3>
                        
                        {/* Precio */}
                        <div className="flex items-end justify-between mt-auto pt-2">
                          <div>
                            <span className="text-base font-bold text-slate-900 dark:text-white">${product.price?.toLocaleString()}</span>
                            {product.originalPrice && product.isOffer && (
                              <div className="flex items-center space-x-1 mt-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400 line-through">${product.originalPrice?.toLocaleString()}</span>
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full px-1.5 py-0.5">
                                  {Math.round((1 - (product.price / product.originalPrice)) * 100)}% OFF
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Stock indicator */}
                          {product.stock && product.stock > 0 ? (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">En stock</span>
                          ) : (
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Sin stock</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Decorative bottom bar */}
                      <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-indigo-600 opacity-80"></div>
                      
                      {/* Animation dot */}
                      <div className="absolute bottom-2 right-2 h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 px-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-16 h-16 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.3-4.3"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">No hay suficiente información de productos vistos</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">Explora más productos en nuestra tienda para ver recomendaciones personalizadas.</p>
                  <Button 
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    onClick={() => navigate('/')}
                  >
                    Explorar catálogo
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Preguntas frecuentes */}
      <div className="container mx-auto px-4 mb-20">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800 dark:text-slate-200">Preguntas Frecuentes</h2>
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {[
              { 
                q: '¿Cuál es el tiempo de entrega?', 
                a: 'El tiempo de entrega estándar es de 2 a 5 días hábiles, dependiendo de tu ubicación.' 
              },
              { 
                q: '¿Cómo puedo realizar el seguimiento de mi pedido?', 
                a: 'Una vez que tu pedido sea despachado, recibirás un enlace de seguimiento por WhatsApp.' 
              },
              { 
                q: '¿Cuál es la política de devoluciones?', 
                a: 'Aceptamos devoluciones dentro de los 7 días posteriores a la compra con retiro en el local.' 
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white border rounded-lg overflow-hidden">
                <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70">
                  <h3 className="font-medium">{faq.q}</h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
                <div className="px-4 pb-4 text-sm text-gray-600">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-3">¿Tienes más preguntas?</p>
            <Button 
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2" 
              onClick={() => window.open('https://wa.me/543873439775', '_blank')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.041 16.754c-.269.8-1.438 1.478-2.424 1.664-.572.109-1.21.16-1.957.103-1.057-.081-2.26-.421-3.529-.995l-.353-.17c-3.839-1.679-6.319-5.52-6.509-5.777-.189-.257-1.534-2.047-1.534-3.901 0-1.858.92-2.815 1.33-3.233.311-.319.677-.467 1.039-.467h.626c.335 0 .502.04.675.585.212.667.718 2.316.784 2.486.068.17.118.368.035.582-.084.213-.157.328-.308.517l-.54.67c-.17.213-.35.443-.146.684.198.241.881 1.12 1.851 1.874 1.249.974 2.255 1.312 2.62 1.427.256.08.466.063.641-.08.226-.185.5-.521.775-.861.212-.265.471-.371.752-.265.27.104 1.735.826 2.035.976.301.151.502.232.585.364.084.134.084.515-.183 1.05z" />
              </svg>
              Contactar por WhatsApp
            </Button>
          </div>
        </div>
      </div>
      
      
      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4 text-blue-400">REGALA ALGO</h3>
              <p className="text-slate-400 text-sm">
                La mejor tienda online para encontrar productos exclusivos y de alta calidad. Desde 2020 brindando la mejor experiencia de compra con envíos rápidos y atención personalizada.
              </p>
              <div className="flex gap-4 pt-2">
                <a href="https://www.facebook.com/Regala.Algo" className="bg-slate-800 p-2 rounded-full hover:bg-blue-600 transition-colors">
                  <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/facebook.svg" alt="Facebook" className="w-5 h-5 text-white" />
                </a>
                <a href="https://www.instagram.com/regala.algo?igsh=OWk2enhxYzg2eHVq" className="bg-slate-800 p-2 rounded-full hover:bg-blue-600 transition-colors">
                  <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/instagram.svg" alt="Instagram" className="w-5 h-5 text-white" />
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces rápidos</h3>
              <ul className="space-y-2 text-slate-400">
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400" onClick={() => navigate('/')}>Inicio</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400" onClick={() => navigate('/')}>Categorías</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400" onClick={() => navigate('/')}>Ofertas</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400" onClick={() => navigate('/')}>Blog</Button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Ayuda</h3>
              <ul className="space-y-2 text-slate-400">
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400">Preguntas Frecuentes</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400">Política de Privacidad</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400">Términos y Condiciones</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-slate-400 hover:text-blue-400">Política de Envío</Button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contacto</h3>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800 p-2 rounded">
                    <MapPin className="h-4 w-4 text-blue-400" />
                  </div>
                  <a href="https://maps.app.goo.gl/JRJbCy7Bs6Ej5HCd8" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Av. Entre Ríos 1144, Salta</a>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800 p-2 rounded">
                    <Mail className="h-4 w-4 text-blue-400" />
                  </div>
                  <span>Regalo.Algo@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800 p-2 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                  <span>+54 3873439775</span>
                </div>
                <div className="mt-3">
                  <div className="relative">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3622.317533512308!2d-65.41180712386205!3d-24.785247306203214!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x941bc3c92e9c1fb3%3A0xb0cb908a1effa849!2sOlavarr%C3%ADa%20610%2C%20A4400%20Salta!5e0!3m2!1ses-419!2sar!4v1691862420652!5m2!1ses-419!2sar"
                      width="100%" 
                      height="150" 
                      style={{ border: 0, borderRadius: '8px' }} 
                      allowFullScreen={true} 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Ubicación de la tienda"
                    ></iframe>
                    <a 
                      href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                    >
                      📍 Cómo llegar
                    </a>
                  </div>
                  <p className="mt-2 text-sm">📍 Olavarría 610 (esquina San Luis)</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} REGALA ALGO. Todos los derechos reservados.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <div className="bg-slate-800 p-1 rounded">
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/visa.svg" alt="Visa" className="w-10 h-6 object-contain" />
              </div>
              <div className="bg-slate-800 p-1 rounded">
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/mastercard.svg" alt="Mastercard" className="w-10 h-6 object-contain" />
              </div>
              <div className="bg-slate-800 p-1 rounded">
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/americanexpress.svg" alt="American Express" className="w-10 h-6 object-contain" />
              </div>
              <div className="bg-slate-800 p-1 rounded">
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v6/icons/paypal.svg" alt="PayPal" className="w-10 h-6 object-contain" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductDetailPage;
