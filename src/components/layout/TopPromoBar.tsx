import React, { useEffect, useRef, useState } from "react";

// URLs de imágenes de banderas
const FLAGS = {
  es: "https://flagcdn.com/w20/es.png", // Bandera de España
  en: "https://flagcdn.com/w20/us.png"  // Bandera de Estados Unidos
};

export const TopPromoBar: React.FC<{ setPromoVisible?: (v: boolean) => void }> = ({ setPromoVisible }) => {
  const [visible, setVisible] = useState(true);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const lastScroll = useRef(0);

  // Textos según el idioma
  const texts = {
    es: {
      main: "LOS MEJORES ARTÍCULOS | COMPRA AHORA",
      currency: "ARS Peso Argentino"
    },
    en: {
      main: "THE BEST PRODUCTS | SHOP NOW",
      currency: "ARS Argentine Peso"
    }
  };

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 40 && window.scrollY > lastScroll.current) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScroll.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (setPromoVisible) {
      setPromoVisible(visible);
    }
  }, [visible, setPromoVisible]);

  return (
    <div
      className={`fixed top-0 left-0 w-full z-[100] transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      } bg-[#FF914D] border-b border-[#e8823e] text-white text-base font-semibold tracking-wide h-9 flex items-center justify-center shadow-md`}
      style={{ fontFamily: "'Montserrat', 'Inter', Arial, sans-serif", letterSpacing: "0.05em" }}
    >
      <div className="container mx-auto px-4 md:px-8 lg:px-12 w-[95%] lg:w-[94%] max-w-[1900px]">
        <div className="flex items-center justify-between h-full">
          {/* Texto e icono en el lado izquierdo */}
          <div className="flex items-center">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium hidden sm:inline">TU MEJOR WEB</span>
              <span className="text-xs font-medium sm:hidden">TU WEB</span>
            </div>
          </div>
          
          {/* Texto central */}
          <div className="flex-grow text-center">
            <p className="text-white text-sm font-bold whitespace-nowrap">
              {texts[language].main}
            </p>
          </div>
          
          {/* Selector de idioma y moneda */}
          <div className="flex items-center justify-end gap-4">
            {/* Selector de idioma con diseño personalizado */}
            <div className="relative flex items-center">
              <div className="flex items-center bg-white/10 rounded px-2 py-0.5 cursor-pointer" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>
                <img 
                  src={FLAGS[language]} 
                  alt={language === 'es' ? 'Bandera de España' : 'US Flag'} 
                  className="w-4 h-3 mr-2 object-cover"
                  style={{ verticalAlign: 'middle' }}
                />
                <span className="text-xs font-medium">
                  {language === 'es' ? 'ES' : 'EN'}
                </span>
                <svg className="w-3 h-3 text-white/80 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Separador */}
            <div className="h-5 w-px bg-white/30"></div>
            
            {/* Moneda */}
            <div className="text-xs whitespace-nowrap">
              <span className="font-bold mr-1">$</span>
              <span className="hidden sm:inline">{texts[language].currency}</span>
              <span className="inline sm:hidden">ARS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};