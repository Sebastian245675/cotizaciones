import React, { useState, useEffect } from 'react';
import './filler-content.css';

const FillerContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tips');
  const [userCount, setUserCount] = useState(1250);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fillerItems = [
    {
      title: "Calidad garantizada",
      content: "Todos nuestros productos pasan por rigurosos controles de calidad antes de llegar a tus manos. Ofrecemos garantía extendida en la mayoría de nuestros artículos.",
      icon: "💎",
      category: "tips"
    },
    {
      title: "Envíos express",
      content: "Entregamos en todo el país con nuestra red logística optimizada. Seguimiento en tiempo real para que siempre sepas dónde está tu pedido.",
      icon: "🚚",
      category: "shipping"
    },
    {
      title: "Atención 24/7",
      content: "Nuestro equipo está disponible todos los días de la semana para resolver tus dudas y asistirte en tu proceso de compra.",
      icon: "👋",
      category: "support"
    },
    {
      title: "Ofertas exclusivas",
      content: "¡Descuentos exclusivos cada semana! Suscríbete a nuestro boletín para ser el primero en enterarte de las mejores promociones.",
      icon: "🔥",
      category: "tips"
    },
    {
      title: "Métodos de pago",
      content: "Aceptamos tarjetas de crédito, débito, transferencias bancarias, y múltiples billeteras virtuales. Paga en hasta 12 cuotas sin interés.",
      icon: "💳",
      category: "payment"
    },
    {
      title: "Club de beneficios",
      content: "Acumula puntos en cada compra y canjéalos por descuentos o productos exclusivos. ¡Ser parte de nuestro club tiene ventajas!",
      icon: "⭐",
      category: "tips"
    },
    {
      title: "Cambios y devoluciones",
      content: "Si no estás 100% satisfecho, tienes hasta 30 días para cambiar tu producto o solicitar el reembolso completo de tu compra.",
      icon: "🔄",
      category: "shipping"
    },
    {
      title: "Personalización",
      content: "Muchos de nuestros productos pueden ser personalizados según tus preferencias. Pregunta por nuestras opciones de grabado o estampado.",
      icon: "✨",
      category: "tips"
    },
    {
      title: "Compra segura",
      content: "Tu información personal y bancaria está protegida con los más altos estándares de seguridad y encriptación.",
      icon: "🔒",
      category: "payment"
    },
    {
      title: "Servicio post-venta",
      content: "Nuestro compromiso no termina con la entrega. Ofrecemos soporte técnico y asesoramiento después de tu compra.",
      icon: "🛠️",
      category: "support"
    }
  ];

  const timelineEvents = [
    {
      title: "Inauguración de nueva sucursal",
      date: "15 de agosto, 2025",
      content: "¡Gran inauguración! Visítanos y disfruta de descuentos especiales."
    },
    {
      title: "Lanzamiento de colección exclusiva",
      date: "23 de agosto, 2025",
      content: "Productos únicos y de edición limitada disponibles solo por tiempo limitado."
    },
    {
      title: "Workshop gratuito",
      date: "5 de septiembre, 2025",
      content: "Aprende consejos y trucos para sacar el máximo provecho de nuestros productos."
    }
  ];

  const decorativeImages = [
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
    "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
    "https://images.unsplash.com/photo-1556740714-a8395b3bf30f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
    "https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
    "https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80"
  ];

  const statistics = [
    { value: "+15K", label: "Clientes" },
    { value: "99%", label: "Entregas" },
    { value: "+2K", label: "Productos" },
    { value: "4.9★", label: "Rating" }
  ];

  const filteredItems = activeTab === 'all' 
    ? fillerItems 
    : fillerItems.filter(item => item.category === activeTab);

  const randomizeItems = (array: typeof fillerItems, count: number) => {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  const selectedItems = activeTab === 'all' 
    ? randomizeItems(fillerItems, 6) 
    : filteredItems;

  return (
    <div className="filler-content-container">
      <div className="filler-background-bubbles">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="filler-bubble"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 90}%`,
              top: `${Math.random() * 90}%`,
              animationDuration: `${Math.random() * 10 + 10}s`
            }}
          />
        ))}
      </div>

      <div className="mb-8">
        <h2 className="filler-section-title filler-animation-fade filler-animation-delay-1">
          Más información para ti
        </h2>
        
        <div className="flex flex-wrap items-center justify-between mt-6 mb-4">
          <p className="text-slate-600 mb-4 md:mb-0 md:max-w-lg filler-animation-fade filler-animation-delay-2">
            En nuestra tienda encontrarás los mejores productos con la garantía de calidad que mereces. 
            Nuestra misión es proporcionarte la mejor experiencia de compra posible.
          </p>
          
          <div className="flex items-center bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm filler-animation-scale filler-animation-delay-3">
            <div className="mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-blue-700">Usuarios activos</div>
              <div className="text-lg font-bold text-blue-800">{userCount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {statistics.map((stat, idx) => (
            <div 
              key={idx} 
              className={`bg-white p-3 rounded-lg shadow-sm text-center border border-slate-100 filler-animation-fade filler-animation-delay-${idx + 1}`}
            >
              <div className="text-base font-bold text-slate-800">{stat.value}</div>
              <div className="text-[10px] text-slate-500 truncate">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex overflow-x-auto pb-2 mb-5 filler-animation-fade filler-animation-delay-2">
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-full mr-2 whitespace-nowrap ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          onClick={() => setActiveTab('all')}
        >
          Todos los consejos
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-full mr-2 whitespace-nowrap ${activeTab === 'tips' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          onClick={() => setActiveTab('tips')}
        >
          Consejos útiles
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-full mr-2 whitespace-nowrap ${activeTab === 'shipping' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          onClick={() => setActiveTab('shipping')}
        >
          Envíos
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-full mr-2 whitespace-nowrap ${activeTab === 'payment' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          onClick={() => setActiveTab('payment')}
        >
          Pagos
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-full mr-2 whitespace-nowrap ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          onClick={() => setActiveTab('support')}
        >
          Soporte
        </button>
      </div>

      <div className="filler-info-grid mb-8">
        {selectedItems.map((item, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg shadow-sm filler-item filler-animation-scale filler-animation-delay-${(index % 5) + 1} ${
              index % 5 === 0 ? 'filler-card-blue' :
              index % 5 === 1 ? 'filler-card-amber' :
              index % 5 === 2 ? 'filler-card-purple' :
              index % 5 === 3 ? 'filler-card-green' : 'filler-card-rose'
            }`}
          >
            <div className="flex items-center mb-3">
              <span className="filler-icon mr-3">{item.icon}</span>
              <h3 className="filler-item-title font-semibold text-slate-800">{item.title}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{item.content}</p>
          </div>
        ))}
      </div>
      
      <div className="filler-divider"></div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Columna 1: Eventos próximos */}
        <div className="lg:col-span-1 filler-animation-fade filler-animation-delay-1">
          <h3 className="filler-section-title mb-5">Próximos eventos</h3>
          
          <div className="filler-timeline">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="filler-timeline-item mb-6">
                <div className="filler-timeline-dot"></div>
                <div className="mb-1.5 text-xs font-semibold text-blue-600">{event.date}</div>
                <h4 className="text-base font-semibold text-slate-800 mb-1.5">{event.title}</h4>
                <p className="text-sm text-slate-600">{event.content}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors filler-button text-sm shadow-md">
              Ver calendario completo
            </button>
          </div>
        </div>
        
        {/* Columna 2 y 3: Eliminado para dejar solo la línea del tiempo */}
        <div className="lg:col-span-2">
          {/* Contenido eliminado para dejar solo la línea de tiempo en la primera columna */}
        </div>
      </div>
      
      {/* Sección de suscripción eliminada */}
    </div>
  );
};

export default FillerContent;
