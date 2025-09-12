import React, { useEffect, useState, useRef } from "react";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/contexts/AuthContext";
import { db } from '@/firebase';
import { collection, getDoc, doc, getDocs, addDoc, query, where, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Star, Quote, Check, Edit, Trash2, X, PenLine, Send, AlertCircle, MessageCircle, ThumbsUp, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Testimonio {
  id: string;
  nombre: string;
  comentario: string;
  calificacion: number;
  fecha: Date;
  imagenUrl?: string;
  profesion?: string;
  userId?: string;
  email?: string;
  productoComprado?: string;
  fotoProducto?: string;
}

// Variantes para animaciones
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 100
    } as any
  },
  hover: {
    y: -10,
    scale: 1.02,
    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.3 }
  }
};

const carouselVariants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    };
  }
};

const Testimonios = () => {
  const { categories } = useCategories();
  const { user, isAuthenticated, currentUser } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [promoVisible, setPromoVisible] = useState(true);
  const [info, setInfo] = useState<{ content: string; enabled: boolean } | null>(null);
  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioYaComentó, setUsuarioYaComentó] = useState<boolean>(false);
  const [miTestimonio, setMiTestimonio] = useState<Testimonio | null>(null);
  const [formTestimonio, setFormTestimonio] = useState({
    comentario: "",
    calificacion: 5,
    profesion: "",
    productoComprado: ""
  });
  const [enviandoTestimonio, setEnviandoTestimonio] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editando, setEditando] = useState<boolean>(false);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(false);
  const [activeTestimonio, setActiveTestimonio] = useState<string | null>(null);
  const [filtroCalificacion, setFiltroCalificacion] = useState<number | null>(null);
  const [testimoniosDestacados, setTestimoniosDestacados] = useState<Testimonio[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    promedio: 0,
    cinco: 0,
    cuatro: 0,
    tres: 0,
    dos: 0,
    uno: 0
  });

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      // Intentar obtener contenido personalizado primero
      const docRef = doc(db, 'infoSections', 'testimonios');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setInfo({
          content: docSnap.data().content || '',
          enabled: docSnap.data().enabled ?? false,
        });
      } else {
        setInfo(null);
      }

      // Obtener testimonios (si existe la colección)
      try {
        const testimoniosSnapshot = await getDocs(collection(db, 'testimonios'));
        const testimoniosList: Testimonio[] = [];
        testimoniosSnapshot.forEach(doc => {
          const data = doc.data();
          testimoniosList.push({
            id: doc.id,
            nombre: data.nombre || 'Cliente',
            comentario: data.comentario || '',
            calificacion: data.calificacion || 5,
            fecha: data.fecha?.toDate() || new Date(),
            imagenUrl: data.imagenUrl || '',
            profesion: data.profesion || '',
            userId: data.userId || '',
            email: data.email || '',
            productoComprado: data.productoComprado || '',
            fotoProducto: data.fotoProducto || ''
          });
        });
        
        // Solo usar testimonios reales de la base de datos
        // Ordenar por fecha (más recientes primero)
        testimoniosList.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        setTestimonios(testimoniosList);
        
        // Seleccionar testimonios destacados (calificación 5 y comentarios de al menos 100 caracteres)
        const destacados = testimoniosList
          .filter(t => t.calificacion === 5 && t.comentario.length >= 100)
          .slice(0, 5);
        
        // Si no hay suficientes testimonios que cumplan los criterios, tomar los mejores disponibles
        if (destacados.length < 3) {
          const mejores = [...testimoniosList]
            .sort((a, b) => b.calificacion - a.calificacion || b.comentario.length - a.comentario.length)
            .slice(0, 3);
          setTestimoniosDestacados(mejores);
        } else {
          setTestimoniosDestacados(destacados);
        }
        
        // Calcular estadísticas
        if (testimoniosList.length > 0) {
          const total = testimoniosList.length;
          const suma = testimoniosList.reduce((acc, t) => acc + t.calificacion, 0);
          const promedio = Math.round((suma / total) * 10) / 10;
          
          const cinco = testimoniosList.filter(t => t.calificacion === 5).length;
          const cuatro = testimoniosList.filter(t => t.calificacion === 4).length;
          const tres = testimoniosList.filter(t => t.calificacion === 3).length;
          const dos = testimoniosList.filter(t => t.calificacion === 2).length;
          const uno = testimoniosList.filter(t => t.calificacion === 1).length;
          
          setEstadisticas({
            total,
            promedio,
            cinco,
            cuatro,
            tres,
            dos,
            uno
          });
        }
        
        // Verificar si el usuario ya ha comentado
        if (user) {
          const miTestimonio = testimoniosList.find(t => t.userId === user.id);
          if (miTestimonio) {
            setUsuarioYaComentó(true);
            setMiTestimonio(miTestimonio);
            setFormTestimonio({
              comentario: miTestimonio.comentario || '',
              calificacion: miTestimonio.calificacion || 5,
              profesion: miTestimonio.profesion || '',
              productoComprado: miTestimonio.productoComprado || ''
            });
          }
        }
      } catch (error) {
        console.error("Error obteniendo testimonios:", error);
        setTestimonios([]); // En caso de error, mostramos una lista vacía en lugar de testimonios de muestra
      }

      setLoading(false);
    };
    
    fetchInfo();
  }, [user]);
  
  // Función para renderizar estrellas según la calificación
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <motion.div
          key={i}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
        >
          <Star
            className={`h-4 w-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        </motion.div>
      );
    }
    return stars;
  };
  
  // Función para renderizar estrellas seleccionables con animación
  const renderSelectableStars = (selectedRating: number, onSelect: (rating: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <motion.div
          key={i}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <Star
            className={`h-7 w-7 cursor-pointer transition-colors duration-200 ${
              i <= selectedRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-200"
            }`}
            onClick={() => onSelect(i)}
          />
        </motion.div>
      );
    }
    return stars;
  };
  
  // Función para manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormTestimonio(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Función para guardar un nuevo testimonio
  const guardarTestimonio = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para dejar un testimonio",
        variant: "destructive"
      });
      return;
    }
    
    if (!formTestimonio.comentario) {
      toast({
        title: "Error",
        description: "Por favor, escribe un comentario",
        variant: "destructive"
      });
      return;
    }
    
    setEnviandoTestimonio(true);
    
    try {
      // Si está editando, actualizar el testimonio existente
      if (editando && miTestimonio) {
        await updateDoc(doc(db, "testimonios", miTestimonio.id), {
          comentario: formTestimonio.comentario,
          calificacion: formTestimonio.calificacion,
          profesion: formTestimonio.profesion,
          productoComprado: formTestimonio.productoComprado,
          fechaActualizado: serverTimestamp()
        });
        
        // Actualizar el estado local
        const testimonioActualizado: Testimonio = {
          ...miTestimonio,
          comentario: formTestimonio.comentario,
          calificacion: formTestimonio.calificacion,
          profesion: formTestimonio.profesion,
          productoComprado: formTestimonio.productoComprado,
          fecha: new Date() // Esto es solo para la visualización, en Firestore usamos serverTimestamp()
        };
        
        setMiTestimonio(testimonioActualizado);
        setTestimonios(prev => prev.map(t => t.id === miTestimonio.id ? testimonioActualizado : t));
        
        toast({
          title: "¡Éxito!",
          description: "Tu testimonio ha sido actualizado correctamente",
          variant: "default"
        });
      } else {
        // Crear un nuevo testimonio
        const nuevoTestimonio = {
          nombre: user.name || user.email?.split('@')[0] || "Usuario",
          email: user.email,
          comentario: formTestimonio.comentario,
          calificacion: formTestimonio.calificacion,
          profesion: formTestimonio.profesion,
          productoComprado: formTestimonio.productoComprado,
          fecha: serverTimestamp(),
          userId: user.id,
          imagenUrl: currentUser?.photoURL || ""
        };
        
        const docRef = await addDoc(collection(db, "testimonios"), nuevoTestimonio);
        
        // Agregar el nuevo testimonio al estado local
        const testimonioParaMostrar: Testimonio = {
          id: docRef.id,
          ...nuevoTestimonio,
          fecha: new Date() // Esto es solo para la visualización, en Firestore usamos serverTimestamp()
        };
        
        setMiTestimonio(testimonioParaMostrar);
        setTestimonios(prev => [testimonioParaMostrar, ...prev]);
        setUsuarioYaComentó(true);
        
        toast({
          title: "¡Gracias por tu opinión!",
          description: "Tu testimonio ha sido publicado correctamente",
          variant: "default"
        });

        // Actualizar estadísticas
        setEstadisticas(prev => {
          const newTotal = prev.total + 1;
          const newSuma = prev.promedio * prev.total + formTestimonio.calificacion;
          const newPromedio = Math.round((newSuma / newTotal) * 10) / 10;
          
          // Actualizar el contador de la calificación correspondiente
          const newStats = { ...prev, total: newTotal, promedio: newPromedio };
          switch (formTestimonio.calificacion) {
            case 5: newStats.cinco++; break;
            case 4: newStats.cuatro++; break;
            case 3: newStats.tres++; break;
            case 2: newStats.dos++; break;
            case 1: newStats.uno++; break;
          }
          
          return newStats;
        });
      }
      
      setModalOpen(false);
      setEditando(false);
    } catch (error) {
      console.error("Error al guardar el testimonio:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar tu testimonio. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setEnviandoTestimonio(false);
    }
  };
  
  // Función para eliminar un testimonio
  const eliminarTestimonio = async () => {
    if (!miTestimonio || !isAuthenticated) return;
    
    try {
      await deleteDoc(doc(db, "testimonios", miTestimonio.id));
      
      // Actualizar estado local
      setTestimonios(prev => prev.filter(t => t.id !== miTestimonio.id));
      setMiTestimonio(null);
      setUsuarioYaComentó(false);
      
      // Actualizar estadísticas
      setEstadisticas(prev => {
        if (prev.total <= 1) return {
          total: 0, promedio: 0, cinco: 0, cuatro: 0, tres: 0, dos: 0, uno: 0
        };
        
        const newTotal = prev.total - 1;
        const newSuma = prev.promedio * prev.total - miTestimonio.calificacion;
        const newPromedio = Math.round((newSuma / newTotal) * 10) / 10;
        
        // Actualizar el contador de la calificación correspondiente
        const newStats = { ...prev, total: newTotal, promedio: newPromedio };
        switch (miTestimonio.calificacion) {
          case 5: newStats.cinco = Math.max(0, newStats.cinco - 1); break;
          case 4: newStats.cuatro = Math.max(0, newStats.cuatro - 1); break;
          case 3: newStats.tres = Math.max(0, newStats.tres - 1); break;
          case 2: newStats.dos = Math.max(0, newStats.dos - 1); break;
          case 1: newStats.uno = Math.max(0, newStats.uno - 1); break;
        }
        
        return newStats;
      });
      
      toast({
        title: "Testimonio eliminado",
        description: "Tu testimonio ha sido eliminado correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al eliminar testimonio:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el testimonio",
        variant: "destructive"
      });
    }
  };

  // Componente de gráfico de barras para calificaciones
  const RatingBar = ({ count, total, rating }: { count: number, total: number, rating: number }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <div className="flex items-center gap-2 mb-2">
        <div className="w-24 text-sm text-gray-600 flex items-center">
          <span>{rating} {rating === 1 ? 'estrella' : 'estrellas'}</span>
        </div>
        <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
          />
        </div>
        <div className="w-10 text-right text-sm text-gray-600">
          {count}
        </div>
      </div>
    );
  };
  
  // Componente para las estadísticas animadas
  const AnimatedCounter = ({ value, label, icon }: { value: number, label: string, icon: React.ReactNode }) => {
    const [count, setCount] = useState(0);
    const counterRef = useRef(null);
    
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            let start = 0;
            const increment = value / 40;
            const timer = setInterval(() => {
              start += increment;
              if (start > value) {
                setCount(value);
                clearInterval(timer);
              } else {
                setCount(Math.floor(start));
              }
            }, 30);
            
            return () => clearInterval(timer);
          }
        },
        { threshold: 0.2 }
      );
      
      if (counterRef.current) {
        observer.observe(counterRef.current);
      }
      
      return () => {
        if (counterRef.current) observer.unobserve(counterRef.current);
      };
    }, [value]);
    
    return (
      <motion.div
        ref={counterRef}
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center"
      >
        <div className="p-3 rounded-full bg-gradient-to-r from-[#FF914D]/20 to-[#FF914D]/40 mb-3">
          {icon}
        </div>
        <div className="text-3xl font-bold text-[#FF914D]">{count}</div>
        <div className="text-gray-600 text-sm">{label}</div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50 to-white">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          {/* Decorative pattern */}
          <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0 L1000,0 L1000,1000 L0,1000 Z" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,100 C150,50 200,50 250,100 S350,150 400,100 S500,50 550,100 S650,150 700,100 S800,50 850,100 S950,150 1000,100" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,200 C150,150 200,150 250,200 S350,250 400,200 S500,150 550,200 S650,250 700,200 S800,150 850,200 S950,250 1000,200" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,300 C150,250 200,250 250,300 S350,350 400,300 S500,250 550,300 S650,350 700,300 S800,250 850,300 S950,350 1000,300" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,400 C150,350 200,350 250,400 S350,450 400,400 S500,350 550,400 S650,450 700,400 S800,350 850,400 S950,450 1000,400" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,500 C150,450 200,450 250,500 S350,550 400,500 S500,450 550,500 S650,550 700,500 S800,450 850,500 S950,550 1000,500" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,600 C150,550 200,550 250,600 S350,650 400,600 S500,550 550,600 S650,650 700,600 S800,550 850,600 S950,650 1000,600" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,700 C150,650 200,650 250,700 S350,750 400,700 S500,650 550,700 S650,750 700,700 S800,650 850,700 S950,750 1000,700" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,800 C150,750 200,750 250,800 S350,850 400,800 S500,750 550,800 S650,850 700,800 S800,750 850,800 S950,850 1000,800" fill="none" stroke="#FF914D" strokeWidth="1"/>
            <path d="M100,900 C150,850 200,850 250,900 S350,950 400,900 S500,850 550,900 S650,950 700,900 S800,850 850,900 S950,950 1000,900" fill="none" stroke="#FF914D" strokeWidth="1"/>
          </svg>
        </div>
      </div>
      
      {promoVisible && <TopPromoBar setPromoVisible={setPromoVisible} />}
      <AdvancedHeader
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        promoVisible={promoVisible}
      />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-16">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF914D] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-[#FF914D] rounded-full opacity-20 blur-3xl"></div>
        
        <div className="container mx-auto px-4 z-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </motion.div>
            </div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl md:text-7xl font-serif font-bold text-gray-900 mb-6 tracking-tight"
            >
              Lo que nuestros clientes <span className="text-[#FF914D]">opinan</span>
            </motion.h1>
            
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "80px" }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="h-1 bg-[#FF914D] mx-auto mb-6"
            ></motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Conoce las experiencias de quienes han confiado en nosotros y han encontrado las mejores soluciones para sus proyectos
            </motion.p>
          </motion.div>
          
          {/* Testimonios Destacados Carrusel */}
          {testimoniosDestacados.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mb-16 overflow-hidden relative"
            >
              <h2 className="text-2xl font-semibold text-center mb-8">Testimonios destacados</h2>
              
              <div className="relative">
                <div className="overflow-hidden">
                  <div className="flex gap-6 transition-transform duration-500 ease-out pb-8">
                    {testimoniosDestacados.map((testimonio, index) => (
                      <motion.div
                        key={testimonio.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className="min-w-full md:min-w-[500px] bg-white rounded-2xl shadow-lg p-6 border border-orange-100"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16 border-2 border-orange-200">
                              {testimonio.imagenUrl && testimonio.imagenUrl !== '' ? (
                                <AvatarImage src={testimonio.imagenUrl} alt={testimonio.nombre} />
                              ) : (
                                <AvatarFallback className="bg-[#FF914D] text-white text-lg">
                                  {testimonio.nombre && testimonio.nombre.length > 0
                                    ? testimonio.nombre.substring(0, 2).toUpperCase()
                                    : 'US'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md">
                              <Star className="h-4 w-4 fill-white text-white" />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">{testimonio.nombre}</h3>
                                {testimonio.profesion && (
                                  <p className="text-sm text-gray-500">{testimonio.profesion}</p>
                                )}
                              </div>
                              <div className="flex">
                                {renderStars(testimonio.calificacion)}
                              </div>
                            </div>
                            
                            <div className="mt-3 relative">
                              <Quote className="absolute text-orange-100 h-8 w-8 -top-2 -left-2" />
                              <p className="text-gray-700 italic pl-6 line-clamp-3">"{testimonio.comentario}"</p>
                            </div>
                            
                            {testimonio.productoComprado && (
                              <div className="mt-4 text-sm">
                                <span className="font-medium text-[#FF914D]">Producto: </span>
                                <span className="text-gray-700">{testimonio.productoComprado}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-center mt-6 gap-2">
                  {testimoniosDestacados.map((_, index) => (
                    <button
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                        index === 0 ? "bg-[#FF914D]" : "bg-orange-200"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Section */}
          {estadisticas.total > 0 && (
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 1,
                  transition: { duration: 0.8 } 
                }
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
            >
              <AnimatedCounter 
                value={estadisticas.total} 
                label="Testimonios" 
                icon={<MessageCircle className="h-6 w-6 text-[#FF914D]" />} 
              />
              <AnimatedCounter 
                value={estadisticas.promedio} 
                label="Calificación promedio" 
                icon={<Star className="h-6 w-6 fill-yellow-400 text-[#FF914D]" />} 
              />
              <AnimatedCounter 
                value={Math.round((estadisticas.cinco / estadisticas.total) * 100)} 
                label="% de satisfacción" 
                icon={<ThumbsUp className="h-6 w-6 text-[#FF914D]" />} 
              />
            </motion.div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200"></div>
                <div className="w-16 h-16 rounded-full border-4 border-t-[#FF914D] border-r-transparent border-b-transparent border-l-transparent absolute top-0 left-0 animate-spin"></div>
              </div>
            </div>
          ) : info && info.enabled ? (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  transition: { duration: 0.8 } 
                }
              }}
              className="prose prose-lg max-w-none text-gray-800 mb-12 bg-white p-8 rounded-xl shadow-sm"
              dangerouslySetInnerHTML={{ __html: info.content.replace(/\n/g, '<br />') }} 
            />
          ) : null}
        </div>
      </section>
      
      <main className="flex-1 flex flex-col">
        <section className="bg-white py-16 relative z-10">
          <div className="container mx-auto px-4 sm:px-6">
            {isAuthenticated && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: { duration: 0.8 } 
                  }
                }}
                className="mb-16"
              >
                {usuarioYaComentó ? (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-8 rounded-xl shadow-lg border border-orange-100">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-2xl font-semibold text-[#FF914D] flex items-center gap-2">
                        <PenLine className="h-6 w-6" />
                        Tu testimonio
                      </h3>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setEditando(true);
                            setModalOpen(true);
                          }}
                          className="text-[#FF914D] border-orange-200 hover:bg-orange-50"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente tu testimonio y no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={eliminarTestimonio} className="bg-red-600 hover:bg-red-700 text-white">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {miTestimonio && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-lg shadow-sm"
                      >
                        <div className="flex items-center mb-4">
                          <Avatar className="h-14 w-14 border-2 border-orange-200 mr-4">
                            {miTestimonio.imagenUrl && miTestimonio.imagenUrl !== '' ? (
                              <AvatarImage src={miTestimonio.imagenUrl} alt={miTestimonio.nombre} />
                            ) : (
                              <AvatarFallback className="bg-[#FF914D] text-white">
                                {miTestimonio.nombre && miTestimonio.nombre.length > 0
                                  ? miTestimonio.nombre.substring(0, 2).toUpperCase()
                                  : 'US'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-semibold text-lg">{miTestimonio.nombre}</p>
                            {miTestimonio.profesion && (
                              <p className="text-gray-500">{miTestimonio.profesion}</p>
                            )}
                            <div className="flex mt-1">
                              {renderStars(miTestimonio.calificacion)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <Quote className="absolute text-orange-100 h-10 w-10 -top-2 -left-2" />
                          <p className="text-gray-700 italic text-lg pl-5">"{miTestimonio.comentario}"</p>
                        </div>
                        
                        {miTestimonio.productoComprado && (
                          <div className="mt-4 bg-orange-50 p-4 rounded-md text-sm text-gray-600">
                            <p className="font-medium text-[#FF914D] mb-1">Producto comprado:</p>
                            <p>{miTestimonio.productoComprado}</p>
                          </div>
                        )}
                        
                        <p className="mt-4 text-sm text-gray-500">
                          Publicado el {miTestimonio.fecha.toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-8 rounded-xl shadow-lg border border-orange-100">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
                      <div>
                        <h3 className="text-2xl font-semibold text-[#FF914D] flex items-center gap-2 mb-4 md:mb-0">
                          <PenLine className="h-6 w-6" />
                          Comparte tu experiencia
                        </h3>
                      </div>
                      <Button 
                        onClick={() => setModalOpen(true)} 
                        className="bg-[#FF914D] hover:bg-[#e87f3d] text-white"
                      >
                        <PenLine className="h-5 w-5 mr-2" />
                        Escribir mi testimonio
                      </Button>
                    </div>
                    <p className="text-gray-700">
                      Ayuda a otros clientes compartiendo tu experiencia de compra con nosotros. 
                      Tu opinión es valiosa y nos ayuda a seguir mejorando.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Estadísticas de calificaciones */}
            {estadisticas.total > 0 && (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: { duration: 0.8 } 
                  }
                }}
                className="mb-16 bg-white p-6 rounded-xl shadow-md"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  Calificaciones de los clientes
                </h3>
                
                <div className="flex flex-col md:flex-row md:gap-8 md:items-center">
                  <div className="md:w-1/3 mb-6 md:mb-0 flex flex-col items-center justify-center">
                    <div className="text-6xl font-bold text-gray-800">
                      {estadisticas.promedio}
                    </div>
                    <div className="flex mb-2 mt-2">
                      {renderStars(Math.round(estadisticas.promedio))}
                    </div>
                    <div className="text-sm text-gray-500">
                      {estadisticas.total} {estadisticas.total === 1 ? 'valoración' : 'valoraciones'}
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    <RatingBar count={estadisticas.cinco} total={estadisticas.total} rating={5} />
                    <RatingBar count={estadisticas.cuatro} total={estadisticas.total} rating={4} />
                    <RatingBar count={estadisticas.tres} total={estadisticas.total} rating={3} />
                    <RatingBar count={estadisticas.dos} total={estadisticas.total} rating={2} />
                    <RatingBar count={estadisticas.uno} total={estadisticas.total} rating={1} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Filtros de calificación */}
            <div className="mb-8 flex flex-col items-center">
              <h3 className="text-lg font-medium mb-4 text-gray-700">Filtrar por calificación</h3>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button 
                  variant={filtroCalificacion === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroCalificacion(null)}
                  className={filtroCalificacion === null ? "bg-[#FF914D] hover:bg-[#e87f3d]" : "border-orange-200 hover:bg-orange-50"}
                >
                  Todos
                </Button>
                {[5, 4, 3, 2, 1].map(rating => (
                  <Button
                    key={rating}
                    variant={filtroCalificacion === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroCalificacion(rating)}
                    className={`flex items-center gap-1 ${filtroCalificacion === rating ? "bg-[#FF914D] hover:bg-[#e87f3d]" : "border-orange-200 hover:bg-orange-50"}`}
                  >
                    {rating}
                    <Star className={`h-3.5 w-3.5 ${filtroCalificacion === rating ? "text-white" : "text-yellow-500"} ${filtroCalificacion === rating ? "" : "fill-yellow-500"}`} />
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Sección principal de testimonios */}
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {testimonios.length === 0 || (filtroCalificacion !== null && !testimonios.some(t => t.calificacion === filtroCalificacion)) ? (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: { duration: 0.8 } 
                    }
                  }}
                  className="col-span-3 text-center py-16 bg-white rounded-xl shadow-sm"
                >
                  <div className="p-4 rounded-full bg-orange-50 inline-flex mx-auto mb-6">
                    <MessageCircle className="h-10 w-10 text-[#FF914D]" />
                  </div>
                  <p className="text-gray-500 text-xl mb-3">Aún no hay testimonios disponibles.</p>
                  <p className="text-gray-500">¡Sé el primero en compartir tu experiencia!</p>
                  
                  {isAuthenticated ? (
                    !usuarioYaComentó && (
                      <Button 
                        onClick={() => setModalOpen(true)} 
                        className="mt-8 bg-[#FF914D] hover:bg-[#e87f3d]"
                      >
                        <PenLine className="h-5 w-5 mr-2" />
                        Escribir mi testimonio
                      </Button>
                    )
                  ) : (
                    <div className="mt-8">
                      <p className="text-sm text-gray-500 mb-2">Inicia sesión para dejar tu testimonio</p>
                      <Button 
                        onClick={() => setModalOpen(true)}
                        className="bg-[#FF914D] hover:bg-[#e87f3d]"
                      >
                        Iniciar sesión
                      </Button>
                    </div>
                  )}
                </motion.div>
              ) : (
                (filtroCalificacion === null ? testimonios : testimonios.filter(t => t.calificacion === filtroCalificacion)).map((testimonio) => (
                  <motion.div
                    key={testimonio.id}
                    variants={cardVariants}
                    whileHover="hover"
                    onClick={() => setActiveTestimonio(activeTestimonio === testimonio.id ? null : testimonio.id)}
                    className={`transition-all duration-300 ${
                      miTestimonio?.id === testimonio.id ? 'ring-2 ring-[#FF914D]' : ''
                    }`}
                  >
                    <Card className="border-0 shadow-xl h-full overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="p-6 relative bg-gradient-to-br from-orange-50 to-white overflow-hidden">
                          {/* Decorative elements */}
                          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#FF914D]/5 -mr-16 -mt-16 z-0 transition-transform duration-700 group-hover:scale-150 group-hover:rotate-45"></div>
                          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-[#FF914D]/5 -ml-12 -mb-12 z-0 transition-transform duration-700 group-hover:scale-150 group-hover:rotate-45"></div>
                          
                          <Quote className="absolute text-[#FF914D] h-16 w-16 -top-4 -left-4 opacity-20 transition-all duration-300 group-hover:opacity-30 group-hover:scale-110" />
                          
                          <div className="flex items-center justify-between mb-4 mt-2 relative z-10">
                            <div className="flex items-center">
                              <div className="relative">
                                <Avatar className="h-14 w-14 border-2 border-orange-200 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                                  {testimonio.imagenUrl && testimonio.imagenUrl !== '' ? (
                                    <AvatarImage src={testimonio.imagenUrl} alt={testimonio.nombre} />
                                  ) : (
                                    <AvatarFallback className="bg-[#FF914D] text-white">
                                      {testimonio.nombre && testimonio.nombre.length > 0
                                        ? testimonio.nombre.substring(0, 2).toUpperCase()
                                        : 'US'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                {testimonio.calificacion === 5 && (
                                  <motion.div 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.3 }}
                                    className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md"
                                  >
                                    <Star className="h-3 w-3 fill-white text-white" />
                                  </motion.div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center">
                                  <p className="font-semibold text-lg">{testimonio.nombre}</p>
                                </div>
                                {testimonio.profesion && (
                                  <p className="text-sm text-gray-500">{testimonio.profesion}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex bg-white/80 rounded-full px-2 py-1 shadow-sm transition-transform duration-300 group-hover:scale-105">
                              {renderStars(testimonio.calificacion)}
                            </div>
                          </div>
                          
                          <div className="relative mt-4 z-10 bg-white/50 rounded-lg p-4 backdrop-blur-sm border border-orange-50/50 transition-all duration-300 group-hover:bg-white/70 group-hover:shadow-md">
                            {activeTestimonio !== testimonio.id ? (
                              <>
                                <p className="text-gray-700 italic mb-2 line-clamp-3">{testimonio.comentario}</p>
                                {testimonio.comentario.length > 100 && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-10"></div>
                                )}
                              </>
                            ) : (
                              <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="text-gray-700 italic"
                              >
                                "{testimonio.comentario}"
                              </motion.p>
                            )}
                          </div>
                          
                          {testimonio.productoComprado && (
                            <motion.div
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.2, duration: 0.5 }}
                              className="bg-gradient-to-r from-orange-50 to-white p-3 rounded-lg mb-3 text-sm border border-orange-100 mt-4 shadow-sm z-10 relative"
                            >
                              <div className="flex items-center">
                                <div className="p-1.5 rounded-md bg-[#FF914D]/10 mr-2">
                                  <Star className="h-3.5 w-3.5 fill-[#FF914D] text-[#FF914D]" />
                                </div>
                                <div>
                                  <p className="font-medium text-[#FF914D]">Producto comprado:</p>
                                  <p className="text-gray-600">{testimonio.productoComprado}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4 z-10 relative">
                            <p className="text-xs text-gray-500 bg-white/70 rounded-full px-2 py-1">
                              {testimonio.fecha.toLocaleDateString('es-AR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            
                            {testimonio.comentario.length > 100 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-[#FF914D] hover:text-[#e87f3d] hover:bg-orange-50 shadow-sm bg-white/80 transition-all duration-300 group-hover:shadow-md group-hover:bg-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTestimonio(activeTestimonio === testimonio.id ? null : testimonio.id);
                                }}
                              >
                                {activeTestimonio === testimonio.id ? (
                                  <>
                                    <X className="h-3 w-3 mr-1" /> 
                                    Ocultar
                                  </>
                                ) : (
                                  <>
                                    Leer más
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>

            {/* Modal para agregar o editar testimonio */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogContent className="sm:max-w-lg" aria-describedby="dialog-description">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{editando ? 'Editar testimonio' : 'Nuevo testimonio'}</DialogTitle>
                  <p id="dialog-description" className="text-gray-500 mt-2">
                    {editando 
                      ? 'Modifica tu testimonio para compartir tu experiencia actualizada.'
                      : 'Comparte tu experiencia con nuestros productos y ayuda a otros clientes.'}
                  </p>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="calificacion" className="text-base font-medium">Tu calificación</Label>
                    <div className="flex gap-2 py-3">
                      {renderSelectableStars(formTestimonio.calificacion, (rating) => 
                        setFormTestimonio(prev => ({ ...prev, calificacion: rating }))
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="comentario" className="text-base font-medium">Tu comentario</Label>
                    <Textarea 
                      id="comentario"
                      name="comentario"
                      placeholder="Comparte tu experiencia con nuestros productos y servicio..."
                      value={formTestimonio.comentario}
                      onChange={handleFormChange}
                      className="min-h-[150px] text-base"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profesion" className="text-base font-medium">Profesión (opcional)</Label>
                      <Input 
                        id="profesion"
                        name="profesion"
                        placeholder="Ej: Arquitecto, Diseñadora, Ingeniero..."
                        value={formTestimonio.profesion}
                        onChange={handleFormChange}
                        className="text-base"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="productoComprado" className="text-base font-medium">Producto que compraste</Label>
                      <Input 
                        id="productoComprado"
                        name="productoComprado"
                        placeholder="Ej: Material eléctrico, Cable, Iluminación..."
                        value={formTestimonio.productoComprado}
                        onChange={handleFormChange}
                        className="text-base"
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="flex gap-2 items-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setModalOpen(false)}
                    className="border-gray-300"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    onClick={guardarTestimonio}
                    disabled={!formTestimonio.comentario || enviandoTestimonio}
                    className="bg-[#FF914D] hover:bg-[#e87f3d] px-8"
                  >
                    {enviandoTestimonio ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {editando ? 'Actualizar' : 'Publicar'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Sección de invitación para dejar testimonio */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="mt-24 text-center"
            >
              <div className="bg-gradient-to-r from-[#FF914D]/10 via-amber-50 to-[#FF914D]/5 p-14 rounded-2xl shadow-xl relative overflow-hidden border border-[#FF914D]/10">
                {/* Elementos decorativos animados */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0.2 }}
                  animate={{ 
                    scale: [0.8, 1.2, 0.8], 
                    opacity: [0.2, 0.3, 0.2],
                    rotate: [0, 10, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 15,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-20 -right-20 w-80 h-80 bg-[#FF914D]/20 rounded-full blur-2xl"
                ></motion.div>
                
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0.1 }}
                  animate={{ 
                    scale: [0.8, 1, 0.8], 
                    opacity: [0.1, 0.2, 0.1],
                    rotate: [0, -5, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 12,
                    ease: "easeInOut",
                    delay: 2
                  }}
                  className="absolute -bottom-20 -left-10 w-60 h-60 bg-[#FF914D]/10 rounded-full blur-2xl"
                ></motion.div>
                
                <div className="relative z-10">
                  <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="p-5 rounded-full bg-gradient-to-br from-white to-orange-50 inline-flex mx-auto mb-8 shadow-lg"
                  >
                    <div className="bg-[#FF914D] p-3 rounded-full">
                      <Users className="h-10 w-10 text-white" />
                    </div>
                  </motion.div>
                  
                  <motion.h3 
                    initial={{ y: 10, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-4xl font-serif font-bold mb-5 bg-clip-text text-transparent bg-gradient-to-r from-[#FF914D] to-orange-700"
                  >
                    ¿Has comprado con nosotros?
                  </motion.h3>
                  
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto"
                  >
                    Nos encantaría conocer tu opinión. Tu experiencia puede ayudar a otros 
                    clientes a tomar mejores decisiones y nos ayuda a seguir mejorando.
                  </motion.p>
                  
                  {isAuthenticated ? (
                    usuarioYaComentó ? (
                      <motion.div 
                        initial={{ y: 10, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="bg-white p-6 rounded-xl inline-block shadow-lg border border-green-100"
                      >
                        <p className="text-green-600 flex items-center gap-2 font-medium">
                          <div className="bg-green-100 p-1 rounded-full">
                            <Check className="h-5 w-5" />
                          </div>
                          Ya has publicado tu testimonio. ¡Gracias por compartir tu experiencia!
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          onClick={() => setModalOpen(true)} 
                          className="px-12 py-8 bg-gradient-to-r from-[#FF914D] to-[#e87f3d] hover:from-[#e87f3d] hover:to-[#d67535] text-white text-xl shadow-2xl hover:shadow-xl transition-all duration-300 rounded-full font-semibold tracking-wide"
                        >
                          <PenLine className="h-5 w-5 mr-2" />
                          Escribir mi testimonio
                        </Button>
                      </motion.div>
                    )
                  ) : (
                    <motion.div 
                      initial={{ y: 10, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="bg-white/80 p-3 px-5 rounded-full shadow-md">
                        <p className="text-[#FF914D] flex items-center gap-2 font-medium">
                          <AlertCircle className="h-5 w-5" />
                          Inicia sesión para dejar tu testimonio
                        </p>
                      </div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button 
                          onClick={() => setModalOpen(true)}
                          className="px-10 py-7 bg-gradient-to-r from-[#FF914D] to-[#e87f3d] hover:from-[#e87f3d] hover:to-[#d67535] text-white text-lg shadow-xl hover:shadow-lg transition-all duration-300 rounded-full font-medium"
                        >
                          Iniciar sesión
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-gradient-to-b from-white to-orange-50 py-16 mt-16 border-t border-orange-100">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-8"
          >
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FF914D] to-[#e87f3d] rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#FF914D] to-[#e87f3d]">
                  REGALA ALGO
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                Tu proveedor de materiales eléctricos y de construcción de confianza.
              </p>
              <div className="pt-2">
                <div className="flex space-x-3">
                  <a href="#" className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FF914D] text-white transition-transform hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/regala.algo?igsh=OWk2enhxYzg2eHVq" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FF914D] text-white transition-transform hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                  <a href="https://wa.me/543873439775" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FF914D] text-white transition-transform hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-6 text-[#FF914D] border-b border-orange-100 pb-2">Productos</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Materiales Eléctricos
                </li>
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Materiales de Construcción
                </li>
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Herramientas Profesionales
                </li>
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Iluminación
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-6 text-[#FF914D] border-b border-orange-100 pb-2">Servicios</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Asesoría Técnica
                </li>
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Presupuestos
                </li>
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Entregas a Obra
                </li>
                <li className="transition-colors hover:text-[#FF914D] cursor-pointer flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF914D] mr-2"></div>
                  Financiamiento
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-6 text-[#FF914D] border-b border-orange-100 pb-2">Contacto</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <div className="min-w-[20px] mr-2 mt-0.5">📍</div>
                  <span>Olavarría 610 (esquina San Luis)</span>
                </li>
                <li>
                  <a href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw" 
                     className="text-[#FF914D] hover:underline flex items-center ml-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                    </svg>
                    Ver ubicación en el mapa
                  </a>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#FF914D]">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <a href="tel:+543873439775" className="hover:text-[#FF914D] transition-colors">+54 387 343-9775</a>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#FF914D]">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <a href="https://www.instagram.com/regala.algo?igsh=OWk2enhxYzg2eHVq" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF914D] transition-colors">@regala.algo</a>
                </li>
              </ul>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="border-t border-orange-100 mt-10 pt-8 text-center text-sm text-gray-600 flex flex-col md:flex-row justify-between items-center"
          >
            <p>&copy; 2024 REGALA ALGO. Todos los derechos reservados.</p>
            <div className="mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-[#FF914D] mx-2 transition-colors">Términos y condiciones</a>
              <span className="text-gray-300">|</span>
              <a href="#" className="text-gray-500 hover:text-[#FF914D] mx-2 transition-colors">Política de privacidad</a>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default Testimonios;
