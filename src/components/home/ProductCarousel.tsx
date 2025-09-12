import React, { useState, useEffect } from "react";

type ProductCarouselProps = {
  images: string[];
};

export const ProductCarousel: React.FC<ProductCarouselProps> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  
  // Cada grupo de imágenes tiene 3 imágenes: 1 grande y 2 pequeñas
  const carouselImageSets = [
    [images[0], images[1], images[2]],
    [images[1], images[2], images[0]],
    [images[2], images[0], images[1]],
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % carouselImageSets.length);
    }, 60000); // 60000ms = 1 minuto
    return () => clearInterval(interval);
  }, [carouselImageSets.length]);

  return (
    <div className="container mx-auto px-4 md:px-8 lg:px-12 relative w-[95%] lg:w-[94%] max-w-[1900px] mt-32 lg:mt-40">
      <h2 className="text-3xl md:text-5xl font-bold text-slate-800 mb-6 text-center">
      
      </h2>
      
      {/* Layout de imágenes: 1 grande izquierda, 2 pequeñas apiladas derecha */}
      <div className="relative flex flex-col lg:flex-row gap-4 lg:gap-4">
        {/* Imagen principal grande (izquierda) */}
        <div className="lg:w-[67%] h-[500px] lg:h-[666px] mb-4 lg:mb-0 relative overflow-hidden rounded-xl shadow-md">
          <img 
            src={carouselImageSets[current][0]} 
            alt="Imagen principal" 
            className="w-full h-full object-cover transition-all duration-700"
          />
          
          {/* Texto superpuesto en imagen principal */}
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <h3 className="text-3xl lg:text-4xl font-bold mb-3 drop-shadow-lg">
              {current === 0 ? "Productos de Alta Calidad" : 
               current === 1 ? "Entrega Rápida y Segura" : 
               "Precios Competitivos"}
            </h3>
            <p className="text-white/90 text-base lg:text-xl max-w-2xl drop-shadow-lg leading-relaxed">
              {current === 0 ? "Ofrecemos los mejores productos para su comodidad y bienestar." : 
               current === 1 ? "Reciba sus productos directamente en la puerta de su casa." : 
               "Los mejores precios del mercado con promociones exclusivas."}
            </p>
          </div>
        </div>
        
        {/* Dos imágenes pequeñas apiladas (derecha) - Ajustadas para alinearse con la imagen principal */}
        <div className="lg:w-[32%] flex flex-col gap-4">
          <div className="h-[250px] lg:h-[325px] relative rounded-xl overflow-hidden shadow-md">
            <img 
              src={carouselImageSets[current][1]} 
              alt="Imagen secundaria 1" 
              className="w-full h-full object-cover transition-all duration-700"
            />
          </div>
          <div className="h-[250px] lg:h-[325px] relative rounded-xl overflow-hidden shadow-md">
            <img 
              src={carouselImageSets[current][2]} 
              alt="Imagen secundaria 2" 
              className="w-full h-full object-cover transition-all duration-700"
            />
          </div>
        </div>
        
        {/* Los controles de navegación han sido eliminados */}
      </div>
      
      {/* Indicadores de slide */}
      <div className="flex justify-center mt-12 mb-10 space-x-6">
        {carouselImageSets.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-20 h-3 rounded-full transition-all ${
              current === idx ? "bg-blue-600 scale-110 shadow-sm" : "bg-gray-200 hover:bg-gray-300"
            }`}
            aria-label={`Ir al slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
