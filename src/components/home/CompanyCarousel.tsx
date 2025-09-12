import React, { useState, useEffect } from 'react';
// Importamos los tipos de Swiper
import type { Swiper as SwiperType } from 'swiper';
// Importamos los estilos en el componente
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Interface para las propiedades de las empresas
interface Company {
  name: string;
  description: string;
  logo?: string;
  year: string;
  color: string;
  testimonial: string;
  contact: string;
}

const CompanyCarousel: React.FC = () => {
  // Usamos lazy loading para importar Swiper sólo del lado del cliente
  const [swiper, setSwiper] = useState<{
    Swiper: any;
    SwiperSlide: any;
    Autoplay: any;
    EffectCoverflow: any;
    Navigation: any;
    Pagination: any;
  } | null>(null);

  useEffect(() => {
    // Importamos Swiper dinámicamente sólo en el cliente
    const loadSwiper = async () => {
      try {
        const SwiperReact = await import('swiper/react');
        const SwiperModules = await import('swiper/modules');
        
        setSwiper({
          Swiper: SwiperReact.Swiper,
          SwiperSlide: SwiperReact.SwiperSlide,
          Autoplay: SwiperModules.Autoplay,
          EffectCoverflow: SwiperModules.EffectCoverflow,
          Navigation: SwiperModules.Navigation,
          Pagination: SwiperModules.Pagination
        });
      } catch (error) {
        console.error("Error cargando Swiper:", error);
      }
    };
    
    loadSwiper();
  }, []);
  
  // Lista de empresas para el carrusel
  const companies: Company[] = [
    {
      name: "TechVision Inc.",
      description: "Proveedor de tecnología innovadora especializado en soluciones inteligentes para el hogar y oficina.",
      logo: "/logo-tech-vision.png", // Usa un logo de respaldo si este no existe
      year: "2023",
      color: "from-blue-500 to-blue-700",
      testimonial: "La calidad y atención al detalle en sus productos ha superado nuestras expectativas.",
      contact: "Carlos Méndez, CTO"
    },
    {
      name: "EcoSmart Group",
      description: "Empresa líder en soluciones sustentables y productos eco-amigables para el mercado corporativo.",
      logo: "/logo-ecosmart.png",
      year: "2021",
      color: "from-green-500 to-teal-700",
      testimonial: "Han sido un aliado clave en nuestra transformación hacia prácticas más sustentables.",
      contact: "Laura Fernández, CEO"
    },
    {
      name: "Corp Solutions",
      description: "Empresa de consultoría estratégica que ofrece servicios integrales a compañías de todos los tamaños.",
      logo: "/logo-corpsolutions.png",
      year: "2022",
      color: "from-purple-600 to-indigo-700",
      testimonial: "Su enfoque personalizado ha sido fundamental para el éxito de nuestros proyectos conjuntos.",
      contact: "Martín Gómez, Director"
    },
    {
      name: "Creative Works",
      description: "Estudio de diseño y marketing digital con enfoque en experiencias de usuario innovadoras.",
      logo: "/logo-creative.png",
      year: "2023",
      color: "from-orange-500 to-red-600",
      testimonial: "Su creatividad y capacidad de respuesta han transformado nuestra imagen de marca.",
      contact: "Ana Torres, Directora Creativa"
    },
    {
      name: "Financial Partners",
      description: "Grupo financiero especializado en inversiones y gestión de patrimonio para clientes premium.",
      logo: "/logo-financial.png",
      year: "2022",
      color: "from-slate-700 to-slate-900",
      testimonial: "Productos de alta calidad que han satisfecho las expectativas de nuestros clientes más exigentes.",
      contact: "Roberto Sánchez, Gerente"
    },
    {
      name: "Global Health",
      description: "Red de clínicas y centros de salud comprometidos con el bienestar integral y la medicina preventiva.",
      logo: "/logo-health.png",
      year: "2021",
      color: "from-sky-500 to-cyan-700",
      testimonial: "Han entendido perfectamente las necesidades específicas del sector salud.",
      contact: "Dra. Claudia Martínez, Directora"
    }
  ];
  
  // Función para generar un logo de empresa de respaldo
  const generateFallbackLogo = (name: string, bgColor: string) => {
    const initials = name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
    return (
      <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${bgColor} flex items-center justify-center text-white text-2xl font-bold`}>
        {initials}
      </div>
    );
  };
  
  // Si Swiper aún no está cargado, mostramos un indicador de carga
  if (!swiper) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }
  
  const { Swiper, SwiperSlide, Autoplay, EffectCoverflow, Pagination, Navigation } = swiper;
  
  return (
    <>
      <Swiper
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        loop={true}
        slidesPerView={'auto'}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 100,
          modifier: 2.5,
          slideShadows: true,
        }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{ 
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={true}
        modules={[Autoplay, EffectCoverflow, Pagination, Navigation]}
        className="companies-swiper mt-10"
        style={{ 
          width: '100%', 
          padding: '50px 0', 
          '--swiper-navigation-color': '#ffffff', 
          '--swiper-pagination-color': '#ffffff',
          '--swiper-navigation-size': '30px',
        } as React.CSSProperties}
      >
        {companies.map((company, index) => (
          <SwiperSlide key={index} style={{ width: '350px', height: 'auto' }}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group mx-4 company-card-hover">
              {/* Cabecera con gradiente */}
              <div className={`h-6 bg-gradient-to-r ${company.color} w-full`}></div>
              
              {/* Contenido principal */}
              <div className="p-8">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Logo de la empresa con efecto de pulso */}
                  <div className="relative mb-4 sm:mb-0 flex-shrink-0 pulse-effect">
                    {generateFallbackLogo(company.name, company.color)}
                  </div>
                  
                  {/* Información de la empresa */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{company.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Cliente desde {company.year}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 my-4">
                  {company.description}
                </p>
                
                {/* Testimonial con diseño atractivo y efecto de borde */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg relative testimonial-card">
                  <svg className="h-8 w-8 text-blue-300 absolute -top-4 left-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-gray-700 italic text-sm pl-7">
                    "{company.testimonial}"
                  </p>
                  <p className="text-right text-gray-500 text-xs mt-2">
                    {company.contact}
                  </p>
                </div>
                
                {/* Botón de acción con efecto hover */}
                <div className="mt-6 text-center">
                  <button className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-300 hover:scale-105 text-sm font-medium shadow-sm group-hover:shadow-md">
                    Ver caso de éxito
                  </button>
                </div>
              </div>
              
              {/* Decoración inferior con animación */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
};

export default CompanyCarousel;
