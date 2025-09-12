import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/contexts/CartContext';
import { Search, Filter, MessageCircle, Flame, ChevronDown } from 'lucide-react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/use-categories';
import LatestProductsGrid from './LatestProductsGrid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Category {
  id?: string;
  name: string;
  image?: string;
  parentId?: string;
  parentName?: string;
}

interface ProductsSectionProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  setCategories: (cats: string[]) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (subcat: string) => void;
  selectedTerceraCategoria: string;
  setSelectedTerceraCategoria: (terceraCat: string) => void;
}

export const ProductsSection: React.FC<ProductsSectionProps> = ({
  selectedCategory,
  setSelectedCategory,
  setCategories,
  selectedSubcategory,
  setSelectedSubcategory,
  selectedTerceraCategoria,
  setSelectedTerceraCategoria,
}) => {
  // Efecto para forzar la cuadrícula unificada sin espacios
  React.useEffect(() => {
    // Función para aplicar estilos inline que sobrescriban cualquier otro estilo
    const applyUnifiedGridStyles = () => {
      // Seleccionar todas las cuadrículas de productos
      const grids = document.querySelectorAll('.product-unified-grid, .grid');
      grids.forEach(grid => {
        // Aplicar estilos a la cuadrícula
        const gridElem = grid as HTMLElement;
        gridElem.style.display = 'grid';
        gridElem.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        gridElem.style.gap = '0';
        gridElem.style.margin = '0';
        gridElem.style.padding = '0';
        gridElem.style.borderSpacing = '0';
        gridElem.style.borderCollapse = 'collapse';
        
        // Estilos para los contenedores de tarjetas
        const children = grid.children;
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          child.style.margin = '0';
          child.style.padding = '0';
          child.style.borderRadius = '0';
          child.style.boxShadow = 'none';
          child.style.border = '1px solid rgba(0,0,0,0.1)';
          
          // Estilos para las tarjetas dentro
          const cards = child.querySelectorAll('.card');
          cards.forEach((card: any) => {
            card.style.margin = '0';
            card.style.borderRadius = '0';
            card.style.boxShadow = 'none';
            card.style.border = '1px solid rgba(0,0,0,0.1)';
          });
        }
      });
      
      // También ajustar explícitamente la cuadrícula principal de productos
      document.querySelectorAll('.grid.grid-cols-2, .grid.grid-cols-3, .grid.grid-cols-4').forEach(grid => {
        (grid as HTMLElement).style.gap = '0';
      });
    };
    
    // Aplicar estilos inmediatamente
    applyUnifiedGridStyles();
    
    // Y también después de retrasos para asegurar que los componentes están renderizados
    const timer1 = setTimeout(applyUnifiedGridStyles, 500);
    const timer2 = setTimeout(applyUnifiedGridStyles, 1000);
    const timer3 = setTimeout(applyUnifiedGridStyles, 2000);
    
    // Observar cambios en el DOM para re-aplicar estilos cuando sea necesario
    const observer = new MutationObserver(applyUnifiedGridStyles);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      observer.disconnect();
    };
  }, []);
  
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [products, setProducts] = useState<Product[]>([]);
  const { categoriesData: categories } = useCategories();
  const [loading, setLoading] = useState(true);
  
  // Estado para carga progresiva de categorías
  const [visibleCategories, setVisibleCategories] = useState({
    main: 5, // Mostrar primeras 5 categorías principales
    sub: {}, // Objeto para controlar subcategorías visibles por categoría principal
    third: {} // Objeto para controlar terceras categorías visibles por subcategoría
  });
  
  // Estado para carga progresiva de productos por categoría
  const [visibleProductsPerCategory, setVisibleProductsPerCategory] = useState<Record<string, number>>({});
  const PRODUCTS_PER_ROW = 12; // Número de productos a mostrar inicialmente por cada categoría (3 filas de 4)
  const [loadingMoreProducts, setLoadingMoreProducts] = useState<Record<string, boolean>>({});

  // Función para obtener productos por categoría, incluyendo sus subcategorías si corresponde
  const getProductsByCategory = (categoryName: string) => {
    // Obtener el objeto de categoría por nombre
    const categoryObj = categories.find(cat => cat.name === categoryName);
    
    // Productos directamente asignados a esta categoría (por nombre o por ID)
    const directProducts = products.filter(p => 
      p.category === categoryName || 
      p.categoryName === categoryName || 
      (categoryObj && p.category === categoryObj.id)
    );
    
    // Obtener subcategorías de esta categoría principal
    const subCats = categories.filter(cat => 
      (cat.parentName === categoryName) || 
      (categoryObj && cat.parentId === categoryObj.id)
    );
    
    // Productos en subcategorías (buscando tanto por ID como por nombre)
    const subCategoryProducts = subCats.flatMap(subCat => 
      products.filter(p => 
        p.subcategory === subCat.id || 
        p.subcategoryName === subCat.name
      )
    );
    
    // Combinar productos directos y de subcategorías, evitando duplicados
    const allProducts = [...directProducts];
    subCategoryProducts.forEach(p => {
      if (!allProducts.some(existing => existing.id === p.id)) {
        allProducts.push(p);
      }
    });
    
    return allProducts;
  };

  // Cargar productos reales de Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
      setLoading(false);
    };
    fetchProducts();
  }, []);
  
  // Ordenar categorías principales por importancia o cantidad de productos
  const sortedMainCategories = useMemo(() => {
    const mainCats = categories.filter(cat => cat.name !== "Todos" && !cat.parentId);
    
    // Ordenar por cantidad de productos (de mayor a menor)
    return mainCats.sort((a, b) => {
      const aProducts = getProductsByCategory(a.name).length;
      const bProducts = getProductsByCategory(b.name).length;
      return bProducts - aProducts;
    });
  }, [categories, products]);
  
  // Función para cargar más categorías principales
  const loadMoreMainCategories = () => {
    setVisibleCategories(prev => ({
      ...prev,
      main: prev.main + 5
    }));
  };
  
  // Función para expandir/contraer subcategorías de una categoría principal
  const toggleSubcategoriesVisibility = (categoryId: string) => {
    setVisibleCategories(prev => ({
      ...prev,
      sub: {
        ...prev.sub,
        [categoryId]: prev.sub[categoryId] ? 
          (prev.sub[categoryId] === -1 ? 5 : -1) : // -1 significa ver todas
          5 // Mostrar primeras 5 subcategorías
      }
    }));
  };
  
  // Función para expandir/contraer terceras categorías de una subcategoría
  const toggleThirdCategoriesVisibility = (subcategoryId: string) => {
    setVisibleCategories(prev => ({
      ...prev,
      third: {
        ...prev.third,
        [subcategoryId]: prev.third[subcategoryId] ? 
          (prev.third[subcategoryId] === -1 ? 5 : -1) : // -1 significa ver todas
          5 // Mostrar primeras 5 terceras categorías
      }
    }));
  };
  
  // Función para cargar más subcategorías de una categoría principal
  const loadMoreSubcategories = (categoryId: string) => {
    setVisibleCategories(prev => ({
      ...prev,
      sub: {
        ...prev.sub,
        [categoryId]: prev.sub[categoryId] + 5
      }
    }));
  };
  
  // Función para cargar más terceras categorías de una subcategoría
  const loadMoreThirdCategories = (subcategoryId: string) => {
    setVisibleCategories(prev => ({
      ...prev,
      third: {
        ...prev.third,
        [subcategoryId]: prev.third[subcategoryId] + 5
      }
    }));
  };
  
  // Función para cargar más productos por categoría
  const loadMoreProductsForCategory = (categoryId: string) => {
    // Marcamos esta categoría como cargando
    setLoadingMoreProducts(prev => ({
      ...prev,
      [categoryId]: true
    }));
    
    // Simulamos un pequeño retraso para la carga
    setTimeout(() => {
      setVisibleProductsPerCategory(prev => ({
        ...prev,
        [categoryId]: (prev[categoryId] || PRODUCTS_PER_ROW) + 4
      }));
      
      setLoadingMoreProducts(prev => ({
        ...prev,
        [categoryId]: false
      }));
    }, 500);
  };

  // Obtener subcategorías para la categoría seleccionada
  const subcategories = useMemo(() => {
    if (selectedCategory === 'Todos') {
      return [];
    }

    // Obtener la categoría seleccionada por su nombre
    const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);
    
    // Buscar subcategorías que tienen esta categoría como padre
    // Podemos buscar tanto por name como por id para mayor compatibilidad
    const subCats = categories.filter(cat => 
      (cat.parentName === selectedCategory) || 
      (selectedCategoryObj && cat.parentId === selectedCategoryObj.id)
    );
    
    return [
      { id: "todas", name: "Todas" },
      ...subCats.map(cat => ({ id: cat.id, name: cat.name }))
    ];
  }, [categories, selectedCategory]);

  // Obtener terceras categorías para la subcategoría seleccionada
  const tercerasCategorias = useMemo(() => {
    // Si no hay subcategoría seleccionada o es "Todas", no hay terceras categorías disponibles
    if (selectedSubcategory === 'Todas' || !selectedSubcategory) {
      return [];
    }

    // Obtener el objeto de la subcategoría seleccionada
    const selectedSubcategoryObj = categories.find(cat => cat.name === selectedSubcategory);
    if (!selectedSubcategoryObj) return [];
    
    // Buscar categorías que tienen esta subcategoría como padre
    const terceraCats = categories.filter(cat => 
      cat.parentId === selectedSubcategoryObj.id
    );
    
    return [
      { id: "todas", name: "Todas" },
      ...terceraCats.map(cat => ({ id: cat.id, name: cat.name }))
    ];
  }, [categories, selectedSubcategory]);

  const filteredAndSortedProducts = useMemo(() => {
    // Importar utilidades de depuración desde archivo externo
    import('./ProductsSection.debug').then(module => {
      module.debugProducts(products, selectedCategory, selectedSubcategory, selectedTerceraCategoria, categories);
    }).catch(err => console.error('Error al cargar utilidades de depuración:', err));
    
    // Importante: Creamos una copia profunda de los productos para asegurar que las modificaciones no afectan a los originales
    const productsWithNormalizedFields = products.map(product => {
      // Crear una copia del producto para no modificar el original
      const productCopy = { ...product };
      
      // Normalizar campos a minúsculas para facilitar comparaciones
      if (productCopy.categoryName) {
        productCopy.categoryName = productCopy.categoryName.toLowerCase();
      }
      if (productCopy.subcategoryName) {
        productCopy.subcategoryName = productCopy.subcategoryName.toLowerCase();
      }
      if (productCopy.terceraCategoriaName) {
        productCopy.terceraCategoriaName = productCopy.terceraCategoriaName.toLowerCase();
      }
      
      return productCopy;
    });

    // PASO 1: Filtrar por texto de búsqueda
    let filtered = productsWithNormalizedFields.filter(product => {
      const matchesSearch = !searchTerm || 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
    
    // PASO 2: Filtrar por categoría principal
    if (selectedCategory !== 'Todos') {
      const selectedCategoryLower = selectedCategory.toLowerCase();
      const selectedCatObj = categories.find(cat => cat.name.toLowerCase() === selectedCategoryLower);
      
      filtered = filtered.filter(product => {
        // Por nombre de categoría (string)
        const matchesCategoryName = product.categoryName === selectedCategoryLower;
        
        // Por ID de categoría (referencia)
        const matchesCategoryId = selectedCatObj && product.category === selectedCatObj.id;
        
        return matchesCategoryName || matchesCategoryId;
      });
      
      // PASO 3: Filtrar por subcategoría (si está seleccionada)
      if (selectedSubcategory !== 'Todas') {
        const selectedSubcategoryLower = selectedSubcategory.toLowerCase();
        const selectedSubcatObj = categories.find(cat => cat.name.toLowerCase() === selectedSubcategoryLower);
        
        console.log('DEBUG - Aplicando filtro de subcategoría:', {
          subcategoria: selectedSubcategory,
          id: selectedSubcatObj?.id,
          productosAntesFiltro: filtered.length
        });
        
        filtered = filtered.filter(product => {
          // Coincidencia exacta por nombre
          const matchesSubcategoryName = product.subcategoryName === selectedSubcategoryLower;
          
          // Coincidencia por ID 
          const matchesSubcategoryId = selectedSubcatObj && product.subcategory === selectedSubcatObj.id;

          // Para depuración
          if (product === filtered[0]) {
            console.log('Primer producto subcategoría check:', {
              producto: product.name,
              subcategoriaProducto: product.subcategoryName,
              subcategoriaSeleccionada: selectedSubcategoryLower,
              matchNombre: matchesSubcategoryName,
              matchId: matchesSubcategoryId
            });
          }
          
          return matchesSubcategoryName || matchesSubcategoryId;
        });
        
        console.log(`DEBUG - Después del filtro de subcategoría: ${filtered.length} productos`);
        
        // PASO 4: Filtrar por tercera categoría (si está seleccionada)
        if (selectedTerceraCategoria !== 'Todas') {
          const selectedTerceraLower = selectedTerceraCategoria.toLowerCase();
          const selectedTerceraObj = categories.find(cat => cat.name.toLowerCase() === selectedTerceraLower);
          
          console.log('DEBUG - Aplicando filtro de tercera categoría:', {
            terceraCategoria: selectedTerceraCategoria,
            id: selectedTerceraObj?.id,
            productosAntesFiltro: filtered.length
          });
          
          filtered = filtered.filter(product => {
            // Coincidencia por nombre
            const matchesTerceraCatName = product.terceraCategoriaName === selectedTerceraLower;
            
            // Coincidencia por ID
            const matchesTerceraCatId = selectedTerceraObj && product.terceraCategoria === selectedTerceraObj.id;
            
            // Para depuración
            if (product === filtered[0]) {
              console.log('Primer producto tercera categoría check:', {
                producto: product.name,
                terceraCategoriaProducto: product.terceraCategoriaName,
                terceraCategoriaSeleccionada: selectedTerceraLower,
                matchNombre: matchesTerceraCatName,
                matchId: matchesTerceraCatId
              });
            }
            
            return matchesTerceraCatName || matchesTerceraCatId;
          });
          
          console.log(`DEBUG - Después del filtro de tercera categoría: ${filtered.length} productos`);
        }
      }
    } else {
      // Si seleccionamos "Todos", excluimos las ofertas
      filtered = filtered.filter(product => {
        const isOferta = product.category?.toLowerCase() === "oferta" || 
                         product.category?.toLowerCase() === "ofertas";
        return !isOferta;
      });
    }
    
    // Log final con resultados del filtrado
    console.log(`Filtrado completado. Encontrados: ${filtered.length} productos de ${products.length} totales.`);
    if (filtered.length > 0 && filtered.length <= 5) {
      filtered.forEach((p, i) => console.log(`Producto filtrado ${i+1}: ${p.name}`));
    }
    
    // Ordenar productos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
    
    // Ordenar productos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, selectedSubcategory, selectedTerceraCategoria, categories, sortBy]);

  const ofertas = useMemo(
    () => products.filter((p) => {
      // Verificar si hay categoría asignada
      if (!p.category) return false;
      
      // Verificar categoría "oferta" o "ofertas" 
      const isOfertaCategory = 
        p.category?.toLowerCase() === "oferta" || 
        p.category?.toLowerCase() === "ofertas";
      
      // Verificar nombre contiene "oferta"
      const hasOfertaInName = p.name?.toLowerCase().includes("oferta");
      
      // También verificar si el producto tiene un campo de descuento o está marcado como oferta
      const isMarkedAsOffer = p.isOffer === true || (p.discount && p.discount > 0);
      
      return isOfertaCategory || hasOfertaInName || isMarkedAsOffer;
    }),
    [products]
  );

  const categoryImages: Record<string, string> = {
    Bebidas: "https://images.unsplash.com/photo-1514361892635-cebb9b6c3e53?auto=format&fit=facearea&w=96&q=80",
    Snacks: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=96&q=80",
    Dulces: "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=facearea&w=96&q=80",
    Lácteos: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=facearea&w=96&q=80",
    Panadería: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=facearea&w=96&q=80",
    Despensa: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=facearea&w=96&q=80",
    Aseo: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=facearea&w=96&q=80",
    Combos: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=facearea&w=96&q=80",
    Todos: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=96&q=80"
  };

  return (
    <section id="productos" className="py-10 md:py-16 bg-white">
      <div className="w-full px-2 md:px-4">
        {/* Header centrado y organizado */}
      

        {/* Botón de WhatsApp y aviso de domicilio gratis */}
        

        {/* CategoryBar - Usar una barra de desplazamiento horizontal en móviles con carga progresiva */}
        <div className="flex flex-col w-full">
          {/* Categorías principales */}
          <div className="flex overflow-x-auto pb-4 gap-4 sm:gap-6 md:gap-8 mb-6 justify-start md:justify-center">
            {categories
              // Filtrar solo categorías principales para el selector principal (sin parentId)
              .filter(cat => cat.name === "Todos" || !cat.parentId)
              // Mostrar solo un número limitado de categorías principales
              .slice(0, visibleCategories.main)
              .map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    // Resetear la subcategoría cuando se cambia la categoría principal
                    setSelectedSubcategory('Todas');
                    // Expandir las subcategorías de esta categoría
                    toggleSubcategoriesVisibility(cat.id || cat.name);
                  }}
                  className={`flex-shrink-0 flex flex-row items-center bg-transparent px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 rounded-xl transition-all hover:bg-slate-50 focus:outline-none
                    ${selectedCategory === cat.name ? "ring-2 ring-blue-400" : ""}
                  `}
                  style={{ minWidth: 120, maxWidth: 260 }}
                >
                  <img
                    src={cat.image || "https://via.placeholder.com/80x80?text=?"}
                    alt={cat.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-cover mr-3 sm:mr-4 md:mr-6"
                    loading="lazy"
                    style={{ boxShadow: "none", border: "none", background: "none" }}
                  />
                  <div className="text-left">
                    <h3 className="text-md md:text-lg font-bold text-slate-900">{cat.name}</h3>
                    <p className="text-xs md:text-sm text-slate-500">
                      {products.filter(p => {
                        if (cat.name === "Todos") return true;
                        
                        // Contar productos que pertenecen directamente a esta categoría
                        // O que pertenecen a alguna de sus subcategorías
                        const directMatch = p.category === cat.name || p.categoryName === cat.name;
                        
                        // También contar productos en subcategorías de esta categoría principal
                        const subCategories = categories.filter(sc => sc.parentId && 
                                                                (sc.parentName === cat.name || sc.parentName === cat.id));
                        const inSubCategory = subCategories.some(sc => 
                          p.subcategory === sc.id || p.subcategoryName === sc.name
                        );
                        
                        return directMatch || inSubCategory;
                      }).length} productos
                    </p>
                  </div>
                </button>
              ))}
              
            {/* Botón "Ver más categorías" si hay más categorías principales */}
            {categories.filter(cat => cat.name === "Todos" || !cat.parentId).length > visibleCategories.main && (
              <button
                onClick={loadMoreMainCategories}
                className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 px-4 py-4 rounded-xl transition-all min-w-[120px]"
              >
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-2">
                  <ChevronDown className="h-6 w-6 text-slate-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">Ver más</span>
              </button>
            )}
          </div>
          
          {/* Mostrar subcategorías para la categoría seleccionada */}
          {selectedCategory !== 'Todos' && (
            <div className="mb-10 px-2">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium text-slate-700">Subcategorías de {selectedCategory}</h3>
                <button 
                  onClick={() => toggleSubcategoriesVisibility(
                    categories.find(c => c.name === selectedCategory)?.id || selectedCategory
                  )}
                  className="ml-2 p-1 rounded-full hover:bg-slate-100"
                >
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {subcategories.length > 1 ? (
                  <>
                    {/* Subcategorías filtradas y limitadas */}
                    {subcategories
                      .slice(0, visibleCategories.sub[
                        categories.find(c => c.name === selectedCategory)?.id || selectedCategory
                      ] || 5)
                      .map((subcat) => (
                        <button
                          key={subcat.id}
                          onClick={() => {
                            setSelectedSubcategory(subcat.name);
                            // Si se selecciona "Todas", resetear tercera categoría
                            if (subcat.name === "Todas") {
                              setSelectedTerceraCategoria('Todas');
                            } else {
                              // Expandir terceras categorías de esta subcategoría
                              toggleThirdCategoriesVisibility(subcat.id || subcat.name);
                            }
                          }}
                          className={`p-3 text-center rounded-lg border transition-all
                            ${selectedSubcategory === subcat.name 
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}
                          `}
                        >
                          {subcat.name}
                        </button>
                      ))}
                    
                    {/* Botón "Ver más" para subcategorías */}
                    {subcategories.length > 5 && visibleCategories.sub[
                      categories.find(c => c.name === selectedCategory)?.id || selectedCategory
                    ] !== -1 && (
                      <button
                        onClick={() => loadMoreSubcategories(
                          categories.find(c => c.name === selectedCategory)?.id || selectedCategory
                        )}
                        className="p-3 text-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                      >
                        Ver más
                      </button>
                    )}
                  </>
                ) : (
                  <div className="col-span-full text-center p-4 bg-slate-50 rounded-lg text-slate-600">
                    Esta categoría no tiene subcategorías
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Mostrar terceras categorías si hay una subcategoría seleccionada */}
          {selectedSubcategory !== 'Todas' && (
            <div className="mb-10 px-2">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium text-slate-700">Categorías de {selectedSubcategory}</h3>
                <button 
                  onClick={() => toggleThirdCategoriesVisibility(
                    categories.find(c => c.name === selectedSubcategory)?.id || selectedSubcategory
                  )}
                  className="ml-2 p-1 rounded-full hover:bg-slate-100"
                >
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {tercerasCategorias.length > 1 ? (
                  <>
                    {/* Terceras categorías filtradas y limitadas */}
                    {tercerasCategorias
                      .slice(0, visibleCategories.third[
                        categories.find(c => c.name === selectedSubcategory)?.id || selectedSubcategory
                      ] || 5)
                      .map((terceraCat) => (
                        <button
                          key={terceraCat.id}
                          onClick={() => setSelectedTerceraCategoria(terceraCat.name)}
                          className={`p-3 text-center rounded-lg border transition-all
                            ${selectedTerceraCategoria === terceraCat.name 
                              ? "bg-orange-50 border-orange-200 text-orange-700"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}
                          `}
                        >
                          {terceraCat.name}
                        </button>
                      ))}
                    
                    {/* Botón "Ver más" para terceras categorías */}
                    {tercerasCategorias.length > 5 && visibleCategories.third[
                      categories.find(c => c.name === selectedSubcategory)?.id || selectedSubcategory
                    ] !== -1 && (
                      <button
                        onClick={() => loadMoreThirdCategories(
                          categories.find(c => c.name === selectedSubcategory)?.id || selectedSubcategory
                        )}
                        className="p-3 text-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                      >
                        Ver más
                      </button>
                    )}
                  </>
                ) : (
                  <div className="col-span-full text-center p-4 bg-slate-50 rounded-lg text-slate-600">
                    Esta subcategoría no tiene categorías adicionales
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search and Sort Section - Mejorada para móviles */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 px-2">
          <div className="w-full md:w-auto mb-4 md:mb-0">
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-auto min-w-[250px]"
            />
          </div>

          {/* Sort Options y Filtro de Subcategorías */}
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            {/* Filtro de subcategorías - solo visible cuando hay una categoría seleccionada */}
            {selectedCategory !== 'Todos' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-600 font-medium hidden md:inline">Subcategoría:</span>
                {subcategories.length > 1 ? (
                  <Select 
                    value={selectedSubcategory} 
                    onValueChange={(value) => {
                      setSelectedSubcategory(value);
                      setSelectedTerceraCategoria('Todas'); // Reset tercera categoría cuando cambia subcategoría
                    }}
                  >
                    <SelectTrigger className="w-[180px] border-slate-300 focus:border-blue-500 bg-white shadow-sm">
                      <SelectValue placeholder="Todas las subcategorías" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((subcat) => (
                        <SelectItem 
                          key={subcat.id} 
                          value={subcat.name}
                          className="subcategory-button" 
                        >
                          {subcat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm text-gray-500">Esta categoría no tiene subcategorías</span>
                )}
              </div>
            )}
            
            {/* Filtro de terceras categorías - solo visible cuando hay una subcategoría seleccionada */}
            {selectedSubcategory !== 'Todas' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-600 font-medium hidden md:inline">Tercera categoría:</span>
                {tercerasCategorias.length > 1 ? (
                  <Select 
                    value={selectedTerceraCategoria} 
                    onValueChange={(value) => setSelectedTerceraCategoria(value)}
                  >
                    <SelectTrigger className="w-[180px] border-slate-300 focus:border-orange-500 bg-white shadow-sm">
                      <SelectValue placeholder="Todas las terceras categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      {tercerasCategorias.map((terceraCat) => (
                        <SelectItem 
                          key={terceraCat.id} 
                          value={terceraCat.name}
                        >
                          {terceraCat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm text-gray-500">Esta subcategoría no tiene terceras categorías</span>
                )}
              </div>
            )}
            
            {/* Ordenar por */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium hidden md:inline">Ordenar por:</span>
              <Select value={sortBy} onValueChange={value => setSortBy(value)}>
                <SelectTrigger className="w-[180px] border-slate-300 focus:border-blue-500 bg-white shadow-sm">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre (A-Z)</SelectItem>
                  <SelectItem value="price-asc">Precio: Menor a Mayor</SelectItem>
                  <SelectItem value="price-desc">Precio: Mayor a Menor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mostrar filtros activos */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {selectedCategory !== 'Todos' && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 py-1.5 px-3">
              <span className="font-semibold">Categoría:</span> {selectedCategory}
            </Badge>
          )}
          {selectedSubcategory !== 'Todas' && selectedCategory !== 'Todos' && (
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 py-1.5 px-3">
              <span className="font-semibold">Subcategoría:</span> {selectedSubcategory}
            </Badge>
          )}
          {selectedTerceraCategoria !== 'Todas' && selectedSubcategory !== 'Todas' && (
            <Badge variant="secondary" className="bg-orange-50 text-orange-700 py-1.5 px-3">
              <span className="font-semibold">Tercera categoría:</span> {selectedTerceraCategoria}
            </Badge>
          )}
          {(selectedCategory !== 'Todos' || selectedSubcategory !== 'Todas' || selectedTerceraCategoria !== 'Todas') && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-500 hover:text-slate-800"
              onClick={() => {
                setSelectedCategory('Todos');
                setSelectedSubcategory('Todas');
                setSelectedTerceraCategoria('Todas');
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
        
        {/* Productos por categoría - Una fila para cada categoría principal */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-8 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-slate-100 animate-pulse h-[200px] sm:h-[240px] md:h-[320px] rounded-xl shadow-lg w-full mx-auto"></div>
            ))}
          </div>
        ) : searchTerm || selectedCategory !== 'Todos' ? (
          // Si hay búsqueda o una categoría seleccionada, mostramos los resultados filtrados
          <div className="mb-8">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-medium text-slate-800">
                {searchTerm ? `Resultados para "${searchTerm}"` : `Productos de ${selectedCategory}`}
              </h2>
            </div>
            
            <div className="product-unified-grid">
              {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map(product => (
                  <div key={product.id}>
                    <ProductCard product={{...product, price: product.price, originalPrice: product.originalPrice}} />
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Search className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-700 mb-4">No se encontraron productos</h3>
                  <p className="text-slate-500 max-w-md mb-8">
                    No hay productos que coincidan con tu búsqueda "{searchTerm}" 
                    {selectedCategory !== 'Todos' && ` en la categoría ${selectedCategory}`}
                    {selectedSubcategory !== 'Todas' && `, subcategoría ${selectedSubcategory}`}
                    {selectedTerceraCategoria !== 'Todas' && `, tercera categoría ${selectedTerceraCategoria}`}.
                  </p>
                  <Button 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('Todos');
                    }}
                    variant="outline"
                    className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                  >
                    Mostrar todos los productos
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Mostrar productos organizados por categoría principal
          <>
            {sortedMainCategories.map(category => {
                // Obtener productos de esta categoría y sus subcategorías
                const categoryProducts = getProductsByCategory(category.name);
                
                // Si no hay productos, no mostramos la fila
                if (categoryProducts.length === 0) return null;
                
                // Número de productos a mostrar para esta categoría
                const productsToShow = visibleProductsPerCategory[category.id || category.name] || PRODUCTS_PER_ROW;
                
                return (
                  <div key={category.id || category.name} className="mb-12">
                    {/* Cabecera de la categoría */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <img
                          src={category.image || "https://via.placeholder.com/40x40?text=?"}
                          alt={category.name}
                          className="w-10 h-10 object-cover rounded-md mr-3"
                        />
                        <h2 className="text-xl font-medium text-slate-800">{category.name}</h2>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCategory(category.name)}
                      >
                        Ver todos
                      </Button>
                    </div>
                    
                    {/* Productos de esta categoría */}
                    <div className="product-unified-grid">
                      {categoryProducts
                        .slice(0, productsToShow)
                        .map(product => (
                          <div key={product.id}>
                            <ProductCard product={{...product, price: product.price, originalPrice: product.originalPrice}} />
                          </div>
                        ))
                      }
                    </div>
                    
                    {/* Botón para cargar más productos de esta categoría */}
                    {categoryProducts.length > productsToShow && (
                      <div className="flex justify-center mt-4">
                        <Button 
                          onClick={() => loadMoreProductsForCategory(category.id || category.name)}
                          className="px-6 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center"
                          disabled={loadingMoreProducts[category.id || category.name]}
                          size="sm"
                        >
                          {loadingMoreProducts[category.id || category.name] ? (
                            <>
                              <div className="animate-spin mr-2 h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                              Cargando...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-2" />
                              Ver más productos de {category.name}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </>
        )}

        {/* Últimos productos agregados - Diseño simplificado */}
        <div className="mt-8 mb-12">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-800">
              Últimos productos agregados
            </h3>
          </div>
          <div className="w-full">
            <LatestProductsGrid maxItems={3} sortBy="createdAt" sortOrder="desc" />
          </div>
        </div>

        {/* Ofertas Especiales */}
       
        {/* NUEVA SECCIÓN ULTRA-DESTACADA DE OFERTAS ESPECIALES - Siempre visible */}
        {(
          <div className="mt-32 mb-10 relative">
            {/* Separador decorativo superior */}
            {/* Encabezado principal de Ofertas - Diseño profesional y moderno */}
            <div className="bg-gradient-to-r from-blue-600 to-slate-800 pt-10 pb-8 px-6 text-center relative overflow-hidden shadow-lg rounded-t-xl">
              {/* Elementos decorativos modernos y sutiles */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-15">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-white mix-blend-overlay filter blur-xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full bg-blue-300 mix-blend-overlay filter blur-xl"></div>
              </div>
              
              <div className="relative z-10">
                <div className="inline-block mb-3 px-4 py-1.5 bg-blue-500/30 rounded-full backdrop-blur-sm border border-blue-400/30">
                  <span className="text-sm font-medium text-white">Promociones especiales</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                  Ofertas exclusivas
                </h2>
                <p className="text-base md:text-lg text-blue-50 max-w-2xl mx-auto font-light">
                  Descubre nuestra selección de productos con los mejores precios por tiempo limitado
                </p>
                <div className="flex justify-center mt-6">
                  <span className="inline-block bg-white/95 backdrop-blur-sm text-blue-800 text-sm font-semibold px-5 py-2 rounded-full shadow-md">
                    Hasta 25% de descuento en productos seleccionados
                  </span>
                </div>
              </div>
            </div>

            {/* Contenedor principal de productos en oferta con diseño profesional */}
            <div className="bg-gradient-to-b from-slate-50 to-white py-12 px-4 md:px-8 relative">
              {/* Elementos decorativos sutiles */}
              <div className="absolute top-0 right-10 w-24 h-24 opacity-20">
                <svg viewBox="0 0 200 200" className="text-blue-500/20 w-full h-full">
                  <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C87,14.6,81.4,29.2,74.1,43.2C66.7,57.2,57.6,70.6,45,78.1C32.4,85.6,16.2,87.3,0.7,86.2C-14.8,85.1,-29.6,81.2,-43.9,74.5C-58.3,67.8,-72.3,58.2,-79.1,45.1C-85.9,32,-85.5,16,-83.2,1.3C-80.9,-13.4,-76.6,-26.8,-69.9,-39.2C-63.2,-51.7,-54.1,-63.2,-42.2,-71.3C-30.3,-79.4,-15.1,-84,-0.3,-83.6C14.6,-83.2,29.2,-77.8,44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
              </div>
              
              <div className="max-w-7xl mx-auto">
                {/* Encabezado de ofertas más profesional */}
                <div className="mb-8 relative">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center">
                    <span className="text-blue-600 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    Ofertas Especiales
                  </h2>
                  <div className="h-1 w-24 bg-blue-600 rounded-full mb-4"></div>
                  <p className="text-slate-600 max-w-2xl">
                    Descubre nuestras ofertas exclusivas por tiempo limitado. Productos de alta calidad a precios inigualables.
                  </p>
                </div>
                
                {/* Grid de productos en oferta - tarjetas más anchas y avanzadas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {ofertas.length > 0 ? (
                    ofertas.map((oferta) => (
                      <ProductCard key={oferta.id} product={{...oferta, price: oferta.price, originalPrice: oferta.originalPrice}} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 max-w-md mx-auto">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">No hay ofertas disponibles</h3>
                        <p className="text-slate-600">
                          En este momento no tenemos ofertas especiales activas. Nuestras promociones son actualizadas constantemente, ¡vuelve pronto para descubrir nuevos descuentos!
                        </p>
                        <div className="mt-6">
                          <button 
                            className="inline-flex items-center justify-center text-sm px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Recibir notificaciones de ofertas
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Banner de información adicional - Diseño profesional con colores azul/slate */}
                <div className="mt-16 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-8 border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-slate-700 flex items-center justify-center mb-4 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">Ofertas por tiempo limitado</h3>
                      <p className="text-sm text-slate-600">Descuentos disponibles hasta agotar existencias</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-slate-700 flex items-center justify-center mb-4 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">Calidad garantizada</h3>
                      <p className="text-sm text-slate-600">Productos seleccionados de primera calidad</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-slate-700 flex items-center justify-center mb-4 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">Proceso de pago seguro</h3>
                      <p className="text-sm text-slate-600">Múltiples métodos de pago disponibles</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
