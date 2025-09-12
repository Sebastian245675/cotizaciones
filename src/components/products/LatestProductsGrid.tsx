import React, { useEffect, useState } from "react";
import { MosaicProductCard } from "./MosaicProductCard";
import { Product } from "@/contexts/CartContext";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase";
import { useNavigate } from "react-router-dom";
import "./product-mosaic.css";
import "./latest-products-grid.css";
import "./latest-banner.css";
import "./full-width-banner.css";
import "./latest-products-custom.css";
import "./latest-products-sidebar.css";

interface LatestProductsGridProps {
  maxItems?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const LatestProductsGrid: React.FC<LatestProductsGridProps> = ({ maxItems = 4, sortBy = "createdAt", sortOrder = "desc" }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatest = async () => {
      setLoading(true);
      let q;
      try {
        q = query(
          collection(db, "products"),
          orderBy(sortBy, sortOrder),
          limit(maxItems)
        );
      } catch {
        q = query(collection(db, "products"), limit(maxItems));
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as Product[];
      
      // Marcamos todos los productos más recientes como nuevos
      const productsWithNewFlag = data.map(product => ({
        ...product,
        isNew: true // Todos los productos en esta sección son nuevos
      }));
      
      setProducts(productsWithNewFlag);
      setLoading(false);
    };
    fetchLatest();
  }, [maxItems, sortBy, sortOrder]);

