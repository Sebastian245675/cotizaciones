import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { AdvancedHeroSection } from '@/components/home/AdvancedHeroSection';
import { ProductsSection } from '@/components/products/ProductsSection';
import LatestProductsGrid from '@/components/products/LatestProductsGrid';
import { FilteredCategoriesDisplay } from '@/components/products/FilteredCategoriesDisplay';
import './ad-sidebar.css';
import './company-carousel.css'; // Importamos los estilos para el carrusel de empresas
import './advanced-index.css';
import './enhanced-effects.css'; // Nuevos efectos mejorados
import '@/components/ui/lantern.css'; // Importamos los estilos para los faroles
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { MagneticButton } from '@/components/ui/magnetic-button';
import Lantern from '@/components/ui/Lantern';
import { FloatingParticles } from '@/components/ui/floating-particles';
import { ProductCarousel } from '@/components/home/ProductCarousel';
import CompanyCarousel from '@/components/home/CompanyCarousel';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/use-categories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoriasSidebar } from '@/components/products/CategoriasSidebar';
import FillerContent from '@/components/products/FillerContent';
import '@/components/products/main.css';

// Estilos adicionales para elementos específicos
import './advanced-index.css';
import {
  Shield,
  Zap,
  Heart,
  Search,
  Star,
  Clock,
  Award,
  Smartphone,
  MessageCircle,
  Mail,
  MapPin,
  Phone
} from 'lucide-react';

// Colores más neutros y profesionales
const themeColors = {
  primary: {
    light: "from-slate-400 to-gray-600", // Neutro gris
    main: "bg-slate-700",
    text: "text-slate-700",
    accent: "text-slate-900",
    hover: "hover:bg-slate-200",
  },
  secondary: {
    light: "from-blue-400 to-indigo-600", // Azul profesional
    main: "bg-blue-600",
    text: "text-blue-600",
    accent: "text-blue-800",
    hover: "hover:bg-blue-100",
  },
  neutral: {
    background: "bg-gray-50",
    card: "bg-white",
    text: "text-gray-800",
    footer: "bg-gray-900"
  }
};

const carouselImages = [
  "/principio1.jpg",
  "/principio2.jpg",
  "/principio3.jpg"
];

// El componente del carrusel se ha movido a su propio archivo en: src/components/home/ProductCarousel.tsx

