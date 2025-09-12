import React, { useEffect, useRef, useState } from 'react';

interface LanternProps {
  position: 'left' | 'right';
  offset?: number;
  size?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
  illuminationDelay?: number;
}

const Lantern: React.FC<LanternProps> = ({ 
  position, 
  offset = 0, 
  size = 'medium',
  style = {},
  illuminationDelay = 0
}) => {
  const lanternRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const lanternElement = lanternRef.current;
    if (!lanternElement) return;

    // Usar IntersectionObserver para mejor rendimiento
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // Solo marcamos como visible una vez que está realmente visible
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      {
        // Ajustamos el root margin para activar antes de que sea completamente visible
        rootMargin: '0px 0px -15% 0px',
        threshold: 0.2
      }
    );

    observer.observe(lanternElement);

    // Limpiar observer al desmontar
    return () => {
      observer.unobserve(lanternElement);
    };
  }, []);

  // Aplicamos la clase de iluminación después del delay
  useEffect(() => {
    const lanternElement = lanternRef.current;
    if (!lanternElement || !isVisible) return;

    let timer: number;
    if (isVisible) {
      timer = window.setTimeout(() => {
        lanternElement.classList.add('illuminated');
      }, illuminationDelay);
    } else {
      lanternElement.classList.remove('illuminated');
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isVisible, illuminationDelay]);

  // Determinar clases de tamaño
  const sizeClass = {
    small: 'lantern-small',
    medium: '',
    large: 'lantern-large'
  }[size];

  // Estilos combinados
  const lanternStyle = {
    top: `calc(50% + ${offset}px)`,
    ...style
  };

  return (
    <div 
      ref={lanternRef} 
      className={`lantern lantern-${position} ${sizeClass}`}
      style={lanternStyle}
    >
      <div className="lantern-chain"></div>
      <div className="lantern-top"></div>
      <div className="lantern-handle"></div>
      <div className="lantern-glass"></div>
      <div className="lantern-light"></div>
      <div className="lantern-bottom"></div>
      <div className="lantern-glow"></div>
    </div>
  );
};

export default Lantern;
