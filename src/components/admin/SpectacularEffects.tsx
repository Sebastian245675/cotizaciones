import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, Star, Zap, Crown, Diamond, Award, Trophy, Flame } from 'lucide-react';

// Componente de partículas animadas
export const ParticleSystem: React.FC<{ active: boolean; color?: string }> = ({ 
  active, 
  color = '#3b82f6' 
}) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
  }>>([]);

  const createParticle = useCallback(() => ({
    id: Math.random(),
    x: Math.random() * window.innerWidth,
    y: window.innerHeight + 10,
    vx: (Math.random() - 0.5) * 4,
    vy: -Math.random() * 3 - 1,
    life: 0,
    maxLife: 60 + Math.random() * 60,
    size: 2 + Math.random() * 4
  }), []);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const interval = setInterval(() => {
      setParticles(prev => {
        // Crear nuevas partículas
        const newParticles = [...prev];
        if (newParticles.length < 50) {
          newParticles.push(createParticle());
        }

        // Actualizar partículas existentes
        return newParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life + 1,
            vy: particle.vy * 0.99
          }))
          .filter(particle => particle.life < particle.maxLife && particle.y > -10);
      });
    }, 16);

    return () => clearInterval(interval);
  }, [active, createParticle]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
            opacity: Math.max(0, 1 - particle.life / particle.maxLife),
            boxShadow: `0 0 ${particle.size * 2}px ${color}`
          }}
        />
      ))}
    </div>
  );
};

// Componente de confetti avanzado
export const AdvancedConfetti: React.FC<{ active: boolean; duration?: number }> = ({ 
  active, 
  duration = 3000 
}) => {
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    shape: string;
    size: number;
  }>>([]);

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
  const shapes = ['square', 'circle', 'triangle', 'star'];

  useEffect(() => {
    if (!active) {
      setConfettiPieces([]);
      return;
    }

    // Crear confetti inicial
    const pieces = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -10,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: 4 + Math.random() * 8
    }));

    setConfettiPieces(pieces);

    const interval = setInterval(() => {
      setConfettiPieces(prev => 
        prev
          .map(piece => ({
            ...piece,
            x: piece.x + piece.vx,
            y: piece.y + piece.vy,
            rotation: piece.rotation + piece.rotationSpeed,
            vy: piece.vy + 0.3 // gravedad
          }))
          .filter(piece => piece.y < window.innerHeight + 50)
      );
    }, 16);

    const timeout = setTimeout(() => {
      setConfettiPieces([]);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [active, duration]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map(piece => (
        <div
          key={piece.id}
          className={`absolute ${piece.shape === 'circle' ? 'rounded-full' : piece.shape === 'triangle' ? 'triangle' : ''}`}
          style={{
            left: piece.x,
            top: piece.y,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            clipPath: piece.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 
                     piece.shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 
                     undefined
          }}
        />
      ))}
    </div>
  );
};

// Componente de ondas de energía
export const EnergyWaves: React.FC<{ active: boolean; intensity?: number }> = ({ 
  active, 
  intensity = 1 
}) => {
  const [waves, setWaves] = useState<number[]>([]);

  useEffect(() => {
    if (!active) {
      setWaves([]);
      return;
    }

    const interval = setInterval(() => {
      setWaves(prev => {
        const newWaves = [...prev, Date.now()];
        return newWaves.filter(wave => Date.now() - wave < 2000);
      });
    }, 500 / intensity);

    return () => clearInterval(interval);
  }, [active, intensity]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center overflow-hidden">
      {waves.map(wave => {
        const age = Date.now() - wave;
        const scale = 1 + (age / 2000) * 3;
        const opacity = Math.max(0, 1 - age / 2000);
        
        return (
          <div
            key={wave}
            className="absolute w-32 h-32 border-4 border-blue-400 rounded-full"
            style={{
              transform: `scale(${scale})`,
              opacity: opacity * 0.6,
              animation: 'pulse 0.5s ease-out'
            }}
          />
        );
      })}
    </div>
  );
};

// Componente de texto brillante animado
export const GlowingText: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  glowColor?: string;
  intensity?: number;
}> = ({ 
  children, 
  className = "", 
  glowColor = "#3b82f6", 
  intensity = 1 
}) => {
  const [glowActive, setGlowActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlowActive(prev => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`${className} transition-all duration-1000`}
      style={{
        textShadow: glowActive 
          ? `0 0 ${10 * intensity}px ${glowColor}, 0 0 ${20 * intensity}px ${glowColor}, 0 0 ${30 * intensity}px ${glowColor}`
          : 'none'
      }}
    >
      {children}
    </div>
  );
};