const AdvancedIndex = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [promoVisible, setPromoVisible] = useState(true);
  // Estados para el formulario
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [conjunto, setConjunto] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { categories, setCategories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('Todas');
  const [selectedTerceraCategoria, setSelectedTerceraCategoria] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Función para actualizar la URL con los filtros seleccionados
  const updateUrlWithFilters = (category: string, subcategory?: string, terceraCat?: string, search?: string) => {
    const newParams = new URLSearchParams();
    
    if (category && category !== "Todos") {
      newParams.set('category', category);
    }
    
    if (subcategory && subcategory !== "Todas") {
      newParams.set('subcategory', subcategory);
    }
    
    if (terceraCat && terceraCat !== "Todas") {
      newParams.set('tercera', terceraCat);
    }
    
    if (search && search.trim() !== "") {
      newParams.set('search', search.trim());
    }
    
    navigate(`${location.pathname}?${newParams.toString()}`);
  };
  
  // Estado para las imágenes publicitarias verticales
  const [adImagesPool] = useState([
    "https://images.unsplash.com/photo-1614771637369-ed94441a651a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=800&q=80",
    "https://images.unsplash.com/photo-1556905200-bd982f883637?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=900&q=80",
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=850&q=80",
    "https://images.unsplash.com/photo-1583845112203-29329902332e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=880&q=80",
    "https://images.unsplash.com/photo-1611930022073-84a47d7a3bbe?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=900&q=80",
    "https://images.unsplash.com/photo-1600950207944-0d63e8edbc3f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=800&q=80",
    "https://images.unsplash.com/photo-1601924638867-3a6de6b7a500?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=860&q=80",
    "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=890&q=80"
  ]);
  
  // Estado para las imágenes que se mostrarán
  const [adImages, setAdImages] = useState(adImagesPool.slice(0, 4));
  const productSectionRef = useRef<HTMLDivElement>(null);
  const adsContainerRef = useRef<HTMLDivElement>(null);
  
  // Estado para mostrar comentarios en el espacio sobrante
  const [showComments, setShowComments] = useState(false);
  
  // Array de comentarios destacados más elaborados y detallados
  const featuredComments = [
    { 
      author: "María Luisa Rodríguez", 
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      rating: 5, 
      content: "¡Los productos que compré son realmente increíbles! Pedí varios artículos de decoración y todos llegaron en perfectas condiciones, con un empaquetado excelente y mucho antes de lo esperado. La calidad es superior a lo que imaginaba por las fotos. Definitivamente volveré a comprar y ya he recomendado esta tienda a todos mis amigos y familiares. El servicio de seguimiento del envío también funcionó perfectamente.",
      date: "10/08/2025",
      productBought: "Set de decoración Premium",
      verified: true
    },
    { 
      author: "Carlos Alberto Mendoza", 
      avatar: "https://randomuser.me/api/portraits/men/22.jpg",
      rating: 5, 
      content: "La atención al cliente es verdaderamente excepcional. Tuve un inconveniente con mi pedido inicial: recibí un modelo diferente al que había solicitado. Me comuniqué con el soporte y no solo lo solucionaron de inmediato, sino que me enviaron el producto correcto sin costo adicional y me permitieron quedarme con el producto equivocado como compensación. Este tipo de servicio es lo que marca la diferencia. Sin duda, la mejor experiencia de compra online que he tenido en mucho tiempo.",
      date: "05/08/2025",
      productBought: "Smartphone XYZ Pro Max",
      verified: true
    },
    { 
      author: "Andrea Miranda González", 
      avatar: "https://randomuser.me/api/portraits/women/29.jpg",
      rating: 5, 
      content: "He realizado más de 10 compras en esta tienda durante el último año y la calidad ha sido constante en todos los productos. Lo que más valoro es la consistencia: siempre recibes exactamente lo que ves en las fotos, con las especificaciones correctas y en el tiempo prometido. Mi última compra fue un conjunto de muebles para mi oficina en casa, y la relación calidad-precio es inmejorable. El proceso de armado fue sencillo gracias a las instrucciones detalladas. La entrega fue rápida y los transportistas fueron muy amables y cuidadosos.",
      date: "01/08/2025",
      productBought: "Set Oficina Ergonómica Plus",
      verified: true
    },
    { 
      author: "Roberto Sánchez Vega", 
      avatar: "https://randomuser.me/api/portraits/men/62.jpg",
      rating: 4, 
      content: "Compré varios productos electrónicos para regalar en Navidad y quedé muy satisfecho con casi todos. Los auriculares inalámbricos superaron mis expectativas en cuanto a calidad de sonido y duración de la batería. La tablet tiene un rendimiento excelente para su rango de precio. Solo tuve un pequeño problema con el smartwatch que no se sincronizaba correctamente, pero el equipo de soporte técnico me guió por videollamada para solucionarlo. Me impresionó su paciencia y conocimiento. Los tiempos de entrega fueron precisos, aunque me hubiera gustado opciones de envoltura para regalo.",
      date: "28/07/2025",
      productBought: "Pack Tech Family Premium",
      verified: true
    },
    {
      author: "Laura Jiménez Torres",
      avatar: "https://randomuser.me/api/portraits/women/55.jpg",
      rating: 5,
      content: "No puedo estar más conforme con mi experiencia de compra. Adquirí un juego completo de cocina profesional que había estado comparando en varias tiendas durante meses. No solo encontré el mejor precio aquí, sino que la calidad es superior a lo que había visto en tiendas físicas mucho más caras. Los cuchillos mantienen su filo perfectamente después de semanas de uso intensivo, y las ollas distribuyen el calor de manera uniforme. El servicio de instalación opcional para la campana extractora también fue excelente. Los técnicos fueron puntuales, profesionales y dejaron todo impecable.",
      date: "15/07/2025",
      productBought: "Set Cocina Profesional Deluxe",
      verified: true
    }
  ];
  
  // Manejar la categoría y subcategoría desde la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    const subcategoryParam = params.get('subcategory');
    const terceraParam = params.get('tercera');
    const searchParam = params.get('search');
    
    // Actualizar estados basados en parámetros URL
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    
    if (subcategoryParam) {
      setSelectedSubcategory(subcategoryParam);
    }
    
    if (terceraParam) {
      setSelectedTerceraCategoria(terceraParam);
    }
    
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    
    // Si hay parámetros, desplazar a la sección de productos
    if (categoryParam || subcategoryParam || terceraParam || searchParam) {
      // Desplazar a la sección de productos
      setTimeout(() => {
        const productosSection = document.getElementById('productos');
        if (productosSection) {
          productosSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, [location.search, categories]);
  
  // Efecto para ajustar la cantidad de imágenes según la altura de la sección de productos
  // y decidir si mostrar comentarios en el espacio sobrante
  useEffect(() => {
    const adjustImagesAndCheckSpace = () => {
      if (productSectionRef.current) {
        const productSectionHeight = productSectionRef.current.offsetHeight;
        
        // Altura estimada para las imágenes incluyendo gap (espacio entre ellas)
        const imageHeightWithGap = 520; // 500px altura promedio + 20px de gap
        
        // Calculamos cuántas imágenes necesitamos para llenar el espacio
        // Dejamos un margen del 75% del espacio para evitar llenar todo el contenido con imágenes
        const desiredFillHeight = productSectionHeight * 0.75;
        const neededImages = Math.max(2, Math.floor(desiredFillHeight / imageHeightWithGap));
        
        // Aseguramos que no exceda el total disponible y mostremos al menos 2 imágenes
        const imagesToShow = Math.min(neededImages, adImagesPool.length);
        setAdImages(adImagesPool.slice(0, imagesToShow));
        
        // Si la altura estimada de las imágenes es menor que la altura de la sección de productos,
        // decidimos mostrar comentarios en el espacio sobrante
        const totalImagesHeight = imagesToShow * imageHeightWithGap;
        
        // Si hay suficiente espacio sobrante (más de 300px o 20% de la altura total), mostramos los comentarios
        const minSpaceForComments = Math.max(300, productSectionHeight * 0.20);
        setShowComments(productSectionHeight > (totalImagesHeight + minSpaceForComments));
        
        // Registrar información para depuración (puedes quitar estos console.log en producción)
        console.log('Altura de la sección de productos:', productSectionHeight);
        console.log('Imágenes a mostrar:', imagesToShow);
        console.log('Altura estimada de imágenes:', totalImagesHeight);
        console.log('¿Mostrar comentarios?', productSectionHeight > (totalImagesHeight + 300));
      }
    };

    // Ajustar las imágenes cuando la página se cargue completamente
    window.addEventListener('load', adjustImagesAndCheckSpace);
    
    // También ajustar cuando cambie la categoría después de un pequeño retraso
    // para permitir que los productos se carguen
    const timer = setTimeout(adjustImagesAndCheckSpace, 1000);
    
    // Ajustar también después de un tiempo más largo para asegurar que todos los 
    // productos se han cargado y renderizado completamente
    const secondTimer = setTimeout(adjustImagesAndCheckSpace, 3000);

    // Añadir un listener para el evento de redimensionamiento de la ventana
    window.addEventListener('resize', adjustImagesAndCheckSpace);

    return () => {
      window.removeEventListener('load', adjustImagesAndCheckSpace);
      window.removeEventListener('resize', adjustImagesAndCheckSpace);
      clearTimeout(timer);
      clearTimeout(secondTimer);
    };
  }, [selectedCategory, adImagesPool]);

  // Registro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Guarda datos adicionales en Firestore
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        email,
        conjunto
      });
      setSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
      setIsLogin(true);
      setEmail('');
      setPassword('');
      setConjunto('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess('¡Bienvenido!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeSuccess, setSubscribeSuccess] = useState("");
  const [subscribeError, setSubscribeError] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeSuccess("");
    setSubscribeError("");
    if (!subscribeEmail || !subscribeEmail.includes("@")) {
      setSubscribeError("Por favor ingresa un email válido.");
      return;
    }
    try {
      await addDoc(collection(db, "suscripciones"), {
        email: subscribeEmail,
        createdAt: serverTimestamp(),
      });
      setSubscribeSuccess("¡Te suscribiste correctamente! Pronto recibirás nuestras ofertas.");
      setSubscribeEmail("");
    } catch {
      setSubscribeError("Hubo un error. Intenta de nuevo.");
    }
  };

  // Botón flotante de WhatsApp
  const whatsappNumber = '+543873439775';
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden font-sans">
      {/* Efectos de fondo mejorados */}
      <div className="interactive-grid"></div>
      <div className="particle particle-1"></div>
      <div className="particle particle-2"></div>
      <div className="particle particle-3"></div>
      
      {/* Botón flotante WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg p-4 flex items-center justify-center transition-all hover-shadow-pulse"
        title="Contactar por WhatsApp"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <path d="M21.67 20.29l-1.2-4.28A8.94 8.94 0 0 0 12 3a9 9 0 0 0-9 9c0 2.39.93 4.58 2.62 6.29l-1.2 4.28a1 1 0 0 0 1.28 1.28l4.28-1.2A8.94 8.94 0 0 0 21 21a1 1 0 0 0 .67-1.71z"></path>
          <path d="M16.24 11.06a4 4 0 0 1-4.24 4.24"></path>
        </svg>
      </a>

      <div className="w-full">
        <TopPromoBar setPromoVisible={setPromoVisible} />
      </div>
      <AdvancedHeader
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        promoVisible={promoVisible}
      />

      <main className="relative z-10 w-full">
        {/* Carrusel con nueva estructura: 1 imagen grande izquierda, 2 pequeñas apiladas derecha */}
        <div className="pt-8 pb-10 lg:pt-12 lg:pb-16">
          <ProductCarousel images={carouselImages} />
        </div>

        {/* Products Section with Categories Display - Alineado con el carrusel */}
        <section id="productos" className="pb-20 relative">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 relative w-[95%] lg:w-[94%] max-w-[1900px]">
            <div className="lg:hidden mt-6 mb-8">
              {/* Selector de categorías para móvil */}
              <Select 
                value={selectedCategory} 
                onValueChange={(value) => setSelectedCategory(value)}
              >
                <SelectTrigger className="w-full max-w-xs mx-auto border-slate-300 focus:border-blue-500 bg-white shadow-sm">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas las categorías</SelectItem>
                  {categories.filter(cat => cat !== "Ofertas").map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/4 xl:w-1/5 flex flex-col gap-6">
                {/* Barra lateral de categorías - Visible en desktop, oculto en móvil por defecto */}
                <div className="bg-white/80 backdrop-blur-sm p-4 shadow-md border border-slate-200 hidden lg:block">
                  <h3 className="text-xl font-bold mb-4 pb-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-slate-800">Categorías</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-md font-medium">{categories.length}</span>
                  </h3>
                
                {/* Barra de búsqueda para categorías */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar categoría..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                
                {/* Lista de categorías */}
                <div className="space-y-1 divide-y divide-slate-100">
                  {/* Opción "Todos" siempre visible */}
                  <div>
                    <button
                      onClick={() => {
                        setSelectedCategory("Todos");
                        setSelectedSubcategory("Todas");
                        setSelectedTerceraCategoria("Todas");
                        updateUrlWithFilters("Todos");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center ${
                        selectedCategory === "Todos"
                          ? "bg-slate-100 font-medium text-blue-600 border-l-2 border-blue-500"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="mr-2">🏠</span>
                      Todos los productos
                    </button>
                  </div>
                  
                  {/* Categoría Ofertas destacada */}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setSelectedCategory("Ofertas");
                        setSelectedSubcategory("Todas");
                        setSelectedTerceraCategoria("Todas");
                        updateUrlWithFilters("Ofertas");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center ${
                        selectedCategory === "Ofertas"
                          ? "bg-red-50 font-medium text-red-600 border-l-2 border-red-500"
                          : "hover:bg-red-50/30 text-red-600 bg-red-50/10"
                      }`}
                    >
                      <span className="mr-2">🔥</span>
                      Ofertas Especiales
                    </button>
                  </div>
                  
                  {/* Categorías principales con subcategorías anidadas */}
                  <div className="pt-1">
                    <CategoriasSidebar 
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      selectedSubcategory={selectedSubcategory}
                      setSelectedSubcategory={setSelectedSubcategory}
                      selectedTerceraCategoria={selectedTerceraCategoria}
                      setSelectedTerceraCategoria={setSelectedTerceraCategoria}
                    />
                  </div>
                </div>
                
                {/* Accesos rápidos */}
                <div className="mt-6">
                  <h4 className="font-medium text-sm mb-2 text-slate-500">Accesos rápidos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      className="text-xs p-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex flex-col items-center"
                      onClick={() => {
                        setSelectedCategory("Novedades");
                        setSelectedSubcategory("Todas");
                      }}
                    >
                      <span className="text-lg mb-1">✨</span>
                      Novedades
                    </button>
                    <button 
                      className="text-xs p-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors flex flex-col items-center"
                      onClick={() => {
                        setSelectedCategory("Populares");
                        setSelectedSubcategory("Todas");
                      }}
                    >
                      <span className="text-lg mb-1">👑</span>
                      Populares
                    </button>
                  </div>
                </div>
                </div>
                
                {/* Imágenes publicitarias verticales - columna separada con comentarios si hay espacio */}
                <div ref={adsContainerRef} className="hidden lg:flex flex-col gap-20 sticky top-24 ad-sidebar">
                  {/* Imágenes publicitarias */}
                  {adImages.map((imageUrl, index) => (
                    <a 
                      key={index} 
                      href="#" 
                      className={`ad-image-container block shadow-lg ${
                        index % 2 === 0 ? 'h-[450px] ad-image-medium' : 'h-[500px] ad-image-tall'
                      }`}
                    >
                      <img 
                        src={imageUrl} 
                        alt="Publicidad" 
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                      <div className="ad-image-label">
                        <h4 className="ad-image-title">
                          {index % 3 === 0 ? 'Ofertas especiales' : index % 3 === 1 ? 'Nuevos productos' : 'Envíos gratis'}
                        </h4>
                        <p className="ad-image-description">
                          {index % 3 === 0 ? 'Descubre los mejores precios' : index % 3 === 1 ? 'Recién llegados esta semana' : 'En compras superiores a $15.000'}
                        </p>
                      </div>
                    </a>
                  ))}
                  
                  {/* Comentarios destacados individuales y elegantes */}
                  {showComments && (
                    <>
                      {/* Sin título flotante - Eliminado según solicitud */}
                      <div className="mt-20 mb-24"></div>
                      
                      {/* Comentarios separados individualmente */}
                      {featuredComments.map((comment, idx) => (
                        <div 
                          key={idx} 
                          className="mb-32 last:mb-12 comment-card"
                        >
                          <div className="bg-white shadow-xl overflow-hidden transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                            {/* Cabecera del comentario con degradado azul oscuro #081351 */}
                            <div className="bg-[#081351] p-1"></div>
                            
                            <div className="p-7">
                              {/* Contenido principal del comentario */}
                              <div className="flex flex-col">
                                {/* Foto de perfil y calificación */}
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <div className="relative mr-5">
                                      <img 
                                        src={comment.avatar} 
                                        alt={comment.author} 
                                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                                      />
                                      {comment.verified && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 border-2 border-white">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-lg text-slate-800">{comment.author}</h4>
                                      <div className="flex mt-1">
                                        {[...Array(5)].map((_, i) => (
                                          <span key={i} className={`${i < comment.rating ? 'text-yellow-500' : 'text-gray-200'} text-lg`}>★</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Fecha y producto */}
                                  <div className="text-right">
                                    <p className="text-xs text-slate-500 mb-1">{comment.date}</p>
                                    <div className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                      </svg>
                                      {comment.productBought}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Contenido del comentario con comillas decorativas */}
                                <div className="mt-6 relative">
                                  <div className="absolute -left-2 -top-2 text-5xl text-blue-200/50">"</div>
                                  <p className="text-slate-700 leading-relaxed pl-6 pr-2 italic">
                                    {comment.content}
                                  </p>
                                  <div className="absolute -right-1 bottom-0 text-5xl text-blue-200/50">"</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Contenido de relleno después de los comentarios - Solo se muestra cuando hay espacio extra */}
                      {featuredComments.length > 0 && (
                        <FillerContent />
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Banner publicitario móvil - solo visible en dispositivos pequeños */}
              <div className="lg:hidden w-full overflow-x-auto no-scrollbar mb-6">
                <div className="flex gap-8 px-2 py-4">
                  {adImagesPool.slice(0, 3).map((imageUrl, index) => (
                    <a 
                      key={index} 
                      href="#" 
                      className="flex-shrink-0 w-36 h-48 rounded-xl overflow-hidden shadow-md"
                    >
                      <img 
                        src={imageUrl} 
                        alt="Publicidad" 
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </div>
              
              {/* Contenido principal - Productos organizados por categoría */}
              <div className="lg:w-3/4 xl:w-4/5" ref={productSectionRef}>
                <FilteredCategoriesDisplay 
                  selectedCategory={selectedCategory}
                  selectedSubcategory={selectedSubcategory}
                  selectedTerceraCategoria={selectedTerceraCategoria}
                />
              </div>
            </div>
          </div>
          
          {/* Sección de Productos Destacados con estilo de cuadrícula igual al resto de productos */}
          <div id="novedades" className="container mx-auto px-4 md:px-8 lg:px-12 w-[95%] lg:w-[94%] max-w-[1900px] mt-16" style={{ scrollMarginTop: '120px' }}>
            <div className="flex flex-col">
              {/* Contenedor para LatestProductsGrid con banner */}
              <div className="w-full">
                <LatestProductsGrid maxItems={6} sortBy="createdAt" sortOrder="desc" />
              </div>
            </div>
          </div>
        </section>

        {/* <AdvancedHeroSection /> */} {/* Elimina o comenta esta línea */}

        {/* Sección de Innovación y Experiencia Premium */}
        <section className="py-16 md:py-24 relative bg-gradient-to-b from-white to-blue-50/50 overflow-hidden">
          {/* Elementos decorativos de fondo mejorados */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 -left-20 w-72 h-72 bg-slate-200/30 rounded-full blur-3xl"></div>
            <div className="hidden md:block absolute top-40 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl"></div>
            <div className="hidden lg:block absolute top-20 left-1/4 w-48 h-48 bg-slate-300/10 rounded-full blur-2xl"></div>
            <div className="hidden lg:block absolute bottom-40 right-1/3 w-36 h-36 bg-blue-300/10 rounded-full blur-2xl"></div>
          </div>

          <div className="container mx-auto px-4 md:px-8 lg:px-12 relative w-[95%] lg:w-[94%] max-w-[1900px] relative z-10">
            {/* Encabezado renovado con diseño moderno */}

          </div>
        </section>

        {/* Sección avanzada de Empresas que han confiado en nosotros con Swiper */}
        <section className="py-16 relative overflow-hidden" style={{ backgroundColor: "#FF914D" }}>
          {/* Efectos visuales de fondo */}
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,transparent,black)] opacity-10"></div>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
          
          {/* Contenedor de faroles decorativos mejorados */}
          <div className="lantern-container relative z-20">
            <Lantern 
              position="left" 
              offset={-40} 
              size="large" 
              illuminationDelay={200}
              style={{left: '4%'}} 
            />
            <Lantern 
              position="right" 
              offset={-20} 
              illuminationDelay={400}
              style={{right: '4%'}} 
            />
            <Lantern 
              position="left" 
              offset={60} 
              size="small" 
              illuminationDelay={600}
              style={{left: '15%'}} 
            />
            <Lantern 
              position="right" 
              offset={80} 
              size="small" 
              illuminationDelay={800}
              style={{right: '15%'}} 
            />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            {/* Encabezado con animación */}
            <div className="text-center mb-12" data-aos="fade-up">
              <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-white text-[#FF914D] inline-block mb-4">
                Partners estratégicos
              </span>
              <h2 className="text-3xl lg:text-5xl font-black mb-4 text-white relative">
                Empresas que han confiado en nosotros
                <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1.5 bg-white rounded-full"></span>
              </h2>
              <p className="text-lg text-white text-opacity-90 max-w-3xl mx-auto mt-6">
                Brindamos soluciones personalizadas a diversas empresas y organizaciones con excelentes resultados.
                Nuestro compromiso con la calidad y la innovación nos ha permitido establecer relaciones duraderas.
              </p>
            </div>
            
            {/* Importamos el componente CompanyCarousel desde un archivo separado */}
            <React.Suspense fallback={
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            }>
              <CompanyCarousel />
            </React.Suspense>
          </div>
        </section>

        {/* Sección de Suscripción */}
        <div className="w-[80%] mx-auto mt-20 rounded-2xl p-10 shadow-2xl border border-neutral-200 text-center relative overflow-hidden"
     style={{ background: "rgba(30,30,30,0.06)", backdropFilter: "blur(2px)" }}>
          <h3 className="text-2xl md:text-3xl font-extrabold text-neutral-900 mb-3 mt-2 tracking-wide uppercase">
            Recibí las ofertas antes que nadie
          </h3>
          <p className="mb-8 text-neutral-700 text-base md:text-lg font-medium">
            Déjanos tu email para enviarte promociones y lanzamientos personalizados.
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 items-center justify-center max-w-3xl mx-auto">
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={subscribeEmail}
              onChange={e => setSubscribeEmail(e.target.value)}
              className="flex-1 p-4 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white/90 placeholder:text-neutral-400 text-neutral-900"
              required
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-slate-800 via-blue-600 to-slate-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:scale-105 transition-all text-lg"
            >
              Suscribirme
            </button>
          </form>
          {subscribeSuccess && <div className="text-green-700 mt-6 font-semibold">{subscribeSuccess}</div>}
          {subscribeError && <div className="text-red-600 mt-6 font-semibold">{subscribeError}</div>}
          <div className="absolute -bottom-8 right-8 text-5xl opacity-10 pointer-events-none select-none">
    <Mail className="w-16 h-16 text-neutral-900" />
  </div>
        </div>


        {/* Advanced Footer */}
        <footer className="relative py-20 mt-20 bg-neutral-800">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          <div className="w-[95%] mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-12 mb-12">
              <div className="space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3">
                  <img src="/logo-nuevo.png" alt="REGALA ALGO Logo" className="h-16 w-auto" />
                  <AnimatedGradientText size="lg">REGALA ALGO</AnimatedGradientText>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Lo que trta la tienda. La mejor experiencia de compra para encontrar el regalo perfecto.
                  Tecnología de vanguardia al servicio de tu comodidad.
                </p>
                <div className="flex space-x-4">
                  <MagneticButton variant="ghost" className="p-3">
                    <Smartphone className="h-5 w-5" />
                  </MagneticButton>
                  <MagneticButton variant="ghost" className="p-3">
                    <MessageCircle className="h-5 w-5" />
                  </MagneticButton>
                  <MagneticButton variant="ghost" className="p-3">
                    <Mail className="h-5 w-5" />
                  </MagneticButton>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-6 text-lg">Soporte 24/7</h4>
                <ul className="space-y-4 text-gray-300">
                  {['Centro de Ayuda', 'Garantía Premium'].map((item) => (
                    <li key={item} className="hover:text-blue-400 transition-colors cursor-pointer">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-6 text-lg">Contacto</h4>
                <div className="space-y-4 text-gray-300">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="h-5 w-5 text-blue-400" />
                    <span>WhatsApp: +54 3873439775</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-400" />
                    <span>Regalo.Algo@gmail.com</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span>Instagram: <a href="https://www.instagram.com/regala.algo?igsh=OWk2enhxYzg2eHVq" target="_blank" className="text-blue-400 hover:underline">@regala.algo</a></span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                    </svg>
                    <span>Facebook: <a href="https://www.facebook.com/Regala.Algo" target="_blank" className="text-blue-400 hover:underline">Regala Algo</a></span>
                  </div>
                  <div className="flex items-center space-x-3">
                    
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <span>24/7 - Siempre Disponible</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-6 text-lg">Enlaces Rápidos</h4>
                <ul className="space-y-4 text-gray-300">
                  {['Catálogo Completo', 'Ofertas Especiales', 'Mi Cuenta', 'Mis Pedidos'].map((item) => (
                    <li key={item} className="hover:text-blue-400 transition-colors cursor-pointer">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <GlassmorphismCard className="p-6 bg-neutral-700/80 border-none">
              <div className="text-center">
                <p className="text-gray-200">
                  &copy; 2025 REGALA ALGO Premium. Todos los derechos reservados. 
                  <span className="text-blue-400 font-semibold"> sebastian</span>
                </p>
              </div>
            </GlassmorphismCard>
          </div>
        </footer>
      </main>
      
      {/* Botón flotante de WhatsApp */}
      <a 
        href="https://wa.me/543873439775" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:bg-green-600 transition-all hover:scale-110 z-50"
        aria-label="Contáctanos por WhatsApp"
      >
        <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </a>
    </div>
  );
};

export default AdvancedIndex;