  return (
    <div className="latest-products-section" style={{ background: 'transparent' }}>
      {/* Banner de ancho completo con efecto de destacado */}
      <div className="full-width-banner-container mb-8 relative">
        <div className="banner-gradient-overlay" style={{ 
          position: 'absolute', 
          inset: '0', 
          background: 'linear-gradient(90deg, rgba(255,145,77,0.3) 0%, rgba(255,255,255,0) 50%, rgba(255,145,77,0.2) 100%)',
          borderRadius: '12px',
          zIndex: '1'
        }}></div>
        <img 
          src="/hola.jpg" 
          alt="Ilumina tus espacios con estilo - Productos de calidad y diseño" 
          className="full-width-banner-image"
          style={{ maxHeight: '280px', width: '100%', objectFit: 'cover', borderRadius: '12px' }}
        />
        <div className="banner-accent" style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '6px',
          background: 'linear-gradient(90deg, #FF914D, rgba(255,145,77,0.3), #FF914D)',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px'
        }}></div>
      </div>
      
      {/* Título de sección con diseño mejorado y botón Ver todos */}
      <div className="flex justify-between items-center mb-10">
        <div className="latest-products-title-container relative text-right ml-auto" style={{ paddingRight: '50px' }}>
          <div className="latest-products-header flex items-center justify-end">
            <h2 className="fancy-title order-1">
              <span className="fancy-title-text" style={{ color: '#FF914D', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>Novedades Exclusivas</span>
              <span className="fancy-title-underline" style={{ background: 'linear-gradient(90deg, rgba(255, 145, 77, 0.4) 0%, #FF914D 100%)' }}></span>
            </h2>
            <div className="fancy-title-badge ml-3 order-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FF914D" stroke="#FF914D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="text-slate-600 mt-2 text-sm text-right">Diseños innovadores y piezas únicas recién incorporadas a nuestra colección</p>
          <div className="absolute -z-10 opacity-10 top-0 right-0">
            <svg width="70" height="70" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 7L13 15L9 11L3 17M21 7H15M21 7V13" stroke="#FF914D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <a href="/productos" className="px-5 py-2 bg-[#FF914D] hover:bg-[#e57a3a] text-white font-medium rounded-full flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm">
          Ver catálogo completo
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
      
      {/* Layout con imagen lateral izquierda y grid de productos a la derecha */}
      <div className="latest-products-container">
        {/* Sección de imagen lateral mejorada con múltiples imágenes */}
        <div className="latest-products-image-section">
          {/* Imagen principal */}
          <div className="main-product-image-container relative">
            <img 
              src="/slidernuevosproduct.JPG" 
              alt="Nuevos productos destacados" 
              className="latest-products-image"
            />
            <span className="latest-products-image-badge" style={{ background: '#FF914D', boxShadow: '0 4px 15px rgba(255, 145, 77, 0.3)' }}>RECIÉN LLEGADO</span>
          </div>
          
          {/* Galería de imágenes secundarias */}
          <div className="secondary-images-container mt-4 flex gap-2">
            <div className="secondary-image-wrapper relative overflow-hidden rounded-lg" style={{ flex: '1', maxHeight: '120px' }}>
              <img 
                src="https://images.unsplash.com/photo-1540932239986-30128078f3c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
                alt="Diseño de interiores" 
                className="secondary-image object-cover w-full h-full"
                style={{ transition: 'transform 0.3s ease' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/slidernuevosproduct.JPG"; // Imagen de respaldo si la URL falla
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FF914D] to-transparent opacity-50"></div>
              <span className="absolute bottom-2 left-2 text-white text-xs font-bold">Diseño</span>
            </div>
            <div className="secondary-image-wrapper relative overflow-hidden rounded-lg" style={{ flex: '1', maxHeight: '120px' }}>
              <img 
                src="https://images.unsplash.com/photo-1533090161767-e6ffed986c88?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
                alt="Ambientes modernos" 
                className="secondary-image object-cover w-full h-full"
                style={{ transition: 'transform 0.3s ease' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/slidernuevosproduct.JPG"; // Imagen de respaldo si la URL falla
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FF914D] to-transparent opacity-50"></div>
              <span className="absolute bottom-2 left-2 text-white text-xs font-bold">Tendencias</span>
            </div>
          </div>
          
          <div className="latest-products-text mt-4" style={{ background: 'linear-gradient(145deg, #fff, #fff8f4)' }}>
            <h3 style={{ color: '#FF914D', fontWeight: '700' }}>Tendencias de Temporada</h3>
            <p>Descubre productos exclusivos recién llegados que combinan elegancia, funcionalidad y estilo para transformar tus espacios en ambientes únicos.</p>
            <div className="product-divider my-3" style={{ background: 'linear-gradient(90deg, rgba(255,145,77,0), rgba(255,145,77,0.5), rgba(255,145,77,0))' }}></div>
            <div className="product-counter mt-4">
              <div className="flex items-center justify-between">
                <span className="counter-label">Colección nueva</span>
                <span className="counter-value" style={{ color: '#FF914D' }}>{products.length} productos</span>
              </div>
              <div className="counter-bar">
                <div className="counter-progress" style={{ background: 'linear-gradient(90deg, #FF914D, #FFB88B)', width: `${Math.min(100, products.length * 10)}%` }}></div>
              </div>
            </div>
            
            {/* Botón adicional */}
            <div className="mt-4">
              <button 
                className="w-full py-2 px-4 bg-white text-[#FF914D] rounded-lg font-medium border border-[#FF914D] hover:bg-[#fff8f4] transition-colors flex items-center justify-center gap-2"
                onClick={() => navigate('/productos')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#FF914D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 8V16" stroke="#FF914D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 12H16" stroke="#FF914D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Explorar colección
              </button>
            </div>
          </div>
        </div>
        
        {/* Sección de grid de productos */}
        <div className="latest-products-grid-section">
          <div className="product-mosaic-grid enhanced-grid centered-grid mx-auto" style={{ background: 'transparent' }}>
            {loading ? (
              // Esqueletos de carga para el diseño mosaico
              Array.from({ length: maxItems }).map((_, i) => (
                <div key={i} className="product-mosaic-item">
                  <div className="h-full w-full flex flex-col justify-between">
                    {/* Image placeholder */}
                    <div className="relative bg-transparent overflow-hidden h-[220px]">
                      <div className="h-full w-full bg-slate-100 animate-pulse"></div>
                      <div className="absolute top-2 left-2 h-6 w-16 bg-[#FF914D] animate-pulse rounded-md"></div>
                      <div className="absolute top-2 right-2 h-8 w-8 bg-white animate-pulse rounded-full shadow-md"></div>
                      <div className="absolute top-3 right-3 text-white font-bold py-1 px-3 rounded-full transform rotate-12 shadow-lg z-30 bg-[#FF914D] opacity-50 animate-pulse" 
                        style={{ 
                          boxShadow: '0 3px 10px rgba(255, 145, 77, 0.3)',
                          fontSize: '0.75rem',
                          letterSpacing: '0.5px'
                        }}>
                      </div>
                    </div>
                    
                    {/* Content placeholder con color #FF914D */}
                    <div className="p-4 flex flex-col gap-2 flex-grow" style={{ 
                      backgroundColor: "#FF914D", 
                      backgroundImage: "linear-gradient(135deg, #FF914D, #FFB88B)",
                      boxShadow: "inset 0 -2px 0 rgba(255, 255, 255, 0.3)",
                      borderBottomLeftRadius: "0.5rem",
                      borderBottomRightRadius: "0.5rem"
                    }}>
                      <div className="h-4 bg-white bg-opacity-40 animate-pulse rounded-full w-1/2"></div>
                      <div className="h-6 bg-white bg-opacity-40 animate-pulse rounded-full w-3/4 mb-1"></div>
                      <div className="h-5 bg-white bg-opacity-40 animate-pulse rounded-full w-1/3 mt-1"></div>
                      <div className="h-3 bg-white bg-opacity-40 animate-pulse rounded-full w-full mt-1"></div>
                      <div className="mt-3 h-10 bg-white bg-opacity-50 animate-pulse rounded-lg w-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
              <div className="col-span-full text-center py-12" style={{ 
                backgroundColor: "#FF914D", 
                backgroundImage: "linear-gradient(135deg, #FF914D, #FFB88B)",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 15px -3px rgba(255, 145, 77, 0.3), 0 4px 6px -4px rgba(255, 145, 77, 0.2)"
              }}>
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                  <svg className="h-8 w-8 text-[#FF914D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 8-4-4-6 6M20 7h-6M20 7v6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Próximamente nuevos productos</h3>
                <p className="text-white text-opacity-80 mt-2 mb-4">Estamos preparando novedades increíbles para ti</p>
                <a href="/productos" className="inline-block bg-white text-[#FF914D] font-medium px-6 py-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors">
                  Ver todos los productos
                </a>
              </div>
            ) : (
              // Usamos el diseño de MosaicProductCard con etiqueta NUEVO
              products.map((product, index) => (
                <div 
                  key={product.id} 
                  className="product-mosaic-item" 
                  style={{ "--animation-order": index } as React.CSSProperties}
                >
                  <div className="relative">
                    <MosaicProductCard product={product} />
                    {/* Etiqueta NUEVO en cada tarjeta con animación */}
                    <div className="absolute top-3 right-3 text-white font-bold py-1 px-3 rounded-full transform rotate-12 shadow-lg z-30 new-product-badge" 
                      style={{ 
                        background: '#FF914D', 
                        boxShadow: '0 3px 10px rgba(255, 145, 77, 0.3)',
                        fontSize: '0.75rem',
                        letterSpacing: '0.5px'
                      }}>
                      NUEVO
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Añadir placeholders si es necesario para completar filas */}
            {!loading && products.length > 0 && products.length % 3 !== 0 && 
              Array.from({ length: 3 - (products.length % 3) }).map((_, index) => (
                <div 
                  className="product-mosaic-item opacity-0 transition-opacity hover:opacity-25" 
                  key={`placeholder-${index}`}
                  aria-hidden="true"
                  title="Próximamente más productos"
                >
                  <div className="w-full h-full border border-dashed border-[#FF914D] border-opacity-30 rounded-lg"></div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatestProductsGrid;
