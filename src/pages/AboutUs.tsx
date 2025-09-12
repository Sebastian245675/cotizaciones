import React, { useEffect, useState, useRef } from "react";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useCategories } from "@/hooks/use-categories";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { motion } from "framer-motion";

const AboutUs = () => {
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [promoVisible, setPromoVisible] = useState(true);
  const [customInfo, setCustomInfo] = useState(null);
  const [infoEnabled, setInfoEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mission");
  const heroRef = useRef(null);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      const docRef = doc(db, "infoSections", "about");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomInfo(data.content || null);
        setInfoEnabled(data.enabled ?? false);
      }
      setLoading(false);
    };
    fetchInfo();

    // Parallax scroll effect
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrollY * 0.4}px)`;
        heroRef.current.style.opacity = 1 - (scrollY * 0.002);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 80
      }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" } 
    }
  };

  const counterStats = [
    { number: 10, suffix: "+", text: "Años de experiencia" },
    { number: 5000, suffix: "+", text: "Clientes satisfechos" },
    { number: 3000, suffix: "+", text: "Productos disponibles" },
    { number: 200, suffix: "+", text: "Proyectos completados" }
  ];

  const CountUp = ({ target, suffix = "", duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(null);
    
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            let start = 0;
            const end = parseInt(target, 10);
            const increment = end / (duration / 16);
            const timer = setInterval(() => {
              start += increment;
              if (start > end) {
                setCount(end);
                clearInterval(timer);
              } else {
                setCount(Math.floor(start));
              }
            }, 16);
            
            return () => clearInterval(timer);
          }
        },
        { threshold: 0.1 }
      );
      
      if (countRef.current) {
        observer.observe(countRef.current);
      }
      
      return () => {
        if (countRef.current) {
          observer.unobserve(countRef.current);
        }
      };
    }, [target, duration]);
    
    return (
      <span ref={countRef} className="text-4xl md:text-5xl font-bold text-[#FF914D]">
        {count}{suffix}
      </span>
    );
  };

  const testimonialsData = [
    {
      name: "Carlos Rodríguez",
      role: "Constructor",
      image: "/principio1.jpg",
      text: "La calidad de los productos y la atención personalizada que recibí superaron todas mis expectativas. Definitivamente son mi proveedor número uno para todos mis proyectos."
    },
    {
      name: "Laura Méndez",
      role: "Arquitecta",
      image: "/principio2.jpg",
      text: "Encontrar un proveedor confiable y con stock permanente es invaluable en nuestro rubro. Regala Algo siempre cumple con los tiempos y tiene la mejor asesoría técnica."
    },
    {
      name: "Martín Giménez",
      role: "Contratista",
      image: "/principio3.jpg",
      text: "El servicio de entrega en obra ha sido clave para nuestros proyectos. La puntualidad y la calidad de los materiales nos han permitido cumplir con todos nuestros compromisos."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#FF914D] to-[#FF7A1F] z-0"></div>
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          {/* Decorative electric circuit pattern */}
          <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0 L1000,0 L1000,1000 L0,1000 Z" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M200,100 L800,100 L800,900 L200,900 Z" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M300,200 L700,200 L700,800 L300,800 Z" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M400,300 L600,300 L600,700 L400,700 Z" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M100,500 L900,500" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M500,100 L500,900" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="500" cy="500" r="50" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="500" cy="500" r="100" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="500" cy="500" r="150" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="500" cy="500" r="200" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="500" cy="500" r="250" fill="none" stroke="white" strokeWidth="2"/>
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
      
      {/* Hero section with parallax */}
      <div ref={heroRef} className="relative h-[60vh] flex items-center justify-center overflow-hidden z-10">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src="/principio3.jpg" 
            alt="Materiales eléctricos y de construcción" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-[#FF914D]/70 mix-blend-multiply"></div>
        </div>
        <div className="container mx-auto px-4 z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-3xl mx-auto"
          >
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight"
            >
              Iluminamos tus <span className="text-yellow-300">ideas</span> con soluciones brillantes
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="w-24 h-1 bg-yellow-300 mx-auto mb-8"
            ></motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="text-xl md:text-2xl text-white/90 mb-10"
            >
              Más de una década siendo el proveedor de confianza en materiales eléctricos y de construcción
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <a href="#nuestra-historia" className="px-8 py-4 bg-white text-[#FF914D] font-bold rounded-full hover:bg-yellow-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                Conoce nuestra historia
              </a>
              <a href="#productos" className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white/20 transition-all duration-300">
                Ver catálogo
              </a>
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 w-full">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full">
            <path fill="#FFFFFF" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>
      
      <main className="flex-1 flex flex-col bg-white relative z-20">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF914D]"></div>
            <p className="mt-4 text-lg text-gray-600">Cargando información...</p>
          </div>
        ) : infoEnabled && customInfo ? (
          <div className="container mx-auto py-20 px-4">
            <div className="text-lg md:text-xl text-gray-700 mb-8 font-normal leading-relaxed whitespace-pre-line">
              {customInfo}
            </div>
          </div>
        ) : (
          <>
            {/* About section with animated counters */}
            <section className="py-24 bg-white" id="nuestra-historia">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-12 lg:gap-16 items-center">
                  <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={fadeIn}
                    className="md:w-1/2"
                  >
                    <div className="relative">
                      <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#FF914D] rounded-full opacity-30"></div>
                      <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-[#FF914D] rounded-full opacity-20"></div>
                      <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl">
                        <img 
                          src="/principio3.jpg" 
                          alt="Nuestra historia" 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-10 -left-10 p-6 bg-white rounded-lg shadow-xl">
                        <p className="text-lg font-semibold text-[#FF914D]">Desde 2014</p>
                        <p className="text-sm text-gray-600">Creciendo con nuestros clientes</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={containerVariants}
                    className="md:w-1/2"
                  >
                    <motion.span variants={itemVariants} className="text-sm font-bold tracking-wider text-[#FF914D] uppercase">Nuestra historia</motion.span>
                    <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-serif font-bold mb-8 mt-2">Una década iluminando ideas y construyendo confianza</motion.h2>
                    <motion.p variants={itemVariants} className="text-lg text-gray-700 mb-8 leading-relaxed">
                      Nuestra empresa nació en 2014 con una visión clara: proporcionar materiales eléctricos y de construcción de la más alta calidad, combinados con un servicio excepcional. Lo que comenzó como un pequeño emprendimiento familiar ha crecido hasta convertirse en un referente regional en el sector.
                    </motion.p>
                    <motion.p variants={itemVariants} className="text-lg text-gray-700 mb-8 leading-relaxed">
                      Hoy en día, seguimos manteniendo los mismos valores que nos impulsaron desde el principio: honestidad, compromiso con la calidad y atención personalizada para cada cliente.
                    </motion.p>
                    <motion.div variants={itemVariants} className="grid grid-cols-2 gap-8">
                      <div className="border-l-4 border-[#FF914D] pl-4">
                        <p className="text-sm text-gray-500 uppercase font-semibold">Misión</p>
                        <p className="text-lg font-medium text-gray-800">Ofrecer soluciones integrales con excelencia y dedicación</p>
                      </div>
                      <div className="border-l-4 border-[#FF914D] pl-4">
                        <p className="text-sm text-gray-500 uppercase font-semibold">Visión</p>
                        <p className="text-lg font-medium text-gray-800">Ser la empresa líder y referente en el sector</p>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
                
                {/* Animated counter stats */}
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 py-16 border-t border-b border-gray-200"
                >
                  {counterStats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <CountUp target={stat.number} suffix={stat.suffix} />
                      <p className="text-gray-600 mt-2">{stat.text}</p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </section>
            
            {/* Tabs section for mission/vision */}
            <section className="py-24 bg-gray-50 relative">
              <div className="absolute top-0 left-0 w-full overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full">
                  <path fill="#FFFFFF" fillOpacity="1" d="M0,64L48,80C96,96,192,128,288,149.3C384,171,480,181,576,176C672,171,768,149,864,154.7C960,160,1056,192,1152,186.7C1248,181,1344,139,1392,117.3L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                </svg>
              </div>
              <div className="container mx-auto px-4 relative">
                <div className="text-center mb-16">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-serif font-bold mb-6"
                  >
                    Nuestros <span className="text-[#FF914D]">Valores</span>
                  </motion.h2>
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "80px" }}
                    transition={{ duration: 1 }}
                    viewport={{ once: true }}
                    className="h-1 bg-[#FF914D] mx-auto mb-8"
                  ></motion.div>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="text-xl text-gray-600 max-w-3xl mx-auto"
                  >
                    Los pilares fundamentales que guían nuestro trabajo y relación con cada cliente
                  </motion.p>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-16 items-center">
                  <div className="lg:w-1/2 order-2 lg:order-1">
                    <div className="bg-white p-6 rounded-xl shadow-xl">
                      <div className="flex border-b mb-6">
                        <button 
                          onClick={() => setActiveTab("mission")}
                          className={`px-6 py-4 text-lg font-semibold ${activeTab === "mission" 
                            ? "text-[#FF914D] border-b-2 border-[#FF914D]" 
                            : "text-gray-500"}`}
                        >
                          Misión
                        </button>
                        <button 
                          onClick={() => setActiveTab("vision")}
                          className={`px-6 py-4 text-lg font-semibold ${activeTab === "vision" 
                            ? "text-[#FF914D] border-b-2 border-[#FF914D]" 
                            : "text-gray-500"}`}
                        >
                          Visión
                        </button>
                        <button 
                          onClick={() => setActiveTab("values")}
                          className={`px-6 py-4 text-lg font-semibold ${activeTab === "values" 
                            ? "text-[#FF914D] border-b-2 border-[#FF914D]" 
                            : "text-gray-500"}`}
                        >
                          Valores
                        </button>
                      </div>
                      
                      {activeTab === "mission" && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="space-y-6"
                        >
                          <h3 className="text-2xl md:text-4xl font-serif font-bold text-[#FF914D]">Nuestra Misión</h3>
                          <p className="text-xl text-gray-700 leading-relaxed">
                            Ofrecer soluciones integrales en materiales eléctricos y de construcción, con productos de calidad superior, atención profesional personalizada y precios competitivos que satisfagan las necesidades de nuestros clientes.
                          </p>
                          <p className="text-xl text-gray-700 leading-relaxed">
                            Nos comprometemos a ser un aliado estratégico para constructores, contratistas y propietarios, aportando valor en cada proyecto con asesoramiento técnico especializado y un servicio excepcional.
                          </p>
                          <ul className="space-y-3 pl-6">
                            <li className="flex items-start">
                              <svg className="w-6 h-6 mr-2 text-[#FF914D] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                              <span className="text-gray-700">Productos de alta calidad y rendimiento garantizado</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-6 h-6 mr-2 text-[#FF914D] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                              <span className="text-gray-700">Asesoramiento técnico especializado</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-6 h-6 mr-2 text-[#FF914D] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                              <span className="text-gray-700">Soluciones integrales para cada proyecto</span>
                            </li>
                          </ul>
                        </motion.div>
                      )}
                      
                      {activeTab === "vision" && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="space-y-6"
                        >
                          <h3 className="text-2xl md:text-4xl font-serif font-bold text-[#FF914D]">Nuestra Visión</h3>
                          <p className="text-xl text-gray-700 leading-relaxed">
                            Ser la empresa líder en la región en provisión de materiales para obras, reconocida por su confiabilidad, innovación y compromiso con la excelencia, expandiendo nuestra presencia para llevar soluciones de calidad a más comunidades.
                          </p>
                          <p className="text-xl text-gray-700 leading-relaxed">
                            Aspiramos a transformar la experiencia de compra en el sector de la construcción, combinando la atención personalizada tradicional con la innovación tecnológica, para crear relaciones duraderas con nuestros clientes.
                          </p>
                          <ul className="space-y-3 pl-6">
                            <li className="flex items-start">
                              <svg className="w-6 h-6 mr-2 text-[#FF914D] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                              <span className="text-gray-700">Liderazgo en el mercado regional</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-6 h-6 mr-2 text-[#FF914D] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                              <span className="text-gray-700">Innovación constante en productos y servicios</span>
                            </li>
                            <li className="flex items-start">
                              <svg className="w-6 h-6 mr-2 text-[#FF914D] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                              <span className="text-gray-700">Expansión geográfica y digital</span>
                            </li>
                          </ul>
                        </motion.div>
                      )}
                      
                      {activeTab === "values" && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="space-y-6"
                        >
                          <h3 className="text-2xl md:text-4xl font-serif font-bold text-[#FF914D]">Nuestros Valores</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-[#FF914D]">
                              <h4 className="font-bold text-lg mb-2">Integridad</h4>
                              <p className="text-gray-700">Actuamos con honestidad y transparencia en cada interacción con clientes y proveedores.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-[#FF914D]">
                              <h4 className="font-bold text-lg mb-2">Excelencia</h4>
                              <p className="text-gray-700">Nos esforzamos por superar las expectativas en cada producto y servicio que ofrecemos.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-[#FF914D]">
                              <h4 className="font-bold text-lg mb-2">Compromiso</h4>
                              <p className="text-gray-700">Nos dedicamos a cumplir nuestras promesas y a estar presentes cuando nuestros clientes nos necesitan.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-[#FF914D]">
                              <h4 className="font-bold text-lg mb-2">Innovación</h4>
                              <p className="text-gray-700">Buscamos constantemente nuevas soluciones y mejores formas de servir a nuestros clientes.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  
                  <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={fadeIn}
                    className="lg:w-1/2 order-1 lg:order-2"
                  >
                    <div className="relative">
                      <img 
                        src={activeTab === "mission" ? "/principio1.jpg" : 
                             activeTab === "vision" ? "/principio2.jpg" : "/principio3.jpg"} 
                        alt="Valores corporativos" 
                        className="rounded-xl shadow-2xl w-full transition-all duration-500 ease-in-out"
                        style={{ height: "500px", objectFit: "cover" }}
                      />
                      <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-[#FF914D] rounded-full opacity-20"></div>
                      <div className="absolute -top-6 -left-6 w-32 h-32 border-8 border-[#FF914D] rounded-full opacity-30"></div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>
            
            {/* Testimonials section */}
            <section className="py-24 bg-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-serif font-bold mb-6"
                  >
                    Lo que nuestros clientes <span className="text-[#FF914D]">dicen</span>
                  </motion.h2>
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "80px" }}
                    transition={{ duration: 1 }}
                    viewport={{ once: true }}
                    className="h-1 bg-[#FF914D] mx-auto mb-8"
                  ></motion.div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {testimonialsData.map((testimonial, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                      viewport={{ once: true }}
                      className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300"
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-xl">{testimonial.name}</h4>
                          <p className="text-[#FF914D]">{testimonial.role}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-5 h-5 text-yellow-400 inline-block" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                          </svg>
                        ))}
                      </div>
                      <p className="text-gray-700 italic">"{testimonial.text}"</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
            
            {/* Contact and location section with interactive elements */}
            <section className="py-24 bg-gray-50 relative">
              <div className="absolute top-0 left-0 w-full overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full">
                  <path fill="#FFFFFF" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,224C1248,203,1344,181,1392,170.7L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                </svg>
              </div>
              <div className="container mx-auto px-4 relative">
                <div className="text-center mb-16">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-serif font-bold mb-6"
                  >
                    Visítanos <span className="text-[#FF914D]">hoy</span>
                  </motion.h2>
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "80px" }}
                    transition={{ duration: 1 }}
                    viewport={{ once: true }}
                    className="h-1 bg-[#FF914D] mx-auto mb-8"
                  ></motion.div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={fadeIn}
                    className="md:w-1/2"
                  >
                    <div className="bg-white p-8 rounded-xl shadow-xl">
                      <h3 className="text-2xl font-bold mb-6 text-[#FF914D] inline-flex items-center">
                        <span className="text-3xl mr-2">📍</span> Nuestra Ubicación
                      </h3>
                      <p className="text-xl mb-6">Olavarría 610 (esquina San Luis), Salta, Argentina</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="border-l-4 border-[#FF914D] pl-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Horario de Atención</h4>
                          <p className="text-gray-600">Lunes a Viernes: 8:00 - 18:00</p>
                          <p className="text-gray-600">Sábados: 8:00 - 13:00</p>
                        </div>
                        
                        <div className="border-l-4 border-[#FF914D] pl-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Contacto</h4>
                          <p className="text-gray-600">WhatsApp: +54 3873439775</p>
                          <p className="text-gray-600">Email: info@regalaalgo.com</p>
                        </div>
                      </div>
                      
                      <a href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw" 
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#FF914D] hover:bg-[#e87f3d] text-white rounded-md transition-colors shadow-lg hover:shadow-xl w-full text-center"
                      >
                        <span className="font-bold">Cómo llegar</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-right" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/>
                        </svg>
                      </a>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={fadeIn}
                    className="md:w-1/2 h-[400px] rounded-xl overflow-hidden shadow-xl"
                  >
                    <div className="w-full h-full rounded-xl overflow-hidden relative bg-gray-200">
                      {/* Interactive map placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img 
                          src="/banner-ilumina-espacios.jpg" 
                          alt="Ubicación en mapa" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                          <div className="bg-[#FF914D] rounded-full p-5 mb-4 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-geo-alt" viewBox="0 0 16 16">
                              <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A31.493 31.493 0 0 1 8 14.58a31.481 31.481 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10"/>
                              <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold mb-2">Regala Algo</h3>
                          <p className="text-center px-4">Olavarría 610 (esq. San Luis)<br />Salta, Argentina</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Call to action */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-r from-[#FF914D] to-[#FF7A1F] rounded-2xl p-12 mt-16 text-center text-white shadow-2xl"
                >
                  <h3 className="text-3xl md:text-4xl font-bold mb-6">¿Listo para comenzar tu próximo proyecto?</h3>
                  <p className="text-xl mb-8 max-w-2xl mx-auto">
                    Nuestro equipo está listo para ayudarte con todos los materiales y la asesoría que necesites
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                      href="/productos" 
                      className="px-8 py-4 bg-white text-[#FF914D] font-bold rounded-full hover:bg-yellow-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Ver catálogo
                    </a>
                    <a 
                      href="https://wa.me/543873439775" 
                      className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white/20 transition-all duration-300"
                    >
                      Contactar por WhatsApp
                    </a>
                  </div>
                </motion.div>
              </div>
              
              <div className="absolute bottom-0 left-0 w-full overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full">
                  <path fill="#FFFFFF" fillOpacity="1" d="M0,64L48,85.3C96,107,192,149,288,144C384,139,480,85,576,85.3C672,85,768,139,864,160C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
              </div>
            </section>
            
            {/* Sidebar for useful information */}
            <div className="fixed top-1/2 transform -translate-y-1/2 right-0 z-50">
              <div className="bg-white p-4 rounded-l-xl shadow-xl border-l-4 border-[#FF914D] hidden md:block">
                <div className="space-y-6 w-64">
                  <h3 className="font-bold text-lg text-[#FF914D] flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                    </svg>
                    Enlaces Rápidos
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <a href="#nuestra-historia" className="flex items-center text-gray-700 hover:text-[#FF914D]">
                        <svg className="w-4 h-4 mr-2 text-[#FF914D]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                        Nuestra Historia
                      </a>
                    </li>
                    <li>
                      <a href="/productos" className="flex items-center text-gray-700 hover:text-[#FF914D]">
                        <svg className="w-4 h-4 mr-2 text-[#FF914D]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                        Catálogo de Productos
                      </a>
                    </li>
                    <li>
                      <a href="https://wa.me/543873439775" className="flex items-center text-gray-700 hover:text-[#FF914D]">
                        <svg className="w-4 h-4 mr-2 text-[#FF914D]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                        Contacto WhatsApp
                      </a>
                    </li>
                  </ul>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-600 font-semibold">Horario de Atención</p>
                    <p className="text-xs text-gray-500">Lun-Vie: 8:00 - 18:00</p>
                    <p className="text-xs text-gray-500">Sáb: 8:00 - 13:00</p>
                  </div>
                </div>
              </div>
              <button className="md:hidden bg-[#FF914D] p-3 rounded-l-lg shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </main>
      
      <footer className="bg-white py-12 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#FF914D] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-lg font-bold text-[#FF914D]">REGALA ALGO</span>
              </div>
              <p className="text-gray-600 text-sm">
                Tu proveedor de materiales eléctricos y de construcción de confianza.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#FF914D]">Productos</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Materiales Eléctricos</li>
                <li>Materiales de Construcción</li>
                <li>Herramientas Profesionales</li>
                <li>Iluminación</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#FF914D]">Servicios</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Asesoría Técnica</li>
                <li>Presupuestos</li>
                <li>Entregas a Obra</li>
                <li>Financiamiento</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#FF914D]">Contacto</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>📍 Olavarría 610 (esquina San Luis)</li>
                <li>
                  <a href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw" 
                     className="text-[#FF914D] hover:underline">
                    Ver en el mapa
                  </a>
                </li>
                <li>WhatsApp: +54 3873439775</li>
                <li>Instagram: <a href="https://www.instagram.com/regala.algo?igsh=OWk2enhxYzg2eHVq" target="_blank" rel="noopener noreferrer" className="text-[#FF914D] hover:underline">regala.algo</a></li>
                <li>Facebook: Regala Algo</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>&copy; 2024 REGALA ALGO. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
