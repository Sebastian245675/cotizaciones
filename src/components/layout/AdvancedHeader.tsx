import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import './scrollbar.css';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
// import { AuthModal } from '@/components/auth/AuthModal'; // No longer needed - using /login page
import { CartSidebar } from '@/components/cart/CartSidebar';
import { UserMenu } from '@/components/user/UserMenu';
import { 
  ShoppingCart, 
  LogIn, 
  Search, 
  Sparkles, 
  Bell, 
  User, 
  MessageCircle, 
  Package, 
  Menu, 
  X, 
  ChevronDown 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { useIsMobile } from '@/hooks/use-mobile';
import { useCategories } from '@/hooks/use-categories';

interface AdvancedHeaderProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  promoVisible?: boolean;
  setCategories?: (cats: string[]) => void;
}

export const AdvancedHeader: React.FC<AdvancedHeaderProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  promoVisible,
}) => {
  // Mover el hook useCategories al inicio del componente
  const { mainCategories, subcategoriesByParent } = useCategories();
  const { user, isAuthenticated, login } = useAuth();
  const { getItemCount } = useCart();
  const navigate = useNavigate();
  // const [showAuthModal, setShowAuthModal] = useState(false); // No longer needed
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [apto, setApto] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const isMobile = useIsMobile();
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Refs and state for scrollbar indicators
  const desktopScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [desktopScrollPosition, setDesktopScrollPosition] = useState({ top: "0%", height: "20%" });
  const [mobileScrollPosition, setMobileScrollPosition] = useState({ top: "0%", height: "20%" });

  const itemCount = getItemCount();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí puedes hacer la búsqueda o pasar el valor al componente de productos
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '543873439775'; // Número de WhatsApp de la tienda
    const message = encodeURIComponent('¡Hola! Me gustaría hacer un pedido desde CONETING POS. Estoy interesado en conocer más sobre sus productos y servicios.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const scrollToProducts = () => {
    const productsSection = document.getElementById('productos');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Busca el usuario en Firestore por su UID
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || '');
          setApto(userDoc.data().departmentNumber || '');
        } else {
          setUserName(firebaseUser.email || '');
          setApto('');
        }
      } else {
        setUserName('');
        setApto('');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
  };
  
  // Handle scroll position for scrollbar indicators
  const handleDesktopScroll = () => {
    if (desktopScrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = desktopScrollContainerRef.current;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * 100);
      const thumbPosition = scrollPercentage * (100 - thumbHeight);
      setDesktopScrollPosition({
        top: `${thumbPosition}%`,
        height: `${thumbHeight}%`
      });
    }
  };
  
  const handleMobileScroll = () => {
    if (mobileScrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mobileScrollContainerRef.current;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * 100);
      const thumbPosition = scrollPercentage * (100 - thumbHeight);
      setMobileScrollPosition({
        top: `${thumbPosition}%`,
        height: `${thumbHeight}%`
      });
    }
  };

  return (
    <>
      <header className={`fixed z-50 w-full bg-white border-b border-slate-200 shadow-lg transition-all duration-300 ${promoVisible ? "top-9" : "top-0"}`}>
        <div className="container mx-auto px-0 md:px-0 w-[95%] lg:w-[94%] max-w-[1900px]">
          {/* Main header */}
          <div className="flex h-16 md:h-20 items-center justify-between w-full">
            {/* Mobile Menu Button - Solo visible en móvil */}
            <button 
              className="block sm:hidden p-2" 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menú"
            >
              {showMobileMenu ? (
                <X className="h-6 w-6 text-neutral-800" />
              ) : (
                <Menu className="h-6 w-6 text-neutral-800" />
              )}
            </button>
            
            {/* Logo */}
            <div className="flex items-center space-x-3 flex-shrink-0 ml-3 sm:ml-6 md:ml-10 lg:ml-14">
              <div className="relative group flex items-center space-x-2">
                {/* Modern logo with gradient and effects */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-2 rounded-lg border border-slate-300/20">
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-sm">C</span>
                    </div>
                  </div>
                </div>
                {/* Brand text */}
                <div className="hidden sm:block">
                  <div className="text-lg font-black bg-gradient-to-r from-slate-800 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
                    CONETING POS
                  </div>
                  <div className="text-xs text-slate-600 font-medium -mt-1">
                    NEXT GEN SYSTEM
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile search button - Solo visible en móvil */}
            <button 
              className="block sm:hidden p-2" 
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              aria-label="Buscar"
            >
              <Search className="h-6 w-6 text-neutral-800" />
            </button>
            
            {/* Centered Search Bar - Oculto en móvil por defecto */}
            <div className={`${showMobileSearch ? 'flex flex-col absolute top-16 left-0 right-0 px-2 bg-white z-50 border-b border-slate-200 py-2' : 'hidden'} sm:relative sm:flex-1 sm:flex sm:flex-row sm:top-0 sm:border-0 sm:py-0 sm:justify-center sm:items-center sm:pl-6 md:pl-10 lg:pl-14`}>
              {/* Mobile Category Selector - Only visible when mobile search is active */}
              <div className={`${showMobileSearch ? 'block mb-2' : 'hidden'} sm:hidden w-full relative`}>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // Navigate to the selected category
                    navigate(`/?category=${e.target.value}`);
                    // Hide mobile search after selection
                    setShowMobileSearch(false);
                  }}
                  className="w-full py-3 px-3 pr-10 rounded-lg border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-0 transition-all bg-transparent text-neutral-900 text-sm font-medium appearance-none"
                  aria-label="Seleccionar categoría"
                >
                  <option value="Todos">Todas las categorías</option>
                  {mainCategories.map((category) => (
                    category.name !== "Todos" && (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    )
                  ))}
                </select>
                {/* Flecha indicadora para móvil */}
                <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="bg-[#FF914D]/10 rounded-full p-1">
                    <ChevronDown className="h-4 w-4 text-[#FF914D]" />
                  </div>
                </div>
              </div>

              {/* Desktop Category Selector - Only visible on desktop */}
              <div className="hidden sm:block mr-3 relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // Navigate to the selected category
                    navigate(`/?category=${e.target.value}`);
                  }}
                  className="h-11 sm:h-12 pl-3 pr-10 rounded-none border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-0 transition-all bg-transparent text-neutral-900 text-sm font-medium cursor-pointer appearance-none"
                  aria-label="Seleccionar categoría"
                >
                  <option value="Todos">Todas las categorías</option>
                  {mainCategories.map((category) => (
                    category.name !== "Todos" && (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    )
                  ))}
                </select>
                {/* Flecha indicadora más visible y con animación */}
                <div className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center justify-center">
                  <div className="bg-[#FF914D]/10 rounded-full p-1">
                    <ChevronDown className="h-4 w-4 text-[#FF914D]" />
                  </div>
                </div>
              </div>
              
              <form
                onSubmit={handleSearch}
                className="w-full max-w-2xl"
              >
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar productos, marcas..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pr-12 sm:pr-14 pl-4 py-2 sm:py-3 h-11 sm:h-12 border-2 border-slate-300 focus:border-neutral-900 focus:ring-neutral-800 transition-all bg-white text-neutral-900 shadow-md text-center font-['Poppins',sans-serif] text-base sm:text-lg"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-neutral-900 rounded p-1 sm:p-1.5">
                    <Search className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </form>
              {showMobileSearch && (
                <button className="absolute top-3 right-4" onClick={() => setShowMobileSearch(false)}>
                  <X className="h-5 w-5 text-neutral-500" />
                </button>
              )}
            </div>

            {/* Actions + Support Center */}
            <div className="flex items-center space-x-4 md:space-x-5 flex-shrink-0 mr-0 sm:mr-6 md:mr-12 lg:mr-16">
              {/* Centro de Soporte */}
              <div className="hidden md:flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#FF914D]" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M14.414 7l3.293-3.293a1 1 0 00-1.414-1.414L13 5.586V4a1 1 0 10-2 0v4.003a.996.996 0 00.617.921A.997.997 0 0012 9h4a1 1 0 100-2h-1.586z" />
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ fontFamily: "'Poppins', sans-serif" }}>Centro de soporte</span>
                </div>
                <span className="text-xs text-gray-600" style={{ fontFamily: "'Poppins', sans-serif" }}>+54 387 343-9775</span>
              </div>
              
              {/* Favoritos */}
              <div className="hidden md:block">
                <button className="flex items-center justify-center p-2" aria-label="Favoritos">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-600 hover:text-[#FF914D] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Cart Button - sin estilos */}
              <div className="relative">
                <button
                  onClick={() => setShowCart(true)}
                  className="flex items-center justify-center p-2"
                  aria-label="Carrito de compras"
                >
                  <ShoppingCart className="h-6 w-6 text-neutral-600 hover:text-[#FF914D] transition-colors" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 md:h-6 md:w-6 flex items-center justify-center p-0 bg-[#FF914D] text-white text-xs font-bold">
                      {itemCount}
                    </Badge>
                  )}
                </button>
              </div>

              {/* User Actions */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-2 md:space-x-3 pr-0 sm:pr-2 md:pr-4">
                  <div className="relative group">
                    <div className="flex items-center space-x-2 cursor-pointer">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
                        {/* Avatar aleatorio basado en la primera letra del nombre */}
                        {userName ? (
                          <div className="w-full h-full flex items-center justify-center bg-[#FF914D]/80 text-white font-bold">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex flex-col text-left">
                        <div className="text-sm font-medium" style={{ fontFamily: "'Poppins', sans-serif" }}>
                          <span className="text-neutral-600">Hola, </span>
                          <span className="text-[#FF914D]">{userName ? userName.split(' ')[0] : 'Usuario'}</span>
                        </div>
                        <div className="text-xs text-slate-600 group-hover:text-[#FF914D] transition-colors" style={{ fontFamily: "'Poppins', sans-serif" }}>
                          Mi cuenta
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-neutral-500 group-hover:text-[#FF914D] transition-colors" />
                    </div>

                    {/* Menú desplegable */}
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 hidden group-hover:block">
                      <div className="py-1">
                        <button 
                          onClick={() => navigate('/perfil')}
                          className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-slate-100 transition-colors"
                          style={{ fontFamily: "'Poppins', sans-serif" }}
                        >
                          Mi perfil
                        </button>
                        <button 
                          onClick={() => navigate('/admin')}
                          className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-slate-100 transition-colors"
                          style={{ fontFamily: "'Poppins', sans-serif" }}
                        >
                          Panel de administración
                        </button>
                        <hr className="my-1 border-slate-200" />
                        <button 
                          onClick={() => {
                            auth.signOut();
                            navigate('/');
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100 transition-colors"
                          style={{ fontFamily: "'Poppins', sans-serif" }}
                        >
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center space-x-2 group cursor-pointer pr-0 sm:pr-2 md:pr-4"
                  aria-label="Iniciar sesión"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="text-sm font-medium" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      <span className="text-neutral-600">Inicia sesión</span>
                    </div>
                    <div className="text-xs text-slate-600 group-hover:text-[#FF914D] transition-colors" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      Mi cuenta
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Navigation - Categorías */}
          {/* Sub barra de navegación - Visible solo en desktop por defecto */}
  <div className={`fixed left-0 right-0 border-b border-slate-200 shadow-sm ${showMobileMenu ? 'block' : 'hidden sm:block'}`} style={{ background: '#ffffff', width: '100vw', zIndex: 49 }}>
          <nav className="container mx-auto px-4 py-4 text-base text-neutral-800 tracking-wide" style={{ fontFamily: "'Poppins', 'Montserrat', sans-serif" }}>
          {/* Botón Todas las Categorías alineado con el carrusel (corrido un poco más a la derecha) */}
          <div className="absolute left-12 md:left-20 lg:left-28">
            <button 
              onClick={scrollToProducts}
              className="flex items-center gap-1 bg-[#FF914D] text-white py-1 px-3 rounded-md shadow-sm hover:bg-[#FF8030] transition-all text-xs font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Todas las categorías</span>
            </button>
          </div>
          
          {/* Navegación para móvil - lista vertical */}
          <div className={`sm:hidden ${showMobileMenu ? 'block' : 'hidden'} space-y-4`} style={{ fontFamily: "'Poppins', sans-serif" }}>
            {/* Todas las categorías en móvil */}
            <button
              className="flex w-full justify-between items-center py-2 border-b border-slate-200 uppercase tracking-widest text-sm font-medium"
              onClick={() => {
                scrollToProducts();
                setShowMobileMenu(false);
              }}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#FF914D]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Todas las categorías</span>
              </div>
            </button>
            
            {/* Sección de productos en móvil */}
            <div>
              <button
                className="flex w-full justify-between items-center py-2 border-b border-slate-200 uppercase tracking-widest text-sm font-medium"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span>Productos</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'transform rotate-180' : ''}`} />
              </button>
              {showDropdown && (
                <div 
                  ref={mobileScrollContainerRef}
                  onScroll={handleMobileScroll}
                  className="pl-4 mt-2 space-y-2 max-h-80 overflow-y-auto relative pr-6 scrollbar-container">
                  {/* Botones de navegación simplificados */}
                  <div className="absolute right-1 top-0 bottom-0 flex flex-col items-center justify-between py-2">
                    {/* Botón hacia arriba */}
                    <button 
                      className="p-1 bg-orange-100 hover:bg-orange-200 rounded-full shadow-sm"
                      onClick={() => {
                        if (mobileScrollContainerRef.current) {
                          mobileScrollContainerRef.current.scrollTop -= 100;
                        }
                      }}
                      aria-label="Desplazar hacia arriba"
                    >
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    
                    {/* Botón hacia abajo */}
                    <button 
                      className="p-1 bg-orange-100 hover:bg-orange-200 rounded-full shadow-sm"
                      onClick={() => {
                        if (mobileScrollContainerRef.current) {
                          mobileScrollContainerRef.current.scrollTop += 100;
                        }
                      }}
                      aria-label="Desplazar hacia abajo"
                    >
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Indicador simplificado */}
                  <div className="w-full flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 font-medium">Categorías</span>
                    <span className="text-xs text-orange-600 font-medium">Usa los botones →</span>
                  </div>
                  {/* Categorías principales */}
                  <div className="mb-3 pr-3">
                    <h4 className="font-semibold text-sm text-gray-500 mb-2 pb-1 border-b">Categorías principales</h4>
                    {mainCategories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setShowDropdown(false);
                          setShowMobileMenu(false);
                          // Redirigir a la página principal con la categoría seleccionada
                          navigate(`/?category=${cat.name}`);
                        }}
                        className={`block w-full text-left py-2.5 px-2 rounded-md mb-1 ${
                          selectedCategory === cat.name ? "font-bold text-orange-600 bg-orange-50 border-l-2 border-orange-500" : "text-neutral-700 hover:bg-gray-50"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  {/* Subcategorías agrupadas por categoría principal */}
                  {Object.entries(subcategoriesByParent).map(([parentName, subs]) => (
                    <div key={parentName} className="mb-3">
                      <h4 className="font-semibold text-sm text-gray-500 mt-2 mb-1 border-t pt-2">{parentName}</h4>
                      {subs.map((subcat) => (
                        <button
                          key={subcat.name}
                          onClick={() => {
                            setSelectedCategory(parentName);
                            setShowDropdown(false);
                            setShowMobileMenu(false);
                            // Redirigir con ambos parámetros
                            navigate(`/?category=${parentName}&subcategory=${subcat.name}`);
                          }}
                          className="block w-full text-left py-2 pl-3 text-neutral-600 text-sm rounded hover:bg-gray-50 mb-0.5"
                        >
                          {subcat.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
                
                {/* Otros enlaces en móvil */}
                <a 
                  href="#novedades" 
                  className="block py-2 border-b border-slate-200 uppercase tracking-widest text-sm font-medium" 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMobileMenu(false);
                    const element = document.getElementById('novedades');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      // If not on home page, navigate to home page with anchor
                      navigate('/#novedades');
                    }
                  }}
                >
                  Novedades
                </a>
                <button type="button" className="block w-full text-left py-2 border-b border-slate-200 uppercase tracking-widest text-sm font-medium" onClick={() => { setShowMobileMenu(false); navigate('/sobre-nosotros'); }}>Sobre nosotros</button>
                <button type="button" className="block w-full text-left py-2 border-b border-slate-200 uppercase tracking-widest text-sm font-medium" onClick={() => { setShowMobileMenu(false); navigate('/envios'); }}>Envíos</button>
                <button type="button" className="block w-full text-left py-2 border-b border-slate-200 uppercase tracking-widest text-sm font-medium" onClick={() => { setShowMobileMenu(false); navigate('/testimonios'); }}>Testimonios</button>
                <button type="button" className="block w-full text-left py-2 uppercase tracking-widest text-sm font-medium" onClick={() => { setShowMobileMenu(false); navigate('/retiros'); }}>Retiros</button>
              </div>

              {/* Navegación para desktop - horizontal */}
              <div className="hidden sm:flex justify-center w-full">
                <div className="flex gap-8 md:gap-12 items-center justify-center">
                  {/* Dropdown Productos */}
                  <div
                    className="relative"
                    onMouseEnter={() => {
                      if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
                      setShowDropdown(true);
                    }}
                    onMouseLeave={() => {
                      dropdownTimeout.current = setTimeout(() => setShowDropdown(false), 250);
                    }}
                  >
                    <button
                      className="hover:text-[#FF914D] transition-colors flex items-center gap-1 uppercase tracking-widest text-sm font-medium"
                      aria-haspopup="true"
                      aria-expanded={showDropdown}
                    >
                      Productos
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    {showDropdown && (
                      <div className="absolute left-0 mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
                        <div className="py-2 relative">
                          {/* Botones de navegación simplificados */}
                          <div className="absolute right-1 top-2 bottom-2 flex flex-col items-center justify-between">
                            {/* Botón hacia arriba */}
                            <button 
                              className="p-1 bg-blue-100 hover:bg-blue-200 rounded-full shadow-sm"
                              onClick={() => {
                                if (desktopScrollContainerRef.current) {
                                  desktopScrollContainerRef.current.scrollTop -= 100;
                                }
                              }}
                              aria-label="Desplazar hacia arriba"
                            >
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            
                            {/* Botón hacia abajo */}
                            <button 
                              className="p-1 bg-blue-100 hover:bg-blue-200 rounded-full shadow-sm"
                              onClick={() => {
                                if (desktopScrollContainerRef.current) {
                                  desktopScrollContainerRef.current.scrollTop += 100;
                                }
                              }}
                              aria-label="Desplazar hacia abajo"
                            >
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          
                          {/* Contenedor scrollable */}
                          <div 
                            ref={desktopScrollContainerRef}
                            onScroll={handleDesktopScroll}
                            className="max-h-96 overflow-y-auto pr-6 scrollbar-container">
                            {/* Sección de categorías principales */}
                            <div className="mb-4 px-4">
                              <h4 className="font-medium text-sm text-gray-500 mb-2 pb-1 border-b border-gray-100 uppercase tracking-wider">Categorías principales</h4>
                              <ul className="grid grid-cols-2 gap-1">
                                {mainCategories.map((cat) => (
                                  <li key={cat.name} className="flex">
                                    <button
                                      onClick={() => {
                                        setSelectedCategory(cat.name);
                                        setShowDropdown(false);
                                        // Redirigir a la página principal con la categoría seleccionada
                                        navigate(`/?category=${cat.name}`);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[#FF914D]/10 hover:text-[#FF914D] transition-colors rounded-md ${
                                        selectedCategory === cat.name ? "font-medium text-[#FF914D] bg-[#FF914D]/10 border-l-2 border-[#FF914D]" : "text-neutral-800 border-l border-transparent"
                                      }`}
                                      style={{ fontFamily: "'Poppins', sans-serif" }}
                                    >
                                      {cat.name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Mostrar subcategorías agrupadas */}
                            {Object.entries(subcategoriesByParent).map(([parentName, subs]) => (
                              <div key={parentName} className="mb-4 px-4">
                                <h4 className="font-medium text-sm text-gray-500 mt-3 mb-2 border-t pt-2 pb-1 border-b border-gray-100 uppercase tracking-wider">
                                  {parentName}
                                </h4>
                                <ul className="grid grid-cols-2 gap-1">
                                  {subs.map((subcat) => (
                                    <li key={subcat.name} className="flex">
                                      <button
                                        onClick={() => {
                                          // Primero seleccionar la categoría padre
                                          setSelectedCategory(parentName);
                                          setShowDropdown(false);
                                          // Redirigir con ambos parámetros
                                          navigate(`/?category=${parentName}&subcategory=${subcat.name}`);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FF914D]/10 hover:text-[#FF914D] transition-colors rounded-md text-neutral-700 border-l border-transparent hover:border-l-[#FF914D]"
                                        style={{ fontFamily: "'Poppins', sans-serif" }}
                                      >
                                        {subcat.name}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <a 
                    href="#novedades" 
                    className="hover:text-[#FF914D] transition-colors uppercase tracking-widest text-sm font-medium relative after:content-[''] after:absolute after:h-0.5 after:w-0 after:bottom-[-4px] after:left-0 after:bg-[#FF914D] after:transition-all hover:after:w-full"
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById('novedades');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        // If not on home page, navigate to home page with anchor
                        navigate('/#novedades');
                      }
                    }}
                  >
                    Novedades
                  </a>
                  <button type="button" className="hover:text-[#FF914D] transition-colors uppercase tracking-widest text-sm font-medium relative after:content-[''] after:absolute after:h-0.5 after:w-0 after:bottom-[-4px] after:left-0 after:bg-[#FF914D] after:transition-all hover:after:w-full bg-transparent" style={{outline: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer'}} onClick={() => navigate('/sobre-nosotros')}>Sobre nosotros</button>
                  <button type="button" className="hover:text-[#FF914D] transition-colors uppercase tracking-widest text-sm font-medium relative after:content-[''] after:absolute after:h-0.5 after:w-0 after:bottom-[-4px] after:left-0 after:bg-[#FF914D] after:transition-all hover:after:w-full bg-transparent" style={{outline: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer'}} onClick={() => navigate('/envios')}>Envíos</button>
                  <button type="button" className="hover:text-[#FF914D] transition-colors uppercase tracking-widest text-sm font-medium relative after:content-[''] after:absolute after:h-0.5 after:w-0 after:bottom-[-4px] after:left-0 after:bg-[#FF914D] after:transition-all hover:after:w-full bg-transparent" style={{outline: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer'}} onClick={() => navigate('/testimonios')}>Testimonios</button>
                  <button type="button" className="hover:text-[#FF914D] transition-colors uppercase tracking-widest text-sm font-medium relative after:content-[''] after:absolute after:h-0.5 after:w-0 after:bottom-[-4px] after:left-0 after:bg-[#FF914D] after:transition-all hover:after:w-full bg-transparent" style={{outline: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer'}} onClick={() => navigate('/retiros')}>Retiros</button>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Modals */}
      {/* <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} /> */}
      <CartSidebar isOpen={showCart} onClose={() => setShowCart(false)} />
     
    </>
  );
};
