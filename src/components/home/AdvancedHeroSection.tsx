import React, { useEffect, useRef } from 'react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { FloatingParticles } from '@/components/ui/floating-particles';
import { ShoppingBag, Zap, Star, Sparkles } from 'lucide-react';

export const AdvancedHeroSection: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-slide-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.fade-in-element');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-12 sm:py-20 bg-gradient-to-br from-purple-700 via-fuchsia-700 to-pink-600 overflow-hidden rounded-3xl shadow-md sm:shadow-2xl animate-fade-in mx-2 sm:mx-0">
      {/* Fondo animado tipo glassmorphism */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm sm:backdrop-blur-md rounded-3xl pointer-events-none"></div>
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-12 px-4 sm:px-12">
        {/* Título y descripción */}
        <div className="flex-1 text-center sm:text-left space-y-4">
          <span className="inline-block px-4 py-1 rounded-full bg-white/20 text-white font-semibold text-xs tracking-widest mb-2 animate-pulse-glow">
            ✨ NUEVO
          </span>
          <h1 className="text-4xl sm:text-6xl font-black leading-tight text-white drop-shadow-lg">
            Tienda{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Ultra
            </span>{' '}
            <br />
            <span className="text-pink-200">Premium</span>
          </h1>
          <p className="text-lg sm:text-2xl text-white/80 max-w-md mx-auto sm:mx-0">
            Descubre una experiencia de compra revolucionaria con productos
            premium, tecnología avanzada y el mejor servicio del conjunto.
          </p>
        </div>
        {/* Stats o features */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-4 flex flex-col items-center">
            <span className="text-2xl font-bold text-yellow-300">500+</span>
            <span className="text-white/80 text-xs">Productos Premium</span>
          </div>
          <div className="bg-white/10 rounded-xl p-4 flex flex-col items-center">
            <span className="text-2xl font-bold text-orange-300">15min</span>
            <span className="text-white/80 text-xs">Entrega Ultra Rápida</span>
          </div>
          <div className="bg-white/10 rounded-xl p-4 flex flex-col items-center">
            <span className="text-2xl font-bold text-pink-200">24/7</span>
            <span className="text-white/80 text-xs">Soporte Premium</span>
          </div>
          <div className="bg-white/10 rounded-xl p-4 flex flex-col items-center">
            <span className="text-2xl font-bold text-green-200">4.9</span>
            <span className="text-white/80 text-xs">Rating</span>
          </div>
        </div>
      </div>
      {window.innerWidth > 480 && <FloatingParticles />}
    </section>
  );
};