// Componente de iconos flotantes
export const FloatingIcons: React.FC<{ active: boolean; type?: 'success' | 'money' | 'celebration' }> = ({ 
  active, 
  type = 'success' 
}) => {
  const [icons, setIcons] = useState<Array<{
    id: number;
    Icon: React.ComponentType<any>;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    scale: number;
    life: number;
  }>>([]);

  const iconSets = {
    success: [Star, Sparkles, Trophy, Award, Crown],
    money: [Diamond, Zap, Crown, Trophy],
    celebration: [Sparkles, Star, Flame, Trophy, Award]
  };

  const selectedIcons = iconSets[type];

  useEffect(() => {
    if (!active) {
      setIcons([]);
      return;
    }

    const createIcon = () => ({
      id: Math.random(),
      Icon: selectedIcons[Math.floor(Math.random() * selectedIcons.length)],
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 20,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      scale: 0.5 + Math.random() * 1.5,
      life: 0
    });

    const interval = setInterval(() => {
      setIcons(prev => {
        let newIcons = [...prev];
        
        // Agregar nuevos iconos ocasionalmente
        if (Math.random() < 0.3 && newIcons.length < 20) {
          newIcons.push(createIcon());
        }

        // Actualizar iconos existentes
        return newIcons
          .map(icon => ({
            ...icon,
            x: icon.x + icon.vx,
            y: icon.y + icon.vy,
            rotation: icon.rotation + icon.rotationSpeed,
            life: icon.life + 1
          }))
          .filter(icon => icon.y > -50 && icon.life < 300);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [active, type]); // Changed dependency from selectedIcons to type

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {icons.map(icon => {
        const opacity = Math.max(0, 1 - icon.life / 300);
        const Icon = icon.Icon;
        
        return (
          <div
            key={icon.id}
            className="absolute"
            style={{
              left: icon.x,
              top: icon.y,
              transform: `rotate(${icon.rotation}deg) scale(${icon.scale})`,
              opacity
            }}
          >
            <Icon className="h-6 w-6 text-yellow-500" style={{ filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))' }} />
          </div>
        );
      })}
    </div>
  );
};

// Componente de pulso de fondo
export const BackgroundPulse: React.FC<{ 
  active: boolean; 
  color?: string; 
  intensity?: number;
}> = ({ 
  active, 
  color = 'rgb(59, 130, 246)', 
  intensity = 0.1 
}) => {
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 0.1) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const opacity = intensity * (0.5 + 0.5 * Math.sin(pulsePhase));

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
        opacity
      }}
    />
  );
};

// Hook para efectos de sonido
export const useSoundEffects = () => {
  const playSuccess = useCallback(() => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBDWBzvLZiTYIG2q+7eGVTwwOUarm8LpnGwU9k9n0yHUqBSl+zPLaizsIGGq+7uOWTgwOUarm8LpoGgU+lNr0yHgpBSl+zPLajDkIF2m+7uOWTwsOUqvm8LxmGgY9lNr0yHkpBSuBzvLZijYHGmu/7+OWTg0NVKHN8cF6JQQugs/z2Is4CBxuweGdcVkJDlOm5O+yXJkGSN+w");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  const playError = useCallback(() => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2Ec");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  const playNotification = useCallback(() => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fd");
    audio.volume = 0.2;
    audio.play().catch(() => {});
  }, []);

  return { playSuccess, playError, playNotification };
};

// Componente principal que combina todos los efectos
export const SpectacularEffects: React.FC<{
  showSuccess?: boolean;
  showError?: boolean;
  showLoading?: boolean;
  showCelebration?: boolean;
  children: React.ReactNode;
}> = ({
  showSuccess = false,
  showError = false,
  showLoading = false,
  showCelebration = false,
  children
}) => {
  return (
    <div className="relative">
      <BackgroundPulse 
        active={showLoading} 
        color="rgb(59, 130, 246)" 
        intensity={0.05} 
      />
      
      <ParticleSystem 
        active={showSuccess || showCelebration} 
        color={showSuccess ? '#10b981' : '#fbbf24'} 
      />
      
      <AdvancedConfetti 
        active={showCelebration} 
        duration={4000} 
      />
      
      <EnergyWaves 
        active={showSuccess} 
        intensity={2} 
      />
      
      <FloatingIcons 
        active={showCelebration} 
        type="celebration" 
      />

      {children}
    </div>
  );
};

export default SpectacularEffects;
